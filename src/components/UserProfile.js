import { navigateTo } from '../main.js';
import fundoTopoPerfil from '../images/fundoTopoPerfil.png';

export function renderUserProfile(container) {
  // Limpa o conteúdo existente do container antes de renderizar o perfil
  container.innerHTML = ''; 

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
    <style>
      .content {
        margin-top: 80px;
        padding: 12px;
        overflow-y: auto;
      }

      body.perfil .shell-header {
        padding-left: 0;
      }
    
      .containerFundoPerfil {
        position: relative;
        width: calc(100vw + 14px);
        margin-left: -16px;
        margin-right: -16px;
        height: 200px;
        background-image: url('${fundoTopoPerfil}');
        background-size: cover;
        background-position: center;
        display: flex;
        justify-content: center;
        align-items: center;
        border-bottom-left-radius: 20px;
        border-bottom-right-radius: 20px;
      }

      .bio-edit-icon {
        cursor: pointer;
        font-size: 1.2em;
        margin-left: 8px;
        color: #555;
      }

      .bio-textarea {
        width: 100%;
        min-height: 80px;
        border-radius: 8px;
        border: 1px solid #ccc;
        padding: 8px;
        margin-top: 8px;
      }
    </style>

    <div class="profile-header-container" style="margin-left: -5px">
      <div class="containerFundoPerfil">
        <img src="${user.avatarUrl || 'https://i.pravatar.cc/150?img=12'}" 
        alt="Avatar" class="profile-avatar" id="profile-avatar"/>
        <label for="avatar-input" class="avatar-edit">✎</label>
        <input type="file" id="avatar-input" accept="image/*" style="display:none"/>
      </div>
    </div>

    <div class="profile-info centro" style="
      background-color: #CFD2DB;
      border-radius: 12px;
      padding: 12px 20px;
      margin-top: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 90%;
      margin-left: -10px">
      <h2 style="margin:0 0 8px 0;">${user.nome}</h2>
      <p id="bioText" style="margin: 0; color: black">${user.bio || 'Ainda não tem uma biografia'}</p>
      <span id="editBioBtn" class="bio-edit-icon">✏️</span>
    </div>

    <div style="
      width: 100%;
      height: 2px;
      background-color: #b0b0b0;
      margin: 0;
      margin-left: -40px;
      margin-right: -40px;
    "></div>

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
      <p>Usuário cadastrado em ${user.dataCadastro || 'Não informado'}</p>
      <button id="logoutBtn" class="btn">Sair</button>
    </div>
  `;

  container.appendChild(profileWrapper);

  const avatarInput = document.getElementById('avatar-input');
  const avatarImg = document.getElementById('profile-avatar');
  const bioText = document.getElementById('bioText');
  const editBioBtn = document.getElementById('editBioBtn');
  let isEditingBio = false;

  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const newAvatar = event.target.result;

      avatarImg.src = newAvatar;
      const headerAvatar = document.querySelector('.shell-header .avatar');
      if (headerAvatar) headerAvatar.src = newAvatar;

      user.avatarUrl = newAvatar;
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(`user-${user.cpf}`, JSON.stringify(user));
    };
    reader.readAsDataURL(file);
  });

  editBioBtn.addEventListener('click', () => {
    if (!isEditingBio) {
      // Modo de edição
      const currentBio = bioText.textContent.trim() === 'Ainda não tem uma biografia' ? '' : bioText.textContent.trim();
      bioText.innerHTML = `<textarea id="bioTextarea" class="bio-textarea">${currentBio}</textarea>`;
      editBioBtn.textContent = '✔️ Salvar';
      isEditingBio = true;
    } else {
      // Salvar a biografia
      const newBio = document.getElementById('bioTextarea').value;
      user.bio = newBio.trim();
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(`user-${user.cpf}`, JSON.stringify(user));

      bioText.textContent = user.bio || 'Ainda não tem uma biografia';
      editBioBtn.textContent = '✏️';
      isEditingBio = false;
    }
  });

  // Adiciona o evento de logout ao botão do rodapé
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      navigateTo('login');
    });
  }
}