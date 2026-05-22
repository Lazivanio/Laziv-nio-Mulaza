import React, { useState, FormEvent, useRef } from 'react';
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
  FileText,
  Play,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  MessageSquare,
  Send
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
  const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);

  const helpTimeoutRef = useRef<any>(null);

  const handleHelpMouseEnter = () => {
    if (helpTimeoutRef.current) clearTimeout(helpTimeoutRef.current);
    setIsHelpDropdownOpen(true);
  };

  const handleHelpMouseLeave = () => {
    helpTimeoutRef.current = setTimeout(() => {
      setIsHelpDropdownOpen(false);
    }, 180);
  };

  const [helpMessageModal, setHelpMessageModal] = useState<{
    isOpen: boolean;
    title: string;
    body: string;
  }>({
    isOpen: false,
    title: '',
    body: ''
  });

  // Support Floating Chat State & Handlers
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: number;
    sender: 'system' | 'user';
    text: string;
    time: string;
  }>>([
    {
      id: 1,
      sender: 'system',
      text: 'Olá! Necessita de algum esclarecimento sobre o Fatu-R? ',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user' as const,
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput.toLowerCase();
    setChatInput('');

    setTimeout(() => {
      let replyText = "Agradecemos o seu contacto! Um dos nossos assistentes reais foi notificado e responderá aqui ou pelo e-mail do seu registo dentro de instantes.";
      if (currentInput.includes('preço') || currentInput.includes('valor') || currentInput.includes('plano') || currentInput.includes('pagar') || currentInput.includes('cust')) {
        replyText = "Temos 3 planos excelentes para o seu negócio: Básico (6.000 Kz/mês), Profissional (14.000 Kz/mês) e Empresarial (29.000 Kz/mês). Pode testar qualquer um inteiramente grátis por 14 dias!";
      } else if (currentInput.includes('agt') || currentInput.includes('certificado') || currentInput.includes('lei') || currentInput.includes('legal') || currentInput.includes('registo')) {
        replyText = "Sim, totalmente! O Fatu-R é um sistema de faturação eletrónica online certificado pela AGT sob a licença Nº 142/AGT. Garanta total conformidade fiscal nas suas vendas.";
      } else if (currentInput.includes('teste') || currentInput.includes('testar') || currentInput.includes('gratis') || currentInput.includes('gratuito') || currentInput.includes('experimentar')) {
        replyText = "Pode experimentar o Fatu-R gratuitamente por 14 dias sem compromissos! Basta selecionar 'Testar Grátis' em cima e preencher os dados de cadastro para começar imediatamente.";
      } else if (currentInput.includes('ajuda') || currentInput.includes('suporte') || currentInput.includes('contacto') || currentInput.includes('telefone') || currentInput.includes('email')) {
        replyText = "Dispomos de suporte premium! Contacte-nos pelo e-mail suporte@fatur.ao, telefone +244 923 000 000, ou diretamente na consola Fatu-R com um dos nossos consultores.";
      }

      setChatMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'system' as const,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1100);
  };

  // Paid direct subscription state
  const [paidPlan, setPaidPlan] = useState<'Básico' | 'Profissional' | 'Empresarial'>('Profissional');
  const [paidPeriod, setPaidPeriod] = useState<'trimestral' | 'semestral' | 'anual'>('trimestral');
  const [paidPaymentMethod, setPaidPaymentMethod] = useState<'multicaixa' | 'iban'>('multicaixa');
  
  // Paid checkout user info states
  const [paidName, setPaidName] = useState('');
  const [paidCompanyName, setPaidCompanyName] = useState('');
  const [paidEmail, setPaidEmail] = useState('');
  const [paidPassword, setPaidPassword] = useState('');
  const [paidPhone, setPaidPhone] = useState('');
  const [paidNif, setPaidNif] = useState('');
  const [paidAddress, setPaidAddress] = useState('');
  const [paidError, setPaidError] = useState('');
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [hasPaidSimulated, setHasPaidSimulated] = useState(false);
  const [ibanReceiptUploaded, setIbanReceiptUploaded] = useState<string | null>(null);

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
  const [billingPeriod, setBillingPeriod] = useState<'trimestral' | 'semestral' | 'annually'>('annually');

  // FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Video feedback testimonial states
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('');
  const [videoSlideIndex, setVideoSlideIndex] = useState(0);

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

  // Hero section slideshow state and interval
  const heroSlides = [
    {
      url: "https://www.logicerp.com/blog/wp-content/uploads/2025/11/Blog-Banner-72.jpg",
      title: "Gestão Integrada de Faturação",
      desc: "Automação completa do seu fluxo de caixa e emissão simplificada"
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYzh-XkIljrgDk-BEGoFOhWODhEGK-E0emtQ&s",
      title: "Ponto de Venda Inteligente",
      desc: "POS moderno que funciona no seu tablet ou telemóvel, online ou offline"
    },
    {
      url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRePRfmafydGzSTinVHKXvWUUWC4QvzPzPa6A&s",
      title: "Análise em Tempo Real",
      desc: "Acompanhe relatórios detalhados e controle estabelecimentos no mesmo lugar"
    }
  ];

  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Dynamic Plans from Administrator Account
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch(`/api/admin/plans?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDbPlans(data);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar planos dinâmicos:', err);
      }
    };
    fetchPlans();
  }, []);

  const displayPlans = dbPlans.length > 0 
    ? dbPlans.map((plan, idx) => {
        let parsedFeatures: any = {};
        try {
          parsedFeatures = typeof plan.features === 'string' 
            ? JSON.parse(plan.features) 
            : plan.features || {};
        } catch (e) {
          parsedFeatures = {};
        }

        const priceMonthlyStr = Number(plan.price).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const priceAnnuallyNum = plan.price * 0.8;
        const priceAnnuallyStr = priceAnnuallyNum.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const billedAnnuallyTotalStr = (priceAnnuallyNum * 12).toLocaleString('pt-AO', { maximumFractionDigits: 0 });

        const featList: string[] = [
          `Faturação Certificada AGT`,
          `Documentos Ilimitados (FT, FR, Proforma)`,
          `Até ${plan.max_establishments} ${plan.max_establishments === 1 ? 'estabelecimento' : 'estabelecimentos'} ativo(s)`,
          `Até ${plan.max_products} produtos cadastrados`,
          `Exportação de ficheiro SAF-T AO`
        ];

        if (parsedFeatures.reports) {
          featList.push(`Relatórios financeiros & desempenho real`);
        }
        if (parsedFeatures.multi_establishment || plan.max_establishments > 1) {
          featList.push(`Controle central de filiais integradas`);
        }
        if (parsedFeatures.api_access) {
          featList.push(`Acesso completo à nossa API de vendas`);
        }
        if (plan.description) {
          featList.push(`${plan.description}`);
        }

        let badge = "Plano Adicional";
        if (idx === 0) badge = "Básico e Essencial";
        else if (idx === 1) badge = "Recomendado para Retalho";
        else if (idx === 2) badge = "Solução Completa";

        return {
          name: plan.name,
          badge: badge,
          price: Number(plan.price),
          priceAnnually: priceAnnuallyStr,
          priceMonthly: priceMonthlyStr,
          billedAnnuallyTotal: billedAnnuallyTotalStr,
          features: featList,
          popular: idx === 1 || plan.name?.toLowerCase().includes('profissional') || plan.name?.toLowerCase().includes('flex'),
          buttonText: "Começar Agora"
        };
      })
    : pricingPlans;

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

  const getPlanMonthlyPrice = (planName: 'Básico' | 'Profissional' | 'Empresarial') => {
    let basePrice = 7900;
    let profPrice = 15000;
    let empPrice = 19500;

    if (dbPlans && dbPlans.length > 0) {
      const cleanPlanName = (name: string) => {
        return name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
      };

      const basicPlan = dbPlans.find(p => {
        const cn = cleanPlanName(p.name || '');
        return cn === 'basico' || cn === 'base' || cn.includes('basico') || cn.includes('base');
      });
      const proPlan = dbPlans.find(p => {
        const cn = cleanPlanName(p.name || '');
        return cn === 'profissional' || cn === 'flex' || cn.includes('profissional') || cn.includes('flex');
      });
      const entPlan = dbPlans.find(p => {
        const cn = cleanPlanName(p.name || '');
        return cn === 'empresarial' || cn === 'pro' || (cn.includes('pro') && !cn.includes('profissional')) || cn.includes('empresarial');
      });

      if (basicPlan && basicPlan.price !== undefined && basicPlan.price !== null) basePrice = Number(basicPlan.price);
      if (proPlan && proPlan.price !== undefined && proPlan.price !== null) profPrice = Number(proPlan.price);
      if (entPlan && entPlan.price !== undefined && entPlan.price !== null) empPrice = Number(entPlan.price);
    }

    if (planName === 'Básico') return basePrice;
    if (planName === 'Empresarial') return empPrice;
    return profPrice;
  };

  const getPaidPrice = () => {
    const selectedMonthlyPrice = getPlanMonthlyPrice(paidPlan);

    // Calculate total duration (3 months quarterly, 6 months semi-annually, 12 months annually)
    let months = 3;
    if (paidPeriod === 'semestral') {
      months = 6;
    } else if (paidPeriod === 'anual') {
      months = 12;
    }

    const total = selectedMonthlyPrice * months;

    return {
      price: total,
      label: total.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz',
      original: total.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz',
      discount: '0%'
    };
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

  const handlePaidSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPaidError('');
    
    // Validate required fields
    if (!paidName || !paidCompanyName || !paidEmail || !paidPassword) {
      setPaidError('Nome, Empresa, Email e Palavra-passe são obrigatórios.');
      return;
    }
    
    // Check if simulated payment was completed
    if (paidPaymentMethod === 'multicaixa' && !hasPaidSimulated) {
      setPaidError('Por favor, efetue a "Simulação de Pagamento" no formulário para validar a licença.');
      return;
    }

    if (paidPaymentMethod === 'iban' && !ibanReceiptUploaded) {
      setPaidError('Por favor, envie o comprovativo de transferência bancária fictício para aprovação.');
      return;
    }

    setPaidLoading(true);

    try {
      let months = "3";
      if (paidPeriod === "semestral") months = "6";
      if (paidPeriod === "anual") months = "12";

      const res = await fetch('/api/register-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: paidName,
          companyName: paidCompanyName,
          email: paidEmail,
          password: paidPassword,
          phone: paidPhone,
          nif: paidNif,
          address: paidAddress,
          planName: paidPlan,
          months: months,
          paymentMethod: paidPaymentMethod === 'multicaixa' ? 'Reference Multicaixa' : 'Bank Transfer'
        })
      });

      if (res.ok) {
        const user = await res.json();
        setPaidSuccess(true);
        setTimeout(() => {
          setIsPaidModalOpen(false);
          setPaidSuccess(false);
          onLogin(user);
        }, 2200);
      } else {
        const data = await res.json();
        setPaidError(data.error || 'Erro ao efetivar a subscrição da licença paga.');
      }
    } catch (err) {
      setPaidError('Erro de ligação ao servidor do Fatu-R.');
    } finally {
      setPaidLoading(false);
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
              <span className="text-3xl font-black tracking-tight text-slate-900">
                Fatu<span className="text-orange-500">.R</span>
              </span>
              <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black tracking-widest rounded-md uppercase border border-slate-200">
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
            {/* Ajuda Dropdown Trigger com Hover */}
            <div 
              className="relative"
              onMouseEnter={handleHelpMouseEnter}
              onMouseLeave={handleHelpMouseLeave}
            >
              <button 
                className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700 hover:text-slate-900 px-4 py-2 transition-colors focus:outline-none select-none cursor-pointer"
              >
                Ajuda
                <ChevronDown 
                  size={15} 
                  className={`text-slate-500 transition-transform duration-300 ${isHelpDropdownOpen ? 'rotate-180 text-orange-500' : 'rotate-0'}`} 
                />
              </button>
            </div>

            <button 
              onClick={() => {
                setError('');
                setIsLoginModalOpen(true);
              }}
              className="text-[13px] font-bold text-slate-700 hover:text-slate-900 px-4 py-2 transition-colors cursor-pointer"
            >
              Iniciar Sessão
            </button>
            <button 
              onClick={() => {
                setRegError('');
                setIsRegisterModalOpen(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-[13px] px-5 py-2.5 rounded-full transition-all shadow-md shadow-orange-500/10 cursor-pointer"
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

        {/* Mega Menu de Ajuda em Desktop (Largura total com animação de descida) */}
        <AnimatePresence>
          {isHelpDropdownOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block absolute left-0 right-0 top-full bg-white border-b border-slate-200/90 shadow-2xl overflow-hidden z-50 text-slate-700 select-none pb-10 pt-8"
              onMouseEnter={handleHelpMouseEnter}
              onMouseLeave={handleHelpMouseLeave}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-10">
                {/* Coluna 1: Suporte e Sucesso */}
                <div className="md:col-span-4 space-y-5">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Suporte & Sucesso</h5>
                  <div className="space-y-4">
                    {/* Centro de Ajuda */}
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        triggerScroll('faq');
                      }}
                      className="w-full text-left group block focus:outline-none cursor-pointer"
                    >
                      <h4 className="font-bold text-slate-900 group-hover:text-orange-500 text-sm transition-colors flex items-center gap-1.5">
                        Centro de Ajuda
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Dicas, tutoriais e vídeos sobre a utilização do Fatu-R e obrigações fiscais.
                      </p>
                    </button>

                    {/* Contactos */}
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setHelpMessageModal({
                          isOpen: true,
                          title: "Contactos de Suporte",
                          body: "Estamos sempre disponíveis para ajudar o seu negócio a crescer!\n\nEmail: suporte@fatur.ao\nTelefone: +244 923 000 000 (Segunda a Sexta, das 8h às 17h)\nChat Oficial: Disponível diretamente na sua consola de administração Fatu-R."
                        });
                      }}
                      className="w-full text-left group block focus:outline-none cursor-pointer"
                    >
                      <h4 className="font-bold text-slate-900 group-hover:text-orange-500 text-sm transition-colors">
                        Contactos
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Disponíveis através de chat, e-mail e telefone.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Coluna 2: Conectividade e API */}
                <div className="md:col-span-4 space-y-5">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Conectividade & API</h5>
                  <div className="space-y-4">
                    {/* Integrações */}
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        triggerScroll('funcionalidades');
                      }}
                      className="w-full text-left group block focus:outline-none cursor-pointer"
                    >
                      <h4 className="font-bold text-slate-900 group-hover:text-orange-500 text-sm transition-colors">
                        Integrações
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Ligação com outras plataformas, tais como lojas online e entidades de pagamento.
                      </p>
                    </button>

                    {/* API */}
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setHelpMessageModal({
                          isOpen: true,
                          title: "Portal do Programador - Fatu-R API",
                          body: "A API do Fatu-R está disponível para todos os clientes com o plano Profissional ou superior. Permite integrar com lojas online (WooCommerce, Shopify), CRMs e ERPs do seu negócio.\n\nDocumentação técnica completa e sandboxes estão disponíveis em api.fatur.ao. Contacte developers@fatur.ao para solicitar a ativação das credenciais de produção."
                        });
                      }}
                      className="w-full text-left group block focus:outline-none cursor-pointer"
                    >
                      <h4 className="font-bold text-slate-900 group-hover:text-orange-500 text-sm transition-colors">
                        API
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        Integre hoje mesmo a sua aplicação com o Fatu-R. Documentação técnica disponível.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Coluna 3: Links Úteis */}
                <div className="md:col-span-2 space-y-4">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Links Úteis</h5>
                  <div className="flex flex-col gap-3 text-[11px]">
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setHelpMessageModal({
                          isOpen: true,
                          title: "Fatu-R Blog & Recursos",
                          body: "Visite o nosso canal de publicações em blog.fatur.ao para ler artigos sobre:\n\n1. Gestão financeira aplicada para PMEs em Angola.\n2. Como cumprir os regulamentos fiscais da AGT sem complicações.\n3. Estratégias de vendas de sucesso para o retalho e restauração.\n4. Novidades e atualizações sobre faturamento e software POS."
                        });
                      }}
                      className="text-left text-slate-500 hover:text-orange-500 font-bold transition-colors cursor-pointer"
                    >
                      • Blog
                    </button>
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setHelpMessageModal({
                          isOpen: true,
                          title: "Sobre Nós",
                          body: "Fatu-R é uma plataforma líder de faturação eletrónica online certificada em Angola sob o registo Nº 142/AGT. Desenvolvido para simplificar a gestão empresarial moderna com ferramentas poderosas de POS, inventário e fluxos de faturamento em conformidade legal."
                        });
                      }}
                      className="text-left text-slate-500 hover:text-orange-500 font-bold transition-colors cursor-pointer"
                    >
                      • Sobre Nós
                    </button>
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        triggerScroll('testemunhos');
                      }}
                      className="text-left text-slate-500 hover:text-orange-500 font-bold transition-colors cursor-pointer"
                    >
                      • Testemunhos
                    </button>
                    <button 
                      onClick={() => {
                        setIsHelpDropdownOpen(false);
                        setHelpMessageModal({
                          isOpen: true,
                          title: "Recuperar Palavra-passe",
                          body: "Para recuperar a sua palavra-passe de acesso ao Fatu-R, contacte o nosso suporte técnico oficial enviando um e-mail para suporte@fatur.ao com o seu endereço de registo, ou ligue direto para a nossa linha de atendimento +244 923 000 000."
                        });
                      }}
                      className="text-left text-slate-500 hover:text-orange-500 font-bold transition-colors cursor-pointer"
                    >
                      • Recuperar Password
                    </button>
                  </div>
                </div>

                {/* Coluna 4: Aplicações Móveis */}
                <div className="md:col-span-2 space-y-4">
                  <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Aplicações Móveis</h5>
                  <div className="flex flex-col gap-2.5">
                    <a href="#playstore" className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all justify-center">
                      <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M17.5,12L8,6.5V17.5L17.5,12Z" />
                      </svg>
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">Google Play</span>
                    </a>
                    <a href="#appstore" className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl transition-all justify-center">
                      <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.1,16.67C20.08,16.74 19.67,18.11 18.71,19.5M15.97,4.17C16.63,3.37 17.07,2.28 16.95,1C16,1.04 14.9,1.6 14.24,2.38C13.68,3.04 13.19,4.14 13.34,5.39C14.39,5.47 15.4,4.88 15.97,4.17Z" />
                      </svg>
                      <span className="text-[10px] font-bold text-white whitespace-nowrap">Apple Store</span>
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                
                {/* Mobile Ajuda item and panel */}
                <div className="border-t border-slate-100 pt-1.5 mt-0.5">
                  <button 
                    onClick={() => setIsHelpDropdownOpen(!isHelpDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 rounded-lg hover:bg-slate-50 select-none cursor-pointer"
                  >
                    <span>Ajuda</span>
                    <ChevronDown 
                      size={14} 
                      className={`text-slate-500 transition-transform duration-300 ${!isHelpDropdownOpen ? 'rotate-180 text-orange-500' : 'rotate-0'}`} 
                    />
                  </button>
                  <AnimatePresence>
                    {isHelpDropdownOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pl-3 pr-2 py-2 mt-1 bg-slate-50 rounded-xl border border-slate-100/50 space-y-4 text-left overflow-hidden"
                      >
                        {/* Help content links */}
                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsHelpDropdownOpen(false);
                            triggerScroll('faq');
                          }}
                          className="w-full text-left block cursor-pointer"
                        >
                          <h4 className="font-bold text-slate-900 text-[12px]">Centro de Ajuda</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Dicas, tutoriais e vídeos sobre a utilização do Fatu-R e obrigações fiscais.</p>
                        </button>

                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsHelpDropdownOpen(false);
                            setHelpMessageModal({
                              isOpen: true,
                              title: "Contactos de Suporte",
                              body: "Estamos sempre disponíveis para ajudar o seu negócio a crescer!\n\nEmail: suporte@fatur.ao\nTelefone: +244 923 000 000 (Segunda a Sexta, das 8h às 17h)\nChat Oficial: Disponível diretamente na sua consola de administração Fatu-R."
                            });
                          }}
                          className="w-full text-left block cursor-pointer"
                        >
                          <h4 className="font-bold text-slate-900 text-[12px]">Contactos</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Disponíveis através de chat, e-mail e telefone.</p>
                        </button>

                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsHelpDropdownOpen(false);
                            triggerScroll('funcionalidades');
                          }}
                          className="w-full text-left block cursor-pointer"
                        >
                          <h4 className="font-bold text-slate-900 text-[12px]">Integrações</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Ligação com outras plataformas, tais como lojas online e entidades de pagamento.</p>
                        </button>

                        <button 
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsHelpDropdownOpen(false);
                            setHelpMessageModal({
                              isOpen: true,
                              title: "Portal do Programador - Fatu-R API",
                              body: "A API do Fatu-R está disponível para todos os clientes com o plano Profissional ou superior. Permite integrar com lojas online (WooCommerce, Shopify), CRMs e ERPs do seu negócio.\n\nDocumentação técnica completa e sandboxes estão disponíveis em api.fatur.ao. Contacte developers@fatur.ao para solicitar a ativação das credenciais de produção."
                            });
                          }}
                          className="w-full text-left block cursor-pointer"
                        >
                          <h4 className="font-bold text-slate-900 text-[12px]">API</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Integre hoje mesmo a sua aplicação com o Fatu-R. Documentação técnica disponível.</p>
                        </button>

                        {/* Useful Links on Mobile */}
                        <div className="border-t border-slate-200/60 pt-2">
                          <h5 className="text-[9px] uppercase font-bold text-slate-400 mb-1.5">Links Úteis</h5>
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                            <button 
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsHelpDropdownOpen(false);
                                setHelpMessageModal({
                                  isOpen: true,
                                  title: "Fatu-R Blog & Recursos",
                                  body: "Visite o nosso canal de publicações em blog.fatur.ao para ler artigos sobre faturamentos, impostos AGT e negócios."
                                });
                              }}
                              className="text-left py-0.5 hover:text-orange-500 cursor-pointer"
                            >
                              Blog
                            </button>
                            <button 
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsHelpDropdownOpen(false);
                                setHelpMessageModal({
                                  isOpen: true,
                                  title: "Sobre Nós",
                                  body: "Fatu-R é uma plataforma de faturação eletrónica online certificada sob o registo Nº 142/AGT, criada para revolucionar a simplificação operacional angolana."
                                });
                              }}
                              className="text-left py-0.5 hover:text-orange-500 cursor-pointer"
                            >
                              Sobre Nós
                            </button>
                            <button 
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsHelpDropdownOpen(false);
                                triggerScroll('testemunhos');
                              }}
                              className="text-left py-0.5 hover:text-orange-500 cursor-pointer"
                            >
                              Testemunhos
                            </button>
                            <button 
                              onClick={() => {
                                setIsMobileMenuOpen(false);
                                setIsHelpDropdownOpen(false);
                                setHelpMessageModal({
                                  isOpen: true,
                                  title: "Recuperar Palavra-passe",
                                  body: "Fale com o suporte técnico no suporte@fatur.ao ou ligue +244 923 000 000 para receber suporte de reset."
                                });
                              }}
                              className="text-left py-0.5 hover:text-orange-500 cursor-pointer"
                            >
                              Recuperar Password
                            </button>
                          </div>
                        </div>

                        {/* Badges on mobile */}
                        <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Google Play</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Apple Store</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
      <section className="bg-gradient-to-b from-blue-900 to-indigo-950 text-white py-14 md:py-24 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="space-y-6">
                
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  A Faturação do Seu Negócio, <br />
                  <span className="text-orange-400">Descomplicada Ao Máximo.</span>
                </h1>

                <p className="text-slate-200 text-sm sm:text-lg leading-relaxed font-normal max-w-xl">
                  Fature em segundos e controle o seu ponto de venda (POS), armazéns, salários e finanças sem confusões. Tudo sincronizado em tempo real no computador, tablet ou telemóvel.
                </p>

                <div className="flex flex-wrap items-center gap-3.5 pt-4">
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
                  <button 
                    onClick={() => {
                      setPaidError('');
                      setPaidSuccess(false);
                      setHasPaidSimulated(false);
                      setIsPaidModalOpen(true);
                    }}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-7 py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-amber-500/15 border border-amber-400/20"
                  >
                    Pagar Agora
                  </button>
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-5 text-slate-300 text-[11px] font-bold">
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
            </div>

            {/* Right Content */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* Glowing decorative ambient blob */}
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 to-indigo-500 rounded-3xl blur-2xl opacity-20 animate-pulse" style={{ animationDuration: '4s' }} />
                
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 aspect-video md:aspect-[4/3] w-full bg-slate-950 flex flex-col group">
                  <div className="relative flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={heroSlideIndex}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.7, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img 
                          src={heroSlides[heroSlideIndex].url} 
                          alt={heroSlides[heroSlideIndex].title} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Overlay gradient for reading text and elegance */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent pointer-events-none" />
                        
                        {/* Artistic overlay text badge / text */}
                        <div className="absolute bottom-4 left-4 right-4 text-left space-y-1 z-10">
                          <motion.span 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-block px-2.5 py-0.5 bg-orange-500/90 text-[8px] sm:text-[10px] uppercase tracking-widest font-extrabold rounded-md text-white mb-1 shadow"
                          >
                            Destaque Do Sistema
                          </motion.span>
                          <motion.h4 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-base sm:text-lg font-bold text-white tracking-tight leading-none"
                          >
                            {heroSlides[heroSlideIndex].title}
                          </motion.h4>
                          <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-300 text-xs font-medium"
                          >
                            {heroSlides[heroSlideIndex].desc}
                          </motion.p>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Manual Navigation Controls (appear on hover) */}
                    <button
                      onClick={() => setHeroSlideIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 hover:border-orange-500 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setHeroSlideIndex((prev) => (prev + 1) % heroSlides.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-orange-500 hover:border-orange-500 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Indicator Dots at the bottom border */}
                  <div className="py-3 px-4 bg-slate-900/90 border-t border-white/5 flex items-center justify-between z-10 shrink-0">
                    <div className="flex gap-1.5">
                      {heroSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setHeroSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                            idx === heroSlideIndex ? "bg-orange-500 w-6" : "bg-white/20 w-2 hover:bg-white/40"
                          }`}
                          aria-label={`Ir para slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                      {String(heroSlideIndex + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}
                    </span>
                  </div>
                </div>
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
                    icon: <Receipt size={28} />,
                    bg: "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
                    borderColor: "hover:border-orange-500/40",
                    shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(249,115,22,0.18)]",
                    arrowColor: "group-hover:text-orange-600",
                    title: "Faturação Certificada AGT",
                    desc: "Emissão veloz de Faturas (FT), Recibos (FR), Proformas e Notas de Crédito. Total conformidade legal garantida nos termos vigentes.",
                    badge: "Nº 142/AGT",
                    badgeBg: "bg-orange-50 text-orange-600 border-orange-100"
                  },
                  {
                    icon: <BarChart3 size={28} />,
                    bg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
                    borderColor: "hover:border-blue-500/40",
                    shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(59,130,246,0.18)]",
                    arrowColor: "group-hover:text-blue-600",
                    title: "Ponto de Venda POS Rápido",
                    desc: "Interface de vendedor otimizada para ecossistema web e mobile com controle cego de fecho de caixa e atalhos rápidos.",
                    badge: "Ecrã Rápido",
                    badgeBg: "bg-blue-50 text-blue-600 border-blue-100"
                  },
                  {
                    icon: <Building2 size={28} />,
                    bg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
                    borderColor: "hover:border-emerald-500/40",
                    shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(16,185,129,0.18)]",
                    arrowColor: "group-hover:text-emerald-600",
                    title: "Controle Múltiplo de Lojas",
                    desc: "Gerencie múltiplos armazéns ou divisões do seu negócio com fluxo financeiro e stocks perfeitamente apartados.",
                    badge: "Multiloja",
                    badgeBg: "bg-emerald-50 text-emerald-600 border-emerald-100"
                  },
                  {
                    icon: <UserCheck size={28} />,
                    bg: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
                    borderColor: "hover:border-purple-500/40",
                    shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(147,51,234,0.18)]",
                    arrowColor: "group-hover:text-purple-600",
                    title: "Pessoal & Salários",
                    desc: "Gestão integrada de recursos humanos, folha de ponto mensal e processamento de pagamentos automáticos em segundos.",
                    badge: "RH Integrado",
                    badgeBg: "bg-purple-50 text-purple-600 border-purple-100"
                  },
                  {
                    icon: <ShieldCheck size={28} />,
                    bg: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
                    borderColor: "hover:border-cyan-500/40",
                    shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(6,182,212,0.18)]",
                    arrowColor: "group-hover:text-cyan-600",
                    title: "Exportações Seguras SAFT-A",
                    desc: "Crie e transfira os ficheiros de auditoria SAFT-A das suas transações mensais de forma automatizada e sem erros fiscais.",
                    badge: "Portal AGT",
                    badgeBg: "bg-cyan-50 text-cyan-600 border-cyan-100"
                  },
                  {
                    icon: <Sparkles size={28} />,
                    bg: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
                    borderColor: "hover:border-rose-500/40",
                    shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(244,63,94,0.18)]",
                    arrowColor: "group-hover:text-rose-600",
                    title: "Controlo Total na Cloud",
                    desc: "Aceda ao seu painel geral de onde estiver. Compatível com impressoras térmicas convencionais e impressoras standard A4.",
                    badge: "100% Online",
                    badgeBg: "bg-rose-50 text-rose-600 border-rose-100"
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setRegError('');
                      setIsRegisterModalOpen(true);
                    }}
                    className={`w-full shrink-0 bg-white p-8 rounded-2xl border border-slate-200 shadow-md min-h-[340px] flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer ${item.borderColor} ${item.shadowColor}`}
                  >
                    {/* Subtle top-right badge */}
                    <div className="absolute top-5 right-5">
                      <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-0.5 border rounded-full ${item.badgeBg}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        {item.icon}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug">{item.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-normal">{item.desc}</p>
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs font-bold text-slate-700 pt-5 border-t border-slate-100 transition-colors ${item.arrowColor}`}>
                      <span>Testar Recurso agora</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-200 text-orange-500" />
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
                        x: direction === 'right' ? 450 : -450,
                        y: 0,
                        opacity: 0,
                        scale: 0.97
                      }),
                      center: {
                        x: 0,
                        y: 0,
                        opacity: 1,
                        scale: 1
                      },
                      exit: (direction: 'left' | 'right') => ({
                        x: direction === 'right' ? -450 : 450,
                        y: 0,
                        opacity: 0,
                        scale: 0.97
                      })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ 
                      x: { type: "spring", stiffness: 240, damping: 28 },
                      opacity: { duration: 0.18 },
                      scale: { duration: 0.2 }
                    }}
                    className="grid grid-cols-3 gap-6"
                  >
                    {[0, 1, 2].map(offset => {
                      const itemIdx = (featureSlideIndex + offset) % 6;
                      const featuresList = [
                        {
                          icon: <Receipt size={28} />,
                          bg: "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
                          borderColor: "hover:border-orange-500/40",
                          shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(249,115,22,0.18)]",
                          arrowColor: "group-hover:text-orange-600",
                          title: "Faturação Certificada AGT",
                          desc: "Emissão veloz de Faturas (FT), Recibos (FR), Proformas e Notas de Crédito. Total conformidade legal garantida e validada pela AGT.",
                          badge: "Nº 142/AGT",
                          badgeBg: "bg-orange-50 text-orange-600 border-orange-100"
                        },
                        {
                          icon: <BarChart3 size={28} />,
                          bg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
                          borderColor: "hover:border-blue-500/40",
                          shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(59,130,246,0.18)]",
                          arrowColor: "group-hover:text-blue-600",
                          title: "Ponto de Venda POS Rápido",
                          desc: "Interface de vendedor otimizada para ecossistema web e mobile com controle cego de fecho de caixa eletrónico e relatórios dinâmicos.",
                          badge: "Ponto de Venda",
                          badgeBg: "bg-blue-50 text-blue-600 border-blue-100"
                        },
                        {
                          icon: <Building2 size={28} />,
                          bg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
                          borderColor: "hover:border-emerald-500/40",
                          shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(16,185,129,0.18)]",
                          arrowColor: "group-hover:text-emerald-600",
                          title: "Controle Múltiplo de Lojas",
                          desc: "Gerencie múltiplos armazéns ou divisões do seu negócio com fluxo financeiro bem estruturado e faturas perfeitamente controladas.",
                          badge: "Múltiplas Lojas",
                          badgeBg: "bg-emerald-50 text-emerald-600 border-emerald-100"
                        },
                        {
                          icon: <UserCheck size={28} />,
                          bg: "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
                          borderColor: "hover:border-purple-500/40",
                          shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(147,51,234,0.18)]",
                          arrowColor: "group-hover:text-purple-600",
                          title: "Pessoal & Salários",
                          desc: "Gestão integrada de recursos humanos, folha de ponto, subsídios de alimentação e pagamentos automatizados de salários num só clique.",
                          badge: "RH & Salários",
                          badgeBg: "bg-purple-50 text-purple-600 border-purple-100"
                        },
                        {
                          icon: <ShieldCheck size={28} />,
                          bg: "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
                          borderColor: "hover:border-cyan-500/40",
                          shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(6,182,212,0.18)]",
                          arrowColor: "group-hover:text-cyan-600",
                          title: "Exportações Seguras SAFT-A",
                          desc: "Crie e descarregue os ficheiros de auditoria fiscal SAFT-A das suas transações de forma automatizada e em conformidade completa com o portal.",
                          badge: "Obrigatório AGT",
                          badgeBg: "bg-cyan-50 text-cyan-600 border-cyan-100"
                        },
                        {
                          icon: <Sparkles size={28} />,
                          bg: "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
                          borderColor: "hover:border-rose-500/40",
                          shadowColor: "hover:shadow-[0_20px_45px_-12px_rgba(244,63,94,0.18)]",
                          arrowColor: "group-hover:text-rose-600",
                          title: "Controlo Total na Cloud",
                          desc: "Aceda ao seu painel geral de onde estiver. Compatível com telemóvel, tablet e impressoras térmicas standard Bluetooth, Wi-Fi ou A4.",
                          badge: "100% Sincronizado",
                          badgeBg: "bg-rose-50 text-rose-600 border-rose-100"
                        }
                      ];
                      const item = featuresList[itemIdx];
                      return (
                        <div 
                          key={itemIdx}
                          onClick={() => {
                            setRegError('');
                            setIsRegisterModalOpen(true);
                          }}
                          className={`bg-white p-10 rounded-2xl border border-slate-200 shadow-md hover:-translate-y-2 group cursor-pointer duration-300 transition-all flex flex-col justify-between min-h-[350px] relative overflow-hidden ${item.borderColor} ${item.shadowColor}`}
                        >
                          {/* Inner soft backdrop hover aura */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50/20 -z-10" />

                          {/* Top-right decorative badge */}
                          <div className="absolute top-6 right-6 z-10 transition-transform duration-300 group-hover:scale-105">
                            <span className={`text-[9px] font-extrabold tracking-widest uppercase px-3 py-1 border rounded-full ${item.badgeBg} shadow-sm`}>
                              {item.badge}
                            </span>
                          </div>

                          <div className="space-y-5">
                            <div className={`w-14 h-14 rounded-xl ${item.bg} flex items-center justify-center mb-6 shadow-inner transition-all duration-350 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md`}>
                              {item.icon}
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-900 leading-snug tracking-tight">{item.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed font-normal">{item.desc}</p>
                          </div>

                          <div className={`flex items-center gap-2 text-xs font-bold text-slate-700 pt-5 border-t border-slate-100 transition-colors mt-auto ${item.arrowColor}`}>
                            <span>Testar Recurso agora</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1.5 transition-transform duration-200 text-orange-500" />
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
                onClick={() => setBillingPeriod('trimestral')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingPeriod === 'trimestral' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trimestral
              </button>
              <button 
                onClick={() => setBillingPeriod('semestral')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingPeriod === 'semestral' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semestral
              </button>
              <button 
                onClick={() => setBillingPeriod('annually')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingPeriod === 'annually' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anual
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayPlans.map((plan, idx) => {
              const getBaseMonthlyPrice = (p: any) => {
                if (p.price !== undefined && p.price !== null && !isNaN(Number(p.price)) && Number(p.price) > 0) {
                  return Number(p.price);
                }
                const cleanStr = String(p.priceMonthly || '')
                  .replace(/\s/g, '')
                  .replace(/\./g, '')
                  .replace(',', '.');
                const parsed = parseFloat(cleanStr);
                if (!isNaN(parsed) && parsed > 0) {
                  return parsed;
                }
                const nameLower = p.name?.toLowerCase() || '';
                if (nameLower.includes('básico') || nameLower === 'base') return 7900;
                if (nameLower.includes('flex') || nameLower.includes('profissional')) return 15000;
                if (nameLower.includes('pro') || nameLower.includes('empresarial')) return 19500;
                
                return 15000;
              };

              const rawPriceMonthly = getBaseMonthlyPrice(plan);
              const multiplier = billingPeriod === 'annually' ? 12 : billingPeriod === 'semestral' ? 6 : 3;
              const totalCalculated = rawPriceMonthly * multiplier;

              const formattedMonthly = rawPriceMonthly.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
              const formattedTotal = totalCalculated.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
              const periodLabel = billingPeriod === 'annually' ? 'Calculado para Anual (12 Meses)' : billingPeriod === 'semestral' ? 'Calculado para Semestral (6 Meses)' : 'Calculado para Trimestral (3 Meses)';

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

                    <div className="py-2.5 text-left border-y border-slate-100 space-y-3">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Preço por Mês</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-900">{formattedMonthly}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">/mês</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-150">
                        <span className="text-[9px] font-black uppercase tracking-wider text-orange-500 block mb-0.5">{periodLabel}</span>
                        <p className="text-base font-black text-slate-800">
                          {formattedTotal}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
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
                        
                        // Sync current choice with checkout form
                        const nameLower = plan.name?.toLowerCase() || '';
                        if (nameLower.includes('básico') || nameLower === 'base') {
                          setPaidPlan('Básico');
                        } else if (nameLower.includes('pro') || nameLower.includes('empresarial')) {
                          setPaidPlan('Empresarial');
                        } else {
                          setPaidPlan('Profissional');
                        }

                        if (billingPeriod === 'annually') {
                          setPaidPeriod('anual');
                        } else if (billingPeriod === 'semestral') {
                          setPaidPeriod('semestral');
                        } else {
                          setPaidPeriod('trimestral');
                        }

                        setIsRegisterModalOpen(true);
                      }}
                      className={`w-full py-2.5 text-xs font-bold rounded-xl transition-all ${
                        plan.popular 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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

      {/* NEW: O QUE DIZEM OS NOSSOS CLIENTES - TESTEMUNHOS EM VÍDEO CONVERSÃO SLIDER */}
      <section id="videos" className="py-24 bg-slate-50 border-t border-b border-slate-100 scroll-mt-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest bg-orange-50 px-3.5 py-1 rounded-full border border-orange-100">
                Testemunhos Reais
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                O Que Dizem os Nossos Clientes
              </h2>
              <p className="text-sm sm:text-base text-slate-500 font-normal leading-relaxed">
                Assista aos testemunhos em vídeo de empreendedores e profissionais que impulsionaram as suas operações diárias e garantiram total conformidade com a AGT usando o Fatu-R.
              </p>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => {
                  setVideoSlideIndex(prev => (prev === 0 ? 5 : prev - 1));
                }}
                className="w-11 h-11 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                aria-label="Anterior"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => {
                  setVideoSlideIndex(prev => (prev === 5 ? 0 : prev + 1));
                }}
                className="w-11 h-11 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center border border-slate-200 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                aria-label="Seguinte"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Testimonial slider views */}
          {(() => {
            const testimonialVideos = [
              {
                author: "Ricardo Vallis",
                business: "VALLISMUSIC", 
                location: "Luanda",
                tag: "Retalho & Instrumentos",
                quote: "Mudámos todo o faturamento de retalho para o Fatu-R. A facilidade de conciliação de caixa e rapidez na emissão de faturas no ecrã de vendas poupou-nos incontáveis horas mensais.",
                duration: "1:24",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-cashier-scanning-items-at-a-supermarket-checkout-40018-large.mp4",
                thumbnail: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80"
              },
              {
                author: "Ana Luísa Fruly",
                business: "FRULY",
                location: "Benguela",
                tag: "Restauração & Café",
                quote: "O POS funciona num tablet com uma fluidez impressionante. Controlamos e criamos faturas em segundos, com facilidade suprema no checkout diário.",
                duration: "2:05",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-waiter-serving-coffee-to-a-customer-in-a-cafe-42171-large.mp4",
                thumbnail: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"
              },
              {
                author: "Dr. Mateus Cruz",
                business: "CNPP",
                location: "Lubango",
                tag: "Clínicas & Serviços",
                quote: "Emitimos as nossas guias de transporte e geramos o SAFT-A com um simples clique. É fantástico ter essa segurança fiscal garantida pela AGT.",
                duration: "1:48",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-doctor-working-on-a-modern-computer-41584-large.mp4",
                thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80"
              },
              {
                author: "Cláudio Neto",
                business: "Minipreço Express",
                location: "Soyo",
                tag: "Supermercado & Retalho",
                quote: "O controle de caixas duplo e a facilidade de faturar mesmo quando a internet em Luanda ou Soyo oscila é um salva-vidas operacional constante.",
                duration: "1:35",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-smartphone-with-a-loading-screen-41618-large.mp4",
                thumbnail: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
              },
              {
                author: "Elsa Patrício",
                business: "Elsa Boutique",
                location: "Cabinda",
                tag: "Vestuário & E-commerce",
                quote: "Vender roupas online e emitir faturas certificadas pelo WhatsApp nunca foi tão simples. O Fatu-R é extremamente rápido e intuitivo ao extremo.",
                duration: "1:12",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-excited-girl-unpacking-delivery-parcel-at-home-42289-large.mp4",
                thumbnail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80"
              },
              {
                author: "Eng. Pedro Kiluange",
                business: "Kiluange S.A.",
                location: "Huambo",
                tag: "Construção & Obras",
                quote: "Para as faturas de grandes obras e autos de medição, o sistema de Proformas do Fatu-R é completo, profissional e 100% certificado por lei.",
                duration: "2:40",
                videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-mechanic-works-at-a-car-service-station-40019-large.mp4",
                thumbnail: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80"
              }
            ];

            const renderCard = (feedback: typeof testimonialVideos[0], index: number, styleClass: string) => (
              <div 
                key={index}
                className={`${styleClass} bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-350 flex flex-col group hover:-translate-y-1.5 shrink-0`}
              >
                {/* Simulated video thumbnail */}
                <div 
                  className="relative h-48 sm:h-52 md:h-56 bg-slate-900 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setActiveVideoUrl(feedback.videoUrl);
                    setActiveVideoTitle(`${feedback.author} - ${feedback.business}`);
                  }}
                >
                  <img 
                    src={feedback.thumbnail} 
                    alt={feedback.business}
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* Backdrop Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/10 hover:bg-slate-950/20 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-orange-600 transition-all duration-300 relative z-20">
                      <span className="absolute inset-0 rounded-full bg-orange-500/20 w-full h-full animate-ping group-hover:bg-orange-600/20" />
                      <Play size={20} className="ml-1 text-white fill-current animate-pulse" />
                    </div>
                  </div>

                  {/* Video length tag */}
                  <span className="absolute bottom-4 right-4 bg-black/75 px-2 py-0.5 rounded text-[9px] font-black font-mono text-white tracking-widest uppercase z-10">
                    {feedback.duration}
                  </span>

                  {/* Star Rating Overlay */}
                  <div className="absolute bottom-4 left-4 flex gap-0.5 z-10">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={12} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Sub contents */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full w-fit block">
                      {feedback.tag}
                    </span>
                    <p className="text-[12.5px] text-slate-500 italic leading-relaxed font-normal min-h-[56px] line-clamp-3">
                      "{feedback.quote}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{feedback.author}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">{feedback.business} ({feedback.location})</p>
                    </div>
                    <button 
                      onClick={() => {
                        setActiveVideoUrl(feedback.videoUrl);
                        setActiveVideoTitle(`${feedback.author} - ${feedback.business}`);
                      }}
                      className="text-[11px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 group-hover:underline"
                    >
                      Ver Vídeo
                      <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            );

            return (
              <div className="space-y-8">
                {/* 1. Mobile Carousel Panel (1 visible) */}
                <div className="block md:hidden overflow-hidden -mx-4 px-4 py-2">
                  <motion.div 
                    className="flex gap-6"
                    animate={{ x: `calc(-${videoSlideIndex} * 100% - ${videoSlideIndex * 24}px)` }}
                    transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  >
                    {testimonialVideos.map((item, idx) => renderCard(item, idx, "w-full"))}
                  </motion.div>
                </div>

                {/* 2. Tablet Carousel Panel (2 visible) */}
                <div className="hidden md:block lg:hidden overflow-hidden -mx-4 px-4 py-2">
                  <motion.div 
                    className="flex gap-6"
                    animate={{ 
                      x: `calc(-${Math.min(videoSlideIndex, testimonialVideos.length - 2)} * (50% - 12px) - ${Math.min(videoSlideIndex, testimonialVideos.length - 2) * 24}px)` 
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  >
                    {testimonialVideos.map((item, idx) => renderCard(item, idx, "w-[calc(50%-12px)]"))}
                  </motion.div>
                </div>

                {/* 3. Desktop Carousel Panel (3 visible) */}
                <div className="hidden lg:block overflow-hidden -mx-4 px-4 py-2">
                  <motion.div 
                    className="flex gap-6"
                    animate={{ 
                      x: `calc(-${Math.min(videoSlideIndex, testimonialVideos.length - 3)} * (33.333% - 16px) - ${Math.min(videoSlideIndex, testimonialVideos.length - 3) * 24}px)` 
                    }}
                    transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  >
                    {testimonialVideos.map((item, idx) => renderCard(item, idx, "w-[calc(33.333%-16px)]"))}
                  </motion.div>
                </div>

                {/* Dots Navigation Control */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  {testimonialVideos.map((_, idx) => {
                    const isActive = videoSlideIndex === idx;
                    return (
                      <button 
                        key={idx}
                        onClick={() => setVideoSlideIndex(idx)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          isActive 
                            ? 'w-8 bg-orange-500' 
                            : 'w-2.5 bg-slate-300 hover:bg-slate-400'
                        }`}
                        aria-label={`Ir para slide ${idx + 1}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()}

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
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-900 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Main Footer Columns Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            
            {/* Column 1: Porquê o Fatu-R */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Porquê o Fatu-R?</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Loja Online Grátis - Fatu-R Go</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Equipamentos & Hardware</a></li>
                <li><a href="#testemunhos" className="hover:text-orange-500 transition-colors">Testemunhos de Sucesso</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Integrações de API</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Fatu-R Desktop Offline</a></li>
              </ul>
            </div>

            {/* Column 2: Negócios & Setores */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Negócios</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Software de Facturação</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Software POS Comercial</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Software POS Restauração</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Software Loja de Roupa</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Software Café e Gestão</a></li>
                <li><a href="#funcionalidades" className="hover:text-orange-500 transition-colors">Software Construção Civil</a></li>
              </ul>
            </div>

            {/* Column 3: Suporte & Recursos */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Suporte</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><a href="#blog" className="hover:text-orange-500 transition-colors">Blog & Finanças</a></li>
                <li><a href="#faq" className="hover:text-orange-500 transition-colors">Centro de Ajuda</a></li>
                <li><a href="#sobre" className="hover:text-orange-500 transition-colors">Sobre Nós</a></li>
                <li><a href="#api" className="hover:text-orange-500 transition-colors">API para Programadores</a></li>
                <li><a href="#contacto" className="hover:text-orange-500 transition-colors">Contactos e Apoio</a></li>
              </ul>
            </div>

            {/* Column 4: Conta & Legal */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Conta</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={() => setIsLoginModalOpen(true)} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Login / Entrar</button></li>
                <li><button onClick={() => { setRegError(''); setIsRegisterModalOpen(true); }} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Criar Conta Grátis</button></li>
                <li><a href="#termos" className="hover:text-orange-500 transition-colors">Termos e Condições</a></li>
                <li><a href="#privacidade" className="hover:text-orange-500 transition-colors">Política de Privacidade</a></li>
                <li><a href="#dados" className="hover:text-orange-500 transition-colors">Proteção de Dados</a></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Brand Name only */}
            <div className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight text-white">
                Fatu<span className="text-orange-500">.R</span>
              </span>
            </div>

            {/* Center: Social Networks */}
            <div className="flex gap-5 items-center">
              <a href="#facebook" className="text-slate-500 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook size={24} />
              </a>
              <a href="#google" className="text-slate-500 hover:text-white transition-colors flex items-center justify-center font-black text-lg tracking-tighter w-6 h-6 leading-none" aria-label="Google">
                G
              </a>
              <a href="#youtube" className="text-slate-500 hover:text-white transition-colors" aria-label="YouTube">
                <Youtube size={24} />
              </a>
              <a href="#linkedin" className="text-slate-500 hover:text-white transition-colors" aria-label="Linkedin">
                <Linkedin size={24} />
              </a>
              <a href="#instagram" className="text-slate-500 hover:text-white transition-colors" aria-label="Instagram">
                <Instagram size={24} />
              </a>
            </div>

            {/* Right: Store Badges (cleaner, no extra description texts) */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Play Store */}
              <a 
                href="#playstore" 
                className="flex items-center gap-2.5 px-3.5 py-1.5 bg-black border border-slate-800 hover:border-orange-500 hover:bg-slate-900 rounded-xl transition-all"
              >
                <div className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3M17.5,12L8,6.5V17.5L17.5,12Z" />
                  </svg>
                </div>
                <div className="text-left font-sans">
                  <div className="text-xs font-black text-white leading-tight">Google Play</div>
                </div>
              </a>
              {/* App Store */}
              <a 
                href="#appstore" 
                className="flex items-center gap-2.5 px-3.5 py-1.5 bg-black border border-slate-800 hover:border-orange-500 hover:bg-slate-900 rounded-xl transition-all"
              >
                <div className="text-slate-400 hover:text-white">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.1,16.67C20.08,16.74 19.67,18.11 18.71,19.5M15.97,4.17C16.63,3.37 17.07,2.28 16.95,1C16,1.04 14.9,1.6 14.24,2.38C13.68,3.04 13.19,4.14 13.34,5.39C14.39,5.47 15.4,4.88 15.97,4.17Z" />
                  </svg>
                </div>
                <div className="text-left font-sans">
                  <div className="text-xs font-black text-white leading-tight">Apple Store</div>
                </div>
              </a>
            </div>
          </div>

          {/* Bottom Copyright and Legal Notice */}
          <div className="border-t border-slate-900 pt-8 text-center space-y-3">
            <p className="text-slate-500 text-[11px] leading-relaxed">
              © Copyright 2015 - 2026 <span className="font-bold text-slate-400">Fatu-R</span> • Todos os direitos reservados.
            </p>
            <p className="text-[10px] text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Informação ao Consumidor - Tribunais Arbitrais • Certificado sob o registro Nº 142/AGT. De acordo com as leis fiscais em vigor na República de Angola. Desenvolvido sob rigorosos critérios de segurança, desempenho e estabilidade operacional.
            </p>
          </div>

        </div>
      </footer>


      {/* --- LOGIN MODAL (Pristine, Clean, and Easy to Use) --- */}
      <AnimatePresence>
        {helpMessageModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200/95 shadow-2xl max-w-md w-full overflow-hidden text-left"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                  <span>{helpMessageModal.title}</span>
                </div>
                <button 
                  onClick={() => setHelpMessageModal({ ...helpMessageModal, isOpen: false })}
                  className="p-1 px-2.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 text-slate-600 text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                {helpMessageModal.body}
              </div>
              <div className="p-4 border-t border-slate-50 bg-slate-50/50 flex justify-end">
                <button 
                  onClick={() => setHelpMessageModal({ ...helpMessageModal, isOpen: false })}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 font-bold text-white rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

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

        {/* --- BUSINESS DIRECT PAID CHECKOUT MODAL (Pagar Agora) --- */}
        {isPaidModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-left my-8"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
                    <img 
                      src="https://i.ibb.co/Q72rTwRL/ss.png" 
                      alt="Fatu-R Logo" 
                      className="w-10 h-10 object-contain bg-white rounded-lg p-1" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight">Comprar Licença do Fatu-R</h3>
                    <p className="text-[10px] text-slate-300 font-medium">Bypass de teste grátis — Ativação de licença comercial direta</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsPaidModalOpen(false)}
                  className="p-1 px-2.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {paidSuccess ? (
                <div className="p-12 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto animate-bounce border border-emerald-200">
                    <CheckCircle2 size={36} className="fill-current text-white bg-emerald-500 rounded-full" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">Subscrição Ativada com Sucesso!</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Registámos a sua empresa com a licença 100% ativa de forma comercial. O servidor concluiu as configurações básicas de segurança e séries certificadas da AGT.<br />
                    <span className="font-bold text-orange-500 mt-2 block">A iniciar sessão automática...</span>
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePaidSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[85vh]">
                  
                  {paidError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl text-xs font-bold">
                       {paidError}
                    </div>
                  )}

                  {/* STEP 1: PLAN & DURATION */}
                  <div className="space-y-3.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-orange-600 block">1. Defina a Sua Licença</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Básico Card */}
                      <div 
                        onClick={() => setPaidPlan('Básico')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          paidPlan === 'Básico' 
                            ? 'border-orange-500 bg-orange-50/25 shadow-sm ring-1 ring-orange-500/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-800">Base / Básico</span>
                            {paidPlan === 'Básico' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Gestão de Serviços & Facturas em A4</p>
                        </div>
                        <span className="text-xs font-black text-slate-900 mt-3 block">
                          {getPlanMonthlyPrice('Básico').toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                          <span className="text-[10px] font-normal text-slate-400 font-sans">/mês</span>
                        </span>
                      </div>

                      {/* Profissional Card */}
                      <div 
                        onClick={() => setPaidPlan('Profissional')}
                        className={`p-3.5 rounded-xl border cursor-pointer relative overflow-hidden transition-all flex flex-col justify-between ${
                          paidPlan === 'Profissional' 
                            ? 'border-orange-500 bg-orange-50/25 shadow-sm ring-1 ring-orange-500/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl">
                          POPULAR
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-800">Flex / Profissional</span>
                            {paidPlan === 'Profissional' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Ideal para POS Retalho, Stock e Caixa Duplo</p>
                        </div>
                        <span className="text-xs font-black text-slate-900 mt-3 block">
                          {getPlanMonthlyPrice('Profissional').toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                          <span className="text-[10px] font-normal text-slate-400 font-sans">/mês</span>
                        </span>
                      </div>

                      {/* Empresarial Card */}
                      <div 
                        onClick={() => setPaidPlan('Empresarial')}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                          paidPlan === 'Empresarial' 
                            ? 'border-orange-500 bg-orange-50/25 shadow-sm ring-1 ring-orange-500/20' 
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black text-slate-800">Pro / Empresarial</span>
                            {paidPlan === 'Empresarial' && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Disposição avançada de cozinha, mesas & multi-armazém</p>
                        </div>
                        <span className="text-xs font-black text-slate-900 mt-3 block">
                          {getPlanMonthlyPrice('Empresarial').toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                          <span className="text-[10px] font-normal text-slate-400 font-sans">/mês</span>
                        </span>
                      </div>
                    </div>

                    {/* Period selection */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-600">Período de Facturação:</span>
                      <div className="flex bg-white border border-slate-200 p-1 rounded-lg w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setPaidPeriod('trimestral')}
                          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black tracking-wide uppercase transition-all ${
                            paidPeriod === 'trimestral' 
                              ? 'bg-orange-500 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Trimestral (3m)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaidPeriod('semestral')}
                          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black tracking-wide uppercase transition-all flex items-center gap-1 ${
                            paidPeriod === 'semestral' 
                              ? 'bg-orange-500 text-white shadow-sm' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Semestral (6m)
                          <span className="bg-orange-100 text-orange-600 text-[8px] font-black px-1 rounded-sm">-10%</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaidPeriod('anual')}
                          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[11px] font-black tracking-wide uppercase transition-all flex items-center gap-1 ${
                            paidPeriod === 'anual' 
                              ? 'bg-orange-500 text-white shadow-sm' 
                              : 'text-slate-505 hover:text-slate-800'
                          }`}
                        >
                          Anual (12m)
                          <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-1 rounded-sm">-20%</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2: CREDENTIALS & ORGANIZATION */}
                  <div className="space-y-3.5">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-orange-600 block">2. Dados de Acesso e da Empresa</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500">Nome do Administrador *</label>
                        <input 
                          type="text"
                          required
                          value={paidName}
                          onChange={e => setPaidName(e.target.value)}
                          placeholder="Responsável pela Licença"
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500">Nome Oficial da Empresa *</label>
                        <input 
                          type="text"
                          required
                          value={paidCompanyName}
                          onChange={e => setPaidCompanyName(e.target.value)}
                          placeholder="Nome Comercial ou NIF social"
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500">Email de Acesso *</label>
                        <input 
                          type="email"
                          required
                          value={paidEmail}
                          onChange={e => setPaidEmail(e.target.value)}
                          placeholder="email@empresa.com"
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500">Defina Uma Palavra-Passe *</label>
                        <input 
                          type="password"
                          required
                          value={paidPassword}
                          onChange={e => setPaidPassword(e.target.value)}
                          placeholder="Mínimo de 6 algarismos"
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500">NIF de Angola</label>
                        <input 
                          type="text"
                          value={paidNif}
                          onChange={e => setPaidNif(e.target.value)}
                          placeholder="Ex: 541094852"
                          className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-slate-500">Contacto Telefónico</label>
                        <input 
                          type="text"
                          value={paidPhone}
                          onChange={e => setPaidPhone(e.target.value)}
                          placeholder="Ex: 923 000 000"
                          className="w-full bg-slate-50 border border-slate-205 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500">Endereço Sede</label>
                      <input 
                        type="text"
                        value={paidAddress}
                        onChange={e => setPaidAddress(e.target.value)}
                        placeholder="Ex: Luanda, Talatona, via AL-14"
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-orange-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* STEP 3: BILLING DETAILS & INTERACTIVE SIMULATOR */}
                  <div className="p-4 bg-orange-50/20 border border-orange-100 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-orange-100/50 pb-3 gap-2">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-orange-600 block">3. Detalhes de Pagamento do Fatu-R</span>
                        <h4 className="text-xs font-black text-slate-800 font-sans">
                          Total a pagar para o período {paidPeriod}:
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 line-through text-[10px] font-semibold">{getPaidPrice().original}</span>
                          <span className="text-[9px] font-black text-emerald-650 text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">Desconto {getPaidPrice().discount}</span>
                        </div>
                        <p className="text-sm font-black text-orange-600 leading-tight mt-0.5">{getPaidPrice().label}</p>
                      </div>
                    </div>

                    {/* Selector of payment methods */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaidPaymentMethod('multicaixa');
                          setPaidError('');
                        }}
                        className={`py-2 px-3 border rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          paidPaymentMethod === 'multicaixa' 
                            ? 'border-orange-500 bg-orange-500/10 text-orange-600 ring-2 ring-orange-100/10' 
                            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-400 flex items-center justify-center shrink-0">
                          {paidPaymentMethod === 'multicaixa' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        Referência Multicaixa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaidPaymentMethod('iban');
                          setPaidError('');
                        }}
                        className={`py-2 px-3 border rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          paidPaymentMethod === 'iban' 
                            ? 'border-orange-500 bg-orange-500/10 text-orange-600 ring-2 ring-orange-100/10' 
                            : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-400 flex items-center justify-center shrink-0">
                          {paidPaymentMethod === 'iban' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        Transferência / IBAN
                      </button>
                    </div>

                    {/* Dynamic payment info box with simulator */}
                    {paidPaymentMethod === 'multicaixa' ? (
                      <div className="bg-white border text-xs border-slate-200 rounded-xl p-3.5 space-y-3">
                        <div className="flex border-b border-dashed pb-2 items-center justify-between">
                          <span className="font-extrabold text-[10px] text-slate-400 uppercase">Referência de Pagamento Multicaixa</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">Entidade Registada</span>
                        </div>
                        <div className="space-y-1.5 font-mono">
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-400 font-bold text-[10px]">Entidade:</span>
                            <span className="font-black text-slate-900 tracking-wider">21021</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-400 font-bold text-[10px]">Referência:</span>
                            <span className="font-black text-slate-900 tracking-widest text-xs">981 741 028</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-400 font-bold text-[10px]">Valor Total:</span>
                            <span className="font-black text-orange-600">{getPaidPrice().label}</span>
                          </div>
                        </div>

                        {/* Interactive Multicaixa simulator */}
                        <div className="pt-2 bg-gradient-to-r from-slate-50 to-orange-50/50 p-3 rounded-lg border border-orange-100/70 text-center">
                          {hasPaidSimulated ? (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-xs">
                              <Check size={16} className="bg-emerald-500 text-white rounded-full p-0.5" />
                              PAGAMENTO SIMULADO E APROVADO!
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed font-sans">
                                Clique abaixo para simular que pagou esta licença no banco ou caixa automático multicaixa.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setHasPaidSimulated(true);
                                  setPaidError('');
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-2 rounded-lg transition-all shadow-sm"
                              >
                                💳 Simular Pagamento Multicaixa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border text-xs border-slate-200 rounded-xl p-3.5 space-y-3">
                        <div className="flex border-b border-dashed pb-2 items-center justify-between">
                          <span className="font-extrabold text-[10px] text-slate-400 uppercase">Transferência Bancária Directa</span>
                          <span className="text-[10px] bg-sky-50 text-sky-600 font-bold px-2 py-0.5 rounded border border-sky-100 uppercase">BAI / BFA</span>
                        </div>
                        <p className="text-[10px] text-slate-550 text-slate-500 font-normal leading-relaxed font-sans">
                          Efetue a transferência para o seguinte IBAN oficial do Fatu-R e insira o comprovativo fictício abaixo para confirmar a ativação imediata.
                        </p>
                        <div className="space-y-1.5 font-mono text-[10.5px]">
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-400 font-bold text-[10px]">Banco:</span>
                            <span className="font-black text-slate-900">Banco BAI</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-400 font-bold text-[10px]">IBAN BAI Angola:</span>
                            <span className="font-bold text-slate-900 tracking-tight">AO06 0040 0000 9876 5432 1018 9</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                            <span className="text-slate-400 font-bold text-[10px]">Titular:</span>
                            <span className="font-bold text-slate-900">Fatu-R Faturação Lda</span>
                          </div>
                        </div>

                        {/* Interactive receipt uploader */}
                        <div 
                          onClick={() => {
                            setIbanReceiptUploaded("comprovativo_transferencia_aula_paid.png");
                            setPaidError('');
                          }}
                          className={`mt-2 border-2 border-dashed ${
                            ibanReceiptUploaded ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                          } p-3 rounded-lg text-center cursor-pointer transition-all`}
                        >
                          {ibanReceiptUploaded ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle2 size={20} className="text-emerald-500 fill-current text-white bg-emerald-500 rounded-full" />
                              <span className="text-[10px] font-black text-emerald-700 font-sans">Comprovativo Simulado Carregado!</span>
                              <span className="text-[8px] text-slate-450 font-mono">comprovativo_fatur_v1.pdf (342KB)</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-slate-505">
                              <FileText size={20} className="text-slate-400" />
                              <span className="text-[10px] font-extrabold uppercase font-sans text-slate-700">Anexar Comprovativo Simulado</span>
                              <span className="text-[8.5px] text-slate-400 font-normal font-sans">Arraste ou clique para carregar o recibo simulado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission and licensing buttons */}
                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={paidLoading}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-2"
                    >
                      {paidLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          A processar subscrição comercial...
                        </>
                      ) : (
                        `Activar Plano ${paidPlan} - Adquirir Licença`
                      )}
                    </button>
                    <p className="text-center text-[9px] text-slate-400 font-bold mt-2.5 font-sans">
                      🔒 Transações simuladas com faturamento certificado AGT ao abrigo da lei do sistema de Luanda, Angola.
                    </p>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* Dynamic Video Lightbox Modal */}
        {activeVideoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={() => {
              setActiveVideoUrl(null);
              setActiveVideoTitle('');
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl max-w-4xl w-full overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div>
                  <span className="text-[9px] font-black uppercase text-orange-500 tracking-widest">
                    Testemunho de Cliente em Vídeo
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                    {activeVideoTitle}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setActiveVideoUrl(null);
                    setActiveVideoTitle('');
                  }}
                  className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="aspect-video bg-black relative flex items-center justify-center">
                <video 
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  playsInline
                />
              </div>

              <div className="p-4 sm:p-6 bg-slate-950/40 text-[11px] text-slate-400 text-center font-medium">
                Este é um testemunho real de sucesso relatando a experiência operacional de transição digital no Fatu-R.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suporte Chat Flutuante Estático */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isChatBoxOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-[335px] sm:w-[370px] h-[450px] bg-white border border-slate-100 shadow-2xl rounded-2xl flex flex-col overflow-hidden mb-4 mr-1 text-slate-700"
            >
              {/* Cabeçalho do Chat */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 p-4 flex items-center justify-between text-white border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-xs font-black text-white shadow-md border border-white/20">
                      FR
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full animate-pulse" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black tracking-tight leading-none text-white">Suporte Fatu-R</h4>
                    <span className="text-[10px] text-slate-400 font-medium">Online • Respostas rápidas</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatBoxOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Área de Mensagens */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 space-y-4 text-left">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`p-3 text-[12px] leading-relaxed max-w-[85%] shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-orange-500 text-white rounded-2xl rounded-tr-none' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                      {msg.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input de Envio */}
              <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Escreva a sua mensagem..."
                  className="flex-1 text-[12px] border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500 text-slate-700 bg-slate-50/30 focus:bg-white transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 text-white rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-md shadow-orange-500/10"
                >
                  <Send size={14} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botão Flutuante */}
        <button
          onClick={() => setIsChatBoxOpen(!isChatBoxOpen)}
          className={`relative p-4 rounded-full text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none flex items-center justify-center ${
            isChatBoxOpen 
              ? 'bg-slate-900 rotate-90 border border-slate-800' 
              : 'bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 shadow-orange-500/20'
          }`}
          title="Fale Connosco"
        >
          {isChatBoxOpen ? (
            <X size={22} className="text-white" />
          ) : (
            <>
              <MessageSquare size={22} className="text-white" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border border-white flex items-center justify-center text-[8px] font-black text-white">1</span>
              </span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
