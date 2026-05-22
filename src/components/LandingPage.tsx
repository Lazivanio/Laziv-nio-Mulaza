import React, { useState, FormEvent } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Star, 
  Award, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Check, 
  Menu, 
  X, 
  Phone, 
  HelpCircle, 
  Info, 
  Sparkles, 
  Plus, 
  Minus, 
  Receipt, 
  ShieldCheck, 
  UserCheck, 
  BarChart3,
  Building2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types';
import { 
  pricingPlans, 
  clientTestimonials, 
  faqList, 
  whyChooseList 
} from '../data/landingData';

interface LandingPageProps {
  onLogin: (user: User) => void;
}

export const LandingPage = ({ onLogin }: LandingPageProps) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Login form states
  const [identifier, setIdentifier] = useState('owner@factu.com');
  const [password, setPassword] = useState('owner');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Signup form states
  const [regName, setRegName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNif, setRegNif] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Billing toggle state
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('annually');

  // FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // POS simulation state
  const [simCart, setSimCart] = useState<{ cafe: number; agua: number; pastel: number }>({
    cafe: 1,
    agua: 1,
    pastel: 0
  });
  const [simulating, setSimulating] = useState(false);
  const [simulatedReceipt, setSimulatedReceipt] = useState<boolean>(false);
  const [simTab, setSimTab] = useState<'pos' | 'demo'>('pos');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [isContactSent, setIsContactSent] = useState(false);

  // Feature slider state
  const [featureSlideIndex, setFeatureSlideIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const productMeta = {
    cafe: { name: 'Café de Angola (Ginga)', price: 1200 },
    agua: { name: 'Água Purificada Caxito', price: 800 },
    pastel: { name: 'Pastel de Nata Quente', price: 1500 }
  };

  const getSimTotal = () => {
    return (simCart.cafe * productMeta.cafe.price) + 
           (simCart.agua * productMeta.agua.price) + 
           (simCart.pastel * productMeta.pastel.price);
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          companyName: regCompanyName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          nif: regNif,
          address: regAddress
        })
      });
      if (res.ok) {
        const user = await res.json();
        setRegSuccess(true);
        setTimeout(() => {
          setIsRegisterModalOpen(false);
          setRegSuccess(false);
          onLogin(user);
        }, 1500);
      } else {
        const data = await res.json();
        setRegError(data.error || 'Erro ao efetuar o registo da empresa.');
      }
    } catch (err) {
      setRegError('Erro ao estabelecer ligação com o servidor.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password })
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciais inválidas. Use os botões de demonstração.');
      }
    } catch (err) {
      setError('Erro ao estabelecer ligação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerPresetLogin = async (role: 'owner' | 'seller' | 'admin') => {
    let emailInput = '';
    let passwordInput = '';
    
    if (role === 'owner') {
      emailInput = 'owner@factu.com';
      passwordInput = 'owner';
    } else if (role === 'seller') {
      emailInput = 'seller@factu.com';
      passwordInput = 'seller';
    } else if (role === 'admin') {
      emailInput = 'admin@factu.com';
      passwordInput = 'admin';
    }

    setIdentifier(emailInput);
    setPassword(passwordInput);
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciais inválidas.');
      }
    } catch (err) {
      setError('Erro ao contactar o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerScroll = (elementId: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsContactSent(true);
    setTimeout(() => {
      setIsContactSent(false);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMsg('');
    }, 4000);
  };

  const runFaturacaoSimulation = () => {
    if (getSimTotal() === 0) return;
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setSimulatedReceipt(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
      
      {/* 1. ANNOUNCEMENT BAR */}
      <div className="bg-orange-500 text-white font-semibold py-2 px-4 shadow-sm text-center text-xs flex items-center justify-center gap-2 relative z-50">
        <Award size={15} className="shrink-0" />
        <span>Software de Faturação Validado e Certificado Nº 142/AGT</span>
        <span className="hidden md:inline-block opacity-45">|</span>
        <span className="hidden md:inline-block text-[11px] opacity-90">Experimente grátis por 30 dias sem compromisso</span>
      </div>

      {/* 2. NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div 
              className="flex items-center gap-1 cursor-pointer select-none"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <FileText className="text-blue-600 w-7 h-7" />
              <span className="text-xl font-black tracking-tight text-slate-900">
                fatu<span className="text-orange-500">.R</span>
              </span>
              <span className="ml-2.5 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black tracking-widest rounded-md uppercase border border-slate-200">
                AO
              </span>
            </div>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-6">
              <button onClick={() => triggerScroll('funcionalidades')} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => triggerScroll('porque-escolher')} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Vantagens
              </button>
              <button onClick={() => triggerScroll('precos')} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Planos & Preços
              </button>
              <button onClick={() => triggerScroll('faq')} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Perguntas Frequentes
              </button>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <button 
              onClick={() => {
                setError('');
                setIsLoginModalOpen(true);
              }}
              className="text-[13px] font-bold text-slate-700 hover:text-slate-900 px-4 py-2 transition-colors"
            >
              Iniciar Sessão
            </button>
            <button 
              onClick={() => {
                setRegError('');
                setIsRegisterModalOpen(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[13px] px-5 py-2.5 rounded-full transition-all shadow-md shadow-orange-500/10"
            >
              Testar Grátis
            </button>
          </div>

          {/* Mobile hamburger icon */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-4 overflow-hidden"
            >
              <nav className="flex flex-col gap-2">
                <button onClick={() => triggerScroll('funcionalidades')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50">
                  Funcionalidades
                </button>
                <button onClick={() => triggerScroll('porque-escolher')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50">
                  Vantagens
                </button>
                <button onClick={() => triggerScroll('precos')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50">
                  Planos e Preços
                </button>
                <button onClick={() => triggerScroll('faq')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50">
                  Perguntas Frequentes
                </button>
              </nav>
              <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setError('');
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full py-2 bg-slate-100 font-bold text-slate-805 rounded-xl text-xs text-center border border-slate-200"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setRegError('');
                    setIsRegisterModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-orange-500 text-white font-bold rounded-xl text-xs text-center"
                >
                  Criar Conta Grátis
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* 3. HERO & DEMO SECTION */}
      <section className="bg-gradient-to-b from-blue-705 from-blue-900 to-indigo-950 text-white py-14 md:py-20 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-semibold tracking-wider text-orange-400 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span>Simples, Intuitivo e 100% Online</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              A Faturação do Seu Negócio, <br />
              <span className="text-orange-400">Descomplicada Ao Máximo.</span>
            </h1>

            <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Fature em segundos e controle o seu ponto de venda (POS), armazéns, salários e finanças sem confusões. Tudo sincronizado em tempo real no computador, tablet ou telemóvel.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button 
                onClick={() => {
                  setRegError('');
                  setIsRegisterModalOpen(true);
                }}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-orange-500/10"
              >
                Criar Conta Grátis
              </button>
              <button 
                onClick={() => triggerScroll('precos')}
                className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all border border-white/10"
              >
                Ver Planos
              </button>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-slate-300 text-[11px] font-bold">
              <div className="flex items-center gap-1.5">
                <Check size={14} className="text-orange-400" /> Sem Cartão de Crédito
              </div>
              <div className="flex items-center gap-1.5">
                <Check size={14} className="text-orange-400" /> SAFT-A Angola 1-Clique
              </div>
              <div className="flex items-center gap-1.5">
                <Check size={14} className="text-orange-400" /> Suporte Permanente
              </div>
            </div>
          </div>

          {/* INTERACTIVE DEMO AND CHANNELS (Clean, Intuitiva e sem bagunça) */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-slate-100">
              
              {/* Header */}
              <div className="flex border-b border-slate-800 text-xs font-bold bg-slate-950/50 py-4 px-5 items-center gap-2">
                <Receipt className="text-orange-500 w-4 h-4" />
                <span className="text-white">Simular Emissão de Fatura POS</span>
              </div>

              <div className="p-5 space-y-4 text-left">
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Experimente a nossa facilidade de emissão de faturas. Escolha os produtos abaixo e veja a fatura gerar-se instantaneamente!
                </p>

                {/* Quantity selector items */}
                <div className="space-y-2.5">
                  {(['cafe', 'agua', 'pastel'] as const).map(k => {
                    const meta = productMeta[k];
                    return (
                      <div key={k} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        <div>
                          <p className="text-xs font-bold text-white">{meta.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{meta.price.toLocaleString('pt-AO')} Kz</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSimCart(v => ({ ...v, [k]: Math.max(0, v[k] - 1) }))}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-mono font-bold w-4 text-center">{simCart[k]}</span>
                          <button 
                            onClick={() => setSimCart(v => ({ ...v, [k]: v[k] + 1 }))}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Calculation footer */}
                <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span>Total Sem IVA:</span>
                    <span>{(getSimTotal() * 0.86).toFixed(2)} Kz</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (14% Incluído):</span>
                    <span>{(getSimTotal() * 0.14).toFixed(2)} Kz</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1">
                    <span>Total a Faturar:</span>
                    <span className="text-orange-400">{getSimTotal().toLocaleString('pt-AO')} Kz</span>
                  </div>
                </div>

                <div className="pt-1.5">
                  <button 
                    onClick={runFaturacaoSimulation}
                    disabled={getSimTotal() === 0 || simulating}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-800 py-2.5 text-xs text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>A processar em AGT...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} /> Emitir Fatura Online de Teste
                      </>
                    )}
                  </button>
                </div>

                {/* Simulating final receipt modal inside the card */}
                <AnimatePresence>
                  {simulatedReceipt && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-white text-slate-900 rounded-xl p-4 border border-emerald-500 mt-2 space-y-3 shadow-md"
                    >
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                        <ShieldCheck size={16} />
                        <span>Fatura Emitida de Acordo com as Regras AGT</span>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 font-mono text-[10px] space-y-2 text-slate-700">
                        <div className="text-center font-bold border-b border-dashed border-slate-300 pb-2">
                          <p className="text-xs uppercase font-extrabold">Fatu-R POS de Demonstração</p>
                          <p>NIF: 5000284918 • Luanda, Angola</p>
                          <p>Fatura Simplificada FS SM/02931</p>
                        </div>
                        <div className="space-y-1 py-1.5 border-b border-dashed border-slate-300">
                          {(['cafe', 'agua', 'pastel'] as const).filter(k => simCart[k] > 0).map(k => {
                            const q = simCart[k];
                            const item = productMeta[k];
                            return (
                              <div key={k} className="flex justify-between font-mono">
                                <span>{q}x {item.name}</span>
                                <span className="font-bold">{(q * item.price).toLocaleString()} Kz</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 pt-1 text-xs">
                          <span>TOTAL PAGO:</span>
                          <span>{getSimTotal().toLocaleString()} Kz</span>
                        </div>
                        <p className="text-[8px] text-zinc-400 text-center pt-2">Processado por Software de Faturação Fatu-R Validado • ID 142/AGT</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSimulatedReceipt(false)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-1.5 px-3 rounded-lg transition-all"
                        >
                          Fechar Recibo
                        </button>
                        <button 
                          onClick={() => {
                            setSimulatedReceipt(false);
                            setRegError('');
                            setIsRegisterModalOpen(true);
                          }}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg transition-all text-center"
                        >
                          Testar com Meus Dados
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-slate-950 p-3.5 text-center text-[10px] text-slate-500 border-t border-slate-800/80 font-bold">
                ✓ Teste de emissão online interativo. Para iniciar sessão com contas demo rápidas, clique em &quot;Iniciar Sessão&quot; no topo.
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 4. VISUAL SUB-HERO DESIGN APPRECIATION GRID */}
      <section className="bg-white py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 space-y-1">
              <p className="text-2xl md:text-3xl font-black text-blue-600">+15.000</p>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Negócios em Angola</p>
            </div>
            <div className="p-4 space-y-1 border-l border-slate-100">
              <p className="text-2xl md:text-3xl font-black text-blue-600">100%</p>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Cloud Computador / Mobile</p>
            </div>
            <div className="p-4 space-y-1 border-l border-slate-100">
              <p className="text-2xl md:text-3xl font-black text-blue-600">Nº 142</p>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Licença de Validação AGT</p>
            </div>
            <div className="p-4 space-y-1 border-l border-slate-100">
              <p className="text-2xl md:text-3xl font-black text-blue-600">0%</p>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Paragens ou Lentidão</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES SECTION (Elegant Slider / Carousel format) */}
      <section id="funcionalidades" className="py-20 bg-slate-50 scroll-mt-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl text-left space-y-3.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded">
                Funcionalidades Premium
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-normal">
                Tudo o Que Precisa Para Gerir e Faturar Sem Complicações
              </h2>
              <p className="text-sm text-slate-500 font-normal leading-relaxed">
                O Fatu-R organiza o seu negócio de forma centralizada. Deslize e clique para explorar as nossas ferramentas intuitivas.
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button 
                onClick={() => {
                  setSlideDirection('left');
                  setFeatureSlideIndex(v => (v - 1 + 6) % 6);
                }}
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                aria-label="Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => {
                  setSlideDirection('right');
                  setFeatureSlideIndex(v => (v + 1) % 6);
                }}
                className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                aria-label="Seguinte"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Slider Core Container */}
          <div className="relative">
            {/* Horizontal sliding track */}
            <div className="overflow-hidden py-4 -mx-4 px-4">
              <motion.div 
                className="flex lg:hidden w-full gap-6"
                animate={{ 
                  x: `calc(-${featureSlideIndex} * (100% + 24px))` 
                }}
                variants={{
                  mobile: { x: `calc(-${featureSlideIndex} * (100% + 24px))` }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {[
                  {
                    icon: <Receipt size={26} />,
                    bg: "bg-orange-100 text-orange-600",
                    title: "Faturação Certificada AGT",
                    desc: "Emissão veloz de Faturas (FT), Recibos (FR), Proformas e Notas de Crédito. Total conformidade legal garantida."
                  },
                  {
                    icon: <BarChart3 size={26} />,
                    bg: "bg-blue-100 text-blue-600",
                    title: "Ponto de Venda POS Rápido",
                    desc: "Interface de vendedor otimizada para ecossistema web e mobile com controle cego de fecho de caixa."
                  },
                  {
                    icon: <Building2 size={26} />,
                    bg: "bg-emerald-100 text-emerald-600",
                    title: "Controle Múltiplo de Lojas",
                    desc: "Gerencie múltiplos armazéns ou divisões do seu negócio com fluxo financeiro perfeitamente apartado."
                  },
                  {
                    icon: <UserCheck size={26} />,
                    bg: "bg-purple-100 text-purple-600",
                    title: "Pessoal & Salários",
                    desc: "Gestão integrada de recursos humanos, folha de ponto e pagamentos automatizados em segundos."
                  },
                  {
                    icon: <ShieldCheck size={26} />,
                    bg: "bg-cyan-100 text-cyan-600",
                    title: "Exportações Seguras SAFT-A",
                    desc: "Crie e transfira os ficheiros de auditoria SAFT-A das suas transações mensais de forma automatizada."
                  },
                  {
                    icon: <Sparkles size={26} />,
                    bg: "bg-rose-100 text-rose-600",
                    title: "Controlo Total na Cloud",
                    desc: "Aceda ao seu painel geral de onde estiver. Compatível com impressoras térmicas convencionais e standard."
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="w-full shrink-0 bg-white p-8 rounded-2xl border border-slate-200 shadow-md min-h-[260px] flex flex-col justify-between"
                  >
                    <div>
                      <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center mb-5 shadow-inner`}>
                        {item.icon}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed font-normal">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Large Screen Track (Showing 3 cards per view, wrapping or sliding) */}
              <div className="hidden lg:block w-full overflow-hidden">
                <AnimatePresence mode="wait" custom={slideDirection}>
                  <motion.div 
                    key={featureSlideIndex}
                    custom={slideDirection}
                    variants={{
                      enter: (direction: 'left' | 'right') => ({
                        x: direction === 'right' ? 300 : -300,
                        opacity: 0
                      }),
                      center: {
                        x: 0,
                        opacity: 1
                      },
                      exit: (direction: 'left' | 'right') => ({
                        x: direction === 'right' ? -300 : 300,
                        opacity: 0
                      })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ 
                      x: { type: "spring", stiffness: 220, damping: 26 },
                      opacity: { duration: 0.2 }
                    }}
                    className="grid grid-cols-3 gap-6"
                  >
                    {[0, 1, 2].map(offset => {
                      const itemIdx = (featureSlideIndex + offset) % 6;
                      const featuresList = [
                        {
                          icon: <Receipt size={26} />,
                          bg: "bg-orange-100 text-orange-600",
                          title: "Faturação Certificada AGT",
                          desc: "Emissão veloz de Faturas (FT), Recibos (FR), Proformas e Notas de Crédito. Total conformidade legal garantida."
                        },
                        {
                          icon: <BarChart3 size={26} />,
                          bg: "bg-blue-100 text-blue-600",
                          title: "Ponto de Venda POS Rápido",
                          desc: "Interface de vendedor otimizada para ecossistema web e mobile com controle cego de fecho de caixa."
                        },
                        {
                          icon: <Building2 size={26} />,
                          bg: "bg-emerald-100 text-emerald-600",
                          title: "Controle Múltiplo de Lojas",
                          desc: "Gerencie múltiplos armazéns ou divisões do seu negócio com fluxo financeiro perfeitamente apartado."
                        },
                        {
                          icon: <UserCheck size={26} />,
                          bg: "bg-purple-100 text-purple-600",
                          title: "Pessoal & Salários",
                          desc: "Gestão integrada de recursos humanos, folha de ponto e pagamentos automatizados em segundos."
                        },
                        {
                          icon: <ShieldCheck size={26} />,
                          bg: "bg-cyan-100 text-cyan-600",
                          title: "Exportações Seguras SAFT-A",
                          desc: "Crie e transfira os ficheiros de auditoria SAFT-A das suas transações mensais de forma automatizada e segura."
                        },
                        {
                          icon: <Sparkles size={26} />,
                          bg: "bg-rose-100 text-rose-600",
                          title: "Controlo Total na Cloud",
                          desc: "Aceda ao seu painel geral de onde estiver. Compatível com impressoras térmicas convencionais e impressoras standard A4."
                        }
                      ];
                      const item = featuresList[itemIdx];
                      return (
                        <div 
                          key={itemIdx}
                          className="bg-white p-10 rounded-2xl border border-slate-200 shadow-md hover:shadow-lg transition-all flex flex-col justify-between min-h-[300px] hover:-translate-y-1 duration-300"
                        >
                          <div>
                            <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center mb-6 shadow-inner`}>
                              {item.icon}
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-900 mb-3.5 leading-snug">{item.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-normal">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

            {/* Pagination Bullet Indicators */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSlideDirection(idx > featureSlideIndex ? 'right' : 'left');
                    setFeatureSlideIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    featureSlideIndex === idx 
                      ? 'w-6 bg-orange-500' 
                      : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Ir para slide ${idx + 1}`}
                />
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* 6. WHY CHOOSE SECTION (Pure Elegance and Clean Layout, replaces messy carousel mockup) */}
      <section id="porque-escolher" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded">
              Diferenciais de Sucesso
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              A Solução Perfeita para Escritórios, Retalho ou Restauração
            </h2>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              O que nos torna preferência nacional em faturamento eletrónico é o nosso compromisso inegociável com a simplicidade.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Image Screenshot */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-blue-500/5 blur-3xl rounded-full" />
              <div className="relative bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-md">
                <img 
                  src="/src/assets/images/faturacao_dashboard_1779407142285.png" 
                  alt="Painel de Faturamento" 
                  className="rounded-xl w-full object-cover shadow-sm aspect-video sm:aspect-auto"
                />
              </div>
            </div>

            {/* Right side Advantages list */}
            <div className="lg:col-span-7 space-y-4 text-left">
              {whyChooseList.map((adv, idx) => (
                <div key={idx} className="flex gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    0{idx + 1}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-orange-500 tracking-wide">{adv.badge}</p>
                    <h4 className="text-sm font-extrabold text-slate-900">{adv.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-normal">{adv.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 7. PRICING PLANS SECTION (Visual Masterpiece, Highly readable and Clean) */}
      <section id="precos" className="py-20 bg-slate-50 scroll-mt-20 border-t border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-normal">
              Preços Claros e Ajustados ao Tamanho do Negócio
            </h2>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              Sem taxas ocultas, obrigações adicionais ou dores de cabeça. Mude de plano quando desejar.
            </p>

            {/* Subscriptions selector toggle */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/60 backdrop-blur-md rounded-full border border-slate-300 w-fit">
              <button 
                onClick={() => setBillingPeriod('annually')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingPeriod === 'annually' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anual <span className="text-[10px] text-emerald-600 font-extrabold ml-1">(Poupa 20%)</span>
              </button>
              <button 
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingPeriod === 'monthly' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mensal
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => {
              const currentPrice = billingPeriod === 'annually' ? plan.priceAnnually : plan.priceMonthly;
              return (
                <div 
                  key={idx} 
                  className={`bg-white rounded-2xl border transition-all p-6 relative flex flex-col justify-between ${
                    plan.popular 
                      ? 'border-orange-500 ring-4 ring-orange-500/5 shadow-md scale-100' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white font-bold text-[10px] uppercase tracking-widest px-3.5 py-1 rounded-full border border-orange-400">
                      Mais Escolhido
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">{plan.badge}</span>
                      <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{plan.name}</h4>
                    </div>

                    <div className="py-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{currentPrice}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase">Kz/mês</span>
                      </div>
                      {billingPeriod === 'annually' && (
                        <p className="text-[10.5px] text-emerald-600 font-semibold mt-1">
                          Facturado {plan.billedAnnuallyTotal} Kz ao ano
                        </p>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2.5">
                      {plan.features.map((feat, fidx) => (
                        <div key={fidx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span className="font-normal">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 pointer-events-auto">
                    <button 
                      onClick={() => {
                        setRegError('');
                        setIsRegisterModalOpen(true);
                      }}
                      className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
                        plan.popular 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-705'
                      }`}
                    >
                      {plan.buttonText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 8. FAQs ACCORDION LIST */}
      <section id="faq" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-normal">
              Dúvidas Relacionadas com Faturação Certificada?
            </h2>
            <p className="text-sm text-slate-500 font-normal leading-relaxed">
              Respondemos às questões operacionais e tributárias mais frequentes apresentadas pelos nossos utilizadores.
            </p>
          </div>

          <div className="space-y-4">
            {faqList.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full py-4 px-5 text-left flex items-center justify-between text-xs sm:text-sm font-extrabold text-slate-805 text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 text-xs font-semibold text-slate-500 leading-relaxed max-w-3xl border-t border-slate-200/50 pt-3">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 9. SUPPORT & CONTACT UNIT */}
      <section className="py-16 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          
          <div className="space-y-4 text-left self-center">
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase leading-normal">
              Precisa de ajuda especializada ou tem dúvidas?
            </h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Se já fura com outro programa ou precisa que o ajudemos a configurar a sua estrutura de faturamento, a nossa central de apoio está disponível sem custos para si.
            </p>
            <div className="space-y-2 pt-2 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-orange-400" />
                <span>+244 923 000 000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-orange-400" />
                <span>suporte@fatu-r.co.ao</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleContactSubmit} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left space-y-3.5">
            <p className="text-xs text-slate-400 font-bold block uppercase tracking-wide">Fale com os Nossos Especialistas</p>
            
            <div className="space-y-2.5 text-xs text-slate-200">
              <input 
                type="text" 
                placeholder="Seu Nome Completo" 
                required
                value={contactName}
                onChange={e => setContactName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl focus:border-orange-500 outline-none"
              />
              <input 
                type="email" 
                placeholder="Endereço de E-mail" 
                required
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl focus:border-orange-500 outline-none"
              />
              <textarea 
                rows={3}
                placeholder="Descreva a sua dúvida ou necessidade" 
                required
                value={contactMsg}
                onChange={e => setContactMsg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-2.5 rounded-xl focus:border-orange-500 outline-none resize-none"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 py-2 text-xs text-white font-bold rounded-xl transition-all"
            >
              Enviar Mensagem Grátis
            </button>

            <AnimatePresence>
              {isContactSent && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded text-[10px] text-center font-bold"
                >
                  Agradecemos o contacto! Responderemos em menos de 1 hora.
                </motion.div>
              )}
            </AnimatePresence>
          </form>

        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-slate-950 text-slate-500 py-10 border-t border-slate-900 px-4 text-center text-xs">
        <div className="max-w-7xl mx-auto space-y-4">
          <p className="font-semibold text-slate-400">
            fatu<span className="text-orange-500">.R</span> © {new Date().getFullYear()} • Sistema de Faturação Eletrônica Online Certificado AGT
          </p>
          <p className="text-[10px] text-slate-600 max-w-xl mx-auto">
            Certificado sob o registro Nº 142/AGT. De acordo com as leis fiscais em vigor na República de Angola. Desenvolvido sob rigorosos critérios de segurança, desempenho e estabilidade operacional.
          </p>
        </div>
      </footer>


      {/* --- LOGIN MODAL (Pristine, Clean, and Easy to Use) --- */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xl max-w-md w-full overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="text-orange-500 w-4 h-4" />
                  <span className="text-sm font-bold text-slate-900">Iniciar Sessão Fatu-R</span>
                </div>
                <button 
                  onClick={() => setIsLoginModalOpen(false)}
                  className="p-1 px-2.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
                
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs font-bold">
                    {error}
                  </div>
                )}

                <div className="space-y-1 text-xs text-slate-700">
                  <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Endereço de E-mail</label>
                  <input 
                    type="email" 
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="exemplo@factu.com"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-semibold"
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-700">
                  <div className="flex justify-between items-center">
                    <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Sua Palavra-Passe</label>
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-450 text-slate-500 hover:text-slate-800 font-bold"
                    >
                      {showPassword ? 'Ocultar' : 'Revelar'}
                    </button>
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'A conectar...' : 'Aceder à Minha Conta'}
                </button>

                {/* Demonstration Help Block inside the form */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase text-center block">Sessão Rápida com Contas de Teste:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button 
                      type="button"
                      onClick={() => triggerPresetLogin('owner')}
                      disabled={isLoading}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-all"
                    >
                      Dono POS
                    </button>
                    <button 
                      type="button"
                      onClick={() => triggerPresetLogin('seller')}
                      disabled={isLoading}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-all"
                    >
                      Caixa POS
                    </button>
                    <button 
                      type="button"
                      onClick={() => triggerPresetLogin('admin')}
                      disabled={isLoading}
                      className="py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg transition-all"
                    >
                      Auditor AGT
                    </button>
                  </div>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* --- BUSINESS SIGNUP MODAL (Pristine, Clean, and Easy to Use) --- */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xl max-w-lg w-full overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Building2 className="text-orange-500 w-4 h-4" />
                  <span className="text-sm font-bold text-slate-900">Configurar Empresa Grátis por 30 Dias</span>
                </div>
                <button 
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="p-1 px-2.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-805 transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {regSuccess ? (
                <div className="p-10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-base font-bold text-slate-905">Empresa Registada com Sucesso!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    A criar as suas credenciais no servidor... Será redirecionado para a consola de gestão em breves instantes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                  
                  {regError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs font-bold">
                      {regError}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 font-bold block bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    💡 Basta preencher o formulário para registar e criar uma série de faturação homologada de demonstração livre!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 text-xs text-slate-700">
                      <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Responsável</label>
                      <input 
                        type="text" 
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="Nome do Administrador"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1 text-xs text-slate-700">
                      <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Nome da Empresa</label>
                      <input 
                        type="text" 
                        required
                        value={regCompanyName}
                        onChange={e => setRegCompanyName(e.target.value)}
                        placeholder="Ex: Comercial Luanda Lda"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 text-xs text-slate-700">
                      <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Endereço de E-mail</label>
                      <input 
                        type="email" 
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="exemplo@empresa.com"
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-1 text-xs text-slate-700">
                      <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Palavra-Passe</label>
                      <input 
                        type="password" 
                        required
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 text-xs text-slate-700">
                      <label className="font-extrabold uppercase text-[10px] text-slate-500 block">NIF de Angola</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: 500092841"
                        value={regNif}
                        onChange={e => setRegNif(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1 text-xs text-slate-700">
                      <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Contacto Telefónico</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: 923 000 000"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-700">
                    <label className="font-extrabold uppercase text-[10px] text-slate-500 block">Endereço Físico</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Via Principal Talatona, Edifício Sol"
                      value={regAddress}
                      onChange={e => setRegAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl outline-none focus:border-orange-500 font-semibold"
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={regLoading}
                      className="w-full bg-orange-500 hover:bg-orange-605 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-2"
                    >
                      {regLoading ? 'A registar empresa...' : 'Registar Empresa e Iniciar Teste'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
