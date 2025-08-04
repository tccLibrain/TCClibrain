export function renderBookList(container) {
  const livrosPorGenero = {
    "Romance": [
      "Orgulho e Preconceito",
      "O Morro dos Ventos Uivantes",
      "Como Eu Era Antes de Você",
      "Outlander",
      "Anna Karenina",
      "Me Chame Pelo Seu Nome",
      "O Amor nos Tempos do Cólera",
      "Um Dia",
      "A Culpa é das Estrelas",
      "As Vantagens de Ser Invisível"
    ],
    "Terror": [
      "O Iluminado",
      "It: A Coisa",
      "Drácula",
      "Frankenstein",
      "O Exorcista",
      "Coraline",
      "A Casa do Pesadelo",
      "O Chamado de Cthulhu",
      "Assombração da Casa da Colina",
      "Mexa-se, Por Favor"
    ],
    "Mistério": [
      "Garota Exemplar",
      "O Código Da Vinci",
      "Os Homens que Não Amavam as Mulheres",
      "A Mulher na Janela",
      "O Silêncio dos Inocentes",
      "A Paciente Silenciosa",
      "Pequenas Grandes Mentiras",
      "No Escuro",
      "A Última Festa",
      "Verity"
    ],
    "Ficção Científica": [
      "Duna",
      "1984",
      "Admirável Mundo Novo",
      "Fundação",
      "Neuromancer",
      "Kindred",
      "Fahrenheit 451",
      "Jogador Nº 1",
      "O Conto da Aia",
      "A Longa Viagem a Um Pequeno Planeta Hostil"
    ],
    "Fantasia": [
      "Harry Potter",
      "O Senhor dos Anéis",
      "As Crônicas de Nárnia",
      "O Nome do Vento",
      "A Roda do Tempo",
      "Trono de Vidro",
      "Sombra e Ossos",
      "Mistborn",
      "Corte de Espinhos e Rosas",
      "A Canção do Sangue"
    ],
    "Clássicos": [
      "Dom Quixote",
      "Crime e Castigo",
      "O Grande Gatsby",
      "Moby Dick",
      "Os Miseráveis",
      "O Retrato de Dorian Gray",
      "A Metamorfose",
      "Cem Anos de Solidão",
      "Lolita",
      "A Revolução dos Bichos"
    ],
    "Young Adult": [
      "A Culpa é das Estrelas",
      "Jogos Vorazes",
      "Divergente",
      "Cidade dos Ossos",
      "Tartarugas Até Lá Embaixo",
      "A Seleção",
      "Os 13 Porquês",
      "Simon vs. A Agenda Homo Sapiens",
      "O Sol Também é uma Estrela",
      "O Ódio que Você Semeia"
    ],
    "Distopia": [
      "1984",
      "Admirável Mundo Novo",
      "O Conto da Aia",
      "Jogos Vorazes",
      "Fahrenheit 451",
      "Divergente",
      "Estação Onze",
      "Delírio",
      "Laranja Mecânica",
      "Legend"
    ]
  };

  async function buscarLivrosPorTitulos(generos) {
    const generosLivros = {};
    const cacheTitulos = {};

    const promisesGeneros = Object.entries(generos).map(async ([genero, titulos]) => {
      generosLivros[genero] = [];

      const livrosDoGenero = await Promise.all(titulos.map(async (titulo) => {
        if (cacheTitulos[titulo]) {
          return cacheTitulos[titulo];
        }

        const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(titulo)}&maxResults=1`;
        const resposta = await fetch(url);
        const dados = await resposta.json();
        const item = dados.items?.[0];

        if (item) {
          const livro = {
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors?.join(', ') || 'Autor desconhecido',
            imagem: item.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/120x180',
            link: item.volumeInfo.infoLink || '#'
          };
          cacheTitulos[titulo] = livro;
          return livro;
        }
        return null;
      }));

      generosLivros[genero] = livrosDoGenero.filter(Boolean);
    });

    await Promise.all(promisesGeneros);

    return generosLivros;
  }

  function gerarHTMLCarrossel(generosLivros) {
    return Object.entries(generosLivros).map(([genero, livros]) => `
      <h2 class="carrossel-titulo">${genero}</h2>
      <div class="carrossel-container">
        ${livros.map(book => `
          <div class="livro-card" title="${book.title} - ${book.author}">
            <a href="${book.link}" target="_blank">
              <img src="${book.imagem}" alt="${book.title}" loading="lazy" />
            </a>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  container.innerHTML = `
    <style>
      body {
        font-family: 'Segoe UI', sans-serif;
        background-color: #111;
        color: #fff;
      }

      .search-bar {
        display: flex;
        justify-content: center;
        margin: 30px 20px;
        gap: 8px;
        flex-wrap: wrap;
      }

      .search-bar input {
        padding: 12px 20px;
        font-size: 1rem;
        border-radius: 30px;
        border: 1px solid #ccc;
        width: 60%;
        max-width: 500px;
        outline: none;
      }

      .search-bar button {
        padding: 12px 24px;
        font-size: 1rem;
        border-radius: 30px;
        border: none;
        background-color: #e50914;
        color: white;
        cursor: pointer;
      }

      .search-bar button:hover {
        background-color: #b20710;
      }

      .carrossel-titulo {
        margin: 32px 20px 10px;
        font-size: 1.4rem;
        font-weight: bold;
        color: #fff;
      }

      .carrossel-container {
        display: flex;
        overflow-x: auto;
        padding: 10px 20px;
        gap: 12px;
        scroll-behavior: smooth;
      }

      .carrossel-container::-webkit-scrollbar {
        height: 8px;
      }

      .carrossel-container::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
      }

      .livro-card {
        flex: 0 0 auto;
        width: 120px;
        transition: transform 0.2s ease;
        cursor: pointer;
      }

      .livro-card:hover {
        transform: scale(1.1);
      }

      .livro-card img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
      }

      #resultados-container {
        margin-bottom: 50px;
      }
    </style>

    <div class="search-bar">
      <input type="text" id="search-input" placeholder="Digite o título do livro...">
      <button id="search-btn">Buscar</button>
    </div>

    <div id="resultados-container">
      <p style="text-align: center;">Carregando livros famosos...</p>
    </div>
  `;

  const input = container.querySelector('#search-input');
  const botao = container.querySelector('#search-btn');
  const resultados = container.querySelector('#resultados-container');

  async function executarBusca() {
    const termo = input.value.trim();
    if (termo.length === 0) return;

    resultados.innerHTML = `<p style="text-align: center;">Buscando livros...</p>`;
    const livros = await buscarLivrosPorTitulos({ Resultado: [termo] });
    resultados.innerHTML = gerarHTMLCarrossel(livros);
  }

  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      executarBusca();
    }
  });

  botao.addEventListener('click', executarBusca);

  // Carregar livros fixos por gênero (seus favoritos) com busca paralela e cache
  buscarLivrosPorTitulos(livrosPorGenero).then(generosLivros => {
    resultados.innerHTML = gerarHTMLCarrossel(generosLivros);
  });
}
