import React, { useState, FormEvent } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { User } from '../types';
import { FloatingBubbles } from './FloatingBubbles';

interface LoginPageProps {
  onBack: () => void;
  onLogin: (user: User) => void;
  onGoToRegister: () => void;
  onGoToCheckout: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBack,
  onLogin,
  onGoToRegister,
  onGoToCheckout
}) => {
  const [identifier, setIdentifier] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('remembered_email') || '';
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('Por favor, introduza o e-mail e a palavra-passe.');
      return;
    }

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
        if (rememberMe) {
          localStorage.setItem('remembered_email', identifier);
        } else {
          localStorage.removeItem('remembered_email');
        }
        onLogin(user);
      } else {
        const data = await res.json();
        setError(data.error || 'Credenciais inválidas. Verifique os dados introduzidos.');
      }
    } catch (err) {
      setError('Erro ao estabelecer ligação com o servidor do Fatu-R. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Dominant Orange (60%) warm radiant background, White (30%) central card & surfaces, Black (10%) high-contrast letters and numbers
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex flex-col justify-between selection:bg-black selection:text-white relative overflow-hidden">
      
      {/* Animated Floating Bubbles in White and Dark Blue on the lateral areas */}
      <FloatingBubbles />

      {/* Decorative ambient subtle light rings for a clean, non-dark, luminous atmosphere */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-black text-black bg-white/90 hover:bg-white px-4 py-2 rounded-full shadow-md shadow-orange-950/10 border border-white/50 transition-all cursor-pointer"
          >
            <ArrowLeft size={15} className="text-black" />
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

          <button
            onClick={onGoToRegister}
            className="hidden sm:flex items-center gap-1.5 text-xs font-black text-black bg-white/90 hover:bg-white px-4 py-2 rounded-full shadow-md shadow-orange-950/10 border border-white/50 transition-all cursor-pointer"
          >
            <span>Criar Conta</span>
            <ArrowRight size={13} className="text-orange-600" />
          </button>
        </div>
      </header>

      {/* Main Center Stage: Single Centered Window */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          
          {/* Centered Login Card - Pure White 30%, Black 10% Typography */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-orange-950/20 border border-orange-200/80 p-7 sm:p-9 text-left">
            
            {/* Card Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 mb-3.5">
                <Lock size={26} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                Iniciar Sessão
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-1.5">
                Aceda com o seu e-mail e palavra-passe
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs font-bold">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* E-mail Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-black block tracking-wide">
                  Endereço de E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    required
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="seu.email@empresa.ao"
                    className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 placeholder:font-normal outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-black block tracking-wide">
                    Palavra-Passe
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-600 hover:text-black flex items-center gap-1 font-bold cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={17} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-200 pl-10 pr-10 py-3 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                  />
                  <span>Lembrar credenciais</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    alert('Para recuperar a sua palavra-passe, contacte o suporte oficial Fatu-R ou use o e-mail de recuperação associado à sua conta.');
                  }}
                  className="text-orange-600 hover:text-orange-700 font-bold transition-colors cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-sm py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>A verificar credenciais...</span>
                  </>
                ) : (
                  <span>Entrar no Sistema</span>
                )}
              </button>
            </form>

            {/* Options below login: Criar conta Grátis and Comprar Licença Comercial */}
            <div className="mt-7 pt-6 border-t border-slate-100 space-y-2.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block text-center">
                Outras Opções
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Criar Conta Grátis */}
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="w-full py-3 px-3 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200/90 text-orange-700 hover:text-orange-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <Sparkles size={14} className="text-orange-600 shrink-0" />
                  <span className="truncate">Criar Conta Grátis</span>
                </button>

                {/* Option 2: Comprar Licença Comercial */}
                <button
                  type="button"
                  onClick={onGoToCheckout}
                  className="w-full py-3 px-3 bg-black hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-black/10 active:scale-[0.99]"
                >
                  <ShoppingBag size={14} className="text-amber-400 shrink-0" />
                  <span className="truncate">Comprar Licença</span>
                </button>
              </div>
            </div>

          </div>

          {/* Quick Sub-caption */}
          <div className="text-center mt-4">
            <p className="text-xs font-bold text-black/80">
              Precisa de ajuda imediata? Ligue para o suporte <span className="underline">+244 949 923 203</span>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs font-bold text-black/80">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Fatu-R — Sistema de Facturação Certificado AGT</span>
          <span>Luanda, Angola</span>
        </div>
      </footer>

    </div>
  );
};
