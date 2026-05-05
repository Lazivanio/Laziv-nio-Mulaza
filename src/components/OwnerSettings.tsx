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
  AlertTriangle,
  Check,
  Zap,
  Building2 as EstablishmentIcon,
  RefreshCw,
  Info,
  Key,
  History,
  Shield,
  Lock,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Establishment } from '../types';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'series' | 'taxes' | 'backups' | 'billing' | 'signatures'>('profile');
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
  const [isRenewing, setIsRenewing] = useState(false);
  const [renewalPeriod, setRenewalPeriod] = useState<'semestral' | 'anual' | null>(null);
  const [showRenewalOptions, setShowRenewalOptions] = useState(false);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  
  // Invoice Series State
  const [series, setSeries] = useState<any[]>([]);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isRequestingSeries, setIsRequestingSeries] = useState(false);
  const [seriesFormData, setSeriesFormData] = useState({
    establishment_id: '',
    name: '',
    prefix: '',
    start_number: '1',
    fiscal_year: new Date().getFullYear(),
    request_reason: 'Nova série anual',
    type: 'FR'
  });

  // Taxes State
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTaxId, setEditingTaxId] = useState<number | null>(null);
  const [taxFormData, setTaxFormData] = useState({
    establishment_id: '',
    name: '',
    percentage: '',
    tax_code: 'NOR'
  });

  // Backups State
  const [backups, setBackups] = useState<any[]>([]);
  const [backupSettings, setBackupSettings] = useState({
    backup_enabled: false,
    backup_frequency: 'daily',
    financial_reminder_enabled: false
  });
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);

  // Digital Signatures State
  const [companyKeys, setCompanyKeys] = useState<any[]>([]);
  const [keyLogs, setKeyLogs] = useState<any[]>([]);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyType, setKeyType] = useState<'internal' | 'external'>('internal');
  const [externalKeyData, setExternalKeyData] = useState({
    publicKey: '',
    privateKey: '',
    type: 'pem'
  });
  const [isProcessingKey, setIsProcessingKey] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Billing Mode State
  const [billingStatus, setBillingStatus] = useState({ 
    hasPendingInvoices: false, 
    pendingCount: 0,
    hasUncommunicated: false,
    uncommunicatedCount: 0,
    hasActiveSeries: false,
    currentMode: 'tradicional'
  });
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState(false);
  const [pendingMode, setPendingMode] = useState<'tradicional' | 'eletronica' | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  useEffect(() => {
    fetchData();
    if (activeTab === 'billing') {
      fetchBillingStatus();
    }
  }, [user.id, activeTab]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchBillingStatus = async () => {
    try {
      const res = await fetch(`/api/owner/billing-mode-status/${user.id}`);
      const data = await res.json();
      setBillingStatus(data);
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'profile') {
        const res = await fetch(`/api/owner/profile-details/${user.id}`);
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          name: data.client.name || '',
          email: data.client.email || '',
          phone: data.client.phone || '',
          nif: data.client.nif || '',
          address: data.client.address || '',
          company_name: data.client.company_name || '',
          // Prefer the regime from the user prop (which is the source of truth in App.tsx)
          // unless it's the first load and we need the server value
          fiscal_regime: user.fiscal_regime || data.client.fiscal_regime || 'geral'
        }));
        setLicenses(Array.isArray(data.licenses) ? data.licenses : []);
      } else if (activeTab === 'series') {
        const [seriesRes, establishmentsRes] = await Promise.all([
          fetch(`/api/owner/invoice-series/${user.id}`),
          fetch(`/api/owner/establishments/${user.id}`)
        ]);
        setSeries(await seriesRes.json());
        const establishmentsData = await establishmentsRes.json();
        setEstablishments(Array.isArray(establishmentsData) ? establishmentsData : []);
      } else if (activeTab === 'taxes') {
        const [taxesRes, establishmentsRes] = await Promise.all([
          fetch(`/api/owner/taxes/${user.id}`),
          fetch(`/api/owner/establishments/${user.id}`)
        ]);
        setTaxes(await taxesRes.json());
        const establishmentsData = await establishmentsRes.json();
        setEstablishments(Array.isArray(establishmentsData) ? establishmentsData : []);
      } else if (activeTab === 'backups') {
        const res = await fetch(`/api/owner/backups/${user.id}`);
        const data = await res.json();
        setBackups(data.backups);
        setBackupSettings({
          backup_enabled: data.settings?.backup_enabled === 1,
          backup_frequency: data.settings?.backup_frequency || 'daily',
          financial_reminder_enabled: data.settings?.financial_reminder_enabled === 1
        });
      } else if (activeTab === 'signatures') {
        const [keysRes, logsRes] = await Promise.all([
          fetch(`/api/owner/keys/${user.id}`),
          fetch(`/api/owner/keys/logs/${user.id}`)
        ]);
        setCompanyKeys(await keysRes.json());
        setKeyLogs(await logsRes.json());
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
      setNotification({ type: 'error', message: "As senhas não coincidem" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...formData };
      const res = await fetch(`/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNotification({ type: 'success', message: "Perfil actualizado com sucesso!" });
        if (onUpdateUser) {
          const { password, confirmPassword, ...userData } = payload;
          onUpdateUser({ ...user, ...userData });
        }
      } else {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao atualizar perfil" });
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao atualizar perfil" });
    } finally {
      setIsSaving(false);
    }
  };

   const handleRenewLicense = async () => {
    // Direct action for better UX in iframe environments
    if (!renewalPeriod) {
      window.alert("Por favor, selecione um período de renovação.");
      return;
    }

    setIsRenewing(true);
    try {
      const res = await fetch('/api/owner/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          subject: 'Solicitação de Renovação de Licença',
          description: `O utilizador ${user.name} solicitou a renovação da licença para a empresa ${formData.company_name || 'N/A'}. 
                         NIF: ${formData.nif || 'N/A'}
                         Plano Atual: ${licenses[0]?.plan_type || 'Profissional'}
                         Expiração Atual: ${licenses[0]?.expiry_date ? new Date(licenses[0].expiry_date).toLocaleDateString() : 'N/A'}
                         Tipo de Renovação Solicitada: ${renewalPeriod === 'anual' ? 'Anual' : 'Semestral'}
                         Por favor, entrar em contacto para confirmar o faturamento.`,
          priority: 'high'
        })
      });

      if (res.ok) {
        setNotification({ type: 'success', message: `Solicitação de renovação ${renewalPeriod === 'anual' ? 'Anual' : 'Semestral'} enviada com sucesso! O suporte entrará em contacto em breve.` });
        window.alert("Solicitação enviada com sucesso! O administrador recebeu uma notificação e entrará em contacto em breve.");
        setShowRenewalOptions(false);
        setRenewalPeriod(null);
      } else {
        setNotification({ type: 'error', message: "Erro ao enviar solicitação de renovação." });
        window.alert("Erro ao enviar solicitação. Por favor, tente novamente mais tarde.");
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao solicitar renovação." });
      window.alert("Erro de ligação ao servidor.");
    } finally {
      setIsRenewing(false);
    }
  };

  const handleCreateSeries = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const isElectronic = user.billing_mode === 'eletronica';
      
      if (isElectronic) {
        setIsRequestingSeries(true);
      }

      const res = await fetch('/api/owner/invoice-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seriesFormData)
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (isElectronic && data.id) {
          // Wait 3 seconds to simulate AGT response
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const approveRes = await fetch(`/api/owner/invoice-series/${data.id}/request-approval`, {
            method: 'POST'
          });
          
          if (approveRes.ok) {
            setNotification({ type: 'success', message: "Série solicitada e aprovada pela AGT!" });
          } else {
            setNotification({ type: 'error', message: "Erro ao obter resposta da AGT" });
          }
        } else {
          setNotification({ type: 'success', message: "Série criada com sucesso!" });
        }
        
        setIsSeriesModalOpen(false);
        setSeriesFormData({
          establishment_id: '',
          name: '',
          prefix: '',
          start_number: '1',
          fiscal_year: new Date().getFullYear(),
          request_reason: 'Nova série anual',
          type: 'FR'
        });
        fetchData();
      } else {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao criar série" });
      }
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao criar série" });
    } finally {
      setIsRequestingSeries(false);
    }
  };

  const handleToggleSeries = async (id: number, currentStatus: string) => {
    try {
      const res = await fetch(`/api/owner/invoice-series/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Série ${currentStatus === 'active' ? 'desactivada' : 'activada'} com sucesso!` });
        fetchData();
      } else {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao alterar status da série" });
      }
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao alterar status da série" });
    }
  };

  const handleDeleteSeries = async (id: number) => {
    // We'll use a simple confirm for now, but ideally this should also be a custom modal
    // For now, let's just use the notification if it fails
    try {
      const res = await fetch(`/api/owner/invoice-series/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotification({ type: 'success', message: "Série eliminada com sucesso!" });
        fetchData();
      } else {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao eliminar série" });
      }
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao eliminar série" });
    }
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
        setTaxFormData({ establishment_id: '', name: '', percentage: '', tax_code: 'NOR' });
        setNotification({ type: 'success', message: `Imposto ${editingTaxId ? 'actualizado' : 'criado'} com sucesso!` });
        fetchData();
      } else {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao processar imposto" });
      }
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao processar imposto" });
    }
  };

  const handleEditTax = (tax: any) => {
    setEditingTaxId(tax.id);
    setTaxFormData({
      establishment_id: tax.establishment_id.toString(),
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
        setNotification({ type: 'error', message: errorData.error || "Erro ao alterar status do imposto." });
        return;
      }
      setNotification({ type: 'success', message: `Imposto ${currentStatus === 'active' ? 'desactivado' : 'activado'} com sucesso!` });
      await fetchData();
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao alterar status do imposto." });
    }
  };

  const handleSetDefaultTax = async (id: number, establishmentId: number) => {
    try {
      const res = await fetch(`/api/owner/taxes/${id}/default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishment_id: establishmentId })
      });
      if (!res.ok) {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao definir imposto padrão." });
        return;
      }
      setNotification({ type: 'success', message: "Imposto padrão definido com sucesso!" });
      await fetchData();
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao definir imposto padrão." });
    }
  };

  const handleDeleteTax = async (id: number) => {
    try {
      const res = await fetch(`/api/owner/taxes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        setNotification({ type: 'error', message: errorData.error || "Erro ao excluir imposto." });
        return;
      }
      setNotification({ type: 'success', message: "Imposto eliminado com sucesso!" });
      await fetchData();
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao excluir imposto." });
    }
  };

  const handleSaveBackupSettings = async () => {
    try {
      const res = await fetch('/api/owner/backups/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id: user.id,
          ...backupSettings
        })
      });
      if (res.ok) {
        setNotification({ type: 'success', message: "Configurações de backup guardadas!" });
      } else {
        setNotification({ type: 'error', message: "Erro ao guardar configurações de backup" });
      }
    } catch (e) { 
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao guardar configurações de backup" });
    }
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

  const handleSwitchMode = async (mode: 'tradicional' | 'eletronica') => {
    if (billingStatus.hasPendingInvoices) {
      setNotification({ 
        type: 'error', 
        message: `Não é possível mudar o modo com faturas pendentes ou em rascunho (${billingStatus.pendingCount}).` 
      });
      return;
    }

    if (billingStatus.hasUncommunicated) {
      setNotification({ 
        type: 'error', 
        message: `Existem documentos não comunicados à AGT (${billingStatus.uncommunicatedCount}). Por favor, finalize as comunicações.` 
      });
      return;
    }

    setPendingMode(mode);
    setShowConfirmSwitch(true);
  };

  const executeSwitchMode = async () => {
    if (!pendingMode) return;
    
    setShowConfirmSwitch(false);
    setIsSwitchingMode(true);
    try {
      const res = await fetch(`/api/owner/billing-mode/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billing_mode: pendingMode,
          changed_by: user.id 
        })
      });

      if (res.ok) {
        setNotification({ type: 'success', message: "Modo de faturação alterado com sucesso! Novas séries foram criadas." });
        // Refresh user status to update the UI globally
        const statusRes = await fetch(`/api/user-status/${user.id}`);
        if (statusRes.ok) {
          const userData = await statusRes.json();
          if (onUpdateUser) onUpdateUser({ ...user, ...userData });
        }
        fetchBillingStatus();
      } else {
        const data = await res.json();
        setNotification({ type: 'error', message: data.error || "Erro ao mudar modo de faturação" });
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão ao mudar modo de faturação" });
    } finally {
      setIsSwitchingMode(false);
      setPendingMode(null);
    }
  };

  const handleDownloadBackup = (id: number) => {
    window.open(`/api/owner/backups/download/${id}`, '_blank');
  };

  const handleGenerateInternalKey = async () => {
    if (!window.confirm("Tem certeza que deseja gerar um novo par de chaves? A chave atual será desativada e a nova será usada para todos os novos documentos.")) return;
    
    setIsProcessingKey(true);
    try {
      const res = await fetch('/api/owner/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: user.id, userId: user.id })
      });
      if (res.ok) {
        setNotification({ type: 'success', message: "Novo par de chaves gerado com sucesso!" });
        fetchData();
      } else {
        const data = await res.json();
        setNotification({ type: 'error', message: data.error || "Erro ao gerar chaves" });
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão" });
    } finally {
      setIsProcessingKey(false);
    }
  };

  const handleUploadExternalKey = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessingKey(true);
    try {
      const res = await fetch('/api/owner/keys/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: user.id,
          userId: user.id,
          ...externalKeyData
        })
      });
      if (res.ok) {
        setNotification({ type: 'success', message: "Certificado externo carregado com sucesso!" });
        setIsKeyModalOpen(false);
        setExternalKeyData({ publicKey: '', privateKey: '', type: 'pem' });
        fetchData();
      } else {
        const data = await res.json();
        setNotification({ type: 'error', message: data.error || "Erro ao carregar certificado" });
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: "Erro de conexão" });
    } finally {
      setIsProcessingKey(false);
    }
  };

  const renderSignaturesTab = () => {
    const activeKey = companyKeys.find(k => k.is_active === 1);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">Assinatura Digital</h2>
            <p className="text-sm text-zinc-500">Gira as chaves criptográficas da sua empresa para selagem de documentos.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleGenerateInternalKey}
              disabled={isProcessingKey}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isProcessingKey ? "animate-spin" : ""} />
              GERAR NOVA CHAVE
            </button>
            <button 
              onClick={() => setIsKeyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-900 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all"
            >
              <UploadCloud size={16} />
              IMPORTAR CERTIFICADO
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Active Key Info */}
            <Card className="p-6 border-zinc-900/10 bg-zinc-50/30">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-zinc-900 text-white rounded-2xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-zinc-900 uppercase tracking-tight">Chave Ativa</h3>
                    <p className="text-xs text-zinc-500">Esta chave é usada para assinar todos os novos documentos.</p>
                  </div>
                </div>
                {activeKey && (
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Versão {activeKey.version}
                  </div>
                )}
              </div>

              {activeKey ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-zinc-100 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Tipo de Chave</p>
                      <p className="font-bold text-zinc-900 capitalize">{activeKey.type === 'internal' ? 'Geração Interna' : 'Certificado Externo'}</p>
                    </div>
                    <div className="p-4 bg-white border border-zinc-100 rounded-2xl">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Data de Ativação</p>
                      <p className="font-bold text-zinc-900">{new Date(activeKey.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-white border border-zinc-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Chave Pública (RSA-2048)</p>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(activeKey.public_key);
                          setNotification({ type: 'info', message: "Chave pública copiada!" });
                        }}
                        className="text-[10px] font-bold text-zinc-900 hover:underline"
                      >
                        COPIAR
                      </button>
                    </div>
                    <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 font-mono text-[10px] text-zinc-500 break-all max-h-32 overflow-y-auto">
                      {activeKey.public_key}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lock size={48} className="mx-auto text-zinc-200 mb-3" />
                  <p className="text-zinc-500 font-medium">Nenhuma chave ativa configurada.</p>
                </div>
              )}
            </Card>

            {/* Key History */}
            <Card>
              <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                  <History size={18} />
                  Histórico de Chaves
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Versão</th>
                      <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo</th>
                      <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {companyKeys.map((key) => (
                      <tr key={key.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-900">V{key.version}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-zinc-600 capitalize">{key.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          {key.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Ativa</span>
                          ) : (
                            <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded-lg text-[10px] font-black uppercase tracking-wider">Inativa</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-500">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {companyKeys.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-zinc-400 italic text-sm">Nenhum histórico disponível</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Security Notice */}
            <Card className="p-6 bg-amber-50 border-amber-100">
              <div className="flex gap-3">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <div>
                  <h4 className="font-black text-amber-900 text-xs uppercase tracking-tight mb-1">Aviso de Segurança</h4>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    A chave privada é armazenada de forma criptografada e nunca é exposta. 
                    A substituição de chaves não afeta documentos já assinados, mas é um processo irreversível para novos documentos.
                  </p>
                </div>
              </div>
            </Card>

            {/* Activity Logs */}
            <Card>
              <div className="px-6 py-4 border-b border-zinc-100">
                <h3 className="font-black text-zinc-900 uppercase tracking-tight text-xs">Logs de Gestão</h3>
              </div>
              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {keyLogs.map((log) => (
                  <div key={log.id} className="relative pl-6 pb-4 border-l border-zinc-100 last:pb-0">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-zinc-300" />
                    <p className="text-[11px] font-bold text-zinc-900 mb-1">{log.details}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span className="font-medium">{log.user_name}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {keyLogs.length === 0 && (
                  <p className="text-center text-zinc-400 text-xs italic">Sem logs de atividade</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Import Modal */}
        <Modal 
          isOpen={isKeyModalOpen} 
          onClose={() => setIsKeyModalOpen(false)} 
          title="Importar Certificado Externo"
        >
          <form onSubmit={handleUploadExternalKey} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Formato</label>
              <select 
                value={externalKeyData.type}
                onChange={(e) => setExternalKeyData({...externalKeyData, type: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none font-bold text-zinc-900"
              >
                <option value="pem">PEM (.pem, .crt, .key)</option>
                <option value="pfx">PKCS#12 (.pfx, .p12)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Chave Pública / Certificado</label>
              <textarea 
                required
                value={externalKeyData.publicKey}
                onChange={(e) => setExternalKeyData({...externalKeyData, publicKey: e.target.value})}
                placeholder="-----BEGIN CERTIFICATE----- ..."
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none font-mono text-xs h-32"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Chave Privada</label>
              <textarea 
                required
                value={externalKeyData.privateKey}
                onChange={(e) => setExternalKeyData({...externalKeyData, privateKey: e.target.value})}
                placeholder="-----BEGIN PRIVATE KEY----- ..."
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none font-mono text-xs h-32"
              />
            </div>
            <button 
              type="submit"
              disabled={isProcessingKey}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {isProcessingKey ? 'A PROCESSAR...' : 'CONFIRMAR IMPORTAÇÃO'}
            </button>
          </form>
        </Modal>
      </div>
    );
  };

  if (isLoading) return <div className="p-12 text-center text-zinc-500">Carregando configurações...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right duration-300">
            <div className={cn(
              "px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border",
              notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : 
              notification.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-800" : 
              "bg-blue-50 border-blue-100 text-blue-800"
            )}>
              {notification.type === 'success' ? <CheckCircle2 size={20} /> : 
               notification.type === 'error' ? <AlertCircle size={20} /> : 
               <Info size={20} />}
              <p className="text-sm font-bold">{notification.message}</p>
              <button onClick={() => setNotification(null)} className="ml-4 p-1 hover:bg-black/5 rounded-lg transition-colors">
                <XCircle size={16} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
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
          <button 
            onClick={() => setActiveTab('billing')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'billing' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Modo FTRC
          </button>
          <button 
            onClick={() => setActiveTab('signatures')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'signatures' ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            Assinaturas
          </button>
          <button 
            onClick={() => setIsAboutModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all font-bold"
          >
            Sobre
          </button>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all ml-4"
          >
            Sair
          </button>
        </div>
      </div>

      <Modal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} title="Sobre o Fatu-R">
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-20 h-20 bg-black text-orange-500 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-orange-500/10 scale-110">
              <Zap size={40} className="fill-orange-500" />
            </div>
            <h3 className="text-3xl font-black text-zinc-900 tracking-tighter">Fatu-R</h3>
            <p className="text-sm font-bold text-orange-600 uppercase tracking-[0.2em] mt-1">Smart Billing System</p>
          </div>

          <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200/60">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Produtor</span>
              <span className="text-sm font-bold text-zinc-900">Lazivânio Mulaza</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-zinc-200/60">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Validação AGT</span>
              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Certificado № 274/AGT/2026</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Versão do Sistema</span>
              <span className="text-sm font-bold text-zinc-900">v1.0.5 POS-Expert</span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Atributos do Sistema</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex flex-col gap-2">
                <ShieldCheck size={24} className="text-orange-600" />
                <span className="text-xs font-bold text-orange-900">Segurança Total</span>
                <p className="text-[10px] text-orange-600 font-medium">Dados encriptados e auditoria completa.</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col gap-2">
                <Zap size={24} className="text-orange-400" />
                <span className="text-xs font-bold text-white">Alta Performance</span>
                <p className="text-[10px] text-zinc-400 font-medium">Resposta em milissegundos mesmo offline.</p>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex flex-col gap-2 col-span-2">
                <div className="flex items-center gap-2">
                  <Database size={20} className="text-zinc-600" />
                  <span className="text-xs font-bold text-zinc-900">Faturação Multimoeda Inteligente</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">Converta valores em tempo real e emita faturas em múltiplas moedas com total conformidade fiscal.</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-center text-zinc-400 font-medium italic">
            © 2026 Fatu-R. Todos os direitos reservados. Desenvolvido para simplificar a gestão do seu negócio.
          </p>
        </div>
      </Modal>

      <Modal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} title="Terminar Sessão">
        <div className="space-y-6">
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 bg-white text-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-rose-600/10 border border-rose-200">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 tracking-tighter">Tem a certeza?</h3>
              <p className="text-sm text-rose-600 font-medium mt-1">
                Ao sair, precisará de introduzir novamente as suas credenciais para aceder ao sistema.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 py-4 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                const onLogout = (window as any).handleGlobalLogout;
                if (onLogout) onLogout();
              }}
              className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
            >
              Sim, Sair
            </button>
          </div>
        </div>
      </Modal>

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
            <Card className="p-6 bg-white border border-zinc-200 shadow-sm">
              <h3 className="font-black text-black mb-4 uppercase tracking-wider text-xs">Estado da Subscrição</h3>
              <div className="space-y-4">
                {licenses.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                      <span className="text-sm font-black text-black">Plano Actual</span>
                      <span className="font-black text-black px-2 py-1 rounded text-xs uppercase">
                        {licenses[0]?.plan_type || 'Profissional'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                      <span className="text-sm font-black text-black">Expira em</span>
                      <span className={cn(
                        "font-black text-black",
                        new Date(licenses[0]?.expiry_date) < new Date() ? "text-rose-600" : ""
                      )}>
                        {new Date(licenses[0]?.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                      <span className="text-sm font-black text-black">Plano Actual</span>
                      <span className="font-black text-black px-2 py-1 rounded text-xs uppercase">Trial / Base</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                      <span className="text-sm font-black text-black">Expira em</span>
                      <span className="font-black text-black">N/A</span>
                    </div>
                  </>
                )}
                <div className="pt-2 space-y-4">
                  {!showRenewalOptions ? (
                    <button 
                      type="button"
                      onClick={() => setShowRenewalOptions(true)}
                      className="w-full py-4 bg-black text-white rounded-xl font-black text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                    >
                      <RefreshCw size={18} />
                      Solicitar Renovação
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase font-black text-black tracking-widest">Escolha o Período</p>
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => setRenewalPeriod('semestral')}
                            className={cn(
                              "flex-1 py-3 text-xs font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5",
                              renewalPeriod === 'semestral' ? "bg-zinc-100 border-black text-black shadow-inner" : "bg-white text-black border-zinc-200 hover:bg-zinc-50"
                            )}
                          >
                            <span>Semestral</span>
                            <span className="text-[9px] font-bold text-zinc-500">6 Meses</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setRenewalPeriod('anual')}
                            className={cn(
                              "flex-1 py-3 text-xs font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5",
                              renewalPeriod === 'anual' ? "bg-zinc-100 border-black text-black shadow-inner" : "bg-white text-black border-zinc-200 hover:bg-zinc-50"
                            )}
                          >
                            <span>Anual</span>
                            <span className="text-[9px] font-bold text-zinc-500">12 Meses</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowRenewalOptions(false)}
                          className="flex-1 py-3 border border-zinc-300 text-black rounded-xl font-black text-xs hover:bg-zinc-50 transition-all"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="button"
                          disabled={isRenewing}
                          onClick={handleRenewLicense}
                          className={cn(
                            "flex-[2] py-3 rounded-xl font-black text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 border",
                            renewalPeriod 
                              ? "bg-zinc-100 text-black border-black hover:bg-zinc-200" 
                              : "bg-white text-zinc-300 border-zinc-100 cursor-not-allowed"
                          )}
                        >
                          {isRenewing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          {renewalPeriod ? `Confirmar ${renewalPeriod === 'anual' ? 'Anual' : 'Semestral'}` : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                  )}
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
              {user.billing_mode === 'eletronica' ? 'Solicitar Série' : 'Nova Série'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map(s => (
              <Card key={s.id} className={cn("p-6 space-y-4 shadow-sm", s.status === 'inactive' && "opacity-60")}>
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "p-3 rounded-xl",
                    s.agt_status === 'aprovada' ? "bg-zinc-100" : "bg-amber-50 text-amber-600"
                  )}>
                    {s.agt_status === 'aprovada' ? <FileText size={24} /> : <Clock size={24} />}
                  </div>
                  <div className="flex gap-2">
                    {s.agt_status === 'aprovada' && (
                      <button 
                        onClick={() => handleToggleSeries(s.id, s.status)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          s.status === 'active' ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"
                        )}
                      >
                        {s.status === 'active' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                      </button>
                    )}
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
                      {s.type} {s.prefix}
                    </span>
                    {s.agt_status === 'aprovada' ? (
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                        s.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      )}>
                        {s.status === 'active' ? 'Ativa' : 'Inativa'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-amber-100 text-amber-700 animate-pulse">
                        Aguardando AGT
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-zinc-900">{s.name}</h4>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                    <EstablishmentIcon size={12} /> {s.establishment_name}
                  </p>
                </div>
                <div className="pt-4 border-t border-zinc-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ano Fiscal</p>
                    <p className="text-sm font-bold">{s.fiscal_year || new Date().getFullYear()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nº Inicial</p>
                    <p className="text-sm font-black text-black">{s.start_number}</p>
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
            <h3 className="text-xl font-black text-zinc-900">Impostos por Estabelecimento</h3>
            <button 
              onClick={() => {
                setEditingTaxId(null);
                setTaxFormData({ establishment_id: '', name: '', percentage: '', tax_code: 'NOR' });
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
                        handleSetDefaultTax(t.id, t.establishment_id);
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
                    <EstablishmentIcon size={12} /> {t.establishment_name}
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

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-bold text-emerald-600">Lembrete Financeiro</label>
                    <p className="text-[10px] text-zinc-500">Saldo suficiente para salários</p>
                  </div>
                  <button 
                    onClick={() => setBackupSettings({...backupSettings, financial_reminder_enabled: !backupSettings.financial_reminder_enabled})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      backupSettings.financial_reminder_enabled ? "bg-emerald-500" : "bg-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      backupSettings.financial_reminder_enabled ? "right-1" : "left-1"
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

      {activeTab === 'billing' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="p-8">
            <div className="flex items-start gap-6">
              <div className={cn(
                "p-4 rounded-2xl",
                user.billing_mode === 'eletronica' ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-600"
              )}>
                <Zap size={32} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-zinc-900 mb-2">Modo de Faturação (FTRC)</h3>
                <p className="text-zinc-500 mb-6">
                  O modo de faturação define como os seus documentos fiscais são processados e comunicados à AGT.
                  Actualmente está a utilizar o modo <span className="font-bold text-black uppercase">{user.billing_mode || 'tradicional'}</span>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className={cn(
                    "p-6 rounded-2xl border-2 transition-all",
                    (user.billing_mode === 'tradicional' || (!user.billing_mode)) 
                      ? "border-black bg-zinc-50 cursor-default" 
                      : "border-zinc-100 hover:border-zinc-200 cursor-pointer"
                  )} onClick={() => {
                    const currentMode = user.billing_mode || 'tradicional';
                    if (currentMode !== 'tradicional') handleSwitchMode('tradicional');
                  }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold">Modo Tradicional</h4>
                      {(user.billing_mode === 'tradicional' || !user.billing_mode) && <CheckCircle2 className="text-black" size={20} />}
                    </div>
                    <ul className="space-y-2 text-xs text-zinc-500">
                      <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Gerar faturas normalmente</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Armazenar no sistema</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Gerar SAFT mensal</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Exportar XML manual</li>
                      <li className="flex items-center gap-2 font-bold text-zinc-900 mt-2"><FileText size={14} /> Série A</li>
                    </ul>
                  </div>

                  <div className={cn(
                    "p-6 rounded-2xl border-2 transition-all",
                    user.billing_mode === 'eletronica' 
                      ? "border-blue-600 bg-blue-50/30 cursor-default" 
                      : "border-zinc-100 hover:border-zinc-200 cursor-pointer"
                  )} onClick={() => {
                    if (user.billing_mode !== 'eletronica') handleSwitchMode('eletronica');
                  }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold">Faturação Eletrónica</h4>
                      {user.billing_mode === 'eletronica' && <CheckCircle2 className="text-blue-600" size={20} />}
                    </div>
                    <ul className="space-y-2 text-xs text-zinc-500">
                      <li className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Envio automático para AGT</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Validação em tempo real</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Guardar status oficial</li>
                      <li className="flex items-center gap-2"><Check size={14} className="text-blue-500" /> Conformidade total</li>
                      <li className="flex items-center gap-2 font-bold text-blue-900 mt-2"><Zap size={14} /> Série E</li>
                    </ul>
                  </div>
                </div>

                {billingStatus.hasPendingInvoices && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 mb-6">
                    <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-bold text-amber-900">Documentos em Aberto</p>
                      <p className="text-xs text-amber-700">
                        Existem {billingStatus.pendingCount} faturas pendentes ou em rascunho. 
                        Deve finalizar ou anular todos os documentos antes de mudar o modo de faturação.
                      </p>
                    </div>
                  </div>
                )}

                {billingStatus.hasUncommunicated && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 mb-6">
                    <AlertCircle className="text-rose-500 shrink-0" size={20} />
                    <div>
                      <p className="text-sm font-bold text-rose-900">Documentos Não Comunicados</p>
                      <p className="text-xs text-rose-700">
                        Existem {billingStatus.uncommunicatedCount} documentos que ainda não foram comunicados à AGT ou exportados em SAFT. 
                        A integridade fiscal exige que todos os documentos do modo atual sejam processados antes da mudança.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    <span className="font-bold text-zinc-900">Nota Importante:</span> A alteração do modo de faturação encerra automaticamente as séries atuais. 
                    No modo <span className="font-bold text-zinc-900">Tradicional</span>, as novas séries são criadas automaticamente. 
                    No modo <span className="font-bold text-zinc-900">Eletrónico</span>, você deverá solicitar a aprovação de novas séries (Série E) manualmente após a alteração.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'signatures' && renderSignaturesTab()}

      {/* Series Modal */}
      <Modal 
        isOpen={isSeriesModalOpen} 
        onClose={() => setIsSeriesModalOpen(false)} 
        title={user.billing_mode === 'eletronica' ? "Solicitar Nova Série" : "Nova Série de Faturas"}
      >
        <form onSubmit={handleCreateSeries} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Estabelecimento</label>
              <select 
                required
                value={seriesFormData.establishment_id}
                onChange={e => setSeriesFormData({...seriesFormData, establishment_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecione um estabelecimento</option>
                {establishments.map(establishment => (
                  <option key={establishment.id} value={establishment.id}>{establishment.name}</option>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Tipo de Série</label>
                <select 
                  required
                  value={seriesFormData.type}
                  onChange={e => setSeriesFormData({...seriesFormData, type: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all font-bold"
                >
                  <option value="FR">Fatura Recibo (FR)</option>
                  <option value="FT">Fatura (FT)</option>
                  <option value="RC">Recibo (RC)</option>
                  <option value="FP">Fatura Proforma (FP)</option>
                  <option value="NC">Nota de Crédito (NC)</option>
                  <option value="ND">Nota de Débito (ND)</option>
                  <option value="OR">Orçamento (OR)</option>
                  <option value="PP">Pedido de Preço (PP)</option>
                  <option value="EX">Exportação (EX)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Ano Fiscal</label>
                <input 
                  type="number" required readOnly
                  value={seriesFormData.fiscal_year}
                  className="w-full px-4 py-3 bg-zinc-100 border border-zinc-100 rounded-xl text-sm outline-none cursor-not-allowed"
                />
              </div>
            </div>

            {user.billing_mode === 'eletronica' && (
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Motivo do Pedido</label>
                <select 
                  required
                  value={seriesFormData.request_reason}
                  onChange={e => setSeriesFormData({...seriesFormData, request_reason: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="Nova série anual">Nova série anual</option>
                  <option value="Esgotamento da série anterior">Esgotamento da série anterior</option>
                  <option value="Novo posto de faturação">Novo posto de faturação</option>
                </select>
              </div>
            )}

            {user.billing_mode !== 'eletronica' && (
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
            )}

            {user.billing_mode === 'eletronica' && (
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Nº Inicial</label>
                <input 
                  type="number" required min="1"
                  value={seriesFormData.start_number}
                  onChange={e => setSeriesFormData({...seriesFormData, start_number: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
            )}
          </div>
          <button 
            type="submit"
            disabled={isRequestingSeries}
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            {isRequestingSeries ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Comunicando com AGT...
              </>
            ) : (
              user.billing_mode === 'eletronica' ? 'Solicitar Série' : 'Criar Série'
            )}
          </button>
        </form>
      </Modal>

      {/* Tax Modal */}
      <Modal 
        isOpen={isTaxModalOpen} 
        onClose={() => {
          setIsTaxModalOpen(false);
          setEditingTaxId(null);
          setTaxFormData({ establishment_id: '', name: '', percentage: '', tax_code: 'NOR' });
        }} 
        title={editingTaxId ? "Editar Imposto" : "Novo Imposto"}
      >
        <form onSubmit={handleCreateTax} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Estabelecimento</label>
              <select 
                required
                value={taxFormData.establishment_id}
                onChange={e => setTaxFormData({...taxFormData, establishment_id: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black transition-all"
              >
                <option value="">Selecione um estabelecimento</option>
                {establishments.map(establishment => (
                  <option key={establishment.id} value={establishment.id}>{establishment.name}</option>
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

      {/* Confirmation Modal for Billing Mode */}
      <Modal 
        isOpen={showConfirmSwitch} 
        onClose={() => setShowConfirmSwitch(false)} 
        title="Confirmar Mudança de Modo"
      >
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="text-rose-500 shrink-0" size={24} />
            <div>
              <p className="text-sm font-black text-rose-900 uppercase">Aviso Crítico</p>
              <p className="text-xs text-rose-700 font-bold leading-relaxed mt-1">
                ATENÇÃO: A alteração do modo de faturação irá impactar a emissão de documentos fiscais. Esta ação não deve ser feita com documentos em aberto. Deseja continuar?
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <p className="text-xs font-bold text-zinc-500 uppercase mb-2">O que irá acontecer:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-zinc-600">
                  <Check size={14} className="text-emerald-500" />
                  <span>A série atual será encerrada (marcada como inativa).</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-600">
                  <Check size={14} className="text-emerald-500" />
                  <span>Uma nova série será criada automaticamente (ex: Série {pendingMode === 'tradicional' ? 'A' : 'E'} {new Date().getFullYear()}).</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-zinc-600">
                  <Check size={14} className="text-emerald-500" />
                  <span>O comportamento de emissão e comunicação será atualizado.</span>
                </li>
              </ul>
            </div>

            <p className="text-sm text-zinc-600">
              Deseja realmente mudar para o modo de faturação <span className="font-bold text-black uppercase">{pendingMode === 'eletronica' ? 'Eletrónica' : 'Tradicional'}</span>?
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setShowConfirmSwitch(false)}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold hover:bg-zinc-200 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={executeSwitchMode}
              disabled={isSwitchingMode}
              className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
            >
              {isSwitchingMode ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
              Confirmar Mudança
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
