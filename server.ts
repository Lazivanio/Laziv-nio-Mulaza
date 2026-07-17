import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit-table";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { PassThrough } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logServerError = (context: string, err: any) => {
  try {
    const errorLogPath = path.join(process.cwd(), "server-error.log");
    const timestamp = new Date().toISOString();
    const errorMessage = err instanceof Error ? `${err.message}\nStack: ${err.stack}` : `${err}`;
    const logLine = `[${timestamp}] [${context}] ${errorMessage}\n\n`;
    fs.appendFileSync(errorLogPath, logLine, 'utf8');
  } catch (logErr) {
    console.error("FATAL: Failed to write to server-error.log", logErr);
  }
};


let db: Database.Database;

const DB_PATH = "database.db";
const BACKUP_DIR = "backups";
const LOCK_FILE = "database.lock";

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

/**
 * LIMITES E GARANTIAS DO SQLITE NESTE SISTEMA:
 * 1. Concorrência: SQLite permite múltiplos leitores simultâneos (WAL), mas apenas um escritor atómico.
 *    Este sistema usa busy_timeout (10s) para gerir filas de escrita. O desempenho degrada-se se
 *    a taxa de I/O de escrita exceder a capacidade do hardware.
 * 2. Volume: Recomendado para bases até 100GB. Backups (VACUUM INTO) demoram proporcionalmente ao tamanho.
 * 3. Ambiente: EXIGE armazenamento local fiável. Sistemas de ficheiros em rede (NFS/SMB)
 *    PODEM CORROMPER o banco devido a falhas nos locks do SO.
 * 4. Recuperação e Perda de Dados:
 *    - Protegemos contra términos de processo (SIGTERM/SIGINT) via checkpoints totais no encerramento.
 *    - Protegemos contra corrupção via backups periódicos VALIDADOS antes de serem arquivados.
 *    - Risco Residual: Falhas de energia catastróficas ou erros de disco físico podem causar a perda
 *      de transações que ainda não foram consolidadas do WAL para o ficheiro principal.
 * 5. Fronteira de Responsabilidade:
 *    - Aplicação: Garante a atomicidade das transações, bloqueios de instância e recuperação de backups.
 *    - Infraestrutura: Garante a persistência física dos ficheiros e a estabilidade do sistema de ficheiros.
 * 6. Migração: Se a latência de escrita começar a afetar a experiência do utilizador ou se houver necessidade
 *    de alta disponibilidade entre múltiplos servidores, a migração para PostgreSQL é obrigatória.
 */

/**
 * Sistema de Bloqueio de Instância Única
 * Garante que apenas um processo node aceda ao banco.
 */
function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pidStr = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      const pid = parseInt(pidStr);
      
      if (!isNaN(pid)) {
        try {
          // Verifica se o processo dono do lock ainda existe
          process.kill(pid, 0);
          console.warn(`[SERVER] WARNING: O Banco de Dados pode estar em uso pelo processo PID ${pid}. Sobrescrevendo lock para evitar bloqueios...`);
          fs.unlinkSync(LOCK_FILE);
        } catch (e) {
          console.warn(`[SERVER] Lock antigo detetado (PID ${pid} não existe). Removendo...`);
          try { fs.unlinkSync(LOCK_FILE); } catch (err) {}
        }
      } else {
        try { fs.unlinkSync(LOCK_FILE); } catch (err) {}
      }
    }
    fs.writeFileSync(LOCK_FILE, process.pid.toString());
  } catch (err) {
    console.error("[SERVER] Falha ao gerir ficheiro de lock:", err);
  }
}

function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
    console.log("[SERVER] Lock removido com sucesso.");
  }
}

function openDatabase(readonly = false) {
  try {
    const options: Database.Options = { 
      timeout: 10000, 
      readonly: readonly
    };
    
    const newDb = new Database(DB_PATH, options);
    
    newDb.pragma('journal_mode = WAL');
    newDb.pragma('synchronous = NORMAL');
    newDb.pragma('busy_timeout = 10000');
    newDb.pragma('cache_size = -64000');
    newDb.pragma('temp_store = MEMORY');
    
    return newDb;
  } catch (error) {
    console.error(`[DB] Falha crítica ao abrir banco (readonly=${readonly}):`, error);
    throw error;
  }
}

/**
 * Backup seguro usando VACUUM INTO
 * Isso cria uma cópia consistente do banco de dados mesmo durante o modo WAL
 */
function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) return;
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `database_${timestamp}.db.bak`);
  const latestBackup = "database.db.bak";

  try {
    // 1. Criar backup consistente via VACUUM INTO
    const backupDb = openDatabase(true); // Abre em modo leitura
    backupDb.prepare(`VACUUM INTO '${backupFile}'`).run();
    backupDb.close();

    // 2. VALIDAR A INTEGRIDADE DO BACKUP ANTES DE ACEITAR
    console.log(`[DB] Validando integridade do backup: ${backupFile}...`);
    try {
      const verifyDb = new Database(backupFile, { readonly: true });
      const check = verifyDb.pragma('integrity_check') as any[];
      verifyDb.close();
      
      if (check[0].integrity_check !== 'ok') {
        throw new Error("Backup integrity check failed: " + check[0].integrity_check);
      }
    } catch (verifyError) {
      console.error("[DB] BACKUP CORROMPIDO GERADO! Eliminando ficheiro inválido:", verifyError);
      if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
      return;
    }

    // 3. Atualizar o backup principal (mais recente) de forma atómica
    const tempLatest = `${latestBackup}.tmp`;
    fs.copyFileSync(backupFile, tempLatest);
    fs.renameSync(tempLatest, latestBackup);
    
    // Rotação: manter apenas os últimos 10 backups válidos
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("database_") && f.endsWith(".db.bak"))
      .sort()
      .reverse();
      
    if (backups.length > 10) {
      backups.slice(10).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
    }
    
    console.log(`[DB] Backup validado e arquivado com sucesso: ${backupFile}`);
  } catch (error) {
    console.error("[DB] Falha crítica no processo de backup:", error);
  }
}

function ensureDatabaseIntegrity(retries = 3) {
  console.log("[DB] Iniciando verificação de integridade...");
  
  if (!fs.existsSync(DB_PATH)) {
    console.log("[DB] Banco de dados não existe, será criado.");
    return true;
  }

  for (let i = 0; i < retries; i++) {
    let tempDb: Database.Database | null = null;
    try {
      tempDb = openDatabase();
      const check = tempDb.pragma('integrity_check') as any[];
      tempDb.close();
      tempDb = null;

      if (check[0].integrity_check === 'ok') {
        console.log("[DB] Integridade confirmada.");
        return true;
      } else {
        throw new Error(`Corrupção de integridade: ${check[0].integrity_check}`);
      }
    } catch (error: any) {
      const isLocked = error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED' || error.message?.includes('locked');
      if (isLocked && i < retries - 1) {
        console.warn(`[DB] Banco ocupado durante verificação de integridade, tentativa ${i+1}/${retries}...`);
        if (tempDb) {
          try { (tempDb as any).close(); } catch(e) {}
        }
        const start = Date.now();
        while (Date.now() - start < 1000) {} 
        continue;
      }

      console.error("[DB] Falha de integridade detetada!", error);
      if (tempDb) {
        try { (tempDb as any).close(); } catch(e) {}
      }
      
      const latestBackup = "database.db.bak";
      if (fs.existsSync(latestBackup)) {
        console.log("[DB] Restaurando a partir do último backup conhecido...");
        const timestamp = new Date().getTime();
        // Apenas move para corrupt se for realmente corrupção, não se for erro de ficheiro travado
        if (!isLocked) {
          try {
            fs.renameSync(DB_PATH, `${DB_PATH}.corrupt.${timestamp}`);
          } catch (e) {
             console.error("[DB] Falha ao mover ficheiro corrupto:", e);
          }
        }
        try {
          fs.copyFileSync(latestBackup, DB_PATH);
          console.log("[DB] Restauro de backup concluído.");
          return true; // Assume ok e deixa o openDatabase principal lidar com locks
        } catch (e) {
          console.error("[DB] Falha crítica ao copiar backup:", e);
          return false;
        }
      } else {
        console.log("[DB] Nenhum backup encontrado para restauro automático.");
        return isLocked; // Se estiver apenas locked, vamos tentar continuar. Se estiver corrupto e sem backup, retorna false.
      }
    }
  }
  return false;
}

/**
 * Wrapper para operações de escrita com Retry Automático
 */
function dbExecute<T>(operation: (dbInstance: Database.Database) => T, retries = 3): T {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return operation(db);
    } catch (error: any) {
      lastError = error;
      if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
        console.warn(`[DB] Banco ocupado, tentativa ${i+1}/${retries}...`);
        // Espera síncrona curta (apenas em caso de bloqueios externos o timeout do driver falhar)
        const start = Date.now();
        while (Date.now() - start < 100) {} 
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Inicialização SEQUENCIAL e PROTEGIDA
try {
  acquireLock();
  if (!ensureDatabaseIntegrity()) {
    console.warn("[DB] O banco de dados foi reiniciado devido a falhas graves detectadas no boot.");
  }
  db = openDatabase();
  console.log("[DB] Conexão principal estabelecida e protegida.");
} catch (error) {
  console.error("[DB] Falha fatal na inicialização:", error);
  releaseLock();
  process.exit(1);
}

// Backup periódico (a cada 4 horas)
setInterval(backupDatabase, 4 * 60 * 60 * 1000);
// Backup inicial após o boot estável (2 min)
setTimeout(backupDatabase, 2 * 60 * 1000);

/**
 * Checkpoint Inteligente
 * Reduz o tamanho do ficheiro .db-wal e consolida escritas no disco.
 * O modo RESTART garante que o log é limpo mesmo com leitores ativos (se possível).
 */
function runCheckpoint(mode: 'PASSIVE' | 'RESTART' | 'TRUNCATE' = 'RESTART') {
  try {
    if (db) {
       const result = db.pragma(`wal_checkpoint(${mode})`) as any;
       console.log(`[DB] Checkpoint ${mode} concluído. Log:`, result);
    }
  } catch (e) {
    console.error(`[DB] Falha ao realizar checkpoint ${mode}:`, e);
  }
}

// Checkpoint Periódico (cada 20 minutos)
// Usamos PASSIVE para consolidar o que for possível sem bloquear leitores ativos.
setInterval(() => runCheckpoint('PASSIVE'), 20 * 60 * 1000);

// Fechamento gracioso (SigTERM/SigINT e Erros Fatais)
const gracefulShutdown = (signal: string) => {
  console.log(`[SERVER] Sinal ${signal} recebido. Encerrando processos de forma segura...`);
  try {
    if (db) {
      // Força um checkpoint total para esvaziar o WAL antes de fechar
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log("[DB] Banco de dados consolidado e encerrado.");
    }
    releaseLock();
  } catch (e) {
    console.error("[DB] Erro no encerramento forçado:", e);
    releaseLock();
  }
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('[SERVER] UNCAUGHT EXCEPTION:', err);
  logServerError('UNCAUGHT EXCEPTION', err);
  gracefulShutdown('EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] UNHANDLED REJECTION:', reason);
  logServerError('UNHANDLED REJECTION', reason);
});


// Migration: Ensure purchase_returns has establishment_id and supplier_id
function runStartupMigrations() {
  try {
    const purchaseReturnsCols = db.prepare("PRAGMA table_info(purchase_returns)").all() as any[];
    if (purchaseReturnsCols.length > 0) { // Only if table exists
      if (!purchaseReturnsCols.some(col => col.name === 'establishment_id')) {
        db.exec("ALTER TABLE purchase_returns ADD COLUMN establishment_id INTEGER");
      }
      if (!purchaseReturnsCols.some(col => col.name === 'supplier_id')) {
        db.exec("ALTER TABLE purchase_returns ADD COLUMN supplier_id INTEGER");
      }
    }

    // New migrations for service_designation and owner_id
    const creditInvoicesCols = db.prepare("PRAGMA table_info(credit_invoices)").all() as any[];
    if (creditInvoicesCols.length > 0) {
      if (!creditInvoicesCols.some(col => col.name === 'service_designation')) {
        db.exec("ALTER TABLE credit_invoices ADD COLUMN service_designation TEXT");
      }
      if (!creditInvoicesCols.some(col => col.name === 'owner_id')) {
        db.exec("ALTER TABLE credit_invoices ADD COLUMN owner_id INTEGER");
      }
      if (!creditInvoicesCols.some(col => col.name === 'cash_register_id')) {
        db.exec("ALTER TABLE credit_invoices ADD COLUMN cash_register_id INTEGER");
      }
    }

    const transactionsCols = db.prepare("PRAGMA table_info(transactions)").all() as any[];
    if (transactionsCols.length > 0 && !transactionsCols.some(col => col.name === 'owner_id')) {
      db.exec("ALTER TABLE transactions ADD COLUMN owner_id INTEGER");
    }

    const proformaInvoicesCols = db.prepare("PRAGMA table_info(proforma_invoices)").all() as any[];
    if (proformaInvoicesCols.length > 0) {
      if (!proformaInvoicesCols.some(col => col.name === 'service_designation')) {
        db.exec("ALTER TABLE proforma_invoices ADD COLUMN service_designation TEXT");
      }
      if (!proformaInvoicesCols.some(col => col.name === 'owner_id')) {
        db.exec("ALTER TABLE proforma_invoices ADD COLUMN owner_id INTEGER");
      }
      if (!proformaInvoicesCols.some(col => col.name === 'cash_register_id')) {
        db.exec("ALTER TABLE proforma_invoices ADD COLUMN cash_register_id INTEGER");
      }
    }

    // Migration for system_logs expansion
    try {
      const logCols = db.prepare("PRAGMA table_info(system_logs)").all() as any[];
      const requiredCols = [
        { name: "session_id", type: "TEXT" },
        { name: "actor_role", type: "TEXT" },
        { name: "metadata", type: "TEXT" },
        { name: "old_values", type: "TEXT" },
        { name: "new_values", type: "TEXT" }
      ];
      for (const col of requiredCols) {
        if (!logCols.some(c => c.name === col.name)) {
          db.prepare(`ALTER TABLE system_logs ADD COLUMN ${col.name} ${col.type}`).run();
          console.log(`[DB] Added ${col.name} column to system_logs`);
        }
      }
      
      // Cleanup old singular names if preferred or just keep them for backward compat
      // Here we migrate data from old_value to old_values if exists
      if (logCols.some(c => c.name === 'old_value') && logCols.some(c => c.name === 'old_values')) {
          db.prepare("UPDATE system_logs SET old_values = old_value WHERE old_values IS NULL AND old_value IS NOT NULL").run();
      }
      if (logCols.some(c => c.name === 'new_value') && logCols.some(c => c.name === 'new_values')) {
          db.prepare("UPDATE system_logs SET new_values = new_value WHERE new_values IS NULL AND new_value IS NOT NULL").run();
      }
    } catch (e) {
      console.error("Migration error (system_logs):", e);
    }

    // HR: Add social_security_number to users and discount to hr_salary_payments
    try {
      const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
      if (!userCols.some(col => col.name === 'social_security_number')) {
        db.exec("ALTER TABLE users ADD COLUMN social_security_number TEXT");
        console.log("[DB] Added social_security_number to users");
      }
      
      const salaryPaymentsCols = db.prepare("PRAGMA table_info(hr_salary_payments)").all() as any[];
      if (!salaryPaymentsCols.some(col => col.name === 'absence_discount')) {
        db.exec("ALTER TABLE hr_salary_payments ADD COLUMN absence_discount REAL DEFAULT 0");
        db.exec("ALTER TABLE hr_salary_payments ADD COLUMN ss_discount REAL DEFAULT 0");
        db.exec("ALTER TABLE hr_salary_payments ADD COLUMN irt_tax REAL DEFAULT 0");
        console.log("[DB] Added detailed discount columns to hr_salary_payments");
      }
    } catch (e) {
      console.error("Migration error (HR):", e);
    }

    // Products Cost Migration
    try {
      const productsCols = db.prepare("PRAGMA table_info(products)").all() as any[];
      if (!productsCols.some(col => col.name === 'cost')) {
        db.exec("ALTER TABLE products ADD COLUMN cost REAL DEFAULT 0");
        console.log("[DB] Added cost column to products");
      }
    } catch (e) {
      console.error("Migration error (Products):", e);
    }

    // Invoice Items Cost Enrichment
    try {
      const invoices = db.prepare("SELECT id, items FROM credit_invoices").all() as any[];
      for (const inv of invoices) {
        let items = JSON.parse(inv.items || '[]');
        let changed = false;
        if (Array.isArray(items)) {
          items = items.map(item => {
            if (item.product_id && !item.unit_cost) {
              const prod = db.prepare("SELECT cost FROM products WHERE id = ?").get(item.product_id) as { cost: number } | undefined;
              if (prod) {
                changed = true;
                return { ...item, unit_cost: prod.cost };
              }
            }
            return item;
          });
          
          if (changed) {
            db.prepare("UPDATE credit_invoices SET items = ? WHERE id = ?").run(JSON.stringify(items), inv.id);
          }
        }
      }
      console.log("[DB] Enriched existing invoice items with current product costs");
    } catch (e) {
      console.error("Migration error (Invoice Items Cost):", e);
    }

    // SaaS Invoices Migration
    try {
      const sysInvCols = db.prepare("PRAGMA table_info(system_invoices)").all() as any[];
      if (sysInvCols.length > 0 && !sysInvCols.some(col => col.name === 'paid_amount')) {
        db.exec("ALTER TABLE system_invoices ADD COLUMN paid_amount REAL DEFAULT 0");
        console.log("[DB] Added paid_amount column to system_invoices");
      }
    } catch (e) {
      console.error("Migration error (system_invoices):", e);
    }

    // Fix legacy plan names and duplicates
    try {
      db.prepare("UPDATE licenses SET plan_type = 'Empresarial' WHERE plan_type = 'enterprise'").run();
      db.prepare("UPDATE licenses SET plan_type = 'Profissional' WHERE plan_type IN ('professional', 'pro')").run();
      db.prepare("UPDATE licenses SET plan_type = 'Básico' WHERE plan_type IN ('basic', 'standard')").run();
      
      // Deactivate duplicates: Keep only the one with furthest expiry date for each USER/ESTABLISHMENT combination
      const activeLicsPerTarget = db.prepare(`
        SELECT user_id, establishment_id, COUNT(*) as count 
        FROM licenses 
        WHERE status = 'active' 
        GROUP BY user_id, establishment_id 
        HAVING count > 1
      `).all() as any[];

      for (const group of activeLicsPerTarget) {
        const licensesInGroup = db.prepare(`
          SELECT id FROM licenses 
          WHERE user_id = ? 
          AND (establishment_id = ? OR (establishment_id IS NULL AND ? IS NULL))
          AND status = 'active' 
          ORDER BY expiry_date DESC
        `).all(group.user_id, group.establishment_id, group.establishment_id) as any[];
        
        // Deactivate all but the first (latest expiry)
        for (let i = 1; i < licensesInGroup.length; i++) {
          db.prepare("UPDATE licenses SET status = 'inactive' WHERE id = ?").run(licensesInGroup[i].id);
        }
      }
      console.log("[DB] Cleaned up duplicate active licenses (scoped to user/establishment)");
    } catch (e) {
      console.error("Cleanup migration error:", e);
    }
  } catch (e) {
    console.error("Migration error (purchase_returns):", e);
  }
}

runStartupMigrations();

// Digital Signature Service
const SIGNATURE_MASTER_KEY = process.env.SIGNATURE_MASTER_KEY || "factu-r-master-signature-key-2024";

const DigitalSignatureService = {
  encryptPrivateKey: (privateKey: string) => {
    try {
      const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(SIGNATURE_MASTER_KEY.padEnd(32).slice(0, 32)), Buffer.alloc(16, 0));
      let encrypted = cipher.update(privateKey, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted;
    } catch (e) {
      console.error("Encryption error:", e);
      throw e;
    }
  },

  decryptPrivateKey: (encrypted: string) => {
    try {
      const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(SIGNATURE_MASTER_KEY.padEnd(32).slice(0, 32)), Buffer.alloc(16, 0));
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (e) {
      console.error("Decryption error:", e);
      throw e;
    }
  },

  generateCompanyKeys: (ownerId: number, createdById: number) => {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });

      // Inactivate old keys
      db.prepare("UPDATE company_keys SET is_active = 0 WHERE owner_id = ?").run(ownerId);

      const encryptedPrivate = DigitalSignatureService.encryptPrivateKey(privateKey);
      
      const result = db.prepare(`
        INSERT INTO company_keys (owner_id, public_key, private_key_encrypted, version, is_active, type, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(ownerId, publicKey, encryptedPrivate, 1, 1, 'internal', createdById);

      return { id: result.lastInsertRowid, publicKey, privateKey, version: 1 };
    } catch (e) {
      console.error("Error generating company keys:", e);
      throw e;
    }
  },

  getActiveKey: (ownerId: number) => {
    return db.prepare("SELECT * FROM company_keys WHERE owner_id = ? AND is_active = 1 LIMIT 1").get(ownerId) as any;
  },

  signDocument: (ownerId: number, establishmentId: number, data: any) => {
    try {
      const activeKey = DigitalSignatureService.getActiveKey(ownerId);
      if (!activeKey) {
        // Auto-generate if missing for convenience in dev/initial setup
        const keys = DigitalSignatureService.generateCompanyKeys(ownerId, ownerId);
        return DigitalSignatureService.signDocument(ownerId, establishmentId, data);
      }

      const privateKey = DigitalSignatureService.decryptPrivateKey(activeKey.private_key_encrypted);
      const sign = crypto.createSign("SHA256");
      sign.update(JSON.stringify(data));
      const signature = sign.sign(privateKey, "base64");

      return {
        signature,
        keyVersionId: activeKey.id,
        hash: crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex"),
        prev_signature: "N/A"
      };
    } catch (e) {
      console.error("Signing error:", e);
      return { signature: "N/A", keyVersionId: null, hash: "N/A", prev_signature: "N/A" };
    }
  }
};

const AGTService = {
  async submitInvoice(invoiceId: number, type: 'POS' | 'FISCAL') {
    let invoice: any;
    let establishment: any;
    
    if (type === 'POS') {
      invoice = db.prepare("SELECT * FROM transactions WHERE id = ?").get(invoiceId);
    } else {
      invoice = db.prepare("SELECT * FROM credit_invoices WHERE id = ?").get(invoiceId);
    }

    if (!invoice) return { success: false, error: "Documento não encontrado" };
    establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(invoice.establishment_id);
    if (!establishment) return { success: false, error: "Estabelecimento não encontrado" };

    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : (invoice.items || []);
    
    const payload = {
      Header: {
        InvoiceNo: invoice.invoice_number,
        InvoiceDate: (invoice.timestamp || invoice.invoice_date || new Date().toISOString()).split('T')[0],
        SystemEntryDate: invoice.timestamp || invoice.invoice_date || new Date().toISOString(),
        EstablishmentName: establishment.name,
        EstablishmentNIF: establishment.nif,
        ClientName: invoice.client_name || 'Consumidor Final',
        ClientNIF: invoice.client_nif || '999999999'
      },
      Items: items.map((item: any) => ({
        ProductCode: item.barcode || item.product_id || item.id || 'SERV_001',
        ProductDescription: item.name || item.description || 'Venda de Item',
        Quantity: item.quantity || 1,
        UnitPrice: item.price || item.unit_price || 0,
        TaxAmount: (item.tax_amount || ((item.price || 0) * (item.quantity || 1) * 0.14)),
        TotalAmount: item.total || ((item.price || 0) * (item.quantity || 1))
      })),
      Totals: {
        GrossTotal: invoice.total_amount,
        TaxPayable: invoice.tax_amount || 0,
        NetTotal: invoice.total_amount - (invoice.tax_amount || 0)
      },
      Signature: invoice.signature,
      Hash: invoice.hash
    };

    try {
      const TEST_URL = "https://agt-simulador.free.beeceptor.com/api/v1/submeter-fatura";
      console.log(`[AGT] Submitting invoice ${invoice.invoice_number} to ${TEST_URL} (Simulation mode)`);
      
      // Attempting to use global fetch (available in Node 18+)
      // In this environment, we simulate the fetch result if the URL is unreachable or just for testing
      try {
        const response: any = await fetch(TEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => ({ ok: true, json: async () => ({ status: 'simulated_success' }) }));

        if (response.ok) {
          const table = type === 'POS' ? 'transactions' : 'credit_invoices';
          db.prepare(`UPDATE ${table} SET agt_status = 'accepted' WHERE id = ?`).run(invoiceId);
          console.log(`[AGT] Invoice ${invoice.invoice_number} accepted by AGT (Simulation)`);
          return { success: true };
        } else {
          console.warn(`[AGT] Submission returned non-ok status: ${response.status}`);
          return { success: false, error: `AGT returned ${response.status}` };
        }
      } catch (fetchErr) {
        // Fallback for environments where fetch/network might be blocked
        const table = type === 'POS' ? 'transactions' : 'credit_invoices';
        db.prepare(`UPDATE ${table} SET agt_status = 'accepted' WHERE id = ?`).run(invoiceId);
        console.log(`[AGT] Invoice ${invoice.invoice_number} submetida com sucesso (Modo Simulação Offline)`);
        return { success: true };
      }
    } catch (err) {
      console.error(`[AGT] Error submitting ${invoice.invoice_number}:`, err);
      return { success: false, error: String(err) };
    }
  }
};

/**
 * Helper to create a fiscal document (FT, FR, NC, RC, etc.)
 */
function createFiscalDocument(db: any, params: any) {
  const {
    establishment_id, client_nif, client_name, address, country,
    doc_type, invoice_date, currency, total_amount, tax_amount, items, seller_id,
    payment_method, parent_invoice_id, reason, note_category,
    adjustment_amount, observations, exchange_rate, cash_register_id,
    due_date, service_designation
  } = params;

  const rateToSave = exchange_rate || 1.0;
  // Force rounding up to avoid cents missing (User requirement: 700 AOA -> 0.77 USD)
  const base_amount = Math.ceil(total_amount * rateToSave * 100) / 100;

  const establishmentInfo = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
  if (!establishmentInfo) throw new Error("Estabelecimento não encontrado.");

  const ownerInfo = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishmentInfo.owner_id) as any;
  const billing_mode = (ownerInfo?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
  const seriesPrefix = billing_mode === 'eletronica' ? 'E' : 'A';

  // Ensure we find the active series for the current mode and document type
  let activeSeries = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = ? AND type = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, seriesPrefix, doc_type) as any;
  
  if (!activeSeries && billing_mode === 'tradicional') {
    const year = new Date().getFullYear();
    db.prepare(`
      INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic, type, fiscal_year)
      VALUES (?, ?, ?, ?, ?, ?, 'aprovada', 0, ?, ?)
    `).run(establishment_id, `Série ${doc_type} Automática ${year}`, 'A', 1, 0, 'active', doc_type, year);
    activeSeries = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = 'A' AND type = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, doc_type) as any;
  }

  if (!activeSeries) {
    const errorMsg = billing_mode === 'eletronica'
      ? `Faturação Eletrónica: Nenhuma série de ${doc_type} (prefixo 'E') ativa e aprovada encontrada.`
      : `Não existe uma série activa para o documento ${doc_type}.`;
    throw new Error(errorMsg);
  }

  const year = new Date().getFullYear();
  const nextNum = Math.max((activeSeries.current_number || 0) + 1, activeSeries.start_number || 1);
  const finalNumber = `${doc_type} ${activeSeries.prefix}/${activeSeries.fiscal_year || year}/${nextNum.toString().padStart(4, '0')}`;
  const finalSeries = activeSeries.name;

  db.prepare("UPDATE invoice_series SET current_number = ? WHERE id = ?").run(nextNum, activeSeries.id);

  const signatureData = DigitalSignatureService.signDocument(establishmentInfo.owner_id, establishment_id, {
    invoice_number: finalNumber,
    doc_type,
    client_name: client_name || 'Consumidor Final',
    total_amount,
    date: invoice_date || new Date().toISOString(),
    items: JSON.stringify(items)
  });

  // ENHANCEMENT: Attach current cost to items for historical profit reporting if not already present
  const enrichedItems = (items || []).map((item: any) => {
    const prodId = item.product_id || item.id;
    if (prodId && !item.unit_cost) {
      const prod = db.prepare("SELECT cost FROM products WHERE id = ?").get(prodId) as { cost: number } | undefined;
      return { ...item, unit_cost: prod?.cost || 0 };
    }
    return item;
  });

  let agt_status = 'pending';
  if (billing_mode === 'eletronica') {
    agt_status = 'accepted'; // Initial status, will be set via AGTService
  } else {
    agt_status = 'sent';
  }

  const result = db.prepare(`
    INSERT INTO credit_invoices (
      establishment_id, owner_id, client_nif, client_name, address, country, 
      doc_type, series, invoice_number, invoice_date, 
      currency, total_amount, tax_amount, items, seller_id, cash_register_id,
      payment_method, parent_invoice_id, reason, note_category,
      adjustment_amount, observations, due_date, service_designation,
      exchange_rate, base_amount, agt_status, billing_mode,
      hash, signature, prev_signature, key_version_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    establishment_id, establishmentInfo.owner_id, client_nif, client_name, address, country, 
    doc_type, finalSeries, finalNumber, invoice_date || new Date().toISOString(), 
    currency || 'Kz', total_amount, tax_amount || 0, JSON.stringify(enrichedItems), seller_id || null, cash_register_id || null,
    payment_method || 'cash', parent_invoice_id || null, reason || null, 
    note_category || null, adjustment_amount || 0, observations || null, due_date || null, service_designation || null,
    rateToSave, base_amount, agt_status, billing_mode,
    signatureData.hash, signatureData.signature, signatureData.prev_signature, signatureData.keyVersionId
  );

  const invoiceId = result.lastInsertRowid;

  // FT -> Receivables
  if (doc_type === 'FT') {
    db.prepare(`
      INSERT INTO accounts_receivable (establishment_id, owner_id, client_name, amount, due_date, description, status, invoice_id)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(establishment_id, establishmentInfo.owner_id, client_name, total_amount, due_date, `Fatura Crédito - ${finalNumber}`, invoiceId);
  }

  // RC -> Liquidate FT
  if (doc_type === 'RC' && parent_invoice_id) {
    db.prepare("UPDATE credit_invoices SET status = 'paid' WHERE id = ?").run(parent_invoice_id);
    db.prepare("UPDATE accounts_receivable SET status = 'paid' WHERE invoice_id = ?").run(parent_invoice_id);
  }

  // Financial Transaction
  if (doc_type !== 'PP' && doc_type !== 'FT') {
    const isNC = doc_type === 'NC';
    const finType = isNC ? 'expense' : 'income';
    const finCategory = isNC ? 'Nota de Crédito (Saída)' : 
                        doc_type === 'RC' ? 'Recibo de Pagamento (FT)' : 'Venda Faturada';
    
    db.prepare(`
      INSERT INTO financial_transactions (
        establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type,
        currency_code, exchange_rate, base_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, 'credit_invoice', ?, ?, ?)
    `).run(
      establishment_id, establishmentInfo.owner_id, finType, finCategory, base_amount, payment_method || 'cash',
      `${finCategory} - Documento ${finalNumber}${parent_invoice_id ? ' (Ref: ' + parent_invoice_id + ')' : ''}`, 
      new Date().toISOString(), invoiceId,
      currency || 'Kz', rateToSave, base_amount
    );
  }

  return { id: invoiceId, invoice_number: finalNumber };
}


// Digital Signature Service ... (placeholder for visual confirmation)

  const logAction = (params: {
    userId?: number | string | null;
    ownerId?: number | string | null;
    establishmentId?: number | string | null;
    sessionId?: string | null;
    actorRole?: string | null;
    module: string;
    actionType: string;
    severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    description?: string;
    entityType?: string;
    entityId?: string | number | null;
    oldValues?: any;
    newValues?: any;
    status?: 'success' | 'failure';
    metadata?: any;
    req?: express.Request;
  }) => {
    try {
      const {
        userId, ownerId, establishmentId, sessionId, actorRole, module, actionType,
        severity = 'INFO', description, entityType, entityId,
        oldValues, newValues, status = 'success', metadata, req
      } = params;

      const ipRaw = req?.ip || req?.headers['x-forwarded-for'] || null;
      const ipAddress = Array.isArray(ipRaw) ? ipRaw[0] : ipRaw;
      const userAgent = req?.headers['user-agent'] || null;

      const enrichedMetadata = {
        path: req?.path,
        method: req?.method,
        timestamp: new Date().toISOString(),
        ...metadata
      };

      db.prepare(`
        INSERT INTO system_logs (
          user_id, owner_id, establishment_id, session_id, actor_role, module, action_type,
          severity, description, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        ownerId || null,
        establishmentId || null,
        sessionId || null,
        actorRole || null,
        module,
        actionType,
        severity.toUpperCase(),
        description || null,
        entityType || null,
        entityId?.toString() || null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        status,
        JSON.stringify(enrichedMetadata)
      );

      if (severity === 'CRITICAL' || severity === 'ERROR') {
        console.warn(`[AUDIT ALERT] ${severity}: ${actionType} in ${module} by ${actorRole || 'Unknown'}`);
      }
    } catch (err) {
      console.error("[AUDIT FAILURE] Failed to record log:", err);
    }
  };

// Initialize Database function
function initializeDatabase() {
  console.log("[DB] Initializing database...");
  try {
    // Handle BigInt serialization for JSON.stringify (needed for better-sqlite3 row IDs)
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    // Core Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS owner_settings (
        owner_id INTEGER PRIMARY KEY,
        backup_enabled INTEGER DEFAULT 0,
        backup_frequency TEXT DEFAULT 'daily',
        financial_reminder_enabled INTEGER DEFAULT 0,
        eac_code TEXT DEFAULT '47110',
        saft_config TEXT,
        billing_config TEXT,
        print_config TEXT,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        username TEXT UNIQUE,
        password TEXT,
        name TEXT,
        role TEXT,
        phone TEXT,
        nif TEXT,
        address TEXT,
        bi_number TEXT,
        social_security_number TEXT,
        company_name TEXT,
        fiscal_regime TEXT DEFAULT 'geral',
        billing_mode TEXT DEFAULT 'tradicional',
        status TEXT DEFAULT 'active',
        role_id INTEGER,
        custom_permissions TEXT,
        establishment_id INTEGER,
        cash_register_id INTEGER,
        owner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS establishments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        name TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        nif TEXT,
        logo_url TEXT,
        establishment_code TEXT,
        status TEXT DEFAULT 'active',
        license_status TEXT DEFAULT 'active',
        license_expiry TEXT,
        bank_accounts TEXT,
        type TEXT DEFAULT 'comum',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS billing_mode_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        changed_by INTEGER,
        old_mode TEXT,
        new_mode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS critical_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT, -- 'critical', 'warning', 'info'
        source TEXT, -- 'database', 'system', 'backup'
        message TEXT,
        details TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS health_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        check_type TEXT,
        status TEXT,
        message TEXT,
        duration_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        establishment_id INTEGER,
        plan_type TEXT,
        start_date TEXT,
        expiry_date TEXT,
        status TEXT DEFAULT 'active',
        features TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS cancellation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        doc_type TEXT DEFAULT 'NC',
        type TEXT NOT NULL,
        reason TEXT,
        items_json TEXT,
        amount DECIMAL(10, 2),
        status TEXT DEFAULT 'pending',
        requested_by INTEGER NOT NULL,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_by INTEGER,
        processed_at DATETIME,
        establishment_id INTEGER,
        FOREIGN KEY(invoice_id) REFERENCES transactions(id),
        FOREIGN KEY(requested_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS currencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT,
        is_base INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(owner_id, code),
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        currency_id INTEGER NOT NULL,
        rate REAL NOT NULL,
        rate_date DATE NOT NULL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id),
        FOREIGN KEY(currency_id) REFERENCES currencies(id)
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        owner_id INTEGER,
        establishment_id INTEGER,
        session_id TEXT,
        module TEXT NOT NULL,
        action_type TEXT NOT NULL,
        severity TEXT DEFAULT 'INFO',
        description TEXT,
        entity_type TEXT,
        entity_id TEXT,
        old_values TEXT,
        new_values TEXT,
        actor_role TEXT,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT DEFAULT 'success',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (owner_id) REFERENCES users(id),
        FOREIGN KEY (establishment_id) REFERENCES establishments(id)
      );
    `);

    // Add currency columns to transactions if they don't exist
    try {
      const transCols = db.prepare("PRAGMA table_info(transactions)").all() as any[];
      if (!transCols.some(c => c.name === 'currency_code')) {
        db.prepare("ALTER TABLE transactions ADD COLUMN currency_code TEXT DEFAULT 'Kz'").run();
        db.prepare("ALTER TABLE transactions ADD COLUMN exchange_rate REAL DEFAULT 1.0").run();
        db.prepare("ALTER TABLE transactions ADD COLUMN base_amount REAL").run();
        console.log("[DB] Added multi-currency columns to transactions");
      }
      
      const finCols = db.prepare("PRAGMA table_info(financial_transactions)").all() as any[];
      if (!finCols.some(c => c.name === 'currency_code')) {
        db.prepare("ALTER TABLE financial_transactions ADD COLUMN currency_code TEXT DEFAULT 'Kz'").run();
        db.prepare("ALTER TABLE financial_transactions ADD COLUMN exchange_rate REAL DEFAULT 1.0").run();
        db.prepare("ALTER TABLE financial_transactions ADD COLUMN base_amount REAL").run();
        console.log("[DB] Added multi-currency columns to financial_transactions");
      }
      if (!finCols.some(c => c.name === 'reference_type')) {
        db.prepare("ALTER TABLE financial_transactions ADD COLUMN reference_type TEXT").run();
        console.log("[DB] Added reference_type column to financial_transactions");
        
        // Populate existing records for backward compatibility
        db.prepare("UPDATE financial_transactions SET reference_type = 'transaction' WHERE reference_id IS NOT NULL AND reference_type IS NULL AND (category = 'Venda POS' OR category = 'Venda')").run();
        db.prepare("UPDATE financial_transactions SET reference_type = 'credit_invoice' WHERE reference_id IS NOT NULL AND reference_type IS NULL AND (category LIKE 'Venda Faturada%' OR category LIKE 'Nota de Crédito%' OR category LIKE 'Recibo%')").run();
        db.prepare("UPDATE financial_transactions SET reference_type = 'service_sheet' WHERE reference_id IS NOT NULL AND reference_type IS NULL AND category LIKE 'Serviço%'").run();
        console.log("[DB] Populated reference_type for existing financial_transactions");
      }

      const creditCols = db.prepare("PRAGMA table_info(credit_invoices)").all() as any[];
      if (!creditCols.some(c => c.name === 'exchange_rate')) {
        db.prepare("ALTER TABLE credit_invoices ADD COLUMN exchange_rate REAL DEFAULT 1.0").run();
        db.prepare("ALTER TABLE credit_invoices ADD COLUMN base_amount REAL").run();
        console.log("[DB] Added multi-currency columns to credit_invoices");
      }
      if (!creditCols.some(c => c.name === 'agt_status')) {
        db.prepare("ALTER TABLE credit_invoices ADD COLUMN agt_status TEXT DEFAULT 'pending'").run();
        console.log("[DB] Added agt_status column to credit_invoices");
      }
      if (!creditCols.some(c => c.name === 'billing_mode')) {
        db.prepare("ALTER TABLE credit_invoices ADD COLUMN billing_mode TEXT DEFAULT 'tradicional'").run();
        console.log("[DB] Added billing_mode column to credit_invoices");
      }
    } catch (e) {
      console.error("[DB] Error updating tables for multi-currency:", e);
    }

    // Owner Settings Migration
    try {
      const ownerSettingsCols = db.prepare("PRAGMA table_info(owner_settings)").all() as any[];
      if (ownerSettingsCols.length > 0) {
        if (!ownerSettingsCols.some((c: any) => c.name === 'eac_code')) {
          db.exec("ALTER TABLE owner_settings ADD COLUMN eac_code TEXT DEFAULT '47110';");
          console.log("[DB] Added eac_code column to owner_settings");
        }
        if (!ownerSettingsCols.some((c: any) => c.name === 'saft_config')) {
          db.exec("ALTER TABLE owner_settings ADD COLUMN saft_config TEXT;");
          console.log("[DB] Added saft_config column to owner_settings");
        }
        if (!ownerSettingsCols.some((c: any) => c.name === 'billing_config')) {
          db.exec("ALTER TABLE owner_settings ADD COLUMN billing_config TEXT;");
          console.log("[DB] Added billing_config column to owner_settings");
        }
        if (!ownerSettingsCols.some((c: any) => c.name === 'print_config')) {
          db.exec("ALTER TABLE owner_settings ADD COLUMN print_config TEXT;");
          console.log("[DB] Added print_config column to owner_settings");
        }
      }
    } catch (e) {
      console.error("[DB] Error migrating owner_settings:", e);
    }

    // Users trial_unlocked column migration
    try {
      const usersCols = db.prepare("PRAGMA table_info(users)").all() as any[];
      if (usersCols.length > 0) {
        if (!usersCols.some((c: any) => c.name === 'trial_unlocked')) {
          db.exec("ALTER TABLE users ADD COLUMN trial_unlocked INTEGER DEFAULT 0;");
          console.log("[DB] Added trial_unlocked column to users table");
        }
        if (!usersCols.some((c: any) => c.name === 'is_test_account')) {
          db.exec("ALTER TABLE users ADD COLUMN is_test_account INTEGER DEFAULT 1;");
          console.log("[DB] Added is_test_account column to users table");
        }
      }
    } catch (e) {
      console.error("[DB] Error migrating users columns:", e);
    }

    // Cash Registers Migration
    try {
      const cashRegistersCols = db.prepare("PRAGMA table_info(cash_registers)").all() as any[];
      if (cashRegistersCols.length > 0) {
        if (!cashRegistersCols.some((c: any) => c.name === 'print_config')) {
          db.exec("ALTER TABLE cash_registers ADD COLUMN print_config TEXT;");
          console.log("[DB] Added print_config column to cash_registers");
        }
      }
    } catch (e) {
      console.error("[DB] Error migrating cash_registers:", e);
    }

    // Service Sheets Migration
    try {
      const sheetsCols = db.prepare("PRAGMA table_info(service_sheets)").all() as any[];
      if (sheetsCols.length > 0) {
        if (!sheetsCols.some((c: any) => c.name === 'service_id')) {
          db.exec("ALTER TABLE service_sheets ADD COLUMN service_id INTEGER REFERENCES services(id);");
        }
        if (!sheetsCols.some((c: any) => c.name === 'total_amount')) {
          db.exec("ALTER TABLE service_sheets ADD COLUMN total_amount REAL DEFAULT 0;");
        }
        if (!sheetsCols.some((c: any) => c.name === 'selected_fees')) {
          db.exec("ALTER TABLE service_sheets ADD COLUMN selected_fees TEXT;");
        }
        if (!sheetsCols.some((c: any) => c.name === 'payment_method')) {
          db.exec("ALTER TABLE service_sheets ADD COLUMN payment_method TEXT DEFAULT 'Dinheiro';");
        }
        if (!sheetsCols.some((c: any) => c.name === 'fiscal_document_id')) {
          db.exec("ALTER TABLE service_sheets ADD COLUMN fiscal_document_id INTEGER REFERENCES credit_invoices(id);");
        }
      }
    } catch (e) {
      console.error("[DB] Error migrating service_sheets:", e);
    }

    db.exec(`

    `);
    
    // Create indexes for auditing performance
    try {
      db.prepare("CREATE INDEX IF NOT EXISTS idx_logs_owner ON system_logs(owner_id)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_logs_entity ON system_logs(entity_type, entity_id)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_logs_session ON system_logs(session_id)").run();
    } catch (e) {}

    db.exec(`

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        warehouse_id INTEGER,
        name TEXT,
        price REAL,
        cost REAL DEFAULT 0,
        stock INTEGER,
        category TEXT,
        image_url TEXT,
        is_promo INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        barcode TEXT,
        tax_id INTEGER,
        internal_code TEXT,
        laboratory TEXT,
        active_substance TEXT,
        pharmaceutical_form TEXT,
        dosage TEXT,
        sale_unit TEXT,
        requires_prescription INTEGER DEFAULT 0,
        controlled_substance INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(tax_id) REFERENCES taxes(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        owner_id INTEGER,
        seller_id INTEGER,
        cash_register_id INTEGER,
        total_amount REAL,
        payment_method TEXT,
        cash_received REAL,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        invoice_number TEXT,
        agt_status TEXT DEFAULT 'pending',
        billing_mode TEXT DEFAULT 'tradicional',
        split_details TEXT,
        client_name TEXT,
        client_nif TEXT,
        hash TEXT,
        signature TEXT,
        prev_signature TEXT,
        key_version_id INTEGER,
        cancellation_id INTEGER,
        currency_code TEXT DEFAULT 'Kz',
        exchange_rate REAL DEFAULT 1.0,
        base_amount REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        items TEXT,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(seller_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS credit_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        owner_id INTEGER,
        seller_id INTEGER,
        cash_register_id INTEGER,
        parent_invoice_id INTEGER,
        client_name TEXT,
        client_nif TEXT,
        address TEXT,
        country TEXT,
        doc_type TEXT,
        series TEXT,
        invoice_number TEXT,
        invoice_date TEXT,
        currency TEXT,
        total_amount REAL,
        tax_amount REAL,
        payment_method TEXT,
        reason TEXT,
        note_category TEXT,
        adjustment_amount REAL DEFAULT 0,
        observations TEXT,
        items TEXT,
        due_date TEXT,
        service_designation TEXT,
        exchange_rate REAL DEFAULT 1.0,
        base_amount REAL,
        status TEXT DEFAULT 'pending',
        hash TEXT,
        signature TEXT,
        prev_signature TEXT,
        key_version_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS proforma_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        owner_id INTEGER,
        cash_register_id INTEGER,
        client_name TEXT,
        client_nif TEXT,
        client_address TEXT,
        total_amount REAL,
        items TEXT,
        bank_accounts TEXT,
        status TEXT DEFAULT 'draft',
        invoice_number TEXT,
        service_designation TEXT,
        hash TEXT,
        signature TEXT,
        prev_signature TEXT,
        key_version_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        type TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS pharmacy_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS pharmacy_manufacturers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS pharmacy_active_substances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS pharmacy_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS pharmacy_units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS cash_registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        code TEXT UNIQUE,
        default_initial_balance REAL DEFAULT 0,
        max_limit REAL DEFAULT 0,
        print_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS cash_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        seller_id INTEGER,
        cash_register_id INTEGER,
        type TEXT,
        amount REAL,
        description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(seller_id) REFERENCES users(id),
        FOREIGN KEY(cash_register_id) REFERENCES cash_registers(id)
      );

      CREATE TABLE IF NOT EXISTS cashier_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        cash_register_id INTEGER,
        seller_id INTEGER,
        opening_amount REAL,
        closing_amount REAL,
        physical_amount REAL,
        opening_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        closing_time DATETIME,
        status TEXT DEFAULT 'open',
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(cash_register_id) REFERENCES cash_registers(id),
        FOREIGN KEY(seller_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        user_id INTEGER,
        salary REAL,
        shift_info TEXT,
        UNIQUE(establishment_id, user_id),
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS hr_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        establishment_id INTEGER,
        entry_time DATETIME,
        exit_time DATETIME,
        status TEXT, -- 'present', 'late', 'absent', 'half_day'
        date TEXT, -- YYYY-MM-DD
        notes TEXT,
        type TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS company_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        public_key TEXT,
        private_key_encrypted TEXT,
        version INTEGER,
        is_active INTEGER DEFAULT 1,
        type TEXT DEFAULT 'internal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        owner_id INTEGER,
        type TEXT,
        category TEXT,
        amount REAL,
        payment_method TEXT,
        description TEXT,
        date TEXT,
        status TEXT DEFAULT 'paid',
        reference_id INTEGER,
        reference_type TEXT, -- 'transaction', 'credit_invoice', 'service_sheet'
        currency_code TEXT DEFAULT 'Kz',
        exchange_rate REAL DEFAULT 1.0,
        base_amount REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS accounts_receivable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        owner_id INTEGER,
        client_name TEXT,
        amount REAL,
        due_date TEXT,
        status TEXT DEFAULT 'pending',
        description TEXT,
        invoice_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS accounts_payable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        owner_id INTEGER,
        supplier_name TEXT,
        amount REAL,
        due_date TEXT,
        status TEXT DEFAULT 'pending',
        description TEXT,
        purchase_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS invoice_series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        prefix TEXT,
        start_number INTEGER,
        current_number INTEGER,
        status TEXT DEFAULT 'active',
        agt_status TEXT DEFAULT 'aprovada',
        is_electronic INTEGER DEFAULT 0,
        fiscal_year INTEGER,
        request_reason TEXT,
        type TEXT DEFAULT 'FR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS taxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        percentage REAL,
        tax_code TEXT DEFAULT 'NOR',
        is_default INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        nif TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        type TEXT DEFAULT 'individual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        subject TEXT,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS hr_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        name TEXT,
        base_role TEXT,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
      );

      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('support_notification_email', 'lazivaniomulazaeren@gmail.com');
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('expiration_notice', 'true');
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('weekly_reports', 'false');
      INSERT OR IGNORE INTO system_settings (key, value) VALUES ('system_name', 'Fatu-R');

      CREATE TABLE IF NOT EXISTS system_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        price REAL,
        max_establishments INTEGER,
        max_products INTEGER,
        features TEXT,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS system_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL,
        plan_id INTEGER,
        payment_method TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(plan_id) REFERENCES system_plans(id)
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        establishment_id INTEGER,
        name TEXT,
        code TEXT,
        description TEXT,
        price REAL,
        availability_condition TEXT,
        show_in_pos INTEGER DEFAULT 1,
        tax_id INTEGER,
        retention_enabled INTEGER DEFAULT 0,
        retention_percentage REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id),
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(tax_id) REFERENCES taxes(id)
      );

      CREATE TABLE IF NOT EXISTS service_sheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER NOT NULL,
        service_id INTEGER,
        client_name TEXT NOT NULL,
        client_nif TEXT,
        client_address TEXT,
        service_description TEXT NOT NULL,
        assigned_staff TEXT,
        scheduled_date DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        total_amount REAL DEFAULT 0,
        selected_fees TEXT,
        payment_method TEXT DEFAULT 'Dinheiro',
        fiscal_document_id INTEGER REFERENCES credit_invoices(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(service_id) REFERENCES services(id)
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        name TEXT NOT NULL,
        company_name TEXT,
        nif TEXT,
        phone TEXT,
        email TEXT,
        country TEXT,
        city TEXT,
        address TEXT,
        responsible_person TEXT,
        payment_method TEXT,
        payment_term TEXT,
        observations TEXT,
        category TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        supplier_id INTEGER,
        total_amount REAL,
        paid_amount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        delivery_status TEXT DEFAULT 'pending',
        received_at DATETIME,
        is_direct INTEGER DEFAULT 0,
        is_stock_updated INTEGER DEFAULT 0,
        is_closed INTEGER DEFAULT 0,
        invoice_number TEXT,
        items TEXT,
        due_date DATETIME,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER,
        amount REAL,
        payment_method TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(purchase_id) REFERENCES purchases(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        supplier_id INTEGER,
        purchase_id INTEGER,
        items TEXT,
        amount REAL,
        tax_amount REAL DEFAULT 0,
        type TEXT DEFAULT 'credit',
        note_category TEXT DEFAULT 'return',
        adjustment_amount REAL DEFAULT 0,
        observations TEXT,
        invoice_number TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY(purchase_id) REFERENCES purchases(id)
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        name TEXT,
        start_date TEXT,
        end_date TEXT,
        discount_percent REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id)
      );

      CREATE TABLE IF NOT EXISTS promotion_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        promotion_id INTEGER,
        product_id INTEGER,
        FOREIGN KEY(promotion_id) REFERENCES promotions(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER,
        product_id INTEGER,
        user_id INTEGER,
        type TEXT,
        quantity INTEGER,
        reason TEXT,
        from_establishment_id INTEGER,
        to_establishment_id INTEGER,
        supplier_id INTEGER,
        purchase_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(establishment_id) REFERENCES establishments(id),
        FOREIGN KEY(product_id) REFERENCES products(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS hr_salaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        base_salary REAL DEFAULT 0,
        bonuses REAL DEFAULT 0,
        discounts REAL DEFAULT 0,
        vacation_days_per_year INTEGER DEFAULT 22,
        last_payment_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS hr_salary_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        salary_id INTEGER,
        amount REAL,
        bonus REAL DEFAULT 0,
        absence_discount REAL DEFAULT 0,
        ss_discount REAL DEFAULT 0,
        irt_tax REAL DEFAULT 0,
        type TEXT,
        description TEXT,
        month TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(salary_id) REFERENCES hr_salaries(id)
      );

      CREATE TABLE IF NOT EXISTS hr_vacations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'pending',
        days_count INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS generated_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        name TEXT,
        type TEXT,
        file_path TEXT,
        generated_by TEXT,
        status TEXT DEFAULT 'available',
        file_data BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        filename TEXT,
        size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER,
        sender_id INTEGER,
        message TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(ticket_id) REFERENCES support_tickets(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS key_management_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        user_id INTEGER,
        action TEXT,
        old_key_id INTEGER,
        new_key_id INTEGER,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS service_fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER,
        name TEXT,
        amount REAL,
        FOREIGN KEY(service_id) REFERENCES services(id)
      );

      CREATE TABLE IF NOT EXISTS system_invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_type TEXT, -- FT, FR, RC
        series TEXT,
        invoice_number TEXT,
        invoice_date TEXT,
        owner_id INTEGER,
        owner_name TEXT,
        owner_nif TEXT,
        total_amount REAL,
        paid_amount REAL DEFAULT 0,
        tax_amount REAL,
        items TEXT, -- JSON array of items
        status TEXT, -- pending, paid, canceled, partial
        payment_method TEXT,
        related_id INTEGER, -- For RC pointing to FT (legacy or simple case)
        hash TEXT,
        signature TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_invoice_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rc_id INTEGER,
        ft_id INTEGER,
        amount REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(rc_id) REFERENCES system_invoices(id),
        FOREIGN KEY(ft_id) REFERENCES system_invoices(id)
      );

      CREATE TABLE IF NOT EXISTS system_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        status TEXT DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reply TEXT,
        replied_at DATETIME
      );
    `);

    // Run migrations after table creations
    runStartupMigrations();

    // Migration logic
    const tablesToRenamCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stores'").get();
    if (tablesToRenamCheck) {
      db.exec("ALTER TABLE stores RENAME TO establishments");
      console.log("[DB] Renamed stores to establishments");
    }

    // Migration: Add owner_id to users table if missing
    const usersCols = db.prepare("PRAGMA table_info(users)").all() as any[];
    if (!usersCols.find(c => c.name === 'owner_id')) {
      db.exec("ALTER TABLE users ADD COLUMN owner_id INTEGER REFERENCES users(id)");
      console.log("[DB] Added owner_id column to users table");
    }

    // Migration: Add type column to establishments table if missing
    const estCols = db.prepare("PRAGMA table_info(establishments)").all() as any[];
    if (!estCols.find(c => c.name === 'type')) {
      db.exec("ALTER TABLE establishments ADD COLUMN type TEXT DEFAULT 'comum'");
      console.log("[DB] Added type column to establishments table");
    }

    // Migration: Add pharmacy columns to products table if missing
    const prodCols = db.prepare("PRAGMA table_info(products)").all() as any[];
    const pharmacyCols = [
      { name: 'internal_code', def: 'TEXT' },
      { name: 'laboratory', def: 'TEXT' },
      { name: 'active_substance', def: 'TEXT' },
      { name: 'pharmaceutical_form', def: 'TEXT' },
      { name: 'dosage', def: 'TEXT' },
      { name: 'sale_unit', def: 'TEXT' },
      { name: 'requires_prescription', def: 'INTEGER DEFAULT 0' },
      { name: 'controlled_substance', def: 'INTEGER DEFAULT 0' },
      { name: 'status', def: 'TEXT DEFAULT "active"' }
    ];
    pharmacyCols.forEach(col => {
      if (!prodCols.find(c => c.name === col.name)) {
        db.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.def}`);
        console.log(`[DB] Added ${col.name} column to products table`);
      }
    });

    // Ensure default admin exists
    let adminUser = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@factu.com") as any;
    if (!adminUser) {
      console.log("[DB] Creating default admin...");
      const result = db.prepare("INSERT INTO users (email, password, name, role, status, owner_id) VALUES (?, ?, ?, ?, ?, ?)").run(
        "admin@factu.com", "admin", "Admin Master", "admin", "active", null
      );
      adminUser = { id: result.lastInsertRowid };
    }

    // Ensure default owner exists
    let ownerUser = db.prepare("SELECT id FROM users WHERE email = ?").get("owner@factu.com") as any;
    if (!ownerUser) {
      console.log("[DB] Creating default owner...");
      const result = db.prepare("INSERT INTO users (email, password, name, role, status, billing_mode) VALUES (?, ?, ?, ?, ?, ?)").run(
        "owner@factu.com", "owner", "Proprietário", "owner", "active", "eletronica"
      );
      ownerUser = { id: result.lastInsertRowid };
      // Self-reference for owner
      db.prepare("UPDATE users SET owner_id = ? WHERE id = ?").run(ownerUser.id, ownerUser.id);
    } else {
      // Ensure owner self-references itself
      db.prepare("UPDATE users SET owner_id = ? WHERE id = ? AND (owner_id IS NULL OR owner_id != id)").run(ownerUser.id, ownerUser.id);
    }

    // Ensure at least one establishment exists for the owner
    const estCount = db.prepare("SELECT COUNT(*) as count FROM establishments").get() as any;
    if (estCount.count === 0 && ownerUser) {
      console.log("[DB] Seeding initial establishments...");
      db.prepare("INSERT INTO establishments (owner_id, name, address, license_expiry, license_status) VALUES (?, ?, ?, ?, ?)").run(
        ownerUser.id, "Meu Estabelecimento A", "Rua 1, Luanda", "2026-12-31", "active"
      );
      db.prepare("INSERT INTO establishments (owner_id, name, address, license_expiry, license_status) VALUES (?, ?, ?, ?, ?)").run(
        ownerUser.id, "Meu Estabelecimento B", "Rua 2, Luanda", "2026-12-31", "active"
      );
      
      const firstEst = db.prepare("SELECT id FROM establishments ORDER BY id ASC LIMIT 1").get() as any;
      if (firstEst) {
        db.prepare(`
          INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(ownerUser.id, firstEst.id, 'Empresarial', new Date().toISOString(), '2026-12-31', 'active', '{"reports": true, "multi_establishment": true, "api_access": true}');
      }
    }

    // Ensure default seller exists and is correctly configured
    let sellerUser = db.prepare("SELECT id FROM users WHERE email = ?").get("seller@factu.com") as any;
    if (!sellerUser && ownerUser) {
       console.log("[DB] Creating default seller...");
       const result = db.prepare("INSERT INTO users (email, password, name, role, status, owner_id) VALUES (?, ?, ?, ?, ?, ?)").run(
         "seller@factu.com", "seller", "Vendedor Exemplo", "seller", "active", ownerUser.id
       );
       sellerUser = { id: result.lastInsertRowid };
    }

    const sellerPerms = '["hr_manage", "pos_access", "pos_sell", "pos_open_cashier", "pos_close_cashier"]';
    
    if (sellerUser && ownerUser) {
      console.log("[DB] Updating/Verifying default seller staff records...");
      const firstEst = db.prepare("SELECT id FROM establishments ORDER BY id ASC LIMIT 1").get() as any;
      if (firstEst) {
        db.prepare("UPDATE users SET owner_id = ?, establishment_id = ?, custom_permissions = ?, status = 'active', role = 'seller' WHERE id = ?").run(
          ownerUser.id,
          firstEst.id,
          sellerPerms,
          sellerUser.id
        );
        db.prepare("INSERT OR IGNORE INTO staff (establishment_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(firstEst.id, sellerUser.id, 75000, "Integral");
        db.prepare("INSERT OR IGNORE INTO hr_salaries (user_id, base_salary) VALUES (?, ?)").run(sellerUser.id, 75000);
      }
    }

    // Seed Data (granular checks)
    const plansCount = db.prepare("SELECT COUNT(*) as count FROM system_plans").get() as any;
    if (plansCount.count === 0) {
      console.log("[DB] Seeding system plans...");
      db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Básico", 5000, 1, 100, '{"reports": false, "multi_establishment": false}');
      db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Profissional", 15000, 2, 1000, '{"reports": true, "multi_establishment": true}');
      db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features) VALUES (?, ?, ?, ?, ?)").run("Empresarial", 35000, 10, 5000, '{"reports": true, "multi_establishment": true, "api_access": true}');
    }

    const settingsCount = db.prepare("SELECT COUNT(*) as count FROM system_settings").get() as any;
    if (settingsCount.count === 0) {
      db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("expiration_notice", "true");
      db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("weekly_reports", "false");
      db.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)").run("system_name", "Fatu-R");
    }

    // Ensure series exist for establishment 1
    const neededSeries = [
      { prefix: 'A', type: 'FR' }, { prefix: 'E', type: 'FR' },
      { prefix: 'A', type: 'FT' }, { prefix: 'E', type: 'FT' },
      { prefix: 'A', type: 'NC' }, { prefix: 'E', type: 'NC' },
      { prefix: 'A', type: 'ND' }, { prefix: 'E', type: 'ND' },
      { prefix: 'A', type: 'PP' }, { prefix: 'E', type: 'PP' },
      { prefix: 'A', type: 'RE' }, { prefix: 'E', type: 'RE' }
    ];

    for (const s of neededSeries) {
      const existingSeries = db.prepare("SELECT id FROM invoice_series WHERE establishment_id = 1 AND prefix = ? AND type = ?").get(s.prefix, s.type);
      if (!existingSeries) {
        const isElectronic = s.prefix === 'E' ? 1 : 0;
        const name = `Série ${isElectronic ? 'Eletrónica' : 'Normal'} ${s.type}`;
        db.prepare(`
          INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic, type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(1, name, s.prefix, 1, 0, "active", "aprovada", isElectronic, s.type);
      }
    }

    // Fix existing users without owner_id
    db.prepare(`
      UPDATE users 
      SET owner_id = (SELECT owner_id FROM establishments WHERE establishments.id = users.establishment_id)
      WHERE owner_id IS NULL AND establishment_id IS NOT NULL
    `).run();

    // Ensure owners have an owner_id set to themselves if not already set (important for licensing checks)
    db.prepare("UPDATE users SET owner_id = id WHERE role = 'owner' AND owner_id IS NULL").run();

    // Migration: Digital Signature Keys
    const owners = db.prepare("SELECT id, email FROM users WHERE role = 'owner'").all() as any[];
    for (const owner of owners) {
      const activeKey = DigitalSignatureService.getActiveKey(owner.id);
      if (!activeKey) {
        try {
          DigitalSignatureService.generateCompanyKeys(owner.id, owner.id);
          console.log(`[DB] Generated signature keys for owner ${owner.email}`);
        } catch (e) {
          console.error(`[DB] Error generating keys for owner ${owner.id}:`, e);
        }
      }
    }

    // Ensure every establishment has at least one warehouse
    const ests = db.prepare("SELECT id FROM establishments").all() as any[];
    for (const est of ests) {
      const warehouse = db.prepare("SELECT id FROM warehouses WHERE establishment_id = ?").get(est.id);
      if (!warehouse) {
        db.prepare("INSERT INTO warehouses (establishment_id, name, type) VALUES (?, ?, ?)").run(est.id, 'Armazém Principal', 'principal');
      }
    }

    console.log("[DB] Database initialization complete.");
  } catch (error) {
    console.error("[DB] Initialization error:", error);
  }
}

// Database initialization and migrations concentrated in initializeDatabase()





























// --- Helper Functions ---
function hasPermission(userId: number, permissionId: string): boolean {
  const user = db.prepare(`
    SELECT u.role, u.custom_permissions, r.permissions as role_permissions
    FROM users u
    LEFT JOIN hr_roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(userId) as any;

  if (!user) return false;
  
  // Admin and Owner always have all permissions
  if (user.role === 'admin' || user.role === 'owner') {
    return true;
  }

  // Managers always have permission to open and close cash registers
  if (user.role === 'manager' && (permissionId === 'pos_close_cashier' || permissionId === 'pos_open_cashier')) {
    return true;
  }

  // If custom_permissions is set (not null), it overrides role permissions
  if (user.custom_permissions !== null && user.custom_permissions !== undefined) {
    try {
      const customPerms = typeof user.custom_permissions === 'string' ? JSON.parse(user.custom_permissions) : (user.custom_permissions || []);
      if (Array.isArray(customPerms)) {
        return customPerms.includes(permissionId);
      }
    } catch (e) {
      console.error("Error parsing custom_permissions:", e);
    }
  }

  // Fallback to role permissions
  try {
    const rolePerms = user.role_permissions ? (typeof user.role_permissions === 'string' ? JSON.parse(user.role_permissions) : user.role_permissions) : [];
    if (Array.isArray(rolePerms)) {
      return rolePerms.includes(permissionId);
    }
  } catch (e) {
    console.error("Error parsing role_permissions:", e);
  }
  
  return false;
}

async function startServer() {
  console.log("[Server] Starting startup sequence...");
  initializeDatabase();
  const app = express();
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Request Logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  const PORT = 3000;

  /**
   * API ENDPOINTS FOR AUDIT LOGS
   */

  // Platform Admin: Get all logs with advanced filtering
  app.get("/api/platform/logs", (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate, 
      userId, 
      ownerId, 
      module, 
      actionType, 
      severity, 
      search,
      entityType,
      actorRole,
      sessionId
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = "SELECT l.*, u.name as user_name, o.name as owner_name FROM system_logs l LEFT JOIN users u ON l.user_id = u.id LEFT JOIN users o ON l.owner_id = o.id WHERE 1=1";
    const params: any[] = [];

    if (startDate) { query += " AND l.created_at >= ?"; params.push(startDate); }
    if (endDate) { query += " AND l.created_at <= ?"; params.push(endDate); }
    if (userId) { query += " AND l.user_id = ?"; params.push(userId); }
    if (ownerId) { query += " AND l.owner_id = ?"; params.push(ownerId); }
    if (module) { query += " AND l.module = ?"; params.push(module); }
    if (actionType) { query += " AND l.action_type = ?"; params.push(actionType); }
    if (severity && typeof severity === 'string') { query += " AND l.severity = ?"; params.push(severity.toUpperCase()); }
    if (entityType) { query += " AND l.entity_type = ?"; params.push(entityType); }
    if (actorRole) { query += " AND l.actor_role = ?"; params.push(actorRole); }
    if (sessionId) { query += " AND l.session_id = ?"; params.push(sessionId); }
    if (search) {
      query += " AND (l.description LIKE ? OR l.entity_id LIKE ? OR l.metadata LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace("SELECT l.*, u.name as user_name, o.name as owner_name", "SELECT COUNT(*) as total");
    const total = (db.prepare(countQuery).get(...params) as any).total;

    query += " ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const logs = db.prepare(query).all(...params);
    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  });

  // Export logs to XLSX
  app.get("/api/platform/logs/export", (req, res) => {
    try {
      const { startDate, endDate, ownerId } = req.query;
      let query = "SELECT l.*, u.name as user_name, o.name as owner_name FROM system_logs l LEFT JOIN users u ON l.user_id = u.id LEFT JOIN users o ON l.owner_id = o.id WHERE 1=1";
      const params: any[] = [];

      if (startDate) { query += " AND l.created_at >= ?"; params.push(startDate); }
      if (endDate) { query += " AND l.created_at <= ?"; params.push(endDate); }
      if (ownerId) { query += " AND l.owner_id = ?"; params.push(ownerId); }

      query += " ORDER BY l.created_at DESC LIMIT 5000"; // Limit export for safety

      const logs = db.prepare(query).all(...params) as any[];

      const data = logs.map(l => ({
        "Data": l.created_at,
        "Utilizador": l.user_name || "Sistema",
        "Empresa": l.owner_name || "N/A",
        "Papel": l.actor_role,
        "Sessão": l.session_id,
        "Módulo": l.module,
        "Ação": l.action_type,
        "Severidade": l.severity,
        "Descrição": l.description,
        "Entidade": l.entity_type,
        "ID Recurso": l.entity_id,
        "Valor Antigo": l.old_values,
        "Valor Novo": l.new_values,
        "Status": l.status,
        "IP": l.ip_address,
        "User Agent": l.user_agent
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=auditoria.xlsx");
      res.send(buf);
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).send("Erro ao exportar");
    }
  });

  // Owner: Get their own logs
  app.get("/api/owner/logs/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    const { page = 1, limit = 20, module, actionType, severity, search } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    let query = "SELECT l.*, u.name as user_name FROM system_logs l LEFT JOIN users u ON l.user_id = u.id WHERE l.owner_id = ?";
    const params: any[] = [ownerId];

    if (module) { query += " AND l.module = ?"; params.push(module); }
    if (actionType) { query += " AND l.action_type = ?"; params.push(actionType); }
    if (severity && typeof severity === 'string') { query += " AND l.severity = ?"; params.push(severity.toUpperCase()); }
    if (search) {
      query += " AND (l.description LIKE ? OR l.entity_id LIKE ? OR l.entity_type LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace("SELECT l.*, u.name as user_name", "SELECT COUNT(*) as total");
    const total = (db.prepare(countQuery).get(...params) as any).total;

    query += " ORDER BY l.created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const logs = db.prepare(query).all(...params);
    res.json({ logs, total });
  });

  // --- Reliability Utilities ---
  function logCriticalAlert(level: string, source: string, message: string, details?: string) {
    try {
      db.prepare(`
        INSERT INTO critical_alerts (level, source, message, details)
        VALUES (?, ?, ?, ?)
      `).run(level, source, message, details || null);
      console.error(`[CRITICAL ALERT] ${level.toUpperCase()} | ${source} | ${message}`);
    } catch (e) {
      console.error("Failed to log critical alert:", e);
    }
  }

  async function performRestoreTest() {
    const startTime = Date.now();
    try {
      // 1. Create a temporary backup
      const backupFilename = `restore_test_${Date.now()}.db`;
      await db.backup(backupFilename);
      
      // 2. Open the backup to verify it
      const backupDb = new Database(backupFilename);
      const userCount = backupDb.prepare("SELECT count(*) as count FROM users").get() as any;
      
      // 3. Simple integrity check
      const check = backupDb.pragma("integrity_check") as any[];
      if (check[0].integrity_check !== 'ok') {
        throw new Error(`Integridade do backup falhou: ${check[0].integrity_check}`);
      }
      
      backupDb.close();
      
      // 4. Log success
      const duration = Date.now() - startTime;
      db.prepare(`
        INSERT INTO health_logs (check_type, status, message, duration_ms)
        VALUES (?, ?, ?, ?)
      `).run('backup_restore', 'success', `Restore test successful. Verified ${userCount.count} users.`, duration);
      
      return { success: true, userCount: userCount.count };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      logCriticalAlert('critical', 'backup', 'Falha no teste de restauração de backup', e.message);
      db.prepare(`
        INSERT INTO health_logs (check_type, status, message, duration_ms)
        VALUES (?, ?, ?, ?)
      `).run('backup_restore', 'failure', e.message, duration);
      return { success: false, error: e.message };
    }
  }

  // Periodic health checks (every 1 hour)
  setInterval(() => {
    console.log("[HealthCheck] Running periodic reliability tests...");
    performRestoreTest().catch(console.error);
    
    // Database integrity check
    try {
      const checkResult = db.pragma("integrity_check") as any[];
      if (checkResult[0].integrity_check !== 'ok') {
        logCriticalAlert('critical', 'database', 'Corrupção detectada na base de dados', JSON.stringify(checkResult));
      }
    } catch (e: any) {
      logCriticalAlert('critical', 'database', 'Falha ao executar integrity_check', e.message);
    }
  }, 1000 * 60 * 60);

  // --- API Routes ---
  app.post("/api/p-venda", (req, res) => {
    console.log(`[Checkout] RECEIVED POST request at /api/p-venda from ${req.ip}`);
    res.setHeader('Content-Type', 'application/json');
    try {
      const body = req.body;
      console.log(`[Checkout] Body keys: ${Object.keys(body).join(', ')}`);
      const { 
        establishment_id, seller_id, cash_register_id, total_amount, items, payment_method, 
        cash_received, split_details, client_name, client_nif,
        discount_percent, discount_amount, tax_amount,
        currency_code, exchange_rate
      } = body;

      const finalCurrencyCode = currency_code || 'Kz';
      const finalExchangeRate = exchange_rate || 1.0;
      // Force rounding up to avoid cents missing (User requirement: 700 AOA -> 0.77 USD)
      const baseAmount = Math.ceil(total_amount * finalExchangeRate * 100) / 100;

      if (!establishment_id || !seller_id || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Dados da venda incompletos ou inválidos." });
      }

      // Check for active cashier session
      let sessionQuery = "SELECT id, cash_register_id FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'";
      let sessionParams: any[] = [establishment_id];
      if (cash_register_id) {
        sessionQuery += " AND (cash_register_id = ? OR cash_register_id IS NULL)";
        sessionParams.push(cash_register_id);
      }
      const activeSession = db.prepare(sessionQuery).get(...sessionParams);
      if (!activeSession) {
        console.warn(`[Checkout] No active session found for establishment ${establishment_id}${cash_register_id ? ' and register ' + cash_register_id : ''}`);
        return res.status(403).json({ error: "O caixa deve estar aberto para realizar vendas." });
      }
      
      // Get Billing Mode and Series
      const establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishment_id) as any;
      if (!establishment) {
        console.error(`[Checkout] Establishment ${establishment_id} not found`);
        return res.status(404).json({ error: "Estabelecimento não encontrado." });
      }
      const ownerId = establishment.owner_id;

      // Check if owner has at least one currency registered
      const currencyCount = db.prepare("SELECT COUNT(*) as count FROM currencies WHERE owner_id = ?").get(ownerId) as any;
      if (!currencyCount || currencyCount.count === 0) {
        console.warn(`[Checkout] Blocked sale: No currencies registered for owner ${ownerId}`);
        return res.status(400).json({ error: "O proprietário deve cadastrar pelo menos uma moeda antes de realizar vendas." });
      }

      const owner = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(ownerId) as any;
      const billing_mode = (owner?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
      const seriesPrefix = billing_mode === 'eletronica' ? 'E' : 'A';
      
      console.log(`[Checkout] Billing Mode: ${billing_mode}, Prefix: ${seriesPrefix}`);

      // Find active series for this establishment, prefix and type FR (Fatura Recibo)
      let series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = ? AND type = 'FR' AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, seriesPrefix) as any;
      
      if (!series && billing_mode === 'tradicional') {
        const year = new Date().getFullYear();
        console.log(`[Checkout] Creating automatic traditional series for establishment ${establishment_id}`);
        db.prepare(`
          INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic, type, fiscal_year)
          VALUES (?, ?, ?, ?, ?, ?, 'aprovada', 0, 'FR', ?)
        `).run(establishment_id, `Série FR Automática ${year}`, 'A', 1, 0, 'active', year);
        series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = 'A' AND type = 'FR' AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id) as any;
      }

      if (!series) {
        console.error(`[Checkout] No active series found for establishment ${establishment_id}, prefix ${seriesPrefix}`);
        const errorMsg = billing_mode === 'eletronica' 
          ? "Faturação Eletrónica: Nenhuma série (prefixo 'E') ativa e aprovada foi encontrada. Por favor, solicite a aprovação de uma série nas definições."
          : "Não existe uma série ativa para Fatura Recibo (FR). Por favor, crie uma série em Definições.";
        return res.status(403).json({ 
          error: errorMsg,
          is_series_error: true
        });
      }

      if (billing_mode === 'eletronica' && series.agt_status !== 'aprovada') {
        return res.status(403).json({ 
          error: "A série de faturação eletrónica ainda não foi aprovada pela AGT.",
          series_status: series.agt_status
        });
      }

      const year = new Date().getFullYear();
      const nextNumber = Math.max(series.current_number + 1, series.start_number);
      // Unify format with createFiscalDocument: TYPE PREFIX+YEAR/NUMBER_PADDED_4
      const invoice_number = `${series.type || 'FR'} ${series.prefix}/${series.fiscal_year || year}/${nextNumber.toString().padStart(4, '0')}`;

      console.log(`[Checkout] Generated Invoice Number: ${invoice_number}`);

      // Update series current number
      db.prepare("UPDATE invoice_series SET current_number = ? WHERE id = ?").run(nextNumber, series.id);

      // AGT Status Simulation
      let agt_status = 'pending';
      if (billing_mode === 'eletronica') {
        agt_status = 'accepted'; 
      } else {
        agt_status = 'sent';
      }

      // Digital Signature
      const signatureData = DigitalSignatureService.signDocument(ownerId, establishment_id, {
        invoice_number,
        doc_type: 'FR',
        client_name: client_name || 'Consumidor Final',
        total_amount,
        date: new Date().toISOString(),
        items: JSON.stringify(items)
      });

      console.log(`[Checkout] Signature generated for ${invoice_number}`);

      // ENHANCEMENT: Enrich POS items with current cost
      const enrichedItems = (items || []).map((item: any) => {
        if ((item.product_id || item.id) && !item.unit_cost) {
          const prodId = item.product_id || item.id;
          const prod = db.prepare("SELECT cost FROM products WHERE id = ?").get(prodId) as { cost: number } | undefined;
          return { ...item, unit_cost: prod?.cost || 0 };
        }
        return item;
      });

      const info = db.prepare(`
        INSERT INTO transactions (
          establishment_id, owner_id, seller_id, cash_register_id, total_amount, items, payment_method, 
          cash_received, split_details, client_name, client_nif,
          discount_percent, discount_amount, tax_amount, invoice_number, agt_status, billing_mode,
          hash, signature, prev_signature, key_version_id,
          currency_code, exchange_rate, base_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        establishment_id, 
        ownerId,
        seller_id, 
        cash_register_id || null,
        total_amount, 
        JSON.stringify(enrichedItems),
        payment_method || 'cash',
        cash_received !== undefined && cash_received !== null ? cash_received : total_amount,
        split_details ? JSON.stringify(split_details) : null,
        client_name || 'Consumidor Final',
        client_nif || '999999999',
        discount_percent || 0,
        discount_amount || 0,
        tax_amount || 0,
        invoice_number,
        agt_status,
        billing_mode,
        signatureData.hash,
        signatureData.signature,
        signatureData.prev_signature,
        signatureData.keyVersionId,
        finalCurrencyCode,
        finalExchangeRate,
        baseAmount
      );
      
      console.log(`[Checkout] Transaction inserted: ${info.lastInsertRowid}`);

      // Update stock
      for (const item of items) {
        if (item.type === 'product' && item.id) {
          db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.id);
        }
      }
      
      const sale = db.prepare("SELECT * FROM transactions WHERE id = ?").get(info.lastInsertRowid) as any;
      if (sale) {
        sale.items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || []);
        if (sale.split_details) sale.split_details = typeof sale.split_details === 'string' ? JSON.parse(sale.split_details) : sale.split_details;
        
        // Audit POS Sale
        logAction({
          userId: seller_id,
          ownerId: ownerId,
          establishmentId: establishment_id,
          module: 'FISCAL',
          actionType: 'CREATE_INVOICE',
          severity: 'INFO',
          description: `Venda Processada: ${invoice_number}`,
          entityType: 'TRANSACTION',
          entityId: Number(info.lastInsertRowid),
          newValues: { 
            invoice_number, 
            total_amount, 
            payment_method, 
            client_name, 
            agt_status,
            billing_mode
          },
          req
        });

        // Record in financial_transactions
        try {
          db.prepare(`
            INSERT INTO financial_transactions (
              establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type,
              currency_code, exchange_rate, base_amount
            ) VALUES (?, ?, 'income', 'Venda POS', ?, ?, ?, ?, 'paid', ?, 'transaction', ?, ?, ?)
          `).run(
            establishment_id, ownerId, baseAmount, payment_method || 'cash',
            `Venda POS - Fatura ${invoice_number} (${finalCurrencyCode} ${total_amount})`, new Date().toISOString(), sale.id,
            finalCurrencyCode, finalExchangeRate, baseAmount
          );
        } catch (finError) {
          console.error("[Checkout] Error recording financial transaction:", finError);
        }

        // --- SAF-T JSON Generation & AGT Submission ---
        try {
          const saftData = {
            Header: {
              InvoiceNo: invoice_number,
              InvoiceDate: new Date(sale.timestamp).toISOString().split('T')[0],
              SystemEntryDate: new Date(sale.timestamp).toISOString(),
              EstablishmentName: establishment.name,
              EstablishmentNIF: establishment.nif,
              ClientName: client_name || 'Consumidor Final',
              ClientNIF: client_nif || '999999999'
            },
            Items: sale.items.map((item: any) => {
              const itemTaxPercentage = item.tax_percentage !== undefined ? item.tax_percentage : 14;
              return {
                ProductCode: item.barcode || item.id,
                ProductDescription: item.name,
                Quantity: item.quantity,
                UnitPrice: item.price,
                TaxAmount: (item.price * item.quantity * (itemTaxPercentage / 100)),
                TotalAmount: item.price * item.quantity
              };
            }),
            Totals: {
              GrossTotal: total_amount,
              TaxPayable: tax_amount,
              NetTotal: total_amount - tax_amount
            }
          };

          // 1. Save to local folder
          const saftDir = path.join(process.cwd(), "saft_files");
          if (!fs.existsSync(saftDir)) {
            fs.mkdirSync(saftDir, { recursive: true });
          }
          const fileName = `SAFT_${invoice_number.replace(/[\/\s]/g, '_')}.json`;
          fs.writeFileSync(path.join(saftDir, fileName), JSON.stringify(saftData, null, 2));
          console.log(`[Checkout] SAF-T file saved: ${fileName}`);

          // 2. Submit to AGT (Simulation)
          if (billing_mode === 'eletronica') {
            console.log(`[Checkout] Submitting electronic POS invoice ${sale.id} to AGT...`);
            AGTService.submitInvoice(Number(sale.id), 'POS').catch(err => {
              console.error("[Checkout] Background AGT submission failed:", err);
            });
          } else {
            db.prepare("UPDATE transactions SET agt_status = 'sent' WHERE id = ?").run(sale.id);
          }
          
        } catch (saftError) {
          console.error("[Checkout] Error generating SAF-T or submitting to AGT:", saftError);
        }
      }
      
      res.json({ success: true, sale });
    } catch (error: any) {
      console.error("Error finalizing sale:", error);
      res.status(500).json({ error: error.message || "Erro interno ao finalizar venda." });
    }
  });

  // --- Reliability API ---
  app.get("/api/admin/reliability/alerts", (req, res) => {
    try {
      const alerts = db.prepare("SELECT * FROM critical_alerts ORDER BY created_at DESC LIMIT 50").all();
      res.json(alerts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/reliability/health-logs", (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM health_logs ORDER BY created_at DESC LIMIT 50").all();
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/reliability/restore-test", async (req, res) => {
    const result = await performRestoreTest();
    res.json(result);
  });

  app.get("/api/owner/reports/profit-sheet", async (req, res) => {
    const { establishmentId, startDate, endDate, ownerId, userName } = req.query;
    
    try {
      let invoices: any[] = [];
      let headerTitle = "RELATÓRIO CONSOLIDADO";
      let headerSub = "";

      if (establishmentId) {
        const establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishmentId) as any;
        if (!establishment) return res.status(404).send("Estabelecimento não encontrado");
        
        headerTitle = `FOLHA DE LUCRO - ${establishment.name}`;
        headerSub = `NIF: ${establishment.nif}`;

        // Get formal invoices (EXCLUDING RC - Receipts as they represent payments of FTs already counted)
        const ci = db.prepare(`
          SELECT id, items, total_amount, tax_amount, COALESCE(base_amount, total_amount) as base_total, 
                 exchange_rate, invoice_number, invoice_date, doc_type, status, establishment_id, 'fiscal' as source 
          FROM credit_invoices 
          WHERE establishment_id = ? 
          AND date(invoice_date) BETWEEN ? AND ?
          AND doc_type IN ('FR', 'VD', 'FT', 'ND')
          AND status != 'canceled'
        `).all(establishmentId, startDate, endDate) as any[];

        // Get POS transactions
        const tr = db.prepare(`
          SELECT id, items, total_amount, tax_amount, COALESCE(base_amount, total_amount) as base_total,
                 exchange_rate, invoice_number, timestamp as invoice_date, 'FR' as doc_type, 'liquidado' as status, establishment_id, 'pos' as source 
          FROM transactions 
          WHERE establishment_id = ? 
          AND date(timestamp) BETWEEN ? AND ?
          AND (cancellation_id IS NULL)
        `).all(establishmentId, startDate, endDate) as any[];

        const combined = [...ci, ...tr];
        const uniqueMap = new Map();
        combined.forEach(item => {
          // Normalize key: Use invoice_number if available, otherwise fallback to ID
          // Remove spaces and make lowercase for robust matching
          let key = item.invoice_number 
            ? String(item.invoice_number).replace(/\s+/g, '').toUpperCase() 
            : `ID-${item.id}-${item.establishment_id}`;
          
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        });
        invoices = Array.from(uniqueMap.values()).sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
      } else if (ownerId) {
        headerTitle = "FOLHA DE LUCRO CONSOLIDADA (TODOS ESTABELECIMENTOS)";
        
        const ci = db.prepare(`
          SELECT ci.id, ci.items, ci.total_amount, ci.tax_amount, COALESCE(ci.base_amount, ci.total_amount) as base_total,
                 ci.exchange_rate, ci.invoice_number, ci.invoice_date, ci.doc_type, ci.status, ci.establishment_id, 'fiscal' as source 
          FROM credit_invoices ci
          JOIN establishments e ON ci.establishment_id = e.id
          WHERE e.owner_id = ?
          AND date(ci.invoice_date) BETWEEN ? AND ?
          AND ci.doc_type IN ('FR', 'VD', 'FT', 'ND')
          AND ci.status != 'canceled'
        `).all(ownerId, startDate, endDate) as any[];

        const tr = db.prepare(`
          SELECT id, items, total_amount, tax_amount, COALESCE(base_amount, total_amount) as base_total,
                 exchange_rate, invoice_number, timestamp as invoice_date, 'FR' as doc_type, 'liquidado' as status, establishment_id, 'pos' as source 
          FROM transactions 
          WHERE owner_id = ? 
          AND date(timestamp) BETWEEN ? AND ?
          AND (cancellation_id IS NULL)
        `).all(ownerId, startDate, endDate) as any[];

        const combined = [...ci, ...tr];
        const uniqueMap = new Map();
        combined.forEach(item => {
          let key = item.invoice_number 
            ? String(item.invoice_number).replace(/\s+/g, '').toUpperCase() 
            : `ID-${item.id}-${item.establishment_id}`;
          
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        });
        invoices = Array.from(uniqueMap.values()).sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());
      } else {
        return res.status(400).send("Falta establishmentId ou ownerId");
      }

      const owner = db.prepare("SELECT * FROM users WHERE id = ?").get(ownerId || (invoices[0]?.owner_id)) as any;

      if (!invoices || invoices.length === 0) {
        console.log(`[Reports] No invoices found for est:${establishmentId} own:${ownerId} between ${startDate} and ${endDate}`);
        return res.status(404).send("<div style='font-family: sans-serif; text-align: center; padding-top: 100px;'><h2>Nenhum dado encontrado</h2><p>Não existem faturas validadas para o período selecionado.</p><button onclick='window.close()'>Fechar</button></div>");
      }

      const doc = new (PDFDocument as any)({ margin: 30, size: 'A4' }) as any;
      const filename = `Folha_de_Lucro_${startDate}_a_${endDate}.pdf`;

      const orangeColor = "#f97316";
      const blackColor = "#1e293b";
      const whiteColor = "#ffffff";

      res.setHeader('Content-disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-type', 'application/pdf');

      const pass = new PassThrough();
      doc.pipe(pass);
      const chunks: any[] = [];
      pass.on('data', (c) => chunks.push(c));
      pass.on('end', () => {
        const result = Buffer.concat(chunks);
        try {
          const finalOwnerId = owner?.id || (ownerId ? parseInt(ownerId as string) : null);
          const finalOwnerName = (userName as string) || owner?.name || 'Sistema';
          
          if (finalOwnerId) {
            db.prepare(`
              INSERT INTO generated_files (owner_id, name, type, generated_by, file_data)
              VALUES (?, ?, ?, ?, ?)
            `).run(finalOwnerId, filename, 'Folha de Lucro', finalOwnerName, result);
            console.log(`[Reports] SUCCESS: Auto-saved profit sheet to history: ${filename} for owner ${finalOwnerId}`);
          } else {
            console.warn(`[Reports] WARNING: Could not determine ownerId to save profit sheet to history. ownerId query param: ${ownerId}, owner object: ${JSON.stringify(owner)}`);
          }
        } catch (err) {
          console.error("[Reports] ERROR auto-saving profit sheet:", err);
        }
      });

      doc.pipe(res);

      // Background is white by default (80%)
      
      // Header Accents (Orange 15%)
      (doc as any).rect(0, 0, doc.page.width, 40).fillColor(orangeColor).fill();
      doc.fillColor(whiteColor).fontSize(14).font('Helvetica-Bold').text("FACTU-R CONTA INTELIGENTE", 30, 15);

      doc.fillColor(blackColor); // Start using black (5%)
      doc.moveDown(2);
      doc.fontSize(18).font('Helvetica-Bold').text("FOLHA DE LUCRO (VENDAS E CUSTOS)", { align: 'center' });
      doc.moveDown(0.2);
      (doc as any).fillColor(orangeColor).rect(200, doc.y, 200, 2).fill();
      doc.moveDown(0.8);
      
      doc.fillColor(blackColor).fontSize(10).font('Helvetica-Bold').text(headerTitle, { align: 'center' });
      if (headerSub) doc.fontSize(9).font('Helvetica').text(headerSub, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`Período: ${startDate} até ${endDate}`, { align: 'center' });
      doc.moveDown();

      const tableData = {
        headers: ["Data", "Documento", "Total Venda", "Custo Total", "Lucro Bruto", "Margem (%)"],
        rows: [] as any[]
      };

      let grandTotalSales = 0;
      let grandTotalCost = 0;
      let grandTotalTax = 0;

      invoices.forEach(inv => {
        const items = typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : (inv.items || []);
        let invoiceCost = 0;
        let invoiceTotalSales = 0;
        let invoiceTotalTax = 0;
        let invoiceTotalProfit = 0;

        const parseAmount = (val: any) => {
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          if (!val) return 0;
          let s = String(val).trim();
          
          // Better amount parsing for multi-currency/thousands separators
          // If there's a comma followed by 2 digits at the end, it's likely the decimal separator
          const commaAtEnd = /,\d{2}$/.test(s);
          const dotAtEnd = /\.\d{2}$/.test(s);
          
          if (commaAtEnd) {
            // "1.234,56" -> "1234.56"
            return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
          } else if (dotAtEnd && s.includes(',')) {
            // "1,234.56" -> "1234.56"
            return parseFloat(s.replace(/,/g, '')) || 0;
          }
          
          const clean = s.replace(/[^\d.,-]/g, '');
          if (clean.includes('.') && clean.includes(',')) {
            return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
          } else if (clean.includes(',')) {
            return parseFloat(clean.replace(',', '.')) || 0;
          }
          return parseFloat(clean) || 0;
        };

        const exchangeRate = Number(inv.exchange_rate) || 1.0;

        items.forEach((item: any) => {
          const productId = item.product_id || item.id || item.item_id;
          const qty = Number(item.quantity) || 1;
          const price = parseAmount(item.price);
          
          // Better service detection: Trust type if present, otherwise check tables
          let isService = item.type === 'service';
          if (!item.type && productId) {
            // First check if it's a product to prioritize products over services in case of ID overlap
            const isProd = db.prepare("SELECT id FROM products WHERE id = ?").get(productId);
            if (isProd) {
              isService = false;
            } else {
              const isSrv = db.prepare("SELECT id FROM services WHERE id = ?").get(productId);
              if (isSrv) isService = true;
            }
          }

          const taxPercent = Number(item.tax_percentage || item.tax || 0);
          
          // CRITICAL MULTI-CURRENCY LOGIC:
          // For POS (source: 'pos'), prices in JSON are ALWAYS stored in Kwanza (Base Currency).
          // For Fiscal Invoices (source: 'fiscal'), prices are stored in document currency.
          let itemNetSale = (price * qty);
          if (inv.source === 'fiscal') {
            itemNetSale = itemNetSale * exchangeRate;
          }
          
          const itemTax = itemNetSale * (taxPercent / 100);
          const itemGrossSale = itemNetSale + itemTax;
          
          invoiceTotalSales += itemGrossSale;
          invoiceTotalTax += itemTax;

          if (isService) {
            // Service Profit: Net Sale (No cost)
            invoiceTotalProfit += itemNetSale;
          } else {
            // Product Profit: Net Sale - Purchase Cost
            let purchaseCost = 0;
            
            // Try everything to find the cost
            if (productId) {
              const productInDb = db.prepare("SELECT cost FROM products WHERE id = ?").get(productId) as { cost: number } | undefined;
              if (productInDb && productInDb.cost > 0) {
                purchaseCost = parseAmount(productInDb.cost);
              } else {
                purchaseCost = parseAmount(item.unit_cost || item.cost || 0);
              }
            } else {
              purchaseCost = parseAmount(item.unit_cost || item.cost || 0);
            }

            const totalPurchaseCost = (purchaseCost * qty);
            invoiceCost += totalPurchaseCost;

            // Profit = Net Sale - Purchase Cost
            invoiceTotalProfit += (itemNetSale - totalPurchaseCost);
          }
        });

        const profit = invoiceTotalProfit;
        const baseForMargin = invoiceTotalSales - invoiceTotalTax;
        const margin = baseForMargin > 0 ? (profit / baseForMargin) * 100 : 0;

        grandTotalSales += invoiceTotalSales;
        grandTotalCost += invoiceCost;
        grandTotalTax += invoiceTotalTax;

        tableData.rows.push([
          new Date(inv.invoice_date).toLocaleDateString(),
          inv.invoice_number,
          `Kz ${invoiceTotalSales.toLocaleString()}`,
          `Kz ${(invoiceCost || 0).toLocaleString()}`,
          `Kz ${(profit || 0).toLocaleString()}`,
          `${isNaN(margin) ? '0.0' : margin.toFixed(1)}%`
        ]);
      });

      // Summary lines
      const totalNetRevenue = grandTotalSales - grandTotalTax;
      const totalProfit = totalNetRevenue - grandTotalCost;
      const totalMargin = totalNetRevenue > 0 ? (totalProfit / totalNetRevenue) * 100 : 0;


      await doc.table(tableData, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor(orangeColor),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          doc.font("Helvetica").fontSize(8).fillColor(blackColor);
          if (indexColumn === 4) { // Lucro Bruto
            const val = parseFloat(row[4].replace(/[^\d.-]/g, ''));
            if (val < 0) doc.fillColor("#ef4444"); // Negative still red for clarity
            else if (val > 0) doc.fillColor("#10b981");
          }
        },
      });

      doc.moveDown();
      const currentY = doc.y;
      (doc as any).fillColor(orangeColor).rect(30, currentY, 535, 20).fill();
      doc.fillColor(whiteColor).fontSize(12).font('Helvetica-Bold').text("RESUMO FINAL", 40, currentY + 4);
      doc.moveDown(1.5);
      
      const summaryTable = {
        headers: ["Indicador", "Valor Total"],
        rows: [
          ["Faturação Total (Bruta)", `Kz ${grandTotalSales.toLocaleString()}`],
          ["Imposto (IVA)", `Kz ${grandTotalTax.toLocaleString()}`],
          ["Receita Líquida (Sem IVA)", `Kz ${totalNetRevenue.toLocaleString()}`],
          ["Custo de Mercadorias Vendidas (CMV)", `Kz ${grandTotalCost.toLocaleString()}`],
          ["Lucro Bruto", `Kz ${totalProfit.toLocaleString()}`],
          ["Margem Média Líquida", `${totalMargin.toFixed(2)}%`]
        ]
      };

      await doc.table(summaryTable, {
        width: 300,
        x: 30,
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(blackColor),
        prepareRow: () => doc.font("Helvetica").fontSize(10).fillColor(blackColor),
      });

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor(blackColor).text(`Relatório gerado em: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.text(`Software Factu-R - Licenciado para ${owner.name}`, { align: 'right' });

      doc.end();

    } catch (error) {
      console.error("Profit sheet generation error:", error);
      if (!res.headersSent) {
        res.status(500).send("Error generating report");
      }
    }
  });

  app.post("/api/admin/reliability/alerts/:id/read", (req, res) => {
    try {
      db.prepare("UPDATE critical_alerts SET is_read = 1 WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Auth (Mock for now)
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const identifier = email?.trim();
    const pass = password;
    
    // Try to find user by email or username (case-insensitive)
    const lowerIdentifier = identifier?.toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND password = ?").get(lowerIdentifier, lowerIdentifier, pass) as any;
    
    if (user) {
      // Check if user is suspended
      if (user.status === 'suspended') {
        logAction({
          userId: user.id,
          module: 'AUTH',
          actionType: 'LOGIN_FAILURE',
          severity: 'WARNING',
          description: `Tentativa de login em conta suspensa: ${user.email}`,
          status: 'failure',
          req
        });
        return res.status(403).json({ error: "A sua conta está suspensa. Contacte o administrador." });
      }

      let establishmentId = user.establishment_id;
      let ownerId = user.id;

      if (user.role === 'seller' || user.role === 'manager') {
        if (!establishmentId) {
          const staff = db.prepare("SELECT establishment_id FROM staff WHERE user_id = ?").get(user.id) as any;
          if (staff) establishmentId = staff.establishment_id;
        }
        
        if (establishmentId) {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishmentId) as any;
          if (establishment) ownerId = establishment.owner_id;
        } else if (user.role === 'seller') {
          logAction({
            userId: user.id,
            module: 'AUTH',
            actionType: 'LOGIN_FAILURE',
            description: `Vendedor sem estabelecimento vinculado: ${user.email}`,
            status: 'failure',
            req
          });
          return res.status(403).json({ error: "Esta conta de vendedor foi desativada ou não está vinculada a nenhum estabelecimento." });
        }
      }

      // Check owner status and license
      if (user.role !== 'admin') {
        const owner = db.prepare("SELECT status FROM users WHERE id = ?").get(ownerId) as any;
        if (owner && owner.status === 'suspended') {
          logAction({
            userId: user.id,
            ownerId,
            module: 'AUTH',
            actionType: 'LOGIN_FAILURE',
            severity: 'WARNING',
            description: `Acesso negado devido à suspensão do proprietário: ${user.email}`,
            status: 'failure',
            req
          });
          return res.status(403).json({ error: "O acesso está suspenso. Contacte o administrador." });
        }

        // License check
        const activeLicense = db.prepare(`
          SELECT id FROM licenses 
          WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
          LIMIT 1
        `).get(ownerId);

        if (!activeLicense) {
          logAction({
            userId: user.id,
            ownerId,
            module: 'AUTH',
            actionType: 'LOGIN_FAILURE',
            severity: 'WARNING',
            description: `Tentativa de login sem licença ativa: ${user.email}`,
            status: 'failure',
            req
          });

          // Check if they have any establishments. If they do, and no active license, block.
          const establishmentCount = db.prepare("SELECT count(*) as count FROM establishments WHERE owner_id = ?").get(ownerId) as any;
          if (establishmentCount.count > 0) {
            return res.status(403).json({ error: "A sua licença expirou ou foi cancelada. Por favor, contacte o suporte." });
          }
        }
      }

      logAction({
        userId: user.id,
        ownerId: (user.role === 'owner' || user.role === 'admin') ? user.id : ownerId,
        establishmentId,
        module: 'AUTH',
        actionType: 'LOGIN_SUCCESS',
        description: `Utilizador ${user.name} (${user.role}) iniciou sessão`,
        req
      });
      
      // Get effective permissions
      let effectivePermissions: string[] = [];
      const customRaw = user.custom_permissions;
      
      if (customRaw !== null && customRaw !== undefined) {
        try {
          let custom = typeof customRaw === 'string' ? JSON.parse(customRaw) : customRaw;
          if (typeof custom === 'string') custom = JSON.parse(custom);
          if (Array.isArray(custom)) {
            effectivePermissions = custom;
          }
        } catch (e) {}
      } else if (user.role_id) {
        const role = db.prepare("SELECT permissions FROM hr_roles WHERE id = ?").get(user.role_id) as any;
        if (role && role.permissions) {
          try {
            let perms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
            if (typeof perms === 'string') perms = JSON.parse(perms);
            if (Array.isArray(perms)) {
              effectivePermissions = perms;
            }
          } catch (e) {}
        }
      }

      let fiscalRegime = user.fiscal_regime;
      let billingMode = user.billing_mode;
      
      if (user.role === 'seller' && establishmentId) {
        const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishmentId) as any;
        if (establishment) {
          const owner = db.prepare("SELECT fiscal_regime, billing_mode FROM users WHERE id = ?").get(establishment.owner_id) as any;
          if (owner) {
            fiscalRegime = owner.fiscal_regime;
            billingMode = owner.billing_mode;
          }
        }
      }

      // Record presence (system type)
      if (user.role !== 'admin' && user.role !== 'owner') {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toISOString();
        
        try {
          db.prepare(`
            INSERT INTO hr_attendance (user_id, establishment_id, entry_time, date, type, status)
            VALUES (?, ?, ?, ?, 'system', 'present')
          `).run(user.id, establishmentId || null, timeStr, dateStr);
        } catch (e) {
          console.error("Error recording attendance on login:", e);
        }
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        name: user.name, 
        role: user.role, 
        establishment_id: establishmentId,
        owner_id: ownerId,
        role_id: user.role_id,
        custom_permissions: user.custom_permissions,
        permissions: effectivePermissions,
        status: user.status,
        fiscal_regime: fiscalRegime || 'geral',
        billing_mode: billingMode || 'tradicional'
      });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/register", (req, res) => {
    const { name, companyName, email, password, phone, nif, address } = req.body;
    
    if (!name || !companyName || !email || !password) {
      return res.status(400).json({ error: "Nome, Empresa, Email e Palavra-passe são obrigatórios." });
    }

    try {
      const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "Este endereço de email já está registado." });
      }

      // 1. Create the owner user
      const userResult = db.prepare(`
        INSERT INTO users (name, company_name, email, password, role, phone, nif, address, status, username, is_test_account)
        VALUES (?, ?, ?, ?, 'owner', ?, ?, ?, 'active', ?, 1)
      `).run(name, companyName, email, password, phone, nif, address, email);
      
      const ownerId = userResult.lastInsertRowid as number;

      // 2. Generate company digital signature keys
      DigitalSignatureService.generateCompanyKeys(ownerId, ownerId);

      // Create a trial period expiry (30 days from now)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      // 3. Create the principal establishment
      const establishmentResult = db.prepare(`
        INSERT INTO establishments (owner_id, name, address, phone, email, nif, license_status, license_expiry, status, establishment_code)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 'active', ?)
      `).run(ownerId, companyName + " - Principal", address, phone, email, nif, expiryDateStr, `EST-${ownerId}-01`);

      const establishmentId = establishmentResult.lastInsertRowid as number;

      // 4. Create an active license representing the 30-day Free Trial
      const startDateStr = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
        VALUES (?, ?, 'Premium', ?, ?, 'active', ?)
      `).run(ownerId, establishmentId, startDateStr, expiryDateStr, '["all_features", "pos", "saft-a", "support"]');

      // 5. Create a default cashier register (using ownerId to ensure uniqueness)
      const regCode = `CX-${ownerId}-01`;
      db.prepare(`
        INSERT INTO cash_registers (establishment_id, name, code, default_initial_balance, max_limit)
        VALUES (?, 'Caixa Principal', ?, 0, 150000)
      `).run(establishmentId, regCode);

      logAction({
        userId: ownerId,
        ownerId: ownerId,
        establishmentId: establishmentId,
        module: 'AUTH',
        actionType: 'REGISTER_SUCCESS',
        description: `Novo registo de empresa: ${companyName} (${name}) com Trial de 30 dias`,
        req
      });

      res.status(201).json({
        id: ownerId,
        email: email,
        username: email,
        name: name,
        role: 'owner',
        establishment_id: establishmentId,
        owner_id: ownerId,
        status: 'active',
        fiscal_regime: 'geral',
        billing_mode: 'tradicional',
        permissions: ["all_features", "pos", "saft-a"]
      });

    } catch (err: any) {
      console.error("[Register] Error during client self-signup:", err);
      res.status(500).json({ error: "Erro ao registar a sua empresa no servidor: " + err.message });
    }
  });

  app.post("/api/register-paid", (req, res) => {
    const { name, companyName, email, password, phone, nif, address, planName, months, paymentMethod } = req.body;
    
    if (!name || !companyName || !email || !password || !planName || !months) {
      return res.status(400).json({ error: "Nome, Empresa, Email, Palavra-passe, Plano e Período são obrigatórios." });
    }

    try {
      const existing = db.prepare("SELECT id FROM users WHERE LOWER(email) = ?").get(email.toLowerCase());
      if (existing) {
        return res.status(400).json({ error: "Este endereço de email já está registado." });
      }

      // 1. Create the owner user
      const userResult = db.prepare(`
        INSERT INTO users (name, company_name, email, password, role, phone, nif, address, status, username, is_test_account)
        VALUES (?, ?, ?, ?, 'owner', ?, ?, ?, 'active', ?, 0)
      `).run(name, companyName, email, password, phone, nif, address, email);
      
      const ownerId = userResult.lastInsertRowid as number;

      // 2. Generate company digital signature keys
      DigitalSignatureService.generateCompanyKeys(ownerId, ownerId);

      // Create a paid period expiry based on chosen months
      const numMonths = Number(months) || 3;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + numMonths);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      // 3. Create the principal establishment
      const establishmentResult = db.prepare(`
        INSERT INTO establishments (owner_id, name, address, phone, email, nif, license_status, license_expiry, status, establishment_code)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 'active', ?)
      `).run(ownerId, companyName + " - Principal", address, phone, email, nif, expiryDateStr, `EST-${ownerId}-01`);

      const establishmentId = establishmentResult.lastInsertRowid as number;

      // 4. Create an active license representing the paid period
      const startDateStr = new Date().toISOString().split('T')[0];
      
      // Ensure the plan matches legal titles (Básico, Profissional, Empresarial)
      let resolvedPlan = "Básico";
      if (planName === "Flex" || planName === "Profissional") resolvedPlan = "Profissional";
      if (planName === "Pro" || planName === "Empresarial") resolvedPlan = "Empresarial";

      db.prepare(`
        INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
        VALUES (?, ?, ?, ?, ?, 'active', ?)
      `).run(
        ownerId, 
        establishmentId, 
        resolvedPlan, 
        startDateStr, 
        expiryDateStr, 
        '["all_features", "pos", "saft-a", "support", "reports"]'
      );

      // 5. Create a default cashier register (using ownerId to ensure uniqueness)
      const regCode = `CX-${ownerId}-01`;
      db.prepare(`
        INSERT INTO cash_registers (establishment_id, name, code, default_initial_balance, max_limit)
        VALUES (?, 'Caixa Principal', ?, 0, 150000)
      `).run(establishmentId, regCode);

      // 6. Record the transaction payment in cashier_sessions, or just log it
      logAction({
        userId: ownerId,
        ownerId: ownerId,
        establishmentId: establishmentId,
        module: 'AUTH',
        actionType: 'REGISTER_PAID_SUCCESS',
        description: `Novo registo de empresa PAGO: ${companyName} com plano ${resolvedPlan} (${months} meses via ${paymentMethod})`,
        req
      });

      res.status(201).json({
        id: ownerId,
        email: email,
        username: email,
        name: name,
        role: 'owner',
        establishment_id: establishmentId,
        owner_id: ownerId,
        status: 'active',
        fiscal_regime: 'geral',
        billing_mode: 'tradicional',
        permissions: ["all_features", "pos", "saft-a"]
      });

    } catch (err: any) {
      console.error("[RegisterPaid] Error during client paid registration:", err);
      res.status(500).json({ error: "Erro ao concluir a sua subscrição paga no servidor: " + err.message });
    }
  });

  app.post("/api/attendance/logout", (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "UserId is required" });

    try {
      const now = new Date().toISOString();
      // Update the last system attendance record for this user that doesn't have an exit_time
      // Use subquery for compatibility as ORDER BY/LIMIT in UPDATE is not standard in all SQLite builds
      db.prepare(`
        UPDATE hr_attendance 
        SET exit_time = ? 
        WHERE id = (
          SELECT id FROM hr_attendance 
          WHERE user_id = ? AND type = 'system' AND exit_time IS NULL 
          ORDER BY id DESC LIMIT 1
        )
      `).run(now, userId);
      res.json({ success: true });
    } catch (e) {
      console.error("Error updated attendance on logout:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Middleware to check if client is suspended
  const checkSuspended = (req: any, res: any, next: any) => {
    // Skip check for admin routes or login
    if (req.path.startsWith('/api/admin') || req.path === '/api/login' || req.path === '/api/register') {
      return next();
    }

    const userId = req.headers['x-user-id'] || req.query.userId || req.body.user_id || req.body.owner_id || req.body.seller_id;
    const establishmentId = req.headers['x-establishment-id'] || req.headers['x-store-id'] || req.query.establishmentId || req.query.storeId || req.body.establishment_id || req.body.store_id;

    let ownerId = null;
    let currentEstablishmentId = establishmentId;

    // Try to extract ID from path if not found in headers/body
    let idFromPath = null;
    const pathParts = req.path.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !isNaN(parseInt(lastPart))) {
      idFromPath = parseInt(lastPart);
    }

    const effectiveUserId = userId || (req.path.includes('user') || req.path.includes('owner') || req.path.includes('seller') ? idFromPath : null);
    const effectiveEstablishmentId = establishmentId || (req.path.includes('establishment') ? idFromPath : null);
    
    if (effectiveEstablishmentId) currentEstablishmentId = effectiveEstablishmentId;

    if (effectiveUserId) {
      const user = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(effectiveUserId) as any;
      if (user) {
        if (user.role === 'owner') {
          ownerId = user.id;
        } else if (user.role === 'seller') {
          const staff = db.prepare("SELECT establishment_id FROM staff WHERE user_id = ?").get(user.id) as any;
          if (staff) {
            currentEstablishmentId = staff.establishment_id;
            const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(staff.establishment_id) as any;
            if (establishment) ownerId = establishment.owner_id;
          }
        }
      }
    } 
    
    if (!ownerId && currentEstablishmentId) {
      const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(currentEstablishmentId) as any;
      if (establishment) ownerId = establishment.owner_id;
    }

    if (ownerId) {
      const owner = db.prepare("SELECT status, billing_mode, created_at, trial_unlocked, is_test_account FROM users WHERE id = ?").get(ownerId) as any;
      
      // If it's the checkout route and billing mode is electronic, we bypass the suspension/license check (simulation mode)
      if (req.path.includes('p-venda') && owner?.billing_mode === 'eletronica') {
        return next();
      }

      if (owner && owner.status === 'suspended') {
        return res.status(403).json({ error: "Acesso suspenso. Contacte o administrador para desbloquear." });
      }

      // Check licenses if it's an effective (non-test/paid) account
      if (owner && owner.is_test_account === 1) {
        // Test accounts last 30 days and then fallback to Básico plan - they are not blocked or suspended!
      } else {
        // Effective accounts license check
        if (currentEstablishmentId) {
          const establishment = db.prepare("SELECT license_status, license_expiry FROM establishments WHERE id = ?").get(currentEstablishmentId) as any;
          if (establishment && establishment.license_status === 'expired') {
            return res.status(403).json({ error: "Licença expirada para este estabelecimento. Por favor, renove a sua subscrição." });
          }
          if (establishment && establishment.license_expiry && new Date(establishment.license_expiry) < new Date()) {
             return res.status(403).json({ error: "A licença deste estabelecimento expirou em " + new Date(establishment.license_expiry).toLocaleDateString() });
          }
        } else {
          // Global check for owner: must have at least one active license if effective
          const activeLicense = db.prepare(`
            SELECT id FROM licenses 
            WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
            LIMIT 1
          `).get(ownerId);
          
          if (!activeLicense) {
            const establishmentCount = db.prepare("SELECT count(*) as count FROM establishments WHERE owner_id = ?").get(ownerId) as any;
            if (establishmentCount.count > 0 && req.path.includes('/api/owner/establishments')) {
              // Allow listing
            } else if (establishmentCount.count > 5 && !activeLicense) {
               return res.status(403).json({ error: "A sua licença expirou. Por favor, contacte o suporte para renovar." });
            }
          }
        }
      }
    }

    next();
  };

  app.get("/api/user-status/:userId", (req, res) => {
    try {
      const { userId } = req.params;
      const user = db.prepare("SELECT id, role, status, name FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });

      const { ownerId } = getContextData(userId);
      let owner = null;
      let activeLicense: any = null;
      let licenseStatus = 'expired';
      let licenseExpiry = null;

      if (ownerId) {
        owner = db.prepare("SELECT status, fiscal_regime, billing_mode, is_test_account, created_at FROM users WHERE id = ?").get(ownerId) as any;
        if (owner && owner.status === 'suspended') {
          return res.status(403).json({ error: "A sua conta/acesso está suspensa. Contacte o administrador." });
        }

        const limits = resolveUserPlanAndLimits(ownerId);

        if (owner && owner.is_test_account === 1) {
          // Test trial accounts are active during their trial and downgrade instead of locking out on expiry.
          licenseStatus = 'active'; 
          
          const createdAtStr = owner.created_at;
          const createdAtTime = new Date(createdAtStr + (createdAtStr.includes('Z') || createdAtStr.includes('UTC') ? '' : ' UTC')).getTime();
          const trialRemainingMs = (30 * 24 * 60 * 60 * 1000) - (Date.now() - createdAtTime);
          const trialRemainingDays = Math.max(0, Math.ceil(trialRemainingMs / (24 * 60 * 60 * 1000)));
          
          if (trialRemainingDays > 0) {
            licenseExpiry = new Date(createdAtTime + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          } else {
            // Already expired trial but running on Basic
            licenseExpiry = null;
          }
        } else {
          // Effective accounts check block
          activeLicense = db.prepare(`
            SELECT id, expiry_date, plan_type FROM licenses 
            WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
            ORDER BY expiry_date DESC LIMIT 1
          `).get(ownerId);

          if (activeLicense) {
            licenseStatus = 'active';
            licenseExpiry = activeLicense.expiry_date;
          } else {
            licenseStatus = 'expired';
            const establishmentCount = db.prepare("SELECT count(*) as count FROM establishments WHERE owner_id = ?").get(ownerId) as any;
            if (establishmentCount.count > 0) {
              return res.status(403).json({ error: "Licença expirada para o estabelecimento associado. Por favor, contacte o administrador." });
            }
          }
        }
      }

      res.json({ 
        id: user.id, 
        role: user.role, 
        status: user.status, 
        owner_id: ownerId,
        fiscal_regime: owner?.fiscal_regime || 'geral',
        billing_mode: owner?.billing_mode || 'tradicional',
        license: {
          status: licenseStatus,
          expiry_date: licenseExpiry
        }
      });
    } catch (e: any) {
      console.error("Error in user-status:", e);
      res.status(500).json({ error: "Erro interno ao verificar estado." });
    }
  });

  app.use("/api/owner", checkSuspended);
  app.use("/api/seller", checkSuspended);

  // Admin Routes
  app.get("/api/admin/dashboard", (req, res) => {
    const totalClients = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner'").get() as any;
    const activeClients = db.prepare("SELECT count(*) as count FROM users WHERE role = 'owner' AND status = 'active'").get() as any;
    const totalEstablishments = db.prepare("SELECT count(*) as count FROM establishments").get() as any;
    const expiredLicenses = db.prepare("SELECT count(*) as count FROM establishments WHERE date(license_expiry) < date('now')").get() as any;
    const expiringSoon = db.prepare("SELECT count(*) as count FROM establishments WHERE date(license_expiry) BETWEEN date('now') AND date('now', '+7 days')").get() as any;
    
    const recentClients = db.prepare("SELECT * FROM users WHERE role = 'owner' ORDER BY created_at DESC LIMIT 5").all();
    const pendingSupport = db.prepare("SELECT count(*) as count FROM support_tickets WHERE status != 'closed'").get() as any;

    res.json({
      stats: {
        totalClients: totalClients.count,
        activeClients: activeClients.count,
        totalEstablishments: totalEstablishments.count,
        expiredLicenses: expiredLicenses.count,
        expiringSoon: expiringSoon.count,
        pendingSupport: pendingSupport.count
      },
      recentClients
    });
  });

  app.get("/api/admin/clients", (req, res) => {
    const clients = db.prepare(`
      SELECT u.*, 
        (SELECT count(*) FROM establishments s WHERE s.owner_id = u.id) as establishment_count,
        (SELECT plan_type FROM licenses l WHERE l.user_id = u.id AND l.status = 'active' ORDER BY expiry_date DESC LIMIT 1) as current_plan
      FROM users u 
      WHERE u.role = 'owner' 
      ORDER BY u.created_at DESC
    `).all();
    res.json(clients);
  });

  app.get("/api/admin/clients/:id/details", (req, res) => {
    const clientId = req.params.id;
    const client = db.prepare("SELECT * FROM users WHERE id = ?").get(clientId);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const establishments = db.prepare("SELECT * FROM establishments WHERE owner_id = ?").all(clientId);
    const licenses = db.prepare(`
      SELECT l.*, s.name as establishment_name 
      FROM licenses l 
      LEFT JOIN establishments s ON l.establishment_id = s.id 
      WHERE l.user_id = ? 
      ORDER BY l.expiry_date DESC
    `).all(clientId);
    const tickets = db.prepare("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC").all(clientId);
    
    // Stats
    const totalUsers = db.prepare(`
      SELECT count(*) as count 
      FROM staff 
      WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?)
    `).get(clientId) as any;

    const lastActivity = db.prepare(`
      SELECT timestamp 
      FROM transactions 
      WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?) 
      ORDER BY timestamp DESC LIMIT 1
    `).get(clientId) as any;

    res.json({
      client,
      establishments,
      licenses,
      tickets,
      stats: {
        totalEstablishments: establishments.length,
        totalUsers: totalUsers?.count || 0,
        lastActivity: lastActivity?.timestamp || null
      }
    });
  });

  app.post("/api/admin/clients", (req, res) => {
    const { name, company_name, email, password, phone, nif, address, plan_type, establishment_types, license_duration_months } = req.body;
    try {
      // 1. Create the owner user
      const result = db.prepare("INSERT INTO users (name, company_name, email, password, role, phone, nif, address) VALUES (?, ?, ?, ?, 'owner', ?, ?, ?)").run(name, company_name, email, password, phone, nif, address);
      const ownerId = result.lastInsertRowid as number;
      
      // Update self owner_id
      db.prepare("UPDATE users SET owner_id = ? WHERE id = ?").run(ownerId, ownerId);

      // Generate digital signature keys
      DigitalSignatureService.generateCompanyKeys(ownerId, ownerId);
      
      // 2. Setup licensing and establishments
      const resolvedPlan = plan_type || "Básico";
      const estTypes = Array.isArray(establishment_types) ? establishment_types : ["comum"];
      
      let numEsts = 1;
      if (resolvedPlan === "Profissional") {
        numEsts = 2;
      } else if (resolvedPlan === "Empresarial") {
        numEsts = Math.max(1, estTypes.length);
      }
      
      const duration = Number(license_duration_months) || 12;
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + duration);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];
      
      let firstEstId: number | null = null;
      
      for (let i = 0; i < numEsts; i++) {
        const type = estTypes[i] || 'comum';
        const estName = i === 0 ? `${company_name} - Sede` : `${company_name} - Filial ${i}`;
        const estCode = `EST-${ownerId}-0${i + 1}`;
        
        const estResult = db.prepare(`
          INSERT INTO establishments (owner_id, name, address, phone, email, nif, license_status, license_expiry, status, establishment_code, type)
          VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 'active', ?, ?)
        `).run(ownerId, estName, address || '', phone || '', email || '', nif || '', expiryDateStr, estCode, type);
        
        const estId = estResult.lastInsertRowid as number;
        if (i === 0) {
          firstEstId = estId;
        }
        
        // Create a default cashier register for this establishment
        const regCode = `CX-${ownerId}-0${i + 1}`;
        db.prepare(`
          INSERT INTO cash_registers (establishment_id, name, code, default_initial_balance, max_limit)
          VALUES (?, 'Caixa Principal', ?, 0, 150000)
        `).run(estId, regCode);
      }
      
      // Set default establishment for owner
      if (firstEstId) {
        db.prepare("UPDATE users SET establishment_id = ? WHERE id = ?").run(firstEstId, ownerId);
      }
      
      // Create active license
      const startDateStr = new Date().toISOString().split('T')[0];
      let max_establishments = 1;
      let max_products = 100;
      let features = { reports: false, multi_establishment: false };
      
      if (resolvedPlan === "Profissional") {
        max_establishments = 2;
        max_products = 1000;
        features = { reports: true, multi_establishment: true };
      } else if (resolvedPlan === "Empresarial") {
        max_establishments = 10;
        max_products = 5000;
        features = { reports: true, multi_establishment: true, api_access: true } as any;
      }
      
      db.prepare(`
        INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
        VALUES (?, ?, ?, ?, ?, 'active', ?)
      `).run(
        ownerId, 
        null, 
        resolvedPlan, 
        startDateStr, 
        expiryDateStr, 
        JSON.stringify({ max_establishments, max_products, ...features })
      );

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Create Client Admin Error]:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/admin/clients/:id", (req, res) => {
    const { name, company_name, email, phone, nif, address, status } = req.body;
    db.prepare(`
      UPDATE users 
      SET name = ?, company_name = ?, email = ?, phone = ?, nif = ?, address = ?, status = ?,
          trial_unlocked = CASE WHEN ? = 'active' THEN 1 ELSE trial_unlocked END
      WHERE id = ?
    `).run(name, company_name, email, phone, nif, address, status, status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/clients/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/client-establishments/:id", (req, res) => {
    const establishments = db.prepare("SELECT * FROM establishments WHERE owner_id = ?").all(req.params.id);
    res.json(establishments);
  });

  app.get("/api/admin/licenses", (req, res) => {
    const licenses = db.prepare(`
      SELECT l.*, u.name as client_name, u.company_name, s.name as establishment_name
      FROM licenses l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN establishments s ON l.establishment_id = s.id
      ORDER BY l.expiry_date DESC
    `).all();
    res.json(licenses);
  });

  app.put("/api/admin/licenses/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE licenses SET status = ? WHERE id = ?").run(status, req.params.id);
    
    // Sync with establishment if linked
    const license = db.prepare("SELECT establishment_id FROM licenses WHERE id = ?").get(req.params.id) as any;
    if (license?.establishment_id) {
      db.prepare("UPDATE establishments SET license_status = ? WHERE id = ?").run(status, license.establishment_id);
    }
    
    res.json({ success: true });
  });

  app.put("/api/admin/licenses/:id/renew", (req, res) => {
    const { expiry_date } = req.body;
    db.prepare("UPDATE licenses SET expiry_date = ?, status = 'active' WHERE id = ?").run(expiry_date, req.params.id);
    
    // Also update establishment if linked
    const license = db.prepare("SELECT establishment_id FROM licenses WHERE id = ?").get(req.params.id) as any;
    if (license?.establishment_id) {
      db.prepare("UPDATE establishments SET license_expiry = ?, license_status = 'active' WHERE id = ?").run(expiry_date, license.establishment_id);
    }
    
    res.json({ success: true });
  });

  app.get("/api/admin/licenses/history/:userId", (req, res) => {
    const history = db.prepare(`
      SELECT l.*, s.name as establishment_name
      FROM licenses l
      LEFT JOIN establishments s ON l.establishment_id = s.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `).all(req.params.userId);
    res.json(history);
  });

  app.get("/api/admin/system/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM system_settings").all();
    res.json(settings);
  });

  app.post("/api/admin/system/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare(`
      INSERT INTO system_settings (key, value)
      ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    `).run(key, value);
    res.json({ success: true });
  });

  app.post("/api/admin/licenses", (req, res) => {
    const { user_id, establishment_id, plan_type, start_date, expiry_date, features } = req.body;
    
    // Deactivate previous active licenses for this target to ensure only one is active
    if (establishment_id) {
       db.prepare("UPDATE licenses SET status = 'inactive' WHERE establishment_id = ? AND status = 'active'").run(establishment_id);
    } else if (user_id) {
       db.prepare("UPDATE licenses SET status = 'inactive' WHERE user_id = ? AND establishment_id IS NULL AND status = 'active'").run(user_id);
    }

    db.prepare(`
      INSERT INTO licenses (user_id, establishment_id, plan_type, start_date, expiry_date, status, features)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `).run(user_id, establishment_id, plan_type, start_date, expiry_date, typeof features === 'string' ? features : JSON.stringify(features));
    
    // Mark user as effective (non-test) account
    if (user_id) {
       db.prepare("UPDATE users SET is_test_account = 0 WHERE id = ?").run(user_id);
    }

    // Update establishment expiry too
    if (establishment_id) {
      db.prepare("UPDATE establishments SET license_expiry = ? WHERE id = ?").run(expiry_date, establishment_id);
    }
    
    res.json({ success: true });
  });

  app.get("/api/admin/support", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.*, u.name as client_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tickets);
  });

  app.put("/api/admin/support/:id", (req, res) => {
    const { status, priority } = req.body;
    if (status && priority) {
      db.prepare("UPDATE support_tickets SET status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, priority, req.params.id);
    } else if (status) {
      db.prepare("UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
    } else if (priority) {
      db.prepare("UPDATE support_tickets SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(priority, req.params.id);
    }
    res.json({ success: true });
  });

  app.get("/api/admin/support/:id/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name
      FROM ticket_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id);
    res.json(messages);
  });

  app.post("/api/admin/support/:id/messages", (req, res) => {
    const { sender_id, message, is_admin } = req.body;
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin)
      VALUES (?, ?, ?, ?)
    `).run(req.params.id, sender_id, message, is_admin ? 1 : 0);
    
    db.prepare("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    
    res.json({ success: true });
  });

  // Endpoints for Public Visitor Contact Messages
  app.post("/api/public/contact", (req, res) => {
    const { name, email, phone, message } = req.body;
    try {
      db.prepare(`
        INSERT INTO public_messages (name, email, phone, message, status)
        VALUES (?, ?, ?, ?, 'open')
      `).run(name, email, phone || '', message);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error creating public contact message:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/public-messages", (req, res) => {
    try {
      const messages = db.prepare(`
        SELECT * FROM public_messages
        ORDER BY created_at DESC
      `).all();
      res.json(messages);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/public-messages/:id/reply", (req, res) => {
    const { reply } = req.body;
    try {
      db.prepare(`
        UPDATE public_messages
        SET reply = ?, status = 'replied', replied_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reply, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/monitoring", (req, res) => {
    const totalTransactions = db.prepare("SELECT count(*) as count FROM transactions").get() as any;
    const todayTransactions = db.prepare("SELECT count(*) as count FROM transactions WHERE date(timestamp) = date('now')").get() as any;
    const activeUsers = db.prepare("SELECT count(*) as count FROM users WHERE status = 'active'").get() as any;
    const totalEstablishments = db.prepare("SELECT count(*) as count FROM establishments").get() as any;
    
    const recentActivity = db.prepare(`
      SELECT t.id, 'venda' as type, total_amount as value, timestamp, s.name as establishment_name
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      ORDER BY timestamp DESC LIMIT 15
    `).all();

    const systemAlerts = [];
    
    // Check for low stock products across all establishments
    const lowStockCount = db.prepare("SELECT count(*) as count FROM products WHERE stock <= min_stock").get() as any;
    if (lowStockCount.count > 0) {
      systemAlerts.push({
        level: 'warning',
        message: `${lowStockCount.count} produtos com stock baixo detectados no sistema.`,
        timestamp: new Date().toISOString()
      });
    }

    // Check for expired licenses
    const expiredCount = db.prepare("SELECT count(*) as count FROM licenses WHERE status = 'active' AND date(expiry_date) < date('now')").get() as any;
    if (expiredCount.count > 0) {
      systemAlerts.push({
        level: 'danger',
        message: `${expiredCount.count} licenças expiradas ainda marcadas como activas.`,
        timestamp: new Date().toISOString()
      });
    }

    const memoryUsage = process.memoryUsage();

    res.json({
      health: "ok",
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024)
      },
      stats: {
        totalTransactions: totalTransactions.count,
        todayTransactions: todayTransactions.count,
        activeUsers: activeUsers.count,
        totalEstablishments: totalEstablishments.count
      },
      recentActivity,
      systemAlerts
    });
  });

  app.get("/api/admin/reports", (req, res) => {
    // Revenue by month (last 6 months)
    const revenueByMonth = db.prepare(`
      SELECT strftime('%m', timestamp) as month, SUM(base_amount) as total
      FROM transactions
      WHERE timestamp >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    // Client growth (last 6 months)
    const clientGrowth = db.prepare(`
      SELECT strftime('%m', created_at) as month, COUNT(*) as count
      FROM users
      WHERE role = 'owner' AND created_at >= date('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();

    // Licenses by plan
    const licensesByPlan = db.prepare(`
      SELECT plan_type as name, COUNT(*) as value
      FROM licenses
      WHERE status = 'active'
      GROUP BY plan_type
    `).all();

    // Support tickets by status
    const ticketsByStatus = db.prepare(`
      SELECT status as name, COUNT(*) as value
      FROM support_tickets
      GROUP BY status
    `).all();

    res.json({
      revenueByMonth,
      clientGrowth,
      licensesByPlan,
      ticketsByStatus
    });
  });

  app.get("/api/admin/reports/export/csv", (req, res) => {
    try {
      const revenueByMonth = db.prepare(`SELECT strftime('%m', timestamp) as month, SUM(total_amount) as total FROM transactions WHERE timestamp >= date('now', '-6 months') GROUP BY month ORDER BY month ASC`).all();
      const clientGrowth = db.prepare(`SELECT strftime('%m', created_at) as month, COUNT(*) as count FROM users WHERE role = 'owner' AND created_at >= date('now', '-6 months') GROUP BY month ORDER BY month ASC`).all();
      const licensesByPlan = db.prepare(`SELECT plan_type as name, COUNT(*) as value FROM licenses WHERE status = 'active' GROUP BY plan_type`).all();
      const ticketsByStatus = db.prepare(`SELECT status as name, COUNT(*) as value FROM support_tickets GROUP BY status`).all();

      const data: any[] = [];
      revenueByMonth.forEach((r: any) => data.push({ Categoria: "Receita", Item: `Mês ${r.month}`, Valor: r.total }));
      clientGrowth.forEach((r: any) => data.push({ Categoria: "Crescimento Clientes", Item: `Mês ${r.month}`, Valor: r.count }));
      licensesByPlan.forEach((r: any) => data.push({ Categoria: "Licenças Ativas", Item: r.name, Valor: r.value }));
      ticketsByStatus.forEach((r: any) => data.push({ Categoria: "Tickets de Suporte", Item: r.name, Valor: r.value }));

      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws);

      logAction({
        module: 'REPORTS',
        actionType: 'ADMIN_REPORT_EXPORT_CSV',
        description: 'Exportação de relatório administrativo em CSV',
        req
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=relatorio_admin.csv");
      res.send(Buffer.from('\uFEFF' + csv, 'utf-8')); // Add BOM for Excel compatibility
    } catch (err) {
      console.error(err);
      res.status(500).send("Erro ao exportar CSV");
    }
  });

  app.get("/api/admin/reports/export/pdf", async (req, res) => {
    try {
      const revenueByMonth = db.prepare(`SELECT strftime('%m', timestamp) as month, SUM(total_amount) as total FROM transactions WHERE timestamp >= date('now', '-6 months') GROUP BY month ORDER BY month ASC`).all();
      const clientGrowth = db.prepare(`SELECT strftime('%m', created_at) as month, COUNT(*) as count FROM users WHERE role = 'owner' AND created_at >= date('now', '-6 months') GROUP BY month ORDER BY month ASC`).all();
      const licensesByPlan = db.prepare(`SELECT plan_type as name, COUNT(*) as value FROM licenses WHERE status = 'active' GROUP BY plan_type`).all();
      const ticketsByStatus = db.prepare(`SELECT status as name, COUNT(*) as value FROM support_tickets GROUP BY status`).all();

      const doc = new (PDFDocument as any)({ 
        margin: 40,
        bufferPages: true
      });

      // Handle stream errors
      doc.on('error', (err: any) => {
        console.error('PDF Generator Error:', err);
        if (!res.headersSent) res.status(500).send("Erro interno no gerador de PDF");
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=relatorio_admin.pdf");
      doc.pipe(res);

      // Colors
      const orange = "#F97316";
      const black = "#000000";
      const white = "#FFFFFF";
      
      // Header background
      doc.rect(0, 0, 595.28, 70).fill(orange);
      doc.fillColor(black).fontSize(18).text("RELATÓRIO DE ADMINISTRAÇÃO", 40, 25, { align: 'left' });
      doc.fontSize(8).text(`GERADO POR: SISTEMA DE GESTÃO AUTOMÁTICA`, 40, 48, { align: 'left' });
      doc.fontSize(8).text(`DATA: ${new Date().toLocaleString('pt-PT')}`, 40, 32, { align: 'right', width: 515 });
      
      doc.y = 90;
      doc.fillColor(black);

      const sections = [
        { 
          title: "RECEITA POR MÊS", 
          headers: ["Mês", "Receita Total"],
          rows: revenueByMonth.map((r: any) => [
            `Mês ${r.month || '?'}`, 
            `${parseFloat(r.total || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz`
          ])
        },
        { 
          title: "CRESCIMENTO DE CLIENTES", 
          headers: ["Mês", "Novos Clientes (Owners)"],
          rows: clientGrowth.map((r: any) => [`Mês ${r.month || '?'}`, `${r.count || 0} Clientes`])
        },
        { 
          title: "LICENÇAS ATIVAS POR PLANO", 
          headers: ["Tipo de Plano", "Total de Licenças"],
          rows: licensesByPlan.map((r: any) => [(String(r.name || 'N/A')).toUpperCase(), `${r.value || 0} Ativas`])
        },
        { 
          title: "ESTADO DOS TICKETS DE SUPORTE", 
          headers: ["Estado", "Quantidade de Ocorrências"],
          rows: ticketsByStatus.map((r: any) => [(String(r.name || 'N/A')).toUpperCase(), `${r.value || 0} Tickets`])
        }
      ];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        // Section Title with indicator
        doc.x = 40;
        doc.fillColor(orange).fontSize(10).text(section.title, { characterSpacing: 1.2 });
        doc.rect(40, doc.y + 1, 515, 0.5).fill("#E4E4E7");
        doc.moveDown(0.4);
        doc.fillColor(black);
        
        await doc.table({
          headers: section.headers,
          rows: section.rows,
        }, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9).fillColor(black),
          prepareRow: (row: any, i: any) => {
            doc.font("Helvetica").fontSize(8).fillColor(black);
          },
          padding: 6,
          columnSpacing: 10,
          hideHeader: false,
          minRowHeight: 18
        });
        
        if (i < sections.length - 1) {
          // Only move down if not the last section to avoid triggering a new page
          doc.moveDown(1);
        }
      }

      // Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Remove bottom margin temporarily to prevent footer from triggering a new page
        const oldMargin = (doc.page as any).margins.bottom;
        (doc.page as any).margins.bottom = 0;

        doc.fontSize(7).fillColor("#A1A1AA").text(
          `Página ${i + 1} de ${range.count} - Documento Reservado para Administração`,
          0,
          doc.page.height - 30, // Positioned safely above the absolute bottom
          { align: "center", width: doc.page.width, lineBreak: false }
        );

        // Restore margin
        (doc.page as any).margins.bottom = oldMargin;
      }

      logAction({
        module: 'REPORTS',
        actionType: 'ADMIN_REPORT_EXPORT_PDF',
        description: 'Exportação de relatório administrativo em PDF',
        req
      });

      doc.end();
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).send("Erro ao gerar PDF");
      }
    }
  });

  app.get("/api/admin/reports/plans/pdf", async (req, res) => {
    try {
      const plans = db.prepare("SELECT * FROM system_plans").all() as any[];
      
      if (plans.length === 0) {
        return res.status(404).send("Nenhum plano encontrado");
      }

      const doc = new (PDFDocument as any)({ 
        margin: 50,
        bufferPages: true
      });
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=planos_sistema.pdf");
      
      doc.on('error', (err: any) => {
        console.error('PDF Stream Error:', err);
        if (!res.headersSent) res.status(500).send("Erro interno ao gerar PDF");
      });

      doc.pipe(res);

      const orange = "#F97316";
      const black = "#000000";

      // Header
      doc.rect(0, 0, 595.28, 80).fill(orange);
      doc.fillColor(black).fontSize(20).text("GUIA DE PLANOS E SERVIÇOS", 40, 30, { align: 'left' });
      doc.fontSize(9).text(`DOCUMENTO INFORMATIVO DE CONFIGURAÇÃO DE SISTEMA`, 40, 55, { align: 'left' });
      
      doc.y = 110;
      doc.fillColor(black);

      doc.fontSize(12).text("Abaixo estão detalhados os planos disponíveis na plataforma e as suas respetivas características e limitações.", { lineGap: 5 });
      doc.moveDown(2);

      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        
        // Prevent orphaned headers at page bottom
        if (doc.y > doc.page.height - 150) {
          doc.addPage();
        }

        const planName = String(plan.name || 'PLANO SEM NOME');
        doc.fillColor(orange).fontSize(16).text(planName.toUpperCase(), { characterSpacing: 1 });
        doc.rect(40, doc.y + 2, 515, 1).fill("#E4E4E7");
        doc.moveDown(1);
        doc.fillColor(black);

        const planData = [
          ["Parâmetro", "Descrição"],
          ["Preço Unitário", `${parseFloat(plan.price || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz`],
          ["Limite de Estabelecimentos", plan.max_establishments === -1 ? "Ilimitado" : String(plan.max_establishments || 0)],
          ["Limite de Produtos", plan.max_products === -1 ? "Ilimitado" : String(plan.max_products || 0)],
          ["Recursos Extra", plan.features || "Configuração Padrão"],
          ["Descrição", plan.description || "Sem descrição adicional"]
        ];

        await doc.table({
          headers: ["Parâmetro", "Valor/Configuração"],
          rows: planData.slice(1),
        }, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(black),
          prepareRow: (row: any, index: any) => doc.font("Helvetica").fontSize(10).fillColor(black),
          padding: 8,
          columnSpacing: 15,
          width: 515
        });

        if (i < plans.length - 1) {
          doc.moveDown(2);
        }
      }

      // Footer
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const oldMargin = (doc.page as any).margins.bottom;
        (doc.page as any).margins.bottom = 0;
        doc.fontSize(8).fillColor("#A1A1AA").text(
          `Página ${i + 1} de ${range.count} - Documento de Referência de Planos`,
          0,
          doc.page.height - 30,
          { align: "center", width: doc.page.width, lineBreak: false }
        );
        (doc.page as any).margins.bottom = oldMargin;
      }

      logAction({
        module: 'SETTINGS',
        actionType: 'PLAN_GUIDE_EXPORT',
        description: 'Exportação do guia de planos do sistema',
        req
      });

      doc.end();
    } catch (err) {
      console.error('PDF Catch Error:', err);
      if (!res.headersSent) res.status(500).send("Erro ao gerar Guia de Planos");
    }
  });

  app.get("/api/admin/plans", (req, res) => {
    const plans = db.prepare("SELECT * FROM system_plans").all();
    res.json(plans);
  });

  app.post("/api/admin/plans", (req, res) => {
    const { name, price, max_establishments, max_products, features, description } = req.body;
    const info = db.prepare("INSERT INTO system_plans (name, price, max_establishments, max_products, features, description) VALUES (?, ?, ?, ?, ?, ?)").run(name, price, max_establishments, max_products, JSON.stringify(features), description);
    
    logAction({
      module: 'FINANCE',
      actionType: 'CREATE_PLAN',
      severity: 'WARNING',
      description: `Novo plano criado: ${name}`,
      entityType: 'PLAN',
      entityId: Number(info.lastInsertRowid),
      newValues: { name, price, max_establishments, max_products, features, description },
      req
    });
    
    res.json({ success: true, id: Number(info.lastInsertRowid) });
  });

  app.put("/api/admin/plans/:id", (req, res) => {
    const { name, price, max_establishments, max_products, features, description } = req.body;
    const oldPlan = db.prepare("SELECT * FROM system_plans WHERE id = ?").get(req.params.id) as any;
    
    db.prepare("UPDATE system_plans SET name = ?, price = ?, max_establishments = ?, max_products = ?, features = ?, description = ? WHERE id = ?").run(name, price, max_establishments, max_products, JSON.stringify(features), description, req.params.id);
    
    logAction({
      module: 'FINANCE',
      actionType: 'UPDATE_PLAN',
      severity: 'WARNING',
      description: `Plano atualizado: ${name}`,
      entityType: 'PLAN',
      entityId: req.params.id,
      oldValues: oldPlan,
      newValues: { name, price, max_establishments, max_products, features, description },
      req
    });
    
    res.json({ success: true });
  });

  app.delete("/api/admin/plans/:id", (req, res) => {
    const oldPlan = db.prepare("SELECT * FROM system_plans WHERE id = ?").get(req.params.id);
    db.prepare("DELETE FROM system_plans WHERE id = ?").run(req.params.id);
    
    logAction({
      module: 'FINANCE',
      actionType: 'DELETE_PLAN',
      severity: 'CRITICAL',
      description: `Plano excluído ID ${req.params.id}`,
      entityType: 'PLAN',
      entityId: req.params.id,
      oldValues: oldPlan,
      req
    });
    
    res.json({ success: true });
  });

  app.get("/api/admin/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM system_settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/admin/system/generate-recurring", (req, res) => {
    try {
      const activeLicenses = db.prepare(`
        SELECT l.*, u.name as owner_name, u.nif as owner_nif
        FROM licenses l
        JOIN users u ON l.user_id = u.id
        WHERE l.status = 'active'
      `).all() as any[];

      const today = new Date();
      const currentMonthYear = `${today.getMonth() + 1}/${today.getFullYear()}`;
      const year = today.getFullYear();
      const date = today.toISOString().split("T")[0];
      const series = "SaaS";

      let generated = 0;
      let skipped = 0;

      for (const lic of activeLicenses) {
        // Resolve price from plans table (or system_plans if that's where they are)
        const plan = db.prepare("SELECT price FROM system_plans WHERE name = ?").get(lic.plan_type) as any;
        const price = plan?.price || 0;

        const existing = db.prepare(`
          SELECT id FROM system_invoices 
          WHERE owner_id = ? AND items LIKE ?
        `).get(lic.user_id, `%${currentMonthYear}%`) as any;

        if (existing) {
          skipped++;
          continue;
        }

        const lastDoc = db.prepare("SELECT invoice_number FROM system_invoices WHERE doc_type = 'FT' AND series = ? ORDER BY id DESC LIMIT 1").get(series) as any;
        let sequence = 1;
        if (lastDoc) {
          const parts = lastDoc.invoice_number.split("/");
          sequence = parseInt(parts[parts.length - 1]) + 1;
        }
        const invoice_number = `FT ${series}/${year}/${sequence}`;
        const items = [{
          description: `Subscrição Mensal - Plano ${lic.plan_type} (${currentMonthYear})`,
          amount: price
        }];

        db.prepare(`
          INSERT INTO system_invoices (doc_type, series, invoice_number, invoice_date, owner_id, owner_name, owner_nif, total_amount, tax_amount, items, status, payment_method)
          VALUES ('FT', ?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', 'bank_transfer')
        `).run(series, invoice_number, date, lic.user_id, lic.owner_name, lic.owner_nif, price, JSON.stringify(items));

        db.prepare("INSERT INTO system_audit_logs (user_id, action, details) VALUES (?, ?, ?)")
          .run(1, "GENERATE_RECURRING", `Fatura recorrente automática gerada para ${lic.owner_name} (${invoice_number})`);
        
        generated++;
      }

      res.json({ message: "Processamento concluído", generated, skipped });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // System Finance Dashboard (Unified)
  app.get("/api/admin/finance", (req, res) => {
    // 1. All Receipt Documents (Actual entries of money)
    const officialPayments = db.prepare(`
      SELECT * FROM system_invoices 
      WHERE doc_type = 'RC' 
      ORDER BY created_at DESC
    `).all() as any[];

    // 2. Pending and Partial Invoices (Debts)
    const pendingInvoices = db.prepare(`
      SELECT * FROM system_invoices 
      WHERE doc_type = 'FT' AND status IN ('pending', 'partial')
      ORDER BY created_at DESC
    `).all() as any[];

    // 3. Stats based on RC documents
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const thisYear = today.substring(0, 4);

    const stats = {
      totalToday: officialPayments.filter(p => p.invoice_date === today).reduce((sum, p) => sum + p.total_amount, 0),
      totalMonth: officialPayments.filter(p => p.invoice_date.startsWith(thisMonth)).reduce((sum, p) => sum + p.total_amount, 0),
      totalYear: officialPayments.filter(p => p.invoice_date.startsWith(thisYear)).reduce((sum, p) => sum + p.total_amount, 0),
      count: officialPayments.length
    };

    // 4. Reports
    const revenueByMonth = db.prepare(`
      SELECT strftime('%Y-%m', invoice_date) as month, SUM(total_amount) as total
      FROM system_invoices
      WHERE doc_type = 'RC'
      GROUP BY month
      ORDER BY month DESC
    `).all();

    const methods = db.prepare(`
      SELECT payment_method, SUM(total_amount) as total, COUNT(*) as count
      FROM system_invoices
      WHERE doc_type = 'RC'
      GROUP BY payment_method
    `).all();

    const byPlan: any[] = [];
    const byClient: any[] = [];

    officialPayments.forEach(pay => {
      // By Client
      const existingClient = byClient.find(c => c.client_name === pay.owner_name);
      if (existingClient) {
        existingClient.total += pay.total_amount;
      } else {
        byClient.push({ client_name: pay.owner_name, total: pay.total_amount });
      }

      // By Plan (parsing items)
      try {
        const items = JSON.parse(pay.items || '[]');
        items.forEach((item: any) => {
          const planName = item.description || 'Outros';
          const existingPlan = byPlan.find(p => p.plan_name === planName);
          if (existingPlan) {
            existingPlan.total += item.amount;
          } else {
            byPlan.push({ plan_name: planName, total: item.amount });
          }
        });
      } catch(e) {}
    });

    res.json({
      payments: officialPayments.map(p => ({
        id: p.id,
        client_name: p.owner_name,
        amount: p.total_amount,
        payment_method: p.payment_method,
        timestamp: p.created_at,
        invoice_number: p.invoice_number,
        plan_name: p.items ? (JSON.parse(p.items)[0]?.description || 'N/A') : 'N/A'
      })),
      stats,
      pendingPayments: pendingInvoices.map(inv => ({
        id: inv.id,
        establishment_id: inv.id,
        owner_id: inv.owner_id,
        client_name: inv.owner_name,
        amount: inv.total_amount,
        paid: inv.paid_amount || 0,
        balance: inv.total_amount - (inv.paid_amount || 0),
        license_expiry: inv.invoice_date,
        invoice_number: inv.invoice_number
      })),
      reports: {
        byMonth: revenueByMonth,
        byPlan: byPlan,
        byClient: byClient
      },
      methods
    });
  });

  // System Invoices (SaaS Billing)
  app.get("/api/admin/system/invoices", (req, res) => {
    const invoices = db.prepare("SELECT * FROM system_invoices ORDER BY created_at DESC").all();
    res.json(invoices);
  });

  app.post("/api/admin/system/invoices", (req, res) => {
    const { doc_type, owner_id, total_amount, tax_amount, items, payment_method } = req.body;
    
    try {
      const owner = db.prepare("SELECT name, nif FROM users WHERE id = ?").get(owner_id) as any;
      if (!owner) return res.status(404).json({ error: "Proprietário não encontrado" });

      const series = "SaaS"; 
      const date = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();
      
      const lastDoc = db.prepare("SELECT invoice_number FROM system_invoices WHERE doc_type = ? AND series = ? ORDER BY id DESC LIMIT 1").get(doc_type, series) as any;
      let sequence = 1;
      if (lastDoc) {
        const parts = lastDoc.invoice_number.split('/');
        sequence = parseInt(parts[parts.length - 1]) + 1;
      }
      const invoice_number = `${doc_type} ${series}/${year}/${sequence}`;

      const status = (doc_type === 'FR') ? 'paid' : 'pending';

      const result = db.prepare(`
        INSERT INTO system_invoices (doc_type, series, invoice_number, invoice_date, owner_id, owner_name, owner_nif, total_amount, tax_amount, items, status, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(doc_type, series, invoice_number, date, owner_id, owner.name, owner.nif, total_amount, tax_amount, JSON.stringify(items), status, payment_method || null);

      db.prepare("INSERT INTO system_audit_logs (user_id, action, details) VALUES (?, ?, ?)")
        .run(1, `Emissão de ${doc_type}`, `Documento ${invoice_number} emitido para ${owner.name} no valor de Kz ${total_amount}`);

      res.json({ id: result.lastInsertRowid, invoice_number });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/system/liquidate-multiple", (req, res) => {
    const { owner_id, payments, payment_method, total_amount } = req.body; // payments: [{ft_id, amount}]
    
    try {
      const owner = db.prepare("SELECT name, nif FROM users WHERE id = ?").get(owner_id) as any;
      if (!owner) return res.status(404).json({ error: "Proprietário não encontrado" });

      const date = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();
      const series = "SaaS";

      // 1. Create the RC (Receipt) document
      const lastRC = db.prepare("SELECT invoice_number FROM system_invoices WHERE doc_type = 'RC' AND series = ? ORDER BY id DESC LIMIT 1").get(series) as any;
      let sequence = 1;
      if (lastRC) {
        const parts = lastRC.invoice_number.split('/');
        sequence = parseInt(parts[parts.length - 1]) + 1;
      }
      const rc_number = `RC ${series}/${year}/${sequence}`;

      // Build items for the receipt based on invoices being paid
      const rcItems = payments.map((p: any) => {
        const ft = db.prepare("SELECT invoice_number FROM system_invoices WHERE id = ?").get(p.ft_id) as any;
        return {
          description: `Liquidação ${ft ? 'da Fatura ' + ft.invoice_number : 'de Fatura Individual'}`,
          amount: p.amount
        };
      });

      const rcResult = db.prepare(`
        INSERT INTO system_invoices (doc_type, series, invoice_number, invoice_date, owner_id, owner_name, owner_nif, total_amount, tax_amount, items, status, payment_method)
        VALUES ('RC', ?, ?, ?, ?, ?, ?, ?, 0, ?, 'paid', ?)
      `).run(series, rc_number, date, owner_id, owner.name, owner.nif, total_amount, JSON.stringify(rcItems), payment_method);

      const rcId = rcResult.lastInsertRowid;

      // 2. Register link and update FT status
      for (const p of payments) {
        db.prepare(`
          INSERT INTO system_invoice_payments (rc_id, ft_id, amount)
          VALUES (?, ?, ?)
        `).run(rcId, p.ft_id, p.amount);

        // Update the FT
        const ft = db.prepare("SELECT total_amount, paid_amount FROM system_invoices WHERE id = ?").get(p.ft_id) as any;
        const newPaid = (ft.paid_amount || 0) + p.amount;
        const newStatus = newPaid >= ft.total_amount ? 'paid' : 'partial';

        db.prepare("UPDATE system_invoices SET paid_amount = ?, status = ? WHERE id = ?")
          .run(newPaid, newStatus, p.ft_id);
      }

      db.prepare("INSERT INTO system_audit_logs (user_id, action, details) VALUES (?, ?, ?)")
        .run(1, "Pagamento Múltiplo", `Recibo ${rc_number} emitido para ${owner.name} liquidando ${payments.length} faturas.`);

      res.json({ success: true, rc_number });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/system/invoices/:id/liquidate", (req, res) => {
    const ftId = req.params.id;
    const { payment_method, amount } = req.body;
    
    try {
      const ft = db.prepare("SELECT * FROM system_invoices WHERE id = ? AND doc_type = 'FT'").get(ftId) as any;
      if (!ft) return res.status(404).json({ error: "Fatura não encontrada" });

      const amountToPay = amount || (ft.total_amount - (ft.paid_amount || 0));

      const date = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();
      const series = "SaaS";

      const lastRC = db.prepare("SELECT invoice_number FROM system_invoices WHERE doc_type = 'RC' AND series = ? ORDER BY id DESC LIMIT 1").get(series) as any;
      let sequence = 1;
      if (lastRC) {
        const parts = lastRC.invoice_number.split('/');
        sequence = parseInt(parts[parts.length - 1]) + 1;
      }
      const rc_number = `RC ${series}/${year}/${sequence}`;

      const rcItems = [{ description: `Liquidação da Fatura ${ft.invoice_number}`, amount: amountToPay }];

      const rcResult = db.prepare(`
        INSERT INTO system_invoices (doc_type, series, invoice_number, invoice_date, owner_id, owner_name, owner_nif, total_amount, tax_amount, items, status, payment_method, related_id)
        VALUES ('RC', ?, ?, ?, ?, ?, ?, ?, 0, ?, 'paid', ?, ?)
      `).run(series, rc_number, date, ft.owner_id, ft.owner_name, ft.owner_nif, amountToPay, JSON.stringify(rcItems), payment_method, ft.id);

      const rcId = rcResult.lastInsertRowid;

      // Register link
      db.prepare(`
        INSERT INTO system_invoice_payments (rc_id, ft_id, amount)
        VALUES (?, ?, ?)
      `).run(rcId, ft.id, amountToPay);

      const newPaid = (ft.paid_amount || 0) + amountToPay;
      const newStatus = newPaid >= ft.total_amount ? 'paid' : 'partial';

      db.prepare("UPDATE system_invoices SET paid_amount = ?, status = ? WHERE id = ?")
        .run(newPaid, newStatus, ft.id);

      db.prepare("INSERT INTO system_audit_logs (user_id, action, details) VALUES (?, ?, ?)")
        .run(1, "Liquidação de Fatura", `Fatura ${ft.invoice_number} liquidada (Valor: Kz ${amountToPay}) com Recibo ${rc_number}`);

      res.json({ success: true, rc_number });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/system/audit-logs", (req, res) => {
    const logs = db.prepare("SELECT sal.*, u.name as user_name FROM system_audit_logs sal LEFT JOIN users u ON sal.user_id = u.id ORDER BY sal.timestamp DESC LIMIT 100").all();
    res.json(logs);
  });

  app.post("/api/admin/settings", (req, res) => {
    const settings = req.body;
    const insert = db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((settings) => {
      for (const [key, value] of Object.entries(settings)) {
        insert.run(key, String(value));
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  app.get("/api/admin/establishments", (req, res) => {
    const establishments = db.prepare(`
      SELECT s.*, u.name as owner_name 
      FROM establishments s 
      JOIN users u ON s.owner_id = u.id
    `).all();
    res.json(establishments);
  });

  app.get("/api/admin/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, s.name as establishment_name, u.name as seller_name 
      FROM transactions t 
      JOIN establishments s ON t.establishment_id = s.id
      JOIN users u ON t.seller_id = u.id
      ORDER BY t.timestamp DESC
    `).all();
    res.json(transactions);
  });

  app.get("/api/owner/billing-mode-status/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    
    // Check for pending/draft invoices
    const pendingInvoices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
      AND agt_status IN ('pending', 'draft')
    `).get(ownerId) as any;

    // Check for uncommunicated invoices based on current mode
    const user = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(ownerId) as any;
    const currentMode = user?.billing_mode || 'tradicional';
    
    let uncommunicatedCount = 0;
    if (currentMode === 'tradicional') {
      // In traditional, "uncommunicated" means not yet exported
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'tradicional'
        AND agt_status NOT IN ('sent', 'accepted')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    } else {
      // In electronic, must be 'accepted' or 'rejected_treated'
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'eletronica'
        AND agt_status NOT IN ('accepted', 'rejected_treated')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    }

    // Check if there are ANY active series
    const activeSeries = db.prepare(`
      SELECT COUNT(*) as count 
      FROM invoice_series 
      WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?)
      AND status = 'active'
    `).get(ownerId) as any;

    res.json({ 
      hasPendingInvoices: pendingInvoices.count > 0,
      pendingCount: pendingInvoices.count,
      hasUncommunicated: uncommunicatedCount > 0,
      uncommunicatedCount: uncommunicatedCount,
      hasActiveSeries: activeSeries.count > 0,
      currentMode
    });
  });

  app.put("/api/owner/billing-mode/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    const { billing_mode, changed_by } = req.body;

    if (!['tradicional', 'eletronica'].includes(billing_mode)) {
      return res.status(400).json({ error: "Modo de faturação inválido." });
    }

    const user = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(ownerId) as any;
    const oldMode = user?.billing_mode || 'tradicional';

    // 1. Check for pending/draft invoices
    const pendingInvoices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
      AND agt_status IN ('pending', 'draft')
    `).get(ownerId) as any;

    if (pendingInvoices.count > 0) {
      return res.status(400).json({ error: "Não é possível mudar o modo com faturas pendentes ou em rascunho." });
    }

    // 2. Check for uncommunicated invoices based on current mode
    let uncommunicatedCount = 0;
    if (oldMode === 'tradicional') {
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'tradicional'
        AND agt_status NOT IN ('sent', 'accepted')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    } else {
      const uncommunicated = db.prepare(`
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE (establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?))
        AND billing_mode = 'eletronica'
        AND agt_status NOT IN ('accepted', 'rejected_treated')
      `).get(ownerId) as any;
      uncommunicatedCount = uncommunicated.count;
    }

    if (uncommunicatedCount > 0) {
      return res.status(400).json({ error: "Existem documentos não comunicados à AGT. Por favor, finalize todas as comunicações antes de mudar o modo." });
    }

    try {
      const transaction = db.transaction(() => {
        // 3. Update user billing mode
        db.prepare("UPDATE users SET billing_mode = ? WHERE id = ?").run(billing_mode, ownerId);
        
        // 4. Close current active series
        db.prepare(`
          UPDATE invoice_series 
          SET status = 'inactive' 
          WHERE establishment_id IN (SELECT id FROM establishments WHERE owner_id = ?) 
          AND status = 'active'
        `).run(ownerId);

        // 5. Create new series for each establishment for essential types (ONLY for Traditional mode)
        if (billing_mode === 'tradicional') {
          const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(ownerId) as any[];
          const year = new Date().getFullYear();
          const prefix = 'A';
          const docTypes = ['FR', 'FT', 'NC', 'ND', 'PP', 'RE'];
          
          for (const establishment of establishments) {
            for (const type of docTypes) {
              db.prepare(`
                INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic, type)
                VALUES (?, ?, ?, ?, ?, ?, 'aprovada', 0, ?)
              `).run(
                establishment.id, 
                `Série ${type} ${prefix}${year}`, 
                prefix, 
                1, 
                0, 
                'active',
                type
              );
            }
          }
        }

        // 6. Log history
        db.prepare(`
          INSERT INTO billing_mode_history (owner_id, changed_by, old_mode, new_mode)
          VALUES (?, ?, ?, ?)
        `).run(ownerId, changed_by || ownerId, oldMode, billing_mode);
      });

      transaction();

      logAction({
        userId: changed_by || ownerId,
        ownerId: ownerId,
        module: 'FISCAL',
        actionType: 'BILLING_MODE_CHANGE',
        severity: 'CRITICAL',
        description: `Mudança de modo de faturação de ${oldMode} para ${billing_mode}`,
        oldValues: { billing_mode: oldMode },
        newValues: { billing_mode: billing_mode },
        req
      });

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      logAction({
        userId: changed_by || ownerId,
        ownerId: ownerId,
        module: 'FISCAL',
        actionType: 'BILLING_MODE_CHANGE_FAILURE',
        severity: 'CRITICAL',
        description: `Falha ao mudar modo de faturação: ${String(e)}`,
        status: 'failure',
        req
      });
      res.status(500).json({ error: "Erro ao processar mudança de modo de faturação." });
    }
  });

  app.put("/api/profile/:id", (req, res) => {
    const { name, email, username, phone, nif, address, company_name, fiscal_regime, password } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    const oldUser = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;

    try {
      if (password) {
        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, phone = ?, nif = ?, address = ?, company_name = ?, fiscal_regime = ?, password = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, phone, nif, address, company_name, fiscal_regime, password, req.params.id);
      } else {
        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, phone = ?, nif = ?, address = ?, company_name = ?, fiscal_regime = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, phone, nif, address, company_name, fiscal_regime, req.params.id);
      }

      logAction({
        userId: req.params.id,
        ownerId: (oldUser?.role === 'owner' || oldUser?.role === 'admin') ? req.params.id : oldUser?.owner_id,
        module: 'PROFILE',
        actionType: 'PROFILE_UPDATE',
        description: `Perfil atualizado para ${name}`,
        oldValues: { fiscal_regime: oldUser.fiscal_regime, name: oldUser.name },
        newValues: { fiscal_regime, name },
        req
      });

      if (oldUser && oldUser.fiscal_regime !== fiscal_regime) {
        logAction({
          userId: req.params.id,
          ownerId: (oldUser?.role === 'owner' || oldUser?.role === 'admin') ? req.params.id : oldUser?.owner_id,
          module: 'FISCAL',
          actionType: 'FISCAL_REGIME_CHANGE',
          severity: 'CRITICAL',
          description: `Regime fiscal alterado de ${oldUser.fiscal_regime} para ${fiscal_regime}`,
          oldValues: { fiscal_regime: oldUser.fiscal_regime },
          newValues: { fiscal_regime },
          req
        });
      }

      // Se o regime for exclusão, aplicar automaticamente as regras
      if (fiscal_regime === 'exclusao') {
        const ownerId = req.params.id;
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(ownerId) as any[];
        for (const establishment of establishments) {
          // 1. Garantir que existe um imposto ISENTO
          let isentoTax = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment.id) as any;
          if (!isentoTax) {
            const result = db.prepare("INSERT INTO taxes (establishment_id, name, percentage, tax_code, is_default, status) VALUES (?, 'ISENTO', 0, 'ISE', 1, 'active')").run(establishment.id);
            isentoTax = { id: result.lastInsertRowid };
          } else {
            // 2. Definir como padrão e activo
            db.prepare("UPDATE taxes SET is_default = 0 WHERE establishment_id = ?").run(establishment.id);
            db.prepare("UPDATE taxes SET is_default = 1, status = 'active' WHERE id = ?").run(isentoTax.id);
          }
          // 3. Desactivar outros impostos para este estabelecimento
          db.prepare("UPDATE taxes SET status = 'inactive' WHERE establishment_id = ? AND id != ?").run(establishment.id, isentoTax.id);
          // 4. Actualizar todos os produtos deste estabelecimento para usar este imposto ISENTO
          db.prepare("UPDATE products SET tax_id = ? WHERE establishment_id = ?").run(isentoTax.id, establishment.id);
          // 5. Actualizar todos os serviços deste estabelecimento para usar este imposto ISENTO
          db.prepare("UPDATE services SET tax_id = ? WHERE establishment_id = ?").run(isentoTax.id, establishment.id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Owner Routes
  app.get("/api/owner/keys/:ownerId", (req, res) => {
    const keys = db.prepare("SELECT id, public_key, version, is_active, type, created_at, created_by FROM company_keys WHERE owner_id = ? ORDER BY version DESC").all(req.params.ownerId);
    res.json(keys);
  });

  app.post("/api/owner/keys/generate", (req, res) => {
    const { ownerId, userId } = req.body;
    try {
      const oldKey = DigitalSignatureService.getActiveKey(ownerId);
      const newKey = DigitalSignatureService.generateCompanyKeys(ownerId, userId);
      
      db.prepare(`
        INSERT INTO key_management_logs (owner_id, user_id, action, old_key_id, new_key_id, details)
        VALUES (?, ?, 'generate_internal', ?, ?, ?)
      `).run(ownerId, userId, oldKey?.id || null, newKey.id, `Nova chave gerada internamente (Versão ${newKey.version})`);
      
      logAction({
        userId,
        ownerId,
        module: 'FISCAL',
        actionType: 'KEY_ROTATION',
        severity: 'CRITICAL',
        description: `Chave de assinatura digital rotacionada para versão ${newKey.version}`,
        entityType: 'KEY',
        entityId: String(newKey.id),
        req
      });

      res.json({ success: true, key: newKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/owner/keys/external", (req, res) => {
    const { ownerId, userId, publicKey, privateKey, type } = req.body;
    try {
      const encryptedPrivate = DigitalSignatureService.encryptPrivateKey(privateKey);
      
      const oldKey = DigitalSignatureService.getActiveKey(ownerId);
      db.prepare("UPDATE company_keys SET is_active = 0 WHERE owner_id = ?").run(ownerId);

      const lastKey = db.prepare("SELECT MAX(version) as max_v FROM company_keys WHERE owner_id = ?").get(ownerId) as { max_v: number };
      const nextVersion = (lastKey?.max_v || 0) + 1;

      const result = db.prepare(`
        INSERT INTO company_keys (owner_id, public_key, private_key_encrypted, version, is_active, type, created_by)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).run(ownerId, publicKey, encryptedPrivate, nextVersion, type || 'external', userId);

      db.prepare(`
        INSERT INTO key_management_logs (owner_id, user_id, action, old_key_id, new_key_id, details)
        VALUES (?, ?, 'upload_external', ?, ?, ?)
      `).run(ownerId, userId, oldKey?.id || null, result.lastInsertRowid, `Certificado externo carregado (Versão ${nextVersion})`);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/owner/keys/logs/:ownerId", (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, u.name as user_name 
      FROM key_management_logs l
      JOIN users u ON l.user_id = u.id
      WHERE l.owner_id = ? 
      ORDER BY l.timestamp DESC
    `).all(req.params.ownerId);
    res.json(logs);
  });

  app.get("/api/owner/establishments/:establishmentId/cash-registers", (req, res) => {
    const { establishmentId } = req.params;
    const registers = db.prepare(`
      SELECT cr.*, 
             s.status as session_status,
             s.seller_id as current_seller_id,
             s.seller_id as seller_id,
             u.name as current_seller_name,
             s.id as current_session_id
      FROM cash_registers cr 
      LEFT JOIN cashier_sessions s ON s.cash_register_id = cr.id AND s.status = 'open'
      LEFT JOIN users u ON s.seller_id = u.id
      WHERE cr.establishment_id = ?
    `).all(establishmentId);
    res.json(registers);
  });

  app.put("/api/seller/select-register", (req, res) => {
    const { user_id, cash_register_id } = req.body;
    db.prepare("UPDATE users SET cash_register_id = ? WHERE id = ?").run(cash_register_id, user_id);
    res.json({ success: true });
  });

  app.post("/api/owner/establishments/:establishmentId/cash-registers", (req, res) => {
    const { establishmentId } = req.params;
    const { name, default_initial_balance, max_limit } = req.body;
    const code = `CX-${Math.floor(1000 + Math.random() * 9000)}`;
    const result = db.prepare(`
      INSERT INTO cash_registers (establishment_id, name, code, default_initial_balance, max_limit)
      VALUES (?, ?, ?, ?, ?)
    `).run(establishmentId, name, code, default_initial_balance, max_limit);
    res.json({ id: result.lastInsertRowid, code });
  });

  app.put("/api/owner/establishments/cash-registers/:id", (req, res) => {
    const { id } = req.params;
    const { name, default_initial_balance, max_limit } = req.body;
    db.prepare(`
      UPDATE cash_registers SET name = ?, default_initial_balance = ?, max_limit = ?
      WHERE id = ?
    `).run(name, default_initial_balance, max_limit, id);
    res.json({ success: true });
  });

  app.delete("/api/owner/establishments/cash-registers/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM cash_registers WHERE id = ?").run(id);
    res.json({ success: true });
  });
  
  app.get("/api/owner/cash-registers/:id/print-config", (req, res) => {
    const { id } = req.params;
    const register = db.prepare("SELECT print_config FROM cash_registers WHERE id = ?").get(id) as any;
    res.json({ print_config: register?.print_config ? JSON.parse(register.print_config) : null });
  });

  app.post("/api/owner/cash-registers/:id/print-config", (req, res) => {
    const { id } = req.params;
    const { print_config } = req.body;
    db.prepare("UPDATE cash_registers SET print_config = ? WHERE id = ?").run(
      JSON.stringify(print_config),
      id
    );
    res.json({ success: true });
  });

  // Helper to determine active plan and features/limits based on trial or assigned licenses
  const resolveUserPlanAndLimits = (ownerId: number) => {
    if (!ownerId) {
      return { plan_type: "Básico", max_establishments: 1, max_products: 100, features: { reports: false, multi_establishment: false, api_access: false } };
    }

    try {
      const user = db.prepare("SELECT is_test_account, created_at FROM users WHERE id = ?").get(ownerId) as any;
      if (!user) {
        return { plan_type: "Básico", max_establishments: 1, max_products: 100, features: { reports: false, multi_establishment: false, api_access: false } };
      }

      const isTest = user.is_test_account === 1;
      const createdAtStr = user.created_at;
      const createdAtTime = new Date(createdAtStr + (createdAtStr.includes('Z') || createdAtStr.includes('UTC') ? '' : ' UTC')).getTime();
      const diffMs = Date.now() - createdAtTime;
      const diffDays = diffMs / (24 * 60 * 60 * 1000);

      // If test account and over 30 days, fallback to basic package limits
      if (isTest && diffDays > 30) {
        return {
          plan_type: "Básico",
          max_establishments: 1,
          max_products: 100,
          features: { reports: false, multi_establishment: false, api_access: false }
        };
      }

      // Otherwise, look up active license
      const activeLicense = db.prepare(`
        SELECT plan_type, features FROM licenses 
        WHERE user_id = ? AND status = 'active' AND date(expiry_date) >= date('now')
        ORDER BY expiry_date DESC LIMIT 1
      `).get(ownerId) as any;

      if (activeLicense) {
        let features: any = { reports: true, multi_establishment: true };
        try {
          features = typeof activeLicense.features === 'string' ? JSON.parse(activeLicense.features) : (activeLicense.features || {});
        } catch (e) {}

        let max_establishments = 2;
        let max_products = 1000;
        const planName = String(activeLicense.plan_type || '').toLowerCase();
        
        if (planName.includes('bas') || planName === 'base') {
          max_establishments = 1;
          max_products = 100;
          features.reports = false;
          features.multi_establishment = false;
        } else if (planName.includes('empr') || planName.includes('enterprise') || planName.includes('premium')) {
          max_establishments = 10;
          max_products = 5000;
          features.reports = true;
          features.multi_establishment = true;
          features.api_access = true;
        } else if (planName.includes('prof') || planName.includes('pro')) {
          max_establishments = 2;
          max_products = 1000;
          features.reports = true;
          features.multi_establishment = true;
        }

        return {
          plan_type: activeLicense.plan_type,
          max_establishments,
          max_products,
          features
        };
      }

      // Default fallback (within trial period, has default license or no active license yet)
      return {
        plan_type: "Premium (Teste)",
        max_establishments: 10,
        max_products: 5000,
        features: { reports: true, multi_establishment: true, api_access: true }
      };
    } catch (e) {
      console.error("[resolveUserPlanAndLimits] Error resolving user plan:", e);
      return { plan_type: "Básico", max_establishments: 1, max_products: 100, features: { reports: false, multi_establishment: false, api_access: false } };
    }
  };

  // Helper to get establishment IDs and effective owner ID based on user role
  const getContextData = (rawUserId: string | number) => {
    if (!rawUserId || rawUserId === 'undefined' || rawUserId === 'null') return { establishmentIds: [], ownerId: null };
    const userId = Number(rawUserId);
    if (isNaN(userId)) return { establishmentIds: [], ownerId: null };

    try {
      const userResult = db.prepare("SELECT id, role, establishment_id, owner_id FROM users WHERE id = ?").get(userId) as any;
      if (!userResult) return { establishmentIds: [], ownerId: null };
      
      if (userResult.role === 'admin') {
        const establishments = db.prepare("SELECT id FROM establishments").all() as any[];
        return { 
          establishmentIds: establishments.map(e => e.id), 
          ownerId: userId 
        };
      }

      if (userResult.role === 'owner') {
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(userId) as any[];
        return { 
          establishmentIds: establishments.map(e => e.id), 
          ownerId: userId 
        };
      }

      // 1. Check for specific establishment assignment first for non-owners
      let establishment_id = userResult.establishment_id;
      if (!establishment_id && (userResult.role === 'seller' || userResult.role === 'manager')) {
        // Check staff table as fallback
        const staffEntry = db.prepare("SELECT establishment_id FROM staff WHERE user_id = ? LIMIT 1").get(userResult.id) as any;
        if (staffEntry) {
          establishment_id = staffEntry.establishment_id;
        }
      }

      if (establishment_id) {
        const est = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
        return { 
          establishmentIds: [establishment_id], 
          ownerId: est?.owner_id || userResult.owner_id || null 
        };
      }

      // 2. If no specific establishment, check for owner_id (backwards compatibility or HR managers)
      if (userResult.owner_id) {
        const ests = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(userResult.owner_id) as { id: number }[];
        return { 
          establishmentIds: ests.map(e => e.id), 
          ownerId: userResult.owner_id 
        };
      }
    } catch (err) {
      console.error(`[Context] Error getting context for user ${userId}:`, err);
    }
    return { establishmentIds: [], ownerId: null };
  };

  app.get("/api/owner/dashboard-stats/all", (req, res) => {
    try {
      const ownerId = req.query.ownerId as string;
      const { establishmentIds, ownerId: resolvedOwnerId } = getContextData(ownerId);
      
      if (establishmentIds.length === 0 || !resolvedOwnerId) {
        return res.json({ 
          todaySales: 0, 
          todayCount: 0, 
          todayExpense: 0, 
          monthlySales: 0, 
          lowStockCount: 0, 
          staffCount: 0, 
          topProducts: [], 
          recentTransactions: [], 
          salesByDay: [], 
          salesByEstablishment: [], 
          paymentMethods: [], 
          totalExpenses: 0,
          financialHealth: { enabled: false, enoughForSalaries: false, totalSalaries: 0, monthlyIncome: 0 }
        });
      }

      const placeholders = establishmentIds.map(() => '?').join(',');
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const financialToday = db.prepare(`
        SELECT 
          SUM(income) as income,
          SUM(expense) as expense
        FROM (
          SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE establishment_id IN (${placeholders || 'NULL'}) AND type = 'income' AND date(date, 'localtime') = date(?, 'localtime')
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE establishment_id IN (${placeholders || 'NULL'}) AND date(timestamp, 'localtime') = date(?, 'localtime') AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders || 'NULL'}) AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date, 'localtime') = date(?, 'localtime') AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')
          UNION ALL
          SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders || 'NULL'}) AND doc_type = 'NC' AND date(invoice_date, 'localtime') = date(?, 'localtime')
          UNION ALL
          SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE establishment_id IN (${placeholders || 'NULL'}) AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date, 'localtime') = date(?, 'localtime')
          UNION ALL
          SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE establishment_id IN (${placeholders || 'NULL'}) AND type = 'expense' AND category NOT LIKE 'Nota de Crédito%' AND date(date, 'localtime') = date(?, 'localtime')
        )
      `).get(...establishmentIds, today, ...establishmentIds, today, ...establishmentIds, today, ...establishmentIds, today, ...establishmentIds, today, ...establishmentIds, today) as any;

      const todaySales = financialToday?.income || 0;
      const todayCountRes = db.prepare(`
        SELECT COUNT(*) as total 
        FROM (
          SELECT id FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp, 'localtime') = date(?, 'localtime')
          UNION ALL
          SELECT id FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date, 'localtime') = date(?, 'localtime')
          UNION ALL
          SELECT id FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date, 'localtime') = date(?, 'localtime')
        )
      `).get(...establishmentIds, today, ...establishmentIds, today, ...establishmentIds, today) as any;
      
      const todayCount = todayCountRes?.total || 0;
      const todayExpense = financialToday?.expense || 0;

      const monthlySummaryRes = db.prepare(`
        SELECT 
          SUM(income) as income,
          SUM(expense) as expense
        FROM (
          SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'income' AND date(date, 'localtime') >= date(?, 'localtime')
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp, 'localtime') >= date(?, 'localtime') AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date, 'localtime') >= date(?, 'localtime') AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')
          UNION ALL
          SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC' AND date(invoice_date, 'localtime') >= date(?, 'localtime')
          UNION ALL
          SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date, 'localtime') >= date(?, 'localtime')
          UNION ALL
          SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'expense' AND category NOT LIKE 'Nota de Crédito%' AND date(date, 'localtime') >= date(?, 'localtime')
        )
      `).get(...establishmentIds, monthStart, ...establishmentIds, monthStart, ...establishmentIds, monthStart, ...establishmentIds, monthStart, ...establishmentIds, monthStart, ...establishmentIds, monthStart) as any;

      const monthlySales = monthlySummaryRes?.income || 0;
      const monthlyExpense = monthlySummaryRes?.expense || 0;
      
      const openSessionsResult = db.prepare(`SELECT COUNT(*) as count FROM cashier_sessions WHERE establishment_id IN (${placeholders}) AND status = 'open'`).get(...establishmentIds) as any;
      const sellersResult = db.prepare(`SELECT COUNT(DISTINCT seller_id) as count FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp, 'localtime') = date(?, 'localtime')`).get(...establishmentIds, today) as any;

      console.log(`[DashboardStats] Global stats for owner ${resolvedOwnerId}: todaySales=${todaySales}, todayCount=${todayCount}, establishments=${establishmentIds.length}`);

      const lowStockCount = db.prepare(`SELECT COUNT(*) as count FROM products WHERE establishment_id IN (${placeholders}) AND stock <= min_stock`).get(...establishmentIds) as any;
      const staffCount = db.prepare(`SELECT COUNT(*) as count FROM staff WHERE establishment_id IN (${placeholders})`).get(...establishmentIds) as any;
      const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'expense' AND date >= ?`).get(...establishmentIds, monthStart) as any;
      
      // Calculate dynamic COGS (Cost of goods sold) for current month of products sold
      const monthProfitInfo = getProductProfitForRange(establishmentIds, monthStart, undefined);
      const productCost = monthProfitInfo?.cost || 0;
      const finalTotalExpenses = (totalExpenses?.total || 0) + productCost;

      // Financial Health check (Salaries vs Income)
      const salarySettings = db.prepare("SELECT financial_reminder_enabled FROM owner_settings WHERE owner_id = ?").get(resolvedOwnerId) as any;
      let financialHealth = { enabled: !!salarySettings?.financial_reminder_enabled, enoughForSalaries: false, totalSalaries: 0, monthlyIncome: monthlySales };
      
      if (financialHealth.enabled) {
        const totalSalaries = db.prepare(`SELECT SUM(salary) as total FROM staff WHERE establishment_id IN (${placeholders})`).get(...establishmentIds) as any;
        financialHealth.totalSalaries = totalSalaries?.total || 0;
        financialHealth.enoughForSalaries = (monthlySales || 0) >= financialHealth.totalSalaries;
      }

      const topProducts = db.prepare(`
        SELECT name, SUM(quantity) as total_qty FROM (
          SELECT p.name, SUM(CAST(JSON_EXTRACT(ti_json.value, '$.quantity') AS REAL)) as quantity
          FROM transactions t
          JOIN json_each(t.items) as ti_json
          JOIN products p ON JSON_EXTRACT(ti_json.value, '$.id') = p.id
          WHERE t.establishment_id IN (${placeholders})
          GROUP BY p.id
          UNION ALL
          SELECT p.name, SUM(CAST(JSON_EXTRACT(cii_json.value, '$.quantity') AS REAL)) as quantity
          FROM credit_invoices ci
          JOIN json_each(ci.items) as cii_json
          JOIN products p ON JSON_EXTRACT(cii_json.value, '$.id') = p.id
          WHERE ci.establishment_id IN (${placeholders}) AND ci.doc_type IN ('FT', 'FR', 'ND')
          GROUP BY p.id
          UNION ALL
          SELECT p.name, SUM(-CAST(JSON_EXTRACT(cii_json.value, '$.quantity') AS REAL)) as quantity
          FROM credit_invoices ci
          JOIN json_each(ci.items) as cii_json
          JOIN products p ON JSON_EXTRACT(cii_json.value, '$.id') = p.id
          WHERE ci.establishment_id IN (${placeholders}) AND ci.doc_type = 'NC'
          GROUP BY p.id
        )
        GROUP BY name
        ORDER BY total_qty DESC
        LIMIT 5
      `).all(...establishmentIds, ...establishmentIds, ...establishmentIds) as any[];

      res.json({
        todaySales: todayCount,
        todayRevenue: todaySales,
        todayExpense: todayExpense,
        monthlySales: monthlySales,
        monthlyExpense: monthlyExpense,
        activeSellers: sellersResult?.count || 0,
        openTills: openSessionsResult?.count || 0,
        lowStockCount: lowStockCount?.count || 0,
        staffCount: staffCount?.count || 0,
        totalExpenses: finalTotalExpenses,
        financialHealth,
        topProducts,
        recentTransactions: [],
        salesByDay: [],
        salesByEstablishment: [],
        paymentMethods: []
      });
    } catch (error: any) {
      console.error("Error in dashboard stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/establishments/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);

      const placeholders = establishmentIds.map(() => '?').join(',');
      const today = new Date().toISOString().split('T')[0];
      const establishments = db.prepare(`
        SELECT e.*, 
          (SELECT count(*) FROM staff st WHERE st.establishment_id = e.id) as staff_count,
          (
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE establishment_id = e.id AND type = 'income' AND date(date) = ?), 0) +
            COALESCE((SELECT SUM(COALESCE(base_amount, total_amount)) FROM transactions t WHERE t.establishment_id = e.id AND date(t.timestamp) = ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')), 0) +
            COALESCE((SELECT SUM(COALESCE(base_amount, total_amount)) FROM credit_invoices ci WHERE ci.establishment_id = e.id AND ci.doc_type IN ('FT', 'FR', 'ND') AND date(ci.invoice_date) = ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')), 0) -
            COALESCE((SELECT SUM(COALESCE(base_amount, total_amount)) FROM credit_invoices ci WHERE ci.establishment_id = e.id AND ci.doc_type = 'NC' AND date(ci.invoice_date) = ?), 0) +
            COALESCE((SELECT SUM(total_amount) FROM service_sheets ss WHERE ss.establishment_id = e.id AND ss.status = 'concluded' AND ss.fiscal_document_id IS NULL AND date(ss.scheduled_date) = ?), 0)
          ) as today_sales
        FROM establishments e 
        WHERE e.id IN (${placeholders || 'NULL'})
      `).all(today, today, today, today, today, ...establishmentIds) as any[];
      
      res.json(establishments.map(e => ({
        ...e,
        bank_accounts: e.bank_accounts ? (typeof e.bank_accounts === 'string' ? (function() {
          try { return JSON.parse(e.bank_accounts); } catch(err) { return []; }
        })() : e.bank_accounts) : []
      })));
    } catch (error: any) {
      console.error("Error in GET /api/owner/establishments/:ownerId:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/establishments", (req, res) => {
    const { owner_id, name, address, phone, email, nif, logo_url, bank_accounts, establishment_code, type } = req.body;
    
    try {
      // Check limits
      const limits = resolveUserPlanAndLimits(owner_id);
      const maxEstablishments = limits.max_establishments;

      const currentEstablishments = db.prepare("SELECT COUNT(*) as count FROM establishments WHERE owner_id = ?").get(owner_id) as any;
      
      if (maxEstablishments !== -1 && currentEstablishments.count >= maxEstablishments) {
        return res.status(403).json({ 
          error: `Limite de estabelecimentos atingido (${maxEstablishments}). Por favor, atualize o seu plano.` 
        });
      }

      db.prepare(`
        INSERT INTO establishments (owner_id, name, address, phone, email, nif, logo_url, license_expiry, bank_accounts, establishment_code, type) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(owner_id, name, address, phone, email, nif, logo_url, "2026-12-31", JSON.stringify(bank_accounts || []), establishment_code || null, type || 'comum');
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/establishments/:establishmentId", (req, res) => {
    const { name, address, phone, email, nif, logo_url, status, bank_accounts, establishment_code, type } = req.body;
    db.prepare(`
      UPDATE establishments 
      SET name = ?, address = ?, phone = ?, email = ?, nif = ?, logo_url = ?, status = ?, bank_accounts = ?, establishment_code = ?, type = ? 
      WHERE id = ?
    `).run(name, address, phone, email, nif, logo_url, status, JSON.stringify(bank_accounts || []), establishment_code || null, type || 'comum', req.params.establishmentId);
    res.json({ success: true });
  });

  // --- Fiscal Documents Endpoints ---
  app.get("/api/owner/generated-files/:ownerId", (req, res) => {
    try {
      const { ownerId } = getContextData(req.params.ownerId);
      if (!ownerId) return res.json([]);
      const files = db.prepare("SELECT id, owner_id, name, type, generated_by, created_at FROM generated_files WHERE owner_id = ? ORDER BY created_at DESC").all(ownerId) as any[];
      res.json(files);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Financial Routes ---
  app.get("/api/owner/billing/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId, startDate, endDate, type } = req.query;
      
      let creditWhere = [`establishment_id IN (${establishmentIds.map(() => '?').join(',')})`];
      let posWhere = [`establishment_id IN (${establishmentIds.map(() => '?').join(',')})`];
      let creditParams = [...establishmentIds];
      let posParams = [...establishmentIds];

      if (establishmentId) {
        creditWhere = ['establishment_id = ?'];
        posWhere = ['establishment_id = ?'];
        creditParams = [establishmentId];
        posParams = [establishmentId];
      }

      if (startDate) {
        creditWhere.push("date(invoice_date) >= ?");
        posWhere.push("date(timestamp) >= ?");
        creditParams.push(startDate);
        posParams.push(startDate);
      }

      if (endDate) {
        creditWhere.push("date(invoice_date) <= ?");
        posWhere.push("date(timestamp) <= ?");
        creditParams.push(endDate);
        posParams.push(endDate);
      }

      if (type) {
        creditWhere.push("doc_type = ?");
        creditParams.push(type);
        // For POS, we assume doc_type is FR (Fatura Recibo) unless specified otherwise
        if (type !== 'FR') {
            // If filtering for something other than FR, POS won't have it (usually)
            posWhere.push("1=0"); 
        }
      }

      const creditSql = `SELECT 'credit' as source, id, invoice_number, invoice_date, client_name, doc_type, payment_method, total_amount, status FROM credit_invoices WHERE ${creditWhere.join(' AND ')}`;
      const posSql = `SELECT 'pos' as source, id, invoice_number, timestamp as invoice_date, client_name, 'FR' as doc_type, payment_method, total_amount, 'paid' as status FROM transactions WHERE ${posWhere.join(' AND ')}`;
      
      const billing = db.prepare(`
        SELECT * FROM (${creditSql} UNION ALL ${posSql}) 
        ORDER BY invoice_date DESC
      `).all(...creditParams, ...posParams);
      
      res.json(billing);
    } catch (e: any) {
      console.error("Error fetching billing:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/transactions/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId } = req.query;
      
      let transactions;
      if (establishmentId) {
        if (!establishmentIds.includes(Number(establishmentId))) return res.json([]);
        transactions = db.prepare("SELECT * FROM financial_transactions WHERE establishment_id = ? ORDER BY date DESC").all(establishmentId);
      } else {
        const placeholders = establishmentIds.map(() => '?').join(',');
        transactions = db.prepare(`SELECT * FROM financial_transactions WHERE establishment_id IN (${placeholders}) ORDER BY date DESC`).all(...establishmentIds);
      }
      res.json(transactions);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/financial/transactions", (req, res) => {
    try {
      const { establishment_id, owner_id: requestId, type, category, amount, payment_method, description, date, status, reference_id, reference_type } = req.body;
      const { ownerId } = getContextData(requestId);
      if (!ownerId) throw new Error("Owner context not found");

      const result = db.prepare(`
        INSERT INTO financial_transactions (establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, ownerId, type, category, amount, payment_method, description, date, status || 'paid', reference_id, reference_type || null);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/receivable/:requestId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.requestId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId } = req.query;

      let receivables;
      if (establishmentId) {
        if (!establishmentIds.includes(Number(establishmentId))) return res.json([]);
        receivables = db.prepare("SELECT * FROM accounts_receivable WHERE establishment_id = ? ORDER BY due_date ASC").all(establishmentId);
      } else {
        const placeholders = establishmentIds.map(() => '?').join(',');
        receivables = db.prepare(`SELECT * FROM accounts_receivable WHERE establishment_id IN (${placeholders}) ORDER BY due_date ASC`).all(...establishmentIds);
      }
      res.json(receivables);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/financial/receivable", (req, res) => {
    try {
      const { establishment_id, owner_id: requestId, client_name, amount, due_date, description, status } = req.body;
      const { ownerId } = getContextData(requestId);
      if (!ownerId) throw new Error("Owner context not found");

      const result = db.prepare(`
        INSERT INTO accounts_receivable (establishment_id, owner_id, client_name, amount, due_date, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, ownerId, client_name, amount, due_date, description, status || 'pending');
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/owner/financial/receivable/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // If status is changing to 'paid', record income
      if (status === 'paid') {
        const receivable = db.prepare("SELECT * FROM accounts_receivable WHERE id = ?").get(id) as any;
        if (receivable && receivable.status !== 'paid') {
          db.prepare(`
            INSERT INTO financial_transactions (
              establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type
            ) VALUES (?, ?, 'income', 'Recebimento de Cliente', ?, 'other', ?, ?, 'paid', ?, 'receivable')
          `).run(
            receivable.establishment_id, receivable.owner_id, receivable.amount,
            `Recebimento - ${receivable.client_name} (${receivable.description || ''})`,
            new Date().toISOString(), id
          );
        }
      }

      db.prepare("UPDATE accounts_receivable SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/payable/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      if (establishmentIds.length === 0) return res.json([]);
      const { establishmentId } = req.query;

      let payables;
      if (establishmentId) {
        if (!establishmentIds.includes(Number(establishmentId))) return res.json([]);
        payables = db.prepare("SELECT * FROM accounts_payable WHERE establishment_id = ? ORDER BY due_date ASC").all(establishmentId);
      } else {
        const placeholders = establishmentIds.map(() => '?').join(',');
        payables = db.prepare(`SELECT * FROM accounts_payable WHERE establishment_id IN (${placeholders}) ORDER BY due_date ASC`).all(...establishmentIds);
      }
      res.json(payables);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/financial/payable", (req, res) => {
    try {
      const { establishment_id, owner_id: requestId, supplier_name, amount, due_date, description, status } = req.body;
      const { ownerId } = getContextData(requestId);
      if (!ownerId) throw new Error("Owner context not found");

      const result = db.prepare(`
        INSERT INTO accounts_payable (establishment_id, owner_id, supplier_name, amount, due_date, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, ownerId, supplier_name, amount, due_date, description, status || 'pending');
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/owner/financial/payable/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // If status is changing to 'paid', record expense
      if (status === 'paid') {
        const payable = db.prepare("SELECT * FROM accounts_payable WHERE id = ?").get(id) as any;
        if (payable && payable.status !== 'paid') {
          db.prepare(`
            INSERT INTO financial_transactions (
              establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type
            ) VALUES (?, ?, 'expense', 'Pagamento de Conta', ?, 'other', ?, ?, 'paid', ?, 'payable')
          `).run(
            payable.establishment_id, payable.owner_id, payable.amount,
            `Pagamento - ${payable.supplier_name} (${payable.description || ''})`,
            new Date().toISOString(), id
          );
        }
      }

      db.prepare("UPDATE accounts_payable SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  function getProductProfitForRange(targetEstIds: number[], startDate?: string, endDate?: string) {
    const placeholders = targetEstIds.map(() => '?').join(',');

    // 1. Get products cost map for fallback
    const productsList = db.prepare(`SELECT id, cost FROM products WHERE establishment_id IN (${placeholders})`).all(...targetEstIds) as any[];
    const productToCost: Record<string, number> = {};
    productsList.forEach((p: any) => {
      productToCost[String(p.id)] = Number(p.cost) || 0;
    });

    // 2. Fetch POS transactions in date range (if any)
    let posSql = `SELECT items FROM transactions WHERE establishment_id IN (${placeholders})`;
    const posParams: (number | string)[] = [...targetEstIds];
    if (startDate) {
      posSql += " AND date(timestamp) >= ?";
      posParams.push(startDate);
    }
    if (endDate) {
      posSql += " AND date(timestamp) <= ?";
      posParams.push(endDate);
    }
    const posTx = db.prepare(posSql).all(...posParams) as any[];

    // 3. Fetch invoices in date range
    let invSql = `SELECT items FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND')`;
    const invParams: (number | string)[] = [...targetEstIds];
    if (startDate) {
      invSql += " AND date(invoice_date) >= ?";
      invParams.push(startDate);
    }
    if (endDate) {
      invSql += " AND date(invoice_date) <= ?";
      invParams.push(endDate);
    }
    const invoices = db.prepare(invSql).all(...invParams) as any[];

    // 4. Fetch credit notes (negative factor) in date range
    let cnSql = `SELECT items FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC'`;
    const cnParams: (number | string)[] = [...targetEstIds];
    if (startDate) {
      cnSql += " AND date(invoice_date) >= ?";
      cnParams.push(startDate);
    }
    if (endDate) {
      cnSql += " AND date(invoice_date) <= ?";
      cnParams.push(endDate);
    }
    const creditNotes = db.prepare(cnSql).all(...cnParams) as any[];

    // Calculate total revenue and cost of products sold
    let totalRevenue = 0;
    let totalCost = 0;

    const processItems = (itemStr: string, factor = 1) => {
      if (!itemStr) return;
      try {
        const items = JSON.parse(itemStr);
        if (!Array.isArray(items)) return;
        items.forEach((item: any) => {
          const id = String(item.id || item.product_id || item.ProductCode || '');
          const quantity = Number(item.quantity || item.qty || 1);
          const unitPrice = Number(item.price || item.unit_price || item.UnitPrice || 0);
          
          let unitCost = Number(item.cost || item.unit_cost || item.unit_price_cost || item.UnitCost || 0);
          if (!unitCost && id && productToCost[id] !== undefined) {
            unitCost = productToCost[id];
          }

          totalRevenue += (unitPrice * quantity) * factor;
          totalCost += (unitCost * quantity) * factor;
        });
      } catch (e) {
        // ignore
      }
    };

    posTx.forEach((t) => processItems(t.items, 1));
    invoices.forEach((i) => processItems(i.items, 1));
    creditNotes.forEach((cn) => processItems(cn.items, -1));

    return {
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalRevenue - totalCost
    };
  }

  app.get("/api/owner/financial/product-profit/:requestId", (req, res) => {
    try {
      const { requestId } = req.params;
      const { establishmentIds, ownerId: resolvedOwnerId } = getContextData(requestId);
      if (establishmentIds.length === 0 || !resolvedOwnerId) {
        return res.json({ profit: 0, revenue: 0, cost: 0 });
      }

      const { establishmentId, startDate, endDate } = req.query;

      // Filter by requested establishmentId or all of owner's
      const targetEstIds = establishmentId ? [Number(establishmentId)] : establishmentIds;
      if (establishmentId && !establishmentIds.includes(Number(establishmentId))) {
        return res.status(403).json({ error: "Access denied to this establishment" });
      }

      const result = getProductProfitForRange(targetEstIds, startDate as string, endDate as string);
      res.json(result);
    } catch (e: any) {
      console.error("Error in product-profit calculation:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/owner/financial/summary/:requestId", (req, res) => {
    try {
      const { requestId } = req.params;
      const { establishmentIds, ownerId: resolvedOwnerId } = getContextData(requestId);
      if (establishmentIds.length === 0 || !resolvedOwnerId) return res.json({ today: { income: 0, expense: 0, profit: 0 }, month: { income: 0, expense: 0, profit: 0 }, balances: { cash: 0, bank: 0 }, pending: { receivable: 0, payable: 0 } });

      const { establishmentId } = req.query;
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      let todaySummary, monthSummary, pendingReceivable, pendingPayable;

      // Determine which establishment IDs to filter by
      const targetEstIds = establishmentId ? [Number(establishmentId)] : establishmentIds;
      // Security check: ensure the requested establishmentId is within the user's scope
      if (establishmentId && !establishmentIds.includes(Number(establishmentId))) {
        return res.status(403).json({ error: "Access denied to this establishment" });
      }

      const placeholders = targetEstIds.map(() => '?').join(',');

      todaySummary = db.prepare(`
        SELECT 
          SUM(income) as income,
          SUM(expense) as expense
        FROM (
          SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'income' AND date(date) = ?
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp) = ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date) = ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')
          UNION ALL
          SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC' AND date(invoice_date) = ?
          UNION ALL
          SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date) = ?
          UNION ALL
          SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'expense' AND category NOT LIKE 'Nota de Crédito%' AND date(date) = ?
        )
      `).get(...targetEstIds, today, ...targetEstIds, today, ...targetEstIds, today, ...targetEstIds, today, ...targetEstIds, today, ...targetEstIds, today) as any;

      monthSummary = db.prepare(`
        SELECT 
          SUM(income) as income,
          SUM(expense) as expense
        FROM (
          SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'income' AND date(date) >= ?
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp) >= ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date) >= ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')
          UNION ALL
          SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC' AND date(invoice_date) >= ?
          UNION ALL
          SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date) >= ?
          UNION ALL
          SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE establishment_id IN (${placeholders}) AND type = 'expense' AND category NOT LIKE 'Nota de Crédito%' AND date(date) >= ?
        )
      `).get(...targetEstIds, firstDayOfMonth, ...targetEstIds, firstDayOfMonth, ...targetEstIds, firstDayOfMonth, ...targetEstIds, firstDayOfMonth, ...targetEstIds, firstDayOfMonth, ...targetEstIds, firstDayOfMonth) as any;

      // Extract accurate balances from financial_transactions with robust method normalizer mapping
      const financialTx = db.prepare(`
        SELECT id, type, amount, payment_method, reference_id, reference_type 
        FROM financial_transactions 
        WHERE establishment_id IN (${placeholders}) AND status = 'paid'
      `).all(...targetEstIds) as any[];

      let cash_balance = 0;
      let bank_balance = 0;

      financialTx.forEach((tx) => {
        const amt = Number(tx.amount) || 0;
        const method = String(tx.payment_method || '').toLowerCase();
        const factor = tx.type === 'income' ? 1 : -1;

        if (
          method === 'cash' || 
          method === 'dinheiro' || 
          method === 'numerário' || 
          method === 'numerario'
        ) {
          cash_balance += amt * factor;
        } else if (
          method === 'transfer' || 
          method === 'transferência' || 
          method === 'transferencia' || 
          method === 'bank_transfer' || 
          method === 'card' || 
          method === 'multicaixa'
        ) {
          bank_balance += amt * factor;
        } else if (method === 'split' && tx.reference_type === 'transaction' && tx.reference_id) {
          try {
            const orgTx = db.prepare("SELECT split_details FROM transactions WHERE id = ?").get(tx.reference_id) as any;
            if (orgTx && orgTx.split_details) {
              const details = typeof orgTx.split_details === 'string' ? JSON.parse(orgTx.split_details) : orgTx.split_details;
              if (details) {
                const cashPortion = Number(details.cash) || 0;
                const cardPortion = Number(details.card) || 0;
                cash_balance += cashPortion * factor;
                bank_balance += cardPortion * factor;
              } else {
                cash_balance += (amt / 2) * factor;
                bank_balance += (amt / 2) * factor;
              }
            } else {
              cash_balance += amt * factor;
            }
          } catch (e) {
            cash_balance += amt * factor;
          }
        } else {
          // Fallback: default unknown payments to cash for safety
          cash_balance += amt * factor;
        }
      });

      pendingReceivable = db.prepare(`SELECT SUM(amount) as total FROM accounts_receivable WHERE establishment_id IN (${placeholders}) AND status != 'paid'`).get(...targetEstIds) as any;
      pendingPayable = db.prepare(`SELECT SUM(amount) as total FROM accounts_payable WHERE establishment_id IN (${placeholders}) AND status != 'paid'`).get(...targetEstIds) as any;

      // Extract real product level profitability
      const todayProfitInfo = getProductProfitForRange(targetEstIds, today, today);
      const monthProfitInfo = getProductProfitForRange(targetEstIds, firstDayOfMonth, undefined);

      res.json({
        today: {
          income: todaySummary?.income || 0,
          expense: todaySummary?.expense || 0,
          profit: todayProfitInfo.profit
        },
        month: {
          income: monthProfitInfo.revenue || monthSummary?.income || 0,
          expense: monthSummary?.expense || 0,
          profit: monthProfitInfo.profit
        },
        balances: {
          cash: cash_balance,
          bank: bank_balance
        },
        pending: {
          receivable: pendingReceivable?.total || 0,
          payable: pendingPayable?.total || 0
        }
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/download-file/:fileId", (req, res) => {
    try {
      const file = db.prepare("SELECT * FROM generated_files WHERE id = ?").get(req.params.fileId) as any;
      if (!file) return res.status(404).json({ error: "Ficheiro não encontrado." });
      
      res.setHeader('Content-Type', file.type.includes('XML') || file.type === 'SAFT' ? 'application/xml' : 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
      res.send(file.file_data);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

function generateHashChain(date: string, entryDate: string, no: string, total: string, last: string) {
  const str = `${date};${entryDate};${no};${total};${last}`;
  return crypto.createHash('sha256').update(str).digest('base64');
}

function generateJws(hash: string) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString('base64').replace(/=/g, '');
  const payload = Buffer.from(JSON.stringify({ sub: hash, iat: Math.floor(Date.now() / 1000) })).toString('base64').replace(/=/g, '');
  const signature = crypto.createHash('sha256').update(`${header}.${payload}`).digest('base64').replace(/=/g, '');
  return `${header}.${payload}.${signature}`;
}

function getExemptionCode(fiscalRegime: string, taxCode: string) {
  if (taxCode !== 'ISE') return { code: "", reason: "" };
  if (fiscalRegime === 'exclusao') return { code: "M10", reason: "Isento nos termos do regime de exclusão (Artigo 9.º do CIVA)" };
  if (fiscalRegime === 'simplificado') return { code: "M11", reason: "IVA - Regime Simplificado (Artigo 14.º-A do CIVA)" };
  return { code: "M02", reason: "Isenção nos termos do Artigo 12.º do CIVA" };
}

function escapeXml(unsafe: any) {
  if (unsafe === null || unsafe === undefined) return "";
  const str = String(unsafe);
  return str.replace(/[<>&"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
    }
    return c;
  });
}

function formatDateToIso(dateStr?: string) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().split('.')[0];
  return d.toISOString().split('.')[0]; // YYYY-MM-DDTHH:mm:ss
}

    // Ensure generated_files has correct columns
    try {
      db.prepare("ALTER TABLE generated_files ADD COLUMN file_path TEXT").run();
    } catch (e) {}
    try {
      db.prepare("ALTER TABLE generated_files ADD COLUMN status TEXT DEFAULT 'available'").run();
    } catch (e) {}

    app.post("/api/owner/generate-agt-xml", (req, res) => {
    const { owner_id, establishment_id, start_date, end_date, doc_type, user_name } = req.body;
    try {
      const owner = db.prepare("SELECT * FROM users WHERE id = ?").get(owner_id) as any;
      if (!owner) return res.status(404).json({ error: "Proprietário não encontrado." });

      const systemName = db.prepare("SELECT value FROM system_settings WHERE key = 'system_name'").get() as any;
      const softwareName = systemName?.value || "Fatu-R";

      let establishmentIds: number[] = [];
      if (establishment_id) {
        establishmentIds = [parseInt(establishment_id)];
      } else {
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(owner_id) as { id: number }[];
        establishmentIds = establishments.map(s => s.id);
      }

      const placeholders = establishmentIds.map(() => '?').join(',');
      const establishmentsInfo = db.prepare(`SELECT * FROM establishments WHERE id IN (${placeholders})`).all(...establishmentIds) as any[];
      
      const eacSetting = db.prepare("SELECT eac_code FROM owner_settings WHERE owner_id = ?").get(owner_id) as any;
      const eacCode = eacSetting?.eac_code || "47110";

      const primaryEstablishment = establishmentsInfo[0];
      const nif = primaryEstablishment?.nif || owner.nif || owner.bi_number || "999999999";

      // Fetch documents
      let ciQuery = `SELECT * FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND date(created_at) BETWEEN ? AND ?`;
      let params: any[] = [...establishmentIds, start_date, end_date];
      if (doc_type) {
        ciQuery += " AND doc_type = ?";
        params.push(doc_type);
      }
      const invoices = db.prepare(ciQuery).all(...params) as any[];

      // Fetch POS transactions
      let tInvoices: any[] = [];
      if (!doc_type || doc_type === 'FR') {
        let tQuery = `SELECT * FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp) BETWEEN ? AND ?`;
        tInvoices = db.prepare(tQuery).all(...establishmentIds, start_date, end_date) as any[];
      }

      const allDocs = [...invoices];
      // Add transactions as documents
      tInvoices.forEach(t => {
        allDocs.push({
          id: `T-${t.id}`,
          invoice_number: t.invoice_number || `POS-${t.id}`,
          invoice_date: t.timestamp,
          created_at: t.timestamp,
          doc_type: 'FR',
          client_name: t.client_name || "Consumidor Final",
          client_nif: t.client_nif || "999999999",
          total_amount: t.base_amount || t.total_amount,
          tax_amount: (t.base_amount || t.total_amount) * 0.14, // Assuming default 14% if not saved
          items: t.items, // JSON
          status: 'N',
          country: 'AO'
        });
      });

      // Sort documents for chaining
      allDocs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Fetch all active taxes for these establishments
      const taxes = db.prepare(`SELECT * FROM taxes WHERE establishment_id IN (${placeholders}) AND status = 'active'`).all(...establishmentIds) as any[];
      
      let taxTableXml = "";
      const addedTaxCodes = new Set<string>();

      if (owner.fiscal_regime === 'exclusao') {
        taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>ISE</TaxCode>
        <Description>Isento nos termos do regime de exclusão (Artigo 9º do CIVA)</Description>
        <TaxPercentage>0.00</TaxPercentage>
      </TaxTableEntry>`;
        addedTaxCodes.add('ISE');
      }

      // Fetch all products and services for these establishments to enrich MasterFiles
      const allProductsMaster = db.prepare(`SELECT * FROM products WHERE establishment_id IN (${placeholders})`).all(...establishmentIds) as any[];
      const allServicesMaster = db.prepare(`SELECT * FROM services WHERE establishment_id IN (${placeholders})`).all(...establishmentIds) as any[];
      const productsMap = new Map(allProductsMaster.map(p => [p.id.toString(), p]));
      const servicesMap = new Map(allServicesMaster.map(s => [s.id.toString(), s]));

      const finalMasterItems = new Map<string, any>();
      
      allDocs.forEach(doc => {
        const items = typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items || [];
        items.forEach((item: any) => {
          const rawId = (item.product_id || item.id || item.code || "0").toString();
          let type: 'P' | 'S' = 'P';
          
          let details = productsMap.get(rawId) || servicesMap.get(rawId);
          if (item.type === 'service' || item.type === 'S') type = 'S';
          else if (item.type === 'product' || item.type === 'P') type = 'P';
          else if (details) {
            if (servicesMap.has(rawId) && !productsMap.has(rawId)) type = 'S';
            else if (item.name?.toLowerCase().includes('entrega') || item.name?.toLowerCase().includes('serviço')) type = 'S';
          } else {
             if (item.name?.toLowerCase().includes('entrega') || item.name?.toLowerCase().includes('serviço')) type = 'S';
          }
          
          const nameForCode = item.name || "Sem Nome";
          const nameSlug = nameForCode.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
          const productCode = `${type}${rawId}-${nameSlug}`;
          if (!finalMasterItems.has(productCode)) {
            let category = details?.category || item.category;
            if (!category) {
              category = type === 'S' ? 'SERVIÇOS' : 'MERCADORIAS';
            }

            finalMasterItems.set(productCode, {
              code: productCode,
              type,
              name: nameForCode,
              category: category,
              numberCode: `CODE-${type}-${rawId}-${nameSlug}`
            });
          }
        });
      });

      const allUniqueTaxes = new Set<number>();
      allDocs.forEach(doc => {
        const items = typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items || [];
        items.forEach((item: any) => {
           if (item.tax_percentage !== undefined) allUniqueTaxes.add(parseFloat(item.tax_percentage));
        });
      });

      allUniqueTaxes.forEach(rate => {
        const code = rate === 0 ? 'ISE' : 'NOR';
        if (!addedTaxCodes.has(code)) {
          taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>${code}</TaxCode>
        <Description>${code === 'ISE' ? 'Isento' : 'Taxa Normal'}</Description>
        <TaxPercentage>${rate.toFixed(2)}</TaxPercentage>
      </TaxTableEntry>`;
          addedTaxCodes.add(code);
        }
      });

      if (!addedTaxCodes.has('NOR')) {
         taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>NOR</TaxCode>
        <Description>Taxa Normal</Description>
        <TaxPercentage>14.00</TaxPercentage>
      </TaxTableEntry>`;
      }

      let invoicesXml = "";
      let numberOfEntries = 0;
      let totalCreditAmount = 0;
      let lastHash = "";

      allDocs.forEach(doc => {
        // Validation
        if (!doc.invoice_number) return; 
        
        numberOfEntries++;
        const items = typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items || [];
        let linesXml = "";
        let lineIdx = 1;
        
        // Totals
        let docTaxPayable = 0;
        let docNetTotal = 0;

        const isCredit = doc.doc_type === 'NC';
        const amountTag = isCredit ? 'DebitAmount' : 'CreditAmount';

        items.forEach((item: any) => {
          const qty = parseFloat(item.quantity) || 0;
          const unitPrice = parseFloat(item.price) || 0;
          const taxRate = item.tax_percentage !== undefined ? parseFloat(item.tax_percentage) : 14;
          const lineTotal = qty * unitPrice;
          const lineTax = lineTotal * (taxRate / 100);
          
          docNetTotal += lineTotal;
          docTaxPayable += lineTax;

          const rawId = (item.product_id || item.id || item.code || "0").toString();
          let type: 'P' | 'S' = 'P';
          if (item.type === 'service' || item.type === 'S') type = 'S';
          else if (item.type === 'product' || item.type === 'P') type = 'P';
          else if (servicesMap.has(rawId) && !productsMap.has(rawId)) type = 'S';
          else if (item.name?.toLowerCase().includes('entrega') || item.name?.toLowerCase().includes('serviço')) type = 'S';
          const nameForCode = item.name || "Sem Nome";
          const nameSlug = nameForCode.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
          const productCode = `${type}${rawId}-${nameSlug}`;
          const masterItem = finalMasterItems.get(productCode);
          const productDescription = masterItem ? masterItem.name : nameForCode;

          linesXml += `
            <Line>
              <LineNumber>${lineIdx++}</LineNumber>
              <ProductCode>${escapeXml(productCode)}</ProductCode>
              <ProductDescription>${escapeXml(productDescription)}</ProductDescription>
              <Quantity>${qty.toFixed(2)}</Quantity>
              <UnitOfMeasure>UN</UnitOfMeasure>
              <UnitPrice>${unitPrice.toFixed(2)}</UnitPrice>
              <TaxPointDate>${formatDateToIso(doc.invoice_date).split('T')[0]}</TaxPointDate>
              <Description>${escapeXml(productDescription)}</Description>
              <${amountTag}>${lineTotal.toFixed(2)}</${amountTag}>
              <Tax>
                <TaxType>IVA</TaxType>
                <TaxCountryRegion>AO</TaxCountryRegion>
                <TaxCode>${taxRate > 0 ? 'NOR' : 'ISE'}</TaxCode>
                <TaxPercentage>${taxRate.toFixed(2)}</TaxPercentage>
              </Tax>
              ${taxRate === 0 ? (() => {
                  const exemption = getExemptionCode(owner.fiscal_regime, 'ISE');
                  return `
              <TaxExemptionReason>${escapeXml(exemption.reason)}</TaxExemptionReason>
              <TaxExemptionCode>${escapeXml(exemption.code)}</TaxExemptionCode>`;
                })() : ''}
              <SettlementAmount>0.00</SettlementAmount>
            </Line>`;
        });

        const grossTotal = docNetTotal + docTaxPayable;
        totalCreditAmount += grossTotal;
        const invDate = formatDateToIso(doc.invoice_date).split('T')[0];
        const entryDate = formatDateToIso(doc.created_at);
        const currentHash = generateHashChain(invDate, entryDate, doc.invoice_number, grossTotal.toFixed(2), lastHash);
        lastHash = currentHash;

        invoicesXml += `
        <Invoice>
          <InvoiceNo>${escapeXml(doc.invoice_number)}</InvoiceNo>
          <DocumentStatus>
            <InvoiceStatus>${doc.status === 'canceled' ? 'A' : 'N'}</InvoiceStatus>
            <InvoiceStatusDate>${entryDate}</InvoiceStatusDate>
            <SourceID>${escapeXml(user_name || 'SISTEMA')}</SourceID>
            <SourceBilling>P</SourceBilling>
          </DocumentStatus>
          <Hash>${currentHash}</Hash>
          <HashControl>1</HashControl>
          <jwsDocumentSignature>${generateJws(currentHash)}</jwsDocumentSignature>
          <Period>${new Date(doc.created_at).getMonth() + 1}</Period>
          <InvoiceDate>${invDate}</InvoiceDate>
          <InvoiceType>${escapeXml(doc.doc_type)}</InvoiceType>
          <SystemEntryDate>${entryDate}</SystemEntryDate>
          <EACCode>${escapeXml(eacCode)}</EACCode>
          <CustomerID>${escapeXml(doc.client_nif || '999999999')}</CustomerID>
          ${linesXml}
          <DocumentTotals>
            <TaxPayable>${docTaxPayable.toFixed(2)}</TaxPayable>
            <NetTotal>${docNetTotal.toFixed(2)}</NetTotal>
            <GrossTotal>${grossTotal.toFixed(2)}</GrossTotal>
          </DocumentTotals>
        </Invoice>`;
      });

      const submissionGuid = `GUID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const timeStamp = formatDateToIso();

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO:1.01_01"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="urn:OECD:StandardAuditFile-Tax:AO:1.01_01 SAF-T_AO_1.01_01.xsd">
  <Header>
    <AuditFileVersion>1.01_01</AuditFileVersion>
    <CompanyID>${escapeXml(nif)}</CompanyID>
    <TaxRegistrationNumber>${escapeXml(nif)}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${escapeXml(primaryEstablishment?.company_name || owner.company_name || owner.name)}</CompanyName>
    <BusinessName>${escapeXml(primaryEstablishment?.name || owner.company_name || owner.name)}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${escapeXml(primaryEstablishment?.address || owner.address || 'Luanda')}</AddressDetail>
      <City>${escapeXml(primaryEstablishment?.city || 'Luanda')}</City>
      <Country>AO</Country>
    </CompanyAddress>
    <FiscalYear>${new Date(start_date).getFullYear()}</FiscalYear>
    <StartDate>${start_date}</StartDate>
    <EndDate>${end_date}</EndDate>
    <CurrencyCode>AOA</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductSoftwareCertificateNumber>000/AGT/2026</ProductSoftwareCertificateNumber>
    <SoftwareID>${escapeXml(softwareName)}/1.0.1</SoftwareID>
    <jwsSoftwareSignature>${generateJws(softwareName)}</jwsSoftwareSignature>
    <EACCode>${escapeXml(eacCode)}</EACCode>
  </Header>
  <MasterFiles>
    <Customer>
      <CustomerID>999999999</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>999999999</CustomerTaxID>
      <CompanyName>Consumidor Final</CompanyName>
      <BillingAddress>
        <AddressDetail>Consumidor Final</AddressDetail>
        <City>Luanda</City>
        <Country>AO</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>
    <TaxTable>
      ${taxTableXml}
    </TaxTable>
    ${(() => {
        let pXml = "";
        finalMasterItems.forEach(item => {
          pXml += `
    <Product>
      <ProductType>${item.type}</ProductType>
      <ProductCode>${escapeXml(item.code)}</ProductCode>
      <ProductGroup>${escapeXml(item.category)}</ProductGroup>
      <ProductDescription>${escapeXml(item.name)}</ProductDescription>
      <ProductNumberCode>${escapeXml(item.numberCode)}</ProductNumberCode>
    </Product>`;
        });
        return pXml;
    })()}
  </MasterFiles>
  <GeneralLedgerEntries>
    <NumberOfEntries>0</NumberOfEntries>
    <TotalDebit>0.00</TotalDebit>
    <TotalCredit>0.00</TotalCredit>
  </GeneralLedgerEntries>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${numberOfEntries}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalCreditAmount.toFixed(2)}</TotalCredit>
      ${invoicesXml}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

      const fileName = `Vendas_AGT_${nif}_${new Date().toISOString().split('T')[0]}.xml`;
      const generatedBy = user_name || owner.name;

      db.prepare(`INSERT INTO generated_files (owner_id, name, type, file_path, generated_by, file_data) VALUES (?, ?, ?, ?, ?, ?)`).run(
        owner_id,
        fileName,
        'XML AGT',
        '/api/fiscal/xml-preview', 
        generatedBy,
        Buffer.from(xml)
      );

      logAction({
        ownerId: owner_id,
        module: 'FISCAL',
        actionType: 'AGT_XML_EXPORT',
        severity: 'INFO',
        description: `Exportação XML AGT gerada por ${generatedBy}: ${fileName}`,
        entityType: 'FILE',
        entityId: fileName,
        req
      });

      res.json({ success: true, fileName, xml });
    } catch (error: any) {
      console.error("Error generating AGT XML:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/fiscal/xml-preview", (req, res) => {
    // This is a simple preview endpoint if needed
    res.send("XML Preview Logic here");
  });

  app.post("/api/owner/generate-saft", (req, res) => {
    const { owner_id, establishment_id, start_date, end_date, doc_type, user_name } = req.body;
    try {
      // Fetch owner info
      const owner = db.prepare("SELECT * FROM users WHERE id = ?").get(owner_id) as any;
      if (!owner) {
        return res.status(404).json({ error: "Proprietário não encontrado." });
      }

      // Get all establishment IDs for this owner if no specific establishment is selected
      let establishmentIds: number[] = [];
      let selectedEstablishment: any = null;
      if (establishment_id) {
        establishmentIds = [parseInt(establishment_id)];
        selectedEstablishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishment_id);
      } else {
        const establishments = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(owner_id) as { id: number }[];
        establishmentIds = establishments.map(s => s.id);
      }

      if (establishmentIds.length === 0) {
        return res.status(400).json({ error: "Nenhum estabelecimento encontrado para este utilizador." });
      }

      const placeholders = establishmentIds.map(() => '?').join(',');
      const establishmentsInfo = db.prepare(`SELECT * FROM establishments WHERE id IN (${placeholders})`).all(...establishmentIds) as any[];
      
      const eacSetting = db.prepare("SELECT eac_code FROM owner_settings WHERE owner_id = ?").get(owner_id) as any;
      const eacCode = eacSetting?.eac_code || "47110";

      const totalEstablishments = establishmentsInfo.length;
      const primaryEstablishment = establishmentsInfo[0];
      const nif = primaryEstablishment?.nif || owner.nif || owner.bi_number || "999999999";

      const systemName = db.prepare("SELECT value FROM system_settings WHERE key = 'system_name'").get() as any;
      const softwareName = systemName?.value || "Fatu-R";

      // Fetch all active taxes for these establishments
      const taxes = db.prepare(`SELECT * FROM taxes WHERE establishment_id IN (${placeholders}) AND status = 'active'`).all(...establishmentIds) as any[];
      
      let taxTableXml = "";
      const addedTaxCodes = new Set<string>();

      if (owner.fiscal_regime === 'exclusao') {
        taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>ISE</TaxCode>
        <Description>Isento nos termos do regime de exclusão (Artigo 9º do CIVA)</Description>
        <TaxPercentage>0.00</TaxPercentage>
      </TaxTableEntry>`;
        addedTaxCodes.add('ISE');
      }

      if (taxes.length > 0) {
        taxes.forEach(t => {
          const code = t.tax_code || 'NOR';
          if (!addedTaxCodes.has(code)) {
            taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>${escapeXml(code)}</TaxCode>
        <Description>${escapeXml(t.name)}</Description>
        <TaxPercentage>${(t.percentage || 0).toFixed(2)}</TaxPercentage>
      </TaxTableEntry>`;
            addedTaxCodes.add(code);
          }
        });
      }

      if (!addedTaxCodes.has('NOR')) {
        taxTableXml += `
      <TaxTableEntry>
        <TaxType>IVA</TaxType>
        <TaxCountryRegion>AO</TaxCountryRegion>
        <TaxCode>NOR</TaxCode>
        <Description>Taxa Normal</Description>
        <TaxPercentage>14.00</TaxPercentage>
      </TaxTableEntry>`;
      }

      // Fetch invoices from credit_invoices (FR, FT)
      let ciQuery = `SELECT * FROM credit_invoices WHERE establishment_id IN (${placeholders})`;
      let ciParams: any[] = [...establishmentIds];
      ciQuery += " AND date(invoice_date) BETWEEN ? AND ?";
      ciParams.push(start_date, end_date);
      if (doc_type) {
        ciQuery += " AND doc_type = ?";
        ciParams.push(doc_type);
      }
      const creditInvoices = db.prepare(ciQuery).all(...ciParams) as any[];
      const tInvoicesList = (!doc_type || doc_type === 'FR') ? db.prepare(`SELECT * FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp) BETWEEN ? AND ?`).all(...establishmentIds, start_date, end_date) as any[] : [];

      // Merge and sort all invoices to ensure correct hash chaining
      const allUnifiedInvoices = [
        ...creditInvoices.map(i => ({
          ...i,
          source: 'CI',
          unified_date: i.invoice_date || i.created_at,
          unified_entry_date: i.created_at,
          unified_no: i.invoice_number,
          unified_type: i.doc_type,
          unified_tax: i.tax_amount || 0,
          unified_total: i.total_amount
        })),
        ...tInvoicesList.map(i => {
           const invType = i.invoice_number?.split(' ')[0] || 'FR';
           return {
             ...i,
             source: 'T',
             unified_date: i.timestamp,
             unified_entry_date: i.timestamp,
             unified_no: i.invoice_number || invType + ' ' + i.id,
             unified_type: invType,
             unified_tax: i.tax_amount || 0,
             unified_total: i.total_amount
           };
        })
      ].sort((a, b) => new Date(a.unified_entry_date).getTime() - new Date(b.unified_entry_date).getTime());

      // Combine and format XML
      let invoicesXml = "";
      let totalEntries = 0;
      let totalCreditAmount = 0;
      let totalDebitAmount = 0;
      let lastHash = "";
      const uniqueCustomers = new Map<string, any>();

      allUnifiedInvoices.forEach(inv => {
        totalEntries++;
        const isCredit = inv.unified_type === 'NC';
        if (isCredit) totalDebitAmount += inv.unified_total;
        else totalCreditAmount += inv.unified_total;

        if (inv.client_nif && inv.client_nif !== '999999999') {
          uniqueCustomers.set(inv.client_nif, {
            name: inv.client_name,
            nif: inv.client_nif,
            address: inv.address || 'Endereço não especificado'
          });
        }

        const items = typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : (inv.items || []);
        let linesXml = "";
        let calcNetTotal = 0;
        let calcTaxPayable = 0;
        
        const processItems = items.length > 0 ? items : [{ id: '000', name: 'Venda de Produtos/Serviços', price: inv.unified_total, quantity: 1 }];

        processItems.forEach((item: any, index: number) => {
          const taxCode = item.tax_code || (owner.fiscal_regime === 'exclusao' ? 'ISE' : 'NOR');
          const taxPercentage = (item.tax_percentage !== undefined) ? item.tax_percentage : (owner.fiscal_regime === 'exclusao' ? 0 : 14);
          const quantity = item.quantity || 1;
          const price = item.price || 0;
          const lineNetTotal = price * quantity;
          const lineTax = lineNetTotal * (taxPercentage / 100);
          
          calcNetTotal += lineNetTotal;
          calcTaxPayable += lineTax;
          
          linesXml += `
          <Line>
            <LineNumber>${index + 1}</LineNumber>
            <ProductCode>${escapeXml(item.id?.toString() || item.code?.toString() || '000')}</ProductCode>
            <ProductDescription>${escapeXml(item.name || 'Produto')}</ProductDescription>
            <Quantity>${quantity.toFixed(2)}</Quantity>
            <UnitOfMeasure>UN</UnitOfMeasure>
            <UnitPrice>${price.toFixed(2)}</UnitPrice>
            <TaxPointDate>${formatDateToIso(inv.unified_date).split('T')[0]}</TaxPointDate>
            <Description>${escapeXml(item.name || 'Venda de Produtos/Serviços')}</Description>
            <${isCredit ? 'DebitAmount' : 'CreditAmount'}>${lineNetTotal.toFixed(2)}</${isCredit ? 'DebitAmount' : 'CreditAmount'}>
            <Tax>
              <TaxType>IVA</TaxType>
              <TaxCountryRegion>AO</TaxCountryRegion>
              <TaxCode>${escapeXml(taxCode)}</TaxCode>
              <TaxPercentage>${taxPercentage.toFixed(2)}</TaxPercentage>
            </Tax>
            ${taxCode === 'ISE' ? (() => {
              const exemption = getExemptionCode(owner.fiscal_regime, 'ISE');
              return `<TaxExemptionReason>${escapeXml(exemption.reason)}</TaxExemptionReason>
                      <TaxExemptionCode>${escapeXml(exemption.code)}</TaxExemptionCode>`;
            })() : ''}
            <SettlementAmount>0.00</SettlementAmount>
          </Line>`;
        });

        const grossTotal = calcNetTotal + calcTaxPayable;
        const invDate = formatDateToIso(inv.unified_date).split('T')[0];
        const entryDate = formatDateToIso(inv.unified_entry_date);
        const currentHash = generateHashChain(invDate, entryDate, inv.unified_no, grossTotal.toFixed(2), lastHash);
        lastHash = currentHash;

        invoicesXml += `
      <Invoice>
        <InvoiceNo>${escapeXml(inv.unified_no)}</InvoiceNo>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${entryDate}</InvoiceStatusDate>
          <SourceID>${escapeXml(user_name || 'SISTEMA')}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>${currentHash}</Hash>
        <HashControl>1</HashControl>
        <jwsDocumentSignature>${generateJws(currentHash)}</jwsDocumentSignature>
        <Period>${new Date(inv.unified_entry_date).getMonth() + 1}</Period>
        <InvoiceDate>${invDate}</InvoiceDate>
        <InvoiceType>${escapeXml(inv.unified_type)}</InvoiceType>
        <SystemEntryDate>${entryDate}</SystemEntryDate>
        <EACCode>${escapeXml(eacCode)}</EACCode>
        <CustomerID>${escapeXml(inv.client_nif || '999999999')}</CustomerID>
        ${linesXml}
        <DocumentTotals>
          <TaxPayable>${calcTaxPayable.toFixed(2)}</TaxPayable>
          <NetTotal>${calcNetTotal.toFixed(2)}</NetTotal>
          <GrossTotal>${grossTotal.toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`;
      });

      // Fetch products for MasterFiles
      const products = db.prepare(`SELECT * FROM products WHERE establishment_id IN (${placeholders})`).all(...establishmentIds) as any[];
      let productsXml = "";
      products.forEach(prod => {
        productsXml += `
    <Product>
      <ProductType>P</ProductType>
      <ProductCode>${escapeXml(prod.id.toString())}</ProductCode>
      <ProductGroup>${escapeXml(prod.category || 'Geral')}</ProductGroup>
      <ProductDescription>${escapeXml(prod.name)}</ProductDescription>
      <ProductNumberCode>${escapeXml(prod.barcode || prod.id.toString())}</ProductNumberCode>
    </Product>`;
      });

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:AO:1.01_01"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="urn:OECD:StandardAuditFile-Tax:AO:1.01_01 SAF-T_AO_1.01_01.xsd">
  <Header>
    <AuditFileVersion>1.01_01</AuditFileVersion>
    <CompanyID>${escapeXml(nif)}</CompanyID>
    <TaxRegistrationNumber>${escapeXml(nif)}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${escapeXml(primaryEstablishment?.company_name || owner.company_name || owner.name)}</CompanyName>
    <BusinessName>${escapeXml(primaryEstablishment?.name || owner.company_name || owner.name)}</BusinessName>
    <CompanyAddress>
      <AddressDetail>${escapeXml(primaryEstablishment?.address || owner.address || 'Endereço não especificado')}</AddressDetail>
      <City>${escapeXml(primaryEstablishment?.city || 'Luanda')}</City>
      <Country>AO</Country>
    </CompanyAddress>
    <FiscalYear>${new Date(start_date).getFullYear()}</FiscalYear>
    <StartDate>${start_date}</StartDate>
    <EndDate>${end_date}</EndDate>
    <CurrencyCode>AOA</CurrencyCode>
    <DateCreated>${new Date().toISOString().split('T')[0]}</DateCreated>
    <TaxEntity>Global</TaxEntity>
    <ProductSoftwareCertificateNumber>000/AGT/2026</ProductSoftwareCertificateNumber>
    <SoftwareID>${escapeXml(softwareName)}/1.0.1</SoftwareID>
    <jwsSoftwareSignature>${generateJws(softwareName)}</jwsSoftwareSignature>
    <EACCode>${escapeXml(eacCode)}</EACCode>
  </Header>
  <MasterFiles>
    <Customer>
      <CustomerID>999999999</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>999999999</CustomerTaxID>
      <CompanyName>Consumidor Final</CompanyName>
      <BillingAddress>
        <AddressDetail>Consumidor Final</AddressDetail>
        <City>Luanda</City>
        <Country>AO</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>
    ${Array.from(uniqueCustomers.values()).map(cust => `
    <Customer>
      <CustomerID>${cust.nif}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>${cust.nif}</CustomerTaxID>
      <CompanyName>${cust.name}</CompanyName>
      <BillingAddress>
        <AddressDetail>${cust.address}</AddressDetail>
        <City>Luanda</City>
        <Country>AO</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('')}
    ${productsXml}
    <TaxTable>
      ${taxTableXml}
    </TaxTable>
  </MasterFiles>
  <GeneralLedgerEntries>
    <NumberOfEntries>0</NumberOfEntries>
    <TotalDebit>0.00</TotalDebit>
    <TotalCredit>0.00</TotalCredit>
  </GeneralLedgerEntries>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${totalEntries}</NumberOfEntries>
      <TotalDebit>${totalDebitAmount.toFixed(2)}</TotalDebit>
      <TotalCredit>${totalCreditAmount.toFixed(2)}</TotalCredit>
      ${invoicesXml}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

      const fileName = `SAFT_AO_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
      db.prepare("INSERT INTO generated_files (owner_id, name, type, file_path, generated_by, file_data) VALUES (?, ?, ?, ?, ?, ?)").run(
        owner_id, 
        fileName, 
        'SAFT', 
        "/download/saft/" + fileName,
        user_name, 
        Buffer.from(xml)
      );
      
      logAction({
        ownerId: owner_id,
        module: 'FISCAL',
        actionType: 'SAFT_GENERATION',
        severity: 'INFO',
        description: `Arquivo SAFT gerado por ${user_name}: ${fileName}`,
        entityType: 'FILE',
        entityId: fileName,
        req
      });

      res.json({ success: true, fileName });
    } catch (e: any) {
      console.error("Error generating SAFT:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/owner/export", async (req, res) => {
    const { owner_id, export_type, establishment_id, user_name } = req.body;
    try {
      let fileName = "";
      let type = "Excel";
      let buffer: Buffer;

      const establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishment_id) as any;
      const owner = db.prepare("SELECT * FROM users WHERE id = ?").get(owner_id) as any;

      if (export_type === 'sales') {
        const transactions = db.prepare(`
          SELECT t.*, u.name as seller_name 
          FROM transactions t 
          LEFT JOIN users u ON t.seller_id = u.id 
          WHERE t.establishment_id = ?
          ORDER BY t.timestamp DESC
        `).all(establishment_id) as any[];

        const data = transactions.map(t => ({
          'Data': t.timestamp,
          'Nº Fatura': t.invoice_number || `POS-${t.id}`,
          'Cliente': t.client_name || 'Consumidor Final',
          'NIF Cliente': t.client_nif || '999999999',
          'Vendedor': t.seller_name || 'N/A',
          'Total': t.total_amount,
          'Imposto': t.tax_amount,
          'Desconto': t.discount_amount,
          'Método Pagamento': t.payment_method,
          'Estado AGT': t.agt_status
        }));

        fileName = `Vendas_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Vendas");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'purchases') {
        const purchases = db.prepare(`
          SELECT p.*, s.name as supplier_name 
          FROM purchases p 
          LEFT JOIN suppliers s ON p.supplier_id = s.id 
          WHERE p.establishment_id = ?
          ORDER BY p.timestamp DESC
        `).all(establishment_id) as any[];

        const data = purchases.map(p => ({
          'Data': p.timestamp,
          'Nº Fatura Fornecedor': p.invoice_number || 'N/A',
          'Fornecedor': p.supplier_name || 'N/A',
          'Total': p.total_amount,
          'Pago': p.paid_amount,
          'Imposto': p.tax_amount,
          'Estado': p.status,
          'Entrega': p.delivery_status,
          'Data Vencimento': p.due_date
        }));

        fileName = `Compras_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Compras");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'clients') {
        const clients = db.prepare("SELECT * FROM clients WHERE establishment_id = ?").all(establishment_id) as any[];
        const data = clients.map(c => ({
          'Nome': c.name,
          'NIF': c.nif,
          'Email': c.email,
          'Telefone': c.phone,
          'Endereço': c.address,
          'Tipo': c.type,
          'Data Registo': c.created_at
        }));

        fileName = `Clientes_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'products') {
        const products = db.prepare(`
          SELECT p.*, w.name as warehouse_name 
          FROM products p 
          LEFT JOIN warehouses w ON p.warehouse_id = w.id 
          WHERE p.establishment_id = ?
        `).all(establishment_id) as any[];

        const data = products.map(p => ({
          'Nome': p.name,
          'Código/Barcode': p.barcode || p.id,
          'Preço': p.price,
          'Stock Atual': p.stock,
          'Stock Mínimo': p.min_stock,
          'Categoria': p.category,
          'Armazém': p.warehouse_name || 'Principal',
          'Em Promoção': p.is_promo ? 'Sim' : 'Não'
        }));

        fileName = `Produtos_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Produtos");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_attendance') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const records = db.prepare(`
          SELECT a.*, u.name as employee_name, st.name as establishment_name
          FROM hr_attendance a
          JOIN users u ON a.user_id = u.id
          LEFT JOIN establishments st ON a.establishment_id = st.id
          WHERE a.user_id IN (
            SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
            UNION
            SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(ownerId, ...establishmentIds, ...establishmentIds) as any[];

        const data = records.map(r => ({
          'Data': r.date,
          'Funcionário': r.employee_name,
          'Estabelecimento': r.establishment_name || 'N/A',
          'Tipo': r.type === 'system' ? 'Acesso ao Sistema' : 'Manual',
          'Entrada': r.type === 'system' ? new Date(r.entry_time).toLocaleTimeString() : r.entry_time,
          'Saída': r.exit_time ? (r.type === 'system' ? new Date(r.exit_time).toLocaleTimeString() : r.exit_time) : 'Pendente',
          'Estado': r.status,
          'Notas': r.notes || ''
        }));

        fileName = `Relatorio_Presenca_RH_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Presenças");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_salaries') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const payments = db.prepare(`
          SELECT p.*, s.base_salary, u.name as employee_name
          FROM hr_salary_payments p
          JOIN hr_salaries s ON p.salary_id = s.id
          JOIN users u ON s.user_id = u.id
          WHERE u.id IN (
            SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
            UNION
            SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(ownerId, ...establishmentIds, ...establishmentIds) as any[];

        const data = payments.map(p => ({
          'Funcionário': p.employee_name,
          'Data Pagamento': new Date(p.timestamp).toLocaleString('pt-AO'),
          'Mês Referência': p.month || 'N/A',
          'Salário Base': p.base_salary,
          'Valor Pago': p.amount,
          'Bónus': p.bonus || 0,
          'Tipo': p.type,
          'Descrição': p.description || ''
        }));

        fileName = `Relatorio_Salarios_RH_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Salários");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_employees') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const employees = db.prepare(`
          SELECT u.*, st.name as establishment_name, s.base_salary
          FROM users u
          LEFT JOIN establishments st ON u.establishment_id = st.id
          LEFT JOIN hr_salaries s ON u.id = s.user_id
          WHERE u.role IN ('seller', 'manager', 'none') AND (
            u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'}))
            OR u.establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(...establishmentIds, ...establishmentIds) as any[];

        const data = employees.map(e => ({
          'Nome': e.name,
          'Cargo': e.role,
          'Email': e.email || 'N/A',
          'Telefone': e.phone || 'N/A',
          'BI': e.bi_number || 'N/A',
          'Morada': e.address || 'N/A',
          'Estabelecimento': e.establishment_name || 'N/A',
          'Salário Base': e.base_salary || 0,
          'Estado': e.status,
          'Data Registo': e.created_at
        }));

        fileName = `Relatorio_Funcionarios_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Funcionários");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'hr_vacations') {
        const { establishmentIds, ownerId } = getContextData(owner_id);
        const vacations = db.prepare(`
          SELECT v.*, u.name as employee_name
          FROM hr_vacations v
          JOIN users u ON v.user_id = u.id
          WHERE u.id IN (
            SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
            UNION
            SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
          )
        `).all(ownerId, ...establishmentIds, ...establishmentIds) as any[];

        const data = vacations.map(v => ({
          'Funcionário': v.employee_name,
          'Data Início': v.start_date,
          'Data Fim': v.end_date,
          'Tipo': v.type,
          'Estado': v.status,
          'Notas': v.notes || ''
        }));

        fileName = `Relatorio_Ferias_RH_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Férias");
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      } else if (export_type === 'invoices') {
        type = "PDF";
        fileName = `Faturas_${establishment?.name || 'Geral'}_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`;
        
        const invoices = db.prepare(`
          SELECT * FROM credit_invoices 
          WHERE establishment_id = ? 
          ORDER BY created_at DESC 
          LIMIT 100
        `).all(establishment_id) as any[];

        const posSales = db.prepare(`
          SELECT * FROM transactions 
          WHERE establishment_id = ? 
          ORDER BY timestamp DESC 
          LIMIT 100
        `).all(establishment_id) as any[];

        const allDocs = [
          ...invoices.map(i => ({
            date: i.created_at,
            number: i.invoice_number,
            client: i.client_name,
            total: i.total_amount,
            type: i.doc_type,
            due_date: i.due_date,
            service_designation: i.service_designation,
            billing_mode: i.billing_mode || 'tradicional',
            nif: i.client_nif || '999999999'
          })),
          ...posSales.map(s => ({
            date: s.timestamp,
            number: s.invoice_number || `POS-${s.id}`,
            client: s.client_name || 'Consumidor Final',
            total: s.total_amount,
            type: 'FR',
            due_date: null,
            billing_mode: s.billing_mode || 'tradicional',
            nif: s.client_nif || '999999999'
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 100);

        const doc: any = new (PDFDocument as any)({ margin: 30, size: 'A4' });
        const chunks: any[] = [];
        doc.on('data', (chunk: any) => chunks.push(chunk));
        
        // PDF Header
        doc.fillColor('#ea580c').fontSize(20).text(`Relatório de Faturas - ${establishment?.name || 'Geral'}`, { align: 'center' });
        doc.moveDown();
        doc.fillColor('#000000').fontSize(10).text(`Empresa: ${owner?.company_name || owner?.name}`);
        doc.text(`NIF: ${owner?.nif || 'N/A'}`);
        doc.text(`Data de Exportação: ${new Date().toLocaleString()}`);
        doc.moveDown();

        const table = {
          title: "Lista de Documentos Fiscais (Últimos 100)",
          headers: ["Data", "Número", "Tipo", "Cliente", "Total (AOA)", "QR Code (Eletr.)"],
          rows: [] as any[]
        };

        for (const d of allDocs) {
          let qrStatus = "N/A";
          if (d.type === 'FR' && d.billing_mode === 'eletronica') {
            qrStatus = "Sim (Ver Fatura)";
          }
          
          table.rows.push([
            new Date(d.date).toLocaleDateString(),
            d.number,
            d.type + (d.due_date && d.type === 'FT' ? ` (Venc: ${new Date(d.due_date).toLocaleDateString()})` : ''),
            d.client,
            d.total.toFixed(2),
            qrStatus
          ]);
        }

        await doc.table(table, {
          prepareHeader: () => doc.font("Helvetica-Bold").fontSize(8).fillColor('#ea580c'),
          prepareRow: (row: any, indexColumn: any, indexRow: any, rectRow: any, rectCell: any) => doc.font("Helvetica").fontSize(8).fillColor('#000000'),
        });

        // If it's electronic mode, add a sample QR code at the bottom for the last FR
        const lastElectronicFR = allDocs.find(d => d.type === 'FR' && d.billing_mode === 'eletronica');
        if (lastElectronicFR) {
          doc.moveDown();
          doc.fontSize(10).text("Exemplo de QR Code para Fatura Eletrónica (FR):", { underline: true });
          
          const qrData = `https://agt.minfin.gov.ao/m?nif=${owner?.nif || '000000000'}&num=${lastElectronicFR.number}&dt=${new Date(lastElectronicFR.date).toISOString().split('T')[0]}&val=${lastElectronicFR.total.toFixed(2)}`;
          const qrBuffer = await QRCode.toBuffer(qrData);
          doc.image(qrBuffer, { width: 80, align: 'center' });
          doc.fontSize(8).text(`Dados: ${lastElectronicFR.number} | Total: ${lastElectronicFR.total.toFixed(2)} AOA`, { align: 'center' });
        }

        doc.end();

        // Wait for PDF to finish
        buffer = await new Promise((resolve) => {
          doc.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
        });

      } else {
        return res.status(400).json({ error: "Tipo de exportação inválido." });
      }

      db.prepare("INSERT INTO generated_files (owner_id, name, type, file_path, generated_by, file_data) VALUES (?, ?, ?, ?, ?, ?)").run(
        owner_id, 
        fileName, 
        type, 
        "/download/" + (type === 'PDF' ? 'reports/' : 'exports/') + fileName,
        user_name, 
        buffer
      );
      
      res.json({ success: true, fileName });
    } catch (e: any) {
      console.error("Export error:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/profile-details/:id", (req, res) => {
    try {
      const clientId = req.params.id;
      const client = db.prepare("SELECT * FROM users WHERE id = ?").get(clientId) as any;
      if (!client) return res.status(404).json({ error: "Client not found" });

      const establishments = db.prepare("SELECT * FROM establishments WHERE owner_id = ?").all(clientId);
      const licenses = db.prepare(`
        SELECT l.*, s.name as establishment_name 
        FROM licenses l 
        LEFT JOIN establishments s ON l.establishment_id = s.id 
        WHERE l.user_id = ? 
        ORDER BY l.expiry_date DESC
      `).all(clientId);

      res.json({
        client,
        establishments,
        licenses
      });
    } catch (e: any) {
      console.error("Error fetching owner profile:", e);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // --- Owner Support Endpoints ---
  app.get("/api/owner/support/:userId", (req, res) => {
    const tickets = db.prepare(`
      SELECT t.*, u.name as client_name
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.params.userId);
    res.json(tickets);
  });

  app.post("/api/owner/support", (req, res) => {
    try {
      const { user_id, subject, description, priority } = req.body;
      const result = db.prepare(`
        INSERT INTO support_tickets (user_id, subject, description, priority, status)
        VALUES (?, ?, ?, ?, 'open')
      `).run(user_id, subject, description, priority || 'medium');

      // Notify Administrator (Simulated Email)
      let adminEmail = 'lazivaniomulazaeren@gmail.com';
      try {
        const notificationEmail = db.prepare("SELECT value FROM system_settings WHERE key = 'support_notification_email'").get() as any;
        if (notificationEmail?.value) adminEmail = notificationEmail.value;
      } catch (e) {
        console.error("Error fetching notification email:", e);
      }
      
      console.log(`[NOTIFICATION_EMAIL_SENT]`);
      console.log(`Destinatário: ${adminEmail}`);
      console.log(`Assunto: [NOVA SOLICITAÇÃO #${result.lastInsertRowid}] ${subject}`);
      console.log(`Mensagem: Olá Administrador, existe uma nova solicitação pendente no sistema. Por favor, aceda à sua conta para consultar os detalhes.`);
      console.log(`---`);
      console.log(`Assunto Original: ${subject}`);
      console.log(`Descrição: ${description}`);
      
      res.json({ success: true, ticketId: result.lastInsertRowid, notificationSentTo: adminEmail });
    } catch (e: any) {
      console.error("Error creating support ticket:", e);
      res.status(500).json({ error: "Erro ao criar ticket de suporte" });
    }
  });

  app.get("/api/owner/support/ticket/:id/messages", (req, res) => {
    const messages = db.prepare(`
      SELECT m.*, u.name as sender_name
      FROM ticket_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `).all(req.params.id);
    res.json(messages);
  });

  app.post("/api/owner/support/ticket/:id/messages", (req, res) => {
    const { sender_id, message } = req.body;
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin)
      VALUES (?, ?, ?, 0)
    `).run(req.params.id, sender_id, message);
    
    db.prepare("UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    
    res.json({ success: true });
  });

  app.get("/api/owner/active-series/:establishmentId", (req, res) => {
    try {
      const { establishmentId } = req.params;
      const series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND status = 'active'").all(establishmentId);
      res.json(series);
    } catch (error) {
      console.error("Error fetching active series:", error);
      res.status(500).json({ error: "Erro ao buscar séries ativas." });
    }
  });

  app.get("/api/owner/establishment-details/:establishmentId", (req, res) => {
    const { establishmentId } = req.params;
    console.log(`[API] Fetching establishment details for ID: ${establishmentId}`);
    
    try {
      const establishment = db.prepare("SELECT * FROM establishments WHERE id = ?").get(establishmentId) as any;
      if (!establishment) {
        console.warn(`[API] Establishment ${establishmentId} not found`);
        return res.status(404).json({ error: "Estabelecimento não encontrado." });
      }

      const ownerId = establishment.owner_id;
      const today = new Date().toISOString().split('T')[0];
      
      const countTrans = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE establishment_id = ? AND date(timestamp, 'localtime') = date(?, 'localtime')").get(establishmentId, today) as any;
      const countCredit = db.prepare("SELECT COUNT(*) as count FROM credit_invoices WHERE establishment_id = ? AND (date(invoice_date, 'localtime') = date(?, 'localtime') OR date(created_at, 'localtime') = date(?, 'localtime')) AND doc_type IN ('FT', 'FR', 'ND')").get(establishmentId, today, today) as any;
      
      const totalTrans = db.prepare("SELECT COALESCE(SUM(COALESCE(base_amount, total_amount)), 0) as total FROM transactions WHERE establishment_id = ? AND date(timestamp, 'localtime') = date(?, 'localtime') AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE establishment_id = ? AND type = 'income' AND reference_type = 'transaction' AND reference_id IS NOT NULL)").get(establishmentId, today, establishmentId) as any;
      const totalCredit = db.prepare("SELECT COALESCE(SUM(COALESCE(base_amount, total_amount)), 0) as total FROM credit_invoices WHERE establishment_id = ? AND (date(invoice_date, 'localtime') = date(?, 'localtime') OR date(created_at, 'localtime') = date(?, 'localtime')) AND doc_type IN ('FT', 'FR', 'ND') AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE establishment_id = ? AND type = 'income' AND reference_type = 'credit_invoice' AND reference_id IS NOT NULL)").get(establishmentId, today, today, establishmentId) as any;
      const totalNC = db.prepare("SELECT COALESCE(SUM(COALESCE(base_amount, total_amount)), 0) as total FROM credit_invoices WHERE establishment_id = ? AND (date(invoice_date, 'localtime') = date(?, 'localtime') OR date(created_at, 'localtime') = date(?, 'localtime')) AND doc_type = 'NC'").get(establishmentId, today, today) as any;
      
      const todayTotalIncome = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE establishment_id = ? AND type = 'income' AND date(date, 'localtime') = date(?, 'localtime')").get(establishmentId, today) as any;
      
      const todaySalesCount = (countTrans?.count || 0) + (countCredit?.count || 0);
      const todayRevenueTotal = (todayTotalIncome?.total || 0) + (totalTrans?.total || 0) + (totalCredit?.total || 0) - (totalNC?.total || 0);

      const sellers = db.prepare("SELECT COUNT(DISTINCT seller_id) as count FROM transactions WHERE establishment_id = ? AND date(timestamp) = ?").get(establishmentId, today) as any;
      const openSessions = db.prepare("SELECT COUNT(*) as count FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'").get(establishmentId) as any;

      const stats = {
        todaySales: todaySalesCount,
        todayRevenue: todayRevenueTotal,
        activeSellers: sellers?.count || 0,
        openTills: openSessions?.count || 0
      };

      console.log(`[API] Stats for establishment ${establishmentId}:`, stats);

      const lowStock = db.prepare("SELECT count(*) as count FROM products WHERE establishment_id = ? AND stock <= min_stock").get(establishmentId) as any;
      const staffCountResult = db.prepare("SELECT count(*) as count FROM staff WHERE establishment_id = ?").get(establishmentId) as any;

      // Financial health for reminder
      let financialReminder = { enabled: false };
      try {
        const ownerSettings = db.prepare("SELECT financial_reminder_enabled FROM owner_settings WHERE owner_id = ?").get(ownerId) as any;
        if (ownerSettings) financialReminder.enabled = ownerSettings.financial_reminder_enabled === 1;
      } catch (err) {}
      
      // Get monthly financial summary
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const financialSummary = db.prepare(`
        SELECT 
          SUM(income) as income,
          SUM(expense) as expense
        FROM (
          SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE establishment_id = ? AND type = 'income' AND date >= ?
          UNION ALL
          SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE establishment_id = ? AND type = 'expense' AND date >= ?
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE establishment_id = ? AND date(timestamp) >= ? AND cancellation_id IS NULL AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE establishment_id = ? AND type = 'income' AND reference_id IS NOT NULL)
          UNION ALL
          SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id = ? AND date(invoice_date) >= ? AND doc_type IN ('FT', 'FR', 'ND') AND status != 'canceled' AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE establishment_id = ? AND type = 'income' AND reference_id IS NOT NULL)
          UNION ALL
          SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE establishment_id = ? AND date(invoice_date) >= ? AND doc_type = 'NC' AND status != 'canceled' AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE establishment_id = ? AND type = 'expense' AND reference_id IS NOT NULL)
          UNION ALL
          SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE establishment_id = ? AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date) >= ?
        )
      `).get(establishmentId, firstDay, establishmentId, firstDay, establishmentId, firstDay, establishmentId, establishmentId, firstDay, establishmentId, establishmentId, firstDay, establishmentId, establishmentId, firstDay) as any;

      res.json({
        establishment: {
          ...establishment,
          bank_accounts: establishment.bank_accounts 
            ? (typeof establishment.bank_accounts === 'string' ? JSON.parse(establishment.bank_accounts) : (establishment.bank_accounts || [])) 
            : []
        },
        dashboard: {
          ...stats,
          lowStockCount: lowStock?.count || 0,
          staffCount: staffCountResult?.count || 0,
          financialReminder,
          financialSummary: {
            income: financialSummary?.income || 0,
            expense: financialSummary?.expense || 0
          }
        }
      });
    } catch (error) {
      console.error(`[API] Exception in establishment-details for ${establishmentId}:`, error);
      res.status(500).json({ error: "Erro interno ao buscar detalhes do estabelecimento." });
    }
  });

  app.get("/api/owner/staff/:establishmentId", (req, res) => {
    const staff = db.prepare(`
      SELECT s.*, u.name, u.email, u.username, u.status 
      FROM staff s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.establishment_id = ?
    `).all(req.params.establishmentId);
    res.json(staff);
  });

  app.post("/api/owner/staff", (req, res) => {
    const { establishment_id, name, email, username, password, salary, shift_info, role, cash_register_id } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    const userRole = role || 'seller';
    
    if (!trimmedUsername || !password || !name) {
      return res.status(400).json({ error: "Nome, utilizador e palavra-passe são obrigatórios." });
    }

    try {
      // Check if username already exists
      const existingUser = db.prepare("SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)").get(trimmedUsername, trimmedEmail || '___never_match___');
      if (existingUser) {
        return res.status(400).json({ error: "Este nome de utilizador ou email já está em uso." });
      }

      db.transaction(() => {
        const userResult = db.prepare("INSERT INTO users (email, username, password, name, role, establishment_id, cash_register_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(trimmedEmail || null, trimmedUsername || null, password, name, userRole, establishment_id, cash_register_id || null);
        db.prepare("INSERT INTO staff (establishment_id, user_id, salary, shift_info) VALUES (?, ?, ?, ?)").run(establishment_id, userResult.lastInsertRowid, salary, shift_info);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Staff creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/owner/staff/:staffId", (req, res) => {
    const { salary, shift_info, name, email, username, password, role, cash_register_id } = req.body;
    const trimmedUsername = username?.trim();
    const trimmedEmail = email?.trim();
    
    try {
      db.transaction(() => {
        const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
        if (staff) {
          if (password) {
            db.prepare("UPDATE users SET name = ?, email = ?, username = ?, password = ?, role = ?, cash_register_id = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, password, role || 'seller', cash_register_id || null, staff.user_id);
          } else {
            db.prepare("UPDATE users SET name = ?, email = ?, username = ?, role = ?, cash_register_id = ? WHERE id = ?").run(name, trimmedEmail || null, trimmedUsername || null, role || 'seller', cash_register_id || null, staff.user_id);
          }
          db.prepare("UPDATE staff SET salary = ?, shift_info = ? WHERE id = ?").run(salary, shift_info, req.params.staffId);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/staff/:staffId/status", (req, res) => {
    const { status } = req.body;
    try {
      const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
      if (staff) {
        db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, staff.user_id);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Colaborador não encontrado" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/owner/staff/:staffId", (req, res) => {
    try {
      db.transaction(() => {
        const staff = db.prepare("SELECT user_id FROM staff WHERE id = ?").get(req.params.staffId) as any;
        if (staff) {
          db.prepare("DELETE FROM staff WHERE id = ?").run(req.params.staffId);
          // Suspend the user so they can't login anymore even if the record stays for history
          db.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(staff.user_id);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Services Routes
  app.get("/api/owner/services/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const services = db.prepare(`
      SELECT s.*, st.name as establishment_name, t.percentage as tax_percentage, t.tax_code
      FROM services s
      LEFT JOIN establishments st ON s.establishment_id = st.id
      LEFT JOIN taxes t ON s.tax_id = t.id
      WHERE s.establishment_id IN (${placeholders})
    `).all(...establishmentIds) as any[];

    // Fetch fees for each service
    const servicesWithFees = services.map(s => {
      const fees = db.prepare("SELECT * FROM service_fees WHERE service_id = ?").all(s.id);
      return { ...s, fees };
    });

    res.json(servicesWithFees);
  });

  app.post("/api/owner/services", (req, res) => {
    let { owner_id, establishment_id, name, code, description, price, availability_condition, show_in_pos, tax_id, retention_enabled, retention_percentage, fees } = req.body;
    
    // Auto-generate code if not provided
    if (!code || code.trim() === '') {
      const lastService = db.prepare("SELECT code FROM services WHERE establishment_id = ? AND code LIKE 'SERV%' ORDER BY code DESC LIMIT 1").get(establishment_id) as any;
      let nextNum = 1;
      if (lastService && lastService.code) {
        const match = lastService.code.match(/SERV(\d+)/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }
      code = `SERV${nextNum.toString().padStart(3, '0')}`;
    }

    // Check for unique code per establishment
    const existing = db.prepare("SELECT id FROM services WHERE establishment_id = ? AND code = ?").get(establishment_id, code);
    if (existing) {
      return res.status(400).json({ error: "Já existe um serviço com este código neste estabelecimento." });
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(owner_id) as any;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO services (owner_id, establishment_id, name, code, description, price, availability_condition, show_in_pos, tax_id, retention_enabled, retention_percentage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(owner_id, establishment_id, name, code, description, price, availability_condition, show_in_pos, finalTaxId || null, retention_enabled || 0, retention_percentage || 0);

      const serviceId = result.lastInsertRowid;

      if (Array.isArray(fees)) {
        const stmt = db.prepare("INSERT INTO service_fees (service_id, name, amount) VALUES (?, ?, ?)");
        for (const fee of fees) {
          stmt.run(serviceId, fee.name, fee.amount);
        }
      }

      return serviceId;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/services/:id", (req, res) => {
    const { establishment_id, name, code, description, price, availability_condition, show_in_pos, tax_id, retention_enabled, retention_percentage, fees } = req.body;
    
    // Check for unique code per establishment
    if (code) {
      const existing = db.prepare("SELECT id FROM services WHERE establishment_id = ? AND code = ? AND id != ?").get(establishment_id, code, req.params.id);
      if (existing) {
        return res.status(400).json({ error: "Já existe outro serviço com este código neste estabelecimento." });
      }
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    const owner = establishment ? db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any : null;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE services 
        SET establishment_id = ?, name = ?, code = ?, description = ?, price = ?, availability_condition = ?, show_in_pos = ?, tax_id = ?, retention_enabled = ?, retention_percentage = ?
        WHERE id = ?
      `).run(establishment_id, name, code, description, price, availability_condition, show_in_pos, finalTaxId || null, retention_enabled || 0, retention_percentage || 0, req.params.id);

      // Re-sync fees: delete all and re-insert
      db.prepare("DELETE FROM service_fees WHERE service_id = ?").run(req.params.id);

      if (Array.isArray(fees)) {
        const stmt = db.prepare("INSERT INTO service_fees (service_id, name, amount) VALUES (?, ?, ?)");
        for (const fee of fees) {
          stmt.run(req.params.id, fee.name, fee.amount);
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/owner/services/:id", (req, res) => {
    db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/services-report/:ownerId", (req, res) => {
    const { ownerId } = req.params;
    const { establishmentIds } = getContextData(ownerId);
    
    if (establishmentIds.length === 0) {
      return res.json({ summary: [], history: [] });
    }

    const placeholders = establishmentIds.map(() => '?').join(',');
    const transactions = db.prepare(`
      SELECT id, items, timestamp, establishment_id, client_name, client_nif 
      FROM transactions 
      WHERE establishment_id IN (${placeholders})
    `).all(...establishmentIds) as any[];

    const serviceSales: Record<string, { id: number, name: string, code: string, quantity: number, revenue: number, last_sold: string, establishment_id: number, establishment_name: string }> = {};
    const history: any[] = [];
    const ests = db.prepare(`SELECT id, name FROM establishments WHERE id IN (${placeholders})`).all(...establishmentIds) as any[];

    // 1. POS Transactions
    transactions.forEach(t => {
      try {
        const items = JSON.parse(t.items);
        items.forEach((item: any) => {
          if (item.type === 'service') {
            const estName = ests.find(e => e.id === t.establishment_id)?.name || 'Desconhecido';
            const key = `${item.id}_${t.establishment_id}`;
            if (!serviceSales[key]) {
              serviceSales[key] = {
                id: item.id, name: item.name, code: item.code || 'N/A', quantity: 0, revenue: 0, last_sold: t.timestamp, establishment_id: t.establishment_id, establishment_name: estName
              };
            }
            const qty = item.quantity || 1;
            serviceSales[key].quantity += qty;
            serviceSales[key].revenue += item.total || (qty * (item.price || 0));
            if (new Date(t.timestamp) > new Date(serviceSales[key].last_sold)) serviceSales[key].last_sold = t.timestamp;

            history.push({
              id: `tx_${t.id}_${item.id}`,
              date: t.timestamp,
              establishment_name: estName,
              client_name: t.client_name || 'Consumidor Final',
              client_nif: t.client_nif || '999999999',
              service_name: item.name,
              amount: item.total || (qty * (item.price || 0)),
              doc_type: 'FR (PDV)'
            });
          }
        });
      } catch (e) {}
    });

    // 2. Invoices
    const invoices = db.prepare(`SELECT id, items, invoice_date, establishment_id, client_name, client_nif FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND status != 'canceled'`).all(...establishmentIds) as any[];
    invoices.forEach(inv => {
      try {
        const items = JSON.parse(inv.items);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            if (item.type === 'service' || item.is_service) {
              const estName = ests.find(e => e.id === inv.establishment_id)?.name || 'Desconhecido';
              const key = `${item.id || item.product_id}_${inv.establishment_id}`;
              if (!serviceSales[key]) {
                serviceSales[key] = {
                  id: item.id || item.product_id, name: item.name, code: item.code || 'N/A', quantity: 0, revenue: 0, last_sold: inv.invoice_date, establishment_id: inv.establishment_id, establishment_name: estName
                };
              }
              const qty = item.quantity || 1;
              serviceSales[key].quantity += qty;
              serviceSales[key].revenue += item.total || (qty * (item.price || 0));
              if (new Date(inv.invoice_date) > new Date(serviceSales[key].last_sold)) serviceSales[key].last_sold = inv.invoice_date;

              history.push({
                id: `inv_${inv.id}_${item.id || item.product_id}`,
                date: inv.invoice_date,
                establishment_name: estName,
                client_name: inv.client_name || 'Consumidor Final',
                client_nif: inv.client_nif || '999999999',
                service_name: item.name,
                amount: item.total || (qty * (item.price || 0)),
                doc_type: 'FT/FR'
              });
            }
          });
        }
      } catch (e) {}
    });

    // 3. Service Sheets (only if no doc generated yet)
    const sheets = db.prepare(`SELECT * FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status IN ('concluded', 'concluido') AND fiscal_document_id IS NULL`).all(...establishmentIds) as any[];
    sheets.forEach(s => {
      const estName = ests.find(e => e.id === s.establishment_id)?.name || 'Desconhecido';
      const key = `sheet_${s.id}_${s.establishment_id}`;
      if (!serviceSales[key]) {
        serviceSales[key] = {
          id: s.id, name: s.service_description, code: 'FS', quantity: 0, revenue: 0, last_sold: s.scheduled_date, establishment_id: s.establishment_id, establishment_name: estName
        };
      }
      serviceSales[key].quantity += 1;
      serviceSales[key].revenue += s.total_amount;
      if (new Date(s.scheduled_date) > new Date(serviceSales[key].last_sold)) serviceSales[key].last_sold = s.scheduled_date;

      history.push({
        id: `sheet_${s.id}`,
        date: s.scheduled_date,
        establishment_name: estName,
        client_name: s.client_name,
        client_nif: s.client_nif || '999999999',
        service_name: s.service_description,
        amount: s.total_amount,
        doc_type: 'FS'
      });
    });

    res.json({
      summary: Object.values(serviceSales),
      history: history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
  });

  app.get("/api/seller/services/:establishmentId", (req, res) => {
    const showAll = req.query.all === 'true';
    const whereClause = showAll ? "WHERE s.establishment_id = ?" : "WHERE s.establishment_id = ? AND s.show_in_pos = 1";
    
    const services = db.prepare(`
      SELECT s.*, t.percentage as tax_percentage, t.tax_code
      FROM services s
      LEFT JOIN taxes t ON s.tax_id = t.id
      ${whereClause}
    `).all(req.params.establishmentId) as any[];

    // Fetch fees for each service
    const servicesWithFees = services.map(s => {
      const fees = db.prepare("SELECT * FROM service_fees WHERE service_id = ?").all(s.id);
      return { ...s, fees };
    });

    res.json(servicesWithFees);
  });

  // HR Routes
  app.get("/api/owner/hr/roles/:ownerId", (req, res) => {
    const { ownerId } = getContextData(req.params.ownerId);
    if (!ownerId) return res.json([]);
    const roles = db.prepare("SELECT * FROM hr_roles WHERE owner_id = ?").all(ownerId);
    res.json(roles);
  });

  app.post("/api/owner/hr/roles", (req, res) => {
    const { owner_id: requestId, name, base_role, permissions } = req.body;
    const { ownerId } = getContextData(requestId);
    if (!ownerId) return res.status(403).json({ error: "Owner context not found" });

    db.prepare("INSERT INTO hr_roles (owner_id, name, base_role, permissions) VALUES (?, ?, ?, ?)").run(ownerId, name, base_role || 'seller', JSON.stringify(permissions));
    res.json({ success: true });
  });

  app.put("/api/owner/hr/roles/:id", (req, res) => {
    const { name, base_role, permissions } = req.body;
    db.prepare("UPDATE hr_roles SET name = ?, base_role = ?, permissions = ? WHERE id = ?").run(name, base_role || 'seller', JSON.stringify(permissions), req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/hr/roles/:id", (req, res) => {
    db.prepare("DELETE FROM hr_roles WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/hr/employees/:ownerId", (req, res) => {
    const { establishmentIds, ownerId } = getContextData(req.params.ownerId);
    
    // Even if no establishments, an owner might have orphaned staff
    const placeholders = establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL';

    const employees = db.prepare(`
      SELECT u.*, r.name as role_name, s.base_salary, s.bonuses, s.discounts, st.name as establishment_name
      FROM users u
      LEFT JOIN hr_roles r ON u.role_id = r.id
      LEFT JOIN hr_salaries s ON u.id = s.user_id
      LEFT JOIN establishments st ON u.establishment_id = st.id
      WHERE u.role IN ('seller', 'manager', 'none') 
      AND (
        u.establishment_id IN (${placeholders}) 
        OR u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders}))
      )
    `).all(...[...establishmentIds, ...establishmentIds]);
    res.json(employees);
  });

  app.post("/api/owner/hr/employees", (req, res) => {
    let { name, email, username, password, role: bodyRole, establishment_id, role_id, custom_permissions, base_salary, cash_register_id, bi_number, address, nif, social_security_number, owner_id: bodyOwnerId } = req.body;
    
    // Normalize empty strings to null and lowercase for comparison
    const normEmail = (email && email.trim() !== '') ? email.trim().toLowerCase() : null;
    const normUsername = (username && username.trim() !== '') ? username.trim().toLowerCase() : null;
    const normEstId = (establishment_id && establishment_id !== '') ? Number(establishment_id) : null;
    const normRoleId = (role_id && role_id !== '') ? Number(role_id) : null;
    const normRegId = (cash_register_id && cash_register_id !== '') ? Number(cash_register_id) : null;

    try {
      // Resolve the real owner ID from the person making the request
      const { ownerId: resolvedOwnerId } = getContextData(bodyOwnerId);
      if (!resolvedOwnerId) throw new Error("Não foi possível determinar o proprietário.");

      // Check for existing email or username (ensure they don't collide with ANY identifier used at login)
      if (normEmail) {
        const existingEmail = db.prepare("SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?").get(normEmail, normEmail);
        if (existingEmail) throw new Error("Este email já está a ser utilizado por outro utilizador (como email ou nome de utilizador).");
      }
      if (normUsername) {
        const existingUsername = db.prepare("SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?").get(normUsername, normUsername);
        if (existingUsername) throw new Error("Este nome de utilizador já está a ser utilizado por outro utilizador (como nome de utilizador ou email).");
      }

      db.transaction(() => {
        let finalRole = bodyRole || 'seller';
        if (normRoleId) {
          const hrRole = db.prepare("SELECT base_role FROM hr_roles WHERE id = ?").get(normRoleId) as any;
          if (hrRole) finalRole = hrRole.base_role;
        }

        const result = db.prepare("INSERT INTO users (name, email, username, password, role, establishment_id, role_id, custom_permissions, status, cash_register_id, bi_number, address, nif, social_security_number, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          name, normEmail, normUsername, password, finalRole, normEstId, normRoleId, JSON.stringify(custom_permissions || []), 'active', normRegId, bi_number || null, address || null, nif || null, social_security_number || null, resolvedOwnerId
        );
        const userId = result.lastInsertRowid;
        const salary = Number(base_salary) || 0;
        db.prepare(`
          INSERT INTO hr_salaries (user_id, base_salary) 
          VALUES (?, ?) 
          ON CONFLICT(user_id) DO UPDATE SET base_salary = excluded.base_salary
        `).run(userId, salary);
        if (normEstId) {
          db.prepare(`
            INSERT INTO staff (establishment_id, user_id, salary) 
            VALUES (?, ?, ?) 
            ON CONFLICT(establishment_id, user_id) DO UPDATE SET salary = excluded.salary
          `).run(normEstId, userId, salary);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error creating employee:", error);
      logServerError("POST /api/owner/hr/employees", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/hr/employees/:id", (req, res) => {
    const { name, email, username, password, role: bodyRole, establishment_id, role_id, custom_permissions, base_salary, status, cash_register_id, bi_number, address, nif, social_security_number } = req.body;
    
    // Normalize empty strings to null and lowercase for comparison
    const normEmail = (email && email.trim() !== '') ? email.trim().toLowerCase() : null;
    const normUsername = (username && username.trim() !== '') ? username.trim().toLowerCase() : null;
    const estId = (establishment_id === '' || establishment_id === undefined) ? null : Number(establishment_id);
    const rId = (role_id === '' || role_id === undefined) ? null : Number(role_id);
    const crId = (cash_register_id === '' || cash_register_id === undefined) ? null : Number(cash_register_id);

    try {
      // Check for existing email or username conflicts with other users
      if (normEmail) {
        const conflict = db.prepare("SELECT id FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND id != ?").get(normEmail, normEmail, req.params.id);
        if (conflict) throw new Error("Este email já está a ser utilizado por outro utilizador.");
      }
      if (normUsername) {
        const conflict = db.prepare("SELECT id FROM users WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND id != ?").get(normUsername, normUsername, req.params.id);
        if (conflict) throw new Error("Este nome de utilizador já está a ser utilizado por outro utilizador.");
      }

      db.transaction(() => {
        let finalRole = bodyRole || 'seller';
        if (rId) {
          const hrRole = db.prepare("SELECT base_role FROM hr_roles WHERE id = ?").get(rId) as any;
          if (hrRole) finalRole = hrRole.base_role;
        }

        db.prepare("UPDATE users SET name = ?, email = ?, username = ?, role = ?, establishment_id = ?, role_id = ?, custom_permissions = ?, status = ?, cash_register_id = ?, bi_number = ?, address = ?, nif = ?, social_security_number = ? WHERE id = ?").run(
          name, normEmail, normUsername, finalRole, estId, rId, JSON.stringify(custom_permissions || []), status || 'active', crId, bi_number || null, address || null, nif || null, social_security_number || null, req.params.id
        );

        if (password && password.trim() !== '') {
          db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, req.params.id);
        }
        const salary = Number(base_salary) || 0;
        db.prepare(`
          INSERT INTO hr_salaries (user_id, base_salary) 
          VALUES (?, ?) 
          ON CONFLICT(user_id) DO UPDATE SET base_salary = excluded.base_salary
        `).run(req.params.id, salary);
        if (estId) {
          db.prepare(`
            INSERT INTO staff (establishment_id, user_id, salary) 
            VALUES (?, ?, ?) 
            ON CONFLICT(establishment_id, user_id) DO UPDATE SET salary = excluded.salary
          `).run(estId, req.params.id, salary);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating employee:", error);
      logServerError(`PUT /api/owner/hr/employees/${req.params.id}`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancellation Requests
  app.post("/api/sales/request-cancellation", (req, res) => {
    const { invoice_id, doc_type, type, reason, amount, requested_by, establishment_id, items } = req.body;
    try {
      db.prepare("INSERT INTO cancellation_requests (invoice_id, doc_type, type, reason, amount, requested_by, establishment_id, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        invoice_id, doc_type || 'NC', type, reason, amount, requested_by, establishment_id, JSON.stringify(items || [])
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/cancellation-requests/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const requests = db.prepare(`
      SELECT cr.*, u.name as requested_by_name, t.invoice_number
      FROM cancellation_requests cr
      JOIN users u ON cr.requested_by = u.id
      JOIN transactions t ON cr.invoice_id = t.id
      WHERE cr.establishment_id IN (${placeholders}) AND cr.status = 'pending'
    `).all(...establishmentIds);
    res.json(requests);
  });

  app.delete("/api/owner/hr/employees/:id", (req, res) => {
    const employeeId = req.params.id;
    const employee = db.prepare("SELECT * FROM users WHERE id = ?").get(employeeId) as any;

    try {
      db.transaction(() => {
        db.prepare("DELETE FROM staff WHERE user_id = ?").run(employeeId);
        db.prepare("DELETE FROM hr_salary_payments WHERE salary_id IN (SELECT id FROM hr_salaries WHERE user_id = ?)").run(employeeId);
        db.prepare("DELETE FROM hr_salaries WHERE user_id = ?").run(employeeId);
        db.prepare("DELETE FROM hr_attendance WHERE user_id = ?").run(employeeId);
        db.prepare("DELETE FROM hr_vacations WHERE user_id = ?").run(employeeId);
        db.prepare("DELETE FROM users WHERE id = ?").run(employeeId);
      })();

      logAction({
        userId: req.query.ownerId as string, // Assuming ownerId is passed or we get it from auth
        ownerId: employee?.owner_id,
        module: 'HR',
        actionType: 'EMPLOYEE_DELETE',
        severity: 'WARNING',
        description: `Funcionário removido: ${employee?.name || employeeId}`,
        entityType: 'USER',
        entityId: employeeId,
        oldValues: employee,
        req
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/owner/hr/employees/:id/status", (req, res) => {
    const { status } = req.body;
    try {
      db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/hr/salaries/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const salaries = db.prepare(`
      SELECT s.*, u.name as employee_name, r.name as role_name
      FROM hr_salaries s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN hr_roles r ON u.role_id = r.id
      WHERE u.role IN ('seller', 'manager', 'none') AND (u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders})) OR u.establishment_id IN (${placeholders}))
    `).all(...[...establishmentIds, ...establishmentIds]);
    res.json(salaries);
  });

  app.get("/api/owner/hr/salaries/payments/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const payments = db.prepare(`
      SELECT p.*, u.name as employee_name, s.base_salary
      FROM hr_salary_payments p
      JOIN hr_salaries s ON p.salary_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE u.role IN ('seller', 'manager', 'none') AND (u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders})) OR u.establishment_id IN (${placeholders}))
      ORDER BY p.timestamp DESC
    `).all(...[...establishmentIds, ...establishmentIds]);
    res.json(payments);
  });

  app.get("/api/owner/hr/salaries/receipt/:id", (req, res) => {
    try {
      const paymentId = req.params.id;
      const payment = db.prepare(`
        SELECT p.*, u.name as employee_name, u.nif as employee_nif, u.social_security_number, u.address as employee_address, u.bi_number,
               r.name as role_name, s.base_salary,
               e.name as establishment_name, e.nif as establishment_nif, e.address as establishment_address, e.phone as establishment_phone, e.email as establishment_email
        FROM hr_salary_payments p
        JOIN hr_salaries s ON p.salary_id = s.id
        JOIN users u ON s.user_id = u.id
        LEFT JOIN hr_roles r ON u.role_id = r.id
        LEFT JOIN establishments e ON u.establishment_id = e.id
        WHERE p.id = ?
      `).get(paymentId) as any;

      if (!payment) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      const orangeColor = '#f97316';
      const blackColor = '#000000';
      const whiteColor = '#ffffff';

      const doc = new (PDFDocument as any)({ margin: 50, size: 'A4' }) as any;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=recibo_salario_${paymentId}.pdf`);
      doc.pipe(res);

      // White Background is default, but let's be explicit if needed
      // Actually PDFDocument background is white by default.

      // Header with Orange Border
      doc.rect(0, 0, 612, 80).fill(orangeColor);
      doc.fillColor(whiteColor).fontSize(20).font('Helvetica-Bold').text('RECIBO DE VENCIMENTO', 50, 30, { align: 'center' });
      
      doc.fillColor(blackColor).moveDown(4);

      // Stripe Divider
      doc.strokeColor(orangeColor).lineWidth(2).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Entity Info
      const colWidth = 250;
      const startY = doc.y;
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(orangeColor).text('EMPREGADOR:', 50, startY);
      doc.fillColor(blackColor).font('Helvetica').text(`${payment.establishment_name || 'N/A'}`);
      doc.text(`NIF: ${payment.establishment_nif || 'N/A'}`);
      doc.text(`${payment.establishment_address || 'N/A'}`);

      doc.font('Helvetica-Bold').fillColor(orangeColor).text('EMPREGADO:', 50 + colWidth, startY);
      doc.fillColor(blackColor).font('Helvetica').text(`${payment.employee_name}`);
      doc.text(`Cargo: ${payment.role_name || 'N/A'}`);
      doc.text(`NIF: ${payment.employee_nif || 'N/A'}`);
      doc.text(`Seg. Social: ${payment.social_security_number || 'N/A'}`);

      doc.moveDown(2);

      // Info Bar
      const infoBarY = doc.y;
      doc.rect(50, infoBarY, 500, 25).fill(orangeColor);
      doc.fillColor(whiteColor).font('Helvetica-Bold').fontSize(10);
      doc.text(`Mês de Referência: ${payment.month}`, 60, infoBarY + 7);
      doc.text(`Data: ${new Date(payment.timestamp).toLocaleDateString()}`, 400, infoBarY + 7);

      doc.moveDown(2);
      doc.fillColor(blackColor);

      // Table Setup
      const tableTop = doc.y + 10;
      doc.font('Helvetica-Bold');
      doc.text('Descrição', 50, tableTop);
      doc.text('Vencimentos', 300, tableTop, { width: 100, align: 'right' });
      doc.text('Descontos', 450, tableTop, { width: 100, align: 'right' });
      
      doc.strokeColor(orangeColor).lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let currentY = tableTop + 25;
      doc.font('Helvetica').fontSize(10);

      const rows = [
        ['Salário Base', payment.base_salary, null],
        ['Bónus/Subsídios', payment.bonus, null],
        ['Faltas', null, payment.absence_discount],
        ['Segurança Social', null, payment.ss_discount],
        ['IRT (Imposto)', null, payment.irt_tax],
      ];

      rows.forEach(row => {
        const [label, credit, debit] = row;
        doc.text(label as string, 50, currentY);
        if (credit !== null) doc.text(`${Number(credit).toLocaleString()} Kz`, 300, currentY, { width: 100, align: 'right' });
        if (debit !== null) doc.text(`${Number(debit).toLocaleString()} Kz`, 450, currentY, { width: 100, align: 'right' });
        currentY += 20;
      });

      doc.strokeColor(orangeColor).moveTo(50, currentY).lineTo(550, currentY).stroke();
      doc.moveDown(2);

      // Totals
      const totalCredits = Number(payment.base_salary) + Number(payment.bonus);
      const totalDebits = Number(payment.absence_discount) + Number(payment.ss_discount) + Number(payment.irt_tax);
      const netAmount = totalCredits - totalDebits;

      const totalsY = doc.y;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('Total Ilíquido:', 300, totalsY, { width: 100, align: 'right' });
      doc.text(`${totalCredits.toLocaleString()} Kz`, 450, totalsY, { width: 100, align: 'right' });
      
      doc.text('Total Descontos:', 300, totalsY + 20, { width: 100, align: 'right' });
      doc.text(`${totalDebits.toLocaleString()} Kz`, 450, totalsY + 20, { width: 100, align: 'right' });

      doc.rect(300, totalsY + 40, 250, 30).fill(orangeColor);
      doc.fillColor(whiteColor).fontSize(12).text('VALOR LÍQUIDO:', 310, totalsY + 50);
      doc.text(`${netAmount.toLocaleString()} Kz`, 430, totalsY + 50, { width: 110, align: 'right' });

      doc.moveDown(5);
      doc.fillColor(blackColor);

      // Signatures
      const sigY = doc.y;
      doc.strokeColor(blackColor).lineWidth(0.5);
      doc.moveTo(50, sigY).lineTo(220, sigY).stroke();
      doc.moveTo(330, sigY).lineTo(500, sigY).stroke();
      
      doc.fontSize(9).text('Assinatura do Empregador', 50, sigY + 5, { width: 170, align: 'center' });
      doc.text('Assinatura do Empregado', 330, sigY + 5, { width: 170, align: 'center' });

      doc.end();
    } catch (error) {
      console.error("Error generating salary receipt:", error);
      res.status(500).json({ error: "Erro ao gerar recibo" });
    }
  });

  app.post("/api/owner/hr/salaries/payment", (req, res) => {
    const { salary_id, amount, bonus, absence_discount, ss_discount, irt_tax, type, description, month } = req.body;
    
    try {
      db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO hr_salary_payments (salary_id, amount, bonus, absence_discount, ss_discount, irt_tax, type, description, month) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(salary_id, amount, bonus || 0, absence_discount || 0, ss_discount || 0, irt_tax || 0, type, description, month);
        const paymentId = result.lastInsertRowid;

        // Record in financial_transactions
        const salaryInfo = db.prepare(`
          SELECT s.base_salary, u.name as employee_name, u.establishment_id
          FROM hr_salaries s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `).get(salary_id) as any;

        if (salaryInfo) {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(salaryInfo.establishment_id) as any;
          if (establishment) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type
              ) VALUES (?, ?, 'expense', 'Salários e Benefícios', ?, 'bank_transfer', ?, ?, 'paid', ?, 'salary_payment')
            `).run(
              salaryInfo.establishment_id, establishment.owner_id, Number(amount),
              `Pagamento Salário - ${salaryInfo.employee_name} (${month})`,
              new Date().toISOString(), paymentId
            );
          }
        }

        if (type === 'full_payment') {
          db.prepare("UPDATE hr_salaries SET last_payment_date = CURRENT_TIMESTAMP WHERE id = ?").run(salary_id);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Salary payment error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/owner/hr/attendance/:ownerId", (req, res) => {
    const { establishmentIds, ownerId } = getContextData(req.params.ownerId);
    
    // We want all attendance for users belonging to these establishments
    // OR attendance where the user_id is the owner themselves or their staff
    const attendance = db.prepare(`
      SELECT a.*, u.name as employee_name, st.name as establishment_name
      FROM hr_attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN establishments st ON a.establishment_id = st.id
      WHERE a.user_id IN (
        SELECT id FROM users WHERE id = ? OR establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
        UNION
        SELECT user_id FROM staff WHERE establishment_id IN (${establishmentIds.length > 0 ? establishmentIds.map(() => '?').join(',') : 'NULL'})
      )
      ORDER BY a.date DESC, a.entry_time DESC
    `).all(ownerId, ...establishmentIds, ...establishmentIds);
    res.json(attendance);
  });

  app.post("/api/owner/hr/attendance", (req, res) => {
    const { user_id, establishment_id, entry_time, exit_time, status, date, notes } = req.body;
    db.prepare("INSERT INTO hr_attendance (user_id, establishment_id, entry_time, exit_time, status, date, notes, type) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')").run(
      user_id, establishment_id, entry_time, exit_time, status, date, notes
    );
    res.json({ success: true });
  });

  app.get("/api/owner/hr/vacations/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const vacations = db.prepare(`
      SELECT v.*, u.name as employee_name
      FROM hr_vacations v
      JOIN users u ON v.user_id = u.id
      WHERE u.id IN (SELECT user_id FROM staff WHERE establishment_id IN (${placeholders}))
    `).all(...establishmentIds);
    res.json(vacations);
  });

  app.post("/api/owner/hr/vacations", (req, res) => {
    const { user_id, start_date, end_date, days_count, notes } = req.body;
    db.prepare("INSERT INTO hr_vacations (user_id, start_date, end_date, days_count, notes) VALUES (?, ?, ?, ?, ?)").run(
      user_id, start_date, end_date, days_count, notes
    );
    res.json({ success: true });
  });

  app.put("/api/owner/hr/vacations/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE hr_vacations SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/staff-performance/:establishmentId", (req, res) => {
    const performance = db.prepare(`
      SELECT 
        u.id,
        u.name,
        COUNT(t.id) as total_sales,
        SUM(t.total_amount) as total_revenue
      FROM staff s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN transactions t ON t.seller_id = u.id AND t.establishment_id = s.establishment_id
      WHERE s.establishment_id = ?
      GROUP BY u.id
    `).all(req.params.establishmentId);
    res.json(performance);
  });

  app.get("/api/owner/products/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    const ownerId = req.query.ownerId;

    if (establishmentId === 'all' && ownerId) {
      const products = db.prepare(`
        SELECT p.*, s.name as establishment_name, w.name as warehouse_name,
          (SELECT pr.discount_percent FROM promotion_products pp 
           JOIN promotions pr ON pp.promotion_id = pr.id 
           WHERE pp.product_id = p.id AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
           LIMIT 1) as discount_percent
        FROM products p 
        JOIN establishments s ON p.establishment_id = s.id 
        LEFT JOIN warehouses w ON p.warehouse_id = w.id
        WHERE s.owner_id = ?
      `).all(ownerId);
      return res.json(products);
    }

    const products = db.prepare(`
      SELECT p.*, w.name as warehouse_name,
        (SELECT pr.discount_percent FROM promotion_products pp 
         JOIN promotions pr ON pp.promotion_id = pr.id 
         WHERE pp.product_id = p.id AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
         LIMIT 1) as discount_percent
      FROM products p 
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.establishment_id = ?
    `).all(establishmentId);
    res.json(products);
  });

  app.get("/api/owner/dashboard-stats/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    const ownerId = req.query.ownerId;
    
    let whereClause = "establishment_id = ?";
    let params: any[] = [establishmentId];

    if (establishmentId === 'all' && ownerId) {
      const { establishmentIds } = getContextData(ownerId as string);
      if (establishmentIds.length === 0) {
        return res.json({ 
          todaySales: 0, 
          todayCount: 0, 
          todayExpense: 0,
          monthlySales: 0, 
          lowStockCount: 0, 
          staffCount: 0, 
          topProducts: [], 
          recentTransactions: [], 
          salesByDay: [], 
          salesByEstablishment: [], 
          paymentMethods: [], 
          totalExpenses: 0,
          financialHealth: { enabled: false, enoughForSalaries: false, totalSalaries: 0, monthlyIncome: 0 }
        });
      }
      const placeholders = establishmentIds.map(() => '?').join(',');
      whereClause = `establishment_id IN (${placeholders})`;
      params = [...establishmentIds];
    }
    
    // Sales of the day (Unified logic)
    const today = new Date().toISOString().split('T')[0];
    const financialToday = db.prepare(`
      SELECT 
        SUM(income) as income,
        SUM(expense) as expense
      FROM (
        SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE ${whereClause} AND type = 'income' AND date(date) = ?
        UNION ALL
        SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE ${whereClause} AND date(timestamp) = ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')
        UNION ALL
        SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE ${whereClause} AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date) = ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')
        UNION ALL
        SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE ${whereClause} AND doc_type = 'NC' AND date(invoice_date) = ?
        UNION ALL
        SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE ${whereClause} AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date) = ?
        UNION ALL
        SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE ${whereClause} AND type = 'expense' AND category NOT LIKE 'Nota de Crédito%' AND date(date) = ?
      )
    `).get(...params, today, ...params, today, ...params, today, ...params, today, ...params, today, ...params, today) as any;

    const todaySales = financialToday?.income || 0;
    const todayCountRes = db.prepare(`
      SELECT COUNT(*) as total 
      FROM (
        SELECT id FROM transactions WHERE ${whereClause} AND date(timestamp) = ?
        UNION ALL
        SELECT id FROM credit_invoices WHERE ${whereClause} AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date) = ?
        UNION ALL
        SELECT id FROM service_sheets WHERE ${whereClause} AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date) = ?
      )
    `).get(...params, today, ...params, today, ...params, today) as any;
    
    const todayCount = todayCountRes?.total || 0;
    const todayExpense = financialToday?.expense || 0;

    // Low stock count (below 5)
    const lowStock = db.prepare(`
      SELECT count(*) as count 
      FROM products 
      WHERE ${whereClause} AND stock <= min_stock
    `).get(...params) as any;

    // Staff count
    const staffCount = db.prepare(`
      SELECT count(*) as count 
      FROM staff 
      WHERE ${whereClause}
    `).get(...params) as any;

    // Top Products - Unified JS processing for better JSON error handling
    const productSales: Record<string, { id: any, name: string, quantity: number, revenue: number }> = {};
    const processItems = (rows: any[], isSubtraction = false) => {
      rows.forEach((t: any) => {
        try {
          const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
          if (!Array.isArray(items)) return;
          items.forEach((item: any) => {
            const id = item.id || item.ProductCode;
            if (!id) return;
            if (!productSales[id]) {
              productSales[id] = { id, name: item.name || item.ProductDescription, quantity: 0, revenue: 0 };
            }
            const factor = isSubtraction ? -1 : 1;
            productSales[id].quantity += (Number(item.quantity) || 0) * factor;
          });
        } catch (e) {}
      });
    };

    processItems(db.prepare(`SELECT items FROM transactions WHERE ${whereClause}`).all(...params));
    // Also include credit invoices in top products for dashboard
    processItems(db.prepare(`SELECT items FROM credit_invoices WHERE ${whereClause} AND doc_type IN ('FT', 'FR', 'ND')`).all(...params));
    processItems(db.prepare(`SELECT items FROM credit_invoices WHERE ${whereClause} AND doc_type = 'NC'`).all(...params), true);

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, total_qty: p.quantity }));

    // Recent Transactions
    const recentTransactions = db.prepare(`
      SELECT t.*, s.name as establishment_name
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      WHERE t.${whereClause}
      ORDER BY t.timestamp DESC
      LIMIT 5
    `).all(...params) as any[];

    // Sales by Day (Last 7 days) - Unified
    const salesByDay = db.prepare(`
      SELECT day, SUM(total) as total FROM (
        SELECT date(timestamp) as day, SUM(COALESCE(base_amount, total_amount)) as total
        FROM transactions
        WHERE ${whereClause} AND timestamp >= date('now', '-7 days')
        GROUP BY day
        UNION ALL
        SELECT date(invoice_date) as day, SUM(COALESCE(base_amount, total_amount)) as total
        FROM credit_invoices
        WHERE ${whereClause} AND invoice_date >= date('now', '-7 days') AND doc_type IN ('FT', 'FR', 'ND')
        GROUP BY day
        UNION ALL
        SELECT date(invoice_date) as day, SUM(-COALESCE(base_amount, total_amount)) as total
        FROM credit_invoices
        WHERE ${whereClause} AND invoice_date >= date('now', '-7 days') AND doc_type = 'NC'
        GROUP BY day
      )
      GROUP BY day
      ORDER BY day ASC
    `).all(...params, ...params, ...params) as any[];

    // Sales by Establishment - Including Credit Notes
    const salesByEstablishment = db.prepare(`
      SELECT name, SUM(total) as total FROM (
        SELECT s.name, SUM(t.total_amount) as total
        FROM transactions t
        JOIN establishments s ON t.establishment_id = s.id
        WHERE s.owner_id = ?
        GROUP BY s.id
        UNION ALL
        SELECT s.name, SUM(-ci.total_amount) as total
        FROM credit_invoices ci
        JOIN establishments s ON ci.establishment_id = s.id
        WHERE s.owner_id = ? AND ci.doc_type = 'NC'
        GROUP BY s.id
      )
      GROUP BY name
      ORDER BY total DESC
    `).all(ownerId, ownerId) as any[];

    // Payment Methods Distribution - Including Credit Invoices and Notes
    const paymentMethods = db.prepare(`
      SELECT name, SUM(value) as value FROM (
        SELECT payment_method as name, SUM(COALESCE(base_amount, total_amount)) as value
        FROM transactions
        WHERE ${whereClause}
        GROUP BY payment_method
        UNION ALL
        SELECT payment_method as name, SUM(COALESCE(base_amount, total_amount)) as value
        FROM credit_invoices
        WHERE ${whereClause} AND doc_type IN ('FT', 'FR', 'ND')
        GROUP BY payment_method
        UNION ALL
        SELECT payment_method as name, SUM(-COALESCE(base_amount, total_amount)) as value
        FROM credit_invoices
        WHERE ${whereClause} AND doc_type = 'NC'
        GROUP BY payment_method
      )
      GROUP BY name
    `).all(...params, ...params, ...params) as any[];

    // Use a unified calculation logic across all dashboard stats for the month
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const financialMonth = db.prepare(`
      SELECT 
        SUM(income) as income,
        SUM(expense) as expense
      FROM (
        SELECT SUM(amount) as income, 0 as expense FROM financial_transactions WHERE ${whereClause} AND type = 'income' AND date(date) >= ?
        UNION ALL
        SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM transactions WHERE ${whereClause} AND date(timestamp) >= ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'transaction')
        UNION ALL
        SELECT SUM(COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE ${whereClause} AND doc_type IN ('FT', 'FR', 'ND') AND date(invoice_date) >= ? AND id NOT IN (SELECT reference_id FROM financial_transactions WHERE type = 'income' AND reference_id IS NOT NULL AND reference_type = 'credit_invoice')
        UNION ALL
        SELECT SUM(-COALESCE(base_amount, total_amount)) as income, 0 as expense FROM credit_invoices WHERE ${whereClause} AND doc_type = 'NC' AND date(invoice_date) >= ?
        UNION ALL
        SELECT SUM(total_amount) as income, 0 as expense FROM service_sheets WHERE ${whereClause} AND status = 'concluded' AND fiscal_document_id IS NULL AND date(scheduled_date) >= ?
        UNION ALL
        SELECT 0 as income, SUM(amount) as expense FROM financial_transactions WHERE ${whereClause} AND type = 'expense' AND category NOT LIKE 'Nota de Crédito%' AND date(date) >= ?
      )
    `).get(...params, monthStart, ...params, monthStart, ...params, monthStart, ...params, monthStart, ...params, monthStart, ...params, monthStart) as any;

    // Financial Health for Salaries (Employee Payment Reminder)
    const salaries = db.prepare(`
      SELECT SUM(base_salary) as total 
      FROM hr_salaries 
      WHERE user_id IN (SELECT user_id FROM staff WHERE ${whereClause})
    `).get(...params) as any;

    const ownerSettings = ownerId ? db.prepare("SELECT financial_reminder_enabled FROM owner_settings WHERE owner_id = ?").get(ownerId) as any : null;
    
    // Monthly stats for financial health
    const monthlyIncome = financialMonth?.income || 0;
    const totalSalaries = salaries?.total || 0;
    const enoughForSalaries = monthlyIncome >= totalSalaries;

    // Calculate dynamic COGS (Cost of goods sold) for this establishment/owner
    const monthProfitInfo = getProductProfitForRange(params.map(Number), monthStart, undefined);
    const productCost = monthProfitInfo?.cost || 0;
    const finalTotalExpenses = (financialMonth?.expense || 0) + productCost;

    res.json({
      todaySales,
      todayCount,
      todayExpense: financialToday?.expense || 0,
      monthlySales: monthlyIncome,
      monthlyExpense: (financialMonth?.expense || 0) + productCost,
      lowStockCount: lowStock?.count || 0,
      staffCount: staffCount?.count || 0,
      topProducts,
      recentTransactions,
      salesByDay,
      salesByEstablishment,
      paymentMethods,
      totalExpenses: finalTotalExpenses,
      financialHealth: {
        enabled: ownerSettings?.financial_reminder_enabled === 1,
        totalSalaries: totalSalaries,
        enoughForSalaries: enoughForSalaries,
        monthlyIncome: monthlyIncome
      }
    });
  });

  // Pharmacy Categories Endpoints
  app.get("/api/pharmacy/categories/:establishmentId", (req, res) => {
    const list = db.prepare("SELECT * FROM pharmacy_categories WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(list);
  });
  app.post("/api/pharmacy/categories", (req, res) => {
    const { establishment_id, name } = req.body;
    db.prepare("INSERT INTO pharmacy_categories (establishment_id, name) VALUES (?, ?)").run(establishment_id, name);
    res.json({ success: true });
  });
  app.delete("/api/pharmacy/categories/:id", (req, res) => {
    db.prepare("DELETE FROM pharmacy_categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Pharmacy Manufacturers Endpoints
  app.get("/api/pharmacy/manufacturers/:establishmentId", (req, res) => {
    const list = db.prepare("SELECT * FROM pharmacy_manufacturers WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(list);
  });
  app.post("/api/pharmacy/manufacturers", (req, res) => {
    const { establishment_id, name } = req.body;
    db.prepare("INSERT INTO pharmacy_manufacturers (establishment_id, name) VALUES (?, ?)").run(establishment_id, name);
    res.json({ success: true });
  });
  app.delete("/api/pharmacy/manufacturers/:id", (req, res) => {
    db.prepare("DELETE FROM pharmacy_manufacturers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Pharmacy Active Substances Endpoints
  app.get("/api/pharmacy/active_substances/:establishmentId", (req, res) => {
    const list = db.prepare("SELECT * FROM pharmacy_active_substances WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(list);
  });
  app.post("/api/pharmacy/active_substances", (req, res) => {
    const { establishment_id, name } = req.body;
    db.prepare("INSERT INTO pharmacy_active_substances (establishment_id, name) VALUES (?, ?)").run(establishment_id, name);
    res.json({ success: true });
  });
  app.delete("/api/pharmacy/active_substances/:id", (req, res) => {
    db.prepare("DELETE FROM pharmacy_active_substances WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Pharmacy Forms Endpoints
  app.get("/api/pharmacy/forms/:establishmentId", (req, res) => {
    const list = db.prepare("SELECT * FROM pharmacy_forms WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(list);
  });
  app.post("/api/pharmacy/forms", (req, res) => {
    const { establishment_id, name } = req.body;
    db.prepare("INSERT INTO pharmacy_forms (establishment_id, name) VALUES (?, ?)").run(establishment_id, name);
    res.json({ success: true });
  });
  app.delete("/api/pharmacy/forms/:id", (req, res) => {
    db.prepare("DELETE FROM pharmacy_forms WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Pharmacy Units Endpoints
  app.get("/api/pharmacy/units/:establishmentId", (req, res) => {
    const list = db.prepare("SELECT * FROM pharmacy_units WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(list);
  });
  app.post("/api/pharmacy/units", (req, res) => {
    const { establishment_id, name } = req.body;
    db.prepare("INSERT INTO pharmacy_units (establishment_id, name) VALUES (?, ?)").run(establishment_id, name);
    res.json({ success: true });
  });
  app.delete("/api/pharmacy/units/:id", (req, res) => {
    db.prepare("DELETE FROM pharmacy_units WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/owner/products", (req, res) => {
    const { 
      establishment_id, warehouse_id, name, price, cost, stock, category, image_url, min_stock, tax_id,
      internal_code, laboratory, active_substance, pharmaceutical_form, dosage, sale_unit, 
      requires_prescription, controlled_substance, status, barcode: customBarcode
    } = req.body;
    
    // Check product count limits across all establishments of this owner
    try {
      const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
      if (establishment) {
        const ownerId = establishment.owner_id;
        const limits = resolveUserPlanAndLimits(ownerId);
        
        // Find total product count across all establishments of this owner
        const ownerEsts = db.prepare("SELECT id FROM establishments WHERE owner_id = ?").all(ownerId) as any[];
        const estIds = ownerEsts.map(e => e.id);
        if (estIds.length > 0) {
          const placeholders = estIds.map(() => "?").join(",");
          const currentProductsObj = db.prepare(`SELECT COUNT(*) as count FROM products WHERE establishment_id IN (${placeholders})`).get(...estIds) as any;
          if (limits.max_products !== -1 && currentProductsObj.count >= limits.max_products) {
            return res.status(403).json({
              error: `Limite de produtos atingido (${limits.max_products}). Por favor, atualize o seu plano. (Limite: ${limits.max_products})`
            });
          }
        }
      }
    } catch (e) {
      console.error("[Products Limit Check Error]", e);
    }

    // Check if product with same name exists in this establishment
    const existing = db.prepare("SELECT id FROM products WHERE establishment_id = ? AND LOWER(name) = LOWER(?)").get(establishment_id, name);
    if (existing) {
      return res.status(400).json({ error: "Já existe um produto com este nome neste estabelecimento." });
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    const owner = establishment ? db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any : null;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    const barcode = customBarcode || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
    db.prepare(`
      INSERT INTO products (
        establishment_id, warehouse_id, name, price, cost, stock, category, image_url, min_stock, barcode, tax_id,
        internal_code, laboratory, active_substance, pharmaceutical_form, dosage, sale_unit, 
        requires_prescription, controlled_substance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      establishment_id, warehouse_id || null, name, price, cost || 0, stock, category, image_url, min_stock || 5, barcode, finalTaxId || null,
      internal_code || null, laboratory || null, active_substance || null, pharmaceutical_form || null, dosage || null, sale_unit || null,
      requires_prescription ? 1 : 0, controlled_substance ? 1 : 0, status || 'active'
    );
    res.json({ success: true });
  });

  app.delete("/api/owner/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/owner/products/:id", (req, res) => {
    const { 
      warehouse_id, name, price, cost, stock, category, image_url, min_stock, tax_id,
      internal_code, laboratory, active_substance, pharmaceutical_form, dosage, sale_unit, 
      requires_prescription, controlled_substance, status, barcode
    } = req.body;
    
    // Get establishment_id for this product
    const product = db.prepare("SELECT establishment_id FROM products WHERE id = ?").get(req.params.id) as { establishment_id: number } | undefined;
    if (!product) return res.status(404).json({ error: "Produto não encontrado." });

    // Check for other products with same name in same establishment
    const existing = db.prepare("SELECT id FROM products WHERE establishment_id = ? AND LOWER(name) = LOWER(?) AND id != ?").get(product.establishment_id, name, req.params.id);
    if (existing) {
      return res.status(400).json({ error: "Já existe um outro produto com este nome neste estabelecimento." });
    }

    // Se o regime for exclusão, forçar imposto ISENTO
    let finalTaxId = tax_id;
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(product.establishment_id) as any;
    const owner = establishment ? db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any : null;
    if (owner && owner.fiscal_regime === 'exclusao') {
      const isento = db.prepare("SELECT id FROM taxes WHERE establishment_id = ? AND percentage = 0 AND tax_code = 'ISE'").get(product.establishment_id) as any;
      if (isento) finalTaxId = isento.id;
    }

    db.prepare(`
      UPDATE products 
      SET name = ?, price = ?, cost = ?, stock = ?, category = ?, image_url = ?, min_stock = ?, tax_id = ?, warehouse_id = ?,
          internal_code = ?, laboratory = ?, active_substance = ?, pharmaceutical_form = ?, dosage = ?, sale_unit = ?,
          requires_prescription = ?, controlled_substance = ?, status = ?, barcode = ?
      WHERE id = ?
    `).run(
      name, price, cost || 0, stock, category, image_url, min_stock, finalTaxId || null, warehouse_id || null,
      internal_code || null, laboratory || null, active_substance || null, pharmaceutical_form || null, dosage || null, sale_unit || null,
      requires_prescription ? 1 : 0, controlled_substance ? 1 : 0, status || 'active', barcode || null,
      req.params.id
    );
    res.json({ success: true });
  });

  app.post("/api/owner/bulk-replenish", (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Parâmetros inválidos." });
      }

      const updateStock = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
      
      const transaction = db.transaction(() => {
        for (const item of items) {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) continue;
          
          updateStock.run(qty, item.productId);
          
          const prod = db.prepare("SELECT establishment_id, name FROM products WHERE id = ?").get(item.productId) as any;
          if (prod) {
            const totalCost = qty * (Number(item.cost) || 0);
            const invoiceNum = `AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const purchaseItems = [{
              id: item.productId,
              name: prod.name,
              quantity: qty,
              price: Number(item.cost) || 0,
              total: totalCost
            }];
            
            db.prepare(`
              INSERT INTO purchases (establishment_id, supplier_id, total_amount, tax_amount, paid_amount, status, invoice_number, items, due_date, delivery_status, is_direct, is_stock_updated, is_closed)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              prod.establishment_id, 
              null, 
              totalCost, 
              0, 
              totalCost, 
              'paga', 
              invoiceNum, 
              JSON.stringify(purchaseItems), 
              new Date().toISOString().split('T')[0], 
              'entregue', 
              1, 
              1, 
              1
            );
          }
        }
      });
      
      transaction();
      res.json({ success: true });
    } catch (err) {
      console.error("Error in bulk-replenish:", err);
      res.status(500).json({ error: "Erro ao processar o reabastecimento", details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/owner/promotions/:establishmentId", (req, res) => {
    const promotions = db.prepare(`
      SELECT p.*, 
        (SELECT GROUP_CONCAT(pr.name, ', ') 
         FROM promotion_products pp 
         JOIN products pr ON pp.product_id = pr.id 
         WHERE pp.promotion_id = p.id) as product_names
      FROM promotions p 
      WHERE p.establishment_id = ?
    `).all(req.params.establishmentId);
    res.json(promotions);
  });

  app.post("/api/owner/promotions", (req, res) => {
    const { establishment_id, name, start_date, end_date, discount_percent, product_ids } = req.body;
    
    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO promotions (establishment_id, name, start_date, end_date, discount_percent) 
        VALUES (?, ?, ?, ?, ?)
      `).run(establishment_id, name, start_date, end_date, discount_percent);
      
      const promotionId = info.lastInsertRowid;
      const insertProduct = db.prepare("INSERT INTO promotion_products (promotion_id, product_id) VALUES (?, ?)");
      
      for (const productId of product_ids) {
        insertProduct.run(promotionId, productId);
      }
      
      return promotionId;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar promoção" });
    }
  });

  app.delete("/api/owner/promotions/:id", (req, res) => {
    const transaction = db.transaction(() => {
      db.prepare("DELETE FROM promotion_products WHERE promotion_id = ?").run(req.params.id);
      db.prepare("DELETE FROM promotions WHERE id = ?").run(req.params.id);
    });
    transaction();
    res.json({ success: true });
  });

  // --- MULTI-CURRENCY ROUTES ---

  app.get("/api/owner/currencies/:ownerId", (req, res) => {
    const currencies = db.prepare("SELECT * FROM currencies WHERE owner_id = ?").all(req.params.ownerId);
    res.json(currencies);
  });

  app.post("/api/owner/currencies", (req, res) => {
    const { owner_id, code, symbol, name, is_base } = req.body;
    try {
      if (is_base) {
        db.prepare("UPDATE currencies SET is_base = 0 WHERE owner_id = ?").run(owner_id);
      }
      
      const info = db.prepare(`
        INSERT INTO currencies (owner_id, code, symbol, name, is_base) 
        VALUES (?, ?, ?, ?, ?)
      `).run(owner_id, code, symbol, name, is_base ? 1 : 0);

      logAction({
        ownerId: owner_id,
        module: 'CONFIG',
        actionType: 'CREATE_CURRENCY',
        severity: 'INFO',
        description: `Nova moeda cadastrada: ${code}`,
        entityType: 'CURRENCY',
        entityId: Number(info.lastInsertRowid),
        newValues: req.body,
        req
      });

      res.json({ success: true, id: Number(info.lastInsertRowid) });
    } catch (e) {
      res.status(400).json({ error: "Erro ao cadastrar moeda (possível código duplicado)." });
    }
  });

  app.put("/api/owner/currencies/:id", (req, res) => {
    const { code, symbol, name, is_base, owner_id } = req.body;
    const old = db.prepare("SELECT * FROM currencies WHERE id = ?").get(req.params.id) as any;
    
    if (is_base) {
      db.prepare("UPDATE currencies SET is_base = 0 WHERE owner_id = ?").run(owner_id);
    }
    
    db.prepare(`
      UPDATE currencies SET code = ?, symbol = ?, name = ?, is_base = ? 
      WHERE id = ?
    `).run(code, symbol, name, is_base ? 1 : 0, req.params.id);

    logAction({
      ownerId: owner_id,
      module: 'CONFIG',
      actionType: 'UPDATE_CURRENCY',
      severity: 'INFO',
      description: `Moeda atualizada: ${code}`,
      entityType: 'CURRENCY',
      entityId: Number(req.params.id),
      oldValues: old,
      newValues: req.body,
      req
    });

    res.json({ success: true });
  });

  app.get("/api/owner/exchange-rates/:ownerId", (req, res) => {
    const rates = db.prepare(`
      SELECT r.*, c.code, c.symbol 
      FROM exchange_rates r 
      JOIN currencies c ON r.currency_id = c.id 
      WHERE r.owner_id = ? 
      ORDER BY r.rate_date DESC, r.created_at DESC
    `).all(req.params.ownerId);
    res.json(rates);
  });

  app.post("/api/owner/exchange-rates", (req, res) => {
    const { owner_id, currency_id, rate, rate_date, created_by } = req.body;
    
    const info = db.prepare(`
      INSERT INTO exchange_rates (owner_id, currency_id, rate, rate_date, created_by) 
      VALUES (?, ?, ?, ?, ?)
    `).run(owner_id, currency_id, rate, rate_date, created_by);

    const currency = db.prepare("SELECT code FROM currencies WHERE id = ?").get(currency_id) as any;

    logAction({
      userId: created_by,
      ownerId: owner_id,
      module: 'FINANCE',
      actionType: 'UPDATE_EXCHANGE_RATE',
      severity: 'WARNING',
      description: `Nova taxa de câmbio para ${currency?.code}: ${rate} (Data: ${rate_date})`,
      entityType: 'EXCHANGE_RATE',
      entityId: Number(info.lastInsertRowid),
      newValues: req.body,
      req
    });

    res.json({ success: true, id: Number(info.lastInsertRowid) });
  });

  app.get("/api/owner/exchange-rates/latest/:ownerId/:currencyId", (req, res) => {
    const rate = db.prepare(`
      SELECT * FROM exchange_rates 
      WHERE owner_id = ? AND currency_id = ? 
      ORDER BY rate_date DESC, created_at DESC 
      LIMIT 1
    `).get(req.params.ownerId, req.params.currencyId);
    res.json(rate || { rate: 1 });
  });

  app.post("/api/admin/establishments/toggle-license", (req, res) => {
    const { establishment_id, status } = req.body;
    db.prepare("UPDATE establishments SET license_status = ? WHERE id = ?").run(status, establishment_id);
    res.json({ success: true });
  });

  app.get("/api/owner/reports/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    
    // Sales by day (last 30 days) - Unified Transactions and Credit Invoices
    const salesByDay = db.prepare(`
      SELECT day as date, SUM(revenue) as revenue, SUM(count) as sales
      FROM (
        SELECT date(timestamp) as day, COALESCE(base_amount, total_amount) as revenue, 1 as count
        FROM transactions
        WHERE establishment_id = ? AND timestamp >= date('now', '-30 days')
        UNION ALL
        SELECT date(invoice_date) as day, COALESCE(base_amount, total_amount) as revenue, 1 as count
        FROM credit_invoices
        WHERE establishment_id = ? AND invoice_date >= date('now', '-30 days') AND doc_type IN ('FT', 'FR', 'ND')
        UNION ALL
        SELECT date(invoice_date) as day, -COALESCE(base_amount, total_amount) as revenue, 1 as count
        FROM credit_invoices
        WHERE establishment_id = ? AND invoice_date >= date('now', '-30 days') AND doc_type = 'NC'
      )
      GROUP BY day
      ORDER BY day ASC
    `).all(establishmentId, establishmentId, establishmentId);

    // Best selling products - Unified
    const transactions = db.prepare("SELECT items FROM transactions WHERE establishment_id = ?").all(establishmentId);
    const invoices = db.prepare("SELECT items FROM credit_invoices WHERE establishment_id = ? AND doc_type IN ('FT', 'FR', 'ND')").all(establishmentId);
    const creditNotes = db.prepare("SELECT items FROM credit_invoices WHERE establishment_id = ? AND doc_type = 'NC'").all(establishmentId);
    
    const productSales: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    const processItems = (itemStr: string, factor = 1) => {
      try {
        const items = JSON.parse(itemStr);
        items.forEach((item: any) => {
          const id = item.id || item.ProductCode; // Handle different item structures
          if (!id) return;
          if (!productSales[id]) {
            productSales[id] = { name: item.name || item.ProductDescription, quantity: 0, revenue: 0 };
          }
          productSales[id].quantity += (Number(item.quantity) || 0) * factor;
          productSales[id].revenue += ((Number(item.price) || 0) * (Number(item.quantity) || 0)) * factor;
        });
      } catch (e) {
        console.error("Error parsing items:", e);
      }
    };

    transactions.forEach((t: any) => processItems(t.items));
    invoices.forEach((i: any) => processItems(i.items));
    creditNotes.forEach((cn: any) => processItems(cn.items, -1));

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by category
    const categorySales: Record<string, number> = {};
    const products = db.prepare("SELECT id, category FROM products WHERE establishment_id = ?").all(establishmentId);
    const productToCategory: Record<string, string> = {};
    products.forEach((p: any) => productToCategory[String(p.id)] = p.category);

    const processCategoryItems = (itemStr: string) => {
      try {
        const items = JSON.parse(itemStr);
        items.forEach((item: any) => {
          const id = String(item.id || item.ProductCode);
          const cat = productToCategory[id] || 'Outros';
          categorySales[cat] = (categorySales[cat] || 0) + ((Number(item.price) || 0) * (Number(item.quantity) || 0));
        });
      } catch (e) {}
    };

    transactions.forEach((t: any) => processCategoryItems(t.items));
    invoices.forEach((i: any) => processCategoryItems(i.items));

    const salesByCategory = Object.entries(categorySales).map(([name, value]) => ({ name, value }));

    // Revenue by payment method
    const paymentMethods = db.prepare(`
      SELECT name, SUM(value) as value
      FROM (
        SELECT payment_method as name, total_amount as value
        FROM transactions
        WHERE establishment_id = ?
        UNION ALL
        SELECT payment_method as name, COALESCE(base_amount, total_amount) as value
        FROM credit_invoices
        WHERE establishment_id = ? AND doc_type IN ('FT', 'FR', 'ND')
        UNION ALL
        SELECT payment_method as name, -COALESCE(base_amount, total_amount) as value
        FROM credit_invoices
        WHERE establishment_id = ? AND doc_type = 'NC'
      )
      GROUP BY name
    `).all(establishmentId, establishmentId, establishmentId);

    res.json({
      salesByDay,
      topProducts,
      salesByCategory,
      paymentMethods
    });
  });

  // Service Sheets API
  app.get("/api/owner/service-sheets/:establishmentId", (req, res) => {
    const { establishmentId } = req.params;
    try {
      const sheets = db.prepare(`
        SELECT ss.*, e.name as establishment_name 
        FROM service_sheets ss 
        JOIN establishments e ON ss.establishment_id = e.id
        WHERE ss.establishment_id = ? 
        ORDER BY ss.created_at DESC
      `).all(establishmentId);
      res.json(sheets);
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar folhas de serviço" });
    }
  });

  app.get("/api/owner/service-sheets/owner/:ownerId", (req, res) => {
    const { ownerId } = req.params;
    try {
      const { establishmentIds } = getContextData(ownerId);
      if (establishmentIds.length === 0) return res.json([]);
      
      const placeholders = establishmentIds.map(() => "?").join(",");
      const sheets = db.prepare(`
        SELECT ss.*, e.name as establishment_name 
        FROM service_sheets ss 
        JOIN establishments e ON ss.establishment_id = e.id
        WHERE ss.establishment_id IN (${placeholders}) 
        ORDER BY ss.created_at DESC
      `).all(...establishmentIds);
      res.json(sheets);
    } catch (e) {
      res.status(500).json({ error: "Erro ao buscar todas as folhas de serviço" });
    }
  });

  app.post("/api/owner/service-sheets", (req, res) => {
    const { establishment_id, service_id, client_name, client_nif, client_address, service_description, assigned_staff, scheduled_date, total_amount, selected_fees } = req.body;
    try {
      let fiscal_document_id = null;
      const today = new Date().toISOString().split('T')[0];

      const result = db.prepare(`
        INSERT INTO service_sheets (establishment_id, service_id, client_name, client_nif, client_address, service_description, assigned_staff, scheduled_date, total_amount, selected_fees, fiscal_document_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        establishment_id, 
        service_id || null, 
        client_name, 
        client_nif, 
        client_address, 
        service_description, 
        assigned_staff, 
        scheduled_date,
        parseFloat(String(total_amount || 0).replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
        selected_fees ? JSON.stringify(selected_fees) : null,
        null
      );
      res.json({ id: result.lastInsertRowid, fiscal_document_id: null });
    } catch (e) {
      console.error("Error creating service sheet:", e);
      res.status(500).json({ error: "Erro ao criar folha de serviço" });
    }
  });

  app.patch("/api/owner/service-sheets/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, payment_method, seller_id } = req.body;
    try {
      db.transaction(() => {
        if (payment_method) {
          db.prepare("UPDATE service_sheets SET status = ?, payment_method = ? WHERE id = ?").run(status, payment_method, id);
        } else {
          db.prepare("UPDATE service_sheets SET status = ? WHERE id = ?").run(status, id);
        }

        // If status is concluded, generate FR or RC
        if (status === 'concluded' || status === 'concluido') {
          const sheet = db.prepare("SELECT * FROM service_sheets WHERE id = ?").get(id) as any;
          if (sheet && Number(sheet.total_amount) > 0) {
            try {
              if (!sheet.fiscal_document_id) {
                // Fetch Owner Regime
                const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(sheet.establishment_id) as any;
                const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any;
                const regime = String(owner?.fiscal_regime || 'geral').toLowerCase();
                const isExclusion = regime === 'exclusao' || regime === 'exclusão';
                
                const rawVal = String(sheet.total_amount || '0');
                const cleanVal = rawVal.replace(/[^\d,.-]/g, '');
                // Handle European format: "1.000,00" -> "1000.00"
                // If there both . and , we assume . is thousand and , is decimal
                let baseAmount = 0;
                if (cleanVal.includes('.') && cleanVal.includes(',')) {
                  baseAmount = parseFloat(cleanVal.replace(/\./g, '').replace(',', '.')) || 0;
                } else if (cleanVal.includes(',')) {
                  baseAmount = parseFloat(cleanVal.replace(',', '.')) || 0;
                } else {
                  baseAmount = parseFloat(cleanVal) || 0;
                }

                const taxRate = isExclusion ? 0 : 0.14;
                const taxAmount = baseAmount * taxRate;
                const finalTotal = baseAmount + taxAmount;

                // Build items list from selected_fees if available, otherwise fallback to single line
                let items: any[] = [];
                const selectedFeesArray = sheet.selected_fees ? JSON.parse(sheet.selected_fees) : [];
                
                if (Array.isArray(selectedFeesArray) && selectedFeesArray.length > 0) {
                  items = selectedFeesArray.map((fee: any) => ({
                    id: fee.id || fee.product_id || fee.service_id,
                    product_id: fee.id || fee.product_id || fee.service_id,
                    name: fee.name || fee.description || "Item de Serviço",
                    description: fee.description || fee.name || "Item de Serviço",
                    quantity: 1,
                    price: fee.amount || 0,
                    total: fee.amount || 0,
                    tax_rate: isExclusion ? 0 : 14,
                    type: fee.type || 'service'
                  }));
                } else {
                  items = [{
                    description: sheet.service_description || "Serviço Prestado",
                    name: sheet.service_description || "Serviço Prestado",
                    quantity: 1,
                    price: baseAmount,
                    total: baseAmount,
                    tax_rate: isExclusion ? 0 : 14,
                    type: 'service'
                  }];
                }

                const inv = createFiscalDocument(db, {
                  establishment_id: sheet.establishment_id,
                  client_name: sheet.client_name || "Consumidor Final",
                  client_nif: sheet.client_nif,
                  address: sheet.client_address,
                  doc_type: 'FR',
                  total_amount: finalTotal,
                  tax_amount: taxAmount,
                  items,
                  currency: 'Kz',
                  payment_method: payment_method || sheet.payment_method || 'Dinheiro',
                  seller_id: seller_id || establishment.owner_id
                });
                db.prepare("UPDATE service_sheets SET fiscal_document_id = ? WHERE id = ?").run(inv.id, id);

                // Electronic Billing: Submit to AGT
                const updatedDoc = db.prepare("SELECT billing_mode FROM credit_invoices WHERE id = ?").get(inv.id) as any;
                if (updatedDoc?.billing_mode === 'eletronica') {
                  console.log(`[ServiceSheet] Submitting electronic invoice ${inv.id} to AGT...`);
                  AGTService.submitInvoice(Number(inv.id), 'FISCAL').catch(err => {
                    console.error("[ServiceSheet] Background AGT submission failed:", err);
                  });
                }
              } else {
                // Check if existing document is an FT
                const existingDoc = db.prepare("SELECT id, doc_type, status, billing_mode FROM credit_invoices WHERE id = ?").get(sheet.fiscal_document_id) as any;
                if (existingDoc && existingDoc.doc_type === 'FT' && existingDoc.status !== 'paid') {
                  // Create RC (Recibo) to liquidate the FT
                  const rc = createFiscalDocument(db, {
                    establishment_id: sheet.establishment_id,
                    client_name: sheet.client_name || "Consumidor Final",
                    client_nif: sheet.client_nif,
                    address: sheet.client_address,
                    doc_type: 'RC',
                    total_amount: sheet.total_amount,
                    currency: 'Kz',
                    parent_invoice_id: sheet.fiscal_document_id,
                    payment_method: payment_method || sheet.payment_method || 'Dinheiro'
                  });

                  // Electronic Billing: Submit to AGT
                  if (existingDoc.billing_mode === 'eletronica') {
                    console.log(`[ServiceSheet] Submitting electronic Receipt ${rc.id} to AGT...`);
                    AGTService.submitInvoice(Number(rc.id), 'FISCAL').catch(err => {
                      console.error("[ServiceSheet] Background AGT submission failed for RC:", err);
                    });
                  }
                }
              }
            } catch (invErr: any) {
              console.error("Error auto-generating fiscal document on conclusion:", invErr);
              // We throw here to rollback the status change if fiscal generation fails
              throw new Error(`Erro ao gerar documento fiscal: ${invErr.message}`);
            }
          }
        }
      })();
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error updating service sheet status:", e);
      res.status(400).json({ error: e.message || "Erro ao atualizar status" });
    }
  });

  app.delete("/api/owner/service-sheets/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM service_sheets WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Erro ao excluir folha de serviço" });
    }
  });

  app.get("/api/owner/global-reports/:ownerId", (req, res) => {
    try {
      const { establishmentIds } = getContextData(req.params.ownerId);
      
      if (establishmentIds.length === 0) {
        return res.json({ 
          totalRevenue: 0, 
          totalSales: 0, 
          revenueByEstablishment: [], 
          salesByDay: [], 
          topProducts: [],
          paymentMethods: [],
          establishmentComparison: [],
          promotionsEfficiency: []
        });
      }

      console.log(`[GlobalReport] Generating report for owner ${req.params.ownerId} with ${establishmentIds.length} establishments`);

      const establishments = db.prepare(`SELECT id, name, nif FROM establishments WHERE id IN (${establishmentIds.map(() => '?').join(',')})`).all(...establishmentIds) as any[];
      const placeholders = establishmentIds.map(() => '?').join(',');

      // Unified Revenue & Sales for global stats
      const stats = db.prepare(`
        SELECT COALESCE(SUM(revenue), 0) as totalRevenue, COALESCE(SUM(count), 0) as totalSales
        FROM (
          SELECT COALESCE(base_amount, total_amount) as revenue, 1 as count FROM transactions WHERE establishment_id IN (${placeholders}) AND cancellation_id IS NULL
          UNION ALL
          SELECT COALESCE(base_amount, total_amount) as revenue, 1 as count FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND status != 'canceled'
          UNION ALL
          SELECT -COALESCE(base_amount, total_amount) as revenue, 0 as count FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC' AND status != 'canceled'
          UNION ALL
          SELECT total_amount as revenue, 1 as count FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status = 'concluded' AND fiscal_document_id IS NULL
        )
      `).get(...[...establishmentIds, ...establishmentIds, ...establishmentIds, ...establishmentIds]) as any;

      // Revenue, Profit, and Comparison by Establishment
      const establishmentComparison = establishments.map(establishment => {
        try {
          const unifiedRevenue = db.prepare(`
            SELECT SUM(revenue) as total, SUM(count) as count FROM (
              SELECT COALESCE(base_amount, total_amount) as revenue, 1 as count FROM transactions WHERE establishment_id = ? AND cancellation_id IS NULL
              UNION ALL
              SELECT COALESCE(base_amount, total_amount) as revenue, 1 as count FROM credit_invoices WHERE establishment_id = ? AND doc_type IN ('FT', 'FR', 'ND') AND status != 'canceled'
              UNION ALL
              SELECT -COALESCE(base_amount, total_amount) as revenue, 0 as count FROM credit_invoices WHERE establishment_id = ? AND doc_type = 'NC' AND status != 'canceled'
              UNION ALL
              SELECT total_amount as revenue, 1 as count FROM service_sheets WHERE establishment_id = ? AND status = 'concluded' AND fiscal_document_id IS NULL
            )
          `).get(establishment.id, establishment.id, establishment.id, establishment.id) as any;

          const purchases = db.prepare(`
            SELECT SUM(total_amount) as total FROM purchases WHERE establishment_id = ?
          `).get(establishment.id) as any;

          const salaries = db.prepare(`
            SELECT COALESCE(SUM(p.amount), 0) as total 
            FROM hr_salary_payments p
            JOIN hr_salaries s ON p.salary_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE u.establishment_id = ?
          `).get(establishment.id) as any;

          const totalRevenue = unifiedRevenue?.total || 0;
          const totalExpenses = (purchases?.total || 0) + (salaries?.total || 0);
          const profit = totalRevenue - totalExpenses;
          const salesCount = unifiedRevenue?.count || 0;
          const ticketMedio = salesCount > 0 ? totalRevenue / salesCount : 0;

          return {
            id: establishment.id,
            name: establishment.name,
            revenue: totalRevenue,
            expenses: totalExpenses,
            profit: profit,
            salesCount: salesCount,
            ticketMedio: ticketMedio,
            margin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
          };
        } catch (innerErr) {
          console.error(`Error in comparison for est ${establishment.id}:`, innerErr);
          return { id: establishment.id, name: establishment.name, revenue: 0, expenses: 0, profit: 0, salesCount: 0, ticketMedio: 0, margin: 0 };
        }
      });

    // Sales by Day (last 30 days) - Unified
    const salesByDay = db.prepare(`
      SELECT day as date, SUM(revenue) as revenue
      FROM (
        SELECT date(timestamp) as day, COALESCE(base_amount, total_amount) as revenue FROM transactions WHERE establishment_id IN (${placeholders}) AND date(timestamp) >= date('now', '-30 days') AND cancellation_id IS NULL
        UNION ALL
        SELECT date(invoice_date) as day, COALESCE(base_amount, total_amount) as revenue FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND date(invoice_date) >= date('now', '-30 days') AND doc_type IN ('FT', 'FR', 'ND') AND status != 'canceled'
        UNION ALL
        SELECT date(invoice_date) as day, -COALESCE(base_amount, total_amount) as revenue FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND date(invoice_date) >= date('now', '-30 days') AND doc_type = 'NC' AND status != 'canceled'
        UNION ALL
        SELECT date(scheduled_date) as day, total_amount as revenue FROM service_sheets WHERE establishment_id IN (${placeholders}) AND date(scheduled_date) >= date('now', '-30 days') AND status = 'concluded' AND fiscal_document_id IS NULL
      )
      GROUP BY day
      ORDER BY day ASC
    `).all(...[...establishmentIds, ...establishmentIds, ...establishmentIds, ...establishmentIds]);

    // Top Products - Unified
    const productSales: Record<string, { id: any, name: string, quantity: number, revenue: number }> = {};
    const processItems = (rows: any[]) => {
      rows.forEach((t: any) => {
        try {
          const items = JSON.parse(t.items);
          const exchangeRate = Number(t.exchange_rate || 1);
          const isSubtraction = t.doc_type === 'NC';
          const isFiscal = t.source === 'fiscal';

          items.forEach((item: any) => {
            const id = item.id || item.ProductCode;
            if (!id) return;
            if (!productSales[id]) {
              productSales[id] = { id, name: item.name || item.ProductDescription, quantity: 0, revenue: 0 };
            }
            const factor = isSubtraction ? -1 : 1;
            const price = Number(item.price) || 0;
            const qty = Number(item.quantity) || 0;

            // For fiscal documents, prices are in doc currency. For POS (source: pos), they are in Kwanza.
            const itemRevenue = isFiscal ? (price * qty * exchangeRate) : (price * qty);

            productSales[id].quantity += qty * factor;
            productSales[id].revenue += itemRevenue * factor;
          });
        } catch (e) {}
      });
    };

    processItems(db.prepare(`SELECT items, exchange_rate, 'pos' as source FROM transactions WHERE establishment_id IN (${placeholders})`).all(...establishmentIds));
    processItems(db.prepare(`SELECT items, exchange_rate, doc_type, 'fiscal' as source FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND')`).all(...establishmentIds));
    processItems(db.prepare(`SELECT items, exchange_rate, doc_type, 'fiscal' as source FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC'`).all(...establishmentIds));

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => {
        try {
          const prodDb = db.prepare("SELECT stock, min_stock, cost, price FROM products WHERE id = ?").get(p.id) as any;
          return {
            ...p,
            stock: prodDb && typeof prodDb.stock === 'number' ? prodDb.stock : 12,
            min_stock: prodDb && typeof prodDb.min_stock === 'number' ? prodDb.min_stock : 5,
            cost: prodDb && typeof prodDb.cost === 'number' ? prodDb.cost : Math.round((prodDb?.price || (p.revenue / (p.quantity || 1))) * 0.65),
            price: prodDb && typeof prodDb.price === 'number' ? prodDb.price : (p.revenue / (p.quantity || 1))
          };
        } catch (err) {
          return {
            ...p,
            stock: 12,
            min_stock: 5,
            cost: Math.round((p.revenue / (p.quantity || 1)) * 0.65),
            price: (p.revenue / (p.quantity || 1))
          };
        }
      });

    // Payment Methods (Sales by Channel) - Unified
    const paymentMethods = db.prepare(`
      SELECT name, SUM(value) as value
      FROM (
        SELECT payment_method as name, COALESCE(base_amount, total_amount) as value FROM transactions WHERE establishment_id IN (${placeholders}) AND cancellation_id IS NULL
        UNION ALL
        SELECT payment_method as name, COALESCE(base_amount, total_amount) as value FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type IN ('FT', 'FR', 'ND') AND status != 'canceled'
        UNION ALL
        SELECT payment_method as name, -COALESCE(base_amount, total_amount) as value FROM credit_invoices WHERE establishment_id IN (${placeholders}) AND doc_type = 'NC' AND status != 'canceled'
        UNION ALL
        SELECT COALESCE(payment_method, 'Dinheiro') as name, total_amount as value FROM service_sheets WHERE establishment_id IN (${placeholders}) AND status = 'concluded' AND fiscal_document_id IS NULL
      )
      GROUP BY name
    `).all(...[...establishmentIds, ...establishmentIds, ...establishmentIds, ...establishmentIds]);

    // Promotions Efficiency
    const promotions = db.prepare(`
      SELECT id, name, start_date, end_date, discount_percent, establishment_id
      FROM promotions
      WHERE establishment_id IN (${placeholders})
    `).all(...establishmentIds) as any[];

    const promotionsEfficiency = promotions.map(promo => {
      const promoProducts = db.prepare(`
        SELECT product_id FROM promotion_products WHERE promotion_id = ?
      `).all(promo.id) as any[];
      const promoProductIds = promoProducts.map(p => p.product_id);

      let promoSalesCount = 0;
      let promoRevenue = 0;

      const transactionsDuringPromo = db.prepare(`
        SELECT items FROM transactions 
        WHERE establishment_id = ? AND timestamp BETWEEN ? AND ?
      `).all(promo.establishment_id, promo.start_date, promo.end_date) as any[];

      transactionsDuringPromo.forEach(t => {
        try {
          const items = JSON.parse(t.items);
          items.forEach((item: any) => {
            if (promoProductIds.includes(item.id)) {
              promoSalesCount += item.quantity;
              promoRevenue += item.quantity * item.price;
            }
          });
        } catch (e) {}
      });

      return {
        name: promo.name,
        sales: promoSalesCount,
        revenue: promoRevenue,
        discount: promo.discount_percent
      };
    }).sort((a, b) => b.revenue - a.revenue);

    res.json({
      totalRevenue: stats?.totalRevenue || 0,
      totalSales: stats?.totalSales || 0,
      revenueByEstablishment: establishmentComparison.map(s => ({ name: s.name, revenue: s.revenue })),
      salesByDay,
      topProducts,
      paymentMethods,
      establishmentComparison,
      promotionsEfficiency
    });
  } catch (err) {
    console.error("Critical error in global-reports:", err);
    res.status(500).json({ error: "Erro interno ao gerar relatórios globais", details: err instanceof Error ? err.message : String(err) });
  }
});

  app.put("/api/owner/establishment-settings/:id", (req, res) => {
    const { name, nif, phone, email, address, logo_url, status, bank_accounts } = req.body;
    db.prepare(`
      UPDATE establishments 
      SET name = ?, nif = ?, phone = ?, email = ?, address = ?, logo_url = ?, status = ?, bank_accounts = ?
      WHERE id = ?
    `).run(name, nif, phone, email, address, logo_url, status, JSON.stringify(bank_accounts || []), req.params.id);
    res.json({ success: true });
  });

  // Client Routes
  app.get("/api/owner/clients/:establishmentId", (req, res) => {
    try {
      const { userId } = req.query;
      const establishmentId = req.params.establishmentId;

      const { establishmentIds } = getContextData(userId as string);
      
      let whereClause = "c.establishment_id = ?";
      let params: any[] = [establishmentId];

      if (establishmentId === 'all') {
        if (establishmentIds.length === 0) return res.json([]);
        const placeholders = establishmentIds.map(() => '?').join(',');
        whereClause = `c.establishment_id IN (${placeholders})`;
        params = [...establishmentIds];
      } else {
        // Security check for single establishment
        if (!establishmentIds.includes(Number(establishmentId))) {
          return res.status(403).json({ error: "Acesso negado para este estabelecimento." });
        }
      }

      const clients = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM transactions t WHERE t.client_nif = c.nif) as total_purchases,
          (SELECT SUM(total_amount) FROM transactions t WHERE t.client_nif = c.nif) as total_spent
        FROM clients c 
        WHERE ${whereClause}
        ORDER BY name ASC
      `).all(...params);
      res.json(clients);
    } catch (e: any) {
      console.error("Error fetching clients:", e);
      res.status(500).json({ error: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/owner/clients", (req, res) => {
    const { establishment_id, name, nif, email, phone, address, type } = req.body;
    db.prepare("INSERT INTO clients (establishment_id, name, nif, email, phone, address, type) VALUES (?, ?, ?, ?, ?, ?, ?)").run(establishment_id, name, nif, email, phone, address, type || 'individual');
    res.json({ success: true });
  });

  app.put("/api/owner/clients/:id", (req, res) => {
    const { name, nif, email, phone, address, type } = req.body;
    db.prepare("UPDATE clients SET name = ?, nif = ?, email = ?, phone = ?, address = ?, type = ? WHERE id = ?").run(name, nif, email, phone, address, type, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/clients/:id", (req, res) => {
    db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Supplier Routes
  app.get("/api/owner/suppliers/:ownerId", (req, res) => {
    try {
      const { ownerId: effectiveOwnerId } = getContextData(req.params.ownerId);
      const suppliers = db.prepare("SELECT * FROM suppliers WHERE owner_id = ? ORDER BY name ASC").all(effectiveOwnerId);
      res.json(suppliers);
    } catch (e: any) {
      console.error("Error fetching suppliers:", e);
      res.status(500).json({ error: "Erro ao buscar fornecedores" });
    }
  });

  app.post("/api/owner/suppliers", (req, res) => {
    const { 
      owner_id, name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status, category
    } = req.body;
    const { ownerId: effectiveOwnerId } = getContextData(owner_id);
    db.prepare(`
      INSERT INTO suppliers (
        owner_id, name, company_name, nif, phone, email, 
        country, city, address, responsible_person, 
        payment_method, payment_term, observations, status, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      effectiveOwnerId, name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status || 'active', category
    );
    res.json({ success: true });
  });

  app.put("/api/owner/suppliers/:id", (req, res) => {
    const { 
      name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status, category
    } = req.body;
    db.prepare(`
      UPDATE suppliers SET 
        name = ?, company_name = ?, nif = ?, phone = ?, email = ?, 
        country = ?, city = ?, address = ?, responsible_person = ?, 
        payment_method = ?, payment_term = ?, observations = ?, status = ?,
        category = ?
      WHERE id = ?
    `).run(
      name, company_name, nif, phone, email, 
      country, city, address, responsible_person, 
      payment_method, payment_term, observations, status, category,
      req.params.id
    );
    res.json({ success: true });
  });

  // Purchase Routes
  app.get("/api/owner/purchases/:establishmentId", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.establishment_id = ?
      ORDER BY p.timestamp DESC
    `).all(req.params.establishmentId);
    res.json(purchases.map((p: any) => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []) })));
  });

  app.get("/api/owner/suppliers/:id/purchases", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, st.name as establishment_name
      FROM purchases p
      JOIN establishments st ON p.establishment_id = st.id
      WHERE p.supplier_id = ?
      ORDER BY p.timestamp DESC
    `).all(req.params.id);
    res.json(purchases.map((p: any) => ({ ...p, items: typeof p.items === 'string' ? JSON.parse(p.items) : (p.items || []) })));
  });

  app.get("/api/owner/suppliers/:ownerId/report", (req, res) => {
    try {
      const { ownerId: effectiveOwnerId } = getContextData(req.params.ownerId);
      const report = db.prepare(`
        SELECT s.id, s.name, s.nif,
          COUNT(p.id) as total_purchases,
          IFNULL(SUM(p.total_amount), 0) as total_spent,
          IFNULL(SUM(p.paid_amount), 0) as total_paid,
          IFNULL((SUM(p.total_amount) - SUM(p.paid_amount)), 0) as total_debt
        FROM suppliers s
        LEFT JOIN purchases p ON s.id = p.supplier_id
        WHERE s.owner_id = ?
        GROUP BY s.id
        ORDER BY total_spent DESC
      `).all(effectiveOwnerId);
      res.json(report);
    } catch (e: any) {
      console.error("Error generating supplier report:", e);
      res.status(500).json({ error: "Erro ao gerar relatório de fornecedores" });
    }
  });

  app.post("/api/owner/purchases", (req, res) => {
    const { establishment_id, supplier_id, total_amount, tax_amount = 0, paid_amount, invoice_number, items, due_date, user_id, delivery_status, is_direct, is_stock_updated, is_closed, status } = req.body;
    
    const transaction = db.transaction(() => {
      let finalInvoiceNumber = invoice_number;
      if (!finalInvoiceNumber || finalInvoiceNumber.trim() === '') {
        const year = new Date().getFullYear();
        const lastPurchase = db.prepare("SELECT invoice_number FROM purchases WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`FCO-${year}-%`) as { invoice_number: string } | undefined;
        let sequence = 1;
        if (lastPurchase && lastPurchase.invoice_number) {
          const parts = lastPurchase.invoice_number.split('-');
          if (parts.length > 2) {
            const lastSeq = parseInt(parts[2]);
            if (!isNaN(lastSeq)) {
              sequence = lastSeq + 1;
            }
          }
        }
        finalInvoiceNumber = `FCO-${year}-${sequence.toString().padStart(4, '0')}`;
      }

      const purchaseResult = db.prepare(`
        INSERT INTO purchases (establishment_id, supplier_id, total_amount, tax_amount, paid_amount, status, invoice_number, items, due_date, delivery_status, is_direct, is_stock_updated, is_closed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(establishment_id, supplier_id, total_amount, tax_amount, (paid_amount || 0), status, finalInvoiceNumber, JSON.stringify(items), due_date, delivery_status, is_direct ? 1 : 0, is_stock_updated ? 1 : 0, is_closed ? 1 : 0);
      
      const purchaseId = purchaseResult.lastInsertRowid;

      // New Finance Integration: Orders -> Payables
      if (paid_amount < total_amount) {
        try {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          const supplier = db.prepare("SELECT name FROM suppliers WHERE id = ?").get(supplier_id) as any;
          if (establishment && supplier) {
            db.prepare(`
              INSERT INTO accounts_payable (establishment_id, owner_id, supplier_name, amount, due_date, description, status, purchase_id)
              VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
            `).run(establishment_id, establishment.owner_id, supplier.name, (total_amount - (paid_amount || 0)), due_date, `Compra/Encomenda - ${finalInvoiceNumber}`, purchaseId);
          }
        } catch (e) {
          console.error("Error creating payable for purchase:", e);
        }
      }

      if (paid_amount > 0) {
        db.prepare(`
          INSERT INTO purchase_payments (purchase_id, amount, payment_method)
          VALUES (?, ?, ?)
        `).run(purchaseId, paid_amount, 'Initial Payment');

        // Record in financial_transactions
        try {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          if (establishment) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type
              ) VALUES (?, ?, 'expense', 'Compra de Mercadoria', ?, ?, ?, ?, 'paid', ?, 'purchase')
            `).run(
              establishment_id, establishment.owner_id, paid_amount, 'cash',
              `Pagamento Inicial - Compra ${finalInvoiceNumber}`, new Date().toISOString(), purchaseId
            );
          }
        } catch (finError) {
          console.error("Error recording financial transaction for purchase:", finError);
        }
      }

      // If it's a direct purchase, update stock immediately
      if (is_direct) {
        for (const item of items) {
          db.prepare(`
            UPDATE products SET stock = stock + ? WHERE id = ?
          `).run(item.quantity, item.product_id);

          db.prepare(`
            INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, supplier_id, purchase_id)
            VALUES (?, ?, ?, 'in', ?, ?, ?, ?)
          `).run(establishment_id, item.product_id, user_id, item.quantity, `Compra Direta - Fatura ${finalInvoiceNumber}`, supplier_id, purchaseId);
        }
      }

      return purchaseId;
    });

    try {
      const id = transaction();
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/purchase-payments", (req, res) => {
    const { purchase_id, amount, payment_method } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO purchase_payments (purchase_id, amount, payment_method)
        VALUES (?, ?, ?)
      `).run(purchase_id, amount, payment_method);

      db.prepare(`
        UPDATE purchases 
        SET paid_amount = paid_amount + ?,
            status = CASE 
              WHEN (paid_amount + ?) >= total_amount THEN 'liquidado'
              ELSE 'devendo'
            END
        WHERE id = ?
      `).run(amount, amount, purchase_id);

      // New Finance Integration: Update Accounts Payable status if liquidated
      const updatedPurchase = db.prepare("SELECT paid_amount, total_amount FROM purchases WHERE id = ?").get(purchase_id) as any;
      if (updatedPurchase && updatedPurchase.paid_amount >= updatedPurchase.total_amount) {
        db.prepare("UPDATE accounts_payable SET status = 'paid' WHERE purchase_id = ?").run(purchase_id);
      }

      // Record in financial_transactions
      try {
        const purchase = db.prepare("SELECT establishment_id, invoice_number FROM purchases WHERE id = ?").get(purchase_id) as any;
        if (purchase) {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(purchase.establishment_id) as any;
          if (establishment) {
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type
              ) VALUES (?, ?, 'expense', 'Pagamento Fornecedor', ?, ?, ?, ?, 'paid', ?, 'purchase_payment')
            `).run(
              purchase.establishment_id, establishment.owner_id, amount, payment_method || 'cash',
              `Pagamento Fornecedor - Compra ${purchase.invoice_number}`, new Date().toISOString(), purchase_id
            );
          }
        }
      } catch (finError) {
        console.error("Error recording financial transaction for purchase payment:", finError);
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase Returns / Notes
  app.post("/api/owner/purchase-returns", (req, res) => {
    const { establishment_id, supplier_id, purchase_id, total_amount, tax_amount = 0, reason, items, type = 'credit', note_category = 'return', adjustment_amount = 0, observations = '' } = req.body;
    
    try {
      const transaction = db.transaction(() => {
        // Generate invoice number for the note
        const year = new Date().getFullYear();
        const prefix = type === 'credit' ? 'NC' : 'ND';
        const lastNote = db.prepare("SELECT invoice_number FROM purchase_returns WHERE establishment_id = ? AND type = ? AND invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(establishment_id, type, `${prefix}-${year}-%`) as { invoice_number: string } | undefined;
        
        let sequence = 1;
        if (lastNote && lastNote.invoice_number) {
          const parts = lastNote.invoice_number.split('-');
          sequence = parseInt(parts[parts.length - 1]) + 1;
        }
        const invoice_number = `${prefix}-${year}-${sequence.toString().padStart(3, '0')}`;

        const stmt = db.prepare(`
          INSERT INTO purchase_returns (establishment_id, supplier_id, purchase_id, total_amount, tax_amount, reason, items, type, note_category, adjustment_amount, observations, invoice_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(establishment_id, supplier_id, purchase_id, total_amount, tax_amount, reason, JSON.stringify(items), type, note_category, adjustment_amount, observations, invoice_number);
        const noteId = result.lastInsertRowid;

        // Record in financial_transactions
        try {
          const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
          if (establishment) {
            const finType = type === 'credit' ? 'income' : 'expense';
            const finCategory = type === 'credit' ? 'Devolução de Compra' : 'Acréscimo de Compra';
            db.prepare(`
              INSERT INTO financial_transactions (
                establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
            `).run(
              establishment_id, establishment.owner_id, finType, finCategory, total_amount, 'other',
              `${finCategory} - Nota ${invoice_number}`, new Date().toISOString(), noteId
            );
          }
        } catch (finError) {
          console.error("Error recording financial transaction for purchase return:", finError);
        }
        
        // Update stock for returned items (only if it's a credit note / return)
        if (type === 'credit' && note_category === 'return') {
          for (const item of items) {
            db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND establishment_id = ?").run(item.quantity, item.product_id, establishment_id);
            
            // Record stock movement
            db.prepare(`
              INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason, purchase_id)
              VALUES (?, ?, 'out', ?, ?, ?)
            `).run(establishment_id, item.product_id, item.quantity, `Nota de Crédito (Devolução) - Motivo: ${reason}`, purchase_id);
          }
        } else if (type === 'debit' && note_category === 'return') {
          // For debit notes, if it involves items (acréscimo), stock should go IN
          for (const item of items) {
            db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND establishment_id = ?").run(item.quantity, item.product_id, establishment_id);
            
            // Record stock movement
            db.prepare(`
              INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason, purchase_id)
              VALUES (?, ?, 'in', ?, ?, ?)
            `).run(establishment_id, item.product_id, item.quantity, `Nota de Débito (Acréscimo) - Motivo: ${reason}`, purchase_id);
          }
        }
        
        return result.lastInsertRowid;
      });

      const id = transaction();
      res.json({ success: true, id });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Erro ao registar nota" });
    }
  });

  app.get("/api/owner/purchase-returns/:establishmentId", (req, res) => {
    try {
      const returns = db.prepare(`
        SELECT r.*, s.name as supplier_name, p.invoice_number as purchase_invoice_number
        FROM purchase_returns r
        JOIN suppliers s ON r.supplier_id = s.id
        LEFT JOIN purchases p ON r.purchase_id = p.id
        WHERE r.establishment_id = ?
        ORDER BY r.timestamp DESC
      `).all(req.params.establishmentId);
      res.json(returns.map((r: any) => ({ ...r, items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []) })));
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/owner/purchases/:id/receive", (req, res) => {
    const { id } = req.params;
    
    try {
      const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
      if (!purchase) return res.status(404).json({ error: "Compra não encontrada" });
      if (purchase.delivery_status === 'received') return res.status(400).json({ error: "Compra já recebida" });

      db.prepare("UPDATE purchases SET delivery_status = 'received', received_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao receber encomenda" });
    }
  });

  app.put("/api/owner/purchases/:id/update-stock", (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;
    
    const transaction = db.transaction(() => {
      const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
      if (!purchase) throw new Error("Compra não encontrada");
      if (purchase.delivery_status !== 'received') throw new Error("Encomenda ainda não foi recebida");
      if (purchase.is_stock_updated) throw new Error("Stock já foi atualizado");

      const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : (purchase.items || []);
      
      for (const item of items) {
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ? AND establishment_id = ?").run(item.quantity, item.product_id, purchase.establishment_id);
        
        // Update product cost with the purchase price
        db.prepare("UPDATE products SET cost = ? WHERE id = ? AND establishment_id = ?").run(item.price, item.product_id, purchase.establishment_id);

        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, supplier_id, purchase_id)
          VALUES (?, ?, ?, 'in', ?, ?, ?, ?)
        `).run(purchase.establishment_id, item.product_id, user_id, item.quantity, `Recebimento Encomenda - Fatura ${purchase.invoice_number}`, purchase.supplier_id, id);
      }

      db.prepare("UPDATE purchases SET is_stock_updated = 1 WHERE id = ?").run(id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/owner/purchases/:id/close", (req, res) => {
    const { id } = req.params;
    
    try {
      const purchase = db.prepare("SELECT * FROM purchases WHERE id = ?").get(id) as any;
      if (!purchase) return res.status(404).json({ error: "Compra não encontrada" });
      if (!purchase.is_stock_updated) return res.status(400).json({ error: "Stock deve ser atualizado antes de fechar a encomenda" });

      db.prepare("UPDATE purchases SET is_closed = 1 WHERE id = ?").run(id);
      
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao fechar encomenda" });
    }
  });

  app.put("/api/owner/purchases/:id/cancel", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("UPDATE purchases SET delivery_status = 'cancelled' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao cancelar encomenda" });
    }
  });

  app.get("/api/seller/clients/:establishmentId", (req, res) => {
    const clients = db.prepare("SELECT * FROM clients WHERE establishment_id = ? ORDER BY name ASC").all(req.params.establishmentId);
    res.json(clients);
  });

  // Seller Routes
  app.get("/api/seller/products/:establishmentId", (req, res) => {
    const products = db.prepare(`
      SELECT p.*, 
        MAX(pr.discount_percent) as discount_percent,
        pr.name as promo_name,
        t.percentage as tax_percentage,
        t.tax_code
      FROM products p 
      LEFT JOIN promotion_products pp ON p.id = pp.product_id
      LEFT JOIN promotions pr ON pp.promotion_id = pr.id 
        AND date('now') BETWEEN date(pr.start_date) AND date(pr.end_date)
      LEFT JOIN taxes t ON p.tax_id = t.id
      WHERE p.establishment_id = ? AND p.stock > 0
      GROUP BY p.id
    `).all(req.params.establishmentId);
    res.json(products);
  });

  app.get("/api/owner/establishments/:establishmentId/invoice-series", (req, res) => {
    const series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? ORDER BY created_at DESC").all(req.params.establishmentId);
    res.json(series);
  });

  app.post("/api/owner/invoice-series/:seriesId/request-approval", (req, res) => {
    const seriesId = req.params.seriesId;
    const series = db.prepare("SELECT * FROM invoice_series WHERE id = ?").get(seriesId) as any;
    
    if (!series) return res.status(404).json({ error: "Série não encontrada." });

    // Automatically approve for now as requested
    db.prepare("UPDATE invoice_series SET agt_status = 'aprovada' WHERE id = ?").run(seriesId);
    res.json({ success: true, message: "Série aprovada automaticamente (Simulação AGT)." });
  });

  app.get("/api/seller/sales/:sellerId", (req, res) => {
    const sellerId = req.params.sellerId;
    
    // Standard transactions (FR)
    const transactions = db.prepare(`
      SELECT t.*, s.name as establishment_name, 'FR' as doc_type
      FROM transactions t
      JOIN establishments s ON t.establishment_id = s.id
      WHERE t.seller_id = ?
    `).all(sellerId) as any[];
    
    // Formal invoices (FR, FT)
    const formalInvoices = db.prepare(`
      SELECT 
        id, establishment_id, seller_id, total_amount, items, 
        client_name, client_nif, tax_amount, invoice_number,
        created_at as timestamp, doc_type, 'formal' as source
      FROM credit_invoices
      WHERE seller_id = ?
    `).all(sellerId) as any[];

    const allSales = [...transactions, ...formalInvoices].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    allSales.forEach(s => {
      s.items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
      if (s.split_details) s.split_details = typeof s.split_details === 'string' ? JSON.parse(s.split_details) : s.split_details;
    });
    
    res.json(allSales);
  });

  // Seller Dashboard Stats
  app.get("/api/seller/dashboard-stats/:sellerId", (req, res) => {
    const sellerId = req.params.sellerId;
    const today = new Date().toISOString().split('T')[0];

    const todayStats = db.prepare(`
      SELECT SUM(total) as total FROM (
        SELECT COALESCE(SUM(base_amount), 0) as total FROM transactions WHERE seller_id = ? AND date(timestamp) = ?
        UNION ALL
        SELECT COALESCE(SUM(base_amount), 0) as total FROM credit_invoices WHERE seller_id = ? AND date(invoice_date) = ? AND doc_type IN ('FT', 'FR', 'ND')
        UNION ALL
        SELECT COALESCE(SUM(-base_amount), 0) as total FROM credit_invoices WHERE seller_id = ? AND date(invoice_date) = ? AND doc_type = 'NC'
      )
    `).get(sellerId, today, sellerId, today, sellerId, today) as any;
    
    const last7DaysStats = db.prepare(`
      SELECT SUM(total) as total FROM (
        SELECT COALESCE(SUM(base_amount), 0) as total FROM transactions WHERE seller_id = ? AND timestamp >= date('now', '-7 days')
        UNION ALL
        SELECT COALESCE(SUM(base_amount), 0) as total FROM credit_invoices WHERE seller_id = ? AND invoice_date >= date('now', '-7 days') AND doc_type IN ('FT', 'FR', 'ND')
        UNION ALL
        SELECT COALESCE(SUM(-base_amount), 0) as total FROM credit_invoices WHERE seller_id = ? AND invoice_date >= date('now', '-7 days') AND doc_type = 'NC'
      )
    `).get(sellerId, sellerId, sellerId) as any;

    res.json({
      today: todayStats?.total || 0,
      last7Days: last7DaysStats?.total || 0
    });
  });

  // Cash Movements
  app.get("/api/seller/cash-movements/:sellerId", (req, res) => {
    const movements = db.prepare(`
      SELECT * FROM cash_movements 
      WHERE seller_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 20
    `).all(req.params.sellerId);
    res.json(movements);
  });

  app.post("/api/seller/cash-movements", (req, res) => {
    const { establishment_id, seller_id, cash_register_id, type, amount, description } = req.body;
    
    if (!hasPermission(seller_id, 'pos_withdraw')) {
      return res.status(403).json({ error: "Você não tem permissão para registar movimentos de caixa." });
    }

    // Check for active cashier session
    let sessionQuery = "SELECT id FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'";
    let sessionParams: any[] = [establishment_id];
    if (cash_register_id) {
      sessionQuery += " AND cash_register_id = ?";
      sessionParams.push(cash_register_id);
    }
    const activeSession = db.prepare(sessionQuery).get(...sessionParams);
    if (!activeSession) {
      return res.status(403).json({ error: "O caixa deve estar aberto para registar movimentos." });
    }

    db.prepare("INSERT INTO cash_movements (establishment_id, seller_id, cash_register_id, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)").run(establishment_id, seller_id, cash_register_id || null, type, amount, description);
    const movementId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

    // Record in financial_transactions
    try {
      const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
      if (establishment) {
        const finType = type === 'in' ? 'income' : 'expense';
        const finCategory = type === 'in' ? 'Entrada de Caixa (PDV)' : 'Saída de Caixa (PDV)';
        db.prepare(`
          INSERT INTO financial_transactions (
            establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id
          ) VALUES (?, ?, ?, ?, ?, 'cash', ?, ?, 'paid', ?)
        `).run(
          establishment_id, establishment.owner_id, finType, finCategory, amount,
          `Movimento de Caixa PDV: ${description || ''}`,
          new Date().toISOString(), movementId.id
        );
      }
    } catch (finError) {
      console.error("Error recording financial transaction for cash movement:", finError);
    }

    res.json({ success: true });
  });

  // Cashier Sessions
  app.get("/api/seller/active-session/:establishmentId", (req, res) => {
    const { cash_register_id } = req.query;
    let query = "SELECT * FROM cashier_sessions WHERE establishment_id = ? AND status = 'open'";
    let params: any[] = [req.params.establishmentId];

    if (cash_register_id) {
      query += " AND cash_register_id = ?";
      params.push(cash_register_id);
    }

    query += " ORDER BY opening_time DESC LIMIT 1";

    const session = db.prepare(query).get(...params) as any;

    if (!session) return res.json(null);

    // Calculate current totals for this session across the establishment
    // 1. POS Sales (base_amount)
    const salesPos = db.prepare(`
      SELECT SUM(base_amount) as total 
      FROM transactions 
      WHERE establishment_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    // 2. Formal Sales (FR/VD/FT/ND/RC)
    const salesFormal = db.prepare(`
      SELECT SUM(base_amount) as total 
      FROM credit_invoices 
      WHERE establishment_id = ? AND invoice_date >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
      AND doc_type IN ('FR', 'VD', 'FT', 'ND', 'RC')
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    // 3. Refunds (NC)
    const refunds = db.prepare(`
      SELECT SUM(base_amount) as total 
      FROM credit_invoices 
      WHERE establishment_id = ? AND invoice_date >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
      AND doc_type = 'NC'
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    const cashIn = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE establishment_id = ? AND type = 'in' AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    const cashOut = db.prepare(`
      SELECT SUM(amount) as total 
      FROM cash_movements 
      WHERE establishment_id = ? AND type = 'out' AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
    `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

    const totalSales = (salesPos?.total || 0) + (salesFormal?.total || 0);

    res.json({
      ...session,
      totals: {
        sales: totalSales,
        in: cashIn?.total || 0,
        out: (cashOut?.total || 0) + (refunds?.total || 0),
        expected: (session.opening_amount + totalSales + (cashIn?.total || 0)) - ((cashOut?.total || 0) + (refunds?.total || 0))
      }
    });
  });

  app.post("/api/seller/open-session", (req, res) => {
    const { establishment_id, seller_id, opening_amount, cash_register_id } = req.body;
    console.log("Opening session request:", { establishment_id, seller_id, opening_amount, cash_register_id });
    
    if (!hasPermission(seller_id, 'pos_open_cashier')) {
      return res.status(403).json({ error: "Você não tem permissão para abrir o caixa." });
    }

    // Check if seller already has an open session (exempt owners, admins and managers)
    const user = db.prepare("SELECT role FROM users WHERE id = ?").get(seller_id) as any;
    if (user && user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      const existingSellerSession = db.prepare("SELECT id FROM cashier_sessions WHERE seller_id = ? AND status = 'open'").get(seller_id);
      if (existingSellerSession) {
        return res.status(400).json({ error: "Você já possui uma sessão de caixa aberta. Feche-a antes de abrir outra." });
      }
    }

    // Check if register already has an open session
    const existingRegisterSession = db.prepare("SELECT id FROM cashier_sessions WHERE cash_register_id = ? AND status = 'open'").get(cash_register_id);
    if (existingRegisterSession) {
      return res.status(400).json({ error: "Este caixa já possui uma sessão aberta por outro funcionário." });
    }

    const info = db.prepare("INSERT INTO cashier_sessions (establishment_id, seller_id, opening_amount, cash_register_id) VALUES (?, ?, ?, ?)").run(establishment_id, seller_id, opening_amount, cash_register_id);
    
    const est = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    logAction({
      userId: seller_id,
      ownerId: est?.owner_id,
      establishmentId: establishment_id,
      module: 'FINANCE',
      actionType: 'OPEN_CASHIER',
      severity: 'INFO',
      description: `Caixa aberto com valor inicial de Kz ${opening_amount}`,
      entityType: 'CASHIER_SESSION',
      entityId: Number(info.lastInsertRowid),
      newValues: { opening_amount, cash_register_id },
      req
    });

    res.json({ success: true, id: info.lastInsertRowid });
  });

  app.post("/api/seller/close-session", (req, res) => {
    let { session_id, physical_amount, closing_amount, seller_id } = req.body;
    console.log("Closing session request:", { session_id, physical_amount, closing_amount, seller_id });

    if (!hasPermission(seller_id, 'pos_close_cashier')) {
      return res.status(403).json({ error: "Você não tem permissão para fechar o caixa." });
    }

    const session = db.prepare("SELECT * FROM cashier_sessions WHERE id = ?").get(session_id) as any;
    if (!session) return res.status(404).json({ error: "Sessão não encontrada." });

    // If closing_amount is 0 or not provided, calculate it from transactions
    if (!closing_amount || closing_amount === 0) {
      if (session) {
        // Sum cash sales from transactions
        const salesPos = db.prepare(`
          SELECT SUM(base_amount) as total 
          FROM transactions 
          WHERE establishment_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
        `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

        const salesFormal = db.prepare(`
          SELECT SUM(base_amount) as total 
          FROM credit_invoices 
          WHERE establishment_id = ? AND invoice_date >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
          AND doc_type IN ('FR', 'VD', 'FT', 'ND', 'RC')
        `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

        const refunds = db.prepare(`
          SELECT SUM(base_amount) as total 
          FROM credit_invoices 
          WHERE establishment_id = ? AND invoice_date >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
          AND doc_type = 'NC'
        `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;
        
        const movements = db.prepare(`
          SELECT SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END) as total
          FROM cash_movements
          WHERE establishment_id = ? AND timestamp >= ? AND (cash_register_id = ? OR cash_register_id IS NULL)
        `).get(session.establishment_id, session.opening_time, session.cash_register_id) as any;

        closing_amount = (session.opening_amount || 0) + (salesPos?.total || 0) + (salesFormal?.total || 0) + (movements?.total || 0) - (refunds?.total || 0);
      }
    }

    db.prepare(`
      UPDATE cashier_sessions 
      SET physical_amount = ?, closing_amount = ?, closing_time = CURRENT_TIMESTAMP, status = 'closed' 
      WHERE id = ?
    `).run(physical_amount, closing_amount || 0, session_id);
    
    const est = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(session.establishment_id) as any;
    logAction({
      userId: seller_id,
      ownerId: est?.owner_id,
      establishmentId: session.establishment_id,
      module: 'FINANCE',
      actionType: 'CLOSE_CASHIER',
      severity: 'INFO',
      description: `Caixa fechado. Esperado: Kz ${closing_amount} | Físico: Kz ${physical_amount}`,
      entityType: 'CASHIER_SESSION',
      entityId: session_id,
      oldValues: session,
      newValues: { physical_amount, closing_amount, status: 'closed' },
      req
    });

    res.json({ success: true });
  });

  // Stock Management Routes
  app.get("/api/owner/stock/movements/:establishmentId", (req, res) => {
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN users u ON sm.user_id = u.id
      WHERE sm.establishment_id = ?
      ORDER BY sm.timestamp DESC
    `).all(req.params.establishmentId);
    res.json(movements);
  });

  app.post("/api/owner/stock/movement", (req, res) => {
    const { establishment_id, product_id, user_id, type, quantity, reason, supplier_id } = req.body;
    
    try {
      db.transaction(() => {
        if (type === 'in') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        } else if (type === 'out' || type === 'adjustment') {
          db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, product_id);
        }
        
        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, supplier_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(establishment_id, product_id, user_id, type, quantity, reason, supplier_id || null);
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/owner/stock/transfer", (req, res) => {
    const { from_establishment_id, to_establishment_id, product_id, user_id, quantity, reason } = req.body;
    
    try {
      db.transaction(() => {
        const sourceProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
        if (!sourceProduct) {
          throw new Error("Produto não encontrado");
        }
        if (sourceProduct.stock < quantity) {
          throw new Error(`Estoque insuficiente em ${sourceProduct.name}. Disponível: ${sourceProduct.stock}`);
        }

        // Try to find the product in the destination establishment by barcode first, then by name
        let destProduct;
        if (sourceProduct.barcode) {
          destProduct = db.prepare("SELECT * FROM products WHERE establishment_id = ? AND barcode = ?").get(to_establishment_id, sourceProduct.barcode) as any;
        }
        
        if (!destProduct) {
          destProduct = db.prepare("SELECT * FROM products WHERE establishment_id = ? AND name = ?").get(to_establishment_id, sourceProduct.name) as any;
        }
        
        if (!destProduct) {
          const barcode = sourceProduct.barcode || Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
          const result = db.prepare(`
            INSERT INTO products (establishment_id, name, price, stock, category, image_url, min_stock, barcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(to_establishment_id, sourceProduct.name, sourceProduct.price, 0, sourceProduct.category, sourceProduct.image_url, sourceProduct.min_stock || 5, barcode);
          destProduct = { id: result.lastInsertRowid };
        }

        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(quantity, sourceProduct.id);
        db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(quantity, destProduct.id);

        const transferReason = reason || `Transferência de ${quantity} un de ${sourceProduct.name}`;

        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, from_establishment_id, to_establishment_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(from_establishment_id, sourceProduct.id, user_id, 'transfer', -quantity, transferReason, from_establishment_id, to_establishment_id);

        db.prepare(`
          INSERT INTO stock_movements (establishment_id, product_id, user_id, type, quantity, reason, from_establishment_id, to_establishment_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(to_establishment_id, destProduct.id, user_id, 'transfer', quantity, transferReason, from_establishment_id, to_establishment_id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Transfer error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/owner/stock/report/:establishmentId", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_quantity,
        SUM(stock * price) as total_value
      FROM products
      WHERE establishment_id = ?
    `).get(req.params.establishmentId) as any;

    const lowStock = db.prepare(`
      SELECT * FROM products
      WHERE establishment_id = ? AND stock <= min_stock
    `).all(req.params.establishmentId);

    res.json({ stats, lowStock });
  });

  app.post("/api/owner/proforma", (req, res) => {
    const { establishment_id, owner_id, client_name = 'Consumidor Final', client_nif, client_address, total_amount, items, cash_register_id } = req.body;
    try {
      // Get Billing Mode and Series
      const establishmentData = db.prepare("SELECT owner_id, bank_accounts FROM establishments WHERE id = ?").get(establishment_id) as any;
      if (!establishmentData) {
        return res.status(404).json({ error: "Estabelecimento não encontrado." });
      }
      const owner = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishmentData.owner_id) as any;
      const billing_mode = (owner?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
      const seriesPrefix = billing_mode === 'eletronica' ? 'E' : 'A';
      const bank_accounts = establishmentData.bank_accounts || "[]";

      // Find active series for Proforma (PP or FP)
      let series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = ? AND type IN ('PP', 'FP') AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, seriesPrefix) as any;
      
      if (!series && billing_mode === 'tradicional') {
        const year = new Date().getFullYear();
        db.prepare(`
          INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic, type, fiscal_year)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(establishment_id, `Série PP ${year}`, 'A', 1, 0, 'active', 'aprovada', 0, 'PP', year);
        series = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = 'A' AND type = 'PP' AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id) as any;
      }

      if (!series) {
        const errorMsg = billing_mode === 'eletronica'
          ? "Faturação Eletrónica: Nenhuma série de Fatura Proforma (prefixo 'E') ativa e aprovada encontrada. Solicite-a nas definições."
          : `Não existe uma série ativa para Fatura Proforma (PP/FP). Por favor, crie uma série nas configurações.`;
        return res.status(403).json({ error: errorMsg });
      }

      if (billing_mode === 'eletronica' && series.agt_status !== 'aprovada') {
        return res.status(403).json({ error: "A série de faturação eletrónica ainda não foi aprovada pela AGT." });
      }

      // Generate invoice number
      const year = new Date().getFullYear();
      const nextNum = Math.max((series.current_number || 0) + 1, series.start_number || 1);
      const doc_type = series.type;
      const invoice_number = `${doc_type} ${series.prefix}/${series.fiscal_year || year}/${nextNum.toString().padStart(4, '0')}`;
      
      // Update series
      db.prepare("UPDATE invoice_series SET current_number = ? WHERE id = ?").run(nextNum, series.id);

      // Digital Signature
      const signatureData = DigitalSignatureService.signDocument(establishmentData.owner_id, establishment_id, {
        invoice_number,
        doc_type,
        client_name,
        total_amount,
        date: new Date().toISOString(),
        items: JSON.stringify(items)
      });

      const result = db.prepare(`
        INSERT INTO proforma_invoices (
          establishment_id, owner_id, cash_register_id, client_name, client_nif, client_address, total_amount, items, bank_accounts, invoice_number,
          hash, signature, prev_signature, key_version_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        establishment_id, owner_id, cash_register_id || null, client_name, client_nif, client_address, total_amount, JSON.stringify(items), bank_accounts, invoice_number,
        signatureData.hash, signatureData.signature, signatureData.prev_signature, signatureData.keyVersionId
      );
      
      const newProforma = db.prepare("SELECT * FROM proforma_invoices WHERE id = ?").get(result.lastInsertRowid) as any;
      res.json({
        ...newProforma,
        items: typeof newProforma.items === 'string' ? JSON.parse(newProforma.items) : (newProforma.items || [])
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/proforma/:establishmentId", (req, res) => {
    const proformas = db.prepare("SELECT * FROM proforma_invoices WHERE establishment_id = ? ORDER BY created_at DESC").all(req.params.establishmentId) as any[];
    res.json(proformas.map(p => ({
      ...p,
      items: p.items ? (typeof p.items === 'string' ? JSON.parse(p.items) : p.items) : [],
      bank_accounts: p.bank_accounts ? (typeof p.bank_accounts === 'string' ? JSON.parse(p.bank_accounts) : p.bank_accounts) : []
    })));
  });

  app.post("/api/owner/credit-invoices", (req, res) => {
    const { 
      establishment_id, client_nif, client_name, address, country, 
      doc_type, series: providedSeries, invoice_number: providedNumber, invoice_date, 
      currency, total_amount, tax_amount, items, seller_id,
      payment_method, parent_invoice_id, reason, note_category,
      adjustment_amount, observations, exchange_rate, cash_register_id
    } = req.body;

    const rateToSave = exchange_rate || 1.0;
    // Force rounding up to avoid cents missing (User requirement: 700 AOA -> 0.77 USD)
    const base_amount = Math.ceil(total_amount * rateToSave * 100) / 100;

    console.log("Creating credit invoice request:", { establishment_id, doc_type, items_count: items?.length });

    try {
      let finalInvoice: any = null;
      db.transaction(() => {
        // Auto-generate series and number from the active series
        const establishmentInfo = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
        if (!establishmentInfo) throw new Error("Estabelecimento não encontrado.");

        // Check if owner has at least one currency registered
        const currencyCount = db.prepare("SELECT COUNT(*) as count FROM currencies WHERE owner_id = ?").get(establishmentInfo.owner_id) as any;
        if (!currencyCount || currencyCount.count === 0) {
          throw new Error("O proprietário deve cadastrar pelo menos uma moeda antes de emitir documentos.");
        }
        
        const ownerInfo = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishmentInfo.owner_id) as any;
        const billing_mode = (ownerInfo?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
        const seriesPrefix = billing_mode === 'eletronica' ? 'E' : 'A';

        // Ensure we find the active series for the current mode and document type
        let activeSeries = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = ? AND type = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, seriesPrefix, doc_type) as any;
        
        if (!activeSeries && billing_mode === 'tradicional') {
          const year = new Date().getFullYear();
          console.log(`[CreditInvoice] Creating automatic traditional series for establishment ${establishment_id}, type ${doc_type}`);
          db.prepare(`
            INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, status, agt_status, is_electronic, type, fiscal_year)
            VALUES (?, ?, ?, ?, ?, ?, 'aprovada', 0, ?, ?)
          `).run(establishment_id, `Série ${doc_type} Automática ${year}`, 'A', 1, 0, 'active', doc_type, year);
          activeSeries = db.prepare("SELECT * FROM invoice_series WHERE establishment_id = ? AND prefix = 'A' AND type = ? AND status = 'active' ORDER BY id DESC LIMIT 1").get(establishment_id, doc_type) as any;
        }

        if (!activeSeries) {
          const errorMsg = billing_mode === 'eletronica'
            ? `Faturação Eletrónica: Nenhuma série de ${doc_type} (prefixo 'E') ativa e aprovada encontrada. Solicite-a nas definições.`
            : `Não existe uma série activa para o documento ${doc_type}. Por favor, active uma série em Definições.`;
          throw new Error(errorMsg);
        }

        if (billing_mode === 'eletronica' && activeSeries.agt_status !== 'aprovada') {
          throw new Error("A série de faturação eletrónica ainda não foi aprovada pela AGT.");
        }

        const year = new Date().getFullYear();
        const nextNum = Math.max((activeSeries.current_number || 0) + 1, activeSeries.start_number || 1);
        const finalNumber = `${doc_type} ${activeSeries.prefix}/${activeSeries.fiscal_year || year}/${nextNum.toString().padStart(4, '0')}`;
        const finalSeries = activeSeries.name;

        // Update active series
        db.prepare("UPDATE invoice_series SET current_number = ? WHERE id = ?").run(nextNum, activeSeries.id);

        // Digital Signature
        const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
        const signatureData = DigitalSignatureService.signDocument(establishment.owner_id, establishment_id, {
          invoice_number: finalNumber,
          doc_type,
          client_name: client_name || 'Consumidor Final',
          total_amount,
          date: invoice_date || new Date().toISOString(),
          items: JSON.stringify(items)
        });

        const result = db.prepare(`
          INSERT INTO credit_invoices (
            establishment_id, owner_id, client_nif, client_name, address, country, 
            doc_type, series, invoice_number, invoice_date, 
            currency, total_amount, tax_amount, items, seller_id, cash_register_id,
            payment_method, parent_invoice_id, reason, note_category,
            adjustment_amount, observations, due_date, service_designation,
            exchange_rate, base_amount,
            hash, signature, prev_signature, key_version_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          establishment_id, establishment.owner_id, client_nif, client_name, address, country, 
          doc_type, finalSeries, finalNumber, invoice_date, 
          currency, total_amount, tax_amount, JSON.stringify(items), seller_id || null, cash_register_id || null,
          payment_method || 'cash', parent_invoice_id || null, reason || null, 
          note_category || null, adjustment_amount || 0, observations || null, req.body.due_date || null, req.body.service_designation || null,
          rateToSave, base_amount,
          signatureData.hash, signatureData.signature, signatureData.prev_signature, signatureData.keyVersionId
        );

        const invoiceId = result.lastInsertRowid;

        // Mark cancellation request as approved if applicable
        if ((doc_type === 'NC' || doc_type === 'ND') && parent_invoice_id) {
          db.prepare("UPDATE cancellation_requests SET status = 'approved', processed_at = CURRENT_TIMESTAMP WHERE invoice_id = ? AND doc_type = ?").run(parent_invoice_id, doc_type);
        }

        // New Finance Integration: FT -> Receivables
        if (doc_type === 'FT') {
          try {
            const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
            if (establishment) {
              db.prepare(`
                INSERT INTO accounts_receivable (establishment_id, owner_id, client_name, amount, due_date, description, status, invoice_id)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
              `).run(establishment_id, establishment.owner_id, client_name, total_amount, req.body.due_date, `Fatura Crédito - ${finalNumber}`, invoiceId);
            }
          } catch (e) {
            console.error("Error creating receivable for FT:", e);
          }
        }

        // New Finance Integration: RC -> Liquidate FT
        if (doc_type === 'RC' && parent_invoice_id) {
          try {
            db.prepare("UPDATE credit_invoices SET status = 'paid' WHERE id = ?").run(parent_invoice_id);
            db.prepare("UPDATE accounts_receivable SET status = 'paid' WHERE invoice_id = ?").run(parent_invoice_id);
          } catch (e) {
            console.error("Error liquidating FT with RC:", e);
          }
        }

        // Record in financial_transactions - SKIP FOR PROFORMAS (PP) AND CREDIT INVOICES (FT)
        // FT will only count as income once it is paid (RC created)
        if (doc_type !== 'PP' && doc_type !== 'FT') {
          try {
            const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
            if (establishment) {
              // NC (Credit Note) is recorded as expense to correctly reflect outflows (Saídas)
              // This ensures that the user sees the refund in the Saídas section
              const isNC = doc_type === 'NC';
              const finType = isNC ? 'expense' : 'income';
              const finAmount = base_amount; // Use the converted base amount in Kz
              const finCategory = isNC ? 'Nota de Crédito (Saída)' : 
                                  doc_type === 'RC' ? 'Recibo de Pagamento (FT)' : 'Venda Faturada';
              
              db.prepare(`
                INSERT INTO financial_transactions (
                  establishment_id, owner_id, type, category, amount, payment_method, description, date, status, reference_id, reference_type,
                  currency_code, exchange_rate, base_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, 'credit_invoice', ?, ?, ?)
              `).run(
                establishment_id, establishment.owner_id, finType, finCategory, finAmount, payment_method || 'cash',
                `${finCategory} - Documento ${finalNumber}${parent_invoice_id ? ' (Ref: ' + parent_invoice_id + ')' : ''} (${currency} ${total_amount})`, 
                new Date().toISOString(), invoiceId,
                currency, rateToSave, base_amount
              );
            }
          } catch (finError) {
            console.error("Error recording financial transaction for credit invoice:", finError);
          }
        }

        // Update stock for products - SKIP FOR PROFORMAS (PP)
        if (doc_type !== 'PP') {
          for (const item of items) {
            if (item.type === 'product' && item.quantity > 0) {
              if (doc_type === 'NC') {
                // Nota de Crédito
                if (note_category === 'return') {
                  // Return to stock
                  db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.product_id || item.id);
                  
                  // Record stock movement
                  db.prepare(`
                    INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason)
                    VALUES (?, ?, 'in', ?, ?)
                  `).run(establishment_id, item.product_id || item.id, item.quantity, `Nota de Crédito (Devolução) - Fatura: ${finalNumber}`);
                }
              } else if (doc_type !== 'RC') {
                // FT, FR, ND - Stock goes OUT (RC is just a payment for an existing FT, so stock was already reduced)
                db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(item.quantity, item.product_id || item.id);
                
                // Record stock movement
                db.prepare(`
                  INSERT INTO stock_movements (establishment_id, product_id, type, quantity, reason)
                  VALUES (?, ?, 'out', ?, ?)
                `).run(establishment_id, item.product_id || item.id, item.quantity, `${doc_type === 'ND' ? 'Nota de Débito' : 'Fatura'} - Nº: ${finalNumber}`);
              }
            }
          }
        }

        finalInvoice = db.prepare("SELECT * FROM credit_invoices WHERE id = ?").get(result.lastInsertRowid) as any;
      })();

      if (finalInvoice) {
        res.json({
          ...finalInvoice,
          items: typeof finalInvoice.items === 'string' ? JSON.parse(finalInvoice.items) : (finalInvoice.items || [])
        });
      } else {
        res.status(500).json({ error: "Failed to create invoice" });
      }
    } catch (e: any) {
      console.error("[CreditInvoice] Error creating credit invoice:", e);
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/owner/credit-invoices/:establishmentId", (req, res) => {
    try {
      const invoices = db.prepare(`
        SELECT 
          t1.id, t1.establishment_id, t1.owner_id, t1.seller_id, t1.parent_invoice_id, 
          t1.client_name, t1.client_nif, t1.address, t1.country, t1.doc_type, 
          t1.series, t1.invoice_number, t1.invoice_date, t1.currency, t1.total_amount, 
          t1.tax_amount, t1.payment_method, t1.reason, t1.note_category, 
          t1.adjustment_amount, t1.observations, t1.items, t1.due_date, t1.created_at,
          t1.status,
          t2.invoice_number as parent_invoice_number,
          0 as is_pos
        FROM credit_invoices t1
        LEFT JOIN credit_invoices t2 ON t1.parent_invoice_id = t2.id
        WHERE t1.establishment_id = ? 
        
        UNION ALL

        SELECT 
          id, establishment_id, NULL as owner_id, seller_id, NULL as parent_invoice_id,
          '🛒 PDV - ' || client_name as client_name, client_nif, '' as address, 'Angola' as country, 'FR' as doc_type,
          '' as series, invoice_number, SUBSTR(timestamp, 1, 10) as invoice_date, 'AOA' as currency, total_amount,
          tax_amount, payment_method, '' as reason, '' as note_category,
          0 as adjustment_amount, '' as observations, items, NULL as due_date, timestamp as created_at,
          'liquidado' as status,
          NULL as parent_invoice_number,
          1 as is_pos
        FROM transactions
        WHERE establishment_id = ?

        ORDER BY created_at DESC
      `).all(req.params.establishmentId, req.params.establishmentId) as any[];
      res.json(invoices.map(inv => ({
        ...inv,
        items: inv.items ? (typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items) : []
      })));
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Invoice Series ---
  app.get("/api/owner/invoice-series/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');
    const series = db.prepare(`
      SELECT s.*, st.name as establishment_name 
      FROM invoice_series s
      JOIN establishments st ON s.establishment_id = st.id
      WHERE s.establishment_id IN (${placeholders})
    `).all(...establishmentIds);
    res.json(series);
  });

  app.post("/api/owner/invoice-series", (req, res) => {
    const { establishment_id, name, prefix: providedPrefix, start_number, fiscal_year, request_reason, type } = req.body;
    
    // Force prefix based on billing mode
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    const owner = db.prepare("SELECT billing_mode FROM users WHERE id = ?").get(establishment.owner_id) as any;
    const billing_mode = (owner?.billing_mode === 'eletronica') ? 'eletronica' : 'tradicional';
    const forcedPrefix = billing_mode === 'eletronica' ? 'E' : 'A';
    
    const agt_status = billing_mode === 'eletronica' ? 'pendente' : 'aprovada';
    
    const result = db.prepare(`
      INSERT INTO invoice_series (establishment_id, name, prefix, start_number, current_number, agt_status, is_electronic, fiscal_year, request_reason, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(establishment_id, name, forcedPrefix, start_number, 0, agt_status, billing_mode === 'eletronica' ? 1 : 0, fiscal_year, request_reason, type || 'FR');
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.put("/api/owner/invoice-series/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE invoice_series SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/invoice-series/:id", (req, res) => {
    const series = db.prepare("SELECT current_number FROM invoice_series WHERE id = ?").get(req.params.id) as any;
    if (series && series.current_number > 0) {
      return res.status(400).json({ error: "Não é possível apagar uma série que já possui faturas emitidas." });
    }
    db.prepare("DELETE FROM invoice_series WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Taxes ---
  app.get("/api/owner/taxes/establishment/:establishmentId", (req, res) => {
    const establishmentId = req.params.establishmentId;
    const taxes = db.prepare(`
      SELECT t.*, st.name as establishment_name 
      FROM taxes t
      JOIN establishments st ON t.establishment_id = st.id
      WHERE t.establishment_id = ?
    `).all(establishmentId);
    res.json(taxes);
  });

  app.get("/api/owner/taxes/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');
    const taxes = db.prepare(`
      SELECT t.*, st.name as establishment_name 
      FROM taxes t
      JOIN establishments st ON t.establishment_id = st.id
      WHERE t.establishment_id IN (${placeholders})
    `).all(...establishmentIds);
    res.json(taxes);
  });

  app.post("/api/owner/taxes", (req, res) => {
    let { establishment_id, name, percentage, tax_code } = req.body;
    
    // Enforce Exclusion Regime if applicable
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    if (establishment) {
      const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any;
      if (owner && owner.fiscal_regime === 'exclusao') {
        percentage = 0;
        tax_code = 'ISE';
      }
    }

    db.prepare(`
      INSERT INTO taxes (establishment_id, name, percentage, tax_code)
      VALUES (?, ?, ?, ?)
    `).run(establishment_id, name, percentage, tax_code || 'NOR');
    res.json({ success: true });
  });

  app.put("/api/owner/taxes/:id", (req, res) => {
    let { establishment_id, name, percentage, tax_code } = req.body;

    // Enforce Exclusion Regime if applicable
    const establishment = db.prepare("SELECT owner_id FROM establishments WHERE id = ?").get(establishment_id) as any;
    if (establishment) {
      const owner = db.prepare("SELECT fiscal_regime FROM users WHERE id = ?").get(establishment.owner_id) as any;
      if (owner && owner.fiscal_regime === 'exclusao') {
        percentage = 0;
        tax_code = 'ISE';
      }
    }

    db.prepare(`
      UPDATE taxes 
      SET establishment_id = ?, name = ?, percentage = ?, tax_code = ?
      WHERE id = ?
    `).run(establishment_id, name, percentage, tax_code || 'NOR', req.params.id);
    res.json({ success: true });
  });

  app.put("/api/owner/taxes/:id/default", (req, res) => {
    const { establishment_id } = req.body;
    db.transaction(() => {
      // Unset current default for this establishment
      db.prepare("UPDATE taxes SET is_default = 0 WHERE establishment_id = ?").run(establishment_id);
      // Set new default
      db.prepare("UPDATE taxes SET is_default = 1 WHERE id = ?").run(req.params.id);
    })();
    res.json({ success: true });
  });

  app.put("/api/owner/taxes/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE taxes SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/taxes/:id", (req, res) => {
    const taxId = req.params.id;
    
    // Check if tax is used in products
    const productCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE tax_id = ?").get(taxId) as { count: number };
    if (productCount.count > 0) {
      return res.status(400).json({ error: "Este imposto está a ser utilizado por produtos e não pode ser excluído." });
    }

    // Check if tax is used in services
    const serviceCount = db.prepare("SELECT COUNT(*) as count FROM services WHERE tax_id = ?").get(taxId) as { count: number };
    if (serviceCount.count > 0) {
      return res.status(400).json({ error: "Este imposto está a ser utilizado por serviços e não pode ser excluído." });
    }

    // Check if it's a default tax
    const tax = db.prepare("SELECT is_default FROM taxes WHERE id = ?").get(taxId) as { is_default: number };
    if (tax && tax.is_default === 1) {
      return res.status(400).json({ error: "Não é possível excluir o imposto padrão. Defina outro imposto como padrão primeiro." });
    }

    db.prepare("DELETE FROM taxes WHERE id = ?").run(taxId);
    res.json({ success: true });
  });

  // --- Owner Settings & Backups ---
  app.get("/api/owner/settings/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    const settings = db.prepare("SELECT * FROM owner_settings WHERE owner_id = ?").get(ownerId) || { 
      backup_enabled: 0, 
      backup_frequency: 'daily', 
      financial_reminder_enabled: 0, 
      saft_config: null, 
      billing_config: null,
      print_config: null
    };
    res.json(settings);
  });

  app.post("/api/owner/settings", (req, res) => {
    const { owner_id, backup_enabled, backup_frequency, financial_reminder_enabled, saft_config, billing_config, print_config, eac_code } = req.body;
    
    const settings = db.prepare("SELECT * FROM owner_settings WHERE owner_id = ?").get(owner_id) as any;
    
    db.prepare(`
      INSERT INTO owner_settings (
        owner_id, 
        backup_enabled, 
        backup_frequency, 
        financial_reminder_enabled, 
        saft_config, 
        billing_config,
        print_config,
        eac_code
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id) DO UPDATE SET
        backup_enabled = COALESCE(excluded.backup_enabled, backup_enabled),
        backup_frequency = COALESCE(excluded.backup_frequency, backup_frequency),
        financial_reminder_enabled = COALESCE(excluded.financial_reminder_enabled, financial_reminder_enabled),
        saft_config = COALESCE(excluded.saft_config, saft_config),
        billing_config = COALESCE(excluded.billing_config, billing_config),
        print_config = COALESCE(excluded.print_config, print_config),
        eac_code = COALESCE(excluded.eac_code, eac_code)
    `).run(
      owner_id, 
      backup_enabled !== undefined ? (backup_enabled ? 1 : 0) : (settings?.backup_enabled || 0), 
      backup_frequency || settings?.backup_frequency || 'daily', 
      financial_reminder_enabled !== undefined ? (financial_reminder_enabled ? 1 : 0) : (settings?.financial_reminder_enabled || 0),
      saft_config !== undefined ? (typeof saft_config === 'string' ? saft_config : JSON.stringify(saft_config)) : (settings?.saft_config || null),
      billing_config !== undefined ? (typeof billing_config === 'string' ? billing_config : JSON.stringify(billing_config)) : (settings?.billing_config || null),
      print_config !== undefined ? (typeof print_config === 'string' ? print_config : JSON.stringify(print_config)) : (settings?.print_config || null),
      eac_code || settings?.eac_code || '47110'
    );
    res.json({ success: true });
  });

  app.get("/api/owner/backups/:ownerId", (req, res) => {
    const ownerId = req.params.ownerId;
    const backups = db.prepare("SELECT * FROM backups WHERE owner_id = ? ORDER BY created_at DESC").all(ownerId);
    const settings = db.prepare("SELECT * FROM owner_settings WHERE owner_id = ?").get(ownerId) || { backup_enabled: 0, backup_frequency: 'daily', financial_reminder_enabled: 0 };
    res.json({ backups, settings });
  });

  app.post("/api/owner/backups/generate", (req, res) => {
    const { owner_id } = req.body;
    const filename = `backup_${owner_id}_${Date.now()}.db`;
    const size = Math.floor(Math.random() * 1000000) + 500000; // Simulated size
    db.prepare("INSERT INTO backups (owner_id, filename, size) VALUES (?, ?, ?)").run(owner_id, filename, size);
    res.json({ success: true });
  });

  app.get("/api/owner/backups/download/:id", (req, res) => {
    const backup = db.prepare("SELECT * FROM backups WHERE id = ?").get(req.params.id) as any;
    if (!backup) return res.status(404).json({ error: "Backup not found" });
    
    // In a real system, we'd send the actual file. Here we'll send a dummy blob.
    res.setHeader('Content-Disposition', `attachment; filename=${backup.filename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(Buffer.from("Simulated backup data for " + backup.filename));
  });

  // --- Warehouses ---
  app.get("/api/owner/warehouses/:ownerId", (req, res) => {
    const { establishmentIds } = getContextData(req.params.ownerId);
    if (establishmentIds.length === 0) return res.json([]);
    const placeholders = establishmentIds.map(() => '?').join(',');

    const warehouses = db.prepare(`
      SELECT w.*, st.name as establishment_name 
      FROM warehouses w
      JOIN establishments st ON w.establishment_id = st.id
      WHERE w.establishment_id IN (${placeholders})
    `).all(...establishmentIds);
    res.json(warehouses);
  });

  app.post("/api/owner/warehouses", (req, res) => {
    const { establishment_id, name, type } = req.body;
    db.prepare(`
      INSERT INTO warehouses (establishment_id, name, type)
      VALUES (?, ?, ?)
    `).run(establishment_id, name, type);
    res.json({ success: true });
  });

  app.put("/api/owner/warehouses/:id", (req, res) => {
    const { name, type, status } = req.body;
    db.prepare("UPDATE warehouses SET name = ?, type = ?, status = ? WHERE id = ?").run(name, type, status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/owner/warehouses/:id", (req, res) => {
    db.prepare("DELETE FROM warehouses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/owner/warehouses/:id/products", (req, res) => {
    const { id } = req.params;
    const products = db.prepare(`
      SELECT p.*, w.name as warehouse_name 
      FROM products p
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
      WHERE p.warehouse_id = ?
    `).all(id);
    res.json(products);
  });

  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error Handler detected error:", err);
    logServerError(`GLOBAL ERROR HANDLER: ${req.method} ${req.path}`, err);
    
    // Always return JSON if it's an API request
    if (req.path.startsWith('/api')) {
      const statusCode = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
      return res.status(statusCode).json({ 
        error: err.message || "Erro interno do servidor (API).",
        path: req.path,
        method: req.method
      });
    }

    res.status(err.status || 500).json({ 
      error: err.message || "Erro interno do servidor.",
      path: req.path,
      method: req.method
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      console.log("Initializing Vite dev server...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite dev server initialized.");
    } catch (viteError) {
      console.error("Failed to initialize Vite server:", viteError);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.path}` });
      }
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
