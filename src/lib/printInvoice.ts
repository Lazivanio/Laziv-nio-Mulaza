/**
 * printInvoice.ts
 * Utilitário de alta fidelidade para impressão e download de documentos no Fatu-R (A4 e Talões Térmicos POS).
 * 
 * Resolve os problemas de:
 * 1. Folha excessivamente longa ou com imensidão de parte branca em talões térmicos (auto-recorte e @page dinâmico).
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
 * Remove o excesso de margens em branco verticais de um canvas renderizado do talão
 * para que a altura do PDF corresponda estritamente à extensão real do texto/conteúdo.
 */
export function trimCanvasToContent(
  canvas: HTMLCanvasElement,
  options: { topPadding?: number; bottomPadding?: number } = {}
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const topPadding = options.topPadding ?? 10;
  const bottomPadding = options.bottomPadding ?? 24;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Detectar a primeira linha com conteúdo (de cima para baixo)
    let firstContentY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        // Não-transparente e não puramente branco (texto, linhas, logos, qrcodes)
        if (a > 25 && (r < 242 || g < 242 || b < 242)) {
          firstContentY = y;
          break;
        }
      }
      if (firstContentY !== -1) break;
    }

    // Detectar a última linha com conteúdo (de baixo para cima)
    let lastContentY = -1;
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a > 25 && (r < 242 || g < 242 || b < 242)) {
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
            padding: ${is58 ? '8px' : '14px'} !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
            border: 1px solid #e4e4e7 !important;
            box-shadow: none !important;
            border-radius: 6px !important;
            height: auto !important;
            max-height: none !important;
            min-height: auto !important;
            overflow: visible !important;
          }
          .invoice-print *, .invoice-thermal-container * {
            box-sizing: border-box !important;
          }
        `;
        clonedDoc.head.appendChild(styleEl);
      }
    });

    // Recorta qualquer excesso em branco abaixo do rodapé da fatura
    const trimmedCanvas = trimCanvasToContent(canvas, {
      topPadding: 10,
      bottomPadding: 22
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

export function executeInvoicePrint(
  targetElement: HTMLElement | null,
  options: PrintInvoiceOptions
): boolean {
  try {
    options.onBeforePrint?.();

    // Se o elemento não existir, faz fallback padrão
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

    // 3. Normalizar classes para evitar restrições de tela
    if (options.type === 'a4') {
      // Remover restrições de largura fixa e overflow
      clone.classList.remove('w-[800px]', 'min-h-[1123px]', 'overflow-hidden', 'shadow-sm', 'shadow-md', 'border', 'rounded-lg', 'rounded-2xl', 'rounded-3xl');
      clone.classList.add('invoice-a4-clean-render');
    } else {
      clone.classList.remove('shadow-sm', 'border', 'rounded-lg', 'rounded-2xl', 'rounded-3xl');
      clone.classList.add('invoice-thermal-clean-render');
    }

    // 4. Injetar o clone no portal
    portal.innerHTML = '';
    portal.appendChild(clone);

    // 5. Injetar estilos de página dinâmicos (@page) para garantir dimensões exatas na impressora
    let dynamicStyle = document.getElementById('fatur-print-dynamic-style') as HTMLStyleElement;
    if (!dynamicStyle) {
      dynamicStyle = document.createElement('style');
      dynamicStyle.id = 'fatur-print-dynamic-style';
      document.head.appendChild(dynamicStyle);
    }

    const is58 = options.ticketSize === '58mm';
    if (options.type === 'thermal') {
      // Mede altura real computada do elemento clonado ou original em pixels
      const origHeight = targetElement.getBoundingClientRect().height || targetElement.offsetHeight || 0;
      const cloneHeight = clone.getBoundingClientRect().height || clone.offsetHeight || 0;
      const heightPx = Math.max(origHeight, cloneHeight, 180);
      // Converte pixels em mm (1px ~ 0.264583mm) e adiciona margem de respiro de 3mm
      const heightMm = Math.max(35, Math.ceil(heightPx * 0.264583) + 3);
      const widthMm = is58 ? 58 : 80;

      dynamicStyle.textContent = `
        @page {
          size: ${widthMm}mm ${heightMm}mm !important;
          margin: 0mm !important;
        }
      `;
    } else {
      dynamicStyle.textContent = `
        @page {
          size: A4 portrait !important;
          margin: 8mm 8mm 8mm 8mm !important;
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
        // Fallback de limpeza caso o evento afterprint não dispare (ex: cancelamento rápido)
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
