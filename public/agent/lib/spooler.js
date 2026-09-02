/**
 * PRINT SPOOLER & RETRY ENGINE - FATU-R HARDWARE AGENT
 * 
 * Gerencia a fila persistente, retentativas com exponential backoff,
 * renderização de bytes ESC/POS e transmissão atómica para o Printer Manager.
 */

const database = require('./database');
const printerManager = require('./printerManager');
const escpos = require('./escpos');
const logger = require('./logger');

let isProcessing = false;
let spoolerTimer = null;
let onJobCompletedCallback = null;

// Tabela de Delays de Backoff Exponencial (em segundos)
const BACKOFF_DELAYS = [3, 10, 30];

/**
 * Inicia o worker do Spooler
 */
function startSpooler(intervalMs = 1500, onJobCompleted = null) {
  if (onJobCompleted) {
    onJobCompletedCallback = onJobCompleted;
  }
  
  if (spoolerTimer) clearInterval(spoolerTimer);

  spoolerTimer = setInterval(() => {
    processQueue();
  }, intervalMs);

  logger.info('SPOOLER', `Motor de Spooler iniciado (polling a cada ${intervalMs}ms)`);
}

function stopSpooler() {
  if (spoolerTimer) {
    clearInterval(spoolerTimer);
    spoolerTimer = null;
  }
}

/**
 * Ciclo principal de processamento da fila
 */
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const pendingJobs = database.getPendingJobs();
    if (pendingJobs.length === 0) {
      isProcessing = false;
      return;
    }

    for (const job of pendingJobs) {
      await processSingleJob(job);
    }
  } catch (err) {
    logger.error('SPOOLER', `Erro no ciclo do spooler: ${err.message}`);
  } finally {
    isProcessing = false;
  }
}

/**
 * Processa um único trabalho de impressão
 */
async function processSingleJob(job) {
  const attemptNum = (job.attempts || 0) + 1;
  logger.info('SPOOLER', `A iniciar envio do Job ${job.id} (Tentativa ${attemptNum}/${job.max_attempts || 3})`);

  database.updateJobStatus(job.id, 'SENDING');

  try {
    // 1. Determinar o buffer ESC/POS a imprimir
    let buffer = null;
    const payload = job.payload || {};

    if (payload.raw_base64) {
      buffer = Buffer.from(payload.raw_base64, 'base64');
    } else if (payload.raw_hex) {
      buffer = Buffer.from(payload.raw_hex, 'hex');
    } else if (payload.doc_type === 'PAGINA_TESTE' || payload.isTest) {
      buffer = escpos.generateTestReceipt({
        name: job.printer_id || payload.printer || 'Impressora Térmica',
        interface: payload.interface || 'Windows Spooler'
      }, {
        width: payload.ticketSize || '80mm',
        codepage: payload.codepage || 'CP860'
      });
    } else if (payload.sale || payload.items || payload.document) {
      const doc = payload.sale || payload.document || payload;
      buffer = escpos.generateReceipt(doc, {
        ticketSize: payload.ticketSize || '80mm',
        codepage: payload.codepage || 'CP860',
        openDrawer: payload.openDrawer || false,
        drawerPin: payload.drawerPin || 'pin2',
        establishment: payload.establishment
      });
    } else if (typeof payload.content === 'string') {
      const builder = new escpos.EscPosBuilder({ width: payload.ticketSize || '80mm' });
      builder.line(payload.content);
      builder.cut();
      buffer = builder.toBuffer();
    } else {
      throw new Error('Payload inválido: formato de documento não reconhecido para geração ESC/POS.');
    }

    // 2. Extrair configuração da impressora de destino
    const printerTarget = {
      printerName: job.printer_id || payload.printer || payload.printerName || 'EPSON TM-T20',
      interface: payload.interface || (payload.ip ? 'tcp' : (payload.port && payload.port.startsWith('COM') ? 'serial' : 'spooler')),
      ip: payload.ip || payload.host,
      port: payload.port,
      baudRate: payload.baudRate || 9600
    };

    // 3. Executar o envio FÍSICO REAL através do Printer Manager
    const printResult = await printerManager.dispatchPrint(printerTarget, buffer, `FATUR-${job.document_id || job.id}`);

    // 4. Marcação de SUCESSO REAL (apenas após o retorno do driver físico/socket)
    database.updateJobStatus(job.id, 'COMPLETED');
    logger.info('SPOOLER', `Job ${job.id} CONCLUÍDO com sucesso na impressora física [${printerTarget.printerName}]`);

    // Notificar callback (ex: WSS Cloud Client)
    if (onJobCompletedCallback) {
      onJobCompletedCallback({
        job_id: job.id,
        document_id: job.document_id,
        status: 'COMPLETED',
        details: printResult
      });
    }

  } catch (err) {
    const isLastAttempt = attemptNum >= (job.max_attempts || 3);
    const backoffDelay = BACKOFF_DELAYS[Math.min(attemptNum - 1, BACKOFF_DELAYS.length - 1)];

    if (isLastAttempt) {
      database.updateJobStatus(job.id, 'FAILED', err.message);
      logger.error('SPOOLER', `Job ${job.id} FALHOU DEFINITIVAMENTE após ${attemptNum} tentativas: ${err.message}`);
      
      if (onJobCompletedCallback) {
        onJobCompletedCallback({
          job_id: job.id,
          document_id: job.document_id,
          status: 'FAILED',
          error: err.message
        });
      }
    } else {
      database.updateJobStatus(job.id, 'QUEUED', err.message, backoffDelay);
      logger.warn('SPOOLER', `Job ${job.id} falhou na tentativa ${attemptNum}. Nova tentativa agendada em ${backoffDelay}s. Causa: ${err.message}`);
    }
  }
}

/**
 * Enfileira um novo trabalho com verificação de deduplicação e garantia de retorno
 */
function enqueueJob(jobData) {
  const result = database.createOrGetJob(jobData);
  
  // Dispara o processamento imediato
  setImmediate(() => processQueue());

  return result;
}

/**
 * Abertura direta e real de Gaveta de Dinheiro
 */
async function openCashDrawer(options = {}) {
  const pin = options.pin || options.printerDrawerPin || 'pin2';
  const drawerBuffer = escpos.generateCashDrawerKick(pin);

  const printerTarget = {
    printerName: options.printer || options.printerName || 'EPSON TM-T20',
    interface: options.interface || (options.ip ? 'tcp' : (options.port && options.port.startsWith('COM') ? 'serial' : 'spooler')),
    ip: options.ip,
    port: options.port,
    baudRate: options.baudRate || 9600
  };

  logger.info('DRAWER', `Disparando comando de abertura real de gaveta RJ11 (${pin}) via ${printerTarget.printerName}`);
  return await printerManager.dispatchPrint(printerTarget, drawerBuffer, 'Fatu-R Open Drawer');
}

module.exports = {
  startSpooler,
  stopSpooler,
  processQueue,
  enqueueJob,
  openCashDrawer
};
