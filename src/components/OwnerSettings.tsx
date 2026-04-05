import React, { useState, useEffect, FormEvent } from 'react';
import { 
  ShieldCheck, 
  Clock,
  FileText,
  Percent,
  Database,
  Plus,
  Trash2,
  Pencil,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Store as StoreIcon,
  RefreshCw
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

export const OwnerSettings = ({ user, onUpdateUser }: { user: User, onUpdateUser?: (u: User) => void }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'series' | 'taxes' | 'backups'>('profile');
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    nif: '',
    address: '',
    company_name: '',
    fiscal_regime: user.fiscal_regime || 'geral',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  
  // Invoice Series State
  const [series, setSeries] = useState<any[]>([]);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [seriesFormData, setSeriesFormData] = useState({
    store_id: '',
    name: '',
    prefix: '',
    start_number: '1'
  });

  // Taxes State
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<number | null>(null);
  const [taxFormData, setTaxFormData] = useState({
    store_id: '',
    name: '',
    percentage: '',
    tax_code: 'NOR'
  });

  // Backups State
  const [backups, setBackups] = useState<any[]>([]);
  const [backupSettings, setBackupSettings] = useState({
    backup_enabled: false,
    backup_frequency: 'daily'
  });
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user.id, activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'profile') {
        const res = await fetch(`/api/admin/clients/${user.id}/details`);
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          name: data.client.name,
          email: data.client.email,
          phone: data.client.phone || '',
          nif: data.client.nif || '',
          address: data.client.address || '',
          company_name: data.client.company_name || '',
          // Prefer the regime from the user prop (which is the source of truth in App.tsx)
          // unless it's the first load and we need the server value
          fiscal_regime: user.fiscal_regime || data.client.fiscal_regime || 'geral'
        }));
      } else if (activeTab === 'series') {
        const [seriesRes, storesRes] = await Promise.all([
          fetch(`/api/owner/invoice-series/${user.id}`),
          fetch(`/api/owner/stores/${user.id}`)
        ]);
        setSeries(await seriesRes.json());
        setStores(await storesRes.json());
      } else if (activeTab === 'taxes') {
        const [taxesRes, storesRes] = await Promise.all([
          fetch(`/api/owner/taxes/${user.id}`),
          fetch(`/api/owner/stores/${user.id}`)
        ]);
        setTaxes(await taxesRes.json());
        setStores(await storesRes.json());
      } else if (activeTab === 'backups') {
        const res = await fetch(`/api/owner/backups/${user.id}`);
        const data = await res.json();
        setBackups(data.backups);
        setBackupSettings({
          backup_enabled: data.settings.backup_enabled === 1,
          backup_frequency: data.settings.backup_frequency
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...formData };
      if (payload.fiscal_regime === 'exclusao') {
        // If switching to exclusion, we might want to inform the user or handle it server-side
        // For now, the frontend already forces 0% in POS and SAFT.
      }

      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Perfil actualizado com sucesso!");
        if (onUpdateUser) {
          const { password, confirmPassword, ...userData } = payload;
          onUpdateUser({ ...user, ...userData });
        }
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao atualizar perfil");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSeries = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/owner/invoice-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seriesFormData)
      });
      if (res.ok) {
        setIsSeriesModalOpen(false);
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleSeries = async (id: number, currentStatus: string) => {
    try {
      await fetch(`/api/owner/invoice-series/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleDeleteSeries = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta série?")) return;
    try {
      await fetch(`/api/owner/invoice-series/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleCreateTax = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTaxId ? `/api/owner/taxes/${editingTaxId}` : '/api/owner/taxes';
      const method = editingTaxId ? 'PUT' : 'POST';
      
      const payload = { ...taxFormData };
      if (formData.fiscal_regime === 'exclusao') {
        payload.percentage = '0';
        payload.tax_code = 'ISE';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsTaxModalOpen(false);
        setEditingTaxId(null);
        setTaxFormData({ store_id: '', name: '', percentage: '', tax_code: 'NOR' });
        fetchData();
      }
    } catch (e) { console.error(e); }
  };

  const handleEditTax = (tax: any) => {
    setEditingTaxId(tax.id);
    setTaxFormData({
      store_id: tax.store_id.toString(),
      name: tax.name,
      percentage: tax.percentage.toString(),
      tax_code: tax.tax_code
    });
    setIsTaxModalOpen(true);
  };

  const handleToggleTax = async (id: number, currentStatus: string) => {
    try {
      const res = await fetch(`/api/owner/taxes/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao alterar status do imposto.");
        return;
      }
      await fetchData();
    } catch (e) { 
      console.error(e);
      alert("Erro de conexão ao alterar status do imposto.");
    }
  };

  const handleSetDefaultTax = async (id: number, storeId: number) => {
    try {
      const res = await fetch(`/api/owner/taxes/${id}/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId })
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao definir imposto padrão.");
        return;
      }
      await fetchData();
    } catch (e) { 
      console.error(e);
      alert("Erro de conexão ao definir imposto padrão.");
    }
  };

  const handleDeleteTax = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este imposto?")) return;
    try {
      const res = await fetch(`/api/owner/taxes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao excluir imposto.");
        return;
      }
      await fetchData();
    } catch (e) { 
      console.error(e);
      alert("Erro de conexão ao excluir imposto.");
    }
  };

  const handleSaveBackupSettings = async () => {
    try {
      await fetch('/api/owner/backups/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          ...backupSettings
        })
      });
      alert("Configurações de backup guardadas!");
    } catch (e) { console.error(e); }
  };

  const handleGenerateBackup = async () => {
    setIsGeneratingBackup(true);
    try {
      await fetch('/api/owner/backups/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: user.id })
      });
      fetchData();
    } catch (e) { console.error(e); }
    finally { setIsGeneratingBackup(false); }
  };

  const handleDownloadBackup = (id: number) => {
    window.open(`/api/owner/backups/download/${id}`, '_blank');
  };

  if (isLoading) return <div className="p-12 text-center text-zinc-500">Carregando configurações...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Configurações</h2>
          <p className="text-zinc-500">Gerencie sua conta, séries de faturas, impostos e backups.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'profile' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Perfil
          </button>
          <button 
            onClick={() => setActiveTab('series')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'series' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Séries
          </button>
          <button 
            onClick={() => setActiveTab('taxes')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'taxes' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Impostos
          </button>
          <button 
            onClick={() => setActiveTab('backups')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'backups' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Backups
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="p-6 border-b border-zinc-100">
                <h3 className="font-bold">Informações Pessoais</h3>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Telefone</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">NIF</label>
                    <input 
                      type="text" 
                      value={formData.nif}
                      onChange={e => setFormData({...formData, nif: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome da Empresa</label>
                    <input 
                      type="text" 
                      value={formData.company_name}
                      onChange={e => setFormData({...formData, company_name: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Endereço Fiscal</label>
                    <textarea 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all h-24 resize-none"
                    />
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Regime Fiscal</label>
                    <select 
                      value={formData.fiscal_regime}
                      onChange={e => setFormData({...formData, fiscal_regime: e.target.value as any})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all font-bold"
                    >
                      <option value="geral">Regime Geral</option>
                      <option value="simplificado">Regime Simplificado</option>
                      <option value="exclusao">Regime de Exclusão</option>
                    </select>
                    <p className="text-[10px] text-zinc-400 mt-2 px-1">
                      {formData.fiscal_regime === 'geral' && "Empresas maiores: IVA normal, retenção na fonte, contabilidade completa."}
                      {formData.fiscal_regime === 'simplificado' && "Pequenas empresas: Menos obrigações, IVA simplificado."}
                      {formData.fiscal_regime === 'exclusao' && "Isento de IVA: Não cobra nem deduz IVA (0% Isento)."}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100">
                  <h4 className="font-bold text-sm mb-4">Alterar Palavra-passe</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nova Palavra-passe</label>
                      <input 
                        type="password" 
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                        placeholder="Deixe em branco para manter"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Confirmar Palavra-passe</label>
                      <input 
                        type="password" 
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                        placeholder="Confirme a nova senha"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Alterações'}
                  </button>
                </div>
              </form>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-black text-white">
              <h3 className="font-bold mb-4">Estado da Subscrição</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Plano Actual</span>
                  <span className="font-bold bg-white/10 px-2 py-1 rounded text-xs uppercase">Profissional</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-zinc-400">Expira em</span>
                  <span className="font-bold">31/12/2026</span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <button className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all">
                    Renovar Subscrição
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-4">Segurança</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-zinc-600">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  Autenticação de dois factores activa
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-600">
                  <Clock size={18} className="text-zinc-400" />
                  Último acesso: Hoje às 14:20
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'series' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-zinc-900">Séries de Faturas</h3>
            <button 
              onClick={() => setIsSeriesModalOpen(true)}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95"
            >
              <Plus size={20} />
              Nova Série
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map(s => (
              <Card key={s.id} className={cn("p-6 space-y-4", s.status === 'inactive' && "opacity-60")}>
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-zinc-100 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleToggleSeries(s.id, s.status)}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        s.status === 'active' ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"
                      )}
                    >
                      {s.status === 'active' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                    </button>
                    <button 
                      onClick={() => handleDeleteSeries(s.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-wider">
                      {s.prefix}
                    </span>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                      s.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {s.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-zinc-900">{s.name}</h4>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                    <StoreIcon size={12} /> {s.store_name}
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Número Inicial</p>
                    <p className="text-sm font-bold">{s.start_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Actual</p>
                    <p className="text-sm font-black text-black">{s.current_number}</p>
                  </div>
                </div>
              </Card>
            ))}
            {series.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400">
                <FileText size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma série de faturas configurada.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'taxes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-zinc-900">Impostos por Loja</h3>
            <button 
              onClick={() => {
                setEditingTaxId(null);
                setTaxFormData({ store_id: '', name: '', percentage: '', tax_code: 'NOR' });
                setIsTaxModalOpen(true);
              }}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-95"
            >
              <Plus size={20} />
              Novo Imposto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {taxes.map(t => (
              <Card key={t.id} className={cn("p-6 space-y-4", t.status === 'inactive' && "opacity-60")}>
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-zinc-100 rounded-xl">
                    <Percent size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (formData.fiscal_regime === 'exclusao' && t.percentage > 0) return;
                        handleSetDefaultTax(t.id, t.store_id);
                      }}
                      disabled={formData.fiscal_regime === 'exclusao' && t.percentage > 0}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        t.is_default ? "text-emerald-500 bg-emerald-50" : "text-zinc-400 hover:bg-zinc-50",
                        formData.fiscal_regime === 'exclusao' && t.percentage > 0 && "opacity-20 cursor-not-allowed"
                      )}
                      title={t.is_default ? "Imposto Padrão" : (formData.fiscal_regime === 'exclusao' && t.percentage > 0 ? "Bloqueado no Regime de Exclusão" : "Definir como Padrão")}
                    >
                      <ShieldCheck size={18} />
                    </button>
                    <button 
                      onClick={() => handleEditTax(t)}
                      className="p-2 text-zinc-400 hover:bg-zinc-50 rounded-lg transition-all"
                      title="Editar Imposto"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        if (formData.fiscal_regime === 'exclusao' && t.percentage > 0) return;
                        handleToggleTax(t.id, t.status);
                      }}
                      disabled={formData.fiscal_regime === 'exclusao' && t.percentage > 0}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        t.status === 'active' ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50",
                        formData.fiscal_regime === 'exclusao' && t.percentage > 0 && "opacity-20 cursor-not-allowed"
                      )}
                      title={formData.fiscal_regime === 'exclusao' && t.percentage > 0 ? "Bloqueado no Regime de Exclusão" : ""}
                    >
                      {t.status === 'active' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                    </button>
                    <button 
                      onClick={() => handleDeleteTax(t.id)}
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
                      t.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {t.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                    {t.is_default === 1 && (
                      <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                        Padrão
                      </span>
                    )}
                    <span className="text-[10px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-wider">
                      {t.tax_code}
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-zinc-900">{t.name}</h4>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                    <StoreIcon size={12} /> {t.store_name}
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-100">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Percentagem</p>
                  <p className="text-2xl font-black text-black">{t.percentage}%</p>
                </div>
              </Card>
            ))}
            {taxes.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-400">
                <Percent size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhum imposto configurado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-bold mb-1">Configurações de Backup</h3>
                <p className="text-xs text-zinc-500">Defina como o sistema deve guardar seus dados.</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-zinc-700">Backup Automático</label>
                  <button 
                    onClick={() => setBackupSettings({...backupSettings, backup_enabled: !backupSettings.backup_enabled})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      backupSettings.backup_enabled ? "bg-emerald-500" : "bg-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      backupSettings.backup_enabled ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Frequência</label>
                  <select 
                    value={backupSettings.backup_frequency}
                    onChange={e => setBackupSettings({...backupSettings, backup_frequency: e.target.value})}
                    disabled={!backupSettings.backup_enabled}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all disabled:opacity-50"
                  >
                    <option value="daily">Todos os dias</option>
                    <option value="weekly">Todas as semanas</option>
                    <option value="monthly">Todos os meses</option>
                  </select>
                </div>

                <button 
                  onClick={handleSaveBackupSettings}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all"
                >
                  Guardar Configurações
                </button>
              </div>
            </Card>

            <Card className="p-6 bg-zinc-50 border-zinc-100">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Database size={32} className="text-zinc-900" />
                </div>
                <div>
                  <h4 className="font-bold">Backup Manual</h4>
                  <p className="text-xs text-zinc-500">Gere uma cópia de segurança agora mesmo.</p>
                </div>
                <button 
                  onClick={handleGenerateBackup}
                  disabled={isGeneratingBackup}
                  className="w-full py-3 bg-white border border-zinc-200 text-black rounded-xl font-bold text-sm hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGeneratingBackup ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
                  Gerar Backup Agora
                </button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-bold">Histórico de Backups</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ficheiro</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tamanho</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Acções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {backups.map(b => (
                      <tr key={b.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Database size={16} className="text-zinc-400" />
                            <span className="text-sm font-medium">{b.filename}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{new Date(b.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-zinc-500">{(b.size / 1024).toFixed(2)} KB</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDownloadBackup(b.id)}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-all"
                          >
                            <Download size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                          Nenhum backup encontrado no histórico.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Series Modal */}
      <Modal 
        isOpen={isSeriesModalOpen} 
        onClose={() => setIsSeriesModalOpen(false)} 
        title="Nova Série de Faturas"
      >
        <form onSubmit={handleCreateSeries} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Loja</label>
              <select 
                required
                value={seriesFormData.store_id}
                onChange={e => setSeriesFormData({...seriesFormData, store_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecione uma loja</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome da Série</label>
              <input 
                type="text" required
                value={seriesFormData.name}
                onChange={e => setSeriesFormData({...seriesFormData, name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="Ex: Geral 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Prefixo</label>
                <input 
                  type="text" required
                  value={seriesFormData.prefix}
                  onChange={e => setSeriesFormData({...seriesFormData, prefix: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                  placeholder="Ex: FT, FR, NC"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nº Inicial</label>
                <input 
                  type="number" required min="1"
                  value={seriesFormData.start_number}
                  onChange={e => setSeriesFormData({...seriesFormData, start_number: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
          >
            Criar Série
          </button>
        </form>
      </Modal>

      {/* Tax Modal */}
      <Modal 
        isOpen={isTaxModalOpen} 
        onClose={() => {
          setIsTaxModalOpen(false);
          setEditingTaxId(null);
          setTaxFormData({ store_id: '', name: '', percentage: '', tax_code: 'NOR' });
        }} 
        title={editingTaxId ? "Editar Imposto" : "Novo Imposto"}
      >
        <form onSubmit={handleCreateTax} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Loja</label>
              <select 
                required
                value={taxFormData.store_id}
                onChange={e => setTaxFormData({...taxFormData, store_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecione uma loja</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nome do Imposto</label>
              <input 
                type="text" required
                value={taxFormData.name}
                onChange={e => setTaxFormData({...taxFormData, name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                placeholder="Ex: IVA 14%"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Percentagem (%)</label>
              <input 
                type="number" required min="0" step="0.01"
                value={formData.fiscal_regime === 'exclusao' ? '0' : taxFormData.percentage}
                onChange={e => setTaxFormData({...taxFormData, percentage: e.target.value})}
                disabled={formData.fiscal_regime === 'exclusao'}
                className={cn(
                  "w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all",
                  formData.fiscal_regime === 'exclusao' && "opacity-50 cursor-not-allowed"
                )}
                placeholder="Ex: 14"
              />
              {formData.fiscal_regime === 'exclusao' && (
                <p className="text-[10px] text-amber-600 mt-1 font-bold">Bloqueado: Regime de Exclusão exige 0% de IVA.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Código de Imposto (SAFT)</label>
              <select 
                required
                value={formData.fiscal_regime === 'exclusao' ? 'ISE' : taxFormData.tax_code}
                onChange={e => setTaxFormData({...taxFormData, tax_code: e.target.value})}
                disabled={formData.fiscal_regime === 'exclusao'}
                className={cn(
                  "w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all",
                  formData.fiscal_regime === 'exclusao' && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="NOR">Taxa Normal (NOR)</option>
                <option value="ISE">Isento (ISE)</option>
                <option value="OUT">Outros (OUT)</option>
              </select>
            </div>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
          >
            {editingTaxId ? "Guardar Alterações" : "Criar Imposto"}
          </button>
        </form>
      </Modal>
    </div>
  );
};
