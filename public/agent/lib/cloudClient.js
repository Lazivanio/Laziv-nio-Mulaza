/**
 * SECURE WSS CLOUD CLIENT - FATU-R HARDWARE AGENT
 * 
 * Conecta o Device Agent ao Fatu-R Cloud via WebSocket seguro (WSS),
 * com autenticação, heartbeat contínuo, reconexão resiliente com jitter,
 * recepção de ordens de impressão remota e confirmação atómica de execução.
 */

const WebSocket = require('ws');
const pairing = require('./pairing');
const spooler = require('./spooler');
const database = require('./database');
const printerManager = require('./printerManager');
const logger = require('./logger');

let wsClient = null;
let heartbeatInterval = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let isExplicitlyClosed = false;

const MAX_RECONNECT_DELAY_MS = 30000;
const BASE_RECONNECT_DELAY_MS = 2000;

/**
 * Conecta ao servidor Cloud WSS
 */
function connectCloud(customUrl = null) {
  isExplicitlyClosed = false;

  const creds = pairing.getCredentials();
  const rawUrl = customUrl || (creds && creds.cloud_url) || database.getConfig('cloud_url', 'http://localhost:3000');
  
  // Converte http:// para ws:// ou https:// para wss://
  let wsUrl = rawUrl.replace(/^http(s?):\/\//, 'ws$1://');
  if (!wsUrl.includes('/ws/device')) {
    wsUrl = wsUrl.replace(/\/+$/, '') + '/ws/device';
  }

  logger.info('CLOUD_WSS', `Iniciando conexão WSS com ${wsUrl}...`);

  try {
    if (wsClient) {
      try { wsClient.terminate(); } catch (e) {}
    }

    wsClient = new WebSocket(wsUrl);

    wsClient.on('open', () => {
      logger.info('CLOUD_WSS', `Conexão WSS estabelecida com sucesso!`);
      reconnectAttempts = 0;

      // 1. Enviar pacote de autenticação do dispositivo
      const deviceId = pairing.getOrCreateDeviceId();
      const authPayload = {
        type: 'device_auth',
        device_id: deviceId,
        access_token: creds ? creds.access_token : null,
        version: '2.0.0',
        timestamp: new Date().toISOString()
      };

      sendWsMessage(authPayload);

      // 2. Iniciar Heartbeat contínuo
      startHeartbeat();
    });

    wsClient.on('message', (data) => {
      handleCloudMessage(data);
    });

    wsClient.on('close', (code, reason) => {
      logger.warn('CLOUD_WSS', `Conexão WSS encerrada (Código: ${code}, Motivo: ${reason || 'Nenhum'}).`);
      stopHeartbeat();
      if (!isExplicitlyClosed) {
        scheduleReconnect();
      }
    });

    wsClient.on('error', (err) => {
      logger.error('CLOUD_WSS', `Erro no canal WebSocket: ${err.message}`);
    });

  } catch (err) {
    logger.error('CLOUD_WSS', `Falha ao instanciar WebSocket: ${err.message}`);
    scheduleReconnect();
  }
}

/**
 * Agenda reconexão com Exponential Backoff + Jitter
 */
function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);

  reconnectAttempts++;
  // Cálculo com backoff exponencial + jitter aleatório (0 a 1000ms)
  const backoff = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts - 1), MAX_RECONNECT_DELAY_MS);
  const jitter = Math.floor(Math.random() * 1000);
  const delay = Math.floor(backoff + jitter);

  logger.info('CLOUD_WSS', `Agendando reconexão em ${(delay / 1000).toFixed(1)}s (Tentativa ${reconnectAttempts})...`);
  reconnectTimeout = setTimeout(() => {
    connectCloud();
  }, delay);
}

/**
 * Envia mensagem estruturada pelo WebSocket
 */
function sendWsMessage(obj) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    try {
      wsClient.send(JSON.stringify(obj));
      return true;
    } catch (e) {
      logger.error('CLOUD_WSS', `Falha ao transmitir mensagem via WSS: ${e.message}`);
    }
  }
  return false;
}

/**
 * Heartbeat periódico para informar status do dispositivo ao Cloud
 */
function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      const stats = database.getQueueStats();
      const memory = process.memoryUsage();
      
      const heartbeatPayload = {
        type: 'heartbeat',
        device_id: pairing.getOrCreateDeviceId(),
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory_mb: (memory.heapUsed / 1024 / 1024).toFixed(1),
        queue: stats,
        is_paired: pairing.isPaired()
      };

      sendWsMessage(heartbeatPayload);
    }
  }, 20000); // A cada 20 segundos
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

/**
 * Trata mensagens recebidas do Cloud
 */
async function handleCloudMessage(rawMessage) {
  try {
    const msg = JSON.parse(rawMessage.toString());
    logger.info('CLOUD_WSS', `Mensagem recebida do Cloud: tipo='${msg.type}' id='${msg.job_id || msg.id || '-'}'`);

    switch (msg.type) {
      case 'auth_success':
        logger.info('CLOUD_WSS', `Autenticação confirmada pelo Cloud para o dispositivo ${msg.device_id}`);
        break;

      case 'auth_error':
        logger.error('CLOUD_WSS', `Erro de autenticação no Cloud: ${msg.message}`);
        break;

      case 'print_job': {
        const { job_id, document_id, printer_id, payload } = msg;
        
        // 1. Enviar ACK imediato de recebimento
        sendWsMessage({
          type: 'job_ack',
          job_id: job_id || `JOB-${Date.now()}`,
          document_id,
          device_id: pairing.getOrCreateDeviceId(),
          status: 'RECEIVED',
          timestamp: new Date().toISOString()
        });

        // 2. Inserir na fila persistente SQLite
        const enqueueResult = spooler.enqueueJob({
          id: job_id,
          document_id,
          printer_id,
          payload: payload || msg
        });

        logger.info('CLOUD_WSS', `Job ${job_id} registado na fila (Idempotente: ${enqueueResult.isDuplicate})`);
        break;
      }

      case 'drawer_open': {
        try {
          const res = await spooler.openCashDrawer(msg.options || {});
          sendWsMessage({
            type: 'drawer_result',
            request_id: msg.request_id,
            status: 'COMPLETED',
            details: res
          });
        } catch (err) {
          sendWsMessage({
            type: 'drawer_result',
            request_id: msg.request_id,
            status: 'FAILED',
            error: err.message
          });
        }
        break;
      }

      case 'get_status': {
        const printers = await printerManager.getInstalledPrinters();
        const comPorts = await printerManager.getAvailableComPorts();
        sendWsMessage({
          type: 'status_report',
          device_id: pairing.getOrCreateDeviceId(),
          status: 'ONLINE',
          printers,
          com_ports: comPorts,
          queue_stats: database.getQueueStats(),
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString()
        });
        break;
      }

      case 'ping':
        sendWsMessage({ type: 'pong', timestamp: new Date().toISOString() });
        break;

      default:
        logger.warn('CLOUD_WSS', `Tipo de mensagem não reconhecido: ${msg.type}`);
    }
  } catch (err) {
    logger.error('CLOUD_WSS', `Falha ao processar mensagem do Cloud: ${err.message}`);
  }
}

/**
 * Notifica o Cloud quando um job foi concluído pelo Spooler
 */
function notifyJobCompleted(result) {
  sendWsMessage({
    type: 'print_result',
    job_id: result.job_id,
    document_id: result.document_id,
    device_id: pairing.getOrCreateDeviceId(),
    status: result.status,
    error: result.error || null,
    timestamp: new Date().toISOString()
  });
}

function disconnectCloud() {
  isExplicitlyClosed = true;
  stopHeartbeat();
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  if (wsClient) {
    try { wsClient.close(); } catch (e) {}
  }
}

function isCloudConnected() {
  return Boolean(wsClient && wsClient.readyState === WebSocket.OPEN);
}

module.exports = {
  connectCloud,
  disconnectCloud,
  isCloudConnected,
  sendWsMessage,
  notifyJobCompleted
};
