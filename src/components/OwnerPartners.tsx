import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Briefcase, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  ChevronRight,
  Filter,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Star,
  Clock,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Establishment as EstablishmentType } from '../types';

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

export const OwnerPartners = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'clients' | 'suppliers' | 'reports'>('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierReport, setSupplierReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  // Forms
  const [clientForm, setClientForm] = useState({ name: '', nif: '', email: '', phone: '', address: '', type: 'individual' });
  const [supplierForm, setSupplierForm] = useState({ name: '', nif: '', email: '', phone: '', address: '', category: '' });

  useEffect(() => {
    fetchData();
  }, [user.establishment_id, user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const establishmentId = user.establishment_id || (user.role === 'owner' ? 1 : null);
      const [clientsRes, suppliersRes, reportRes] = await Promise.all([
        fetch(`/api/owner/clients/${establishmentId}?userId=${user.id}`),
        fetch(`/api/owner/suppliers/${user.id}`),
        fetch(`/api/owner/suppliers/${user.id}/report`)
      ]);

      const clientsData = await clientsRes.json();
      const suppliersData = await suppliersRes.json();
      const reportData = await reportRes.json();

      setClients(clientsData);
      setSuppliers(suppliersData);
      setSupplierReport(reportData);
    } catch (error) {
      console.error("Error fetching partners data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const establishmentId = user.establishment_id || 1;
    const url = editingClient ? `/api/owner/clients/${editingClient.id}` : '/api/owner/clients';
    const method = editingClient ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...clientForm, establishment_id: establishmentId })
      });

      if (res.ok) {
        setIsClientModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingSupplier ? `/api/owner/suppliers/${editingSupplier.id}` : '/api/owner/suppliers';
    const method = editingSupplier ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...supplierForm, owner_id: user.id })
      });

      if (res.ok) {
        setIsSupplierModalOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getClientSegmentation = (client: any) => {
    const totalSpent = client.total_spent || 0;
    const totalPurchases = client.total_purchases || 0;

    if (totalSpent > 100000 || totalPurchases > 10) {
      return { label: 'VIP', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Star };
    } else if (totalSpent > 20000 || totalPurchases > 3) {
      return { label: 'Frequente', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock };
    } else {
      return { label: 'Esporádico', color: 'bg-zinc-100 text-zinc-600 border-zinc-200', icon: Calendar };
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.nif.includes(search)
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.nif.includes(search)
  );

  return (
    <div className="flex-1 flex flex-col p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight">Parceiros</h1>
          <p className="text-zinc-500 mt-1">Gira os seus clientes e fornecedores num único lugar.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('clients')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'clients' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Users size={18} />
            Clientes
          </button>
          <button 
            onClick={() => setActiveTab('suppliers')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'suppliers' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <Briefcase size={18} />
            Fornecedores
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === 'reports' ? "bg-black text-white shadow-lg shadow-black/20" : "bg-white text-zinc-500 hover:bg-zinc-100"
            )}
          >
            <TrendingUp size={18} />
            Relatórios
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            type="text" 
            placeholder={activeTab === 'clients' ? "Pesquisar clientes..." : "Pesquisar fornecedores..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 transition-all"
          />
        </div>
        {activeTab === 'clients' && (
          <button 
            onClick={() => {
              setEditingClient(null);
              setClientForm({ name: '', nif: '', email: '', phone: '', address: '', type: 'individual' });
              setIsClientModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        )}
        {activeTab === 'suppliers' && (
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm({ name: '', nif: '', email: '', phone: '', address: '', category: '' });
              setIsSupplierModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            <Plus size={18} />
            Novo Fornecedor
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {activeTab === 'clients' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Segmentação</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total Compras</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredClients.map((client) => {
                    const seg = getClientSegmentation(client);
                    return (
                      <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 font-bold">
                              {client.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900">{client.name}</p>
                              <p className="text-xs text-zinc-500">NIF: {client.nif}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", seg.color)}>
                            <seg.icon size={12} />
                            {seg.label}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-zinc-600">{client.email || '---'}</p>
                          <p className="text-xs text-zinc-400">{client.phone || '---'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-900">Kz {(client.total_spent || 0).toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">{client.total_purchases || 0} compras</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setEditingClient(client);
                              setClientForm({
                                name: client.name || '',
                                nif: client.nif || '',
                                email: client.email || '',
                                phone: client.phone || '',
                                address: client.address || '',
                                type: client.type || 'individual'
                              });
                              setIsClientModalOpen(true);
                            }}
                            className="p-2 rounded-lg transition-all text-zinc-400 hover:text-black hover:bg-zinc-100"
                          >
                            <Edit2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Contacto</th>
                    <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 font-bold">
                            {supplier.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900">{supplier.name}</p>
                            <p className="text-xs text-zinc-500">NIF: {supplier.nif}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold">
                          {supplier.category || 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-600">{supplier.email || '---'}</p>
                        <p className="text-xs text-zinc-400">{supplier.phone || '---'}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setSupplierForm({
                              name: supplier.name || '',
                              nif: supplier.nif || '',
                              email: supplier.email || '',
                              phone: supplier.phone || '',
                              address: supplier.address || '',
                              category: supplier.category || ''
                            });
                            setIsSupplierModalOpen(true);
                          }}
                          className="p-2 rounded-lg transition-all text-zinc-400 hover:text-black hover:bg-zinc-100"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-black text-white border-none">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Total Compras</p>
                  <h3 className="text-3xl font-black mt-1">
                    Kz {supplierReport.reduce((acc, s) => acc + s.total_spent, 0).toLocaleString()}
                  </h3>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                      <Check size={20} />
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Total Pago</p>
                  <h3 className="text-3xl font-black mt-1">
                    Kz {supplierReport.reduce((acc, s) => acc + s.total_paid, 0).toLocaleString()}
                  </h3>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                      <AlertCircle size={20} />
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider">Dívida Total</p>
                  <h3 className="text-3xl font-black mt-1 text-rose-600">
                    Kz {supplierReport.reduce((acc, s) => acc + s.total_debt, 0).toLocaleString()}
                  </h3>
                </Card>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-100">
                  <h3 className="text-lg font-bold">Relatório de Compras por Fornecedor</h3>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Fornecedor</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Qtd. Compras</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total Gasto</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Total Pago</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-wider">Dívida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {supplierReport.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">NIF: {item.nif}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold">{item.total_purchases}</span>
                        </td>
                        <td className="px-6 py-4 font-bold">Kz {item.total_spent.toLocaleString()}</td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">Kz {item.total_paid.toLocaleString()}</td>
                        <td className="px-6 py-4 text-rose-600 font-bold">Kz {item.total_debt.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Client Modal */}
      <Modal 
        isOpen={isClientModalOpen} 
        onClose={() => setIsClientModalOpen(false)} 
        title={editingClient ? "Editar Cliente" : "Novo Cliente"}
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Nome Completo</label>
            <input 
              type="text" 
              required
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">NIF</label>
              <input 
                type="text" 
                required
                value={clientForm.nif}
                onChange={(e) => setClientForm({ ...clientForm, nif: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Tipo</label>
              <select 
                value={clientForm.type}
                onChange={(e) => setClientForm({ ...clientForm, type: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              >
                <option value="individual">Individual</option>
                <option value="company">Empresa</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Email</label>
            <input 
              type="email" 
              value={clientForm.email}
              onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Telefone</label>
            <input 
              type="text" 
              value={clientForm.phone}
              onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Endereço</label>
            <textarea 
              value={clientForm.address}
              onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] mt-4"
          >
            Salvar Cliente
          </button>
        </form>
      </Modal>

      {/* Supplier Modal */}
      <Modal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setIsSupplierModalOpen(false)} 
        title={editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Nome da Empresa</label>
            <input 
              type="text" 
              required
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">NIF</label>
              <input 
                type="text" 
                required
                value={supplierForm.nif}
                onChange={(e) => setSupplierForm({ ...supplierForm, nif: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-zinc-700">Categoria</label>
              <input 
                type="text" 
                placeholder="Ex: Bebidas, Limpeza"
                value={supplierForm.category}
                onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Email</label>
            <input 
              type="email" 
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Telefone</label>
            <input 
              type="text" 
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-zinc-700">Endereço</label>
            <textarea 
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98] mt-4"
          >
            Salvar Fornecedor
          </button>
        </form>
      </Modal>
    </div>
  );
};
