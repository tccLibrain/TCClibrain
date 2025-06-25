import { books } from '../data/books.js';

export function renderBookList(container) {
  const user = JSON.parse(localStorage.getItem('user')) || { nome: 'Visitante' };

  // Guarda o valor atual da busca
  let buscaAtual = '';

  // Função para renderizar a lista filtrada
  function renderLivrosFiltrados(filtro) {
    // Filtra livros pelo título ou autor, case-insensitive
    const livrosFiltrados = books.filter(book =>
      book.title.toLowerCase().includes(filtro.toLowerCase()) ||
      (book.autor && book.autor.toLowerCase().includes(filtro.toLowerCase()))
    );

    // Agrupa por gênero
    const livrosPorGenero = {};
    livrosFiltrados.forEach(book => {
      if (!livrosPorGenero[book.genero]) livrosPorGenero[book.genero] = [];
      livrosPorGenero[book.genero].push(book);
    });

    // Gera HTML das categorias
    return Object.entries(livrosPorGenero).map(([genero, livros]) => `
      <section class="categoria">
        <h2>${genero.toUpperCase()}</h2>
        <div class="livros-grid">
          ${livros.map(book => `
            <div class="livro-card" onclick="navigateTo('details', { bookId: ${book.id} })">
              <img src="${book.imagem || 'https://via.placeholder.com/100x150'}" alt="${book.title}" />
            </div>
          `).join('')}
        </div>
      </section>
    `).join('');
  }

  container.innerHTML = `
    <div id="menu-lateral" class="menu-lateral">
      <ul>
        <li onclick="navigateTo('dashboard')">Dashboard</li>
        <li onclick="navigateTo('books')">Livros</li>
        <li onclick="logout()">Sair</li>
      </ul>
    </div>

    <div id="overlay-menu" class="overlay hidden"></div>

    <div class="header">
      <img src="${user.foto || 'https://via.placeholder.com/40'}" class="perfil" />
      <h1 class="titulo-logo">LIBRAIN</h1>
      <button class="menu-btn">☰</button>
    </div>

    <div class="search-bar">
      <input type="text" placeholder="Buscar livro..." id="search-input" />
      <button id="search-btn">🔍</button>
    </div>

    <div class="categorias-container" id="categorias-container">
      ${renderLivrosFiltrados('')}
    </div>

    <footer class="footer-nav"></footer>
  `;

  // Evento para busca ao clicar no botão
  const inputBusca = container.querySelector('#search-input');
  const botaoBusca = container.querySelector('#search-btn');
  const containerCategorias = container.querySelector('#categorias-container');

  function atualizarBusca() {
    const texto = inputBusca.value.trim();
    containerCategorias.innerHTML = renderLivrosFiltrados(texto);
  }

  botaoBusca.onclick = atualizarBusca;

  // Também pode buscar ao digitar Enter na input
  inputBusca.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') atualizarBusca();
  });

  // Ativa o menu lateral
  setupMenuToggle();
}
