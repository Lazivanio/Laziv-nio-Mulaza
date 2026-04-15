import React, { useRef } from 'react';
import { Printer, Download, FileText, ShoppingBag } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export const PurchaseDocument = ({ 
  document, 
  establishment, 
  owner, 
  type = 'purchase' 
}: { 
  document: any, 
  establishment: any, 
  owner: any,
  type?: 'purchase' | 'credit_note' | 'debit_note'
}) => {
  const documentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!documentRef.current) return;
    
    const pages = documentRef.current.querySelectorAll('.document-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      const canvas = await html2canvas(page, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 800,
        onclone: (clonedDoc) => {
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.textContent) {
              style.textContent = style.textContent.replace(/oklab\([^)]+\)/g, '#000');
              style.textContent = style.textContent.replace(/oklch\([^)]+\)/g, '#000');
              style.textContent = style.textContent.replace(/color-mix\([^)]+\)/g, '#000');
              style.textContent = style.textContent.replace(/light-dark\([^)]+\)/g, '#000');
            }
          });
          const elementsWithStyle = clonedDoc.querySelectorAll('[style]');
          elementsWithStyle.forEach(el => {
            const styleAttr = el.getAttribute('style');
            if (styleAttr) {
              let newStyle = styleAttr.replace(/oklab\([^)]+\)/g, '#000');
              newStyle = newStyle.replace(/oklch\([^)]+\)/g, '#000');
              newStyle = newStyle.replace(/color-mix\([^)]+\)/g, '#000');
              newStyle = newStyle.replace(/light-dark\([^)]+\)/g, '#000');
              el.setAttribute('style', newStyle);
            }
          });
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    const filename = type === 'purchase' 
      ? `FATURA_COMPRA_${document.invoice_number || document.id}.pdf`
      : `${type === 'credit_note' ? 'NC' : 'ND'}_COMPRA_${document.invoice_number || document.id}.pdf`;
    
    pdf.save(filename);
  };

  if (!document || !establishment || !owner) return null;

  const items = typeof document.items === 'string'
    ? JSON.parse(document.items)
    : document.items || [];

  const title = type === 'purchase' 
    ? 'FATURA DE COMPRA' 
    : type === 'credit_note' 
      ? 'NOTA DE CRÉDITO' 
      : 'NOTA DE DÉBITO';

  const icon = type === 'purchase' ? <ShoppingBag size={24} /> : <FileText size={24} />;

  // Logic to split items into pages
  const FIRST_PAGE_MAX = 8;
  const OTHER_PAGE_MAX = 15;
  
  const itemPages: any[][] = [];
  let tempItems = [...items];
  
  if (tempItems.length === 0) {
    itemPages.push([]);
  } else {
    itemPages.push(tempItems.splice(0, FIRST_PAGE_MAX));
    while (tempItems.length > 0) {
      itemPages.push(tempItems.splice(0, OTHER_PAGE_MAX));
    }
  }

  const isOnlyOnePage = itemPages.length === 1;
  const lastPageItems = itemPages[itemPages.length - 1] || [];
  const showFooterOnNewPage = isOnlyOnePage 
    ? lastPageItems.length > 5 
    : lastPageItems.length > 10;

  const renderFooterContent = () => (
    <div className="mt-auto pt-8 border-t-2 border-zinc-100">
      <div className="mb-8">
        <div className="flex justify-end">
          <div className="w-full max-w-[320px] bg-zinc-50 p-6 rounded-2xl space-y-3 border border-zinc-100 shadow-sm">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Subtotal</span>
              <span className="font-bold text-zinc-900">Kz {(document.total_amount - (document.tax_amount || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500 font-medium">Impostos</span>
              <span className="font-bold text-zinc-900">Kz {(document.tax_amount || 0).toLocaleString()}</span>
            </div>
            {document.adjustment_amount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 font-medium">Ajuste</span>
                <span className="font-bold text-zinc-900">Kz {document.adjustment_amount.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-4 border-t border-zinc-200">
              <div className="flex justify-between items-baseline">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Total Geral</span>
                <span className="text-2xl font-black text-orange-600">Kz {document.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-50/50 p-6 rounded-2xl border border-zinc-100">
        <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Observações / Motivo</h4>
        <p className="text-xs text-zinc-600 leading-relaxed">
          {document.reason || document.observations || 'Documento emitido para fins de registo interno de compras e stock.'}
        </p>
      </div>

      <div className="text-center text-[8px] text-zinc-400 uppercase tracking-[0.4em] mt-12 font-bold">
        Documento processado por computador · Obrigado pela sua preferência
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 no-print">
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-sm font-bold transition-all">
          <Printer size={16} /> Imprimir
        </button>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-zinc-800 rounded-lg text-sm font-bold transition-all">
          <Download size={16} /> PDF
        </button>
      </div>

      <div ref={documentRef} className="space-y-8 no-shadow">
        {itemPages.map((pageItems, pageIdx) => (
          <div key={pageIdx} className="document-page bg-white p-12 w-[800px] min-h-[1123px] mx-auto shadow-sm border border-zinc-100 rounded-lg font-sans text-zinc-900 flex flex-col relative overflow-hidden mb-8 last:mb-0">
            {/* Header - Only on first page */}
            {pageIdx === 0 && (
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-8">
                  {establishment.logo_url && (
                    <div className="w-24 h-24 bg-zinc-50 rounded-2xl flex items-center justify-center p-2 border border-zinc-100">
                      <img src={establishment.logo_url} alt="" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="space-y-4">
                    <h2 className="text-3xl font-black uppercase tracking-tight text-orange-600 leading-none">{establishment.name}</h2>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="grid grid-cols-[80px_1fr] gap-4 items-start">
                        <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] pt-1 shrink-0">Endereço</span>
                        <span className="text-zinc-600 font-medium">{establishment.address}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] shrink-0">NIF</span>
                        <span className="text-zinc-600 font-bold">{establishment.nif}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                        <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] shrink-0">Telefone</span>
                        <span className="text-zinc-600 font-bold">{establishment.phone}</span>
                      </div>
                      {establishment.email && (
                        <div className="grid grid-cols-[80px_1fr] gap-4 items-center">
                          <span className="font-black text-zinc-400 uppercase text-[8px] tracking-[0.2em] shrink-0">Email</span>
                          <span className="text-orange-600 font-bold">{establishment.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-black text-orange-500 uppercase mb-2">{title}</h1>
                  <div className="space-y-1 text-sm text-zinc-600">
                    <p><span className="font-bold">Nº:</span> {document.invoice_number || document.id.toString().padStart(6, '0')}</p>
                    <p><span className="font-bold">Data:</span> {new Date(document.timestamp).toLocaleDateString()}</p>
                    {document.due_date && (
                      <p><span className="font-bold">Vencimento:</span> {new Date(document.due_date).toLocaleDateString()}</p>
                    )}
                    {document.purchase_invoice_number && (
                      <p><span className="font-bold">Ref. Fatura:</span> {document.purchase_invoice_number}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Info - Only on first page */}
            {pageIdx === 0 && (
              <div className="grid grid-cols-2 gap-12 mb-12">
                <div className="bg-zinc-50 p-6 rounded-2xl">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Dados do Fornecedor</h4>
                  <div className="space-y-1">
                    <p className="font-bold text-lg">{(document.supplier_name || 'Fornecedor').toUpperCase()}</p>
                    <p className="text-sm text-zinc-600">{document.supplier_address || 'Endereço não disponível'}</p>
                    <p className="text-sm font-bold mt-2">NIF: {document.supplier_nif || '---'}</p>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Condições / Estado</h4>
                  <p className="text-sm text-zinc-600">Documento de controlo interno de mercadorias.</p>
                  <p className="text-sm text-zinc-600 mt-2">Estado: <span className="font-bold uppercase text-orange-600">{document.status || 'Processado'}</span></p>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="flex-grow">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b-2 border-orange-500">
                    <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Descrição</th>
                    <th className="pb-4 text-center font-black uppercase tracking-widest text-[10px]">Qtd</th>
                    <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">Preço Unit.</th>
                    <th className="pb-4 text-center font-black uppercase tracking-widest text-[10px]">Taxa</th>
                    <th className="pb-4 text-right font-black uppercase tracking-widest text-[10px]">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pageItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-4">
                        <p className="font-bold">{item.name.toUpperCase()}</p>
                      </td>
                      <td className="py-4 text-center">{item.quantity}</td>
                      <td className="py-4 text-right">Kz {item.price.toLocaleString()}</td>
                      <td className="py-4 text-center">
                        <span className="text-[10px] font-bold text-zinc-500">{item.tax_code} ({item.tax_percentage || 0}%)</span>
                      </td>
                      <td className="py-4 text-right font-bold">Kz {(item.price * item.quantity * (1 + ((item.tax_percentage || 0) / 100))).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer - Only on last page (if it fits) */}
            {pageIdx === itemPages.length - 1 && !showFooterOnNewPage && renderFooterContent()}

            {/* Page Number */}
            <div className="absolute bottom-6 right-12 text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
              Página {pageIdx + 1} de {showFooterOnNewPage ? itemPages.length + 1 : itemPages.length}
            </div>
          </div>
        ))}

        {/* Dedicated Footer Page if needed */}
        {showFooterOnNewPage && (
          <div className="document-page bg-white p-12 w-[800px] min-h-[1123px] mx-auto shadow-sm border border-zinc-100 rounded-lg font-sans text-zinc-900 flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-12 opacity-50">
              <div className="flex items-center gap-8">
                {establishment.logo_url && (
                  <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center p-2 border border-zinc-100">
                    <img src={establishment.logo_url} alt="" className="max-w-full max-h-full object-contain opacity-50" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-zinc-400 leading-none">{establishment.name}</h2>
                  <p className="text-[10px] font-bold text-zinc-300 mt-2 uppercase tracking-widest">Página de Continuação / Totais</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black text-zinc-200 uppercase mb-1">{title}</h1>
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Nº {document.invoice_number || document.id.toString().padStart(6, '0')}</p>
              </div>
            </div>

            <div className="flex-grow flex flex-col">
              <div className="text-center py-8 border-2 border-dashed border-zinc-100 rounded-3xl mb-8">
                <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[9px]">Continuação do Documento</p>
              </div>
              {renderFooterContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
