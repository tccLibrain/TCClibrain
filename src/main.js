import { renderLoginPage } from './components/LoginPage.js';
import { renderBookList } from './components/BookList.js';
import { renderUserDashboard } from './components/UserDashboard.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderUserProfile } from './components/UserProfile.js';
import { renderBookDetails } from './components/BookDetails.js';
import { renderUserRegistration } from './components/UserRegistration.js';
import { createShell } from './components/MenuHeaderFooter.js';
import { renderShelves } from './components/Shelves.js'; // Importa a nova função

const app = document.getElementById('app');

export function initApp() {
  const user = JSON.parse(localStorage.getItem('user'));

  if (user) {
    navigateTo(user.tipo === 'admin' ? 'admin' : 'books');
  } else {
    navigateTo('login');
  }
}

export function navigateTo(screen, params = {}) {
  const user = JSON.parse(localStorage.getItem('user'));

  // Se não estiver logado, só pode ir para login ou registro
  if (!user && screen !== 'login' && screen !== 'register') {
    screen = 'login';
  }

  // Cria shell apenas em telas que não sejam login ou registro
  if (!document.querySelector('.shell-header') && screen !== 'login' && screen !== 'register') {
    createShell(app);
  }

  // Limpa conteúdo da tela
  const content = document.querySelector('.content');
  if (screen === 'login' || screen === 'register') {
    app.innerHTML = ''; // limpar toda a div app para login/cadastro
  } else if (content) {
    content.innerHTML = '';
  }

  switch (screen) {
    case 'login':
      renderLoginPage(app);
      break;
    case 'register':
      renderUserRegistration(app); // aqui passar `app`, não `content`
      break;
    case 'books':
      renderBookList(content);
      break;
    case 'details':
      renderBookDetails(content, params.bookId);
      break;
    case 'dashboard':
      renderUserDashboard(content);
      break;
    case 'profile':
      renderUserProfile(content);
      break;
    case 'shelves': // Adiciona a nova case para a tela de prateleiras
      renderShelves(content);
      break;
    case 'admin':
      if (user?.tipo === 'admin') {
        renderAdminPanel(content);
      } else {
        alert('Acesso negado!');
        renderBookList(content);
      }
      break;
    default:
      renderBookList(content);
  }

  // Atualiza avatar do header se existir
  const avatarHeader = document.querySelector('.shell-header .avatar');
  if (avatarHeader && user) {
    avatarHeader.src = user.avatarUrl || 'https://i.pravatar.cc/150?img=12';
  }
}

// Logout global
document.addEventListener('click', e => {
  if (e.target.id === 'logout' || e.target.id === 'logoutBtn') {
    localStorage.removeItem('user');
    navigateTo('login');
  }
});

// Inicializa app
initApp();