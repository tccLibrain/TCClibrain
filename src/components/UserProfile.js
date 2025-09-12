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
        padding: 0;
        overflow-y: auto;
      }

      body.perfil .shell-header {
        padding-left: 0;
      }
    
      .containerFundoPerfil {
        position: relative;
        width: 100%;
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

      .bio-textarea {
        width: 100%;
        min-height: 80px;
        border-radius: 8px;
        border: 1px solid #ccc;
        padding: 8px;
        margin-top: 8px;
      }
      
      .bio-save-btn {
        background-color: #9bb4ff;
        color: #fff;
        border: none;
        border-radius: 999px;
        padding: 8px 16px;
        font-family: arial black;
        font-size: 14px;
        cursor: pointer;
        margin-top: 10px;
      }

      .profile-info {
        background-color: #CFD2DB;
        border-radius: 12px;
        padding: 12px 20px;
        margin: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 20px;
      }

      .separator-line {
        width: 100%;
        height: 2px;
        background-color: #b0b0b0;
        margin: 20px 0;
      }

      .profile-stats {
        padding: 20px;
        margin: 0;
      }

      .profile-footer {
        padding: 20px;
        margin: 0;
      }
    </style>

    <div>
      <div class="containerFundoPerfil">
        <label for="avatar-input" class="avatar-edit">
          <img src="${user.avatarUrl || 'https://i.pravatar.cc/150?img=12'}" 
          alt="Avatar" class="profile-avatar" id="profile-avatar"/>
        </label>
        
        <input type="file" id="avatar-input" accept="image/*" style="display:none"/>
      </div>
  
      <div class="profile-info centro" id="bioContainer">
        <h2 style="margin:0 0 8px 0;">${user.nome}</h2>
        <p id="bioText" style="margin: 0; color: black">
          ${user.bio || 'Ainda não tem uma biografia'}
        </p>
      </div>
  
      <div class="separator-line"></div>
  
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
    </div>
  `;

  container.appendChild(profileWrapper);

  const avatarInput = document.getElementById('avatar-input');
  const avatarImg = document.getElementById('profile-avatar');
  const bioText = document.getElementById('bioText');
  const bioContainer = document.getElementById('bioContainer');

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

  bioText.addEventListener('click', () => {
    if (bioContainer.querySelector('textarea')) return;

    const currentBio = bioText.textContent.trim() === 'Ainda não tem uma biografia' ? '' : bioText.textContent.trim();
    
    bioContainer.innerHTML = `
      <h2 style="margin:0 0 8px 0;">${user.nome}</h2>
      <textarea id="bioTextarea" class="bio-textarea">${currentBio}</textarea>
      <button id="saveBioBtn" class="bio-save-btn">✔️ Salvar</button>
    `;

    const saveBioBtn = document.getElementById('saveBioBtn');
    const bioTextarea = document.getElementById('bioTextarea');

    bioTextarea.focus();

    saveBioBtn.addEventListener('click', () => {
      const newBio = bioTextarea.value;
      user.bio = newBio.trim();
      localStorage.setItem('user', JSON.stringify(user));

      const allUsers = JSON.parse(localStorage.getItem('usuarios')) || [];
      const userIndex = allUsers.findIndex(u => u.cpf === user.cpf);
      if (userIndex !== -1) {
        allUsers[userIndex] = user;
        localStorage.setItem('usuarios', JSON.stringify(allUsers));
      }

      bioContainer.innerHTML = `
        <h2 style="margin:0 0 8px 0;">${user.nome}</h2>
        <p id="bioText" style="margin: 0; color: black">
          ${user.bio || 'Ainda não tem uma biografia'}
        </p>
      `;

      // Para evitar a duplicação de eventos, a melhor prática seria recriar o listener aqui
      // ou recarregar a página, mas por simplicidade, a solução é copiar o código abaixo.
      document.getElementById('bioText').addEventListener('click', () => {
         location.reload(); 
      });
    });
  });

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      navigateTo('login');
    });
  }
}