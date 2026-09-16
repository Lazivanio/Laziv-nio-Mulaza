/**
 * printInvoice.ts
 * Utilitário de alta fidelidade para impressão e download de documentos no Fatu-R (A4 e Talões Térmicos POS).
 * 
 * Resolve os problemas de:
 * 1. Folha excessivamente longa ou com imensidão de parte branca em talões térmicos e faturas FR (auto-recorte e @page dinâmico no tamanho ideal da fatura).
 * 2. Quebra de layout de documentos A4 e Talões causados por estilos conflitantes (@media print inline).
 * 3. Corte de conteúdo por containers do modal (overflow-y-auto, max-h-[85vh], position: fixed, backdrop-blur).
 * 4. Ajuste milimétrico de tamanho de página na impressora física e no download em PDF.
 */

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface PrintInvoiceOptions {
  type: 'a4' | 'thermal';
  ticketSize?: '58mm' | '80mm';
  title?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Remove com precisão o excesso de margens em branco verticais de um canvas renderizado
 * para que a altura do documento/PDF corresponda estritamente à extensão real dos dizeres/conteúdo,
 * ignorando ruídos de bordas, sombras ou fundos claros das bordas exteriores.
 */
export function trimCanvasToContent(
  canvas: HTMLCanvasElement,
  options: { topPadding?: number; bottomPadding?: number } = {}
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const topPadding = options.topPadding ?? 8;
  const bottomPadding = options.bottomPadding ?? 18;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Descartamos 6% das extremidades laterais (mínimo 10px) para ignorar
    // qualquer linha de contorno/borda externa do container no scan vertical
    const sideMargin = Math.max(10, Math.floor(width * 0.06));
    const scanLeft = sideMargin;
    const scanRight = width - sideMargin;

    // Detectar a primeira linha com conteúdo real (de cima para baixo)
    let firstContentY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = scanLeft; x < scanRight; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        // Conteúdo real (texto, números, qrcodes, linhas divisórias escuras):
        // Ignora pixels quase brancos ou cinzas muito sutis (>218)
        if (a > 35 && (r < 218 || g < 218 || b < 218)) {
          firstContentY = y;
          break;
        }
      }
      if (firstContentY !== -1) break;
    }

    // Detectar a última linha com conteúdo real (de baixo para cima)
    let lastContentY = -1;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = scanLeft; x < scanRight; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a > 35 && (r < 218 || g < 218 || b < 218)) {
          lastContentY = y;
          break;
        }
      }
      if (lastContentY !== -1) break;
    }

    if (firstContentY === -1 || lastContentY === -1 || lastContentY <= firstContentY) {
      return canvas;
    }

    const startY = Math.max(0, firstContentY - topPadding);
    const endY = Math.min(height, lastContentY + bottomPadding);
    const trimmedHeight = endY - startY;

    if (trimmedHeight <= 0 || (startY === 0 && endY === height)) {
      return canvas;
    }

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = width;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return canvas;

    trimmedCtx.fillStyle = '#ffffff';
    trimmedCtx.fillRect(0, 0, width, trimmedHeight);
    trimmedCtx.drawImage(
      canvas,
      0, startY, width, trimmedHeight,
      0, 0, width, trimmedHeight
    );

    return trimmedCanvas;
  } catch (e) {
    console.warn('Erro ao recortar margens do canvas:', e);
    return canvas;
  }
}

/**
 * Gera e descarrega um arquivo PDF do talão térmico com altura calculada exatamente
 * a partir do conteúdo existente, eliminando espaços em branco residuais ("tamanho ideal").
 */
export async function downloadThermalInvoicePdf(
  targetElement: HTMLElement | null,
  options: {
    ticketSize?: '58mm' | '80mm';
    filename?: string;
  } = {}
): Promise<boolean> {
  if (!targetElement) return false;

  const is58 = options.ticketSize === '58mm';
  const targetMmWidth = is58 ? 58 : 80;
  const pixelWidth = is58 ? 220 : 300;

  try {
    const canvas = await html2canvas(targetElement, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: is58 ? 260 : 360,
      onclone: (clonedDoc) => {
        const styleEl = clonedDoc.createElement('style');
        styleEl.textContent = `
          .invoice-print, .invoice-thermal-container {
            box-sizing: border-box !important;
            width: ${pixelWidth}px !important;
            max-width: ${pixelWidth}px !important;
            min-width: ${pixelWidth}px !important;
            padding: ${is58 ? '8px 8px 12px 8px' : '12px 12px 16px 12px'} !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .invoice-print *, .invoice-thermal-container * {
            box-sizing: border-box !important;
          }
        `;
        clonedDoc.head.appendChild(styleEl);
      }
    });

    // Recorta estritamente qualquer excesso em branco abaixo do rodapé da fatura
    const trimmedCanvas = trimCanvasToContent(canvas, {
      topPadding: 8,
      bottomPadding: 16
    });

    const imgData = trimmedCanvas.toDataURL('image/png');
    const pdfWidth = targetMmWidth;
    // Altura proporcional exata em milímetros sem espaços vazios
    const rawHeight = (trimmedCanvas.height * pdfWidth) / trimmedCanvas.width;
    const pdfHeight = Math.max(30, Math.round(rawHeight * 10) / 10);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(options.filename || 'FATURA.pdf');
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF do talão térmico:', err);
    return false;
  }
}

/**
 * Gera e descarrega um arquivo PDF de fatura A4 / formal (FR, FT, RC, etc.)
 * ajustando a altura da folha ao tamanho ideal do conteúdo, evitando a "imensidão de folha branca"
 * desnecessária abaixo dos dizeres da fatura.
 */
export async function downloadA4InvoicePdf(
  targetElement: HTMLElement | null,
  options: {
    filename?: string;
    fitToContent?: boolean;
  } = {}
): Promise<boolean> {
  if (!targetElement) return false;

  const fitToContent = options.fitToContent ?? true;

  try {
    const canvas = await html2canvas(targetElement, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 850,
      onclone: (clonedDoc) => {
        const styleEl = clonedDoc.createElement('style');
        styleEl.textContent = `
          .invoice-a4-container, .invoice-print {
            box-sizing: border-box !important;
            width: 800px !important;
            max-width: 800px !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
            background-color: #ffffff !important;
            overflow: visible !important;
            padding: 24px 32px !important;
            margin: 0 auto !important;
          }
          .invoice-a4-container *, .invoice-print * {
            box-sizing: border-box !important;
          }
        `;
        clonedDoc.head.appendChild(styleEl);

        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach(style => {
          if (style.textContent) {
            style.textContent = style.textContent
              .replace(/oklab\([^)]+\)/g, '#000')
              .replace(/oklch\([^)]+\)/g, '#000')
              .replace(/color-mix\([^)]+\)/g, '#000')
              .replace(/light-dark\([^)]+\)/g, '#000');
          }
        });
      }
    });

    const trimmedCanvas = trimCanvasToContent(canvas, {
      topPadding: 16,
      bottomPadding: 24
    });

    const imgData = trimmedCanvas.toDataURL('image/png');
    const pdfWidth = 210; // Largura A4 padrão em mm
    const rawHeightMm = (trimmedCanvas.height * pdfWidth) / trimmedCanvas.width;
    
    // Se fitToContent for true, calcula a altura ideal do documento para não sobrar folha vazia
    const pdfHeight = fitToContent
      ? Math.max(50, Math.round(rawHeightMm * 10) / 10)
      : 297;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(options.filename || 'FATURA_A4.pdf');
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF da fatura A4:', err);
    return false;
  }
}

export function executeInvoicePrint(
  targetElement: HTMLElement | null,
  options: PrintInvoiceOptions
): boolean {
  try {
    options.onBeforePrint?.();

    if (!targetElement) {
      window.print();
      return true;
    }

    // 1. Obter ou criar o portal de impressão isolado no topo do <body>
    let portal = document.getElementById('fatur-print-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'fatur-print-portal';
      document.body.appendChild(portal);
    }

    // 2. Criar um clone limpo do elemento alvo
    const clone = targetElement.cloneNode(true) as HTMLElement;

    // Remover botões de ação e elementos no-print
    const noPrintItems = clone.querySelectorAll('.no-print, button, input, select');
    noPrintItems.forEach(el => el.remove());

    // Se houver elementos canvas, copiar os dados desenhados
    const originalCanvases = targetElement.querySelectorAll('canvas');
    const clonedCanvases = clone.querySelectorAll('canvas');
    originalCanvases.forEach((origCanvas, idx) => {
      const clonedCanvas = clonedCanvases[idx];
      if (clonedCanvas) {
        const ctx = clonedCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(origCanvas, 0, 0);
        }
      }
    });

    // 3. Normalizar classes para evitar restrições de tela e remover sombras/bordas
    if (options.type === 'a4') {
      clone.classList.remove('w-[800px]', 'min-h-[1123px]', 'overflow-hidden', 'shadow-sm', 'shadow-md', 'border', 'rounded-lg', 'rounded-2xl', 'rounded-3xl');
      clone.classList.add('invoice-a4-clean-render');
    } else {
      clone.classList.remove('shadow-sm', 'border', 'rounded-lg', 'rounded-2xl', 'rounded-3xl');
      clone.classList.add('invoice-thermal-clean-render');
    }

    // Forçar dimensões limpas sem altura mínima fixa
    clone.style.height = 'auto';
    clone.style.minHeight = '0';
    clone.style.maxHeight = 'none';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';

    // 4. Injetar o clone no portal
    portal.innerHTML = '';
    portal.appendChild(clone);

    // 5. Injetar estilos de página dinâmicos (@page) para garantir dimensões exatas na impressora ("tamanho ideal")
    let dynamicStyle = document.getElementById('fatur-print-dynamic-style') as HTMLStyleElement;
    if (!dynamicStyle) {
      dynamicStyle = document.createElement('style');
      dynamicStyle.id = 'fatur-print-dynamic-style';
      document.head.appendChild(dynamicStyle);
    }

    const is58 = options.ticketSize === '58mm';
    if (options.type === 'thermal') {
      const origHeight = targetElement.getBoundingClientRect().height || targetElement.offsetHeight || 0;
      const cloneHeight = clone.scrollHeight || clone.offsetHeight || 0;
      const heightPx = Math.max(origHeight, cloneHeight, 160);
      // Converte pixels em mm (1px ~ 0.264583mm) e adiciona respiro mínimo de 3mm
      const heightMm = Math.max(35, Math.ceil(heightPx * 0.264583) + 4);
      const widthMm = is58 ? 58 : 80;

      dynamicStyle.textContent = `
        @page {
          size: ${widthMm}mm ${heightMm}mm !important;
          margin: 0mm !important;
        }
      `;
    } else {
      // Para A4: ajusta dinamicamente a altura ao tamanho ideal do conteúdo
      const cloneHeight = clone.scrollHeight || clone.offsetHeight || 0;
      const heightMm = Math.min(297, Math.max(60, Math.ceil(cloneHeight * 0.264583) + 6));

      dynamicStyle.textContent = `
        @page {
          size: 210mm ${heightMm}mm !important;
          margin: 4mm 4mm 4mm 4mm !important;
        }
      `;
    }

    // 6. Ativar classes de estado no body
    const docClass = options.type === 'thermal' ? 'print-mode-thermal' : 'print-mode-a4';
    const sizeClass = is58 ? 'print-size-58' : 'print-size-80';
    document.body.classList.add('printing-via-portal', docClass, sizeClass);

    // Salvar e ajustar título da página para que o cabeçalho/PDF do navegador tenha o nome correto
    const originalTitle = document.title;
    if (options.title) {
      document.title = options.title.replace(/[\/\\]/g, '_');
    }

    // 7. Disparar a impressão após o browser computar o DOM do portal
    setTimeout(() => {
      let isCleanedUp = false;
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        if (portal) portal.innerHTML = '';
        document.body.classList.remove('printing-via-portal', docClass, sizeClass);
        document.title = originalTitle;
        if (dynamicStyle) dynamicStyle.textContent = '';
        
        window.removeEventListener('afterprint', cleanup);
        options.onAfterPrint?.();
      };

      window.addEventListener('afterprint', cleanup);

      try {
        window.print();
      } catch (err) {
        console.error("Erro ao invocar window.print():", err);
      } finally {
        setTimeout(cleanup, 2500);
      }
    }, 120);

    return true;
  } catch (error) {
    console.error("Falha ao executar impressão isolada:", error);
    window.print();
    return false;
  }
}
