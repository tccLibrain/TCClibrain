export function setupMenuToggle() {
  const menuBtn = document.querySelector('.menu-btn');
  const menuWrapper = document.getElementById('menu-wrapper');
  const overlay = document.getElementById('overlay-menu');
  const logoutBtn = document.getElementById('logout');

  if (!menuBtn || !menuWrapper || !overlay) return;

  // Abrir menu
  menuBtn.addEventListener('click', () => {
    menuWrapper.classList.add('show');
    overlay.classList.remove('hidden');
  });

  // Fechar menu clicando no overlay
  overlay.addEventListener('click', () => {
    menuWrapper.classList.remove('show');
    overlay.classList.add('hidden');
  });

  // Fechar menu com Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      menuWrapper.classList.remove('show');
      overlay.classList.add('hidden');
    }
  });

  // Fechar menu ao clicar em link e navegar
  menuWrapper.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;

    e.preventDefault();

    const target = anchor.getAttribute('data-target');

    if (target && window.navigateTo) {
      window.navigateTo(target);
    } else if (anchor.id === 'logout') {
      localStorage.removeItem('user');
      window.navigateTo('login');
    }

    menuWrapper.classList.remove('show');
    overlay.classList.add('hidden');
  });
}
