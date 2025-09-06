import { navigateTo } from '../main.js';
import texto_e_livro from '../images/texto_e_livro.png';

export function createShell(appContainer) {
  // Evita renderizar o shell mais de uma vez
  if (document.querySelector('.shell-header')) {
    return;
  }

  const user = JSON.parse(localStorage.getItem('user'));
  const isAdmin = user && user.tipo === 'admin';

  let navLinksHtml = '';
  let footerHtml = '';
  
  if (isAdmin) {
    // Menu para o Administrador
    navLinksHtml = `
      <a href="#" id="logout">🚪 Sair</a>
    `;
    // Admins não precisam do footer de navegação
    footerHtml = ''; 
  } else {
    // Menu para o Usuário Comum
    navLinksHtml = `
      <a href="#" data-target="profile">👤 Perfil</a>
      <a href="#" data-target="dashboard">📊 Empréstimos & Reservas</a>
      <a href="#" data-target="shelves">📚 Prateleiras</a>
      <a href="#" data-target="books">📚 Livros</a>
      <a href="#" id="logout">🚪 Sair</a>
    `;
    // Footer de navegação para usuários comuns
    footerHtml = `
      <footer class="footer-nav">
        <button class="footer-btn active" data-target="books">🏠<span>Início</span></button>
        <button class="footer-btn" data-target="profile">👤<span>Perfil</span></button>
        <button class="footer-btn" data-target="shelves">📚<span>Prateleiras</span></button>
      </footer>
    `;
  }

  appContainer.innerHTML = `
    <header class="shell-header">
      <div class="header-left">
        <img src="${user?.avatarUrl || 'https://i.pravatar.cc/150?img=12'}" alt="avatar" class="avatar" id="avatar-img"/>
      </div>

      <div class="header-center">
        <img src="${texto_e_livro}" alt="Logo" class="logo"/>
      </div>

      <div class="header-right">
        <button class="menu-btn" id="hamburger">☰</button>
      </div>
    </header>

    <div id="menu-wrapper">
      <nav>${navLinksHtml}</nav>
    </div>

    <div id="overlay-menu"></div>

    <div class="content"></div>

    ${footerHtml}
  `;

  const menuWrapper = document.getElementById('menu-wrapper');
  const overlay = document.getElementById('overlay-menu');
  const hamburger = document.getElementById('hamburger');

  hamburger.addEventListener('click', () => {
    menuWrapper.classList.toggle('show');
    overlay.classList.toggle('show');
  });

  overlay.addEventListener('click', () => {
    menuWrapper.classList.remove('show');
    overlay.classList.remove('show');
  });

  menuWrapper.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.target) {
      navigateTo(a.dataset.target);
    } else if (a.id === 'logout') {
      localStorage.removeItem('user');
      navigateTo('login');
    }
    menuWrapper.classList.remove('show');
    overlay.classList.remove('show');
  });

  // Eventos do footer só são adicionados se o footer existir
  if (!isAdmin) {
    const footerBtns = document.querySelectorAll('.footer-btn');
    footerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        footerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        navigateTo(btn.dataset.target);
      });
    });
  }
}