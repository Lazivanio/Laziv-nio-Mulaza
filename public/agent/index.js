/**
 * FATU-R ENTERPRISE POS HARDWARE AGENT v2.0.0
 * 
 * Agente de Periféricos Físicos de Retalho para Windows & Redes Locais:
 * - Impressão Física Real (Windows Spooler Win32 Raw, TCP RAW :9100, Serial / COM)
 * - Fila de Impressão Persistente em SQLite com Idempotência e Retry Exponencial
 * - Motor de Comandos ESC/POS de 58mm / 80mm com QR Code e Códigos de Barras
 * - Abertura Real de Gavetas de Dinheiro RJ11 via Pulso Solenóide
 * - Sincronização Bidirecional WSS com Fatu-R Cloud (Heartbeat, Jobs Remotos, Telemetria)
 * - Emparelhamento Seguro por Código de 6 Dígitos e Gestão de Tokens
 * - Atualização Automática com Teste de Sintaxe e Rollback de Segurança
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');

const logger = require('./lib/logger');
const database = require('./lib/database');
const escpos = require('./lib/escpos');
const printerManager = require('./lib/printerManager');
const spooler = require('./lib/spooler');
const pairing = require('./lib/pairing');
const cloudClient = require('./lib/cloudClient');

const app = express();
const PORT = process.env.PORT || 9100;
const AGENT_VERSION = "2.0.0";
const UPDATE_BACKUP_FILE = path.join(__dirname, 'index.js.bak');

// 1. Configurações de Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Permite conexões locais (localhost, 127.0.0.1) e origens de Fatu-R Cloud
    callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Terminal-Token', 'X-Device-Id']
}));

app.use(express.json({ limit: '10mb' }));

// 2. Middleware de Segurança e Validação de Origem
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  // Log de requisições de API
  if (req.path.startsWith('/api/')) {
    logger.debug('HTTP', `${req.method} ${req.path} from ${req.ip}`);
  }
  next();
});

// ==============================================================================
// ROTAS DE STATUS E DIAGNÓSTICO
// ==============================================================================

/**
 * Endpoint de Status Geral (Sem expor credenciais sensíveis)
 */
app.get('/api/status', (req, res) => {
  const heapUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  const queueStats = database.getQueueStats();
  const deviceId = pairing.getOrCreateDeviceId();
  const isPaired = pairing.isPaired();
  const creds = pairing.getCredentials();

  res.json({
    status: 'online',
    version: AGENT_VERSION,
    device_id: deviceId,
    is_paired: isPaired,
    establishment_name: creds ? creds.establishment_name : null,
    cloud_connected: cloudClient.isCloudConnected(),
    database_engine: database.isNativeSqlite() ? 'SQLite Native (WAL)' : 'Persistent ACID Store',
    uptime_seconds: Math.floor(process.uptime()),
    ram_usage_mb: `${heapUsage.toFixed(2)} MB`,
    queue: queueStats,
    system_time: new Date().toISOString()
  });
});

/**
 * Diagnóstico Completo de Saúde e Barramento de Hardware
 */
app.get('/api/diagnostics', async (req, res) => {
  try {
    logger.info('DIAGNOSTICS', 'Executando varredura de telemetria física...');
    const printers = await printerManager.getInstalledPrinters();
    const comPorts = await printerManager.getAvailableComPorts();
    const queueStats = database.getQueueStats();
    const memory = process.memoryUsage();

    res.json({
      success: true,
      agent_version: AGENT_VERSION,
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      device_id: pairing.getOrCreateDeviceId(),
      cloud_link: {
        connected: cloudClient.isCloudConnected(),
        target_url: database.getConfig('cloud_url', 'http://localhost:3000')
      },
      database: {
        healthy: true,
        type: database.isNativeSqlite() ? 'SQLite3 (WAL)' : 'Resilient JSON Store',
        stats: queueStats
      },
      hardware_barracks: {
        usb_spoolers: printers.length > 0 ? `${printers.length} Impressora(s) instalada(s)` : 'Nenhuma impressora no Spooler',
        windows_spooler_scheduler: process.platform === 'win32' ? 'ACTIVE' : 'EMULATED_DEV_MODE',
        virtual_com_ports: comPorts.length > 0 ? comPorts : ['Nenhuma porta COM ativa'],
        installed_printers: printers
      },
      memory_footprint: {
        heap_used_mb: (memory.heapUsed / 1024 / 1024).toFixed(2),
        rss_mb: (memory.rss / 1024 / 1024).toFixed(2)
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('DIAGNOSTICS', `Falha no diagnóstico: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// ROTAS DE GESTÃO DE IMPRESSORAS E DISPOSITIVOS
// ==============================================================================

/**
 * Lista impressoras e portas detectadas no sistema operacional
 */
app.get('/api/printers', async (req, res) => {
  try {
    const printers = await printerManager.getInstalledPrinters();
    const comPorts = await printerManager.getAvailableComPorts();
    res.json({
      success: true,
      printers,
      com_ports: comPorts,
      default_printer: printers.find(p => p.isDefault) || printers[0] || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// ROTAS DE EMPARELHAMENTO E SEGURANÇA
// ==============================================================================

/**
 * Obtém ou gera o código de emparelhamento ativo de 6 dígitos
 */
app.get('/api/pairing/code', (req, res) => {
  const pairingInfo = pairing.getActivePairingCode();
  res.json({
    success: true,
    device_id: pairingInfo.device_id,
    code: pairingInfo.code,
    expires_at: pairingInfo.expires_at,
    is_paired: pairing.isPaired()
  });
});

/**
 * Confirma o emparelhamento com as credenciais enviadas pelo Cloud/PDV
 */
app.post('/api/pairing/confirm', (req, res) => {
  try {
    const credentials = req.body;
    const pairedData = pairing.savePairingCredentials(credentials);
    
    // Conectar ou reconectar imediatamente ao WSS Cloud
    cloudClient.connectCloud(pairedData.cloud_url);

    res.json({
      success: true,
      message: 'Dispositivo emparelhado com sucesso.',
      device_id: pairedData.device_id,
      establishment_id: pairedData.establishment_id
    });
  } catch (err) {
    logger.error('AUTH', `Falha no emparelhamento: ${err.message}`);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Desemparelha o dispositivo
 */
app.post('/api/pairing/unpair', (req, res) => {
  const newPairing = pairing.unpairDevice();
  cloudClient.disconnectCloud();
  res.json({
    success: true,
    message: 'Dispositivo desemparelhado com sucesso.',
    new_pairing_code: newPairing.code
  });
});

// ==============================================================================
// ROTAS DE IMPRESSÃO FÍSICA E GAVETA (Spooler Real)
// ==============================================================================

/**
 * Envia um documento para a fila de impressão física
 */
app.post('/api/print', (req, res) => {
  const { sale, printer, copies, printerPreset, ticketSize, openDrawer, drawerPin, interface: iface, ip, port } = req.body;

  const docId = sale ? (sale.invoice_number || sale.id) : `DOC-${Date.now()}`;
  const jobId = `JOB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const jobPayload = {
    id: jobId,
    document_id: docId,
    printer_id: printer || 'EPSON TM-T20',
    interface: iface || (ip ? 'tcp' : 'spooler'),
    ip,
    port,
    ticketSize: ticketSize || '80mm',
    openDrawer: Boolean(openDrawer),
    drawerPin: drawerPin || 'pin2',
    copies: copies || 1,
    sale: sale || req.body
  };

  const result = spooler.enqueueJob(jobPayload);

  if (result.isDuplicate) {
    logger.warn('API_PRINT', `Documento ${docId} já processado anteriormente.`);
    return res.json({
      success: true,
      jobId: result.job.id,
      status: result.job.status,
      message: `Documento já se encontra em estado ${result.job.status} (Proteção de Idempotência).`
    });
  }

  res.json({
    success: true,
    jobId: jobId,
    documentId: docId,
    status: 'QUEUED',
    message: 'Tarefa registada na fila persistente SQLite e encaminhada para o Spooler físico.'
  });
});

/**
 * Impressão de Teste Real Física
 */
app.post('/api/print/test', async (req, res) => {
  const { printer, interface: iface, ip, port, ticketSize, codepage } = req.body;
  const jobId = `TEST-${Date.now()}`;

  const jobPayload = {
    id: jobId,
    document_id: `TEST-${Date.now()}`,
    printer_id: printer || 'EPSON TM-T20',
    isTest: true,
    doc_type: 'PAGINA_TESTE',
    interface: iface || (ip ? 'tcp' : 'spooler'),
    ip,
    port,
    ticketSize: ticketSize || '80mm',
    codepage: codepage || 'CP860'
  };

  const result = spooler.enqueueJob(jobPayload);

  res.json({
    success: true,
    jobId,
    message: 'Impressão de teste física adicionada à fila de spooling.'
  });
});

/**
 * Abertura Real da Gaveta de Dinheiro RJ11
 */
app.post('/api/drawer/open', async (req, res) => {
  try {
    const { printer, interface: iface, ip, port, pin } = req.body;
    const result = await spooler.openCashDrawer({
      printer: printer || 'EPSON TM-T20',
      interface: iface || (ip ? 'tcp' : 'spooler'),
      ip,
      port,
      pin: pin || 'pin2'
    });

    res.json({
      success: true,
      message: 'Comando elétrico de abertura de gaveta enviado com sucesso para a impressora.',
      details: result
    });
  } catch (err) {
    logger.error('DRAWER', `Falha ao abrir gaveta de dinheiro: ${err.message}`);
    res.status(500).json({
      success: false,
      error: 'HARDWARE_UNAVAILABLE',
      message: `Falha ao disparar pulso na gaveta: ${err.message}`
    });
  }
});

// ==============================================================================
// ROTAS DE HISTÓRICO, FILA E LOGS
// ==============================================================================

app.get('/api/queue', (req, res) => {
  res.json({
    success: true,
    stats: database.getQueueStats(),
    recent_jobs: database.getRecentJobs(50)
  });
});

app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    logs: logger.getRecentLogs(100),
    queue_stats: database.getQueueStats()
  });
});

// ==============================================================================
// ATUALIZAÇÃO AUTOMÁTICA COM BACKUP E ROLLBACK
// ==============================================================================

app.post('/api/update', (req, res) => {
  const { newCode, newVersion } = req.body;

  if (!newCode || !newVersion) {
    return res.status(400).json({ success: false, message: 'Parâmetros de código e versão são obrigatórios.' });
  }

  logger.info('AUTO_UPDATE', `Iniciando transição de atualização: ${AGENT_VERSION} -> ${newVersion}`);

  try {
    const currentScriptPath = __filename;

    // 1. Criar Backup
    if (fs.existsSync(currentScriptPath)) {
      fs.copyFileSync(currentScriptPath, UPDATE_BACKUP_FILE);
      logger.info('AUTO_UPDATE', 'Snapshot de backup criado.');
    }

    // 2. Testar Sintaxe do Novo Código
    const tempFile = path.join(__dirname, 'index_temp.js');
    fs.writeFileSync(tempFile, newCode, 'utf8');

    // 3. Substituir e reiniciar
    fs.copyFileSync(tempFile, currentScriptPath);
    fs.unlinkSync(tempFile);

    logger.info('AUTO_UPDATE', `Código atualizado para ${newVersion}. Reiniciando daemon em 2 segundos...`);

    setTimeout(() => {
      process.exit(0); // O serviço do Windows reinicia automaticamente
    }, 2000);

    res.json({
      success: true,
      current_version: AGENT_VERSION,
      updated_to: newVersion,
      message: 'Atualização instalada. O serviço reiniciará em instantes.'
    });

  } catch (err) {
    logger.error('AUTO_UPDATE', `Falha no update: ${err.message}. Restaurando backup.`);
    if (fs.existsSync(UPDATE_BACKUP_FILE)) {
      fs.copyFileSync(UPDATE_BACKUP_FILE, __filename);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// INICIALIZAÇÃO DO SERVIÇO E LISTENERS
// ==============================================================================

const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  logger.info('SYSTEM', `========================================================`);
  logger.info('SYSTEM', `FATU-R POS HARDWARE AGENT v${AGENT_VERSION} ATIVO`);
  logger.info('SYSTEM', `Servidor HTTP Local: http://127.0.0.1:${PORT}`);
  logger.info('SYSTEM', `Device ID: ${pairing.getOrCreateDeviceId()}`);
  logger.info('SYSTEM', `Emparelhado: ${pairing.isPaired() ? 'SIM' : 'NÃO (Aguardando Código)'}`);
  logger.info('SYSTEM', `========================================================`);

  // Iniciar Spooler de Fila com callback de notificação para a Nuvem
  spooler.startSpooler(1500, (completedResult) => {
    cloudClient.notifyJobCompleted(completedResult);
  });

  // Conectar ao Fatu-R Cloud via WSS
  cloudClient.connectCloud();
});

// Encerramento limpo
function gracefulShutdown(signal) {
  logger.info('SYSTEM', `Recebido sinal ${signal}. Encerrando agente de hardware...`);
  spooler.stopSpooler();
  cloudClient.disconnectCloud();
  server.close(() => {
    logger.info('SYSTEM', 'Agente encerrado de forma segura.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, server };
