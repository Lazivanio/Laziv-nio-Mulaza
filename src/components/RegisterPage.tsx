import React, { useState, FormEvent } from 'react';
import { 
  Building2, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Phone, 
  FileText, 
  MapPin, 
  AlertCircle, 
  Sparkles,
  ArrowRight,
  Receipt,
  Layers
} from 'lucide-react';
import { User } from '../types';
import { FloatingBubbles } from './FloatingBubbles';

interface RegisterPageProps {
  onBack: () => void;
  onLogin: (user: User) => void;
  onGoToLogin: () => void;
  onGoToCheckout: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onBack,
  onLogin,
  onGoToLogin,
  onGoToCheckout
}) => {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nif, setNif] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('Deve aceitar os Termos de Serviço e a Política de Privacidade.');
      return;
    }

    if (!name || !companyName || !email || !password || !nif || !phone || !address) {
      setError('Por favor, preencha todos os campos obrigatórios do formulário.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          companyName,
          email,
          password,
          phone,
          nif,
          address
        })
      });

      if (res.ok) {
        const user = await res.json();
        setRegisteredUser(user);
        setSuccess(true);
        // Automatic redirection to the respective account
        setTimeout(() => {
          onLogin(user);
        }, 1800);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao efetuar o registo da empresa. Verifique se o e-mail ou NIF já existem.');
      }
    } catch (err) {
      setError('Erro de ligação ao servidor. Verifique a sua ligação e tente novamente.');
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

      {/* Top Header Bar */}
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
              onClick={onGoToCheckout}
              className="hidden md:flex items-center gap-1.5 text-xs font-black text-black bg-white/90 hover:bg-white px-4 py-2 rounded-full shadow-md shadow-orange-950/10 border border-white/50 transition-all cursor-pointer"
            >
              <span>Comprar Licença</span>
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

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {success ? (
          <div className="max-w-xl mx-auto my-8 bg-white border border-orange-200/90 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-orange-950/20 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 size={42} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-black">Empresa Registada com Sucesso!</h2>
              <p className="text-sm font-semibold text-slate-700">
                Parabéns, <strong className="text-black font-black">{companyName}</strong>! O seu teste gratuito de 30 dias foi ativado.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">Responsável:</span>
                <span className="text-black font-black">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">E-mail de Acesso:</span>
                <span className="text-black font-mono font-bold">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-bold">Série AGT Emitida:</span>
                <span className="text-emerald-700 font-mono font-black">EST-PRINCIPAL / 2026</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-black text-orange-600 pt-2">
              <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-600 rounded-full animate-spin" />
              <span>A redirecionar para a sua conta e painel de gestão...</span>
            </div>
            {registeredUser && (
              <button
                type="button"
                onClick={() => onLogin(registeredUser)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-3.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                Entrar Imediatamente no Painel
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Benefits & Value proposition */}
            <div className="lg:col-span-5 space-y-5 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-white shadow-md shadow-orange-950/10 text-black text-xs font-black">
                <Sparkles size={15} className="text-orange-600" />
                <span>30 Dias de Teste Grátis • Sem Fidelização</span>
              </div>

              <div className="space-y-2.5">
                <h1 className="text-3xl xl:text-4xl font-black text-black tracking-tight leading-tight">
                  Comece a faturar com certificação AGT hoje mesmo.
                </h1>
                <p className="text-sm font-semibold text-black/80 leading-relaxed">
                  Crie a conta da sua empresa em 2 minutos. Terá acesso completo a emissão de faturas, controlo de caixa POS, relatórios fiscais e gestão de inventário.
                </p>
              </div>

              {/* Inclusions cards */}
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-orange-200/80 shadow-md shadow-orange-950/5">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black">Facturação Homologada pela AGT</h4>
                    <p className="text-[11px] font-medium text-slate-700 mt-0.5">
                      Emissão de Faturas Recibo (FR), Faturas (FT) e Notas de Crédito (NC) com QR Code oficial e SAF-T AO.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-orange-200/80 shadow-md shadow-orange-950/5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black">Ponto de Venda (POS) & Caixa</h4>
                    <p className="text-[11px] font-medium text-slate-700 mt-0.5">
                      Controlo de gaveta, turnos de operadores, histórico de trocos e vendas ultra-rápidas por código de barras.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-orange-200/80 shadow-md shadow-orange-950/5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-black">Segurança Criptográfica & Backup</h4>
                    <p className="text-[11px] font-medium text-slate-700 mt-0.5">
                      Chaves criptográficas assimétricas geradas especificamente para a sua empresa, protegendo toda a contabilidade.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Purchase Switch */}
              <div className="p-4 rounded-2xl bg-white border-2 border-black shadow-lg shadow-orange-950/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-black block">Quer uma licença comercial definitiva?</span>
                    <span className="text-[11px] font-medium text-slate-600">Active o seu plano comercial direto sem período experimental.</span>
                  </div>
                  <button
                    type="button"
                    onClick={onGoToCheckout}
                    className="text-xs font-black text-white bg-black hover:bg-slate-900 px-4 py-2 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition-all self-start sm:self-auto"
                  >
                    <span>Pagar Agora</span>
                    <ArrowRight size={13} className="text-amber-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Form Card */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl shadow-2xl shadow-orange-950/20 border border-orange-200/90 p-6 sm:p-9 text-left relative overflow-hidden">
                
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center mb-3.5 shadow-md shadow-orange-500/25">
                    <Building2 size={24} strokeWidth={2.2} />
                  </div>
                  <h2 className="text-2xl font-black text-black tracking-tight">Criar Conta Grátis</h2>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    Preencha os dados abaixo para configurar o espaço da sua empresa e a sua série de faturação.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs font-bold">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Row 1: Responsável & Empresa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">
                        Nome do Administrador / Titular *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <UserIcon size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder="Ex: Manuel dos Santos"
                          className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">
                        Nome Oficial da Empresa *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Building2 size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          placeholder="Ex: Luanda Comercial Lda"
                          className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Email & Palavra-passe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">
                        Endereço de E-mail (Acesso) *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail size={16} />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="admin@empresa.ao"
                          className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">
                        Palavra-Passe *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock size={16} />
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Defina uma senha forte"
                          className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 3: NIF & Telefone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">
                        NIF de Angola *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <FileText size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          value={nif}
                          onChange={e => setNif(e.target.value)}
                          placeholder="Ex: 500092841"
                          className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-black block">
                        Contacto Telefónico *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={16} />
                        </div>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Ex: 923 000 000"
                          className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Endereço Físico */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-black block">
                      Endereço da Empresa (Sede / Loja) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <MapPin size={16} />
                      </div>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Ex: Via Principal de Talatona, Luanda, Angola"
                        className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-2 border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      />
                      <span>
                        Declaro que as informações acima são verídicas e aceito os Termos de Serviço e Política de Tratamento de Dados do Fatu-R.
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/25 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>A registar empresa e a gerar chaves digitais...</span>
                        </>
                      ) : (
                        <span>Criar Minha Conta Grátis & Aceder (30 Dias)</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Bottom Switch */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs font-semibold text-slate-600">
                  Já possui uma conta registada?{' '}
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="text-orange-600 hover:text-orange-700 font-black transition-colors cursor-pointer ml-1"
                  >
                    Iniciar Sessão Aqui
                  </button>
                </div>

              </div>
            </div>

          </div>
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
