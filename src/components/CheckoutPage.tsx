import React, { useState, useRef, FormEvent } from 'react';
import { 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Lock, 
  Phone, 
  FileText, 
  MapPin, 
  Upload, 
  FileCheck, 
  X, 
  AlertCircle, 
  BadgePercent,
  Zap,
  Copy,
  ArrowRight
} from 'lucide-react';
import { User } from '../types';
import { FloatingBubbles } from './FloatingBubbles';

interface CheckoutPageProps {
  initialPlan?: string;
  onBack: () => void;
  onLogin: (user: User) => void;
  onGoToRegister: () => void;
  onGoToLogin: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  initialPlan = 'Profissional',
  onBack,
  onLogin,
  onGoToRegister,
  onGoToLogin
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'Básico' | 'Profissional' | 'Empresarial'>(() => {
    if (initialPlan === 'Básico' || initialPlan === 'Base') return 'Básico';
    if (initialPlan === 'Empresarial' || initialPlan === 'Pro') return 'Empresarial';
    return 'Profissional';
  });

  const [billingPeriod, setBillingPeriod] = useState<'trimestral' | 'semestral' | 'anual'>('trimestral');
  const [paymentMethod, setPaymentMethod] = useState<'iban' | 'multicaixa'>('iban');

  // Customer credentials & company data
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nif, setNif] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Payment proof upload
  const [proofFile, setProofFile] = useState<{ name: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [copiedIBAN, setCopiedIBAN] = useState<string | null>(null);

  const planMonthlyPrices = {
    'Básico': 7900,
    'Profissional': 15000,
    'Empresarial': 19500
  };

  const getCalculation = () => {
    const monthlyPrice = planMonthlyPrices[selectedPlan];
    let months = 3;
    let discountPercent = 0;

    if (billingPeriod === 'semestral') {
      months = 6;
      discountPercent = 0.10; // 10% discount
    } else if (billingPeriod === 'anual') {
      months = 12;
      discountPercent = 0.20; // 20% discount
    }

    const subtotal = monthlyPrice * months;
    const discountAmount = subtotal * discountPercent;
    const total = subtotal - discountAmount;

    return {
      monthlyPrice,
      months,
      subtotal,
      discountPercent: discountPercent * 100,
      discountAmount,
      total
    };
  };

  const calc = getCalculation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError('O ficheiro não deve exceder 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setProofFile({
          name: file.name,
          data: event.target?.result as string
        });
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIBAN(label);
    setTimeout(() => setCopiedIBAN(null), 2500);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !companyName || !email || !password) {
      setError('Por favor, preencha os dados de Administrador, Empresa, E-mail e Palavra-passe.');
      return;
    }

    if (paymentMethod === 'iban' && !proofFile) {
      setError('Por favor, anexe o comprovativo da transferência bancária para validação da licença.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/register-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          companyName,
          email,
          password,
          phone: phone || 'N/A',
          nif: nif || '999999999',
          address: address || 'Luanda, Angola',
          planName: selectedPlan,
          months: String(calc.months),
          paymentMethod: paymentMethod === 'multicaixa' ? 'Referência Multicaixa' : 'Transferência Bancária / IBAN',
          paymentProof: proofFile ? proofFile.data : null,
          proofFileName: proofFile ? proofFile.name : null
        })
      });

      if (res.ok) {
        const user = await res.json();
        setRegisteredUser(user);
        setSuccess(true);
        // Automatic login & redirect to the respective account
        setTimeout(() => {
          onLogin(user);
        }, 2200);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao processar a compra da licença. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao comunicar com o servidor do Fatu-R. Verifique a sua ligação à internet.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Dominant Orange (60%) warm radiant background, White (30%) clean surfaces, Black (10%) high-contrast typography
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex flex-col justify-between selection:bg-black selection:text-white relative overflow-hidden">
      
      {/* Animated Floating Bubbles in White and Dark Blue on the lateral areas */}
      <FloatingBubbles />

      {/* Decorative ambient subtle light rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-xs font-black text-black bg-white/90 hover:bg-white px-4 py-2 rounded-full shadow-md shadow-orange-950/10 border border-white/50 transition-all cursor-pointer"
            >
              <ArrowLeft size={14} className="text-black" />
              <span>Voltar ao Início</span>
            </button>

            <div 
              onClick={onBack} 
              className="flex items-center gap-2.5 cursor-pointer bg-white/90 hover:bg-white px-3.5 py-1.5 rounded-full shadow-md shadow-orange-950/10 transition-all"
            >
              <img 
                src="https://i.ibb.co/Q72rTwRL/ss.png" 
                alt="Fatu-R Logo" 
                className="w-7 h-7 object-contain" 
                referrerPolicy="no-referrer"
              />
              <span className="text-base font-black tracking-tight text-black">
                Fatu<span className="text-orange-600">-R</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onGoToRegister}
              className="hidden sm:flex items-center gap-1.5 text-xs font-black text-black bg-white/90 hover:bg-white px-4 py-2 rounded-full shadow-md shadow-orange-950/10 border border-white/50 transition-all cursor-pointer"
            >
              <span>Testar 30 Dias Grátis</span>
            </button>
            <button
              onClick={onGoToLogin}
              className="flex items-center gap-1.5 text-xs font-black text-white bg-black hover:bg-slate-900 px-4 py-2 rounded-full shadow-md shadow-black/15 transition-all cursor-pointer"
            >
              <span>Iniciar Sessão</span>
              <ArrowRight size={13} className="text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Checkout Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {success ? (
          <div className="max-w-xl mx-auto my-8 bg-white border border-orange-200/90 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-orange-950/20 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 size={42} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-black">Licença Solicitada com Sucesso!</h2>
              <p className="text-sm font-semibold text-slate-700">
                A sua empresa <strong className="text-black font-black">{companyName}</strong> foi registada no sistema.
              </p>
              <p className="text-xs text-slate-600 font-medium">
                O comprovativo foi submetido. A sua licença comercial do plano <strong className="text-orange-600 font-black">{selectedPlan}</strong> está ativa.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">Plano Selecionado:</span>
                <span className="text-black font-black">{selectedPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">Período:</span>
                <span className="text-black font-semibold capitalize">{billingPeriod} ({calc.months} meses)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">Valor Total:</span>
                <span className="text-black font-mono font-black text-sm">
                  {calc.total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-black text-orange-600 pt-2">
              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-600 rounded-full animate-spin" />
              <span>A entrar diretamente na sua conta e painel de controlo...</span>
            </div>
            {registeredUser && (
              <button
                type="button"
                onClick={() => onLogin(registeredUser)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                Aceder Imediatamente à Minha Conta
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-8 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-white shadow-md shadow-orange-950/10 text-black text-xs font-black mb-3">
                <Zap size={14} className="text-orange-600" />
                <span>Ativação Direta de Licença Comercial</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
                Comprar Licença Comercial Fatu-R
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-black/80 mt-1">
                Escolha o seu plano de faturação, preencha os dados da sua empresa e confirme as coordenadas de pagamento.
              </p>
            </div>

            {error && (
              <div className="mb-7 p-4 rounded-2xl bg-white border-2 border-rose-300 text-rose-700 flex items-start gap-2.5 text-xs font-bold shadow-lg">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Plan, Details, Payment */}
              <div className="lg:col-span-8 space-y-7 text-left">
                
                {/* STEP 1: PLAN SELECTION */}
                <div className="bg-white rounded-3xl border border-orange-200/90 shadow-2xl shadow-orange-950/15 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-sm">1</span>
                      <h3 className="text-sm font-black text-black uppercase tracking-wider">Escolha a sua Licença Comercial</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500">Homologado AGT nº 452</span>
                  </div>

                  {/* Plan cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Básico */}
                    <div
                      onClick={() => setSelectedPlan('Básico')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        selectedPlan === 'Básico'
                          ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                          : 'bg-slate-50 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-black">Base / Básico</span>
                          {selectedPlan === 'Básico' && <div className="w-3 h-3 rounded-full bg-orange-500" />}
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 mt-1">Serviços, Consultoria e Facturação A4</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <span className="text-base font-black text-black">
                          {planMonthlyPrices['Básico'].toLocaleString('pt-AO')} Kz
                        </span>
                        <span className="text-[10px] text-slate-500 block font-bold">/mês</span>
                      </div>
                    </div>

                    {/* Profissional (Popular) */}
                    <div
                      onClick={() => setSelectedPlan('Profissional')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                        selectedPlan === 'Profissional'
                          ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                          : 'bg-slate-50 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-2.5 py-0.5 rounded-bl-lg">
                        POPULAR
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-black">Flex / Profissional</span>
                          {selectedPlan === 'Profissional' && <div className="w-3 h-3 rounded-full bg-orange-500" />}
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 mt-1">POS Retalho, Lojas, Stock e Caixa</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <span className="text-base font-black text-black">
                          {planMonthlyPrices['Profissional'].toLocaleString('pt-AO')} Kz
                        </span>
                        <span className="text-[10px] text-slate-500 block font-bold">/mês</span>
                      </div>
                    </div>

                    {/* Empresarial */}
                    <div
                      onClick={() => setSelectedPlan('Empresarial')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                        selectedPlan === 'Empresarial'
                          ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-md'
                          : 'bg-slate-50 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-black">Pro / Empresarial</span>
                          {selectedPlan === 'Empresarial' && <div className="w-3 h-3 rounded-full bg-orange-500" />}
                        </div>
                        <p className="text-[11px] font-medium text-slate-600 mt-1">Restauração, Cozinha e Multi-armazéns</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <span className="text-base font-black text-black">
                          {planMonthlyPrices['Empresarial'].toLocaleString('pt-AO')} Kz
                        </span>
                        <span className="text-[10px] text-slate-500 block font-bold">/mês</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Period Selector */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs font-black text-black">Duração / Período:</span>
                    <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full sm:w-auto shadow-sm">
                      <button
                        type="button"
                        onClick={() => setBillingPeriod('trimestral')}
                        className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          billingPeriod === 'trimestral'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-600 hover:text-black'
                        }`}
                      >
                        Trimestral (3m)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingPeriod('semestral')}
                        className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          billingPeriod === 'semestral'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-600 hover:text-black'
                        }`}
                      >
                        <span>Semestral (6m)</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1 rounded">-10%</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingPeriod('anual')}
                        className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          billingPeriod === 'anual'
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-slate-600 hover:text-black'
                        }`}
                      >
                        <span>Anual (12m)</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1 rounded">-20%</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* STEP 2: CREDENTIALS & COMPANY */}
                <div className="bg-white rounded-3xl border border-orange-200/90 shadow-2xl shadow-orange-950/15 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-sm">2</span>
                      <h3 className="text-sm font-black text-black uppercase tracking-wider">Dados do Administrador e Empresa</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">Nome do Responsável *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome do Titular"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">Nome Oficial da Empresa *</label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="Ex: Comercial Luanda Lda"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">E-mail de Acesso *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@empresa.ao"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">Defina uma Palavra-Passe *</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">NIF de Angola</label>
                      <input
                        type="text"
                        value={nif}
                        onChange={e => setNif(e.target.value)}
                        placeholder="Ex: 500092841"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Ex: 923 000 000"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">Endereço Sede</label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ex: Talatona, Luanda"
                        className="w-full bg-slate-50 border-2 border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3: PAYMENT METHOD & BANK COORDINATES */}
                <div className="bg-white rounded-3xl border border-orange-200/90 shadow-2xl shadow-orange-950/15 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-sm">3</span>
                      <h3 className="text-sm font-black text-black uppercase tracking-wider">Pagamento em Angola</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500">Coordenadas Oficiais</span>
                  </div>

                  {/* Payment method toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('iban')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                        paymentMethod === 'iban'
                          ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-black">Transferência Bancária / IBAN</div>
                        <div className="text-[10px] font-semibold text-slate-500">BAI ou BFA</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('multicaixa')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                        paymentMethod === 'multicaixa'
                          ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-black">Referência Multicaixa</div>
                        <div className="text-[10px] font-semibold text-slate-500">Express ou Caixa Automático</div>
                      </div>
                    </button>
                  </div>

                  {/* IBAN Bank Details */}
                  {paymentMethod === 'iban' ? (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* BAI */}
                        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-orange-600">Banco BAI</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('AO06.0040.0000.1234.5678.9012.3', 'bai')}
                              className="text-[10px] font-bold text-slate-600 hover:text-black flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-slate-200"
                            >
                              <Copy size={11} />
                              <span>{copiedIBAN === 'bai' ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-600">Titular: Fatu-R Soluções Lda</p>
                          <p className="text-xs font-mono font-black text-black tracking-wider pt-1">
                            AO06.0040.0000.1234.5678.9012.3
                          </p>
                        </div>

                        {/* BFA */}
                        <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-orange-600">Banco BFA</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('AO06.0006.0000.9876.5432.1098.7', 'bfa')}
                              className="text-[10px] font-bold text-slate-600 hover:text-black flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-slate-200"
                            >
                              <Copy size={11} />
                              <span>{copiedIBAN === 'bfa' ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-600">Titular: Fatu-R Soluções Lda</p>
                          <p className="text-xs font-mono font-black text-black tracking-wider pt-1">
                            AO06.0006.0000.9876.5432.1098.7
                          </p>
                        </div>
                      </div>

                      {/* File upload for proof */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-black block">
                          Comprovativo da Transferência Bancária *
                        </label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*,.pdf,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        {proofFile ? (
                          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800">
                            <div className="flex items-center gap-2.5">
                              <FileCheck size={18} className="text-emerald-600" />
                              <span className="text-xs font-bold truncate max-w-xs">{proofFile.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProofFile(null)}
                              className="p-1 hover:bg-emerald-100 rounded text-emerald-700 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                          >
                            <Upload size={24} className="mx-auto text-slate-400 group-hover:text-orange-600 mb-2 transition-colors" />
                            <div className="text-xs font-black text-black">Carregar Comprovativo de Pagamento</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Formatos aceites: PDF, JPG, PNG (máx. 8MB)</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Multicaixa Details */
                    <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-black">Pagamento por Referência Multicaixa</span>
                        <span className="text-[10px] text-emerald-700 font-black bg-emerald-100 px-2.5 py-0.5 rounded-full">Ativo</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] text-slate-500 block uppercase font-black">Entidade:</span>
                          <span className="text-sm font-mono font-black text-black">10245</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <span className="text-[10px] text-slate-500 block uppercase font-black">Referência:</span>
                          <span className="text-sm font-mono font-black text-orange-600">924 812 051</span>
                        </div>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600">
                        Pague no terminal Multicaixa ou app Express na opção "Pagamento por Referência" com o valor total calculado.
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Order Summary & Action */}
              <div className="lg:col-span-4 sticky top-24 space-y-4">
                <div className="bg-white rounded-3xl border border-orange-200/90 shadow-2xl shadow-orange-950/15 p-6 sm:p-7 text-left space-y-5">
                  <h3 className="text-sm font-black text-black uppercase tracking-wider border-b border-slate-100 pb-3">
                    Resumo da Encomenda
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-bold">Licença Selecionada:</span>
                      <span className="text-black font-black">{selectedPlan}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-bold">Mensalidade Base:</span>
                      <span className="text-black font-mono font-bold">{calc.monthlyPrice.toLocaleString('pt-AO')} Kz</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-bold">Período:</span>
                      <span className="text-black font-bold capitalize">{billingPeriod} ({calc.months} meses)</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-bold">Subtotal:</span>
                      <span className="text-black font-mono font-bold">{calc.subtotal.toLocaleString('pt-AO')} Kz</span>
                    </div>

                    {calc.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700 font-bold">
                        <span className="flex items-center gap-1">
                          <BadgePercent size={14} />
                          <span>Desconto ({calc.discountPercent}%):</span>
                        </span>
                        <span className="font-mono font-black">- {calc.discountAmount.toLocaleString('pt-AO')} Kz</span>
                      </div>
                    )}

                    <div className="pt-3.5 border-t border-slate-100 flex justify-between items-baseline">
                      <span className="text-sm font-black text-black">Total a Pagar:</span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-orange-600 font-mono">
                          {calc.total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                        </span>
                        <span className="text-[10px] text-slate-500 block font-semibold">IVA incluído à taxa legal</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>A processar licença e conta...</span>
                      </>
                    ) : (
                      <span>Confirmar Pagamento & Criar Conta</span>
                    )}
                  </button>

                  <div className="space-y-2 pt-2 text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      <span>Software Homologado pela AGT Angola</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span>Acesso imediato à plataforma</span>
                    </div>
                  </div>
                </div>

                {/* Free trial suggestion */}
                <div className="p-4 rounded-2xl bg-white/90 border border-white shadow-md shadow-orange-950/10 text-center text-xs font-semibold text-black">
                  Quer apenas testar antes de comprar?{' '}
                  <button
                    type="button"
                    onClick={onGoToRegister}
                    className="text-orange-600 hover:text-orange-700 font-black transition-colors cursor-pointer block mt-1 mx-auto"
                  >
                    Ativar Teste Grátis de 30 Dias →
                  </button>
                </div>
              </div>

            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs font-bold text-black/80">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Fatu-R — Sistema de Facturação Certificado AGT</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Servidores Cloud em Luanda, Angola
          </span>
        </div>
      </footer>
    </div>
  );
};
