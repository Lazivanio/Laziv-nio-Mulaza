const assert = require('assert');
const pairing = require('../lib/pairing');

console.log('--- TESTANDO EMPARELHAMENTO E SEGURANÇA ---');

// 1. Device ID Único
const deviceId = pairing.getOrCreateDeviceId();
assert(deviceId.startsWith('FATUR-DEV-'), 'Device ID deve ter prefixo FATUR-DEV-');
const deviceId2 = pairing.getOrCreateDeviceId();
assert.strictEqual(deviceId, deviceId2, 'Device ID deve ser persistente');
console.log(`✓ Geração e persistência de Device ID (${deviceId}): OK`);

// 2. Geração de Código de 6 Caracteres
const pairingInfo = pairing.generatePairingCode();
assert.strictEqual(pairingInfo.code.length, 6, 'Código de emparelhamento deve conter 6 caracteres');
assert(new Date(pairingInfo.expires_at) > new Date(), 'Código deve ter validade futura');
console.log(`✓ Código de emparelhamento temporário (${pairingInfo.code}, expira: ${pairingInfo.expires_at}): OK`);

// 3. Salvamento de Credenciais de Emparelhamento
const testCreds = {
  access_token: 'FATUR_SEC_TOKEN_ABC123XYZ',
  owner_id: 'owner-01',
  establishment_id: 'est-01',
  establishment_name: 'Loja Principal Luanda',
  cloud_url: 'http://localhost:3000'
};

const saved = pairing.savePairingCredentials(testCreds);
assert.strictEqual(saved.access_token, testCreds.access_token, 'Token deve ser persistido');
assert.strictEqual(pairing.isPaired(), true, 'Dispositivo deve constar como emparelhado');
console.log('✓ Armazenamento seguro de credenciais e tokens: OK');

// 4. Validação de Token
assert.strictEqual(pairing.validateClientToken('FATUR_SEC_TOKEN_ABC123XYZ'), true, 'Token correto deve ser validado');
assert.strictEqual(pairing.validateClientToken('TOKEN_ERRADO'), false, 'Token inválido deve ser rejeitado');
console.log('✓ Validação de token de terminal: OK');

console.log(' TODOS OS TESTES DE EMPARELHAMENTO PASSARAM!\n');
