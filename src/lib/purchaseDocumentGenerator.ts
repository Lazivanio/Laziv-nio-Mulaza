import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePurchasePDF = (purchase: any, establishment: any, owner: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12); // Orange 600
  doc.text(owner.name || 'Minha Empresa', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`NIF: ${owner.nif || '---'}`, 20, 26);
  doc.text(`Endereço: ${owner.address || '---'}`, 20, 31);
  doc.text(`Telefone: ${owner.phone || '---'}`, 20, 36);

  // Document Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('FATURA DE COMPRA', pageWidth - 80, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Número: ${purchase.invoice_number || '---'}`, pageWidth - 80, 26);
  doc.text(`Data: ${new Date(purchase.timestamp).toLocaleDateString()}`, pageWidth - 80, 31);
  doc.text(`Estabelecimento: ${establishment.name || '---'}`, pageWidth - 80, 36);

  // Supplier Info
  doc.setFillColor(255, 247, 237); // Orange 50
  doc.rect(20, 45, pageWidth - 40, 25, 'F');
  doc.setDrawColor(253, 186, 116); // Orange 300
  doc.rect(20, 45, pageWidth - 40, 25, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text('FORNECEDOR:', 25, 52);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(purchase.supplier_name || '---', 25, 58);
  doc.text(`NIF: ${purchase.supplier_nif || '---'}`, 25, 63);

  // Items Table
  const items = typeof purchase.items === 'string' ? JSON.parse(purchase.items) : purchase.items;
  const tableData = items.map((item: any) => [
    item.name,
    item.quantity,
    `Kz ${item.price.toLocaleString()}`,
    `${item.tax_code} (${item.tax_percentage || 0}%)`,
    `Kz ${(item.quantity * item.price * (1 + ((item.tax_percentage || 0) / 100))).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Produto', 'Qtd', 'Unit.', 'Taxa', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 247, 237] },
    styles: { fontSize: 9 }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('RESUMO:', pageWidth - 80, finalY);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 80, finalY + 7);
  doc.text(`Kz ${(purchase.total_amount - (purchase.tax_amount || 0)).toLocaleString()}`, pageWidth - 30, finalY + 7, { align: 'right' });
  
  doc.text('Impostos:', pageWidth - 80, finalY + 14);
  doc.text(`Kz ${(purchase.tax_amount || 0).toLocaleString()}`, pageWidth - 30, finalY + 14, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text('TOTAL:', pageWidth - 80, finalY + 22);
  doc.text(`Kz ${purchase.total_amount.toLocaleString()}`, pageWidth - 30, finalY + 22, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text('Este documento serve apenas para conferência de stock e registo interno.', pageWidth / 2, 280, { align: 'center' });

  doc.save(`Fatura_Compra_${purchase.invoice_number}.pdf`);
};

export const generatePurchaseNotePDF = (note: any, establishment: any, owner: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  const isCredit = note.type === 'credit';
  const title = isCredit ? 'NOTA DE CRÉDITO (COMPRA)' : 'NOTA DE DÉBITO (COMPRA)';

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12); // Orange 600
  doc.text(owner.name || 'Minha Empresa', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`NIF: ${owner.nif || '---'}`, 20, 26);
  doc.text(`Endereço: ${owner.address || '---'}`, 20, 31);
  doc.text(`Telefone: ${owner.phone || '---'}`, 20, 36);

  // Document Info
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth - 90, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Número: ${note.invoice_number || '---'}`, pageWidth - 90, 26);
  doc.text(`Data: ${new Date(note.timestamp).toLocaleDateString()}`, pageWidth - 90, 31);
  doc.text(`Referente a: ${note.purchase_invoice_number || '---'}`, pageWidth - 90, 36);

  // Supplier Info
  doc.setFillColor(255, 247, 237); // Orange 50
  doc.rect(20, 45, pageWidth - 40, 25, 'F');
  doc.setDrawColor(253, 186, 116); // Orange 300
  doc.rect(20, 45, pageWidth - 40, 25, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text('FORNECEDOR:', 25, 52);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(note.supplier_name || '---', 25, 58);

  // Reason
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text('MOTIVO:', 20, 80);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(note.reason || '---', 20, 86, { maxWidth: pageWidth - 40 });

  // Items Table (if any)
  const items = typeof note.items === 'string' ? JSON.parse(note.items) : note.items;
  if (items && items.length > 0) {
    const tableData = items.map((item: any) => [
      item.name,
      item.quantity,
      `Kz ${item.price.toLocaleString()}`,
      `${item.tax_code} (${item.tax_percentage || 0}%)`,
      `Kz ${(item.quantity * item.price * (1 + ((item.tax_percentage || 0) / 100))).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['Produto', 'Qtd', 'Unit.', 'Taxa', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      styles: { fontSize: 9 }
    });
  }

  // Totals
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 110;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('RESUMO:', pageWidth - 80, finalY);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 80, finalY + 7);
  doc.text(`Kz ${(note.total_amount - (note.tax_amount || 0)).toLocaleString()}`, pageWidth - 30, finalY + 7, { align: 'right' });
  
  doc.text('Impostos:', pageWidth - 80, finalY + 14);
  doc.text(`Kz ${(note.tax_amount || 0).toLocaleString()}`, pageWidth - 30, finalY + 14, { align: 'right' });

  if (note.adjustment_amount > 0) {
    doc.text('Ajuste de Valor:', pageWidth - 80, finalY + 21);
    doc.setTextColor(0, 0, 0);
    doc.text(`Kz ${note.adjustment_amount.toLocaleString()}`, pageWidth - 30, finalY + 21, { align: 'right' });
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12);
  doc.text('TOTAL DA NOTA:', pageWidth - 80, finalY + 29);
  doc.text(`Kz ${note.total_amount.toLocaleString()}`, pageWidth - 30, finalY + 29, { align: 'right' });

  doc.save(`${isCredit ? 'NC' : 'ND'}_Compra_${note.invoice_number}.pdf`);
};
