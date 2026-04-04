import React, { useState, useEffect, FormEvent } from 'react';
import { User, Store } from '../types';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Tag, 
  Info, 
  DollarSign, 
  Store as StoreIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';

interface Service {
  id: number;
  owner_id: number;
  store_id: number;
  store_name?: string;
  name: string;
  code: string;
  description: string;
  price: number;
  availability_condition: 'always' | 'product_purchased';
  show_in_pos: number;
  tax_id?: number;
  tax_percentage?: number;
  tax_code?: string;
  created_at: string;
}

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-zinc-100 shadow-sm rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h3 className="font-black text-zinc-900 uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <XCircle size={20} className="text-zinc-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};

export const OwnerServices = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'management' | 'report'>('management');
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const [formData, setFormData] = useState({
    store_id: '',
    name: '',
    code: '',
    description: '',
    price: '',
    availability_condition: 'always' as 'always' | 'product_purchased',
    show_in_pos: 1,
    tax_id: ''
  });

  useEffect(() => {
    fetchData();
    if (activeTab === 'report') {
      fetchReport();
    }
  }, [user.id, activeTab]);

  const fetchReport = async () => {
    setIsReportLoading(true);
    try {
      const res = await fetch(`/api/owner/services-report/${user.id}`);
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setIsReportLoading(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, storesRes, taxesRes] = await Promise.all([
        fetch(`/api/owner/services/${user.id}`),
        fetch(`/api/admin/stores`),
        fetch(`/api/owner/taxes-by-owner/${user.id}`)
      ]);
      
      const servicesData = await servicesRes.json();
      const storesData = await storesRes.json();
      const taxesData = await taxesRes.json();
      
      setServices(servicesData);
      setStores(storesData.filter((s: Store) => s.owner_id === user.id));
      setTaxes(taxesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingService ? `/api/owner/services/${editingService.id}` : '/api/owner/services';
    const method = editingService ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          owner_id: user.id,
          price: Number(formData.price)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingService(null);
        setFormData({
          store_id: '',
          name: '',
          code: '',
          description: '',
          price: '',
          availability_condition: 'always',
          show_in_pos: 1,
          tax_id: ''
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      store_id: service.store_id.toString(),
      name: service.name,
      code: service.code,
      description: service.description,
      price: service.price.toString(),
      availability_condition: service.availability_condition,
      show_in_pos: service.show_in_pos,
      tax_id: service.tax_id?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const res = await fetch(`/api/owner/services/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Serviços</h2>
          <p className="text-zinc-500">Gestão e relatórios de serviços prestados em suas lojas.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('management')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'management' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Gestão
          </button>
          <button 
            onClick={() => setActiveTab('report')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'report' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Relatório
          </button>
        </div>
      </div>

      {activeTab === 'management' ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou código..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
              />
            </div>
            <button 
              onClick={() => {
                setEditingService(null);
                setFormData({
                  store_id: '',
                  name: '',
                  code: '',
                  description: '',
                  price: '',
                  availability_condition: 'always',
                  show_in_pos: 1,
                  tax_id: ''
                });
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <Plus size={20} />
              Novo Serviço
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <Package size={40} />
              </div>
              <h3 className="text-lg font-bold text-zinc-800">Nenhum serviço encontrado</h3>
              <p className="text-zinc-500 max-w-xs mx-auto">Comece cadastrando seu primeiro serviço para vê-lo aqui.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map(service => (
                <div key={service.id} className="bg-white border border-zinc-100 shadow-sm rounded-2xl overflow-hidden group hover:border-orange-200 transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <Tag size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEdit(service)}
                          className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(service.id)}
                          className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-wider">
                          {service.code}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          service.show_in_pos ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {service.show_in_pos ? 'No PDV' : 'Oculto'}
                        </span>
                        {service.tax_code && (
                          <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-wider">
                            {service.tax_code} ({service.tax_percentage}%)
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-zinc-900 leading-tight">{service.name}</h4>
                      <p className="text-sm text-zinc-500 line-clamp-2 mt-2">{service.description}</p>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Preço</p>
                        <p className="text-xl font-black text-orange-600">Kz {service.price.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-end gap-1">
                          <StoreIcon size={10} /> {service.store_name}
                        </p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                          {service.availability_condition === 'always' ? 'Sempre Disponível' : 'Requer Compra'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-orange-50 border-orange-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Receita Total</p>
                  <h3 className="text-2xl font-black text-zinc-900">
                    Kz {reportData.reduce((acc, curr) => acc + curr.revenue, 0).toLocaleString()}
                  </h3>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-zinc-50 border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                  <BarChart3 size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total de Vendas</p>
                  <h3 className="text-2xl font-black text-zinc-900">
                    {reportData.reduce((acc, curr) => acc + curr.quantity, 0)}
                  </h3>
                </div>
              </div>
            </Card>
            <Card className="p-6 bg-zinc-50 border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                  <Tag size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Serviços Distintos</p>
                  <h3 className="text-2xl font-black text-zinc-900">
                    {new Set(reportData.map(r => r.id)).size}
                  </h3>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="font-black text-zinc-900 uppercase tracking-tight">Relatório de Vendas por Serviço</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-zinc-200 rounded-lg transition-colors text-zinc-400">
                  <Filter size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Serviço</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Loja</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Qtd Vendida</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Receita Total</th>
                    <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Última Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {isReportLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-bold">
                        Nenhuma venda de serviço registada até ao momento.
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item, idx) => (
                      <tr key={`${item.id}_${item.store_id}`} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-zinc-900">{item.name}</p>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{item.code}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <StoreIcon size={14} className="text-zinc-400" />
                            <span className="text-sm font-medium text-zinc-600">{item.store_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 bg-zinc-100 text-zinc-900 rounded-full text-xs font-black">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-black text-orange-600">Kz {item.revenue.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-zinc-500">
                            <Calendar size={14} />
                            <span className="text-xs font-medium">{new Date(item.last_sold).toLocaleDateString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingService ? "Editar Serviço" : "Novo Serviço"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Loja</label>
              <select 
                required
                value={formData.store_id}
                onChange={e => setFormData({...formData, store_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="">Selecione uma loja</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Serviço</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Ex: Instalação"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Código (ID)</label>
                <input 
                  type="text" required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Ex: SERV001"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Descrição</label>
              <textarea 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all h-24 resize-none"
                placeholder="Descreva o serviço..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Preço (Kz)</label>
                <input 
                  type="number" required min="0"
                  value={isNaN(Number(formData.price)) ? '' : formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Mostrar no PDV</label>
                <select 
                  value={formData.show_in_pos}
                  onChange={e => setFormData({...formData, show_in_pos: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                >
                  <option value={1}>SIM</option>
                  <option value={0}>NÃO</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Disponibilidade</label>
              <select 
                value={formData.availability_condition}
                onChange={e => setFormData({...formData, availability_condition: e.target.value as any})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="always">Sempre Disponível</option>
                <option value="product_purchased">Só se houver produto comprado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Imposto Aplicado</label>
              <select 
                value={formData.tax_id}
                onChange={e => setFormData({...formData, tax_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              >
                <option value="">Usar Padrão da Loja</option>
                {taxes.filter(t => t.store_id === Number(formData.store_id) && t.status === 'active').map(tax => (
                  <option key={tax.id} value={tax.id}>{tax.name} ({tax.percentage}%)</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            {editingService ? 'Actualizar Serviço' : 'Cadastrar Serviço'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
