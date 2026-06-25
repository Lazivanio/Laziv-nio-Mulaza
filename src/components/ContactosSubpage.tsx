import React, { useState } from 'react';
import { 
  ArrowLeft, MessageSquare, Mail, Phone, MapPin, 
  CheckCircle, Globe, Play, Heart, Send, Layers, Laptop
} from 'lucide-react';

interface ContactosSubpageProps {
  onBack: () => void;
  onRegister?: () => void;
  onInitiateChat?: () => void;
}

export const ContactosSubpage: React.FC<ContactosSubpageProps> = ({ 
  onBack, 
  onRegister,
  onInitiateChat 
}) => {
  const [subject, setSubject] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || subject === '-- Qual é o assunto? --') {
      alert('Por favor, selecione o assunto.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsSubmitted(true);
      // Reset fields
      setSubject('');
      setName('');
      setEmail('');
      setMessage('');
    }, 1000);
  };

  const scrollToForm = () => {
    const element = document.getElementById('contact-form-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-900 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
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
              Suporte
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

      {/* CORE HERO & CONTENT DISPLAY CONTAINER (FOLHA) */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 space-y-16 relative">
        {/* Decorative ambient glow */}
        <div className="absolute top-10 left-1/3 -translate-x-1/2 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Introduction Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto relative z-15">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Suporte ao Cliente
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-light">
            Fale connosco através do chat, telefone ou e-mail com a nossa equipa de suporte ao cliente.
          </p>

          <div className="pt-6 flex flex-wrap justify-center gap-3">
            <button 
              onClick={onInitiateChat}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-5 py-3 rounded-xl text-xs font-extrabold text-white shadow-lg transition-transform hover:scale-[1.02] cursor-pointer"
            >
              <MessageSquare size={16} />
              Iniciar uma Conversa
            </button>
            <button 
              onClick={scrollToForm}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 px-5 py-3 rounded-xl text-xs font-extrabold text-slate-300 transition-colors cursor-pointer"
            >
              <Mail size={16} />
              Enviar Email
            </button>
            <div className="flex items-center gap-2 bg-slate-900/55 border border-slate-900 px-5 py-3 rounded-xl text-xs font-mono text-slate-300">
              <Phone size={16} className="text-orange-500" />
              <span>+244 22 244 04 48</span>
            </div>
          </div>
        </div>

        {/* Content Layout Grid (The "Folha" Container) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* LEFT PANEL: Map and Office details */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Onde Estamos Info Card */}
            <div className="bg-slate-900/60 border border-slate-900 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mapa</h3>
                  <h2 className="text-lg font-black text-white leading-tight">Onde Estamos?</h2>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-xs font-medium text-slate-300 leading-relaxed">
                <p className="font-bold text-white text-sm">Loanda Towers – Torre B - Piso 21º, Escritório Nº2</p>
                <p className="text-slate-400 font-mono text-[11px]">Rua Gamal Abdel Nasser, Luanda, Angola</p>
              </div>

              {/* Minimal Dark Map Visualization */}
              <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative flex items-center justify-center">
                {/* Simulated Grid Maps Visual */}
                <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none" />
                
                {/* Simulated Roads/Paths using CSS vectors */}
                <div className="absolute inset-10 border border-indigo-500/10 rounded-full pointer-events-none" />
                <div className="absolute inset-20 border border-orange-500/10 rounded-full pointer-events-none" />
                <div className="absolute w-[1px] h-full bg-slate-900/40 rotate-[35deg]" />
                <div className="absolute w-[1px] h-full bg-slate-900/40 rotate-[-45deg]" />
                <div className="absolute h-[1px] w-full bg-slate-900/40 top-[40%]" />
                <div className="absolute h-[1px] w-full bg-slate-900/40 top-[75%]" />

                {/* City Elements */}
                <div className="absolute top-[25%] left-[20%] text-[8px] font-mono text-slate-600 font-bold tracking-widest uppercase">KILAMBA</div>
                <div className="absolute bottom-[20%] right-[15%] text-[8px] font-mono text-slate-600 font-bold tracking-widest uppercase">ILHA DE LUANDA</div>

                {/* Glowing Marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="absolute -top-10 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[9px] font-bold text-white whitespace-nowrap shadow-xl">
                    Loanda Towers, Torre B
                  </div>
                  <span className="flex h-4 w-4 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Support Hours Card */}
            <div className="bg-gradient-to-r from-slate-900/40 to-slate-900/20 border border-slate-900/60 rounded-xl p-5 text-xs text-slate-400 font-medium">
              <p className="font-bold text-slate-200 mb-1">⏰ Horários de Atendimento</p>
              <p>Segunda a Sexta, das 8h às 17h. Resposta pelo e-mail e canais oficiais garantida com máxima prioridade.</p>
            </div>
          </div>

          {/* RIGHT PANEL: Interactive Form */}
          <div id="contact-form-section" className="lg:col-span-7 bg-slate-900/50 border border-slate-900 rounded-3xl p-6 sm:p-10 space-y-6 relative">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white leading-tight">Enviar Email</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Preencha os seus dados e o assunto abaixo para entrar em contacto direto com os nossos consultores especializados.
              </p>
            </div>

            {isSubmitted ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-emerald-500/20 text-emerald-400 rounded-full">
                  <CheckCircle size={32} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-white">Obrigado pelo seu contacto!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                    Responderemos o mais brevemente possível com todas as indicações que necessitar.
                  </p>
                </div>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="mt-2 text-xs font-extrabold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                
                {/* Subject Selector */}
                <div className="space-y-2">
                  <label htmlFor="subject-select" className="block font-black text-slate-400 uppercase tracking-wider text-[10px]">
                    Qual é o assunto?
                  </label>
                  <select
                    id="subject-select"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl text-slate-300 focus:border-orange-500 outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" disabled>-- Qual é o assunto? --</option>
                    <option value="Suporte Técnico">Apoio Técnico e Operacional</option>
                    <option value="Facturação AGT">Dúvidas sobre Facturação Fatu-R (AGT)</option>
                    <option value="Vendas">Planos, Assinaturas e Customizações</option>
                    <option value="API e Integrações">API para Programadores & Integrações</option>
                    <option value="Outros">Outras Questões</option>
                  </select>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block font-black text-slate-400 uppercase tracking-wider text-[10px]">
                    Nome
                  </label>
                  <input 
                    id="name"
                    type="text" 
                    placeholder="Primeiro e Último Nome" 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl text-slate-200 placeholder:text-slate-600 focus:border-orange-500 outline-none transition-colors"
                  />
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block font-black text-slate-400 uppercase tracking-wider text-[10px]">
                    Email
                  </label>
                  <input 
                    id="email"
                    type="email" 
                    placeholder="email@dominio.com" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl text-slate-200 placeholder:text-slate-600 focus:border-orange-500 outline-none transition-colors"
                  />
                </div>

                {/* Message Input */}
                <div className="space-y-2">
                  <label htmlFor="message" className="block font-black text-slate-400 uppercase tracking-wider text-[10px]">
                    Mensagem
                  </label>
                  <textarea 
                    id="message"
                    rows={4}
                    placeholder="Escreva a sua mensagem em detalhe..." 
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl text-slate-200 placeholder:text-slate-600 focus:border-orange-500 outline-none transition-colors resize-none"
                  />
                </div>

                {/* Submit button */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 py-3.5 text-xs text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                >
                  <Send size={14} />
                  {loading ? 'A processar...' : 'Enviar Email'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* BOTTOM ADAPTED CTAs HERO BAR (As requested: Software de Facturação e POS sem limites...) */}
        <div className="mt-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-950/5 rounded-full blur-lg -translate-x-1/2 translate-y-1/2 pointer-events-none" />
          
          <div className="max-w-2xl mx-auto space-y-6 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight uppercase font-sans">
              Software de Facturação e POS sem limites.
            </h2>
            <p className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-amber-50 opacity-95">
              30 Dias Gratuitos sem compromisso!
            </p>
            <button
              onClick={onRegister}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-extrabold px-8 py-3.5 rounded-xl text-xs sm:text-sm tracking-wider uppercase transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-xl mt-2"
            >
              Experimente Grátis
            </button>
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
            <button onClick={onBack} className="hover:text-white transition-colors cursor-pointer">Início</button>
            <span>•</span>
            <button onClick={onRegister} className="hover:text-white transition-colors cursor-pointer">Criar Conta</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
