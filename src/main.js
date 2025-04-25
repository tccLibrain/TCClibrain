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

  setupMenuToggle(); // Garante que o menu funcione após renderizar nova tela
};

// Função global de logout
window.logout = () => {
  localStorage.removeItem('user');
  navigateTo('login');
};

// Lógica do menu lateral
function setupMenuToggle() {
  const menuBtn = document.querySelector('.menu-btn');
  const menuLateral = document.getElementById('menu-lateral');
  const overlay = document.getElementById('overlay-menu');

  if (menuBtn && menuLateral && overlay) {
    menuBtn.onclick = () => {
      menuLateral.classList.add('show');
      overlay.classList.remove('hidden');
    };

    overlay.onclick = () => {
      menuLateral.classList.remove('show');
      overlay.classList.add('hidden');
    };
  }
}

// Inicialização
function init() {
  renderLoginPage(app); // Abre tela de login
  setupMenuToggle(); // Ativa o menu lateral inicialmente
}

init();
