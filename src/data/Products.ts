export type Product = {
  slug: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagem: string;
  imagens?: string[];
  tag?: string;
  descriptionFull?: string;
};

export const products: Product[] = [
  // --- NOUVEAU / LANÇAMENTOS ---
  {
    slug: "brinco-aurora",
    nome: "Brinco Aurora",
    descricao: "Banho premium • acabamento espelhado",
    preco: 89.9,
    imagem: "/peca1.jpg",
    imagens: ["/peca1.jpg", "/peca1-2.jpg"],
    tag: "Novidade",
    descriptionFull:
      "Brinco com acabamento espelhado e brilho intenso, ideal pra elevar qualquer look. Peça leve, confortável e com visual sofisticado. Cuidados: evite contato com água, perfume e produtos químicos; guarde em local seco.",
  },
  {
    slug: "colar-lumi",
    nome: "Colar Lumi",
    descricao: "Minimalista • brilho sutil",
    preco: 129.9,
    imagem: "/peca2.jpg",
    imagens: ["/peca2.jpg"],
    descriptionFull:
      "Colar minimalista com brilho discreto, perfeito pra uso diário e pra compor camadas. Cuidados: limpe com flanela macia e evite guardar com peças que possam riscar.",
  },
  {
    slug: "anel-eveil",
    nome: "Anel Éveil",
    descricao: "Ajustável • destaque do look",
    preco: 79.9,
    imagem: "/peca3.jpg",
    imagens: ["/peca3.jpg"],
    tag: "Destaque",
    descriptionFull:
      "Anel ajustável com presença e acabamento refinado. Cuidados: evite pressão excessiva ao ajustar e não use em piscina/mar.",
  },
  {
    slug: "pulseira-nouveau",
    nome: "Pulseira Nouveau",
    descricao: "Clássica • fácil de combinar",
    preco: 99.9,
    imagem: "/peca4.jpg",
    imagens: ["/peca4.jpg"],
    descriptionFull:
      "Pulseira clássica e versátil pra combinar com relógio e outras peças. Cuidados: retire antes do banho e ao usar cremes/óleos; guarde na embalagem.",
  },

  // --- SEMIJOIAS ---
  {
    slug: "colar-dourado",
    nome: "Colar Dourado",
    descricao: "Banho de ouro • brilho elegante",
    preco: 149.9,
    imagem: "/ouro1.png",
    imagens: ["/ouro1.png"],
    tag: "Novo",
    descriptionFull:
      "Colar com banho dourado e visual elegante, perfeito para compor camadas ou usar sozinho. Cuidados: evite água, perfume e produtos químicos; limpe com flanela macia e guarde na embalagem.",
  },
  {
    slug: "brinco-gota",
    nome: "Brinco Gota",
    descricao: "Leve • perfeito pro dia a dia",
    preco: 79.9,
    imagem: "/ouro2.png",
    imagens: ["/ouro2.png"],
    descriptionFull:
      "Brinco leve e confortável, com brilho na medida certa. Ideal para uso diário. Cuidados: retire antes do banho e evite contato com cremes/perfumes.",
  },
  {
    slug: "anel-ajustavel",
    nome: "Anel Ajustável",
    descricao: "Acabamento premium • confortável",
    preco: 89.9,
    imagem: "/ouro3.png",
    imagens: ["/ouro3.png"],
    tag: "Destaque",
    descriptionFull:
      "Anel ajustável com acabamento premium e caimento confortável. Cuidados: ajuste com delicadeza, evite pressão excessiva e não use em piscina/mar.",
  },
  {
    slug: "pulseira-delicada",
    nome: "Pulseira Delicada",
    descricao: "Minimalista • combina com tudo",
    preco: 99.9,
    imagem: "/ouro4.png",
    imagens: ["/ouro4.png"],
    descriptionFull:
      "Pulseira minimalista e versátil para combinar com outras peças. Cuidados: retire ao usar cremes/óleos e guarde separada para evitar atrito.",
  },

  // --- PRATAS 925 ---
  {
    slug: "brinco-prata-925",
    nome: "Brinco Prata 925",
    descricao: "Prata 925 • brilho delicado",
    preco: 79.9,
    imagem: "/prata1.png",
    imagens: ["/prata1.png"],
    tag: "925",
    descriptionFull:
      "Brinco em Prata 925 com brilho delicado e acabamento polido. Cuidados: guarde em local seco e limpe com flanela própria para prata.",
  },
  {
    slug: "colar-prata-925",
    nome: "Colar Prata 925",
    descricao: "Minimalista • perfeito pro dia a dia",
    preco: 139.9,
    imagem: "/prata2.png",
    imagens: ["/prata2.png"],
    descriptionFull:
      "Colar em Prata 925, minimalista e fácil de combinar. Ideal para uso diário e para mix de colares. Cuidados: evite contato com produtos químicos e guarde separado.",
  },
  {
    slug: "anel-prata-925",
    nome: "Anel Prata 925",
    descricao: "Ajustável • acabamento polido",
    preco: 89.9,
    imagem: "/prata3.png",
    imagens: ["/prata3.png"],
    tag: "Destaque",
    descriptionFull:
      "Anel em Prata 925 com acabamento polido e ajuste confortável. Cuidados: ajuste com cuidado e limpe com flanela macia para manter o brilho.",
  },
  {
    slug: "pulseira-prata-925",
    nome: "Pulseira Prata 925",
    descricao: "Clássica • combina com tudo",
    preco: 99.9,
    imagem: "/prata4.png",
    imagens: ["/prata4.png"],
    descriptionFull:
      "Pulseira clássica em Prata 925, perfeita para usar sozinha ou com relógio. Cuidados: evite água do mar/piscina e guarde na embalagem para reduzir oxidação.",
  },
];
