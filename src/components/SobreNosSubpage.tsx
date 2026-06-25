import React, { useState } from 'react';
import { 
  ArrowLeft, Users, FileText, Globe, Award, 
  Send, Sparkles, History, Check, Shield, Star
} from 'lucide-react';

interface SobreNosSubpageProps {
  onBack: (section?: string) => void;
  onRegister?: () => void;
}

export const SobreNosSubpage: React.FC<SobreNosSubpageProps> = ({ 
  onBack, 
  onRegister 
}) => {
  const [showSpontaneousModal, setShowSpontaneousModal] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateRole, setCandidateRole] = useState('');
  const [candidateMessage, setCandidateMessage] = useState('');
  const [isCandidateSubmitted, setIsCandidateSubmitted] = useState(false);

  const handleCandidatureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCandidateSubmitted(true);
    setTimeout(() => {
      setIsCandidateSubmitted(false);
      setShowSpontaneousModal(false);
      setCandidateName('');
      setCandidateEmail('');
      setCandidateRole('');
      setCandidateMessage('');
      alert('Candidatura enviada com sucesso! Agradecemos o seu interesse em fazer parte da equipa Fatu-R.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => onBack()}
            className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-wider group focus:outline-none cursor-pointer"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
          
          <div className="flex items-center gap-1">
            <span className="text-xl font-black tracking-tight text-white">
              Fatu<span className="text-orange-500">-R</span>
            </span>
            <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
              Sobre Nós
            </span>
          </div>

          <button
            onClick={onRegister}
            className="bg-orange-500 hover:bg-orange-600 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer"
          >
            Começar Grátis
          </button>
        </div>
      </header>

      {/* CORE CONTENT */}
      <main className="flex-grow py-12 md:py-20 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-10 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 relative z-10">
          
          {/* HERO SECTION */}
          <section className="text-center space-y-6 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={10} /> Nossa Missão
            </span>
            <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Garantir uma experiência simples, prática e intuitiva é a nossa missão!
            </h1>
            <p className="text-sm sm:text-lg text-slate-400 leading-relaxed font-light">
              Desenhamos o futuro da faturação em Angola com tecnologia robusta totalmente online e centrada no utilizador.
            </p>

            {/* Simulated mock design with multi-device styling */}
            <div className="pt-8 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/15 to-amber-500/10 rounded-2xl blur-xl transition duration-1000 group-hover:duration-200" />
              <div className="relative bg-slate-900/40 border border-slate-900 rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-left space-y-4 max-w-lg">
                  <div className="flex items-center gap-1.5 text-xs text-orange-400 font-bold uppercase tracking-widest">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Multi-Dispositivo
                  </div>
                  <h3 className="text-lg sm:text-2xl font-black text-white">Pessoas a utilizarem o Fatu-R em diferentes dispositivos.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Seja no computador de escritório, no tablet em movimento ou no telemóvel no ponto de venda, a experiência mantém-se fluida e integrada. Conectividade absoluta onde e quando o seu negócio precisar.
                  </p>
                </div>
                {/* Visual interface simulation */}
                <div className="flex gap-3 items-end">
                  {/* Web display icon */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-2 w-28 text-slate-400 hover:text-orange-400 transition-colors">
                    <History size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Web App</span>
                  </div>
                  {/* Tablet/POS display icon */}
                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-2xl flex flex-col items-center gap-2 w-32 text-orange-400 ring-1 ring-orange-500/20">
                    <Users size={28} />
                    <span className="text-[10px] font-black uppercase tracking-wider font-mono text-white">POS Terminal</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HISTÓRIA SECTION */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
            <div className="md:col-span-4 space-y-4">
              <div className="text-orange-500 font-mono text-xs font-black uppercase tracking-widest">A NOSSA ESSÊNCIA</div>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                Fatu<span className="text-orange-500">-R</span>
              </h2>
              <div className="h-1 w-20 bg-orange-500 rounded" />
            </div>

            <div className="md:col-span-8 bg-slate-900/35 border border-slate-900/60 p-6 sm:p-8 rounded-2xl space-y-6 text-sm font-light leading-relaxed text-slate-300">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <History size={18} className="text-orange-400" /> A Nossa História
              </h3>
              <p>
                O Fatu-R nasceu em 2015 com o propósito de colmatar o espaço entre as aplicações tradicionais de faturação. Orientado para funcionar exclusivamente online, o Fatu-R é fruto do know-how e experiência da nossa equipa, que construiu um projeto diferenciador.
              </p>
              <p>
                A nossa missão é fornecer aos nossos clientes um software simples, seguro e acessível, que não exige formação e que pode ser usado em qualquer lugar. Sem contratos, nem complicações.
              </p>
              <p className="border-l-2 border-orange-500 pl-4 text-xs font-medium text-slate-400">
                O Fatu-R encontra-se em constante evolução e é, neste momento, um software de faturação online, direcionado a retalho, restauração e escritório.
              </p>
            </div>
          </section>

          {/* METRIC NUMBERS STATS BENTO BOARD */}
          <section className="space-y-6">
            <div className="text-center">
              <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest">RESULTADOS REAIS</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                Fatu-R em Números
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stat 1 */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl hover:border-orange-500/20 transition-all text-center space-y-2">
                <div className="inline-flex p-3 bg-orange-500/5 text-orange-400 rounded-xl">
                  <Users size={24} />
                </div>
                <div className="text-3xl font-black text-white tracking-tight">+ de 13 000</div>
                <p className="text-xs text-slate-400 font-medium leading-normal">
                  Empresas e Profissionais confiam no Fatu-R
                </p>
              </div>

              {/* Stat 2 */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl hover:border-orange-500/20 transition-all text-center space-y-2">
                <div className="inline-flex p-3 bg-orange-500/5 text-orange-400 rounded-xl">
                  <FileText size={24} />
                </div>
                <div className="text-3xl font-black text-white tracking-tight">+ 130 M</div>
                <p className="text-xs text-slate-400 font-medium leading-normal">
                  de documentos emitidos
                </p>
              </div>

              {/* Stat 3 */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl hover:border-orange-500/20 transition-all text-center space-y-2">
                <div className="inline-flex p-3 bg-orange-500/5 text-orange-400 rounded-xl">
                  <Award size={24} />
                </div>
                <div className="text-3xl font-black text-white tracking-tight">19</div>
                <p className="text-xs text-slate-400 font-medium leading-normal">
                  Profissionais altamente qualificados
                </p>
              </div>

              {/* Stat 4 */}
              <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl hover:border-orange-500/20 transition-all text-center space-y-2">
                <div className="inline-flex p-3 bg-orange-500/5 text-orange-400 rounded-xl">
                  <Globe size={24} />
                </div>
                <div className="text-3xl font-black text-white tracking-tight">5</div>
                <p className="text-xs text-slate-400 font-medium leading-normal">
                  Países contam com o Fatu-R
                </p>
              </div>
            </div>
          </section>

          {/* JOIN TEAM / CANDIDATURA ESPONTÂNEA */}
          <section className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 sm:p-12 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-lg pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

            <div className="max-w-xl mx-auto space-y-3">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                Queres juntar-te a nós nesta aventura pelo mundo da tecnologia?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
                Na Fatu-R, estamos sempre à procura de talentos inovadores, engenheiros criativos e resolvedores de problemas apaixonados pela transformação digital.
              </p>
            </div>

            <div className="pt-2">
              <p className="text-sm font-bold text-slate-300">Envia-nos a tua candidatura!</p>
              <button 
                onClick={() => setShowSpontaneousModal(true)}
                className="mt-4 bg-orange-500 hover:bg-orange-600 focus:outline-none text-white font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all hover:scale-[1.02] cursor-pointer"
              >
                Candidatura Espontânea
              </button>
            </div>
          </section>

          {/* BOTTOM ADAPTED CTAs HERO BAR */}
          <div className="mt-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="max-w-2xl mx-auto space-y-6 relative z-10 flex flex-col items-center">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight uppercase font-sans">
                Software de Faturação e POS sem limites.
              </h2>
              <p className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-amber-55 opacity-95">
                30 dias gratuitos sem compromisso
              </p>
              <button
                onClick={onRegister}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs sm:text-sm tracking-wider uppercase transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-xl mt-2"
              >
                Experimente Grátis
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 pt-12 pb-10 border-t border-slate-900 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-1 font-sans">
            <span className="text-lg font-black tracking-tight text-white">
              Fatu<span className="text-orange-500">-R</span>
            </span>
            <span className="text-slate-600 mx-2">|</span>
            <span className="text-slate-500">© {new Date().getFullYear()} Todos os direitos reservados.</span>
          </div>

          <div className="flex gap-5 text-[11px] text-slate-500">
            <button onClick={() => onBack()} className="hover:text-white transition-colors cursor-pointer">Início</button>
            <span>•</span>
            <button onClick={onRegister} className="hover:text-white transition-colors cursor-pointer">Criar Conta</button>
          </div>
        </div>
      </footer>

      {/* RECRUITMENT MODAL */}
      {showSpontaneousModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg space-y-6 relative">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">Candidatura Espontânea</h3>
              <p className="text-xs text-slate-400">Preencha os dados abaixo e entraremos em contacto se surgir uma vaga compatível.</p>
            </div>

            <form onSubmit={handleCandidatureSubmit} className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Primeiro e Último Nome</label>
                <input 
                  type="text" 
                  value={candidateName}
                  onChange={e => setCandidateName(e.target.value)}
                  placeholder="Seu nome" 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 p-3 rounded-xl outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Endereço de Email</label>
                <input 
                  type="email" 
                  value={candidateEmail}
                  onChange={e => setCandidateEmail(e.target.value)}
                  placeholder="Seu e-mail" 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 p-3 rounded-xl outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Área de Interesse / Cargo</label>
                <input 
                  type="text" 
                  value={candidateRole}
                  onChange={e => setCandidateRole(e.target.value)}
                  placeholder="Ex: Engenheiro de Software Fullstack, Suporte, Marketing" 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 p-3 rounded-xl outline-none text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Apresentação ou Links (LinkedIn / GitHub)</label>
                <textarea 
                  rows={3} 
                  value={candidateMessage}
                  onChange={e => setCandidateMessage(e.target.value)}
                  placeholder="Fale um pouco sobre si ou adicione links relevantes..." 
                  required 
                  className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 p-3 rounded-xl outline-none text-white placeholder:text-slate-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowSpontaneousModal(false)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-lg font-bold text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 px-5 py-2.5 rounded-lg font-extrabold text-white cursor-pointer"
                >
                  Enviar Candidatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
