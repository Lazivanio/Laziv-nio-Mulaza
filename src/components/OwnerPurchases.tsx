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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Store as StoreType } from '../types';

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
  const [activeTab, setActiveTab] = useState<'direct' | 'orders' | 'receipts' | 'returns'>('direct');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isManageOrderModalOpen, setIsManageOrderModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isDirectPurchase, setIsDirectPurchase] = useState(false);

  // Forms
  const [purchaseForm, setPurchaseForm] = useState({
    store_id: '',
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
    total_amount: 0
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'transfer'
  });

  useEffect(() => {
    fetchInitialData();
  }, [user.id]);

  useEffect(() => {
    if (selectedStoreId) {
      fetchPurchases();
      fetchReturns();
      fetchProducts();
    }
  }, [selectedStoreId, activeTab]);

  const fetchInitialData = async () => {
    try {
      const [storesRes, suppliersRes] = await Promise.all([
        fetch(`/api/owner/stores/${user.id}`),
        fetch(`/api/owner/suppliers/${user.id}`)
      ]);
      const storesData = await storesRes.json();
      const suppliersData = await suppliersRes.json();
      
      setStores(storesData);
      setSuppliers(suppliersData);
      
      if (storesData.length > 0) {
        setSelectedStoreId(storesData[0].id.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPurchases = async () => {
    try {
      const res = await fetch(`/api/owner/purchases/${selectedStoreId}`);
      const data = await res.json();
      setPurchases(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReturns = async () => {
    try {
      const res = await fetch(`/api/owner/purchase-returns/${selectedStoreId}`);
      const data = await res.json();
      setReturns(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/owner/products/${selectedStoreId}`);
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddProductToPurchase = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (!product) return;
    if (purchaseForm.items.find(item => item.product_id === product.id)) return;

    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        price: product.cost_price || 0
      }]
    });
  };

  const handleUpdatePurchaseItem = (index: number, field: string, value: any) => {
    const newItems = [...purchaseForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setPurchaseForm({ ...purchaseForm, items: newItems });
  };

  const handleSavePurchase = async (e: FormEvent) => {
    e.preventDefault();
    if (purchaseForm.items.length === 0) return;

    setLoading(true);
    try {
      const total_amount = purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const res = await fetch('/api/owner/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...purchaseForm,
          store_id: selectedStoreId,
          total_amount,
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
    const selectedItems = returnForm.items.filter(item => item.selected !== false);
    if (selectedItems.length === 0) return;

    setLoading(true);
    try {
      const total_amount = selectedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const res = await fetch('/api/owner/purchase-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStoreId,
          supplier_id: returnForm.supplier_id,
          purchase_id: returnForm.purchase_id,
          total_amount,
          reason: returnForm.reason,
          items: selectedItems
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
    if (activeTab === 'returns') return false; // To be implemented
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
            onClick={() => setActiveTab('returns')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'returns' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <RotateCcw size={18} />
            Devoluções
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select 
          value={selectedStoreId}
          onChange={e => setSelectedStoreId(e.target.value)}
          className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all font-bold min-w-[200px]"
        >
          {stores.map(s => (
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
            if (activeTab === 'returns') {
              setActiveTab('receipts');
              alert("Por favor, selecione uma encomenda recebida no histórico para iniciar a devolução.");
              return;
            }
            setPurchaseForm({ store_id: selectedStoreId, supplier_id: '', invoice_number: '', due_date: '', items: [], paid_amount: 0 });
            setIsDirectPurchase(activeTab === 'direct');
            setIsPurchaseModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
        >
          <Plus size={18} />
          {activeTab === 'direct' ? 'Comprar' : activeTab === 'returns' ? 'Nova Devolução' : 'Nova Encomenda'}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {activeTab !== 'returns' ? (
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
                            <button 
                              onClick={() => {
                                setReturnForm({
                                  supplier_id: p.supplier_id,
                                  purchase_id: p.id,
                                  reason: '',
                                  items: (typeof p.items === 'string' ? JSON.parse(p.items) : p.items).map((item: any) => ({ ...item, maxQuantity: item.quantity, selected: true })),
                                  total_amount: p.total_amount
                                });
                                setIsReturnModalOpen(true);
                              }}
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                              title="Devolver"
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
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
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Produtos Devolvidos</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Motivo</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total Devolvido</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {returns.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-zinc-900">{r.supplier_name}</p>
                        <p className="text-xs text-zinc-500">Ref: #{r.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(r.items || []).map((item: any, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-bold">
                              {item.quantity}x {item.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600">{r.reason}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-rose-600">Kz {r.total_amount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-500">{new Date(r.timestamp).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))}
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
                    <td className="px-4 py-3 text-right font-bold">
                      Kz {(item.quantity * item.price).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
        <span className="font-bold text-zinc-500">Total da Compra</span>
        <span className="text-2xl font-black">Kz {purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toLocaleString()}</span>
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

      {/* Return Modal */}
      <Modal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        title="Registar Devolução"
      >
        <form onSubmit={handleSaveReturn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Motivo da Devolução</label>
            <textarea 
              required
              value={returnForm.reason}
              onChange={e => setReturnForm({ ...returnForm, reason: e.target.value })}
              placeholder="Ex: Produto danificado, fora de validade..."
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Itens a Devolver</label>
            <div className="border border-zinc-100 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Produto</th>
                    <th className="px-4 py-2 text-xs font-bold text-zinc-500 uppercase">Qtd</th>
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
                            className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-sm font-bold">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          min="1"
                          max={item.maxQuantity || item.quantity}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-all active:scale-[0.98] shadow-lg shadow-rose-200"
          >
            {loading ? "A processar..." : "Confirmar Devolução"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
