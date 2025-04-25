export const books = [
  {
    id: 1,
    title: 'O Senhor dos Anéis',
    author: 'J.R.R. Tolkien',
    synopsis: 'Uma jornada épica pela Terra Média para destruir o Um Anel.',
    available: true,
    returnDate: null,
    reviews: [
      { user: 'Maria', rating: 5, comment: 'Obra-prima!' },
      { user: 'João', rating: 4, comment: 'Muito bom, mas longo.' }
    ],
    queue: []
  },
  {
    id: 2,
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    synopsis: 'Bentinho narra sua história com Capitu, marcada por dúvidas e ciúmes.',
    available: false,
    returnDate: '2025-04-10',
    reviews: [],
    queue: ['12345678900'] // CPF do próximo na fila
  }
];
