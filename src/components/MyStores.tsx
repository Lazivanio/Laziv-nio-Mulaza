import React, { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Store, 
  FileText, 
  Edit2, 
  Settings2, 
  Home, 
  Upload, 
  X,
  Wallet,
  Monitor,
  CheckCircle,
  Lock
} from 'lucide-react';
import { User, Store as StoreType, BankAccount } from '../types';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div {...props} className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const MyStores = ({ user }: { user: User }) => {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    nif: '',
    logo_url: '',
    status: 'active' as 'active' | 'inactive',
    bank_accounts: [] as BankAccount[]
  });

  const [viewingProformasStore, setViewingProformasStore] = useState<StoreType | null>(null);
  const [proformas, setProformas] = useState<any[]>([]);
  const [isProformaListModalOpen, setIsProformaListModalOpen] = useState(false);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [selectedStoreForOpening, setSelectedStoreForOpening] = useState<StoreType | null>(null);
  const [registersForSelectedStore, setRegistersForSelectedStore] = useState<any[]>([]);
  const [openingAmounts, setOpeningAmounts] = useState<Record<number, string>>({});

  const fetchStores = () => {
    fetch(`/api/owner/stores/${user.id}`)
      .then(res => res.json())
      .then(setStores);
  };

  const fetchProformas = (storeId: number) => {
    fetch(`/api/owner/proforma/${storeId}`)
      .then(res => res.json())
      .then(setProformas);
  };

  useEffect(fetchStores, [user.id]);

  useEffect(() => {
    if (viewingProformasStore) {
      fetchProformas(viewingProformasStore.id);
    }
  }, [viewingProformasStore]);

  const handleOpenRegisterModal = (store: StoreType) => {
    setSelectedStoreForOpening(store);
    fetch(`/api/owner/stores/${store.id}/cash-registers`)
      .then(res => res.json())
      .then(data => {
        setRegistersForSelectedStore(data);
        setIsOpeningModalOpen(true);
      });
  };

  const handleOpenSession = async (registerId: number, amount: string) => {
    if (!amount || isNaN(parseFloat(amount))) {
      alert('Por favor, insira um valor de abertura válido.');
      return;
    }

    try {
      const res = await fetch('/api/seller/open-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStoreForOpening?.id,
          seller_id: user.id,
          cash_register_id: registerId,
          opening_amount: parseFloat(amount)
        })
      });

      if (res.ok) {
        setOpeningAmounts(prev => ({ ...prev, [registerId]: '' }));
        if (selectedStoreForOpening) {
          fetch(`/api/owner/stores/${selectedStoreForOpening.id}/cash-registers`)
            .then(res => res.json())
            .then(setRegistersForSelectedStore);
        }
        alert('Caixa aberto com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao abrir caixa.');
      }
    } catch (error) {
      console.error("Error opening session:", error);
      alert('Erro de conexão ao abrir caixa.');
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    const amount = prompt('Insira o valor físico em caixa para fechar:');
    if (amount === null) return;
    
    const physicalAmount = parseFloat(amount);
    if (isNaN(physicalAmount)) {
      alert('Por favor, insira um valor válido.');
      return;
    }

    try {
      const res = await fetch('/api/seller/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          physical_amount: physicalAmount,
          closing_amount: 0,
          seller_id: user.id
        })
      });

      if (res.ok) {
        if (selectedStoreForOpening) {
          fetch(`/api/owner/stores/${selectedStoreForOpening.id}/cash-registers`)
            .then(res => res.json())
            .then(setRegistersForSelectedStore);
        }
        alert('Caixa fechado com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao fechar caixa.');
      }
    } catch (error) {
      console.error("Error closing session:", error);
      alert('Erro de conexão ao fechar caixa.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingStore ? `/api/owner/stores/${editingStore.id}` : '/api/owner/stores';
    const method = editingStore ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, owner_id: user.id })
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingStore(null);
      setFormData({ name: '', address: '', phone: '', email: '', nif: '', logo_url: '', status: 'active', bank_accounts: [] });
      fetchStores();
    } else {
      const data = await res.json();
      alert(data.error || "Erro ao processar pedido");
    }
  };

  const handleEdit = (store: StoreType) => {
    setEditingStore(store);
    setFormData({
      name: store.name || '',
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
      nif: store.nif || '',
      logo_url: store.logo_url || '',
      status: store.status,
      bank_accounts: store.bank_accounts || []
    });
    setIsModalOpen(true);
  };

  const addBankAccount = () => {
    setFormData({
      ...formData,
      bank_accounts: [...formData.bank_accounts, { bank_name: '', iban: '', holder: '', account_number: '' }]
    });
  };

  const removeBankAccount = (index: number) => {
    setFormData({
      ...formData,
      bank_accounts: formData.bank_accounts.filter((_, i) => i !== index)
    });
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
    const newAccounts = [...formData.bank_accounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setFormData({ ...formData, bank_accounts: newAccounts });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Minhas Lojas</h2>
          <p className="text-zinc-500">Gerencie e configure suas unidades de negócio.</p>
        </div>
        <button 
          onClick={() => {
            setEditingStore(null);
            setFormData({ name: '', address: '', phone: '', email: '', nif: '', logo_url: '', status: 'active', bank_accounts: [] });
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto bg-black text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-black/10"
        >
          <Plus size={20} />
          Nova Loja
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map(store => (
          <Card key={store.id} className="group hover:border-black transition-all duration-300">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-black group-hover:text-white transition-colors overflow-hidden">
                  {store.logo_url ? (
                    <img src={store.logo_url || undefined} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Store size={32} />
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setViewingProformasStore(store);
                      setIsProformaListModalOpen(true);
                    }}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                    title="Ver Proformas"
                  >
                    <FileText size={18} />
                  </button>
                  <button 
                    onClick={() => handleOpenRegisterModal(store)}
                    className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Abrir Caixa"
                  >
                    <Wallet size={18} />
                  </button>
                  <button 
                    onClick={() => handleEdit(store)}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <Link 
                    to={`/owner/stores/${store.id}`}
                    className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                  >
                    <Settings2 size={18} />
                  </Link>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{store.name}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                    store.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {store.status === 'active' ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 flex items-center gap-1">
                  <Home size={14} /> {store.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-100">
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Vendas Hoje</p>
                  <p className="font-bold text-zinc-800">Kz {(store.today_sales || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Pessoal</p>
                  <p className="font-bold text-zinc-800">{store.staff_count} Colaboradores</p>
                </div>
              </div>
            </div>
            <Link 
              to={`/owner/stores/${store.id}`}
              className="block w-full py-4 bg-zinc-50 text-center text-sm font-black text-zinc-600 hover:bg-black hover:text-white transition-all border-t border-zinc-100 flex items-center justify-center gap-2"
            >
              <Settings2 size={16} />
              Aceder Painel Administrativo
            </Link>
          </Card>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingStore ? "Editar Loja" : "Cadastrar Nova Loja"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nome da Loja</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Endereço</label>
              <input 
                type="text" 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email (Opcional)</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">NIF</label>
              <input 
                type="text" 
                value={formData.nif}
                onChange={e => setFormData({...formData, nif: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Logotipo da Loja</label>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <input 
                    type="text" 
                    value={formData.logo_url}
                    onChange={e => setFormData({...formData, logo_url: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all text-sm" 
                    placeholder="URL da imagem (https://...)"
                  />
                  <div className="relative">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const base64 = await fileToBase64(file);
                            setFormData({...formData, logo_url: base64});
                          } catch (err) {
                            console.error("Error converting file to base64", err);
                          }
                        }
                      }}
                      className="hidden"
                      id="store-logo-upload"
                    />
                    <label 
                      htmlFor="store-logo-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-black hover:bg-zinc-50 transition-all text-sm font-bold text-zinc-600"
                    >
                      <Upload size={18} /> Carregar Imagem Local
                    </label>
                  </div>
                </div>
                {formData.logo_url && (
                  <div className="w-24 h-24 bg-zinc-100 rounded-2xl overflow-hidden border border-zinc-200 shrink-0">
                    <img src={formData.logo_url} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>
            {editingStore && (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Estado da Loja</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-black transition-all"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>
            )}

            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Coordenadas Bancárias</label>
                <button 
                  type="button"
                  onClick={addBankAccount}
                  className="text-[10px] font-bold text-orange-500 flex items-center gap-1 hover:text-orange-600 transition-colors"
                >
                  <Plus size={12} /> Adicionar Conta
                </button>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.bank_accounts.map((account, index) => (
                  <div key={index} className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 relative">
                    <button 
                      type="button"
                      onClick={() => removeBankAccount(index)}
                      className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-rose-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Banco</label>
                        <input 
                          type="text" 
                          required
                          value={account.bank_name}
                          onChange={e => updateBankAccount(index, 'bank_name', e.target.value)}
                          placeholder="Ex: BAI, BFA..."
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:border-black transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Titular</label>
                        <input 
                          type="text" 
                          required
                          value={account.holder}
                          onChange={e => updateBankAccount(index, 'holder', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:border-black transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">IBAN</label>
                        <input 
                          type="text" 
                          required
                          value={account.iban}
                          onChange={e => updateBankAccount(index, 'iban', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono outline-none focus:border-black transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Número da Conta</label>
                        <input 
                          type="text" 
                          required
                          value={account.account_number}
                          onChange={e => updateBankAccount(index, 'account_number', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-mono outline-none focus:border-black transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.bank_accounts.length === 0 && (
                  <p className="text-[10px] text-zinc-400 text-center py-4 border border-dashed border-zinc-200 rounded-xl">
                    Nenhuma conta bancária configurada.
                  </p>
                )}
              </div>
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95 mt-4">
            {editingStore ? "Guardar Alterações" : "Criar Loja"}
          </button>
        </form>
      </Modal>

      <Modal 
        isOpen={isOpeningModalOpen} 
        onClose={() => setIsOpeningModalOpen(false)} 
        title={`Abrir Caixa - ${selectedStoreForOpening?.name}`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registersForSelectedStore.map(register => {
              const isOpenedByMe = register.session_status === 'open' && register.seller_id === user.id;
              const isOpenedByOthers = register.session_status === 'open' && register.seller_id !== user.id;

              return (
                <div key={register.id} className="p-6 border border-zinc-100 rounded-2xl space-y-4 hover:border-orange-200 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                    )}>
                      <Monitor size={24} />
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                      register.session_status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400"
                    )}>
                      {register.session_status === 'open' ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-lg">{register.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono">{register.code}</p>
                  </div>

                  {register.session_status === 'open' ? (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle size={20} className="text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-emerald-900">Caixa em Operação</p>
                          <p className="text-[10px] text-emerald-700">{isOpenedByMe ? 'Aberto por você' : 'Aberto por outro funcionário'}</p>
                        </div>
                      </div>
                      {(user.role === 'owner' || user.role === 'manager') && (
                        <button
                          onClick={() => handleCloseSession(register.current_session_id!)}
                          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-all active:scale-95 shadow-lg shadow-orange-100"
                        >
                          Fechar Caixa
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">Kz</span>
                        <input
                          type="number"
                          placeholder="Valor de Abertura"
                          value={openingAmounts[register.id] || ''}
                          onChange={e => setOpeningAmounts(prev => ({ ...prev, [register.id]: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                        />
                      </div>
                      <button
                        onClick={() => handleOpenSession(register.id, openingAmounts[register.id] || '')}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-100"
                      >
                        Abrir Caixa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {registersForSelectedStore.length === 0 && (
              <div className="col-span-2 py-12 text-center text-zinc-400">
                Nenhum caixa registado para esta loja.
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
