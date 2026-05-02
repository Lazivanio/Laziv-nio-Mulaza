import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  ChevronRight,
  Filter,
  DollarSign,
  ShoppingBag,
  Truck,
  RotateCcw,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  Calendar,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Establishment as EstablishmentType } from '../types';
import { generatePurchasePDF, generatePurchaseNotePDF } from '../lib/purchaseDocumentGenerator';
import { PurchaseDocument } from './PurchaseDocument';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn("relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden", maxWidth)}
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-xl font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export const OwnerPurchases = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'orders' | 'receipts' | 'notes' | 'history'>('direct');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [establishments, setEstablishments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const combinedHistory = [...purchases, ...notes].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isManageOrderModalOpen, setIsManageOrderModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ type: 'purchase' | 'credit_note' | 'debit_note', data: any } | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isDirectPurchase, setIsDirectPurchase] = useState(false);

  // Forms
  const [purchaseForm, setPurchaseForm] = useState({
    establishment_id: '',
    supplier_id: '',
    invoice_number: '',
    due_date: '',
    items: [] as any[],
    paid_amount: 0,
  });

  const [returnForm, setReturnForm] = useState({
    supplier_id: '',
    purchase_id: '',
    reason: '',
    items: [] as any[],
    total_amount: 0,
    type: 'credit' as 'credit' | 'debit',
    note_category: 'return' as 'return' | 'correction',
    adjustment_amount: 0,
    observations: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'transfer'
  });

  useEffect(() => {
    fetchInitialData();
  }, [user.id]);

  useEffect(() => {
    if (selectedEstablishmentId) {
      fetchPurchases();
      fetchReturns();
      fetchProducts();
      fetchTaxes();
    }
  }, [selectedEstablishmentId, activeTab]);

  const fetchTaxes = async () => {
    try {
      const res = await fetch(`/api/owner/taxes/${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTaxes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [establishmentsRes, suppliersRes] = await Promise.all([
        fetch(`/api/owner/establishments/${user.id}`),
        fetch(`/api/owner/suppliers/${user.id}`)
      ]);
      
      if (!establishmentsRes.ok || !suppliersRes.ok) {
        console.error("Error fetching initial data for purchases:", establishmentsRes.status, suppliersRes.status);
        return;
      }
      
      const establishmentsData = await establishmentsRes.json();
      const suppliersData = await suppliersRes.json();
      
      if (Array.isArray(establishmentsData)) {
        setEstablishments(establishmentsData);
        if (establishmentsData.length > 0 && !selectedEstablishmentId) {
          setSelectedEstablishmentId(establishmentsData[0].id.toString());
        }
      }
      if (Array.isArray(suppliersData)) {
        setSuppliers(suppliersData);
      }
    } catch (e) {
      console.error("Error in fetchInitialData:", e);
    }
  };

  const fetchPurchases = async () => {
    if (!selectedEstablishmentId) return;
    try {
      const res = await fetch(`/api/owner/purchases/${selectedEstablishmentId}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPurchases(data);
      }
    } catch (e) {
      console.error("Error fetching purchases:", e);
    }
  };

  const fetchReturns = async () => {
    try {
      const res = await fetch(`/api/owner/purchase-returns/${selectedEstablishmentId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/owner/products/${selectedEstablishmentId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddProductToPurchase = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (!product) return;
    if (purchaseForm.items.find(item => item.product_id === product.id)) return;

    // Get tax info
    const establishmentTax = taxes.find(t => t.establishment_id.toString() === selectedEstablishmentId && t.is_default === 1);
    const productTax = product.tax_id ? taxes.find(t => t.id === product.tax_id) : null;
    const finalTax = productTax || establishmentTax || { percentage: 14, tax_code: 'NOR' };

    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        price: product.cost_price || 0,
        tax_id: finalTax.id,
        tax_percentage: finalTax.percentage,
        tax_code: finalTax.tax_code
      }]
    });
  };

  const handleUpdatePurchaseItem = (index: number, field: string, value: any) => {
    const newItems = [...purchaseForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPurchaseForm({ ...purchaseForm, items: newItems });
  };

  const handleDownloadPurchase = (purchase: any) => {
    setPreviewData({ type: 'purchase', data: purchase });
    setIsPreviewModalOpen(true);
  };

  const handleDownloadNote = (note: any) => {
    setPreviewData({ type: note.type === 'credit' ? 'credit_note' : 'debit_note', data: note });
    setIsPreviewModalOpen(true);
  };

  const handleSavePurchase = async (e: FormEvent) => {
    e.preventDefault();
    if (purchaseForm.items.length === 0) return;

    setLoading(true);
    try {
      const items_total = purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax_amount = purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price * (item.tax_percentage / 100)), 0);
      const total_amount = items_total + tax_amount;

      const res = await fetch('/api/owner/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...purchaseForm,
          establishment_id: selectedEstablishmentId,
          total_amount,
          tax_amount,
          user_id: user.id,
          delivery_status: isDirectPurchase ? 'received' : 'pending',
          is_direct: isDirectPurchase,
          is_stock_updated: isDirectPurchase,
          is_closed: isDirectPurchase,
          status: (purchaseForm.paid_amount || 0) >= total_amount ? 'liquidado' : 'devendo'
        })
      });

      if (res.ok) {
        setIsPurchaseModalOpen(false);
        fetchPurchases();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePurchase = async (id: number) => {
    try {
      const res = await fetch(`/api/owner/purchases/${id}/receive`, { method: 'PUT' });
      if (res.ok) {
        const updated = { ...selectedPurchase, delivery_status: 'received' };
        setSelectedPurchase(updated);
        fetchPurchases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStock = async (id: number) => {
    try {
      const res = await fetch(`/api/owner/purchases/${id}/update-stock`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      if (res.ok) {
        const updated = { ...selectedPurchase, is_stock_updated: 1 };
        setSelectedPurchase(updated);
        fetchPurchases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseOrder = async (id: number) => {
    try {
      const res = await fetch(`/api/owner/purchases/${id}/close`, { method: 'PUT' });
      if (res.ok) {
        setIsManageOrderModalOpen(false);
        fetchPurchases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelPurchase = async (id: number) => {
    try {
      const res = await fetch(`/api/owner/purchases/${id}/cancel`, { method: 'PUT' });
      if (res.ok) {
        setIsManageOrderModalOpen(false);
        fetchPurchases();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveReturn = async (e: FormEvent) => {
    e.preventDefault();
    const selectedItems = returnForm.note_category === 'return' 
      ? returnForm.items.filter(item => item.selected !== false)
      : [];
    
    if (returnForm.note_category === 'return' && selectedItems.length === 0) return;
    if (returnForm.note_category === 'correction' && !returnForm.adjustment_amount) return;

    setLoading(true);
    try {
      const items_total = selectedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const tax_amount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.price * ((item.tax_percentage || 14) / 100)), 0);
      const total_amount = returnForm.note_category === 'return' ? (items_total + tax_amount) : returnForm.adjustment_amount;
      
      const res = await fetch('/api/owner/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          establishment_id: selectedEstablishmentId,
          supplier_id: returnForm.supplier_id,
          purchase_id: returnForm.purchase_id,
          total_amount,
          tax_amount,
          reason: returnForm.reason,
          items: selectedItems,
          type: returnForm.type,
          note_category: returnForm.note_category,
          adjustment_amount: returnForm.adjustment_amount,
          observations: returnForm.observations
        })
      });

      if (res.ok) {
        setIsReturnModalOpen(false);
        fetchPurchases();
        fetchReturns();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;

    setLoading(true);
    try {
      const res = await fetch('/api/owner/purchase-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: selectedPurchase.id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          user_id: user.id
        })
      });

      if (res.ok) {
        setIsPaymentModalOpen(false);
        fetchPurchases();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const supplierName = p.supplier_name || '';
    const invoiceNum = p.invoice_number || '';
    const matchesSearch = (supplierName.toLowerCase().includes(search.toLowerCase()) || invoiceNum.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;

    const isDirect = Number(p.is_direct) === 1;
    const isClosed = Number(p.is_closed) === 1;

    if (activeTab === 'direct') return isDirect || isClosed;
    if (activeTab === 'orders') return !isDirect;
    if (activeTab === 'receipts') return !isDirect;
    if (activeTab === 'notes') return false; 
    return false;
  });

  const totalPending = purchases.reduce((sum, p) => {
    if (Number(p.is_direct) === 0 && Number(p.is_closed) === 0) return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="flex-1 flex flex-col p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Compras</h1>
          <p className="text-zinc-500 mt-1">Gestão de encomendas, receções e devoluções.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('direct')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'direct' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <ShoppingBag size={18} />
            Compras
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'orders' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Clock size={18} />
            Encomendas
          </button>
          <button 
            onClick={() => setActiveTab('receipts')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'receipts' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Truck size={18} />
            Recebimentos
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'notes' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <RotateCcw size={18} />
            Notas
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'history' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <History size={18} />
            Histórico
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select 
          value={selectedEstablishmentId}
          onChange={e => setSelectedEstablishmentId(e.target.value)}
          className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all font-bold min-w-[200px]"
        >
          {establishments.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder="Pesquisar faturas ou fornecedores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition-all"
          />
        </div>
        <button 
          onClick={() => {
            if (activeTab === 'notes') {
              setReturnForm({
                supplier_id: '',
                purchase_id: '',
                reason: '',
                items: [],
                total_amount: 0,
                type: 'credit',
                note_category: 'return',
                adjustment_amount: 0,
                observations: ''
              });
              setIsReturnModalOpen(true);
              return;
            }
            setPurchaseForm({ establishment_id: selectedEstablishmentId, supplier_id: '', invoice_number: '', due_date: '', items: [], paid_amount: 0 });
            setIsDirectPurchase(activeTab === 'direct');
            setIsPurchaseModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
        >
          <Plus size={18} />
          {activeTab === 'direct' ? 'Comprar' : activeTab === 'notes' ? 'Nova Nota' : 'Nova Encomenda'}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {activeTab !== 'notes' ? (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Fornecedor / Fatura</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Produtos</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Pagamento</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{p.supplier_name}</p>
                        <p className="text-xs text-zinc-500">Fatura: {p.invoice_number || '---'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(typeof p.items === 'string' ? JSON.parse(p.items || '[]') : (p.items || [])).map((item: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded text-[10px] font-bold">
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                          (activeTab === 'orders' || activeTab === 'receipts') ? (
                            p.is_closed ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
                          ) : (
                            p.paid_amount >= p.total_amount ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
                          )
                        )}>
                          {(activeTab === 'orders' || activeTab === 'receipts') ? (
                            p.is_closed ? <CheckCircle2 size={12} /> : <Clock size={12} />
                          ) : (
                            p.paid_amount >= p.total_amount ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />
                          )}
                          {(activeTab === 'orders' || activeTab === 'receipts') ? (
                            p.is_closed ? 'Recebida' : 'Pendente'
                          ) : (
                            (p.status === 'liquidado' || p.paid_amount >= p.total_amount) ? 'Liquidado' : 'Devendo'
                          )}
                        </div>
                        {p.is_stock_updated && activeTab === 'direct' && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-black uppercase">
                            <Package size={10} />
                            Stock Atualizado
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-zinc-900">Kz {p.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-zinc-400">{new Date(p.timestamp).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${(p.paid_amount / p.total_amount) * 100}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">
                            {p.status === 'liquidado' ? 'Pago' : `Falta Kz ${(p.total_amount - p.paid_amount).toLocaleString()}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === 'receipts' && (
                            <button 
                              onClick={() => {
                                setSelectedPurchase(p);
                                setIsManageOrderModalOpen(true);
                              }}
                              className="bg-black text-white px-3 py-1 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-1"
                            >
                              <Edit2 size={14} />
                              Alterar Estado
                            </button>
                          )}
                          {activeTab === 'direct' && p.paid_amount < p.total_amount && (
                            <button 
                              onClick={() => {
                                setSelectedPurchase(p);
                                setPaymentData({ amount: p.total_amount - p.paid_amount, payment_method: 'transfer' });
                                setIsPaymentModalOpen(true);
                              }}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Pagar"
                            >
                              <DollarSign size={18} />
                            </button>
                          )}
                          {activeTab === 'direct' && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleDownloadPurchase(p)}
                                className="p-2 text-zinc-500 hover:bg-zinc-50 rounded-lg transition-all"
                                title="Baixar PDF"
                              >
                                <Download size={18} />
                              </button>
                              <button 
                                onClick={() => {
                                  setReturnForm({
                                    supplier_id: p.supplier_id,
                                    purchase_id: p.id,
                                    reason: '',
                                    items: (typeof p.items === 'string' ? JSON.parse(p.items) : p.items).map((item: any) => ({ ...item, maxQuantity: item.quantity, selected: true })),
                                    total_amount: p.total_amount,
                                    type: 'credit',
                                    note_category: 'return',
                                    adjustment_amount: 0,
                                    observations: ''
                                  });
                                  setIsReturnModalOpen(true);
                                }}
                                className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                title="Criar Nota"
                              >
                                <FileText size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'notes' ? (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Produtos / Ajuste</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {notes.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{r.supplier_name}</p>
                        <p className="text-xs text-zinc-500">Ref: #{r.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                          r.type === 'credit' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {r.type === 'credit' ? 'Nota de Crédito' : 'Nota de Débito'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-zinc-500">
                          {r.note_category === 'return' ? 'Devolução' : 'Ajuste'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.note_category === 'return' ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(r.items || []).map((item: any, i: number) => (
                              <span key={i} className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold",
                                r.type === 'credit' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                              )}>
                                {item.quantity}x {item.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-bold text-zinc-600">
                            Ajuste: Kz {r.adjustment_amount?.toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600">{r.reason}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className={cn(
                          "text-sm font-bold",
                          r.type === 'credit' ? "text-rose-600" : "text-blue-600"
                        )}>
                          Kz {r.total_amount.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleDownloadNote(r)}
                            className="p-2 text-zinc-500 hover:bg-zinc-50 rounded-lg transition-all"
                            title="Baixar PDF"
                          >
                            <Download size={18} />
                          </button>
                          <p className="text-sm text-zinc-500">{new Date(r.timestamp).toLocaleDateString()}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Documento</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {combinedHistory.map((item) => {
                    const isNote = !!item.type;
                    return (
                      <tr key={`${isNote ? 'note' : 'purchase'}-${item.id}`} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              isNote ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                            )}>
                              {isNote ? <FileText size={18} /> : <ShoppingBag size={18} />}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900">{item.invoice_number || `#${item.id}`}</p>
                              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                                {isNote ? (item.type === 'credit' ? 'Nota Crédito' : 'Nota Débito') : 'Fatura Compra'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-zinc-700">{item.supplier_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                            !isNote ? "bg-zinc-50 text-zinc-600 border-zinc-100" :
                            item.type === 'credit' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                          )}>
                            {!isNote ? 'Compra' : item.type === 'credit' ? 'Crédito' : 'Débito'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                            (item.status === 'liquidado' || (item.paid_amount !== undefined && item.paid_amount >= item.total_amount) || isNote) 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          )}>
                            {(item.status === 'liquidado' || (item.paid_amount !== undefined && item.paid_amount >= item.total_amount) || isNote) 
                              ? 'Liquidado' 
                              : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className={cn(
                            "text-sm font-bold",
                            isNote && item.type === 'credit' ? "text-rose-600" : "text-zinc-900"
                          )}>
                            {isNote && item.type === 'credit' ? '-' : ''}Kz {item.total_amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-zinc-500">{new Date(item.timestamp).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => isNote ? handleDownloadNote(item) : handleDownloadPurchase(item)}
                            className="p-2 text-zinc-500 hover:bg-zinc-50 rounded-lg transition-all"
                            title="Baixar PDF"
                          >
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Purchase Modal */}
      <Modal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
        title={isDirectPurchase ? "Nova Compra Direta" : "Nova Encomenda"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSavePurchase} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Fornecedor</label>
              <select 
                required
                value={purchaseForm.supplier_id}
                onChange={e => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar Fornecedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {!isDirectPurchase && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-700">Data Prevista</label>
                <input 
                  type="date" 
                  value={purchaseForm.due_date}
                  onChange={e => setPurchaseForm({ ...purchaseForm, due_date: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
            )}
            {isDirectPurchase && (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-zinc-700">Fatura de Compra</label>
                <div className="w-full px-4 py-3 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 font-bold italic">
                  Gerada Automaticamente
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Adicionar Produto</label>
            <select 
              onChange={e => handleAddProductToPurchase(e.target.value)}
              value=""
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="">Pesquisar produto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
            </select>
          </div>

          <div className="border border-zinc-100 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Produto</th>
                  <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Qtd</th>
                  <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Preço Custo</th>
                  <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Imposto</th>
                  <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {purchaseForm.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-bold">{item.name}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        min="1"
                        value={isNaN(item.quantity) ? '' : item.quantity}
                        onChange={e => handleUpdatePurchaseItem(index, 'quantity', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 bg-zinc-100 rounded border-none text-center font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        value={isNaN(item.price) ? '' : item.price}
                        onChange={e => handleUpdatePurchaseItem(index, 'price', parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 bg-zinc-100 rounded border-none text-right font-bold"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-400 uppercase">{item.tax_code}</span>
                        <span className="text-xs font-bold text-zinc-600">{item.tax_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      Kz {(item.quantity * item.price * (1 + (item.tax_percentage / 100))).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

      <div className="space-y-2 p-4 bg-zinc-50 rounded-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-zinc-500">Subtotal</span>
          <span className="font-bold">Kz {purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-zinc-500">Impostos</span>
          <span className="font-bold text-orange-500">Kz {purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price * (item.tax_percentage / 100)), 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200">
          <span className="font-bold text-zinc-900">Total da Compra</span>
          <span className="text-2xl font-black">Kz {(purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price * (1 + (item.tax_percentage / 100))), 0)).toLocaleString()}</span>
        </div>
      </div>

          {isDirectPurchase && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Valor Pago Agora (Kz)</label>
              <input 
                type="number" 
                min="0"
                value={isNaN(purchaseForm.paid_amount) ? '' : purchaseForm.paid_amount}
                onChange={e => setPurchaseForm({ ...purchaseForm, paid_amount: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 font-bold text-lg"
              />
            </div>
          )}

          <button 
            type="submit"
            disabled={purchaseForm.items.length === 0 || loading}
            className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-zinc-200"
          >
            {loading ? "A processar..." : isDirectPurchase ? "Finalizar Compra" : "Criar Encomenda"}
          </button>
        </form>
      </Modal>

      {/* Manage Order Modal */}
      <Modal
        isOpen={isManageOrderModalOpen}
        onClose={() => setIsManageOrderModalOpen(false)}
        title="Gerir Encomenda"
        maxWidth="max-w-md"
      >
        {selectedPurchase && (
          <div className="space-y-6">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Detalhes da Encomenda</p>
              <div className="space-y-1">
                <p className="font-bold text-zinc-900">{selectedPurchase.supplier_name}</p>
                <p className="text-sm text-zinc-500">Total: Kz {selectedPurchase.total_amount.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handleReceivePurchase(selectedPurchase.id)}
                disabled={selectedPurchase.delivery_status === 'received'}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border font-bold transition-all",
                  selectedPurchase.delivery_status === 'received' 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600 cursor-default" 
                    : "bg-white border-zinc-200 text-zinc-700 hover:border-black"
                )}
              >
                <div className="flex items-center gap-3">
                  <Truck size={20} />
                  <span>1. Receber Produtos</span>
                </div>
                {selectedPurchase.delivery_status === 'received' && <Check size={20} />}
              </button>

              <button 
                onClick={() => handleUpdateStock(selectedPurchase.id)}
                disabled={selectedPurchase.delivery_status !== 'received' || selectedPurchase.is_stock_updated}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border font-bold transition-all",
                  selectedPurchase.is_stock_updated 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600 cursor-default" 
                    : selectedPurchase.delivery_status !== 'received'
                      ? "bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed"
                      : "bg-white border-zinc-200 text-zinc-700 hover:border-black"
                )}
              >
                <div className="flex items-center gap-3">
                  <Package size={20} />
                  <span>2. Atualizar Stock</span>
                </div>
                {selectedPurchase.is_stock_updated && <Check size={20} />}
              </button>

              <button 
                onClick={() => handleCloseOrder(selectedPurchase.id)}
                disabled={!selectedPurchase.is_stock_updated}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-xl border font-bold transition-all",
                  !selectedPurchase.is_stock_updated
                    ? "bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed"
                    : "bg-black text-white hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} />
                  <span>3. Fechar Encomenda</span>
                </div>
              </button>

              {selectedPurchase.paid_amount < selectedPurchase.total_amount && (
                <button 
                  onClick={() => {
                    setPaymentData({ amount: selectedPurchase.total_amount - selectedPurchase.paid_amount, payment_method: 'transfer' });
                    setIsPaymentModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign size={20} />
                    <span>Efetuar Pagamento</span>
                  </div>
                  <span className="text-xs">Falta Kz {(selectedPurchase.total_amount - selectedPurchase.paid_amount).toLocaleString()}</span>
                </button>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <button 
                onClick={() => handleCancelPurchase(selectedPurchase.id)}
                disabled={selectedPurchase.delivery_status === 'received'}
                className="w-full text-rose-600 font-bold py-3 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-30"
              >
                Cancelar Encomenda
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Registar Pagamento"
      >
        <form onSubmit={handlePayment} className="space-y-4">
          {selectedPurchase && (
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Resumo da Dívida</p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Fatura: {selectedPurchase.invoice_number || '---'}</span>
                <span className="text-lg font-black text-rose-600">Kz {(selectedPurchase.total_amount - selectedPurchase.paid_amount).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor do Pagamento</label>
              <input 
                required
                type="number" 
                min="1"
                max={selectedPurchase ? selectedPurchase.total_amount - selectedPurchase.paid_amount : undefined}
                value={isNaN(paymentData.amount) ? '' : paymentData.amount}
                onChange={e => setPaymentData({...paymentData, amount: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all font-black text-2xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Forma de Pagamento</label>
              <select 
                value={paymentData.payment_method}
                onChange={e => setPaymentData({...paymentData, payment_method: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="cash">Dinheiro</option>
                <option value="transfer">Transferência</option>
                <option value="multicaixa">Multicaixa</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-200"
          >
            {loading ? "A processar..." : "Confirmar Pagamento"}
          </button>
        </form>
      </Modal>

      {/* Note Modal (Credit/Debit) */}
      <Modal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        title="Registar Nota de Crédito/Débito"
      >
        <form onSubmit={handleSaveReturn} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setReturnForm({ ...returnForm, type: 'credit' })}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                returnForm.type === 'credit' 
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                  : "border-zinc-100 bg-zinc-50 text-zinc-400 grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
              )}
            >
              <ArrowDownCircle size={24} />
              <span className="text-xs font-black uppercase tracking-widest">Nota de Crédito</span>
              <span className="text-[10px] opacity-70">Devolução / Desconto</span>
            </button>
            <button
              type="button"
              onClick={() => setReturnForm({ ...returnForm, type: 'debit' })}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                returnForm.type === 'debit' 
                  ? "border-blue-500 bg-blue-50 text-blue-700" 
                  : "border-zinc-100 bg-zinc-50 text-zinc-400 grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
              )}
            >
              <ArrowUpCircle size={24} />
              <span className="text-xs font-black uppercase tracking-widest">Nota de Débito</span>
              <span className="text-[10px] opacity-70">Acréscimo de Valor</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReturnForm({ ...returnForm, note_category: 'return' })}
              className={cn(
                "py-2 rounded-lg border text-xs font-bold transition-all",
                returnForm.note_category === 'return' ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              Devolução de Itens
            </button>
            <button
              type="button"
              onClick={() => setReturnForm({ ...returnForm, note_category: 'correction' })}
              className={cn(
                "py-2 rounded-lg border text-xs font-bold transition-all",
                returnForm.note_category === 'correction' ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
              )}
            >
              Ajuste de Valor
            </button>
          </div>

          {!returnForm.purchase_id && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Selecionar Compra/Fatura</label>
              <select 
                required
                onChange={e => {
                  const p = purchases.find(pur => pur.id.toString() === e.target.value);
                  if (p) {
                    setReturnForm({
                      ...returnForm,
                      supplier_id: p.supplier_id,
                      purchase_id: p.id,
                      items: (typeof p.items === 'string' ? JSON.parse(p.items) : p.items).map((item: any) => ({ ...item, maxQuantity: item.quantity, selected: true })),
                      total_amount: p.total_amount
                    });
                  }
                }}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="">Selecionar uma fatura...</option>
                {purchases.filter(p => p.delivery_status === 'received' || p.is_direct).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.supplier_name} - Fatura: {p.invoice_number || '---'} (Kz {p.total_amount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {returnForm.note_category === 'correction' && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Valor do Ajuste (Kz)</label>
              <input 
                type="number" 
                required
                min="1"
                value={isNaN(returnForm.adjustment_amount) ? '' : returnForm.adjustment_amount}
                onChange={e => setReturnForm({ ...returnForm, adjustment_amount: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 font-bold"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Motivo</label>
            <textarea 
              required
              value={returnForm.reason}
              onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
              placeholder="Ex: Produto danificado, erro de faturação, acréscimo de itens..."
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 min-h-[80px]"
            />
          </div>

          {returnForm.note_category === 'return' && (
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Itens da Nota</label>
              <div className="border border-zinc-100 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Produto</th>
                      <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Qtd</th>
                      <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase text-right">Total c/ IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {returnForm.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={item.selected !== false}
                              onChange={e => {
                                const newItems = [...returnForm.items];
                                newItems[index] = { ...newItems[index], selected: e.target.checked };
                                setReturnForm({ ...returnForm, items: newItems });
                              }}
                              className={cn(
                                "rounded border-zinc-300 focus:ring-offset-0",
                                returnForm.type === 'credit' ? "text-emerald-600 focus:ring-emerald-500" : "text-blue-600 focus:ring-blue-500"
                              )}
                            />
                            <span className="text-sm font-bold">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            min="1"
                            max={returnForm.type === 'credit' ? (item.maxQuantity || item.quantity) : undefined}
                            disabled={item.selected === false}
                            value={isNaN(item.quantity) ? '' : item.quantity}
                            onChange={e => {
                              const newItems = [...returnForm.items];
                              newItems[index] = { ...newItems[index], quantity: parseInt(e.target.value) };
                              setReturnForm({ ...returnForm, items: newItems });
                            }}
                            className={cn(
                              "w-16 px-2 py-1 bg-zinc-100 rounded border-none text-center font-bold",
                              item.selected === false && "opacity-30"
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-sm">
                          Kz {(item.quantity * item.price * (1 + ((item.tax_percentage || 14) / 100))).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
            <span className="font-bold text-zinc-500">Total da Nota</span>
            <span className={cn(
              "text-2xl font-black",
              returnForm.type === 'credit' ? "text-rose-600" : "text-blue-600"
            )}>
              Kz {(returnForm.note_category === 'return' 
                ? returnForm.items.filter(i => i.selected !== false).reduce((sum, item) => sum + (item.quantity * item.price * (1 + ((item.tax_percentage || 14) / 100))), 0)
                : returnForm.adjustment_amount
              ).toLocaleString()}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Observações Internas</label>
            <textarea 
              value={returnForm.observations}
              onChange={e => setReturnForm({ ...returnForm, observations: e.target.value })}
              placeholder="Notas adicionais para controlo interno..."
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 min-h-[60px]"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg",
              returnForm.type === 'credit' 
                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200" 
                : "bg-blue-500 text-white hover:bg-blue-600 shadow-blue-200"
            )}
          >
            {loading ? "A processar..." : `Confirmar ${returnForm.type === 'credit' ? 'Nota de Crédito' : 'Nota de Débito'}`}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
        title="Visualização do Documento"
        maxWidth="max-w-4xl"
      >
        {previewData && (
          <PurchaseDocument 
            document={previewData.data}
            type={previewData.type}
            establishment={establishments.find(s => s.id.toString() === selectedEstablishmentId) || {}}
            owner={user}
          />
        )}
      </Modal>
    </div>
  );
};
