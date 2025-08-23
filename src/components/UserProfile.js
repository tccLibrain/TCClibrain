import { navigateTo } from '../main.js';

export function renderUserProfile(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Usuário não encontrado. Faça login novamente.');
    navigateTo('login');
    return;
  }

  const livrosLidos = user.livrosLidos || 0;
  const paginasLidas = user.paginasLidas || 0;

  const profileWrapper = document.createElement('div');
  profileWrapper.className = 'profile-container';
  profileWrapper.innerHTML = `
    <div class="profile-header" style="display:flex; align-items:center; gap:16px; position:relative;">
      <div style="position:relative;">
        <img src="${user.avatarUrl || 'https://i.pravatar.cc/150?img=12'}" 
             alt="Avatar" class="profile-avatar" id="profile-avatar"/>
        <label for="avatar-input" style="
          position: absolute;
          bottom: 0;
          right: 0;
          background: rgba(0,0,0,0.6);
          color: #fff;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
        ">✎</label>
        <input type="file" id="avatar-input" accept="image/*" style="display:none"/>
      </div>
      <div>
        <h2>${user.nome}</h2>
        <p>${user.bio || 'Ainda não tem uma biografia ✏️'}</p>
      </div>
    </div>

    <div class="profile-stats">
      <div>
        <h3>📚 Livros lidos</h3>
        <p>${livrosLidos}</p>
      </div>
      <div>
        <h3>📖 Paginômetro</h3>
        <p>${paginasLidas}</p>
      </div>
    </div>

    <div class="profile-footer">
      <p>Usuário cadastrado em ${user.dataCadastro || '???'}</p>
    </div>
  `;

  container.appendChild(profileWrapper);

  const avatarInput = document.getElementById('avatar-input');
  const avatarImg = document.getElementById('profile-avatar');

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const newAvatar = event.target.result;

      // Atualiza avatar do perfil
      avatarImg.src = newAvatar;

      // Atualiza avatar do header
      const headerAvatar = document.querySelector('.shell-header .avatar');
      if (headerAvatar) headerAvatar.src = newAvatar;

      // Salva no localStorage
      user.avatarUrl = newAvatar;
      localStorage.setItem('user', JSON.stringify(user));
    };
    reader.readAsDataURL(file);
  });
}
