import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Warehouse, 
  Plus, 
  Trash2, 
  Edit2, 
  Store as StoreIcon, 
  CheckCircle2, 
  XCircle,
  Package,
  ArrowRight
} from 'lucide-react';
import { User, Store } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
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

export const OwnerWarehouses = ({ user }: { user: User }) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [formData, setFormData] = useState({
    store_id: '',
    name: '',
    type: 'principal',
    status: 'active'
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [warehousesRes, storesRes] = await Promise.all([
        fetch(`/api/owner/warehouses/${user.id}`),
        fetch(`/api/owner/stores/${user.id}`)
      ]);
      setWarehouses(await warehousesRes.json());
      setStores(await storesRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = editingWarehouse 
        ? `/api/owner/warehouses/${editingWarehouse.id}` 
        : '/api/owner/warehouses';
      const method = editingWarehouse ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingWarehouse(null);
        setFormData({ store_id: '', name: '', type: 'principal', status: 'active' });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (warehouse: any) => {
    setEditingWarehouse(warehouse);
    setFormData({
      store_id: warehouse.store_id.toString(),
      name: warehouse.name,
      type: warehouse.type,
      status: warehouse.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este armazém?")) return;
    try {
      await fetch(`/api/owner/warehouses/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <div className="p-12 text-center text-zinc-500">Carregando armazéns...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Gestão de Armazéns</h2>
          <p className="text-zinc-500">Organize seus produtos por armazéns específicos para cada loja.</p>
        </div>
        <button 
          onClick={() => {
            setEditingWarehouse(null);
            setFormData({ store_id: '', name: '', type: 'principal', status: 'active' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Novo Armazém
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map(w => (
          <Card key={w.id} className={cn("p-6 space-y-4 group", w.status === 'inactive' && "opacity-60")}>
            <div className="flex justify-between items-start">
              <div className="p-3 bg-zinc-100 rounded-xl group-hover:bg-black group-hover:text-white transition-all duration-300">
                <Warehouse size={24} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(w)}
                  className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(w.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                  w.type === 'principal' ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"
                )}>
                  {w.type}
                </span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                  w.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                  {w.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <h4 className="text-lg font-black text-zinc-900">{w.name}</h4>
              <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <StoreIcon size={12} /> {w.store_name}
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-2">
                <Package size={14} />
                <span className="text-xs font-bold">Produtos vinculados</span>
              </div>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}

        {warehouses.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <Warehouse size={48} className="mx-auto mb-4 text-zinc-300" />
            <h3 className="text-lg font-bold text-zinc-900">Nenhum armazém extra</h3>
            <p className="text-zinc-500 max-w-xs mx-auto mt-2">
              Por padrão, cada loja já possui um armazém principal. Crie novos armazéns apenas se precisar de separação avançada.
            </p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingWarehouse ? "Editar Armazém" : "Novo Armazém"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Loja</label>
              <select 
                required
                value={formData.store_id}
                onChange={e => setFormData({...formData, store_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecione uma loja</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Armazém</label>
              <input 
                type="text" required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="Ex: Armazém Central, Depósito Norte"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Tipo</label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="principal">Principal</option>
                  <option value="secundário">Secundário</option>
                  <option value="devoluções">Devoluções</option>
                  <option value="exposição">Exposição</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
          >
            {editingWarehouse ? "Guardar Alterações" : "Criar Armazém"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
