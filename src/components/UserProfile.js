import { navigateTo } from '../main.js';
import fundoTopoPerfil from '../images/fundoTopoPerfil.png';

export async function renderUserProfile(container) {
    container.innerHTML = ''; 

    let user = null;
    let conquistas = [];
    
    try {
        const response = await fetch('http://localhost:3000/api/profile', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            user = await response.json();
        } else if (response.status === 401) {
            alert('Sessão expirada. Faça login novamente.');
            navigateTo('login');
            return;
        } else {
            const errorData = await response.json();
            alert(errorData.error || 'Erro ao carregar perfil.');
            return;
        }

        // Buscar conquistas
        const conquistasResponse = await fetch('http://localhost:3000/api/user/achievements', {
            credentials: 'include'
        });
        
        if (conquistasResponse.ok) {
            conquistas = await conquistasResponse.json();
        }
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        alert('Não foi possível carregar o perfil. Verifique a conexão com o servidor.');
        return;
    }

    const livrosLidos = user.livros_lidos || 0;
    const paginasLidas = user.paginas_lidas || 0;
    const avatarUrl = user.avatar_url || 'https://i.pravatar.cc/150?img=12';
    const bioTexto = user.bio || 'Ainda não tem uma biografia';
    const dataCadastro = user.data_cadastro ? new Date(user.data_cadastro).toLocaleDateString('pt-BR') : 'Não informado';

    // Separar conquistas desbloqueadas e bloqueadas
    const conquistasDesbloqueadas = conquistas.filter(c => c.desbloqueada);
    const conquistasBloqueadas = conquistas.filter(c => !c.desbloqueada);

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

            .avatar-edit {
                cursor: pointer;
                position: relative;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                width: 130px;
                height: 130px;
                border-radius: 50%;
                overflow: hidden;
                border: 4px solid #fff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: transform 0.3s ease;
                background: #f0f0f0;
                margin-left: 70%;
                margin-top: 25px;
            }

            .avatar-edit:hover {
                transform: scale(1.05);
            }

            .profile-avatar {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 50%;
                display: block;
                border: none;
            }

            #avatar-input {
                display: none !important;
                position: absolute;
                opacity: 0;
                pointer-events: none;
            }

            .bio-textarea {
                width: 100%;
                min-height: 80px;
                border-radius: 8px;
                border: 1px solid #ccc;
                padding: 12px;
                margin-top: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
                background: var(--branco);
            }
            
            .bio-save-btn {
                background-color: #9bb4ff;
                color: #fff;
                border: none;
                border-radius: 999px;
                padding: 10px 20px;
                font-family: arial black;
                font-size: 14px;
                cursor: pointer;
                margin-top: 10px;
                transition: background-color 0.3s ease;
            }

            .bio-save-btn:hover {
                background-color: #8aa3f0;
            }

            .bio-cancel-btn {
                background-color: #6c757d;
                color: #fff;
                border: none;
                border-radius: 999px;
                padding: 10px 20px;
                font-family: arial black;
                font-size: 14px;
                cursor: pointer;
                margin-top: 10px;
                margin-left: 10px;
                transition: background-color 0.3s ease;
            }

            .bio-cancel-btn:hover {
                background-color: #5a6268;
            }

            .profile-info {
                background-color: #fff;
                border-radius: 12px;
                padding: 20px;
                margin: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .profile-info h2 {
                margin: 0 0 12px 0;
                color: #434E70;
                font-family: arial black;
                font-size: 24px;
            }

            .profile-info p {
                margin: 0;
                color: #434E70;
                font-size: 16px;
                line-height: 1.5;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                transition: background-color 0.3s ease;
            }

            .profile-info p:hover {
                background-color: rgba(67, 78, 112, 0.1);
            }

            .separator-line {
                width: calc(100% - 40px);
                height: 2px;
                background-color: #b0b0b0;
                margin: 20px auto;
            }

            .profile-stats {
                padding: 20px;
                margin: 0;
                display: flex;
                justify-content: center;
            }

            .stat-item {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 20px;
                padding: 30px;
                text-align: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                transition: all 0.3s ease;
                width: 100%;
                max-width: 400px;
                border: 2px solid transparent;
            }

            .stat-item:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(67, 78, 112, 0.2);
                border-color: #9bb4ff;
            }

            .stat-item h3 {
                margin: 0 0 15px 0;
                color: #434E70;
                font-family: 'Arial Black', arial, sans-serif;
                font-size: 24px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
            }

            .stat-item p {
                margin: 0;
                color: #9bb4ff;
                font-family: 'Arial Black', arial, sans-serif;
                font-size: 48px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
                position: relative;
            }

            .stat-item p::after {
                content: '';
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 60%;
                height: 3px;
                background: linear-gradient(90deg, transparent, #9bb4ff, transparent);
                border-radius: 2px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .stat-item:hover p::after {
                opacity: 1;
            }

            /* Seção de Conquistas */
            .achievements-section {
                padding: 20px;
                margin: 20px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .achievements-section h3 {
                color: #434E70;
                font-family: 'Arial Black', arial, sans-serif;
                font-size: 20px;
                margin: 0 0 20px 0;
                text-align: center;
            }

            .achievements-tabs {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin-bottom: 20px;
            }

            .achievement-tab {
                padding: 10px 20px;
                border: none;
                background: #e9ecef;
                color: #434E70;
                border-radius: 20px;
                cursor: pointer;
                font-family: arial black;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .achievement-tab.active {
                background: #9bb4ff;
                color: #fff;
            }

            .achievements-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 15px;
            }

            .achievement-card {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .achievement-card.unlocked {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                border: 2px solid #51cf66;
                box-shadow: 0 4px 12px rgba(81, 207, 102, 0.3);
            }

            .achievement-card.locked {
                opacity: 0.5;
                filter: grayscale(100%);
            }

            .achievement-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
            }

            .achievement-icon {
                font-size: 48px;
                margin-bottom: 10px;
            }

            .achievement-name {
                font-family: 'Arial Black', arial, sans-serif;
                font-size: 14px;
                color: #434E70;
                margin-bottom: 5px;
            }

            .achievement-description {
                font-size: 11px;
                color: #6c757d;
                line-height: 1.3;
            }

            .achievement-badge {
                position: absolute;
                top: 5px;
                right: 5px;
                background: #51cf66;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
            }

            .achievements-progress {
                background: #e9ecef;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                text-align: center;
            }

            .progress-text {
                font-family: 'Arial Black', arial, sans-serif;
                color: #434E70;
                font-size: 16px;
                margin-bottom: 10px;
            }

            .progress-bar-container {
                background: #fff;
                height: 20px;
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }

            .progress-bar-fill {
                background: linear-gradient(90deg, #51cf66 0%, #40c057 100%);
                height: 100%;
                transition: width 0.5s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            .profile-footer {
                padding: 20px;
                margin: 0;
                text-align: center;
            }

            .profile-footer p {
                color: #6c757d;
                font-size: 14px;
                margin-bottom: 20px;
            }

            .btn {
                background-color: #dc3545;
                color: #fff;
                border: none;
                border-radius: 999px;
                padding: 12px 24px;
                font-family: arial black;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.3s ease;
                min-width: 120px;
            }

            .btn:hover {
                background-color: #c82333;
            }

            .loading-spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #9bb4ff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .success-message {
                background-color: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                border-radius: 8px;
                padding: 10px;
                margin-top: 10px;
                text-align: center;
                font-size: 14px;
            }

            .error-message {
                background-color: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                padding: 10px;
                margin-top: 10px;
                text-align: center;
                font-size: 14px;
            }

            @media (max-width: 768px) {
                .achievements-grid {
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 10px;
                }

                .achievement-icon {
                    font-size: 36px;
                }

                .achievement-name {
                    font-size: 12px;
                }

                .achievement-description {
                    font-size: 10px;
                }
            }
        </style>

        <div>
            <div class="containerFundoPerfil">
                <label for="avatar-input" class="avatar-edit" title="Clique para alterar sua foto de perfil">
                    <img src="${avatarUrl}" 
                         alt="Avatar de ${user.nome}" 
                         class="profile-avatar" 
                         id="profile-avatar"
                         onerror="this.src='https://i.pravatar.cc/150?img=12'"/>
                </label>
                
                <input type="file" 
                       id="avatar-input" 
                       accept="image/*" 
                       style="display:none"/>
            </div>
    
            <div class="profile-info centro" id="bioContainer">
                <h2>${user.nome}</h2>
                <p id="bioText" title="Clique para editar sua biografia">
                    ${bioTexto}
                </p>
            </div>
    
            <div class="separator-line"></div>
    
            <div class="profile-stats">
                <div class="stat-item">
                    <h3>📚 Livros lidos</h3>
                    <p>${livrosLidos}</p>
                </div>
            </div>

            <div class="achievements-section">
                <h3>🏆 Conquistas</h3>
                
                <div class="achievements-progress">
                    <div class="progress-text">
                        ${conquistasDesbloqueadas.length} de ${conquistas.length} conquistas desbloqueadas
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" style="width: ${conquistas.length > 0 ? (conquistasDesbloqueadas.length / conquistas.length * 100) : 0}%">
                            ${conquistas.length > 0 ? Math.round(conquistasDesbloqueadas.length / conquistas.length * 100) : 0}%
                        </div>
                    </div>
                </div>

                <div class="achievements-tabs">
                    <button class="achievement-tab active" data-tab="all">
                        Todas (${conquistas.length})
                    </button>
                    <button class="achievement-tab" data-tab="unlocked">
                        Desbloqueadas (${conquistasDesbloqueadas.length})
                    </button>
                    <button class="achievement-tab" data-tab="locked">
                        Bloqueadas (${conquistasBloqueadas.length})
                    </button>
                </div>

                <div class="achievements-grid" id="achievements-grid">
                    ${conquistas.map(conquista => `
                        <div class="achievement-card ${conquista.desbloqueada ? 'unlocked' : 'locked'}" data-type="${conquista.desbloqueada ? 'unlocked' : 'locked'}">
                            ${conquista.desbloqueada ? '<div class="achievement-badge">✓</div>' : ''}
                            <div class="achievement-icon">${conquista.icone}</div>
                            <div class="achievement-name">${conquista.nome}</div>
                            <div class="achievement-description">${conquista.descricao}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
    
            <div class="profile-footer">
                <p>Usuário cadastrado em ${dataCadastro}</p>
                <button id="logoutBtn" class="btn">Sair</button>
            </div>
        </div>
    `;

    container.appendChild(profileWrapper);

    setupEventListeners(user, container, conquistas);
}

function setupEventListeners(user, container, conquistas) {
    const avatarInput = document.getElementById('avatar-input');
    const avatarImg = document.getElementById('profile-avatar');
    const bioText = document.getElementById('bioText');
    const bioContainer = document.getElementById('bioContainer');
    const logoutBtn = document.getElementById('logoutBtn');

    // Sistema de tabs de conquistas
    const tabs = container.querySelectorAll('.achievement-tab');
    const achievementsGrid = container.querySelector('#achievements-grid');
    const achievementCards = achievementsGrid.querySelectorAll('.achievement-card');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const filter = tab.dataset.tab;
            
            achievementCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'block';
                } else {
                    card.style.display = card.dataset.type === filter ? 'block' : 'none';
                }
            });
        });
    });

    // Handler para upload de avatar
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!allowedTypes.includes(file.type)) {
            showMessage('Por favor, selecione uma imagem válida (JPEG, PNG, GIF ou WebP).', 'error');
            return;
        }

        if (file.size > maxSize) {
            showMessage('A imagem deve ter no máximo 5MB.', 'error');
            return;
        }

        showLoadingState(avatarImg, true);

        const reader = new FileReader();
        reader.onload = async function(event) {
            const newAvatar = event.target.result;

            try {
                const response = await fetch('http://localhost:3000/api/profile/avatar', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    credentials: 'include',
                    body: JSON.stringify({ avatarUrl: newAvatar })
                });

                const result = await response.json();

                if (response.ok) {
                    avatarImg.src = newAvatar;
                    
                    const headerAvatar = document.querySelector('.shell-header .avatar');
                    if (headerAvatar) {
                        headerAvatar.src = newAvatar;
                    }
                    
                    showMessage('Avatar atualizado com sucesso!', 'success');
                } else {
                    throw new Error(result.error || result.message || 'Erro ao atualizar avatar');
                }
            } catch (error) {
                console.error('Erro ao atualizar avatar:', error);
                showMessage(`Erro ao atualizar avatar: ${error.message}`, 'error');
                avatarImg.src = user.avatar_url || 'https://i.pravatar.cc/150?img=12';
            } finally {
                showLoadingState(avatarImg, false);
            }
        };

        reader.onerror = function() {
            showLoadingState(avatarImg, false);
            showMessage('Erro ao processar a imagem.', 'error');
        };

        reader.readAsDataURL(file);
    });

    // Handler para edição de biografia
    bioText.addEventListener('click', () => {
        if (bioContainer.querySelector('textarea')) return;

        const currentBio = bioText.textContent.trim() === 'Ainda não tem uma biografia' ? '' : bioText.textContent.trim();
        
        bioContainer.innerHTML = `
            <h2>${user.nome}</h2>
            <textarea id="bioTextarea" 
                      class="bio-textarea" 
                      placeholder="Escreva algo sobre você..."
                      maxlength="500">${currentBio}</textarea>
            <div style="text-align: center;">
                <button id="saveBioBtn" class="bio-save-btn">✔ Salvar</button>
                <button id="cancelBioBtn" class="bio-cancel-btn">✖ Cancelar</button>
            </div>
            <div id="bioMessage"></div>
        `;

        const bioTextarea = document.getElementById('bioTextarea');
        const saveBioBtn = document.getElementById('saveBioBtn');
        const cancelBioBtn = document.getElementById('cancelBioBtn');

        bioTextarea.focus();

        saveBioBtn.addEventListener('click', async () => {
            const newBio = bioTextarea.value.trim();
            
            if (newBio.length > 500) {
                showBioMessage('A biografia deve ter no máximo 500 caracteres.', 'error');
                return;
            }

            showLoadingState(saveBioBtn, true);

            try {
                const response = await fetch('http://localhost:3000/api/profile/bio', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    credentials: 'include',
                    body: JSON.stringify({ bio: newBio })
                });

                const result = await response.json();

                if (response.ok) {
                    user.bio = result.bio;
                    
                    bioContainer.innerHTML = `
                        <h2>${user.nome}</h2>
                        <p id="bioText" title="Clique para editar sua biografia">
                            ${result.bio || 'Ainda não tem uma biografia'}
                        </p>
                    `;
                    
                    const newBioText = document.getElementById('bioText');
                    newBioText.addEventListener('click', () => {
                        bioText.click();
                    });
                    
                    showMessage('Biografia atualizada com sucesso!', 'success');
                } else {
                    throw new Error(result.error || result.message || 'Erro ao salvar biografia');
                }
            } catch (error) {
                console.error('Erro ao salvar biografia:', error);
                showBioMessage(`Erro ao salvar biografia: ${error.message}`, 'error');
            } finally {
                showLoadingState(saveBioBtn, false);
            }
        });

        cancelBioBtn.addEventListener('click', () => {
            bioContainer.innerHTML = `
                <h2>${user.nome}</h2>
                <p id="bioText" title="Clique para editar sua biografia">
                    ${user.bio || 'Ainda não tem uma biografia'}
                </p>
            `;
            
            const newBioText = document.getElementById('bioText');
            newBioText.addEventListener('click', () => {
                bioText.click();
            });
        });

        bioTextarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                saveBioBtn.click();
            }
        });
    });

    // Handler para logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja sair?')) return;

            showLoadingState(logoutBtn, true);

            try {
                const response = await fetch('http://localhost:3000/api/logout', { 
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    localStorage.removeItem('user');
                    sessionStorage.clear();
                    showMessage('Logout realizado com sucesso!', 'success');
                    
                    setTimeout(() => {
                        navigateTo('login');
                    }, 1500);
                } else {
                    throw new Error('Erro no logout');
                }
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                showMessage('Erro ao fazer logout. Tentando novamente...', 'error');
                
                setTimeout(() => {
                    localStorage.removeItem('user');
                    sessionStorage.clear();
                    navigateTo('login');
                }, 2000);
            } finally {
                showLoadingState(logoutBtn, false);
            }
        });
    }
}

function showMessage(message, type = 'success') {
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    const profileFooter = document.querySelector('.profile-footer');
    profileFooter.insertBefore(messageDiv, profileFooter.firstChild);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function showBioMessage(message, type = 'success') {
    const messageContainer = document.getElementById('bioMessage');
    if (!messageContainer) return;

    messageContainer.innerHTML = `
        <div class="${type === 'success' ? 'success-message' : 'error-message'}">
            ${message}
        </div>
    `;

    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

function showLoadingState(element, isLoading) {
    if (!element) return;

    if (isLoading) {
        element.disabled = true;
        const originalText = element.textContent;
        element.setAttribute('data-original-text', originalText);
        element.innerHTML = '<span class="loading-spinner"></span>Carregando...';
    } else {
        element.disabled = false;
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.textContent = originalText;
            element.removeAttribute('data-original-text');
        }
    }
}