const fs = require('fs');
const path = require('path');

const LOGS_FILE = path.join(__dirname, '..', 'agent_history.log');
const MAX_LOGS = 500;

let memoryLogs = [];

// Carregar logs anteriores
try {
  if (fs.existsSync(LOGS_FILE)) {
    const raw = fs.readFileSync(LOGS_FILE, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    memoryLogs = lines.slice(-MAX_LOGS).map(l => {
      try { return JSON.parse(l); } catch (e) { return null; }
    }).filter(Boolean);
  }
} catch (e) {
  memoryLogs = [];
}

/**
 * Sanitiza mensagens removendo tokens ou dados sensíveis antes de logar
 */
function sanitizeMessage(msg) {
  if (typeof msg !== 'string') return JSON.stringify(msg);
  return msg
    .replace(/(token|secret|password|key|authorization)=["']?[^"'\s&]+["']?/gi, '$1=***REDACTED***')
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer ***REDACTED***')
    .replace(/FATUR-[A-Z0-9_\-]{8,}/gi, 'FATUR-***REDACTED***');
}

/**
 * Registra log estruturado
 */
function log(level, component, message, metadata = null) {
  const timestamp = new Date().toISOString();
  const cleanMessage = sanitizeMessage(message);
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    component: component.toUpperCase(),
    message: cleanMessage,
    ...(metadata ? { meta: metadata } : {})
  };

  memoryLogs.push(entry);
  if (memoryLogs.length > MAX_LOGS) memoryLogs.shift();

  const logLine = JSON.stringify(entry) + '\n';
  try {
    fs.appendFileSync(LOGS_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Falha de escrita no log persistente:', err.message);
  }

  const prefix = `[${timestamp}] [${entry.level}] [${entry.component}]`;
  if (entry.level === 'ERROR' || entry.level === 'CRITICAL') {
    console.error(`${prefix} ${cleanMessage}`);
  } else if (entry.level === 'WARN') {
    console.warn(`${prefix} ${cleanMessage}`);
  } else {
    console.log(`${prefix} ${cleanMessage}`);
  }
}

function getRecentLogs(limit = 100) {
  return memoryLogs.slice(-limit);
}

module.exports = {
  info: (comp, msg, meta) => log('INFO', comp, msg, meta),
  warn: (comp, msg, meta) => log('WARN', comp, msg, meta),
  error: (comp, msg, meta) => log('ERROR', comp, msg, meta),
  debug: (comp, msg, meta) => log('DEBUG', comp, msg, meta),
  log,
  getRecentLogs
};
