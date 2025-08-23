import { navigateTo } from '../main.js';

export function createShell(appContainer) {
  // Evita criar mais de uma vez
  if (document.querySelector('.shell-header')) return;

  // Header
  const header = document.createElement('header');
  header.className = 'shell-header';
  header.innerHTML = `
    <div class="logo">LIBRAIN</div>
    <div class="header-right">
      <img src="" alt="avatar" class="avatar" id="avatar-img"/>
      <button class="menu-btn" id="hamburger">☰</button>
    </div>
  `;
  appContainer.appendChild(header);

  // Container de conteúdo
  const content = document.createElement('div');
  content.className = 'content';
  appContainer.appendChild(content);

  // Overlay para menu lateral
  const overlay = document.createElement('div');
  overlay.id = 'overlay-menu';
  overlay.classList.add('hidden');
  document.body.appendChild(overlay);

  // Menu lateral
  const menuWrapper = document.createElement('div');
  menuWrapper.id = 'menu-wrapper';
  menuWrapper.innerHTML = `
    <nav>
      <a href="#" data-target="profile">👤 Perfil</a>
      <a href="#" data-target="dashboard">📊 Empréstimos & Reservas</a>
      <a href="#" data-target="books">📚 Livros</a>
      <a href="#" data-target="admin">⚙️ Administração</a>
      <a href="#" id="logout">🚪 Sair</a>
    </nav>
  `;
  document.body.appendChild(menuWrapper);

  // Footer fixo
  const footer = document.createElement('footer');
  footer.className = 'footer-nav';
  footer.innerHTML = `
    <button class="footer-btn active" data-target="books">🏠<span>Início</span></button>
    <button class="footer-btn" data-target="profile">👤<span>Perfil</span></button>
    <button class="footer-btn" data-target="admin">📚<span>Admin</span></button>
  `;
  appContainer.appendChild(footer);

  // Avatar do usuário
  const user = JSON.parse(localStorage.getItem('user'));
  const avatarImg = document.getElementById('avatar-img');
  avatarImg.src = (user && user.avatarUrl) ? user.avatarUrl : 'https://i.pravatar.cc/150?img=12';

  // Menu lateral toggle
  const hamburger = document.getElementById('hamburger');
  hamburger.addEventListener('click', () => {
    menuWrapper.classList.toggle('show');
    overlay.classList.toggle('hidden');
  });

  overlay.addEventListener('click', () => {
    menuWrapper.classList.remove('show');
    overlay.classList.add('hidden');
  });

  menuWrapper.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    e.preventDefault();
    if(anchor.dataset.target) navigateTo(anchor.dataset.target);
    else if(anchor.id === 'logout') {
      localStorage.removeItem('user');
      navigateTo('login');
    }
    menuWrapper.classList.remove('show');
    overlay.classList.add('hidden');
  });

  // Footer buttons
  footer.querySelectorAll('.footer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      footer.querySelectorAll('.footer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      navigateTo(btn.dataset.target);
    });
  });
}
