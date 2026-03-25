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
  AlertCircle
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
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    store_id: '',
    name: '',
    code: '',
    description: '',
    price: '',
    availability_condition: 'always' as 'always' | 'product_purchased',
    show_in_pos: 1
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [servicesRes, storesRes] = await Promise.all([
        fetch(`/api/owner/services/${user.id}`),
        fetch(`/api/admin/stores`)
      ]);
      
      const servicesData = await servicesRes.json();
      const storesData = await storesRes.json();
      
      setServices(servicesData);
      setStores(storesData.filter((s: Store) => s.owner_id === user.id));
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
          show_in_pos: 1
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
      show_in_pos: service.show_in_pos
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
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Gestão de Serviços</h2>
          <p className="text-zinc-500">Cadastre e gerencie os serviços disponíveis para venda em suas lojas.</p>
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
              show_in_pos: 1
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
        >
          <Plus size={20} />
          Novo Serviço
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar por nome ou código..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
        />
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
