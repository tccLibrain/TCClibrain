import { renderBookList } from './components/BookList.js';
import { renderBookDetails } from './components/BookDetails.js';
import { renderUserRegistration } from './components/UserRegistration.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderLoginPage } from './components/LoginPage.js';
import { renderUserDashboard } from './components/UserDashboard.js';

const app = document.getElementById('app');

// Navegação entre páginas
window.navigateTo = (screen, data = {}) => {
  app.innerHTML = '';

  switch (screen) {
    case 'login':
      renderLoginPage(app);
      break;
    case 'books':
     renderBookList(app);
      setupMenuToggle();
      break;
    case 'details':
      renderBookDetails(app, data.bookId);
      break;
    case 'register':
      renderUserRegistration(app);
      break;
    case 'admin':
      renderAdminPanel(app);
      break;
    case 'dashboard':
      renderUserDashboard(app);
      break;
    default:
      renderLoginPage(app);
  }

  setupMenuToggle(); // Ativa o botão do menu lateral após renderizar
};

// Função global de logout
window.logout = () => {
  localStorage.removeItem('user');
  navigateTo('login');
};

// Fecha o menu lateral e o overlay
window.closeMenu = () => {
  const menuLateral = document.getElementById('menu-lateral');
  const overlay = document.getElementById('overlay-menu');
  if (menuLateral && overlay) {
    menuLateral.classList.remove('show');
    overlay.classList.add('hidden');
  }
};

// Ativa o botão do menu lateral (☰)
function setupMenuToggle() {
  const menuBtn = document.querySelector('.menu-btn');
  const menuLateral = document.getElementById('menu-lateral');
  const overlay = document.getElementById('overlay-menu');

  if (menuBtn && menuLateral && overlay) {
    menuBtn.onclick = () => {
      menuLateral.classList.add('show');
      overlay.classList.remove('hidden');
    };

    overlay.onclick = window.closeMenu;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.closeMenu();
      }
    });
  }
}

// Inicialização do app
function init() {
  navigateTo('login'); // Começa na tela de login
}

init();
