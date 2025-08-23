import { renderBookList } from './components/BookList.js';
import { renderBookDetails } from './components/BookDetails.js';
import { renderUserRegistration } from './components/UserRegistration.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderLoginPage } from './components/LoginPage.js';
import { renderUserDashboard } from './components/UserDashboard.js';

// Função de navegação
export function navigateTo(screen, data = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Salva a tela atual, exceto se for login
  if (screen !== 'login') {
    localStorage.setItem('currentPage', screen);
  }

  switch (screen) {
    case 'login':
      renderLoginPage(app);
      break;
    case 'books':
      renderBookList(app);
      break;
    case 'details':
      if (data.bookId !== undefined) {
        renderBookDetails(app, data.bookId);
      } else {
        console.warn('navigateTo: faltando bookId para details');
        renderBookList(app);
      }
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
      console.warn(`navigateTo: tela "${screen}" desconhecida, redirecionando para login`);
      renderLoginPage(app);
  }
}

// Inicializa app mantendo usuário logado
window.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const lastPage = localStorage.getItem('currentPage');

  if (user) {
    if (user.tipo === 'admin') {
      navigateTo('admin');
    } else {
      navigateTo(lastPage && lastPage !== 'login' ? lastPage : 'books');
    }
  } else {
    navigateTo('login');
  }
});
