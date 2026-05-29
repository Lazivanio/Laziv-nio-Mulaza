import React, { useState, useMemo } from 'react';
import { 
  Search, ArrowLeft, BookOpen, Clock, ArrowRight, 
  ChevronLeft, ChevronRight, Tag, HelpCircle, Info, Sparkles, AlertCircle,
  Facebook, Youtube, Linkedin, Instagram, Phone, Mail
} from 'lucide-react';

interface BlogSubpageProps {
  onBack: (section?: string) => void;
  onRegister: () => void;
}

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string; // Dynamic simulated full text for "Ver Mais"
  date: string;
  readTime: string;
  category: string;
  type: 'novidades' | 'ajuda' | 'informacoes'; // Novidades, Ajuda, Informações
  image: string;
}

export function BlogSubpage({ onBack, onRegister }: BlogSubpageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'novidades' | 'ajuda' | 'informacoes'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  // Dynamic curated list of requested blog posts adapted to Fatu-R
  const posts: BlogPost[] = useMemo(() => [
    {
      id: 1,
      title: "5 forças de Porter: o que são e como pode usá-las no seu pequeno negócio",
      excerpt: "O modelo das 5 forças de Porter é usado por empresas de todo o mundo. Saiba o que é e como pode aplicá-lo ao seu pequeno negócio.",
      content: `O modelo das 5 Forças de Porter, concebido pelo renomado economista Michael Porter em 1979, continua a ser uma das ferramentas de estratégia empresarial mais conceituadas do mundo. Ele diagnostica a competitividade de qualquer setor para identificar focos de rentabilidade.

As cinco forças pilares constitutivas são:
1. Rivalidade entre os concorrentes existentes: A intensidade da concorrência direta no mercado.
2. Ameaça de novos concorrentes entrar: Barreiras regulatórias, investimento inicial e canais de distribuição.
3. Poder de negociação dos clientes: A capacidade que os compradores têm de ditar termos de preços e especificações.
4. Poder de negociação dos fornecedores: A facilidade de acesso a matérias-primas e o monopólio de insumos.
5. Ameaça de produtos ou serviços substitutos: Soluções alternativas que resolvem a mesma necessidade (como táxis vs. Uber).

No seu pequeno negócio angolano ou português, aplicar as Cinco Forças de Porter ajuda a prever tendências do mercado e reposicionar o seu negócio de forma tática. Usar o Fatu-R facilita o controle dos seus custos com fornecedores e análise do consumo dos clientes, ajudando-o a tomar as melhores decisões.`,
      date: "20 May 2026",
      readTime: "6 min de leitura",
      category: "Empreendedorismo",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      title: "Análise custo-benefício: como utilizá-la na gestão do seu negócio",
      excerpt: "A análise custo-benefício avalia a relação entre um investimento e as vantagens que ele traz. Saiba como aplicar este conceito no seu pequeno negócio.",
      content: `A tomada de decisões corporativas eficientes requer um método científico de avaliação comercial. A Análise Custo-Benefício (ACB) é uma abordagem metódica para estimar os pontos fortes e fracos de alternativas que satisfazem transações, atividades ou requisitos funcionais para uma empresa.

Como fazer uma Análise Custo-Benefício de forma prática no seu negócio:
1. Escrever o plano ou alteração pretendida de forma estruturada.
2. Identificar e listar todos os custos previstos (incluindo capital inicial, esforço logístico, salários, subscrições de sistemas).
3. Determinar e estimar os benefícios absolutos (ganho de produtividade, simplificação de tarefas, atração de clientes).
4. Converter todos os valores intangíveis em estimativas monetárias factuais.
5. Comparar os totais para verificar o Retorno do Investimento (ROI).

Dica de Excelência: Substituir processos manuais pelo Fatu-R traz benefícios imediatos muito superiores ao custo simbólico da licença. Reduza o tempo gasto com papelada em até 80% e dedique-se ao core business!`,
      date: "18 May 2026",
      readTime: "5 min de leitura",
      category: "Empresas",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      title: "Faturação recorrente: como gerir e vantagens para o seu negócio",
      excerpt: "A faturação recorrente diz respeito a pagamentos regulares, como avenças, mensalidades e subscrições. Saiba como otimizar o processo.",
      content: `A faturação recorrente é um motor de estabilidade para qualquer empresa contemporânea. Se o seu modelo comercial envolve avenças mensais, planos de subscrição, prestações, propinas ou prestações recorrentes de software, a automação do ciclo de tesouraria é imperativa.

Principais Vantagens da Faturação Recorrente:
- Previsibilidade Orçamental: Obtenha fluxos de fundos pré-determinados no dia 1 de cada mês.
- Elevada Praticidade para Clientes: Dispensa a emissão ativa de encomendas múltiplas e ordens individuais.
- Minimização da Inadimplência: Faturas emitidas de forma sistemática reduzem esquecimentos e atrasos.

Com o Fatu-R, pode configurar o agendamento sistemático de faturas periódicas de modo automático, garantindo o envio correto e integrado ao sistema de comunicação certificado AGT. Nunca foi tão simples assegurar avenças.`,
      date: "14 May 2026",
      readTime: "4 min de leitura",
      category: "Faturação",
      type: "ajuda",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 4,
      title: "Empresário em nome individual ou trabalhador independente?",
      excerpt: "Empresário em nome individual ou trabalhador independente? Descubras as diferenças e as vantagens e desvantagens de cada opção.",
      content: `Iniciar a sua trajetória empresarial implica selecionar a estrutura jurídica e o enquadramento fiscal adequado. Existem dois modelos principais para profissionais em nome próprio:

Trabalhador Independente:
- Recomendado para quem presta serviços e atividade liberal.
- Processamento facilitado através de Recibos de Prestação de Serviços (Recibos Verdes em Portugal, faturas eletrónicas simples de prestação de serviços em Angola).
- Isenções simplificadas, porém menor margem de amortização logística.

Empresário em Nome Individual (ENI):
- Mais vocacionado para comércio e vendas físicas de stock ou produtos.
- Integra o património pessoal com as obrigações da firma diretamente.
- Requer contabilidade organizada consoante o patamar financeiro.

Independentemente do seu modelo selecionado, o Fatu-R fornece uma plataforma unificada que atende tanto as necessidades de um consultor autónomo como as de um estabelecimento de comércio tradicional.`,
      date: "11 May 2026",
      readTime: "7 min de leitura",
      category: "Freelancers",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 5,
      title: "Gestão de tesouraria: dicas para empreendedores",
      excerpt: "Uma boa gestão de tesouraria é ainda mais importante para os pequenos negócios. Conheça algumas dicas práticas que vão ajudar a sua empresa.",
      content: `A tesouraria é a corrente sanguínea que mantém ativa a infraestrutura empresarial. Sem recursos líquidos suficientes para saldar as responsabilidades fiscais, operacionais e fornecedores de curtíssimo prazo, até o negócio mais promissor corre alto perigo.

Algumas Dicas Práticas de Excelência:
1. Controle o Fluxo de Caixa Diariamente: Evite surpresas monitorizando as entradas efetivas em oposição aos lucros contabilísticos abstratos.
2. Defina Reservas de Liquidez: Mantenha capital equivalente a pelo menos 3 a 6 meses de despesas de exploração básicas.
3. Otimize os Prazos de Recebimento: Permita pagamentos instantâneos por Multicaixa Express, Cartão e facilite a emissão de Faturas Recibo (FR) imediatas.

O Fatu-R dá-lhe visibilidade em tempo-real do seu caixa e dos recebimentos das faturas pendentes, ajudando-o a focar na gestão inteligente do crédito.`,
      date: "06 May 2026",
      readTime: "5 min de leitura",
      category: "Empreendedorismo",
      type: "ajuda",
      image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 6,
      title: "O que é uma nota de crédito e como funciona?",
      excerpt: "Para retificar uma fatura, este é o documento certo. Saiba em que casos deve emitir uma nota de crédito e quais os elementos que deve conter.",
      content: `Na contabilidade corrente de qualquer firma certificada, retificar faturas emitidas de forma incorreta ou estornar vendas que foram devolvidas pelos consumidores obedece a regras rigorosas definidas pela AGT e os regimes fiscais em vigor.

Nunca anule ou deite fora uma fatura eletrónica assinada! O mecanismo legal para estorno é a Nota de Crédito.

Quando deve emitir uma Nota de Crédito:
1. Devolução de Mercadorias pelo cliente.
2. Desconto concedido posteriormente à validação da fatura.
3. Erro material no preenchimento do documento principal (como NIF ou valores incorretos).

O Fatu-R simplifica este procedimento contábil, permitindo ao operador selecionar qualquer documento previamente emitido e efetuar a nota de crédito correspondente com um clique, transmitindo as informações exatas e de forma ágil para a Autoridade Tributária.`,
      date: "02 May 2026",
      readTime: "4 min de leitura",
      category: "Fiscalidade",
      type: "ajuda",
      image: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 7,
      title: "Abrir empresa em Portugal: Guia para estrangeiros e não residentes",
      excerpt: "Se é estrangeiro e quer abrir uma empresa em Portugal, conheça os passos a dar, a documentação necessária e os programas existentes para investir no país.",
      content: `Portugal é conhecido como um dos destinos mais inovadores da Europa para estabelecer uma empresa ou arrancar com iniciativas tecnológicas. Se é estrangeiro, as barreiras de imigração foram bastante diminuídas com as facilidades de abertura virtual.

Passos Importantes:
1. Obtenção do NIF de Não Residente (através de representante fiscal caso resida fora da União Europeia).
2. Escolha do Nome da Firma e obtenção do Certificado de Admissibilidade.
3. Registo na iniciativa "Empresa na Hora" ou de forma tradicional e depósito do capital social fictício.
4. Início de Atividade na Autoridade Tributária e Aduaneira e segurança social portuguesa.

Com o Fatu-R, pode expandir as suas operações em Angola e Portugal de forma nativa e integrada, com todo o suporte aos regimes fiscais adequados de cada jurisdição e exportação para arquivos SAF-T regulamentares.`,
      date: "28 April 2026",
      readTime: "8 min de leitura",
      category: "Empresas",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 8,
      title: "Pedroso Remodelação e Construção: gestão otimizada com o Fatu-R",
      excerpt: "Com o Fatu-R, a empresa Pedroso Remodelação e Construção ganhou tempo e eficácia. Saiba mais sobre este software de faturação para construção civil.",
      content: `O setor de Construção Civil e Obras Públicas exige grande rigor fiscal devido ao controlo de orçamentos flexíveis, faturas de avenças por percentagem de conclusão e controlo permanente de inventário móvel nos estaleiros de obra.

A empresa Pedroso Remodelação e Construção implementou a solução integrada Fatu-R e relatou grandes benefícios:
- Emissão Instantânea de Proformas (PP): Orçamentos ricos e detalhados gerados diretamente no telemóvel para clientes nas obras.
- Faturação Rápida de Adiantamentos: Controlo fluido de pagamentos intercalares associados ao estado das obras.
- Centralização Multifilial: A gerência acompanha a tesouraria de múltiplos estaleiros em tempo real, sem necessidade de deslocações.

Descubra como o Fatu-R pode tornar a gestão da sua empresa de obras mais digital, moderna e segura contra erros manuais.`,
      date: "23 April 2026",
      readTime: "5 min de leitura",
      category: "Integrações",
      type: "novidades",
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 9,
      title: "O que é a metodologia Agile e como aplicar a um pequeno negócio?",
      excerpt: "A metodologia Agile aplica-se à gestão de projetos. Saiba como pode usá-la no seu pequeno negócio.",
      content: `A metodologia Agile nasceu no desenvolvimento de software, mas os seus princípios de adaptabilidade, ciclos de feedback curtos, auto-organização de equipas e focagem no cliente estenderam-se a todos os ramos de atividade empresariais.

Pilares Importantes:
1. Colaboração em detrimento do isolamento contratual rígido.
2. Resposta rápida face às alterações do ambiente em vez de aderência mecânica a um plano obsoleto.
3. Entrega de valor utilizável o mais cedo possível.

Como utilizar em pequenas empresas de retalho ou serviços:
- Realize reuniões diárias em pé de 10 minutos (Daily Standup) para identificar barreiras operacionais.
- Crie um painel visual simples (Kanban) com colunas: Por Fazer, Em Curso, e Concluído.
- Fomente a comunicação direta e celebre entregas menores de produtos viáveis.`,
      date: "19 April 2026",
      readTime: "6 min de leitura",
      category: "Empreendedorismo",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 10,
      title: "Fatu-R transforma gestão de clínica de fisioterapia - Centro NPP",
      excerpt: "O impacto do Fatu-R no Centro NPP é um caso real de transformação: faturação rápida, gestão organizada e maior eficiência no atendimento ao paciente.",
      content: `No Centro NPP, clínica líder de fisioterapia, reabilitação e bem-estar, as maiores dificuldades operacionais envolviam o agendamento de consultas concatenado com a receção rápida do pagamento e emissão do comprovativo respetivo para comparticipação dos seguros de saúde dos utentes.

A adoção do Fatu-R resultou nas seguintes melhorias:
1. Ponto de Venda (POS) de Balcão Ativo: Faturação de tratamentos e sessões efetuada em menos de 10 segundos na própria secretária de acolhimento.
2. Impostos Corretos: Utilização da taxa padrão reduzida conforme o enquadramento de serviços de saúde.
3. Histórico de Utente: Acesso centralizado ao histórico de faturas e pagamentos de cada cliente para esclarecimento de eventuais reembolsos.

Simplifique a contabilidade do seu espaço de clínica de estética, cabeleireiro ou saúde com o Fatu-R.`,
      date: "14 April 2026",
      readTime: "5 min de leitura",
      category: "Cosmética, Estética e Cabeleireiros",
      type: "novidades",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 11,
      title: "Black Friday: como preparar o seu negócio",
      excerpt: "Preparar a sua empresa para a Black Friday vai ajudar a aumentar as vendas e atrair mais clientes. Conheça algumas dicas e estratégias.",
      content: `A Black Friday converteu-se no fim-de-semana mais proveitoso do ano comercial para marcas de retalho e serviços em todo o planeta. Uma operação de sucesso exige preparação e estratégias de marketing digital.

Preparação Essencial:
1. Estruture as Promoções Antecipadamente: Calcule de forma realista quais as margens de desconto suportáveis sem sacrificar o lucro operacional.
2. Reforce o Seu Inventário: Garanta stocks suplementares dos seus bens mais procurados utilizando o painel integrado de controlo de armazéns do Fatu-R.
3. Prepare o POS para o Tráfego Alto: Com o Fatu-R, as vendas de balcão correm de forma rápida e segura, inclusive no telemóvel, evitando filas de espera incómodas para os clientes.

Descubra o poder de gerir as suas promoções com um software preparado para picos máximos de faturação de forma segura.`,
      date: "09 April 2026",
      readTime: "7 min de leitura",
      category: "Marketing Digital",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 12,
      title: "Faturação eletrónica obrigatória: prepare-se para 2026",
      excerpt: "A faturação eletrónica em Angola é obrigatória a partir de 2026. Saiba o que muda, como se preparar e como o Fatu-R simplifica a transição digital.",
      content: `A Autoridade Tributária de Angola (AGT) está a impulsionar o avanço civilizatório digital com a obrigatoriedade da faturação eletrónica em tempo-real em todo o território nacional.

A partir de 2026, todas as empresas em regime geral ou de exclusão com volume de negócios relevante serão obrigadas a submeter as faturas informaticamente certificadas por canais eletrónicos integrados.

O Que Muda de Prático:
- Fim definitivo das faturas manuais em papel de bloco ou faturas precárias em editores de texto tradicionais.
- Assinatura digital gerada informaticamente no momento das vendas.
- Obrigatoriedade de exportação regular de ficheiro SAF-T AO contendo todo o histórico contábil.

O Fatu-R é o seu maior parceiro nesta transição. Certificado pela AGT sob a licença de nº 142/AGT, permite-lhe manter-se em 100% de conformidade com zero preocupações.`,
      date: "04 April 2026",
      readTime: "8 min de leitura",
      category: "Fiscalidade",
      type: "novidades",
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 13,
      title: "Consultor Imobiliário: o que faz, quanto ganha e competências",
      excerpt: "Como ser consultor imobiliário? Como começar e o que é preciso para alcançar o sucesso? Saiba tudo sobre esta profissão.",
      content: `A profissão de consultor imobiliário em mercados em forte expansão é uma oportunidade de alta produtividade pessoal. Um profissional bem-sucedido associa inteligência emocional e técnica.

Competências Fundamentais:
1. Flexibilidade de Negociação e Gestão de Conflitos.
2. Excelência de Escuta Ativa para corresponder às reais espectativas orçamentais e espaciais do cliente.
3. Noção de Custos Fiscais no momento de aquisição de imóveis.

Para a gestão das suas comissões e emissão rápida de faturas de prestação de serviços, utilize o Fatu-R diretamente no seu dispositivo móvel durante as visitas físicas. Agilidade máxima sem atrasos na entrega do serviço de intermediação.`,
      date: "29 March 2026",
      readTime: "6 min de leitura",
      category: "Freelancers",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 14,
      title: "6 estratégias de gestão de vendas para pequenos negócios",
      excerpt: "A gestão de vendas tem um papel essencial no sucesso de qualquer empresa. Conheça as estratégias e tecnologias que ajudam a vender mais e melhor.",
      content: `Transformar simples contactos ou visitantes ocasionais em clientes fiéis exige processos comerciais refinados de vendas. Aqui estão seis estratégias que trazem resultados rápidos para PMEs:

1. Estude o Perfil do Consumidor Fiel para guiar novas promoções de stock.
2. Estabeleça Metas Claras e Recompensas Reais baseadas no esforço da equipa comercial.
3. Forneça Canais de Atendimento Omnicanal eficientes.
4. Utilize Software Moderno: A gestão de faturas, relatórios de fecho de caixa e performance comercial é 100% fluida no painel online do Fatu-R.
5. Invista no Pós-Venda: Contacte os clientes enviando promoções adicionais segmentadas.
6. Monitore as Taxas de Conversão e ajuste os preços dinamicamente.`,
      date: "22 March 2026",
      readTime: "5 min de leitura",
      category: "Marketing Digital",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1552581230-c01bc9148c00?auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 15,
      title: "Precificação: como definir o preço dos seus produtos?",
      excerpt: "Quais os fatores que deve ter em conta para definir o preço dos seus produtos? Conheça as melhores estratégias de preços.",
      content: `A precificação inteligente está no limiar que separa a saúde financeira operacional de uma empresa da sua ruína precoce. Definir preços de forma empírica ou apenas para subcotar rivais é um perigo sistémico grave.

Parâmetros Críticos na Precificação:
1. Custos Variáveis Unitários: Matérias primas, custo de aquisição da mercadoria junto do fornecedor parceiro.
2. Custos Fixos Prorrateados: Salários folha de pagamento, água, luz, subscrições de sistemas informatizados (como o Fatu-R).
3. Lucro Líquido Esperado: Meta definida de retorno financeiro absoluto.
4. Impostos e Taxas Fiscais (como o IVA de 14% aplicável).

O Fatu-R ajuda-o a registar as margens exatas na sua listagem de produtos e serviços para garantir que a sua margem de contribuição seja positiva e propulsora de lucros sustentáveis.`,
      date: "15 March 2026",
      readTime: "6 min de leitura",
      category: "Empreendedorismo",
      type: "informacoes",
      image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80"
    }
  ], []);

  // Filter and Search logic
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // 1. Text Search matching title, excerpt or body
      const matchesSearch = searchQuery === '' || 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Type matching (Novidades, Ajuda, Informações)
      const matchesType = selectedType === 'all' || post.type === selectedType;

      // 3. Category match
      const matchesCategory = !selectedCategory || post.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [posts, searchQuery, selectedType, selectedCategory]);

  // Handle local Pagination simulation: 15 posts total
  // Let's divide into pages of 5 posts.
  const postsPerPage = 5;
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * postsPerPage;
    return filteredPosts.slice(startIndex, startIndex + postsPerPage);
  }, [filteredPosts, currentPage]);

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage) || 1;

  // Categories list requested
  const categoriesList = [
    { name: "Integrações", count: 1 },
    { name: "Freelancers", count: 2 },
    { name: "Restauração, Cafetaria e Bar", count: 0 },
    { name: "Padaria e Pastelaria", count: 0 },
    { name: "Venda a Retalho", count: 0 },
    { name: "Bares", count: 0 },
    { name: "Papelaria", count: 0 },
    { name: "Ginásios", count: 0 },
    { name: "Cosmética, Estética e Cabeleireiros", count: 1 },
    { name: "POS - Ponto de Venda", count: 0 },
    { name: "Novidades Fatu-R", count: 0 },
    { name: "Alojamento Local", count: 0 },
    { name: "Empreendedorismo", count: 4 },
    { name: "Marketing Digital", count: 2 },
    { name: "Empresas", count: 2 },
    { name: "Fiscalidade", count: 2 },
    { name: "Autoridade Tributária", count: 0 },
    { name: "Recursos Humanos", count: 0 },
    { name: "Obrigações Fiscais", count: 0 },
    { name: "Faturação", count: 1 }
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white py-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.03] pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <button 
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider mb-4 transition-colors cursor-pointer group"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Voltar ao Início
            </button>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
              Blog do Software de <span className="text-orange-500">Faturação</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium">
              Aprenda a gerir o seu pequeno negócio, acompanhe as novidades da faturação eletrónica da AGT e maximize as suas vendas com o Fatu-R.
            </p>
          </div>

          <button
            onClick={onRegister}
            className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-full transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
          >
            Experimente Grátis
          </button>
        </div>
      </div>

      {/* Main Grid Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Category Filters & Special Tabs */}
        <div className="lg:col-span-3 space-y-6">
          {/* Quick Filters tab: Novidades, Ajuda, Informações */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-150 pb-3">
              <Sparkles size={14} className="text-orange-500" /> Canais do Blog
            </h3>
            <div className="flex flex-col gap-2 font-bold text-xs text-slate-600">
              <button 
                onClick={() => { setSelectedType('all'); setSelectedCategory(null); setCurrentPage(1); }} 
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all inline-flex items-center justify-between cursor-pointer ${
                  selectedType === 'all' && !selectedCategory ? 'bg-orange-50 text-orange-600 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span>Tudo</span>
              </button>
              <button 
                onClick={() => { setSelectedType('novidades'); setSelectedCategory(null); setCurrentPage(1); }} 
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all inline-flex items-center justify-between cursor-pointer ${
                  selectedType === 'novidades' ? 'bg-orange-50 text-orange-600 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Novidades
                </span>
              </button>
              <button 
                onClick={() => { setSelectedType('ajuda'); setSelectedCategory(null); setCurrentPage(1); }} 
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all inline-flex items-center justify-between cursor-pointer ${
                  selectedType === 'ajuda' ? 'bg-orange-50 text-orange-600 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Ajuda & Tutoriais
                </span>
              </button>
              <button 
                onClick={() => { setSelectedType('informacoes'); setSelectedCategory(null); setCurrentPage(1); }} 
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all inline-flex items-center justify-between cursor-pointer ${
                  selectedType === 'informacoes' ? 'bg-orange-50 text-orange-600 font-extrabold' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Informações
                </span>
              </button>
            </div>
          </div>

          {/* Categories Block */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-150 pb-3">
              <Tag size={14} className="text-orange-500" /> Categorias
            </h3>
            <div className="max-h-[360px] overflow-y-auto pr-1 flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              {categoriesList.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                    setSelectedType('all');
                    setCurrentPage(1);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                    selectedCategory === cat.name 
                      ? 'bg-slate-900 border border-slate-900 text-white font-black' 
                      : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {cat.count > 0 && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                      selectedCategory === cat.name ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center/Right Side: Articles & Search */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Search Header box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Pesquisar artigos de ajuda, novidades ou informações do mercado..."
                className="w-full pl-11 pr-4 py-3 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-xs"
              />
            </div>
          </div>

          {/* Conditional rendering: Reading State vs Standard List */}
          {selectedPost ? (
            /* VER MAIS - READ ARTICLE DETAILED VIEW */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden min-h-[50vh] p-6 sm:p-10 space-y-8 animate-fade-in">
              <button
                onClick={() => setSelectedPost(null)}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-black font-black text-[11px] uppercase tracking-wider transition-colors cursor-pointer group"
              >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Voltar ao Blog
              </button>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-700 py-1 px-3 rounded-full">
                    {selectedPost.category}
                  </span>
                  <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-700 py-1 px-3 rounded-full">
                    {selectedPost.type === 'novidades' ? 'Novidades' : selectedPost.type === 'ajuda' ? 'Ajuda' : 'Informações'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold inline-flex items-center gap-1">
                    <Clock size={12} /> {selectedPost.readTime}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  {selectedPost.title}
                </h2>

                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Publicado em {selectedPost.date}
                </p>
              </div>

              {/* Large Cover Image */}
              <img 
                src={selectedPost.image} 
                className="w-full max-h-[380px] object-cover rounded-3xl border border-slate-150" 
                alt={selectedPost.title}
                referrerPolicy="no-referrer"
              />

              {/* Parsed Blog Content (Simple formatting) */}
              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium space-y-4 max-w-4xl">
                {selectedPost.content}
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 p-6 rounded-2xl">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Pronto para digitalizar o seu negócio?</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Software de faturação online adaptado sem limites.</p>
                </div>

                <button
                  onClick={onRegister}
                  className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer transition-all"
                >
                  Experimentar Grátis
                </button>
              </div>
            </div>
          ) : (
            /* ARTICLES LIST VIEW */
            <div className="space-y-6">
              {paginatedPosts.length === 0 ? (
                <div className="bg-white p-12 text-center text-slate-400 rounded-3xl border border-slate-200/80">
                  <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-sm">Nenhum artigo encontrado para o critério de pesquisa.</p>
                  <p className="text-xs text-slate-400 mt-1">Experimente limpar a sua palavra-chave ou usar canais alternativos.</p>
                </div>
              ) : (
                paginatedPosts.map(post => (
                  <div 
                    key={post.id} 
                    className="bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 p-5 items-stretch"
                  >
                    {/* Cover photo */}
                    <div className="md:col-span-4 h-48 md:h-full min-h-[160px] rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner shrink-0 leading-none">
                      <img 
                        src={post.image} 
                        className="w-full h-full object-cover select-none" 
                        alt={post.title}
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 text-[9px] font-black uppercase text-white bg-slate-900/80 backdrop-blur-sm py-1 px-2.5 rounded-lg border border-white/10">
                        {post.category}
                      </span>
                    </div>

                    {/* Meta/Text content */}
                    <div className="md:col-span-8 flex flex-col justify-between py-1">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                          <span>{post.date}</span>
                          <span>•</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-black uppercase tracking-wider">
                            {post.type === 'novidades' ? 'Novidades' : post.type === 'ajuda' ? 'Ajuda' : 'Informações'}
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                            <Clock size={12} /> {post.readTime}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug tracking-tight hover:text-orange-500 transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-semibold">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center mt-3">
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="inline-flex items-center gap-1 text-xs font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest cursor-pointer transition-all hover:translate-x-1"
                        >
                          Ver Mais <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* PAGINATION PANEL */}
              {totalPages > 1 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 bg-slate-50 select-none hover:bg-slate-100 text-slate-600 rounded-xl disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                            currentPage === pageNum 
                              ? 'bg-black text-white font-black' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 bg-slate-50 select-none hover:bg-slate-100 text-slate-600 rounded-xl disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Página {currentPage} de {totalPages}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER CALL TO ACTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-orange-500/10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.04] pointer-events-none" />
          <div className="max-w-2xl mx-auto relative z-10 space-y-6">
            <h2 className="text-xl sm:text-3xl font-black leading-none uppercase tracking-wide">
              Software de Faturação e POS sem limites. <br />
              <span className="text-slate-900 block mt-2 text-lg sm:text-xl font-bold">30 Dias Gratuitos sem compromisso!</span>
            </h2>

            <button
              onClick={onRegister}
              className="px-8 h-12 bg-slate-950 hover:bg-slate-900 text-white font-black uppercase text-xs tracking-wider rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Experimente Grátis
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-900 px-4 sm:px-6 lg:px-8 text-xs mt-16">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Main Footer Columns Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            
            {/* Column 1: Porquê o Fatu-R */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Porquê o Fatu-R?</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Loja Online Grátis - Fatu-R Go</button></li>
                <li><button onClick={() => onBack('videos')} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Testemunhos de Sucesso</button></li>
                <li><button onClick={() => onBack('desktop-offline')} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Fatu-R Desktop Offline</button></li>
              </ul>
            </div>

            {/* Column 2: Negócios & Setores */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Negócios</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Software de Facturação</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Software POS Comercial</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Software Loja de Roupa</button></li>
              </ul>
            </div>

            {/* Column 3: Suporte & Recursos */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Suporte</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={() => { setSelectedPost(null); setSelectedCategory(null); setSelectedType('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Blog & Recursos</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Centro de Ajuda</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Sobre Nós</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">API para Programadores</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Contactos e Apoio</button></li>
              </ul>
            </div>

            {/* Column 4: Conta & Legal */}
            <div className="space-y-4">
              <h4 className="text-white font-black text-xs uppercase tracking-wider">Conta</h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li><button onClick={onRegister} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Login / Entrar</button></li>
                <li><button onClick={onRegister} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Criar Conta Grátis</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Termos e Condições</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Política de Privacidade</button></li>
                <li><button onClick={() => onBack()} className="hover:text-orange-500 transition-colors text-left cursor-pointer">Proteção de Dados</button></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Brand Name only */}
            <div className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight text-white">
                Fatu<span className="text-orange-500">-R</span>
              </span>
            </div>

            {/* Center: Social Networks */}
            <div className="flex gap-5 items-center">
              <span className="text-slate-500 hover:text-white transition-colors cursor-pointer"><Facebook size={20} /></span>
              <span className="text-slate-500 hover:text-white transition-colors cursor-pointer flex items-center justify-center font-black text-lg tracking-tighter w-6 h-6 leading-none">G</span>
              <span className="text-slate-500 hover:text-white transition-colors cursor-pointer"><Youtube size={20} /></span>
              <span className="text-slate-500 hover:text-white transition-colors cursor-pointer"><Linkedin size={20} /></span>
              <span className="text-slate-500 hover:text-white transition-colors cursor-pointer"><Instagram size={20} /></span>
            </div>

            {/* Right: Copyright & regulation */}
            <p className="text-[10px] text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Fatu-R. Todos os direitos reservados. Software de Faturação certificado nº 142/AGT.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
