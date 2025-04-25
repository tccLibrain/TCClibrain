import { renderBookList } from './components/BookList.js';
import { renderBookDetails } from './components/BookDetails.js';
import { renderUserRegistration } from './components/UserRegistration.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderLoginPage } from './components/LoginPage.js';
import { renderUserDashboard } from './components/UserDashboard.js';

export function navigateTo(screen, data = {}) {
  const app = document.getElementById('app');
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
}
