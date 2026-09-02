const assert = require('assert');
const database = require('../lib/database');

console.log('--- TESTANDO FILA PERSISTENTE SQLITE & IDEMPOTÊNCIA ---');

// 1. Inserir Job na Fila
const docId = `TEST-DOC-${Date.now()}`;
const jobData = {
  id: `JOB-TEST-${Date.now()}`,
  document_id: docId,
  printer_id: 'EPSON TM-T20',
  payload: { isTest: true, text: 'Teste Fila' },
  max_attempts: 3
};

const res1 = database.createOrGetJob(jobData);
assert.strictEqual(res1.isDuplicate, false, 'Primeira inserção não deve ser duplicada');
assert.strictEqual(res1.job.status, 'QUEUED', 'Status inicial deve ser QUEUED');
console.log('✓ Inserção de trabalho na fila persistente: OK');

// 2. Testar Idempotência (mesmo document_id não deve duplicar quando concluído)
database.updateJobStatus(jobData.id, 'COMPLETED');
const res2 = database.createOrGetJob({
  id: `JOB-DUP-${Date.now()}`,
  document_id: docId,
  printer_id: 'EPSON TM-T20',
  payload: { isTest: true }
});

assert.strictEqual(res2.isDuplicate, true, 'Job com documento já concluído deve ser identificado como duplicado');
console.log('✓ Idempotência e prevenção de impressão duplicada: OK');

// 3. Testar Transições de Estado e Retry
const retryJobId = `JOB-RETRY-${Date.now()}`;
database.createOrGetJob({
  id: retryJobId,
  document_id: `RETRY-DOC-${Date.now()}`,
  printer_id: 'XPrinter',
  payload: { test: true },
  max_attempts: 3
});

database.updateJobStatus(retryJobId, 'SENDING');
let jobInDb = database.getJobById(retryJobId);
assert.strictEqual(jobInDb.status, 'SENDING', 'Status deve mudar para SENDING');
assert.strictEqual(jobInDb.attempts, 1, 'Contador de tentativas deve incrementar');

// Falha com agendamento de retry
database.updateJobStatus(retryJobId, 'QUEUED', 'Cabo desconectado', 5);
jobInDb = database.getJobById(retryJobId);
assert.strictEqual(jobInDb.status, 'QUEUED', 'Deve voltar a QUEUED após falha temporária');
assert(jobInDb.next_attempt_at !== null, 'Deve ter timestamp de próxima tentativa calculada');
console.log('✓ Transições de estado e cálculo de backoff para retry: OK');

// 4. Testar Estatísticas da Fila
const stats = database.getQueueStats();
assert(typeof stats.total === 'number' && stats.total >= 1, 'Estatísticas de fila devem retornar contadores válidos');
console.log(`✓ Estatísticas de Fila (Total: ${stats.total}, Concluídos: ${stats.completed}, Pendentes: ${stats.pending}): OK`);

console.log(' TODOS OS TESTES DE SQLITE & IDEMPOTÊNCIA PASSARAM!\n');
