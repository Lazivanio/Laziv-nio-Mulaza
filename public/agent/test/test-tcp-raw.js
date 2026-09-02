const assert = require('assert');
const net = require('net');
const printerManager = require('../lib/printerManager');

console.log('--- TESTANDO COMUNICAÇÃO TCP RAW :9100 ---');

async function runTcpTest() {
  // 1. Criar um servidor TCP local na porta 9105 para simular uma impressora térmica Ethernet
  const TEST_PORT = 9105;
  let receivedBytes = Buffer.alloc(0);

  const mockPrinterServer = net.createServer((socket) => {
    socket.on('data', (chunk) => {
      receivedBytes = Buffer.concat([receivedBytes, chunk]);
    });
  });

  await new Promise((resolve) => mockPrinterServer.listen(TEST_PORT, '127.0.0.1', resolve));
  console.log(`✓ Servidor TCP de teste escutando na porta ${TEST_PORT}`);

  try {
    // 2. Enviar bytes via PrinterManager
    const testPayload = Buffer.from('FATUR ESC/POS TEST TCP RAW', 'utf8');
    const result = await printerManager.printToTcpRaw('127.0.0.1', TEST_PORT, testPayload, 3000);
    
    assert.strictEqual(result.success, true, 'Envio TCP deve retornar sucesso');
    assert.strictEqual(result.bytesWritten, testPayload.length, 'Bytes escritos devem bater com payload');
    
    // Aguardar recepção
    await new Promise(r => setTimeout(r, 200));
    assert(receivedBytes.includes(Buffer.from('FATUR ESC/POS TEST TCP RAW')), 'Servidor TCP deve ter recebido os bytes brutos intactos');
    console.log(`✓ Transmissão TCP RAW real (${result.bytesWritten} bytes entregues no socket): OK`);

    // 3. Testar tratamento de erro (Porta fechada/Offline)
    let caughtError = null;
    try {
      await printerManager.printToTcpRaw('127.0.0.1', 9998, Buffer.from('TEST'), 1000);
    } catch (err) {
      caughtError = err;
    }
    assert(caughtError !== null, 'Tentativa de envio para impressora offline deve lançar erro');
    console.log('✓ Detecção de impressora Ethernet offline / falha de conexão: OK');

  } finally {
    mockPrinterServer.close();
  }

  console.log(' TODOS OS TESTES DE TCP RAW PASSARAM!\n');
}

runTcpTest().catch(err => {
  console.error('Falha no teste TCP:', err);
  process.exit(1);
});
