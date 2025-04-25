import { books } from '../data/books.js';

export function renderBookList(container) {
  const user = JSON.parse(localStorage.getItem('user')) || { nome: 'Visitante' };

  // Agrupar por gênero
  const livrosPorGenero = {};
  books.forEach(book => {
    if (!livrosPorGenero[book.genero]) livrosPorGenero[book.genero] = [];
    livrosPorGenero[book.genero].push(book);
  });

  // HTML de categorias
  const categoriasHtml = Object.entries(livrosPorGenero).map(([genero, livros]) => `
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

  container.innerHTML = `
    <div class="header">
      <img src="${user.foto || 'https://via.placeholder.com/40'}" class="perfil" />
      <h1 class="titulo-logo">LIBRAIN</h1>
      <button class="menu-btn">☰</button>
    </div>

    <div class="search-bar">
      <input type="text" placeholder="Buscar livro..." />
      <button>🔍</button>
    </div>

    <div class="categorias-container">
      ${categoriasHtml}
    </div>

    <footer class="footer-nav">
      <button onclick="navigateTo('books')">🏠</button>
      <button onclick="navigateTo('dashboard')">👤</button>
      <button onclick="navigateTo('notificacoes')">📚</button>
    </footer>

    <!-- Menu lateral -->
    <div id="menu-lateral" class="menu-lateral hidden">
      <ul>
        <li onclick="navigateTo('perfil')">👤 Perfil</li>
        <li onclick="navigateTo('notificacoes')">🔔 Notificações</li>
        <li onclick="navigateTo('suporte')">🛠 Suporte</li>
        <li onclick="navigateTo('dashboard')">📚 Estante</li>
        <li onclick="navigateTo('feedback')">📝 Feedback</li>
        <li onclick="navigateTo('config')">⚙️ Configurações</li>
      </ul>
    </div>
    <div id="overlay" class="overlay hidden"></div>
  `;

  // Mostrar/esconder menu lateral
  setTimeout(() => {
    const menuBtn = document.querySelector('.menu-btn');
    const menuLateral = document.getElementById('menu-lateral');
    const overlay = document.getElementById('overlay');

    menuBtn?.addEventListener('click', () => {
      menuLateral.classList.add('show');
      overlay.classList.add('show');
      menuLateral.classList.remove('hidden');
      overlay.classList.remove('hidden');
    });

    overlay?.addEventListener('click', () => {
      menuLateral.classList.remove('show');
      overlay.classList.remove('show');
      menuLateral.classList.add('hidden');
      overlay.classList.add('hidden');
    });
  }, 0);
}
