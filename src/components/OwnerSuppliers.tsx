import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  History,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';

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

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'blue' | 'rose' | 'emerald' }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  return (
    <div className={cn("p-6 rounded-2xl border flex items-center gap-4", colors[color])}>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm")}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
};

export const OwnerSuppliers = ({ user }: { user: User }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    nif: '',
    phone: '',
    email: '',
    country: 'Angola',
    city: '',
    address: '',
    responsible_person: '',
    payment_method: 'transfer',
    payment_term: '7',
    observations: '',
    category: '',
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    fetchSuppliers();
  }, [user.id]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`/api/owner/suppliers/${user.id}`);
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setSuppliers([]);
    }
  };

  const fetchHistory = async (supplierId: number) => {
    try {
      const res = await fetch(`/api/owner/suppliers/${supplierId}/purchases`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setHistory([]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      nif: '',
      phone: '',
      email: '',
      country: 'Angola',
      city: '',
      address: '',
      responsible_person: '',
      payment_method: 'transfer',
      payment_term: '7',
      observations: '',
      category: '',
      status: 'active'
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingSupplier ? `/api/owner/suppliers/${editingSupplier.id}` : '/api/owner/suppliers';
    const method = editingSupplier ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, owner_id: user.id })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingSupplier(null);
        resetForm();
        fetchSuppliers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nif?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Gestão de Fornecedores</h2>
          <p className="text-zinc-500">Gira os seus fornecedores e histórico de compras.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Procurar fornecedor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
          </div>
          <button 
            onClick={() => {
              setEditingSupplier(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
          >
            <Plus size={18} />
            Novo Fornecedor
          </button>
        </div>
      </div>

      <Card className="overflow-hidden border-zinc-100 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Empresa / NIF</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-800">{supplier.name}</p>
                        <p className="text-xs text-zinc-500">{supplier.responsible_person || 'Sem responsável'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-zinc-700">{supplier.company_name || '-'}</p>
                    <p className="text-xs text-zinc-400">{supplier.nif || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold">
                      {supplier.category || 'Geral'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-zinc-600">{supplier.phone}</p>
                    <p className="text-xs text-zinc-400">{supplier.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      supplier.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setViewingHistory(supplier);
                              fetchHistory(supplier.id);
                            }}
                            className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                            title="Ver Histórico"
                          >
                            <History size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setFormData({
                                name: supplier.name || '',
                                company_name: supplier.company_name || '',
                                nif: supplier.nif || '',
                                phone: supplier.phone || '',
                                email: supplier.email || '',
                                country: supplier.country || 'Angola',
                                city: supplier.city || '',
                                address: supplier.address || '',
                                responsible_person: supplier.responsible_person || '',
                                payment_method: supplier.payment_method || 'transfer',
                                payment_term: supplier.payment_term || '7',
                                observations: supplier.observations || '',
                                category: supplier.category || '',
                                status: supplier.status || 'active'
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Cadastro/Edição */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Dados Principais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome do Fornecedor *</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={formData.company_name}
                  onChange={e => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF</label>
                <input 
                  type="text" 
                  value={formData.nif}
                  onChange={e => setFormData({...formData, nif: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Categoria</label>
                <input 
                  type="text" 
                  placeholder="Ex: Bebidas, Limpeza, Serviços"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Localização</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">País</label>
                <input 
                  type="text" 
                  value={formData.country}
                  onChange={e => setFormData({...formData, country: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Cidade</label>
                <input 
                  type="text" 
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Dados Comerciais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Pessoa Responsável</label>
                <input 
                  type="text" 
                  value={formData.responsible_person}
                  onChange={e => setFormData({...formData, responsible_person: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Forma de Pagamento</label>
                <select 
                  value={formData.payment_method}
                  onChange={e => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="cash">Dinheiro</option>
                  <option value="transfer">Transferência</option>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="check">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Prazo de Pagamento</label>
                <select 
                  value={formData.payment_term}
                  onChange={e => setFormData({...formData, payment_term: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="0">Pronto Pagamento</option>
                  <option value="7">7 Dias</option>
                  <option value="15">15 Dias</option>
                  <option value="30">30 Dias</option>
                  <option value="60">60 Dias</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Informações Extras</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Observações</label>
                <textarea 
                  value={formData.observations}
                  onChange={e => setFormData({...formData, observations: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Status</label>
                <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, status: 'active'})}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      formData.status === 'active' ? "bg-white shadow-sm text-emerald-600" : "text-zinc-500"
                    )}
                  >
                    Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, status: 'inactive'})}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      formData.status === 'inactive' ? "bg-white shadow-sm text-rose-600" : "text-zinc-500"
                    )}
                  >
                    Inativo
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-lg shadow-zinc-200 hover:bg-zinc-800 transition-all active:scale-[0.98]">
            {editingSupplier ? "Guardar Alterações" : "Criar Fornecedor"}
          </button>
        </form>
      </Modal>

      {/* Modal Histórico */}
      <Modal 
        isOpen={!!viewingHistory} 
        onClose={() => setViewingHistory(null)} 
        title={`Histórico: ${viewingHistory?.name}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard 
              label="Total Comprado" 
              value={`Kz ${history.reduce((acc, p) => acc + p.total_amount, 0).toLocaleString()}`} 
              icon={ShoppingCart} 
              color="blue" 
            />
            <StatCard 
              label="Dívida Atual" 
              value={`Kz ${history.reduce((acc, p) => acc + (p.total_amount - p.paid_amount), 0).toLocaleString()}`} 
              icon={AlertTriangle} 
              color="rose" 
            />
            <StatCard 
              label="Última Compra" 
              value={history[0] ? new Date(history[0].timestamp).toLocaleDateString() : '-'} 
              icon={Calendar} 
              color="emerald" 
            />
          </div>

          <Card className="overflow-hidden border-zinc-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Fatura</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Pago</th>
                    <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {history.map(purchase => (
                    <tr key={purchase.id}>
                      <td className="px-6 py-4 text-sm text-zinc-600">{new Date(purchase.timestamp).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-bold text-zinc-800">{purchase.invoice_number}</td>
                      <td className="px-6 py-4 text-sm font-bold">Kz {purchase.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-medium">Kz {purchase.paid_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          purchase.status === 'paid' ? "bg-emerald-100 text-emerald-600" : 
                          purchase.status === 'partial' ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                        )}>
                          {purchase.status === 'paid' ? 'Pago' : purchase.status === 'partial' ? 'Parcial' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 italic">Nenhuma compra registada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
};
