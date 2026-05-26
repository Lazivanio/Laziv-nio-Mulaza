import React, { useState } from 'react';
import { 
  Monitor, 
  Printer, 
  Layers, 
  Barcode, 
  Scale, 
  Coins, 
  DollarSign, 
  Users, 
  RefreshCw, 
  Percent, 
  Package, 
  CheckCircle2, 
  Cloud, 
  Award, 
  FileText, 
  ArrowUpCircle, 
  Lock, 
  Clock, 
  Smartphone, 
  ArrowRight,
  ChevronDown,
  Store,
  Utensils,
  Shirt,
  GlassWater,
  Coffee,
  Scissors,
  Footprints,
  Truck,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface POSSubpageProps {
  onBack: () => void;
  onRegister: () => void;
}

export const POSSubpage: React.FC<POSSubpageProps> = ({ onBack, onRegister }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const devices = [
    {
      icon: <Monitor className="w-6 h-6 text-orange-500" />,
      title: "Equipamento Flexível",
      desc: "O Fatu-R funciona em qualquer equipamento (Computador, Tablet ou Smartphone), pelo que poderá contar com os seus dispositivos atuais para a utilização do POS, evitando assim custos adicionais. Precisa de equipamento? Estamos aqui para ajudar, com integrações diretas."
    },
    {
      icon: <Printer className="w-6 h-6 text-orange-500" />,
      title: "Impressão em Talão, A4 ou Recibo",
      desc: "Configure a impressão em formato talão, A4 ou recibo de 80mm/58mm, para funcionar perfeitamente em impressoras normais a jato de tinta ou térmicas dedicadas."
    },
    {
      icon: <Layers className="w-6 h-6 text-orange-500" />,
      title: "Gavetas & Caixas Registadoras",
      desc: "O Fatu-R é totalmente compatível com a grande maioria das caixas registadoras físicas e gavetas de dinheiro eletromecânicas com abertura por pulso via impressora."
    },
    {
      icon: <Barcode className="w-6 h-6 text-orange-500" />,
      title: "Leitores de Códigos de Barras",
      desc: "Utilize pistolas ou leitores de código de barras USB/Bluetooth para ler artigos ou produtos diretamente no ecrã de vendas em milissegundos."
    },
    {
      icon: <Scale className="w-6 h-6 text-orange-500" />,
      title: "Integração das Balanças",
      desc: "Através da nossa aplicação inteligente de ponte de hardware, poderá integrar facilmente balanças industriais de pesagem com ligação RS232 ou com adaptadores USB."
    },
    {
      icon: <Coins className="w-6 h-6 text-orange-500" />,
      title: "Máquinas de Troco Automático",
      desc: "Integre com soluções de máquinas de trocos seguras, também conhecidas como moedeiros automáticos ou caixas de pagamento (como Alice, Zarph ou Cashmatic). Automatize o fecho de caixa e evite erros."
    }
  ];

  const posFeatures = [
    {
      icon: <DollarSign className="w-5 h-5" />,
      title: "Controlo Inteligente de Caixa",
      desc: "Faça a gestão da sua caixa e fluxos monetários. Pode abrir, fechar, registar entradas ou saídas de dinheiro, e realizar consultas ou pontos de caixa imediatos sempre que pretender."
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Utilizadores e Operadores Ilimitados",
      desc: "O Fatu-R permite a criação de múltiplos utilizadores operadores com perfis e permissões granulares, controlo de turnos de trabalho e atribuição direta de comissões de venda no Plano Pro."
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: "Trocas, Devoluções e Reembolsos",
      desc: "Realize trocas, devoluções de artigos ou anulações de documentos emitidos diretamente no seu POS de forma rápida e legalmente em harmonia com as regras fiscais."
    },
    {
      icon: <Percent className="w-5 h-5" />,
      title: "Talões de Campanhas & Descontos",
      desc: "Defina descontos imediatos em percentagem ou valor no carrinho de compras ou crie talões e vouchers de promoção para impulsionar e reter clientes no seu estabelecimento."
    },
    {
      icon: <Package className="w-5 h-5" />,
      title: "Gestão de Produtos Variáveis e Atributos",
      desc: "Controle de stock real em produtos com variantes, cores, tamanhos e lotes específicos (ex: T-Shirt Branca Tamanho L ou Lote Alimentar)."
    }
  ];

  const valueProps = [
    {
      title: "Sem Fidelização ou Contrato",
      desc: "Temos o software com a melhor qualidade-preço do mercado angolano, ativação imediata e sem fidelizações perpétuas ou contratos obrigatórios."
    },
    {
      title: "100% Online & Cloud",
      desc: "Não necessita de instalações complexas nos computadores locais, basta aceder através de qualquer navegador web e o Fatu-R está disponível a partir de qualquer parte do mundo."
    },
    {
      title: "Certificado pela AGT",
      desc: "O Fatu-R é oficialmente validado e certificado pela Administração Geral Tributária (AGT) em Angola sob o registo de Software de Faturação Nº 142/AGT."
    },
    {
      title: "SAF-T AO, QR Code & Cédula",
      desc: "Fácil e rápida conformidade legal: exportação perfeita do ficheiro SAF-T AO mensal e desenho automático de códigos QR nas faturas e recibos de vendas."
    },
    {
      title: "Atualizações Legais Integradas",
      desc: "Todas as atualizações estão totalmente incluídas e não precisa de fazer backups manuais. Garante cumprimento de alterações fiscais de forma imediata e transparente."
    },
    {
      title: "Simples e Sem Necessidade de Formação",
      desc: "Esqueça cursos complicados. O Fatu-R POS possui uma interface fluida, visual e incrivelmente otimizada que qualquer funcionário pode dominar em 2 minutos."
    },
    {
      title: "Apoio ao Cliente em Tempo Real",
      desc: "Suporte especializado gratuito e ilimitado através do chat dinâmico direto na aplicação, ligando-o à nossa equipa técnica sem atrasos."
    },
    {
      title: "Aplicações Nativas Multiplataforma",
      desc: "Utilize o Fatu-R no PC via web ou aproveite as nossas apps otimizadas para iOS e Android, que garantem total mobilidade nas vendas de rua e balcão."
    }
  ];

  const niches = [
    { name: "Comércio a Retalho & Mercearias", icon: <Store className="w-8 h-8 text-orange-500" /> },
    { name: "Lojas de Roupa & Calçado", icon: <Shirt className="w-8 h-8 text-orange-500" /> },
    { name: "Bares, Clubes & Discotecas", icon: <GlassWater className="w-8 h-8 text-orange-500" /> },
    { name: "Sapatarias & Acessórios", icon: <Footprints className="w-8 h-8 text-orange-500" /> },
    { name: "Venda Ambulante & Eventos", icon: <Truck className="w-8 h-8 text-orange-500" /> }
  ];

  const faqs = [
    {
      q: "É necessário acesso continuo à Internet?",
      a: "O Fatu-R é optimizado para funcionar na cloud, o que garante dados sempre salvaguardados e sincronização multi-loja. No entanto, o nosso sistema dispõe de mecanismos de cache no ecossistema de aplicação para aguentar pequenas falhas de rede de forma a que possa continuar a registar as transações sem parar."
    },
    {
      q: "O Fatu-R necessita de instalação pesada?",
      a: "Não. A versão principal do Fatu-R corre 100% no seu navegador de internet, tal como acede ao seu correio eletrónico, não exigindo downloads nem instalações locais avançadas nas suas máquinas diárias. Dispomos também de um instalador leve (Fatu-R Desktop) caso pretenda benefícios de conectividade de hardware local."
    },
    {
      q: "É preciso comprar equipamentos informáticos novos ou específicos?",
      a: "Geralmente não. O Fatu-R é desenhado para ser compatível e correr de forma fluida nos aparelhos comerciais comuns que já possui no seu negócio (computadores Windows/Mac, tablets Android/iPad, telemóveis normais). Isto poupa investimentos consideráveis de entrada."
    },
    {
      q: "O Fatu-R comercializa ou vende diretamente os equipamentos físicos?",
      a: "A nossa empresa foca-se no desenvolvimento do melhor software e inteligência cloud. Não vendemos hardware diretamente, no entanto, orientamos os nossos clientes e trabalhamos de mãos dadas com parceiros e fornecedores informáticos recomendados, sugerindo as melhores configurações em Angola."
    },
    {
      q: "O Fatu-R POS é fácil de usar e aprender para novos funcionários?",
      a: "Extremamente fácil. Reduzimos ao máximo cliques e distrações. A interface de vendas rápida foi desenhada após longos testes com operadores reais, sendo possível faturar um artigo em apenas 2 toques no ecrã."
    },
    {
      q: "É possível personalizar o aspeto e informações das faturas e talões?",
      a: "Sim. Pode facilmente fazer o upload do logótipo da sua empresa, definir textos customizáveis de rodapé, informações fiscais detalhadas e escolher entre formatos de fatura A4 profissional ou talão térmico de caixa."
    },
    {
      q: "É possível exportar o ficheiro regulamentar SAF-T AO facilmente?",
      a: "Sim, com total facilidade legal. O Fatu-R gera e extrai o ficheiro SAF-T AO auditável em conformidade rigorosa com o formato exigido pela AGT para a submissão fiscal regular."
    },
    {
      q: "Posso utilizar o Fatu-R em simultâneo no Tablet comercial e num Computador em casa?",
      a: "Sim, perfeitamente. Sendo uma plataforma 100% na nuvem, pode faturar no tablet do seu balcão e consultar instantaneamente em tempo real as faturas emitidas e relatórios de fluxo financeiro a partir de qualquer computador na sua residência."
    },
    {
      q: "O que acontece se eu ficar temporariamente sem ligação à Internet?",
      a: "O Fatu-R POS armazena as transações localmente no estado offline do navegador. Assim que a rede móvel ou o wi-fi regressar ao estabelecimento, os documentos sincronizam de forma instantânea com o nosso servidor cloud central de forma automática."
    },
    {
      q: "É possível integrar a gaveta de dinheiro elétrica para abertura automática?",
      a: "Sim. Ao ligar a sua gaveta comum RJ11 à porta correspondente da sua impressora de talões térmica subsidiada, o Fatu-R envia o sinal eletrónico de abertura automática sempre que uma venda for concluída ou um talão impresso."
    }
  ];

  return (
    <div className="font-sans text-slate-900 bg-slate-50 min-h-screen">
      {/* breadcrumb */}
      <div className="bg-slate-100 border-b border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <button onClick={onBack} className="hover:text-orange-500 transition-colors font-semibold">Início</button>
            <span>/</span>
            <span className="text-slate-800 font-bold">Software POS Comercial</span>
          </div>
          <button 
            onClick={onBack}
            className="text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 text-[11px]"
          >
            ← Voltar para Página Inicial
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white py-16 lg:py-24 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#ea580c_0%,transparent_50%)] opacity-30"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent opacity-80"></div>
        
        <div className="relative max-w-5xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-orange-400 text-xs font-black tracking-widest uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Fatu-R POS Online
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl mx-auto font-display">
            Sistema POS (Ponto de Venda) <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Simples, prático e Intuitivo!</span>
          </h1>
          
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            A solução de balcão perfeita para acelerar registos, controlar caixa em tempo real e faturar legalmente de acordo com as especificidades do mercado angolano. O melhor POS para o seu tablet, computador ou telemóvel.
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onRegister}
              className="w-full sm:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 flex items-center justify-center gap-2 group cursor-pointer"
            >
              Experimentar Grátis por 30 Dias
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onBack}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Ver Todas as Soluções
            </button>
          </div>

          <p className="text-[11px] text-slate-400 pt-2">
            Disponível para qualquer dispositivo de ecrã tátil, computadores comuns e impressoras térmicas standard.
          </p>
        </div>
      </section>

      {/* Como Ajudamos o seu negócio */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <h2 className="text-sm font-black text-orange-500 tracking-wider uppercase">Vantagens Operacionais</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Como podemos ajudar o seu Negócio?</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              A versão POS do Fatu-R foi rigorosamente desenhada a pensar nas necessidades reais de negócios dinâmicos que procuram um ponto de venda para registar vendas físicas, gerir pagamentos e faturar clientes diários de forma rápida e segura.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {devices.map((device, idx) => (
              <div 
                key={idx}
                className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-500/20 transition-all hover:shadow-xl group"
              >
                <div className="p-3 bg-white rounded-xl shadow-sm inline-block mb-4 group-hover:scale-110 transition-transform">
                  {device.icon}
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-2">{device.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{device.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-orange-50/50 rounded-2xl border border-orange-100/60 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-sm font-bold text-slate-900">Precisa de Equipamentos Físicos ou Hardware para o seu Balcão?</p>
              <p className="text-xs text-slate-500">
                Temos parcerias estratégicas com importadores de impressoras e caixas de gaveta recomendadas.
              </p>
            </div>
            <button 
              onClick={onRegister}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
            >
              Falar com um Consultor
            </button>
          </div>
        </div>
      </section>

      {/* Funcionalidades Internas do POS */}
      <section className="py-20 bg-slate-950 text-white relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,#ea580c_0%,transparent_60%)] opacity-20"></div>
        
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-black text-orange-500 uppercase tracking-widest block">O Poder do Ponto de Venda</span>
              <h3 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight font-display">
                Tudo o que precisa no seu Balcão de Vendas
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Mais do que registar uma venda, o nosso sistema oferece ferramentas completas para gerir operadores, proteger a gaveta de dinheiro, criar fidelizações fortes e analisar fluxos financeiros diretamente do terminal POS.
              </p>
              
              <div className="pt-2">
                <button 
                  onClick={onRegister}
                  className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Criar Minha Conta Grátis
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="lg:col-span-1"></div>

            <div className="lg:col-span-6 space-y-6">
              {posFeatures.map((feat, idx) => (
                <div 
                  key={idx}
                  className="flex gap-4 p-4 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all group"
                >
                  <div className="p-2 w-10 h-10 shrink-0 bg-slate-900 border border-slate-800 text-orange-400 rounded-lg group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-colors flex items-center justify-center">
                    {feat.icon}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{feat.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Porquê Fatu-R POS */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-sm font-black text-orange-500 tracking-wider uppercase">Sólida Confiança</h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Porque somos a escolha certa para o seu Negócio?</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Desenvolvemos e aperfeiçoamos a plataforma Fatu-R para corresponder na perfeição às necessidades de estabelecimentos que utilizam Pontos de Venda, garantindo alta conformidade legal e agilidade insuperável de cliques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps.map((prop, idx) => (
              <div 
                key={idx}
                className="p-5 bg-slate-50 border border-slate-100 rounded-xl hover:border-orange-500/20 hover:bg-white transition-all space-y-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">{prop.title}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setores de Actuação - A quem de destina */}
      <section className="py-20 bg-slate-50 border-t border-slate-200/55">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-black text-orange-500 uppercase tracking-widest block">O Seu Negócio</span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">POS desenhado para o seu Sector</h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto">
              O Fatu-R POS é modular e adapta-se na perfeição a diversos negócios comerciais de balcão físico ou móvel.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {niches.map((niche, idx) => (
              <div 
                key={idx}
                className="p-4 sm:p-6 bg-white border border-slate-200/60 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all text-center flex flex-col items-center gap-3 sm:gap-4 group"
              >
                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-full group-hover:bg-orange-500/10 transition-colors">
                  {niche.icon}
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-snug break-words max-w-full">{niche.name}</span>
              </div>
            ))}
          </div>
          
          <div className="pt-12 text-center">
            <button 
              onClick={onRegister}
              className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 font-bold text-white text-xs rounded-xl shadow-md cursor-pointer"
            >
              Criar Conta Grátis & Escolha o seu Sector
            </button>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center space-y-3 mb-12">
            <HelpCircle className="w-8 h-8 text-orange-500 mx-auto" />
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Perguntas Frequentes do POS</h3>
            <p className="text-slate-500 text-xs sm:text-sm">
              Tudo o que precisa de saber sobre o funcionamento do Fatu-R POS no seu dia-a-dia de vendas.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 transition-colors"
                >
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 select-none focus:outline-none cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">{faq.q}</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-orange-500' : 'rotate-0'}`} 
                    />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-5 text-slate-500 text-xs leading-relaxed border-t border-slate-100/40 bg-white p-4">
                          {faq.a}
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

      {/* Footer Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 text-white py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#ea580c_0%,transparent_50%)] opacity-25"></div>
        <div className="relative max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight font-display">
            Pronto para Revolucionar a sua Recepção de Vendas?
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Obtenha um ponto de venda (POS) rápido, seguro e inteiramente em conformidade legal com a AGT hoje mesmo. Sem compromissos fiscais de teste!
          </p>
          
          <div className="pt-4">
            <button 
              onClick={onRegister}
              className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm transition-transform hover:scale-102 shadow-lg inline-flex items-center gap-2 cursor-pointer"
            >
              Criar Conta e Experimentar Grátis por 30 Dias
              <ArrowRight size={16} />
            </button>
          </div>
          
          <p className="text-[11px] text-slate-500">
            Registe-se em 1 minuto. Não necessita de cartão de crédito. Ativação imediata online.
          </p>
        </div>
      </section>

      {/* Bottom bar back */}
      <div className="bg-slate-900 border-t border-slate-800 py-6 text-center">
        <button 
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-orange-400 font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          ← Voltar ao Menu de Navegação Principal
        </button>
      </div>

    </div>
  );
};
