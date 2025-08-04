import { renderLoginPage } from './components/LoginPage.js';
import { renderBookList } from './components/BookList.js';
import { renderBookDetails } from './components/BookDetails.js';  // importa detalhes
import { renderUserDashboard } from './components/UserDashboard.js';
import { renderAdminPanel } from './components/AdminPanel.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const menuWrapper = document.getElementById('menu-wrapper');
  const overlay = document.getElementById('overlay-menu');
  const menuBtn = document.querySelector('.menu-btn');
  const menuLateral = document.getElementById('menu-lateral');

  window.navigateTo = (screen, data = {}) => {
    app.innerHTML = '';

    switch (screen) {
      case 'login':
        renderLoginPage(app);
        menuWrapper.classList.remove('show');
        overlay.classList.add('hidden');
        menuBtn.style.display = 'none';
        break;
      case 'books':
        renderBookList(app, data);  // pode passar dados se quiser
        menuWrapper.classList.remove('show');
        overlay.classList.add('hidden');
        menuBtn.style.display = 'block';
        break;
      case 'details':
        renderBookDetails(app, data.bookId);
        menuWrapper.classList.remove('show');
        overlay.classList.add('hidden');
        menuBtn.style.display = 'block';
        break;
      case 'dashboard':
        renderUserDashboard(app);
        menuWrapper.classList.remove('show');
        overlay.classList.add('hidden');
        menuBtn.style.display = 'block';
        break;
      case 'admin':
        renderAdminPanel(app);
        menuWrapper.classList.remove('show');
        overlay.classList.add('hidden');
        menuBtn.style.display = 'block';
        break;
      default:
        renderLoginPage(app);
        menuBtn.style.display = 'none';
    }
  };

  menuBtn.onclick = () => {
    menuWrapper.classList.add('show');
    overlay.classList.remove('hidden');
  };

  overlay.onclick = closeMenu;

  function closeMenu() {
    menuWrapper.classList.remove('show');
    overlay.classList.add('hidden');
  }

  menuLateral.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    e.preventDefault();
    const target = anchor.getAttribute('data-target');
    if (target) {
      navigateTo(target);
    } else if (anchor.id === 'logout') {
      localStorage.removeItem('user');
      navigateTo('login');
    }
    closeMenu();
  });

  navigateTo('login');
});
