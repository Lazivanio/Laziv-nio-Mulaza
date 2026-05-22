export interface Feature {
  id: string;
  title: string;
  description: string;
}

export interface Plan {
  name: string;
  badge: string;
  priceAnnually: string;
  priceMonthly: string;
  billedAnnuallyTotal: string;
  features: string[];
  popular: boolean;
  buttonText: string;
}

export interface Testimonial {
  business: string;
  quote: string;
  author: string;
  location: string;
  stars: number;
  tag: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface WhyChoose {
  title: string;
  sub: string;
  desc: string;
  badge: string;
}

export const featuresList: Feature[] = [
  {
    id: "faturacao",
    title: "Séries de Faturação Simplificadas",
    description: "Emita FT, FR, proformas (PP) e notas em total conformidade legal e com numeração sequencial certificada pela AGT."
  },
  {
    id: "retalho",
    title: "Armazém & Gestão de Stock",
    description: "Controle de entradas, saídas, níveis críticos de stock e atribuição de produtos a armazéns específicos de forma simples."
  },
  {
    id: "restauracao",
    title: "Recursos Humanos & Salários",
    description: "Gestão do quadro de colaboradores, folha de ponto mensal e folhas de salários integradas ao sistema."
  },
  {
    id: "pos",
    title: "POS de Vendas do Operador",
    description: "Rápido e otimizado com abertura e fecho de caixas controlado, registo de quebras e impressão térmica flexível."
  },
  {
    id: "seguranca",
    title: "Auditorias & Relatórios AGT",
    description: "Geração de SAFT-A e relatórios de conformidade tributária e financeira em apenas alguns cliques."
  },
  {
    id: "cloud",
    title: "Sincronização em Tempo Real",
    description: "Os dados de POS sincronizam instantaneamente com o painel de administração e com a contabilidade do proprietário."
  }
];

export const pricingPlans: Plan[] = [
  {
    name: "Base",
    badge: "Faturação e Serviços",
    priceAnnually: "6.333,33",
    priceMonthly: "7.900,00",
    billedAnnuallyTotal: "76.000",
    features: [
      "Faturação e Gestão Básica",
      "2 Utilizadores Ativos",
      "Documentos Ilimitados",
      "Série de fatura padrão certificada",
      "Avenças e Contas Correntes",
      "Exportação automática SAF-T"
    ],
    popular: false,
    buttonText: "Começar Grátis"
  },
  {
    name: "Flex",
    badge: "Retalho & Negócios Locais",
    priceAnnually: "12.083,33",
    priceMonthly: "15.000,00",
    billedAnnuallyTotal: "145.000",
    features: [
      "Inclui todas as funcionalidades do Base",
      "5 Utilizadores Ativos",
      "POS Retalho Web, Android & Tablet",
      "Impressão em Talão Térmico e A4",
      "Controle de Autoconsumos",
      "Integrações dedicadas"
    ],
    popular: true,
    buttonText: "Escolha o Mais Popular"
  },
  {
    name: "Pro",
    badge: "Restauração & Retalho Avançado",
    priceAnnually: "15.833,33",
    priceMonthly: "19.500,00",
    billedAnnuallyTotal: "190.000",
    features: [
      "Inclui funcionalidades do Base e Flex",
      "Utilizadores Ilimitados",
      "POS Restaurante Web, Android & Tablet",
      "Terminais e ecrãs de cozinha ilimitados",
      "Variações, cores e tamanhos de artigos",
      "Gestão de Stocks, Lotes e Compras"
    ],
    popular: false,
    buttonText: "Obter Força Máxima"
  }
];

export const clientTestimonials: Testimonial[] = [
  {
    business: "VALLISMUSIC",
    quote: "Mudámos todo o nosso faturamento de retalho para o Fatu-R. A sincronização em tempo real das faturas e fluxos de caixa poupou-nos imenso tempo mensal.",
    author: "Ricardo Vallis",
    location: "Luanda",
    stars: 5,
    tag: "Retalho"
  },
  {
    business: "FRULY",
    quote: "O POS de restauração no tablet funciona com uma fluidez impressionante. Controlamos as mesas, dividimos contas em segundos e os funcionários adoram a facilidade.",
    author: "Ana Luísa Fruly",
    location: "Benguela",
    stars: 5,
    tag: "Restauração"
  },
  {
    business: "CNPP",
    quote: "Software de faturação online fantástico. Emitimos as nossas guias e fazemos o arquivo SAFT-A com um simples clique para reporte fiscal simplificado.",
    author: "Dr. Mateus Cruz",
    location: "Lubango",
    stars: 5,
    tag: "Serviços"
  },
  {
    business: "SHANTI",
    quote: "Gerir múltiplos estabelecimentos de estética e bem-estar a partir de uma visão geral de proprietário é imbatível. Acompanho o faturamento a partir de qualquer lugar.",
    author: "Sara Shanti",
    location: "Talatona",
    stars: 5,
    tag: "Clínicas & SPA"
  },
  {
    business: "DIGAL",
    quote: "A facilidade de emitir guias de transporte dos nossos armazéns descentralizados é um enorme ponto a favor. Sem complexidade nem paragens técnicas.",
    author: "Carlos Digal",
    location: "Viana",
    stars: 5,
    tag: "Logística"
  },
  {
    business: "NB FISIO",
    quote: "O suporte é ágil e ilimitado. Sempre que temos alguma dúvida técnica ou alteração tributária, temos resposta e solução imediata.",
    author: "Dra. Nair Neves",
    location: "Cabinda",
    stars: 5,
    tag: "Saúde"
  }
];

export const faqList: Faq[] = [
  {
    question: "É necessário instalar o Fatu-R POS?",
    answer: "Não. O Fatu-R é um programa de faturação certificado e sistema POS 100% online que funciona inteiramente na cloud (nuvem). Pode faturar em segundos num telemóvel, tablet ou computador tradicional sem precisar de instalar drivers ou software."
  },
  {
    question: "Posso comprar o Fatu-R POS juntamente com equipamento?",
    answer: "O Fatu-R é compatível com qualquer computador, telemóvel ou tablet. Funciona com as impressoras térmicas standard do mercado (talão 80mm ou 58mm), leitores de código de barras e gavetas de dinheiro ligadas por USB ou Bluetooth."
  },
  {
    question: "O Fatu-R POS exige apoio de um técnico para configurar?",
    answer: "Não. O sistema foi guiado pela máxima facilidade de utilização. Registar-se e começar a faturar demora menos de um minuto. Se já tem dados num outro software, a migração é simples e pode ser efetuada com a ajuda direta da nossa equipa de apoio técnico gratuito."
  },
  {
    question: "Existe algum período de fidelização obrigatório?",
    answer: "Nenhum. No Fatu-R não existem contratos obrigatórios nem períodos de permanência. A verdadeira fidelização advém da satisfação do utilizador. Pode cancelar a sua subscrição ou alterar de plano a qualquer momento sem custos adicionais."
  },
  {
    question: "Impressoras Térmicas ou Standard em formato talão ou A4?",
    answer: "O Fatu-R é flexível. Suporta a emissão e impressão de documentos fiscais em formato clássico de folha A4 (perfeito para escritórios) ou em formato térmico de talão rápido (ideal para frentes de loja, supermercados e restaurantes)."
  }
];

export const whyChooseList: WhyChoose[] = [
  {
    title: "É simples, prático e intuitivo.",
    sub: "Porquê escolher o Fatu-R POS?",
    desc: "Estes são os principais adjetivos usados pelos nossos clientes para descrever o Fatu-R e não poderíamos ficar mais contentes. Se prefere soluções limpas, rápidas e sem complicações técnicas, somos ideais para o seu negócio.",
    badge: "Fácil de Operar"
  },
  {
    title: "Sem contratos, nem burocracias.",
    sub: "Porquê escolher o Fatu-R POS?",
    desc: "A fidelização advém puramente das nossas qualidades. No Fatu-R está livre para cancelar a sua subscrição a qualquer instante sem contratos adicionais de permanência.",
    badge: "Liberdade Total"
  },
  {
    title: "Melhor Suporte ao Cliente.",
    sub: "Porquê escolher o Fatu-R POS?",
    desc: "Temos uma equipa de suporte dedicada e de prontidão em Angola para responder imediatamente às necessidades do seu negócio. E sim! O nosso apoio técnico por central telefónica ou chat é 100% ilimitado e gratuito.",
    badge: "Suporte 24/7"
  },
  {
    title: "Migração Gratuita e Confortável.",
    sub: "Porquê escolher o Fatu-R POS?",
    desc: "Quer trazer o portefólio do seu antigo programa de faturação? Fazemos a transferência de dados e clientes com toda a comodidade necessária para não perturbar as suas operações diárias.",
    badge: "Esforço Zero"
  }
];
