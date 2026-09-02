/**
 * MOTOR ESC/POS PROFISSIONAL - FATU-R HARDWARE AGENT
 * 
 * Gera comandos binários ESC/POS puros para impressoras térmicas físicas de retalho (58mm e 80mm).
 * Suporta formatação de texto, alinhamento, cortes, códigos de barras, QR Code ESC/POS nativo,
 * pulsos de abertura de gaveta RJ11 (12V/24V) e conversão de caracteres acentuados para CP860/CP850.
 */

// Comandos ESC/POS Padrão
const CMD = {
  INIT: Buffer.from([0x1B, 0x40]), // ESC @ - Inicializar impressora
  ALIGN_LEFT: Buffer.from([0x1B, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: Buffer.from([0x1B, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: Buffer.from([0x1B, 0x61, 0x02]), // ESC a 2
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]), // ESC E 0
  UNDERLINE_ON: Buffer.from([0x1B, 0x2D, 0x01]), // ESC - 1
  UNDERLINE_OFF: Buffer.from([0x1B, 0x2D, 0x00]), // ESC - 0
  INVERT_ON: Buffer.from([0x1D, 0x42, 0x01]), // GS B 1
  INVERT_OFF: Buffer.from([0x1D, 0x42, 0x00]), // GS B 0
  
  // Tamanho de Fonte
  FONT_NORMAL: Buffer.from([0x1D, 0x21, 0x00]), // GS ! 0
  FONT_DOUBLE_HEIGHT: Buffer.from([0x1D, 0x21, 0x01]), // GS ! 1
  FONT_DOUBLE_WIDTH: Buffer.from([0x1D, 0x21, 0x10]), // GS ! 16
  FONT_DOUBLE_BOTH: Buffer.from([0x1D, 0x21, 0x11]), // GS ! 17
  
  // Tabela de Caracteres / Codepages
  CODEPAGE_CP437: Buffer.from([0x1B, 0x74, 0x00]), // ESC t 0 (USA / Padrão)
  CODEPAGE_CP850: Buffer.from([0x1B, 0x74, 0x02]), // ESC t 2 (Multilingual Latin I)
  CODEPAGE_CP860: Buffer.from([0x1B, 0x74, 0x03]), // ESC t 3 (Portuguese)
  CODEPAGE_WPC1252: Buffer.from([0x1B, 0x74, 0x10]), // ESC t 16 (Windows-1252)
  
  // Alimentação e Corte de Papel
  FEED_3: Buffer.from([0x1B, 0x64, 0x03]), // ESC d 3 (Avançar 3 linhas)
  FEED_5: Buffer.from([0x1B, 0x64, 0x05]), // ESC d 5 (Avançar 5 linhas)
  CUT_FULL: Buffer.from([0x1D, 0x56, 0x00]), // GS V 0 (Corte Total)
  CUT_PARTIAL: Buffer.from([0x1D, 0x56, 0x01]), // GS V 1 (Corte Parcial)
  CUT_FEED: Buffer.from([0x1D, 0x56, 0x42, 0x00]), // GS V 'B' 0 (Avança e corta)
  
  // Gaveta de Dinheiro RJ11
  DRAWER_PIN2: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]), // ESC p 0 25 250 (Pino 2)
  DRAWER_PIN5: Buffer.from([0x1B, 0x70, 0x01, 0x19, 0xFA]), // ESC p 1 25 250 (Pino 5)
  DRAWER_BEMATECH: Buffer.from([0x1B, 0x76, 0x8C]) // Bematech specific pulse
};

/**
 * Tabela de conversão de acentos em português para CP860 (Português de Portugal / Angola / Brasil)
 */
const CP860_MAP = {
  'á': 0xA0, 'à': 0x85, 'ã': 0x84, 'â': 0x83, 'é': 0x82, 'ê': 0x88, 'í': 0x8D,
  'ó': 0x97, 'ô': 0x93, 'õ': 0x94, 'ú': 0x96, 'ç': 0x87,
  'Á': 0x41, 'À': 0x41, 'Ã': 0x8E, 'Â': 0x41, 'É': 0x90, 'Ê': 0x45, 'Í': 0x49,
  'Ó': 0x4F, 'Ô': 0x4F, 'Õ': 0x99, 'Ú': 0x55, 'Ç': 0x80,
  'º': 0xA7, 'ª': 0xA6, '€': 0xD5, '§': 0x15
};

/**
 * Converte string para bytes com codificação segura para a impressora térmica
 */
function encodeText(text, codepage = 'CP860') {
  if (!text) return Buffer.alloc(0);
  const str = String(text);
  const bytes = [];
  
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);
    
    if (code < 128) {
      bytes.push(code);
    } else if (codepage === 'CP860' && CP860_MAP[ch] !== undefined) {
      bytes.push(CP860_MAP[ch]);
    } else {
      // Normalização / Transliteração de fallback para caracteres não suportados na codepage
      const normalized = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalized.length > 0 && normalized.charCodeAt(0) < 128) {
        bytes.push(normalized.charCodeAt(0));
      } else {
        bytes.push(0x20); // Espaço
      }
    }
  }
  
  return Buffer.from(bytes);
}

/**
 * Construtor Fluente de Comandos ESC/POS
 */
class EscPosBuilder {
  constructor(options = {}) {
    this.width = options.width === '58mm' ? 32 : 48; // Colunas por linha (58mm = 32 col, 80mm = 48 col)
    this.codepage = options.codepage || 'CP860';
    this.buffers = [];
    
    // Inicialização
    this.raw(CMD.INIT);
    if (this.codepage === 'CP860') {
      this.raw(CMD.CODEPAGE_CP860);
    } else if (this.codepage === 'CP850') {
      this.raw(CMD.CODEPAGE_CP850);
    } else {
      this.raw(CMD.CODEPAGE_CP437);
    }
  }

  raw(buf) {
    if (Buffer.isBuffer(buf)) {
      this.buffers.push(buf);
    } else if (Array.isArray(buf)) {
      this.buffers.push(Buffer.from(buf));
    }
    return this;
  }

  align(alignment = 'left') {
    if (alignment === 'center') this.raw(CMD.ALIGN_CENTER);
    else if (alignment === 'right') this.raw(CMD.ALIGN_RIGHT);
    else this.raw(CMD.ALIGN_LEFT);
    return this;
  }

  bold(enabled = true) {
    this.raw(enabled ? CMD.BOLD_ON : CMD.BOLD_OFF);
    return this;
  }

  underline(enabled = true) {
    this.raw(enabled ? CMD.UNDERLINE_ON : CMD.UNDERLINE_OFF);
    return this;
  }

  invert(enabled = true) {
    this.raw(enabled ? CMD.INVERT_ON : CMD.INVERT_OFF);
    return this;
  }

  fontSize(size = 'normal') {
    if (size === 'double_both') this.raw(CMD.FONT_DOUBLE_BOTH);
    else if (size === 'double_width') this.raw(CMD.FONT_DOUBLE_WIDTH);
    else if (size === 'double_height') this.raw(CMD.FONT_DOUBLE_HEIGHT);
    else this.raw(CMD.FONT_NORMAL);
    return this;
  }

  text(textStr = '') {
    this.raw(encodeText(textStr, this.codepage));
    return this;
  }

  line(textStr = '') {
    this.text(textStr);
    this.raw(Buffer.from([0x0A])); // \n
    return this;
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.raw(Buffer.from([0x0A]));
    }
    return this;
  }

  separator(char = '-') {
    const sep = char.repeat(this.width);
    this.line(sep);
    return this;
  }

  doubleSeparator() {
    return this.separator('=');
  }

  /**
   * Imprime duas colunas alinhadas: esquerda e direita (ex: "TOTAL           Kz 1.500")
   */
  twoColumns(leftText, rightText) {
    const left = String(leftText || '');
    const right = String(rightText || '');
    const available = this.width - left.length - right.length;
    
    if (available > 0) {
      this.line(left + ' '.repeat(available) + right);
    } else {
      // Se estourar a largura da linha, quebra de forma elegante
      this.line(left);
      this.align('right').line(right).align('left');
    }
    return this;
  }

  /**
   * Imprime linha de item com formatação de tabela:
   * Qtd x Preço no lado esquerdo/meio e Total no lado direito
   */
  itemLine(name, qty, unitPrice, totalAmount) {
    this.bold(true).line(name).bold(false);
    const details = `  ${qty} x ${unitPrice.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
    const total = `${totalAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
    this.twoColumns(details, total);
    return this;
  }

  /**
   * Gera comando de QR Code nativo ESC/POS
   */
  qrCode(dataStr, size = 6) {
    if (!dataStr) return this;
    const qrData = Buffer.from(dataStr, 'utf8');
    const len = qrData.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    // 1. Definir Modelo 2 de QR Code (GS ( k 4 0 49 65 50 0)
    this.raw([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    
    // 2. Definir Tamanho do Módulo (1 a 16)
    const clampedSize = Math.max(1, Math.min(16, size));
    this.raw([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, clampedSize]);
    
    // 3. Definir Nível de Correção de Erros (48 = L 7%, 49 = M 15%, 50 = Q 25%, 51 = H 30%)
    this.raw([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]); // Nível M
    
    // 4. Armazenar dados no buffer do QR Code (GS ( k pL pH 49 80 48 <dados>)
    this.raw([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
    this.raw(qrData);
    
    // 5. Imprimir QR Code do buffer (GS ( k 3 0 49 81 48)
    this.raw([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
    return this;
  }

  /**
   * Gera Código de Barras CODE128 nativo ESC/POS
   */
  barcode128(dataStr, height = 64) {
    if (!dataStr) return this;
    const cleanData = String(dataStr).trim();
    const dataBuf = Buffer.from(cleanData, 'ascii');
    
    // Altura do código de barras (GS h n)
    this.raw([0x1D, 0x68, Math.max(20, Math.min(255, height))]);
    // Largura do módulo (GS w 2)
    this.raw([0x1D, 0x77, 0x02]);
    // Posição do texto legível abaixo (GS H 2)
    this.raw([0x1D, 0x48, 0x02]);
    // Imprimir CODE128 (GS k 73 <len> <dados>)
    this.raw([0x1D, 0x6B, 0x49, dataBuf.length]);
    this.raw(dataBuf);
    return this;
  }

  /**
   * Dispara o pulso elétrico para abrir a gaveta de dinheiro
   */
  cashDrawer(pin = 'pin2') {
    if (pin === 'pin5') {
      this.raw(CMD.DRAWER_PIN5);
    } else if (pin === 'bematech') {
      this.raw(CMD.DRAWER_BEMATECH);
    } else {
      this.raw(CMD.DRAWER_PIN2);
    }
    return this;
  }

  /**
   * Corta o papel e avança
   */
  cut(partial = false) {
    this.feed(3);
    this.raw(partial ? CMD.CUT_PARTIAL : CMD.CUT_FULL);
    return this;
  }

  /**
   * Retorna o buffer binário compilado final
   */
  toBuffer() {
    return Buffer.concat(this.buffers);
  }
}

/**
 * Gera os bytes ESC/POS de um recibo / documento fiscal do Fatu-R
 */
function generateReceipt(document, options = {}) {
  const width = options.width || (options.ticketSize === '58mm' ? '58mm' : '80mm');
  const codepage = options.codepage || 'CP860';
  const builder = new EscPosBuilder({ width, codepage });
  
  const doc = document || {};
  const establishment = options.establishment || doc.establishment || {};
  const items = Array.isArray(doc.items) 
    ? doc.items 
    : (typeof doc.items === 'string' ? JSON.parse(doc.items || '[]') : []);

  // 1. Se solicitado abertura de gaveta no pagamento em dinheiro
  if (options.openDrawer) {
    builder.cashDrawer(options.drawerPin || 'pin2');
  }

  // 2. Cabeçalho da Empresa
  builder.align('center');
  builder.fontSize('double_both').bold(true);
  builder.line(establishment.company_name || establishment.name || 'FATU-R POS');
  builder.fontSize('normal').bold(false);

  if (establishment.trading_name && establishment.trading_name !== establishment.company_name) {
    builder.line(establishment.trading_name);
  }
  if (establishment.nif) {
    builder.line(`NIF: ${establishment.nif}`);
  }
  if (establishment.address) {
    builder.line(establishment.address);
  }
  if (establishment.phone) {
    builder.line(`Tel: ${establishment.phone}`);
  }
  
  builder.feed(1);
  builder.doubleSeparator();

  // 3. Detalhes do Documento Fiscal
  builder.align('center').bold(true);
  const docTypeName = doc.doc_type === 'FR' ? 'FATURA RECIBO' :
                      doc.doc_type === 'FT' ? 'FATURA' :
                      doc.doc_type === 'FS' ? 'FATURA SIMPLIFICADA' :
                      doc.doc_type === 'VD' ? 'VENDA A DINHEIRO' :
                      doc.doc_type === 'NC' ? 'NOTA DE CRÉDITO' :
                      doc.doc_type === 'ND' ? 'NOTA DE DÉBITO' :
                      'DOCUMENTO DE VENDA';
  builder.line(docTypeName);
  builder.fontSize('double_height');
  builder.line(doc.invoice_number || `DOC-${doc.id || '000001'}`);
  builder.fontSize('normal').bold(false);
  
  const docDate = doc.date ? new Date(doc.date).toLocaleString('pt-PT') : new Date().toLocaleString('pt-PT');
  builder.line(`Data/Hora: ${docDate}`);

  if (doc.cash_register_name) {
    builder.line(`Caixa: ${doc.cash_register_name}`);
  }
  if (doc.operator_name || doc.seller_name) {
    builder.line(`Operador: ${doc.operator_name || doc.seller_name}`);
  }

  // 4. Dados do Cliente
  if (doc.client_name || doc.client_nif) {
    builder.separator('-');
    builder.align('left');
    builder.bold(true).line('CLIENTE:').bold(false);
    builder.line(`Nome: ${doc.client_name || 'Consumidor Final'}`);
    if (doc.client_nif) {
      builder.line(`NIF: ${doc.client_nif}`);
    }
  }

  builder.separator('-');

  // 5. Itens Vendidos
  builder.align('left');
  builder.bold(true).twoColumns('ARTIGO / QTD x PRECO', 'TOTAL (Kz)').bold(false);
  builder.separator('-');

  let totalItemsCount = 0;
  items.forEach(item => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.unit_price || item.price || 0);
    const lineTotal = Number(item.total || (qty * price));
    totalItemsCount += qty;

    builder.itemLine(item.name || item.description || 'Artigo', qty, price, lineTotal);
  });

  builder.separator('-');

  // 6. Totais e Impostos
  builder.align('left');
  const subtotal = Number(doc.subtotal || doc.total || 0);
  const tax = Number(doc.tax_amount || doc.tax || 0);
  const discount = Number(doc.discount_amount || doc.discount || 0);
  const grandTotal = Number(doc.total || (subtotal + tax - discount));

  if (discount > 0) {
    builder.twoColumns('Desconto:', `- Kz ${discount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
  }
  if (tax > 0) {
    builder.twoColumns('IVA Total:', `Kz ${tax.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
  }
  
  builder.feed(1);
  builder.fontSize('double_both').bold(true);
  builder.twoColumns('TOTAL:', `Kz ${grandTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
  builder.fontSize('normal').bold(false);
  builder.doubleSeparator();

  // 7. Formas de Pagamento
  builder.align('left');
  const paymentMethodName = doc.payment_method === 'cash' ? 'Dinheiro' :
                            doc.payment_method === 'multicaixa' ? 'Multicaixa / TPA' :
                            doc.payment_method === 'transfer' ? 'Transferência' :
                            doc.payment_method === 'credit' ? 'Conta Corrente' :
                            (doc.payment_method || 'Numerário');
  builder.twoColumns('Forma de Pagamento:', paymentMethodName);
  
  if (doc.amount_paid && doc.amount_paid > grandTotal) {
    const change = Number(doc.amount_paid) - grandTotal;
    builder.twoColumns('Valor Entregue:', `Kz ${Number(doc.amount_paid).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
    builder.twoColumns('Troco:', `Kz ${change.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`);
  }

  // 8. Hash Fiscal & QR Code AGT (se houver)
  builder.feed(1);
  builder.align('center');
  
  if (doc.hash_control) {
    builder.line(`Hash: ${doc.hash_control}`);
  }

  const qrPayload = doc.qr_code_data || 
    (doc.invoice_number ? `${establishment.nif || '999999999'}*${doc.invoice_number}*${grandTotal.toFixed(2)}*${doc.hash_control || 'FATUR'}` : null);

  if (qrPayload) {
    builder.qrCode(qrPayload, width === '58mm' ? 4 : 6);
    builder.feed(1);
  }

  // 9. Rodapé e Mensagem de Certificação
  builder.line('Processado por Programa Validado nº 000/AGT/2026');
  builder.line('FATU-R Cloud & POS Engine');
  builder.feed(1);
  builder.bold(true).line('Obrigado pela sua preferência!').bold(false);

  // 10. Corte do Papel
  builder.cut();

  return builder.toBuffer();
}

/**
 * Gera documento de teste real completo
 */
function generateTestReceipt(printerInfo = {}, options = {}) {
  const width = options.width || '80mm';
  const codepage = options.codepage || 'CP860';
  const builder = new EscPosBuilder({ width, codepage });

  builder.align('center');
  builder.fontSize('double_both').bold(true);
  builder.line('FATU-R');
  builder.fontSize('normal').bold(false);
  builder.line('TESTE DE IMPRESSÃO REAL');
  builder.doubleSeparator();

  builder.align('left');
  builder.line(`Impressora: ${printerInfo.name || 'Padrão'}`);
  builder.line(`Interface: ${printerInfo.interface || 'Windows Spooler'}`);
  builder.line(`Codepage: ${codepage}`);
  builder.line(`Data/Hora: ${new Date().toLocaleString('pt-PT')}`);
  builder.separator('-');

  builder.line('Texto Normal: OK');
  builder.bold(true).line('Texto Negrito: OK').bold(false);
  builder.underline(true).line('Texto Sublinhado: OK').underline(false);
  builder.invert(true).line(' TEXTO INVERTIDO: OK ').invert(false);
  builder.line('Acentuação: Á É Í Ó Ú ã õ ç º ª');
  builder.separator('-');

  builder.align('center');
  builder.line('Teste de QR Code:');
  builder.qrCode('https://fatu-r.com/hardware-verified', width === '58mm' ? 4 : 6);
  builder.feed(1);

  builder.line('Teste de Código de Barras:');
  builder.barcode128('FATUR123456', 50);
  builder.feed(1);

  builder.doubleSeparator();
  builder.bold(true).line('TESTE CONCLUÍDO COM SUCESSO').bold(false);
  builder.line('FATU-R Hardware Agent v2.0');
  builder.cut();

  return builder.toBuffer();
}

/**
 * Gera comando direto de abertura de gaveta (apenas o pulso elétrico puro)
 */
function generateCashDrawerKick(pin = 'pin2') {
  if (pin === 'pin5') {
    return CMD.DRAWER_PIN5;
  } else if (pin === 'bematech') {
    return CMD.DRAWER_BEMATECH;
  }
  return CMD.DRAWER_PIN2;
}

module.exports = {
  EscPosBuilder,
  generateReceipt,
  generateTestReceipt,
  generateCashDrawerKick,
  encodeText,
  CMD
};
