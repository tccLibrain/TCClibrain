// menu.js
export function setupMenuToggle() {
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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        menuLateral.classList.remove('show');
        overlay.classList.add('hidden');
      }
    });
  }
}
