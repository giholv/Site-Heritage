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
];
