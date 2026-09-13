import React, { useState, useEffect, useRef, useMemo } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { 
  Barcode, 
  Printer, 
  Download, 
  Search, 
  CheckSquare, 
  Square, 
  FileText, 
  Layers, 
  Check, 
  ScanLine, 
  ArrowLeft, 
  AlertCircle,
  Hash,
  SlidersHorizontal,
  Copy,
  Tag
} from 'lucide-react';
import { Product } from '../types';
import { executeInvoicePrint } from '../lib/printInvoice';

interface ProductLabelsViewProps {
  products: Product[];
  establishment: any;
  onBackToProducts?: () => void;
}

type BarcodeMode = 'barcode' | 'internal_id' | 'sku_format';
type LabelSize = 'standard' | 'compact' | 'large' | 'shelf';
type PaperType = 'a4_grid' | 'thermal_roll';

export const ProductLabelsView: React.FC<ProductLabelsViewProps> = ({
  products,
  establishment,
  onBackToProducts
}) => {
  // Filtros de busca
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Configurações da etiqueta (Padrão: Código de Barras Numérico do Produto)
  const [barcodeMode, setBarcodeMode] = useState<BarcodeMode>('barcode');
  const [labelSize, setLabelSize] = useState<LabelSize>('standard');
  const [paperType, setPaperType] = useState<PaperType>('a4_grid');
  const [showPrice, setShowPrice] = useState(true);
  const [showEstablishmentName, setShowEstablishmentName] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showInternalCode, setShowInternalCode] = useState(false);
  
  // Seleção e quantidades
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [labelQuantities, setLabelQuantities] = useState<Record<number, number>>({});
  
  // Testador de Scanner
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [scannedMatch, setScannedMatch] = useState<Product | null>(null);
  const [scannerFeedback, setScannerFeedback] = useState<string | null>(null);
  
  // Estado de download/impressão
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const printBatchContainerRef = useRef<HTMLDivElement>(null);

  // Inicializar seleção padrão com todos os produtos
  useEffect(() => {
    if (products.length > 0 && selectedProductIds.size === 0) {
      setSelectedProductIds(new Set(products.map(p => p.id)));
      const initialQty: Record<number, number> = {};
      products.forEach(p => {
        initialQty[p.id] = 1;
      });
      setLabelQuantities(initialQty);
    }
  }, [products]);

  // Lista de categorias únicas
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Produtos filtrados
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchCategory;
      
      const matchName = p.name.toLowerCase().includes(q);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
      const matchId = p.id.toString() === q || 
        p.id.toString().padStart(4, '0') === q ||
        `#${p.id}` === q ||
        `prd-${p.id}`.toLowerCase() === q;
      
      return matchCategory && (matchName || matchBarcode || matchId);
    });
  }, [products, searchQuery, selectedCategory]);

  // Obter valor codificado no código de barras conforme o modo escolhido
  const getBarcodeValue = (product: Product, mode: BarcodeMode = 'barcode'): string => {
    switch (mode) {
      case 'barcode': {
        // Código de barras numérico cadastrado no produto
        if (product.barcode && product.barcode.trim()) {
          return product.barcode.trim();
        }
        // Fallback numérico padrão de 13 dígitos
        return (5600000000000 + Number(product.id)).toString();
      }
      case 'internal_id':
        return product.id.toString().padStart(6, '0');
      case 'sku_format':
        return `PRD-${product.id.toString().padStart(5, '0')}`;
      default:
        return (product.barcode && product.barcode.trim())
          ? product.barcode.trim()
          : (5600000000000 + Number(product.id)).toString();
    }
  };

  // Alternar seleção de um produto
  const toggleSelectProduct = (productId: number) => {
    const next = new Set(selectedProductIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setSelectedProductIds(next);
  };

  // Selecionar/deselecionar todos os produtos filtrados
  const toggleSelectAll = () => {
    const allFilteredSelected = filteredProducts.every(p => selectedProductIds.has(p.id));
    const next = new Set(selectedProductIds);
    if (allFilteredSelected) {
      filteredProducts.forEach(p => next.delete(p.id));
    } else {
      filteredProducts.forEach(p => next.add(p.id));
    }
    setSelectedProductIds(next);
  };

  // Ajustar quantidade de etiquetas
  const updateQuantity = (productId: number, qty: number) => {
    const safeQty = Math.max(1, Math.min(100, qty || 1));
    setLabelQuantities(prev => ({ ...prev, [productId]: safeQty }));
  };

  // Definir quantidade de todos igual ao stock
  const setQuantitiesToStock = () => {
    const next: Record<number, number> = {};
    products.forEach(p => {
      next[p.id] = Math.max(1, Math.min(100, p.stock || 1));
    });
    setLabelQuantities(next);
  };

  // Resetar todas as quantidades para 1
  const resetQuantitiesToOne = () => {
    const next: Record<number, number> = {};
    products.forEach(p => {
      next[p.id] = 1;
    });
    setLabelQuantities(next);
  };

  // Testador de Leitura da Pistola de Scanner
  const handleScannerInput = (val: string) => {
    setScannerTestInput(val);
    const cleaned = val.trim().toLowerCase();
    if (!cleaned) {
      setScannedMatch(null);
      setScannerFeedback(null);
      return;
    }

    const matched = products.find(p => {
      const idMatch = p.id.toString() === cleaned ||
        p.id.toString().padStart(4, '0') === cleaned ||
        p.id.toString().padStart(6, '0') === cleaned ||
        `prd-${p.id.toString().padStart(5, '0')}`.toLowerCase() === cleaned ||
        `prd-${p.id}`.toLowerCase() === cleaned ||
        `#${p.id}` === cleaned ||
        (5600000000000 + Number(p.id)).toString() === cleaned;
      const barcodeMatch = p.barcode ? p.barcode.trim().toLowerCase() === cleaned : false;
      return barcodeMatch || idMatch;
    });

    if (matched) {
      setScannedMatch(matched);
      const codeDisplay = matched.barcode ? matched.barcode : `#${matched.id}`;
      setScannerFeedback(`✅ Sucesso! Produto identificado: "${matched.name}" (Cód. Barras: ${codeDisplay})`);
    } else {
      setScannedMatch(null);
      setScannerFeedback(`⚠️ Nenhum produto encontrado com o código "${val}".`);
    }
  };

  // Formatar Moeda
  const formatMoney = (amount: number) => {
    return `${amount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  // Estrutura de retorno do gerador de código de barras em alta fidelidade
  interface BarcodeImageData {
    dataUrl: string;
    width: number;
    height: number;
    aspectRatio: number;
  }

  // Gerador de imagem de código de barras em PNG com fundo branco, dimensões naturais e sem distorção
  const generateBarcodeData = (
    value: string,
    opts?: { barWidth?: number; barHeight?: number; fontSize?: number; margin?: number }
  ): BarcodeImageData => {
    try {
      const canvas = document.createElement('canvas');
      const barWidth = opts?.barWidth || 2;
      const barHeight = opts?.barHeight || 50;
      const fontSize = opts?.fontSize || 13;
      const margin = opts?.margin !== undefined ? opts.margin : 6;

      JsBarcode(canvas, value, {
        format: 'CODE128',
        lineColor: '#000000',
        width: barWidth,
        height: barHeight,
        displayValue: true,
        fontSize: fontSize,
        font: 'monospace',
        textMargin: 3,
        margin: margin,
        background: '#ffffff'
      });

      const w = canvas.width || 240;
      const h = canvas.height || 70;
      return {
        dataUrl: canvas.toDataURL('image/png'),
        width: w,
        height: h,
        aspectRatio: w / h
      };
    } catch (err) {
      console.warn(`Erro ao gerar código de barras para "${value}":`, err);
      // Retorna um canvas branco de fallback proporcional
      const fallback = document.createElement('canvas');
      fallback.width = 240;
      fallback.height = 70;
      const ctx = fallback.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 240, 70);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(value, 120, 38);
      }
      return {
        dataUrl: fallback.toDataURL('image/png'),
        width: 240,
        height: 70,
        aspectRatio: 240 / 70
      };
    }
  };

  // Baixar Etiqueta Única em PNG de Alta Resolução Direto (100% Proporcional e Sem Distorção)
  const downloadSingleLabelPng = (product: Product) => {
    try {
      const barcodeValue = getBarcodeValue(product, barcodeMode);
      const bc = generateBarcodeData(barcodeValue, { barWidth: 2.2, barHeight: 56, fontSize: 13 });

      // Canvas em proporção padrão de etiqueta (50x30 -> 600x360 px)
      const width = 600;
      const height = 360;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fundo e borda arredondada nítida
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, width - 12, height - 12);

      let curY = 32;

      // 1. Estabelecimento / Loja
      if (showEstablishmentName) {
        ctx.fillStyle = '#71717a';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((establishment?.name || 'FATU-R ERP').toUpperCase(), width / 2, curY);
        curY += 26;
      }

      // 2. Nome do Produto (em destaque)
      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const prodName = product.name.toUpperCase();
      ctx.fillText(prodName.length > 34 ? prodName.substring(0, 34) + '...' : prodName, width / 2, curY);
      curY += 24;

      // 3. Código de Barra Numérico em Destaque
      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Nº ${barcodeValue}`, width / 2, curY);
      curY += 12;

      // 4. Imagem do Código de Barras (COM ASPECT RATIO PRESERVADO - ZERO DISTORÇÃO)
      const barcodeImg = new Image();
      barcodeImg.onload = () => {
        const maxW = width - 60; // 540px
        const maxH = 135;        // 135px
        let drawW = maxW;
        let drawH = drawW / bc.aspectRatio;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * bc.aspectRatio;
        }
        const drawX = (width - drawW) / 2;

        ctx.drawImage(barcodeImg, drawX, curY, drawW, drawH);
        curY += drawH + 24;

        // 5. Preço de Venda
        if (showPrice) {
          ctx.fillStyle = '#09090b';
          ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(formatMoney(product.price), width / 2, curY);
        }

        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `etiqueta_${product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${barcodeValue}.png`;
        link.href = dataUrl;
        link.click();
      };
      barcodeImg.src = bc.dataUrl;
    } catch (err) {
      console.error('Erro ao baixar etiqueta PNG:', err);
      alert('Não foi possível gerar a etiqueta em PNG.');
    }
  };

  // Baixar Etiqueta Única em PDF Vetorial (100% Proporcional e Sem Distorção)
  const downloadSingleLabelPdf = (product: Product) => {
    try {
      const barcodeValue = getBarcodeValue(product, barcodeMode);
      const bc = generateBarcodeData(barcodeValue, { barWidth: 2, barHeight: 46, fontSize: 11 });

      const labelWidth = 50; // mm
      const labelHeight = 30; // mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [labelWidth, labelHeight]
      });

      let currentY = 3.8;

      if (showEstablishmentName) {
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(120, 120, 120);
        pdf.text((establishment?.name || 'FATU-R').toUpperCase().substring(0, 24), labelWidth / 2, currentY, { align: 'center' });
        currentY += 2.8;
      }

      // Nome do Produto
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 15, 15);
      const splitTitle = pdf.splitTextToSize(product.name.toUpperCase(), labelWidth - 4);
      const titleLines = splitTitle.slice(0, 2);
      pdf.text(titleLines, labelWidth / 2, currentY, { align: 'center' });
      currentY += (titleLines.length * 3.0);

      // Código de Barra Numérico
      pdf.setFontSize(6.5);
      pdf.setFont('courier', 'bold');
      pdf.setTextColor(20, 20, 20);
      pdf.text(`Nº ${barcodeValue}`, labelWidth / 2, currentY, { align: 'center' });
      currentY += 1.2;

      // Código de Barras com Proporção Preservada (Sem Distorção)
      const maxBcW = labelWidth - 6; // 44 mm
      const maxBcH = 11.5;           // 11.5 mm
      let bcW = maxBcW;
      let bcH = bcW / bc.aspectRatio;
      if (bcH > maxBcH) {
        bcH = maxBcH;
        bcW = bcH * bc.aspectRatio;
      }
      const bcX = (labelWidth - bcW) / 2;
      pdf.addImage(bc.dataUrl, 'PNG', bcX, currentY, bcW, bcH);
      currentY += bcH + 2.5;

      // Preço de Venda
      if (showPrice && currentY <= labelHeight - 1.2) {
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text(formatMoney(product.price), labelWidth / 2, currentY, { align: 'center' });
      }

      pdf.save(`etiqueta_${product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${barcodeValue}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF da etiqueta:', err);
      alert('Não foi possível gerar o PDF da etiqueta.');
    }
  };

  // Imprimir Etiqueta Única Direta
  const printSingleLabel = (product: Product) => {
    const cardEl = document.getElementById(`label-preview-${product.id}`);
    if (!cardEl) return;

    executeInvoicePrint(cardEl, {
      type: 'thermal',
      ticketSize: '58mm',
      title: `ETIQUETA_${product.id}_${product.name.substring(0, 15)}`
    });
  };

  // Imprimir Lote de Etiquetas Selecionadas
  const printSelectedBatch = () => {
    const container = printBatchContainerRef.current;
    if (!container) return;

    executeInvoicePrint(container, {
      type: paperType === 'a4_grid' ? 'a4' : 'thermal',
      ticketSize: '80mm',
      title: `ETIQUETAS_${new Date().toISOString().split('T')[0]}`
    });
  };

  // Baixar PDF da Folha Completa (A4 ou Rolo) - Geração Vetorial com Suporte Multi-página
  const downloadBatchPdf = async () => {
    if (batchLabelItems.length === 0) return;

    setIsGeneratingBatch(true);
    try {
      if (paperType === 'a4_grid') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const pageWidth = 210;
        const marginLeft = 8;
        const marginTop = 10;
        const gapX = 3;
        const gapY = 4;
        const cols = 3;
        const rows = 7; // 21 etiquetas por folha A4
        const labelWidth = (pageWidth - (marginLeft * 2) - ((cols - 1) * gapX)) / cols; // ~62.6mm
        const labelHeight = 34;

        let itemIndex = 0;
        while (itemIndex < batchLabelItems.length) {
          if (itemIndex > 0) {
            pdf.addPage('a4', 'portrait');
          }

          for (let row = 0; row < rows && itemIndex < batchLabelItems.length; row++) {
            for (let col = 0; col < cols && itemIndex < batchLabelItems.length; col++) {
              const item = batchLabelItems[itemIndex];
              const x = marginLeft + col * (labelWidth + gapX);
              const y = marginTop + row * (labelHeight + gapY);

              // Borda da etiqueta
              pdf.setDrawColor(215, 220, 225);
              pdf.setFillColor(255, 255, 255);
              pdf.roundedRect(x, y, labelWidth, labelHeight, 2, 2, 'FD');

              let currentY = y + 3.2;

              // 1. Nome do Estabelecimento
              if (showEstablishmentName) {
                pdf.setFontSize(6);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(130, 130, 130);
                const estName = (establishment?.name || 'FATU-R ERP').toUpperCase();
                pdf.text(estName.substring(0, 28), x + labelWidth / 2, currentY, { align: 'center' });
                currentY += 3.0;
              }

              // 2. Nome do Produto
              pdf.setFontSize(7.5);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(20, 20, 20);
              const splitTitle = pdf.splitTextToSize(item.product.name.toUpperCase(), labelWidth - 4);
              const titleLines = splitTitle.slice(0, 2);
              pdf.text(titleLines, x + labelWidth / 2, currentY, { align: 'center' });
              currentY += (titleLines.length * 3.0);

              // 3. Código de Barra Numérico em Destaque
              const barcodeValue = getBarcodeValue(item.product, barcodeMode);
              pdf.setFontSize(6.5);
              pdf.setFont('courier', 'bold');
              pdf.setTextColor(20, 20, 20);
              pdf.text(`Nº ${barcodeValue}`, x + labelWidth / 2, currentY, { align: 'center' });
              currentY += 1.2;

              // 4. Código de Barras (100% Proporcional - Sem Distorção)
              const bc = generateBarcodeData(barcodeValue, { barWidth: 2, barHeight: 40, fontSize: 10 });
              const maxBcW = labelWidth - 6; // ~56mm
              const maxBcH = 11;             // 11mm
              let bcW = maxBcW;
              let bcH = bcW / bc.aspectRatio;
              if (bcH > maxBcH) {
                bcH = maxBcH;
                bcW = bcH * bc.aspectRatio;
              }
              const bcX = x + (labelWidth - bcW) / 2;
              pdf.addImage(bc.dataUrl, 'PNG', bcX, currentY, bcW, bcH);
              currentY += bcH + 1.8;

              // 5. Preço de Venda
              if (showPrice) {
                pdf.setFontSize(8.5);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 0, 0);
                pdf.text(formatMoney(item.product.price), x + labelWidth / 2, currentY + 1.0, { align: 'center' });
              }

              itemIndex++;
            }
          }
        }

        pdf.save(`folha_etiquetas_a4_${establishment?.name || 'produtos'}_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        // Formato Rolo Térmico (1 etiqueta por página, 50mm x 30mm)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [50, 30]
        });

        for (let i = 0; i < batchLabelItems.length; i++) {
          if (i > 0) {
            pdf.addPage([50, 30], 'landscape');
          }

          const item = batchLabelItems[i];
          const barcodeValue = getBarcodeValue(item.product, barcodeMode);
          const bc = generateBarcodeData(barcodeValue, { barWidth: 2, barHeight: 46, fontSize: 11 });

          const labelWidth = 50;
          let currentY = 3.8;

          // Nome do Estabelecimento
          if (showEstablishmentName) {
            pdf.setFontSize(5.5);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(120, 120, 120);
            pdf.text((establishment?.name || 'FATU-R').toUpperCase().substring(0, 24), labelWidth / 2, currentY, { align: 'center' });
            currentY += 2.8;
          }

          // Nome do Produto
          pdf.setFontSize(7.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(10, 10, 10);
          const splitTitle = pdf.splitTextToSize(item.product.name.toUpperCase(), labelWidth - 4);
          const titleLines = splitTitle.slice(0, 2);
          pdf.text(titleLines, labelWidth / 2, currentY, { align: 'center' });
          currentY += (titleLines.length * 3.0);

          // Código de Barra Numérico
          pdf.setFontSize(6.5);
          pdf.setFont('courier', 'bold');
          pdf.setTextColor(20, 20, 20);
          pdf.text(`Nº ${barcodeValue}`, labelWidth / 2, currentY, { align: 'center' });
          currentY += 1.2;

          // Código de Barras (100% Proporcional - Sem Distorção)
          const maxBcW = labelWidth - 6;
          const maxBcH = 11.5;
          let bcW = maxBcW;
          let bcH = bcW / bc.aspectRatio;
          if (bcH > maxBcH) {
            bcH = maxBcH;
            bcW = bcH * bc.aspectRatio;
          }
          const bcX = (labelWidth - bcW) / 2;
          pdf.addImage(bc.dataUrl, 'PNG', bcX, currentY, bcW, bcH);
          currentY += bcH + 2.5;

          // Preço
          if (showPrice) {
            pdf.setFontSize(8.5);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text(formatMoney(item.product.price), labelWidth / 2, currentY, { align: 'center' });
          }
        }

        pdf.save(`etiquetas_termicas_${establishment?.name || 'produtos'}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (err) {
      console.error('Erro ao gerar folha de etiquetas:', err);
      alert('Não foi possível gerar a folha em PDF. Tente novamente.');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Lista expandida de etiquetas conforme quantidades selecionadas
  const batchLabelItems = useMemo(() => {
    const items: Array<{ product: Product; index: number }> = [];
    products.forEach(p => {
      if (selectedProductIds.has(p.id)) {
        const qty = labelQuantities[p.id] || 1;
        for (let i = 0; i < qty; i++) {
          items.push({ product: p, index: i });
        }
      }
    });
    return items;
  }, [products, selectedProductIds, labelQuantities]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-50 overflow-y-auto">
      {/* Header Principal da Sub-rota */}
      <div className="bg-white border-b border-zinc-200 px-6 py-5 sticky top-0 z-20 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            {onBackToProducts && (
              <button
                type="button"
                onClick={onBackToProducts}
                className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-600 transition-colors cursor-pointer"
                title="Voltar à Lista de Produtos"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Barcode size={18} />
                </span>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">Etiquetas com Código de Barras</h2>
                <span className="text-xs font-bold px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-md border border-zinc-200">
                  Sub-rota Etiquetas
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Gere e baixe etiquetas com o código de barras e número interno de cada produto, prontas para leitura pela Pistola de Scanner.
              </p>
            </div>
          </div>

          {/* Ações de Impressão e Baixar Lote */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              type="button"
              onClick={printSelectedBatch}
              disabled={batchLabelItems.length === 0}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer size={16} />
              Imprimir Folha ({batchLabelItems.length})
            </button>

            <button
              type="button"
              onClick={downloadBatchPdf}
              disabled={batchLabelItems.length === 0 || isGeneratingBatch}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download size={16} />
              {isGeneratingBatch ? 'A gerar PDF...' : 'Baixar PDF da Folha'}
            </button>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-4 border-t border-zinc-100">
          {/* Campo de Pesquisa */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar por nome, código de barra ou ID interno..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all"
            />
          </div>

          {/* Filtro por Categoria */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todas as Categorias ({products.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* O que o Scanner Lerá (Modo de Código) */}
          <div className="md:col-span-5 flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200">
            <SlidersHorizontal size={15} className="text-zinc-500 shrink-0" />
            <span className="text-[11px] font-bold text-zinc-600 whitespace-nowrap">Leitura do Scanner:</span>
            <div className="flex items-center gap-1.5 flex-1">
              <button
                type="button"
                onClick={() => setBarcodeMode('barcode')}
                className={`flex-1 text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${
                  barcodeMode === 'barcode'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-200/60'
                }`}
                title="A etiqueta exibirá e lerá o código de barras numérico do produto"
              >
                Cód. de Barras
              </button>
              <button
                type="button"
                onClick={() => setBarcodeMode('internal_id')}
                className={`flex-1 text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${
                  barcodeMode === 'internal_id'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-200/60'
                }`}
                title="A pistola lerá o código interno numérico (Ex: 000012)"
              >
                Cód. Interno (#ID)
              </button>
              <button
                type="button"
                onClick={() => setBarcodeMode('sku_format')}
                className={`flex-1 text-[11px] font-bold py-1 px-2 rounded-lg transition-all text-center whitespace-nowrap cursor-pointer ${
                  barcodeMode === 'sku_format'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-200/60'
                }`}
                title="A pistola lerá no formato PRD-00012"
              >
                REF / SKU
              </button>
            </div>
          </div>
        </div>

        {/* Opções Visuais da Etiqueta */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-zinc-100 text-xs text-zinc-600">
          {/* Opções de Elementos na Etiqueta */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider">Exibir na Etiqueta:</span>
            
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInternalCode}
                onChange={e => setShowInternalCode(e.target.checked)}
                className="rounded text-black focus:ring-black accent-black w-3.5 h-3.5"
              />
              <span className="font-semibold text-zinc-800">Número Interno (#ID)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={e => setShowPrice(e.target.checked)}
                className="rounded text-black focus:ring-black accent-black w-3.5 h-3.5"
              />
              <span className="font-semibold text-zinc-800">Preço de Venda</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showEstablishmentName}
                onChange={e => setShowEstablishmentName(e.target.checked)}
                className="rounded text-black focus:ring-black accent-black w-3.5 h-3.5"
              />
              <span className="font-semibold text-zinc-800">Nome da Empresa</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCategory}
                onChange={e => setShowCategory(e.target.checked)}
                className="rounded text-black focus:ring-black accent-black w-3.5 h-3.5"
              />
              <span className="font-semibold text-zinc-800">Categoria</span>
            </label>
          </div>

          {/* Formato do Papel de Impressão */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider">Papel:</span>
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setPaperType('a4_grid')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  paperType === 'a4_grid' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Folha A4 (Grade de Etiquetas)
              </button>
              <button
                type="button"
                onClick={() => setPaperType('thermal_roll')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  paperType === 'thermal_roll' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Rolo Térmico (Zebra / 50x30)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Teste com Pistola de Scanner */}
      <div className="p-6 pb-2">
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ScanLine size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-zinc-900">Testar Leitura com a Pistola de Scanner</h4>
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  USB / Bluetooth
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Imprima qualquer etiqueta abaixo e aponte a sua pistola de scanner para este campo para verificar a identificação instantânea do produto.
              </p>
            </div>
          </div>

          <div className="w-full md:w-80 relative">
            <input
              type="text"
              placeholder="Clique aqui e bipe a etiqueta..."
              value={scannerTestInput}
              onChange={e => handleScannerInput(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-white border-2 border-blue-300 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
            />
            {scannerTestInput && (
              <button
                type="button"
                onClick={() => handleScannerInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Feedback do Testador de Scanner */}
        {scannerFeedback && (
          <div className={`mt-2 p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            scannedMatch 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <AlertCircle size={16} />
            <span>{scannerFeedback}</span>
            {scannedMatch && (
              <span className="ml-auto font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">
                Preço: {formatMoney(scannedMatch.price)} | Stock: {scannedMatch.stock}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra de Controlo de Seleção em Lote */}
      <div className="px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 font-bold text-zinc-700 hover:text-black cursor-pointer"
          >
            {filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.has(p.id)) ? (
              <CheckSquare size={16} className="text-black" />
            ) : (
              <Square size={16} className="text-zinc-400" />
            )}
            <span>Selecionar Todos ({filteredProducts.length})</span>
          </button>

          <span className="text-zinc-300">|</span>

          <span className="text-zinc-500 font-medium">
            <strong className="text-zinc-900">{selectedProductIds.size}</strong> produtos selecionados (<strong className="text-zinc-900">{batchLabelItems.length}</strong> etiquetas totais)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-medium">Quantidades:</span>
          <button
            type="button"
            onClick={resetQuantitiesToOne}
            className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg font-bold text-zinc-700 hover:text-black text-[11px] transition-all cursor-pointer"
          >
            1 por Produto
          </button>
          <button
            type="button"
            onClick={setQuantitiesToStock}
            className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg font-bold text-zinc-700 hover:text-black text-[11px] transition-all cursor-pointer"
          >
            Conforme o Stock
          </button>
        </div>
      </div>

      {/* Grid de Etiquetas Interativas */}
      <div className="p-6 pt-2 flex-1">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
            <Barcode size={48} className="mx-auto text-zinc-300 mb-3 stroke-[1.5]" />
            <h4 className="font-bold text-zinc-800 text-sm">Nenhum produto corresponde aos filtros</h4>
            <p className="text-xs text-zinc-400 mt-1">
              Tente buscar por outro termo ou limpar o filtro de categoria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => {
              const isSelected = selectedProductIds.has(product.id);
              const barcodeValue = getBarcodeValue(product, barcodeMode);
              const quantity = labelQuantities[product.id] || 1;

              return (
                <div
                  key={`label-card-${product.id}`}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    isSelected ? 'border-zinc-900 shadow-sm' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Barra de Seleção e Quantidade */}
                  <div className="p-3 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectProduct(product.id)}
                      className="flex items-center gap-2 text-xs font-bold text-zinc-800 hover:text-black cursor-pointer truncate"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-black shrink-0" />
                      ) : (
                        <Square size={16} className="text-zinc-400 shrink-0" />
                      )}
                      <span className="truncate">Cód. #{product.id}</span>
                    </button>

                    {/* Quantidade a Imprimir */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Qtd:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={quantity}
                        onChange={e => updateQuantity(product.id, parseInt(e.target.value) || 1)}
                        className="w-12 px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-center text-xs font-bold font-mono outline-none focus:border-black"
                      />
                    </div>
                  </div>

                  {/* Visual Real da Etiqueta (Preview Físico Escaneável) */}
                  <div className="p-4 flex-1 flex flex-col items-center justify-center">
                    <div
                      id={`label-preview-${product.id}`}
                      className="w-full bg-white p-3.5 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center text-center shadow-2xs hover:border-zinc-400 transition-colors"
                    >
                      {/* Nome do Estabelecimento */}
                      {showEstablishmentName && (
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-full leading-none mb-1">
                          {establishment?.name || 'FATU-R ERP'}
                        </p>
                      )}

                      {/* Nome do Produto */}
                      <h4 className="text-xs font-black text-zinc-950 uppercase tracking-tight line-clamp-2 max-w-full leading-tight mb-1">
                        {product.name}
                      </h4>

                      {/* Código de Barra Numérico e Tags */}
                      <div className="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-zinc-100 text-zinc-900 rounded border border-zinc-200 tracking-wider">
                          Nº {barcodeValue}
                        </span>

                        {showCategory && product.category && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded">
                            {product.category}
                          </span>
                        )}

                        {showInternalCode && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                            ID: #{product.id}
                          </span>
                        )}
                      </div>

                      {/* Renderizador Gráfico do Código de Barras (SVG com JsBarcode) */}
                      <div className="w-full flex flex-col items-center justify-center my-0.5 bg-white py-1">
                        <BarcodeRenderer 
                          value={barcodeValue} 
                          id={`barcode-svg-${product.id}`}
                        />
                      </div>

                      {/* Preço de Venda */}
                      {showPrice && (
                        <div className="mt-1 pt-1 border-t border-dashed border-zinc-200 w-full flex items-center justify-center">
                          <span className="text-sm font-black text-zinc-950 tracking-tight">
                            {formatMoney(product.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas por Etiqueta */}
                  <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => downloadSingleLabelPng(product)}
                      className="py-1.5 px-2 bg-white hover:bg-zinc-100 text-zinc-700 text-[10px] font-bold rounded-lg border border-zinc-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Baixar imagem PNG de alta resolução para impressão"
                    >
                      <Download size={12} />
                      <span>PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadSingleLabelPdf(product)}
                      className="py-1.5 px-2 bg-white hover:bg-zinc-100 text-zinc-700 text-[10px] font-bold rounded-lg border border-zinc-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Baixar PDF pronto para impressoras térmicas"
                    >
                      <FileText size={12} />
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => printSingleLabel(product)}
                      className="py-1.5 px-2 bg-zinc-900 hover:bg-black text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Imprimir diretamente no navegador"
                    >
                      <Printer size={12} />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONTAINER OCULTO PARA IMPRESSÃO EM LOTE (Monta a Folha A4 ou Rolo Térmico de Etiquetas) */}
      <div style={{ position: 'fixed', left: '-99999px', top: 0, width: '210mm', pointerEvents: 'none', opacity: 0, zIndex: -100 }}>
        <div 
          ref={printBatchContainerRef} 
          className={paperType === 'a4_grid' ? 'invoice-a4-container' : 'invoice-thermal-container'}
        >
          {paperType === 'a4_grid' ? (
            // Formato Grade A4 (Compatível com folhas de papel adesivo tipo Pimaco / 3 colunas)
            <div className="bg-white p-6 font-sans text-zinc-900">
              <div className="border-b border-zinc-300 pb-3 mb-4 flex justify-between items-center text-xs text-zinc-500">
                <span className="font-bold text-zinc-800 uppercase">{establishment?.name || 'FATU-R ERP'} • FOLHA DE ETIQUETAS</span>
                <span>Data: {new Date().toLocaleDateString('pt-PT')} • Total: {batchLabelItems.length} etiquetas</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {batchLabelItems.map((item, idx) => {
                  const barcodeValue = getBarcodeValue(item.product, barcodeMode);
                  return (
                    <div
                      key={`batch-print-a4-${item.product.id}-${idx}`}
                      className="p-3 border border-zinc-300 rounded-lg flex flex-col items-center text-center bg-white"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      {showEstablishmentName && (
                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-full leading-none mb-0.5">
                          {establishment?.name || 'FATU-R'}
                        </p>
                      )}
                      <h4 className="text-[10px] font-black text-black uppercase tracking-tight line-clamp-1 leading-tight mb-0.5">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                        <span className="text-[9px] font-mono font-black text-zinc-900 tracking-wider">
                          Nº {barcodeValue}
                        </span>
                        {showInternalCode && (
                          <span className="text-[7.5px] font-mono text-zinc-400">
                            (ID #{item.product.id})
                          </span>
                        )}
                      </div>
                      <div className="my-0.5 flex justify-center">
                        <BarcodeRenderer 
                          value={barcodeValue} 
                          id={`batch-barcode-a4-${item.product.id}-${idx}`}
                          width={1.4}
                          height={32}
                          fontSize={10}
                        />
                      </div>
                      {showPrice && (
                        <span className="text-xs font-black text-black mt-0.5">
                          {formatMoney(item.product.price)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Formato Rolo Térmico Contínuo
            <div className="bg-white p-3 font-sans text-zinc-900 w-[58mm] mx-auto">
              {batchLabelItems.map((item, idx) => {
                const barcodeValue = getBarcodeValue(item.product, barcodeMode);
                return (
                  <div
                    key={`batch-print-thermal-${item.product.id}-${idx}`}
                    className="py-3 border-b-2 border-dashed border-zinc-300 flex flex-col items-center text-center"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    {showEstablishmentName && (
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest truncate max-w-full leading-none mb-0.5">
                        {establishment?.name}
                      </p>
                    )}
                    <h4 className="text-[10px] font-black text-black uppercase tracking-tight line-clamp-2 leading-tight mb-0.5">
                      {item.product.name}
                    </h4>
                    <div className="flex items-center justify-center gap-1 mb-0.5 flex-wrap">
                      <span className="text-[9px] font-mono font-black text-zinc-900 tracking-wider">
                        Nº {barcodeValue}
                      </span>
                      {showInternalCode && (
                        <span className="text-[7.5px] font-mono text-zinc-400">
                          (ID #{item.product.id})
                        </span>
                      )}
                    </div>
                    <div className="my-0.5 flex justify-center">
                      <BarcodeRenderer 
                        value={barcodeValue} 
                        id={`batch-barcode-th-${item.product.id}-${idx}`}
                        width={1.5}
                        height={34}
                        fontSize={10}
                      />
                    </div>
                    {showPrice && (
                      <span className="text-xs font-black text-black mt-0.5">
                        {formatMoney(item.product.price)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-componente SVG de Alta Fidelidade com JsBarcode
interface BarcodeRendererProps {
  value: string;
  id: string;
  width?: number;
  height?: number;
  fontSize?: number;
}

const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  id,
  width = 1.7,
  height = 46,
  fontSize = 12
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          lineColor: '#000000',
          width: width,
          height: height,
          displayValue: true,
          fontSize: fontSize,
          font: 'monospace',
          textMargin: 3,
          margin: 4,
          background: '#ffffff'
        });
      } catch (err) {
        console.warn(`Erro ao gerar código de barras para valor "${value}":`, err);
      }
    }
  }, [value, width, height, fontSize]);

  return (
    <svg 
      ref={svgRef} 
      id={id} 
      className="max-w-full h-auto select-none overflow-visible"
    />
  );
};
export default ProductLabelsView;
