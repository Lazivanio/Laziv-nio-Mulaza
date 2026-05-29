import React from 'react';
import { 
  ArrowLeft, Monitor, Shield, Database, Cpu, WifiOff, RefreshCw, Layers
} from 'lucide-react';

interface DesktopOfflineSubpageProps {
  onBack: () => void;
  onRegister?: () => void;
}

export const DesktopOfflineSubpage: React.FC<DesktopOfflineSubpageProps> = ({ onBack, onRegister }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-wider group focus:outline-none"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
          
          <div className="flex items-center gap-1">
            <span className="text-xl font-black tracking-tight text-white">
              Fatu<span className="text-orange-500">-R</span>
            </span>
            <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase">
              Desktop
            </span>
          </div>

          <div className="w-16"></div> {/* Spacer to keep center alignment visually balanced */}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative py-24 sm:py-32 overflow-hidden flex-1 flex flex-col justify-center">
        {/* Decorative ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10 relative z-10">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[11px] font-black tracking-widest text-orange-400 uppercase">
              EM DESENVOLVIMENTO!
            </span>
          </div>

          {/* Title Headers */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Fatu-R <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">Desktop Offline</span>
            </h1>
            <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-400 leading-relaxed font-light">
              A nossa equipa de engenharia está a desenhar a solução de faturamento definitiva para ambientes de alta resiliência offline, com sincronização LAN automática e banco de dados local robusto.
            </p>
          </div>

          {/* Desktop Application Frame Mockup */}
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl relative">
            <div className="absolute top-4 left-4 flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            
            <div className="space-y-6 pt-4">
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl relative group">
                  <Monitor size={48} className="text-orange-500 animate-pulse" />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-orange-500 text-white rounded-full">
                    <RefreshCw size={12} className="animate-spin" />
                  </div>
                </div>
                <div className="space-y-1.5 text-center">
                  <p className="text-sm font-black text-white tracking-wide">Fatu-R POS v2.0 - Standalone App</p>
                  <p className="text-[11px] text-slate-500 font-mono">Status: Compilando recursos e integrando motor AGT</p>
                </div>
              </div>

              {/* Progress bar simulation */}
              <div className="space-y-2 max-w-xs mx-auto">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                  <span>Pronto para Teste Interno</span>
                  <span className="text-orange-400">82%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-full w-[82%] rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Grid features teaser */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-6">
            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl text-left space-y-2">
              <div className="p-2 bg-slate-950/80 border border-slate-850 w-fit rounded-lg">
                <WifiOff size={16} className="text-orange-500" />
              </div>
              <p className="text-xs font-bold text-white">100% Offline</p>
              <p className="text-[10px] text-slate-500 leading-normal">Fature sem depender de qualquer sinal de internet.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl text-left space-y-2">
              <div className="p-2 bg-slate-950/80 border border-slate-850 w-fit rounded-lg">
                <Database size={16} className="text-orange-500" />
              </div>
              <p className="text-xs font-bold text-white">Motor SQLite</p>
              <p className="text-[10px] text-slate-500 leading-normal">Segurança local impenetrável e desempenho ultrarrápido.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl text-left space-y-2">
              <div className="p-2 bg-slate-950/80 border border-slate-850 w-fit rounded-lg">
                <Shield size={16} className="text-orange-500" />
              </div>
              <p className="text-xs font-bold text-white">Assinatura Certificada</p>
              <p className="text-[10px] text-slate-500 leading-normal">Chaves da AGT emitidas localmente em milissegundos.</p>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-xl text-left space-y-2">
              <div className="p-2 bg-slate-950/80 border border-slate-850 w-fit rounded-lg">
                <Layers size={16} className="text-orange-500" />
              </div>
              <p className="text-xs font-bold text-white">Sincronização LAN</p>
              <p className="text-[10px] text-slate-500 leading-normal">Vários computadores integrados na mesma rede local.</p>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-900 px-4 sm:px-6 lg:px-8 text-xs mt-16">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Main Footer Columns Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            
            {/* Column 1: Porquê o Fatu-R */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Porquê o Fatu-R?</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Loja Online Grátis - Fatu-R Go</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Testemunhos de Sucesso</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Fatu-R Desktop Offline</button></li>
              </ul>
            </div>

            {/* Column 2: Negócios & Setores */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Negócios</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Software de Facturação</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Software POS Comercial</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Software Loja de Roupa</button></li>
              </ul>
            </div>

            {/* Column 3: Suporte & Recursos */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Suporte</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Blog & Recursos</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Centro de Ajuda</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Sobre Nós</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">API para Programadores</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Contactos e Apoio</button></li>
              </ul>
            </div>

            {/* Column 4: Conta & Legal */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Conta</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                {onRegister && (
                  <>
                    <li><button onClick={onRegister} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Login / Entrar</button></li>
                    <li><button onClick={onRegister} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Criar Conta Grátis</button></li>
                  </>
                )}
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Termos e Condições</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Política de Privacidade</button></li>
                <li><button onClick={onBack} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Proteção de Dados</button></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Brand Name */}
            <div className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight text-white">
                Fatu<span className="text-orange-500">-R</span>
              </span>
            </div>

            {/* Right: Copyright */}
            <p className="text-[10px] text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Fatu-R. Todos os direitos reservados. Software de Faturação certificado nº 142/AGT.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
