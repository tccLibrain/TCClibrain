import { navigateTo } from '../main.js';
import fundoTopoPerfil from '../images/fundoTopoPerfil.png';

export async function renderUserProfile(container) {
    // Limpa o conteúdo existente do container antes de renderizar o perfil
    container.innerHTML = ''; 

    // 1. Fazer requisição para o backend para obter os dados do perfil
    let user = null;
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
                display: inline-block;
                border-radius: 50%;
                overflow: hidden;
                border: 4px solid #fff;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                transition: transform 0.3s ease;
            }

            .avatar-edit:hover {
                transform: scale(1.05);
            }

            .profile-avatar {
                width: 120px;
                height: 120px;
                object-fit: cover;
                border-radius: 50%;
                display: block;
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
                background-color: #CFD2DB;
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
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }

            .stat-item {
                background-color: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            }

            .stat-item:hover {
                transform: translateY(-2px);
            }

            .stat-item h3 {
                margin: 0 0 10px 0;
                color: #434E70;
                font-family: arial black;
                font-size: 18px;
            }

            .stat-item p {
                margin: 0;
                color: #9bb4ff;
                font-family: arial black;
                font-size: 32px;
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
                <div class="stat-item">
                    <h3>📖 Páginas lidas</h3>
                    <p>${paginasLidas.toLocaleString('pt-BR')}</p>
                </div>
            </div>
    
            <div class="profile-footer">
                <p>Usuário cadastrado em ${dataCadastro}</p>
                <button id="logoutBtn" class="btn">Sair</button>
            </div>
        </div>
    `;

    container.appendChild(profileWrapper);

    // Event listeners
    setupEventListeners(user, container);
}

function setupEventListeners(user, container) {
    const avatarInput = document.getElementById('avatar-input');
    const avatarImg = document.getElementById('profile-avatar');
    const bioText = document.getElementById('bioText');
    const bioContainer = document.getElementById('bioContainer');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handler para upload de avatar
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validações do arquivo
        const maxSize = 5 * 1024 * 1024; // 5MB
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
                    // Atualiza a imagem na interface
                    avatarImg.src = newAvatar;
                    
                    // Atualiza avatar no header se existir
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
                // Reverter para avatar anterior em caso de erro
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
        // Previne múltiplas edições simultâneas
        if (bioContainer.querySelector('textarea')) return;

        const currentBio = bioText.textContent.trim() === 'Ainda não tem uma biografia' ? '' : bioText.textContent.trim();
        
        bioContainer.innerHTML = `
            <h2>${user.nome}</h2>
            <textarea id="bioTextarea" 
                      class="bio-textarea" 
                      placeholder="Escreva algo sobre você..."
                      maxlength="500">${currentBio}</textarea>
            <div style="text-align: center;">
                <button id="saveBioBtn" class="bio-save-btn">✔️ Salvar</button>
                <button id="cancelBioBtn" class="bio-cancel-btn">✖️ Cancelar</button>
            </div>
            <div id="bioMessage"></div>
        `;

        const bioTextarea = document.getElementById('bioTextarea');
        const saveBioBtn = document.getElementById('saveBioBtn');
        const cancelBioBtn = document.getElementById('cancelBioBtn');

        bioTextarea.focus();

        // Handler para salvar biografia
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
                    // Atualizar dados do usuário
                    user.bio = result.bio;
                    
                    // Restaurar visualização normal
                    bioContainer.innerHTML = `
                        <h2>${user.nome}</h2>
                        <p id="bioText" title="Clique para editar sua biografia">
                            ${result.bio || 'Ainda não tem uma biografia'}
                        </p>
                    `;
                    
                    // Recriar o listener de clique
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

        // Handler para cancelar edição
        cancelBioBtn.addEventListener('click', () => {
            bioContainer.innerHTML = `
                <h2>${user.nome}</h2>
                <p id="bioText" title="Clique para editar sua biografia">
                    ${user.bio || 'Ainda não tem uma biografia'}
                </p>
            `;
            
            // Recriar o listener de clique
            const newBioText = document.getElementById('bioText');
            newBioText.addEventListener('click', () => {
                bioText.click();
            });
        });

        // Atalho para salvar com Ctrl+Enter
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
                    
                    // Redirecionar após pequeno delay
                    setTimeout(() => {
                        navigateTo('login');
                    }, 1500);
                } else {
                    throw new Error('Erro no logout');
                }
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                showMessage('Erro ao fazer logout. Tentando novamente...', 'error');
                
                // Forçar logout local mesmo com erro no servidor
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
    // Remove mensagens anteriores
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    const profileFooter = document.querySelector('.profile-footer');
    profileFooter.insertBefore(messageDiv, profileFooter.firstChild);

    // Remover mensagem após 5 segundos
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

    // Remover mensagem após 5 segundos
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