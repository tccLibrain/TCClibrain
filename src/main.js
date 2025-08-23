import { renderLoginPage } from './components/LoginPage.js';
import { renderBookList } from './components/BookList.js';
import { renderUserDashboard } from './components/UserDashboard.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderUserProfile } from './components/UserProfile.js';
import { renderBookDetails } from './components/BookDetails.js';
import { createShell } from './components/MenuHeaderFooter.js';

const app = document.getElementById('app');

// Inicializa o app
export function initApp() {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    // Se não estiver logado, mostra tela de login
    renderLoginPage(app);
  } else {
    // Se estiver logado, garante que a shell está criada
    if (!document.querySelector('.menu-header')) {
      createShell(app);
    }
    // Navega para a tela correta com base no tipo do usuário
    navigateTo(user.tipo === 'admin' ? 'admin' : 'books');
  }
}

// Função de navegação
export function navigateTo(screen, params = {}) {
  const user = JSON.parse(localStorage.getItem('user'));

  // Se não estiver logado e tentar outra tela → volta para login
  if (!user && screen !== 'login') {
    renderLoginPage(app);
    return;
  }

  // Se for login → remove shell e renderiza login
  if (screen === 'login') {
    app.innerHTML = '';
    renderLoginPage(app);
    return;
  }

  // Se usuário está logado mas shell ainda não existe → cria
  if (!document.querySelector('.menu-header')) {
    createShell(app);
  }

  const content = document.querySelector('.content');
  if (!content) return;

  // Limpa o conteúdo atual
  content.innerHTML = '';

  switch (screen) {
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
    case 'admin':
      if (user.tipo === 'admin') {
        renderAdminPanel(content);
      } else {
        alert('Acesso negado!');
        renderBookList(content);
      }
      break;
    default:
      renderBookList(content);
  }
}

// Logout global
document.addEventListener('click', (e) => {
  if (e.target.id === 'logoutBtn') {
    localStorage.removeItem('user');
    navigateTo('login');
  }
});

// Inicia a aplicação
initApp();
