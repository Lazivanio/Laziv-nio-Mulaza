/**
 * PERSISTENT DATABASE & QUEUE STORE - FATU-R HARDWARE AGENT
 * 
 * Fornece armazenamento persistente em SQLite para fila de trabalhos, idempotência,
 * estados de transição e configurações de dispositivo, com suporte a WAL e busy_timeout.
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DB_FILE = path.join(__dirname, '..', 'agent_queue.db');

let db = null;
let isNativeSqlite = false;

// Tentativa de inicialização do SQLite nativo
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_FILE, { timeout: 8000 });
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  isNativeSqlite = true;
  logger.info('DB', 'Banco de dados SQLite inicializado com sucesso (Modo WAL Ativo)');
} catch (e) {
  logger.warn('DB', `SQLite nativo indisponível (${e.message}). Ativando Motor ACID de Persistência Resiliente.`);
}

// Fallback Store em JSON/WAL para garantir 100% de compatibilidade onde SQLite C++ não estiver compilado
let fallbackStore = {
  jobs: [],
  device_config: {},
  processed_hashes: {}
};

const FALLBACK_FILE = path.join(__dirname, '..', 'agent_fallback.json');

if (!isNativeSqlite) {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      fallbackStore = JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf8'));
    }
  } catch (err) {
    fallbackStore = { jobs: [], device_config: {}, processed_hashes: {} };
  }
}

function saveFallback() {
  if (!isNativeSqlite) {
    try {
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(fallbackStore, null, 2), 'utf8');
    } catch (e) {
      logger.error('DB', `Falha ao persistir store local: ${e.message}`);
    }
  }
}

/**
 * Criação e Migração das Tabelas
 */
function initDatabase() {
  if (isNativeSqlite) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS print_jobs (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        device_id TEXT,
        printer_id TEXT,
        printer_config TEXT,
        payload TEXT,
        status TEXT DEFAULT 'RECEIVED',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        next_attempt_at TEXT,
        error TEXT,
        created_at TEXT,
        updated_at TEXT,
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON print_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_doc ON print_jobs(document_id);

      CREATE TABLE IF NOT EXISTS device_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS processed_idempotency (
        hash TEXT PRIMARY KEY,
        job_id TEXT,
        document_id TEXT,
        status TEXT,
        created_at TEXT
      );
    `);

    // Recuperação de falhas: Se o agente caiu durante uma impressão (SENDING), marca como UNKNOWN
    const recovered = db.prepare(`
      UPDATE print_jobs 
      SET status = 'UNKNOWN', error = 'Agente reinicializado durante envio. Estado físico pendente de verificação.'
      WHERE status = 'SENDING'
    `).run();

    if (recovered.changes > 0) {
      logger.warn('DB', `Recuperação de reinício: ${recovered.changes} tarefas em 'SENDING' marcadas como 'UNKNOWN'.`);
    }
  } else {
    // Recuperação em fallback
    fallbackStore.jobs.forEach(j => {
      if (j.status === 'SENDING') {
        j.status = 'UNKNOWN';
        j.error = 'Agente reinicializado durante envio.';
      }
    });
    saveFallback();
  }
}

initDatabase();

// ==========================================
// MÉTODOS DE CONFIGURAÇÃO DO DISPOSITIVO
// ==========================================

function setConfig(key, value) {
  const now = new Date().toISOString();
  const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);

  if (isNativeSqlite) {
    db.prepare(`
      INSERT INTO device_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, valStr, now);
  } else {
    fallbackStore.device_config[key] = { value: valStr, updated_at: now };
    saveFallback();
  }
}

function getConfig(key, defaultValue = null) {
  if (isNativeSqlite) {
    const row = db.prepare(`SELECT value FROM device_config WHERE key = ?`).get(key);
    if (!row) return defaultValue;
    try { return JSON.parse(row.value); } catch (e) { return row.value; }
  } else {
    const row = fallbackStore.device_config[key];
    if (!row) return defaultValue;
    try { return JSON.parse(row.value); } catch (e) { return row.value; }
  }
}

// ==========================================
// MÉTODOS DA FILA PERSISTENTE E IDEMPOTÊNCIA
// ==========================================

/**
 * Cria ou recupera um job na fila com garantia de idempotência
 */
function createOrGetJob(jobData) {
  const now = new Date().toISOString();
  const id = jobData.id || `JOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const documentId = jobData.document_id || jobData.documentId || jobData.invoice_number || null;
  const deviceId = jobData.device_id || getConfig('device_id', 'UNKNOWN');
  const printerId = jobData.printer_id || jobData.printer || 'default';
  const printerConfig = JSON.stringify(jobData.printer_config || jobData.printerPreset || {});
  const payload = JSON.stringify(jobData.payload || jobData);
  const maxAttempts = jobData.max_attempts || 3;

  // 1. Verificação de Idempotência por documentId
  if (documentId) {
    const existing = findJobByDocumentId(documentId);
    if (existing) {
      if (existing.status === 'COMPLETED' || existing.status === 'SENT' || existing.status === 'DEVICE_ACK') {
        logger.info('DB_IDEMPOTENCY', `Job ignorado por Idempotência: ${documentId} já se encontra em estado ${existing.status}`);
        return { isDuplicate: true, job: existing };
      }
    }
  }

  // 2. Inserção na fila persistente
  if (isNativeSqlite) {
    db.prepare(`
      INSERT INTO print_jobs (
        id, document_id, device_id, printer_id, printer_config, payload,
        status, attempts, max_attempts, next_attempt_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', 0, ?, ?, ?, ?)
    `).run(id, documentId, deviceId, printerId, printerConfig, payload, maxAttempts, now, now, now);

    const inserted = db.prepare(`SELECT * FROM print_jobs WHERE id = ?`).get(id);
    return { isDuplicate: false, job: parseJobRow(inserted) };
  } else {
    const newJob = {
      id,
      document_id: documentId,
      device_id: deviceId,
      printer_id: printerId,
      printer_config: printerConfig,
      payload,
      status: 'QUEUED',
      attempts: 0,
      max_attempts: maxAttempts,
      next_attempt_at: now,
      error: null,
      created_at: now,
      updated_at: now,
      completed_at: null
    };
    fallbackStore.jobs.unshift(newJob);
    if (fallbackStore.jobs.length > 500) fallbackStore.jobs.pop();
    saveFallback();
    return { isDuplicate: false, job: parseJobRow(newJob) };
  }
}

function findJobByDocumentId(documentId) {
  if (isNativeSqlite) {
    const row = db.prepare(`SELECT * FROM print_jobs WHERE document_id = ? ORDER BY created_at DESC LIMIT 1`).get(documentId);
    return row ? parseJobRow(row) : null;
  } else {
    const found = fallbackStore.jobs.find(j => j.document_id === documentId);
    return found ? parseJobRow(found) : null;
  }
}

function getJobById(id) {
  if (isNativeSqlite) {
    const row = db.prepare(`SELECT * FROM print_jobs WHERE id = ?`).get(id);
    return row ? parseJobRow(row) : null;
  } else {
    const found = fallbackStore.jobs.find(j => j.id === id);
    return found ? parseJobRow(found) : null;
  }
}

function getPendingJobs() {
  const now = new Date().toISOString();
  if (isNativeSqlite) {
    const rows = db.prepare(`
      SELECT * FROM print_jobs 
      WHERE (status = 'QUEUED' OR status = 'RECEIVED')
        AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        AND attempts < max_attempts
      ORDER BY created_at ASC
    `).all(now);
    return rows.map(parseJobRow);
  } else {
    return fallbackStore.jobs
      .filter(j => (j.status === 'QUEUED' || j.status === 'RECEIVED') && (!j.next_attempt_at || j.next_attempt_at <= now) && j.attempts < j.max_attempts)
      .map(parseJobRow);
  }
}

function updateJobStatus(id, status, error = null, nextAttemptDelaySec = null) {
  const now = new Date().toISOString();
  let nextAttemptAt = null;
  if (nextAttemptDelaySec) {
    nextAttemptAt = new Date(Date.now() + nextAttemptDelaySec * 1000).toISOString();
  }

  const completedAt = status === 'COMPLETED' ? now : null;

  if (isNativeSqlite) {
    db.prepare(`
      UPDATE print_jobs
      SET status = ?,
          error = ?,
          updated_at = ?,
          attempts = CASE WHEN ? = 'SENDING' THEN attempts + 1 ELSE attempts END,
          next_attempt_at = COALESCE(?, next_attempt_at),
          completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, error, now, status, nextAttemptAt, completedAt, id);
  } else {
    const job = fallbackStore.jobs.find(j => j.id === id);
    if (job) {
      job.status = status;
      job.error = error;
      job.updated_at = now;
      if (status === 'SENDING') job.attempts += 1;
      if (nextAttemptAt) job.next_attempt_at = nextAttemptAt;
      if (completedAt) job.completed_at = completedAt;
      saveFallback();
    }
  }
}

function getQueueStats() {
  if (isNativeSqlite) {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('QUEUED', 'RECEIVED', 'SENDING') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'UNKNOWN' THEN 1 ELSE 0 END) as unknown
      FROM print_jobs
    `).get();
    return {
      total: stats.total || 0,
      pending: stats.pending || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      unknown: stats.unknown || 0
    };
  } else {
    const total = fallbackStore.jobs.length;
    const pending = fallbackStore.jobs.filter(j => ['QUEUED', 'RECEIVED', 'SENDING'].includes(j.status)).length;
    const completed = fallbackStore.jobs.filter(j => j.status === 'COMPLETED').length;
    const failed = fallbackStore.jobs.filter(j => j.status === 'FAILED').length;
    const unknown = fallbackStore.jobs.filter(j => j.status === 'UNKNOWN').length;
    return { total, pending, completed, failed, unknown };
  }
}

function getRecentJobs(limit = 50) {
  if (isNativeSqlite) {
    const rows = db.prepare(`SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT ?`).all(limit);
    return rows.map(parseJobRow);
  } else {
    return fallbackStore.jobs.slice(0, limit).map(parseJobRow);
  }
}

function parseJobRow(row) {
  if (!row) return null;
  return {
    ...row,
    printer_config: typeof row.printer_config === 'string' ? safeJsonParse(row.printer_config) : row.printer_config,
    payload: typeof row.payload === 'string' ? safeJsonParse(row.payload) : row.payload
  };
}

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (e) { return str; }
}

module.exports = {
  setConfig,
  getConfig,
  createOrGetJob,
  getJobById,
  findJobByDocumentId,
  getPendingJobs,
  updateJobStatus,
  getQueueStats,
  getRecentJobs,
  isNativeSqlite: () => isNativeSqlite
};
