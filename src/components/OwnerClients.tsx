import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

export const OwnerClients = ({ user }: { user: User }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    email: '',
    phone: '',
    address: '',
    type: 'individual' as 'individual' | 'company'
  });

  useEffect(() => {
    fetchClients();
  }, [user.id]);

  const fetchClients = async () => {
    const storeId = user.store_id || 1;
    const res = await fetch(`/api/owner/clients/${storeId}`);
    const data = await res.json();
    setClients(data);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const storeId = user.store_id || 1;
    const url = editingClient ? `/api/owner/clients/${editingClient.id}` : '/api/owner/clients';
    const method = editingClient ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, store_id: storeId })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData({ name: '', nif: '', email: '', phone: '', address: '', type: 'individual' });
        fetchClients();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Gestão de Clientes</h2>
          <p className="text-zinc-500">Registe e gira os seus clientes para faturação.</p>
        </div>
        <button 
          onClick={() => {
            setEditingClient(null);
            setFormData({ name: '', nif: '', email: '', phone: '', address: '', type: 'individual' });
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-600/20"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </div>

      <Card className="overflow-hidden border-zinc-100 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">NIF</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Contacto</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-800">{client.name}</p>
                        <p className="text-xs text-zinc-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      client.type === 'company' ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {client.type === 'company' ? 'Empresa' : 'Pessoa'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-600">{client.nif}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{client.phone}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setEditingClient(client);
                          setFormData({
                            name: client.name,
                            nif: client.nif || '',
                            email: client.email || '',
                            phone: client.phone || '',
                            address: client.address || '',
                            type: client.type || 'individual'
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-zinc-400 hover:text-orange-500 transition-colors"
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingClient ? "Editar Cliente" : "Novo Cliente"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 p-1 bg-zinc-100 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'individual' })}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                formData.type === 'individual' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'
              }`}
            >
              Pessoa Física
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'company' })}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                formData.type === 'company' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'
              }`}
            >
              Empresa
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
                {formData.type === 'company' ? 'Nome da Empresa' : 'Nome Completo'}
              </label>
              <input 
                type="text" required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder={formData.type === 'company' ? "Ex: Empresa LDA" : "Ex: João Silva"}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF</label>
              <input 
                type="text" required
                value={formData.nif}
                onChange={e => setFormData({...formData, nif: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="Ex: 500123456"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone</label>
              <input 
                type="text"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="Ex: 923 000 000"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email</label>
              <input 
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="Ex: joao@email.com"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
              <textarea 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all h-20 resize-none"
                placeholder="Endereço completo..."
              />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95 mt-4"
          >
            {editingClient ? "Guardar Alterações" : "Registar Cliente"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
