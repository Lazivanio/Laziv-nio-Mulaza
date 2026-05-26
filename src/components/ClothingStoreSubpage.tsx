import React from 'react';
import { 
  Shirt, 
  Layers, 
  Tag, 
  CheckCircle2, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Mail, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  Users, 
  ArrowRight, 
  ChevronLeft, 
  Star, 
  Grid,
  ShieldCheck,
  Check,
  Store,
  MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ClothingStoreSubpageProps {
  onBack: () => void;
  onRegister: () => void;
}

export const ClothingStoreSubpage: React.FC<ClothingStoreSubpageProps> = ({ onBack, onRegister }) => {
  const coreFeatures = [
    {
      icon: <CheckCircle2 className="w-6 h-6 text-orange-500" />,
      title: "Software Certificado Nº 142/AGT",
      desc: "O Fatu-R cumpre integralmente todos os requisitos legais exigidos pela Administração Geral Tributária (AGT) em Angola, garantindo que o seu negócio de moda opere em conformidade sem qualquer preocupação."
    },
    {
      icon: <Grid className="w-6 h-6 text-orange-500" />,
      title: "Gestão de Grade (Cores e Tamanhos)",
      desc: "Evite duplicar centenas de produtos à mão. Controle tamanhos (S, M, L, XL, 36 a 44), cores e unidades disponíveis de diversos artigos de forma simples, visual e incrivelmente otimizada."
    },
    {
      icon: <Store className="w-6 h-6 text-orange-500" />,
      title: "Gestão de Múltiplas Lojas",
      desc: "Centralize todas as suas boutiques físicas, armazéns e escritórios. Pode gerir clientes, vendas consolidadas e stocks globais e específicos a partir de qualquer local num único ecrã."
    },
    {
      icon: <Smartphone className="w-6 h-6 text-orange-500" />,
      title: "Faturação em Tablet & Smartphone",
      desc: "Compatível com Android, iOS e Windows. Use o seu telemóvel, tablet ou desktop favorito para emitir faturas com aspeto profissional em segundos, ideal para atendimento dinâmico na loja."
    },
    {
      icon: <Layers className="w-6 h-6 text-orange-500" />,
      title: "Configurável com Retenções de Imposto",
      desc: "Caso o seu estabelecimento de moda ou retalho requeira regimes especiais de retenção na fonte (como retenções de IRT ou Imposto Industrial), configure-as de forma autónoma em segundos."
    },
    {
      icon: <Mail className="w-6 h-6 text-orange-500" />,
      title: "Documentos Digitais por E-mail (PDF)",
      desc: "Reduza custos com papel térmico. Envie faturas-recibo, orçamentos ou faturas pró-forma diretamente em formato PDF por e-mail para os seus clientes de forma ágil e ecológica."
    },
    {
      icon: <FileText className="w-6 h-6 text-orange-500" />,
      title: "Ficheiro SAF-T AO sem Dores de Cabeça",
      desc: "Exporte mensalmente o seu ficheiro SAF-T (AO) para auditorias ou configure o descarregamento rápido para o seu contabilista. Evite atrasos de entrega e poupe tempo precioso."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-orange-500" />,
      title: "Relatórios e Estatísticas de Venda",
      desc: "Consulte o desempenho de vendas por categoria, peça, cor, funcionário ou loja física através de painéis gráficos inteligentes que facilitam relatórios rápidos para decisões informadas."
    }
  ];

  const reasons = [
    {
      num: "01",
      title: "Simples, Prático e Intuitivo",
      desc: "Emitir faturas nas suas lojas de moda não tem que ser um quebra-cabeças! Desfrute de um sistema com interface amigável que qualquer colaborador aprende a usar em menos de 10 minutos."
    },
    {
      num: "02",
      title: "Vendas Rápidas com Código de Barras",
      desc: "Compatível com qualquer pistola ou leitor de código de barras USB/Bluetooth. Atenda filas de clientes rapidamente e finalize pagamentos múltiplos em dinheiros, TPA ou transferências instantâneas."
    },
    {
      num: "03",
      title: "Grade de Atributos Avançada",
      desc: "Especialmente desenhada para vestuário e calçado. Agrupe produtos por modelo, definindo as variações disponíveis e recebendo alertas imediatos de stock baixo para tamanhos específicos."
    },
    {
      num: "04",
      title: "Suporte Técnico 100% Real e Ilimitado",
      desc: "Ao optar pelo Fatu-R, terá acesso a apoio telefónico, chat em direto e e-mail sem tarifas ocultas ou limites de minutos. Nós nunca o deixamos sozinho na hora de faturar."
    },
    {
      num: "05",
      title: "Migração Gratuita e Sem Chatices",
      desc: "Substitua o seu programa de faturação antigo de forma rápida. O nosso suporte de onboarding cuida de migrar os seus ficheiros de clientes e catálogo de inventário sem cobrar um único Kwanza!"
    }
  ];

  const clientStats = [
    {
      metric: "Mais de 40 Milhões",
      label: "Documentos Emitidos",
      desc: "Uma infraestrutura em Cloud de alta performance que garante a estabilidade de milhões de faturamento anuais."
    },
    {
      metric: "Mais de 15.000",
      label: "Empresas e Profissionais",
      desc: "Lojistas de moda, restauração, clínicas e profissionais que confiam no Fatu-R todos os dias para gerir os seus negócios."
    },
    {
      metric: "Presente em 5 Países",
      label: "Angola e Expansão PALOP",
      desc: "Segurança internacional com localização dedicada a nível fiscal e transações em moedas locais como o Kwanza."
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-slate-900 overflow-hidden py-24 sm:py-32 border-b border-slate-800 text-left">
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="absolute top-12 left-1/3 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button 
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 mb-8 tracking-wider uppercase cursor-pointer"
          >
            <ChevronLeft size={16} /> Voltar ao Início
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Text */}
            <div className="lg:col-span-12 xl:col-span-9 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-500/15 text-orange-400 border border-orange-500/20 uppercase tracking-widest">
                <Shirt size={13} className="animate-pulse" /> Fatu-R Moda e Vestuário
              </span>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Software de Faturação para <span className="text-orange-500">Lojas de Roupa</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-3xl">
                Simples, rápido, intuitivo e com suporte ilimitado. Desenvolvido para boutique de roupas, sapatarias e acessórios que desejam modernizar as suas vendas e monitorar armazéns fisicamente ou na Cloud.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <button 
                  type="button"
                  onClick={onRegister}
                  className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase rounded-xl tracking-wider shadow-lg shadow-orange-500/20 transition-all cursor-pointer text-center"
                >
                  Experimente Grátis
                </button>
                <div className="flex items-center gap-3 text-slate-400 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-500" /> 30 Dias Gratuitos
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-500" /> Sem Cartão de Crédito
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DESCRIPTION STATS */}
      <section className="py-16 sm:py-24 bg-white text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                Faturação de excelência para marcas e lojas de vestuário
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                O Fatu-R é o software de faturação ideal para Lojas de Roupa, que procuram uma solução tecnológica acessível para gerir e controlar o desempenho e rentabilidade do negócio. Gestão de cores, tamanhos, faturação e stocks nunca foi tão simples.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-orange-500 shrink-0" />
                O nosso sistema de faturação funciona em todos os tipos de dispositivos, desde Smartphones, passando por Tablets, até Desktop. Uma verdadeira experiência multiplataforma que acompanha o seu ritmo de vendas no balcão de atendimento ou fora dele.
              </p>
            </div>
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-2xl border border-slate-200/60 flex flex-col justify-center text-center space-y-3">
              <p className="text-xs uppercase font-black tracking-widest text-slate-400">Excelente Relação Custo-Benefício</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">Software de Faturação e POS</h3>
              <div className="py-4">
                <p className="text-sm text-slate-500">A partir de apenas</p>
                <p className="text-4xl font-black text-orange-500 my-1">Kz 187.5 <span className="text-xs font-normal text-slate-500">/ Dia</span></p>
                <p className="text-xs text-slate-400 italic">Preço equivalente para planos mensais faturados anualmente</p>
              </div>
              <p className="text-xs font-bold text-slate-600 bg-white shadow-sm border border-slate-200/80 py-2.5 rounded-xl">
                Utilização do Fatu-R como POS de uma loja de roupas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE BENEFITS GRID - "O QUE FAZ O FATU-R?" */}
      <section className="py-20 sm:py-28 bg-slate-50 border-t border-b border-slate-200/50 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-100 px-3 py-1 rounded-full">Recursos Avançados</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">O que faz o Fatu-R?</h2>
            <p className="text-sm sm:text-base text-slate-500 font-normal">
              Organização, rapidez e eficiência integradas numa única plataforma intuitiva para gerir marcas, sapatos ou roupas sem qualquer esforço.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feat, idx) => (
              <div 
                key={idx}
                className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/[0.02] transition-all flex flex-col gap-4 text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-orange-500/10 transition-colors">
                  {feat.icon}
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-base text-slate-900 leading-tight flex items-center gap-1.5">
                    {feat.title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={onRegister}
              className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase rounded-xl tracking-wider transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              Criar Conta e Iniciar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 4. 5 REASONS SECTION */}
      <section className="py-20 sm:py-28 bg-white text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-100 px-3 py-1 rounded-full">Porquê Escolher-nos</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">5 motivos para escolher o Fatu-R!</h2>
            <p className="text-sm sm:text-base text-slate-500">
              Conheça as vantagens competitivas que fazem do Fatu-R o líder em conformidade para o mercado de retalho e moda.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {reasons.map((r, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative text-left"
              >
                <span className="text-4xl font-black text-orange-200 block select-none mb-1">{r.num}</span>
                <h4 className="font-black text-sm text-slate-900 leading-tight">{r.title}</h4>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-normal flex-1">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TESTIMONIAL OF CUSTOMERS */}
      <section className="py-20 sm:py-24 bg-slate-950 text-white text-left relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.01] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">Testemunhos Reais</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
            O que dizem os nossos clientes sobre nós?
          </h2>
          
          <blockquote className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-left max-w-2xl mx-auto relative">
            <div className="flex gap-1 text-orange-400 mb-4">
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
              <Star size={16} fill="currentColor" />
            </div>
            <p className="text-[13px] sm:text-sm text-slate-300 italic font-medium leading-relaxed mb-6">
              "Com o Fatu-R simplificámos o atendimento ao público na Ame Coffee & Fashion Store de Luanda. A separação por grade de sapatos e casacos, aliada à emissão instantânea das faturas certificadas pelo e-mail do cliente, poupa-nos muito papel térmico e chatices com o SAF-T. Estamos 100% satisfeitos!"
            </p>
            <cite className="not-italic block mt-4 border-t border-slate-800/80 pt-4">
              <span className="font-extrabold text-sm text-white block">Ame Coffee & Fashion Store</span>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1 mt-1 justify-start">
                <MapPin size={10} className="text-orange-500" /> Luanda, Angola
              </span>
            </cite>
          </blockquote>
        </div>
      </section>

      {/* 6. STATISTICS BANNER */}
      <section className="py-20 sm:py-24 bg-white text-left border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {clientStats.map((stat, idx) => (
              <div 
                key={idx}
                className="bg-slate-50 border border-slate-200/60 p-6 sm:p-8 rounded-2xl text-center space-y-3"
              >
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {stat.metric}
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-orange-500 uppercase tracking-widest">
                  {stat.label}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed font-normal">
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. BOTTOM CALL TO ACTION */}
      <section className="bg-orange-500 text-white py-16 sm:py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Software de Faturação e POS sem limites.
          </h2>
          <p className="text-sm sm:text-base text-white/90 font-bold max-w-xl mx-auto uppercase tracking-wider">
            30 dias gratuitos sem compromisso, perfeitamente adaptado para o Fatu-R.
          </p>
          
          <div className="pt-4 flex justify-center gap-4">
            <button 
              type="button"
              onClick={onRegister}
              className="px-8 py-4 bg-slate-950 hover:bg-slate-900 text-white font-black text-sm uppercase rounded-xl tracking-wider transition-all duration-200 hover:shadow-xl cursor-pointer"
            >
              Experimente Grátis
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="px-6 py-4 bg-transparent hover:bg-white/10 text-white font-extrabold text-sm border-2 border-white/40 hover:border-white rounded-xl tracking-wider transition-all duration-200 cursor-pointer"
            >
              Ver Outros Setores
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
