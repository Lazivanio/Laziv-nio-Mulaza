/**
 * PAIRING & AUTHENTICATION MANAGER - FATU-R HARDWARE AGENT
 * 
 * Gerencia o ciclo de vida do Device ID persistente, código de emparelhamento
 * temporário de 6 caracteres, armazenamento seguro de tokens e verificação de autenticação.
 */

const crypto = require('crypto');
const database = require('./database');
const logger = require('./logger');

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 Minutos de validade

/**
 * Obtém ou gera um Device ID único e persistente
 */
function getOrCreateDeviceId() {
  let deviceId = database.getConfig('device_id');
  if (!deviceId) {
    deviceId = `FATUR-DEV-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    database.setConfig('device_id', deviceId);
    logger.info('AUTH', `Novo Device ID gerado e persistido: ${deviceId}`);
  }
  return deviceId;
}

/**
 * Gera um novo código de emparelhamento de 6 caracteres alfanuméricos
 */
function generatePairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem O, 0, 1, I para evitar ambiguidades
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString();
  const pairingData = {
    code,
    device_id: getOrCreateDeviceId(),
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  database.setConfig('active_pairing', pairingData);
  logger.info('AUTH', `Código de emparelhamento gerado: ${code} (Expira em: ${expiresAt})`);
  return pairingData;
}

/**
 * Obtém o código de emparelhamento ativo, gerando um novo se expirado
 */
function getActivePairingCode() {
  const current = database.getConfig('active_pairing');
  if (current && current.expires_at) {
    const isExpired = new Date(current.expires_at).getTime() < Date.now();
    if (!isExpired) {
      return current;
    }
  }
  return generatePairingCode();
}

/**
 * Salva as credenciais recebidas do Fatu-R Cloud após emparelhamento
 */
function savePairingCredentials(credentials) {
  if (!credentials || !credentials.access_token) {
    throw new Error('Credenciais de emparelhamento inválidas.');
  }

  const deviceData = {
    device_id: getOrCreateDeviceId(),
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token || null,
    owner_id: credentials.owner_id || null,
    establishment_id: credentials.establishment_id || null,
    pos_id: credentials.pos_id || null,
    establishment_name: credentials.establishment_name || null,
    paired_at: new Date().toISOString(),
    cloud_url: credentials.cloud_url || database.getConfig('cloud_url', 'http://localhost:3000')
  };

  database.setConfig('device_credentials', deviceData);
  database.setConfig('is_paired', true);
  
  // Limpar código temporário após uso
  database.setConfig('active_pairing', null);

  logger.info('AUTH', `Dispositivo emparelhado com sucesso ao Estabelecimento: ${deviceData.establishment_name || deviceData.establishment_id}`);
  return deviceData;
}

/**
 * Obtém as credenciais ativas do dispositivo (sem expor em texto puro se solicitado)
 */
function getCredentials() {
  return database.getConfig('device_credentials', null);
}

function isPaired() {
  const creds = getCredentials();
  return Boolean(creds && creds.access_token);
}

/**
 * Desemparelha o dispositivo
 */
function unpairDevice() {
  database.setConfig('device_credentials', null);
  database.setConfig('is_paired', false);
  logger.info('AUTH', 'Dispositivo desemparelhado.');
  return generatePairingCode();
}

/**
 * Valida se um token recebido corresponde às credenciais locais
 */
function validateClientToken(token) {
  if (!token) return false;
  
  const creds = getCredentials();
  if (creds && creds.access_token && creds.access_token === token) {
    return true;
  }

  // Token local padrão para compatibilidade em ambiente de teste inicial
  const localSecret = database.getConfig('local_api_key', 'FATUR-LOCAL-KEY');
  return token === localSecret || token === `Bearer ${localSecret}`;
}

module.exports = {
  getOrCreateDeviceId,
  generatePairingCode,
  getActivePairingCode,
  savePairingCredentials,
  getCredentials,
  isPaired,
  unpairDevice,
  validateClientToken
};
