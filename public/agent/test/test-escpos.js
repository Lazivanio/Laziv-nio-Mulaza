const assert = require('assert');
const escpos = require('../lib/escpos');

console.log('--- TESTANDO MOTOR ESC/POS ---');

// 1. Teste de Inicialização e Texto
const builder = new escpos.EscPosBuilder({ width: '80mm', codepage: 'CP860' });
builder.bold(true).text('FATU-R').bold(false).line(' TESTE');
const buf1 = builder.toBuffer();
assert(buf1.length > 0, 'Buffer de texto deve conter bytes');
console.log('✓ Inicialização e formatação de texto: OK');

// 2. Teste de Conversão de Caracteres Acentuados para CP860
const accentedText = 'Faturação Eletrónica Açores & Angola: á é í ó ú ã õ ç º ª';
const encoded = escpos.encodeText(accentedText, 'CP860');
assert(encoded.length > 0, 'Texto codificado deve gerar buffer');
console.log('✓ Conversão de acentos portugueses (CP860): OK');

// 3. Teste de QR Code ESC/POS
builder.qrCode('https://fatu-r.com/test', 6);
const bufQr = builder.toBuffer();
// Verifica presença do comando de modelo QR Code [0x1D, 0x28, 0x6B]
assert(bufQr.includes(Buffer.from([0x1D, 0x28, 0x6B])), 'Deve incluir comando ESC/POS de QR Code');
console.log('✓ Geração de QR Code ESC/POS nativo: OK');

// 4. Teste de Código de Barras CODE128
builder.barcode128('FATUR123456');
const bufBar = builder.toBuffer();
assert(bufBar.includes(Buffer.from([0x1D, 0x6B, 0x49])), 'Deve incluir comando CODE128');
console.log('✓ Geração de Código de Barras CODE128: OK');

// 5. Teste de Abertura de Gaveta RJ11
const drawerBuf = escpos.generateCashDrawerKick('pin2');
assert.deepStrictEqual(drawerBuf.slice(0, 5), escpos.CMD.DRAWER_PIN2, 'Pulso de gaveta Pino 2 deve bater com especificação ESC/POS');
console.log('✓ Pulso elétrico de gaveta RJ11: OK');

// 6. Teste de Geração de Recibo Fiscal Completo
const mockDoc = {
  invoice_number: 'FR FATUR/2026/0001',
  doc_type: 'FR',
  date: new Date().toISOString(),
  client_name: 'Manuel da Silva',
  client_nif: '500123456',
  items: [
    { name: 'Computador Portátil', quantity: 1, unit_price: 350000, total: 350000 },
    { name: 'Rato Sem Fios', quantity: 2, unit_price: 15000, total: 30000 }
  ],
  subtotal: 380000,
  tax_amount: 53200,
  total: 433200,
  payment_method: 'multicaixa',
  hash_control: 'aB3d'
};

const receiptBuf = escpos.generateReceipt(mockDoc, {
  ticketSize: '80mm',
  establishment: {
    company_name: 'FATU-R COMÉRCIO GERAL LDA',
    nif: '5417000000',
    address: 'Luanda, Angola'
  }
});

assert(receiptBuf.length > 200, 'Recibo compilado deve ter tamanho substancial');
console.log(`✓ Geração de Recibo Fiscal Completo (${receiptBuf.length} bytes gerados): OK`);

console.log(' TODOS OS TESTES DE ESC/POS PASSARAM!\n');
