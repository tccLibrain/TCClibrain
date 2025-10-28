import { navigateTo } from '../main.js';
import { updateShellAvatar } from './MenuHeaderFooter.js';

export async function renderUserProfile(container) {
    console.log('=== RENDERIZANDO PERFIL DO USUÁRIO ===');
    
    container.innerHTML = '<div class="loading">Carregando perfil...</div>';
    
    let user = null;
    let conquistas = [];
    
    try {
        // 1️⃣ Buscar dados do usuário
        const userResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                navigateTo('login');
                return;
            }
            throw new Error('Erro ao carregar perfil');
        }
        
        user = await userResponse.json();
        console.log('✅ Usuário carregado:', user.nome);

        // 2️⃣ Buscar conquistas
        try {
            const conquistasResponse = await fetch('http://localhost:3000/api/user/achievements', {
                credentials: 'include'
            });
            
            if (conquistasResponse.ok) {
                conquistas = await conquistasResponse.json();
                console.log('✅ Conquistas:', conquistas.length, 'total');
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar conquistas:', error);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar perfil:', error);
        container.innerHTML = `
            <div class="no-books">
                <h3>❌ Erro ao carregar perfil</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">🔄 Recarregar</button>
            </div>
        `;
        return;
    }

    renderProfileContent(container, user, conquistas);
}

function renderProfileContent(container, user, conquistas) {
    const livrosLidos = user.livros_lidos || 0;
    const avatarUrl = user.avatar_url || 'https://i.pravatar.cc/150?img=12';
    const bioTexto = user.bio || 'Ainda não tem uma biografia';
    const dataCadastro = user.data_cadastro 
        ? new Date(user.data_cadastro).toLocaleDateString('pt-BR') 
        : 'Não informado';

    const conquistasDesbloqueadas = conquistas.filter(c => c.desbloqueada);
    const conquistasBloqueadas = conquistas.filter(c => !c.desbloqueada);
    const progressoConquistas = conquistas.length > 0 
        ? Math.round((conquistasDesbloqueadas.length / conquistas.length) * 100) 
        : 0;

    container.innerHTML = `
        <style>
              html, body {
                margin: 0;
                padding: 0;
                background-color: #434E70;
            }

            .profile-container {
                max-width: 1000px;
                margin: 0 auto;
                padding: 0 15px 20px;
            }
            
            .profile-header {
                position: relative;
                width: 100%;
                height: 200px;
                background: linear-gradient(135deg, #434E70);
                border-radius: 20px;
                display: flex;
                justify-content: center;
                align-items: flex-end;
                padding-bottom: 15px;
                margin-bottom: 80px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }

            .avatar-container {
                position: absolute;
                bottom: -60px;
                cursor: pointer;
                width: 120px;
                height: 120px;
                border-radius: 50%;
                overflow: hidden;
                border: 5px solid #CFD2DB;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                transition: transform 0.3s ease;
                background: #f0f0f0;
            }

            .avatar-container:hover {
                transform: scale(1.05);
                border-color: #9bb4ff;
            }

            .avatar-container::after {
                content: '📷';
                position: absolute;
                bottom: 8px;
                right: 8px;
                background: rgba(155, 180, 255, 0.95);
                color: white;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                opacity: 0;
                transition: opacity 0.3s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }

            .avatar-container:hover::after {
                opacity: 1;
            }

            .profile-avatar {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            #avatar-input {
                display: none;
            }

            .profile-info-card {
                background: #CFD2DB;
                border-radius: 20px;
                padding: 25px;
                margin-bottom: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                text-align: center;
            }

            .profile-info-card h2 {
                margin: 0 0 10px 0;
                color: #434E70;
                font-size: 28px;
                font-weight: 700;
                font-family: arial black;
            }

            .btn-edit-name {
                background: white;
                border: 2px solid white;
                color: #434E70;
                font-size: 13px;
                cursor: pointer;
                padding: 6px 16px;
                border-radius: 999px;
                transition: all 0.3s;
                margin-bottom: 15px;
                font-family: arial black;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            }

            .btn-edit-name:hover {
                background: #9bb4ff;
                color: white;
                border-color: #9bb4ff;
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }

            .profile-bio {
                color: #434E70;
                font-size: 15px;
                line-height: 1.6;
                cursor: pointer;
                padding: 15px;
                border-radius: 15px;
                transition: background 0.3s;
                margin: 0;
                font-family: arial;
            }

            .profile-bio:hover {
                background: rgba(255, 255, 255, 0.3);
            }

            .bio-edit-container {
                margin-top: 15px;
            }

            .bio-textarea {
                width: 100%;
                min-height: 100px;
                padding: 15px;
                border: 2px solid white;
                border-radius: 20px;
                font-size: 14px;
                font-family: arial;
                resize: vertical;
                transition: all 0.3s;
                background: white;
                color: #434E70;
                box-sizing: border-box;
            }

            .bio-textarea:focus {
                outline: none;
                border-color: #9bb4ff;
                box-shadow: 0 0 0 3px rgba(155, 180, 255, 0.2);
            }

            .action-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 15px;
                flex-wrap: wrap;
            }

            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 999px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                font-family: arial black;
            }

            .btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .btn-primary {
                background: linear-gradient(135deg, #9bb4ff 0%, #7a9dff 100%);
                color: white;
            }

            .btn-secondary {
                background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
                color: white;
            }

            .btn-danger {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
            }

            .stats-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .stat-card {
                background: #CFD2DB;
                border-radius: 20px;
                padding: 30px 20px;
                text-align: center;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                transition: all 0.3s;
                border: 3px solid transparent;
            }

            .stat-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 24px rgba(155, 180, 255, 0.3);
                border-color: #9bb4ff;
            }

            .stat-card h3 {
                margin: 0 0 12px 0;
                color: #434E70;
                font-size: 16px;
                font-weight: 600;
                font-family: arial black;
            }

            .stat-card .stat-number {
                font-size: 48px;
                font-weight: 700;
                color: #434E70;
                margin: 0;
                font-family: arial black;
            }

            .achievements-section {
                background: #CFD2DB;
                border-radius: 20px;
                padding: 25px;
                margin-bottom: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            }

            .achievements-section h3 {
                margin: 0 0 25px 0;
                color: #434E70;
                font-size: 24px;
                font-weight: 700;
                text-align: center;
                font-family: arial black;
            }

            .achievements-progress {
                background: white;
                border-radius: 20px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .progress-text {
                text-align: center;
                color: #434E70;
                font-size: 15px;
                font-weight: 600;
                margin-bottom: 15px;
                font-family: arial black;
            }

            .progress-bar-container {
                background: #e9ecef;
                height: 30px;
                border-radius: 999px;
                overflow: hidden;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.08);
            }

            .progress-bar-fill {
                background: linear-gradient(90deg, #51cf66 0%, #40c057 100%);
                height: 100%;
                transition: width 0.5s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 13px;
                font-weight: 700;
                min-width: 30px;
                font-family: arial black;
                box-shadow: inset 0 2px 4px rgba(255,255,255,0.3);
            }

            .achievements-tabs {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin-bottom: 25px;
                flex-wrap: wrap;
            }

            .achievement-tab {
                padding: 10px 20px;
                border: 2px solid white;
                background: white;
                color: #434E70;
                border-radius: 999px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.3s;
                font-family: arial black;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            }

            .achievement-tab:hover {
                background: #e9ecef;
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }

            .achievement-tab.active {
                background: linear-gradient(135deg, #9bb4ff 0%, #7a9dff 100%);
                color: white;
                border-color: #9bb4ff;
                box-shadow: 0 4px 12px rgba(155, 180, 255, 0.4);
            }

            .achievements-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 15px;
            }

            .achievement-card {
                background: white;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                transition: all 0.3s;
                position: relative;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .achievement-card.unlocked {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                border-color: #51cf66;
                box-shadow: 0 4px 12px rgba(81, 207, 102, 0.3);
            }

            .achievement-card.locked {
                opacity: 0.5;
                filter: grayscale(80%);
            }

            .achievement-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.15);
            }

            .achievement-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }

            .achievement-name {
                font-size: 14px;
                font-weight: 700;
                color: #434E70;
                margin-bottom: 8px;
                font-family: arial black;
            }

            .achievement-description {
                font-size: 12px;
                color: #6c757d;
                line-height: 1.4;
                font-family: arial;
            }

            .achievement-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                background: #51cf66;
                color: white;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: 700;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }

            .profile-footer {
                text-align: center;
                padding: 20px 0;
            }

            .profile-footer p {
                color: white;
                font-size: 14px;
                margin-bottom: 20px;
                font-family: arial black;
            }

            .message {
                border-radius: 20px;
                padding: 15px 20px;
                margin: 15px 0;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                animation: slideIn 0.3s ease;
                font-family: arial black;
            }

            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .message.success {
                background: #d4edda;
                color: #155724;
                border: 3px solid #28a745;
            }

            .message.error {
                background: #f8d7da;
                color: #721c24;
                border: 3px solid #dc3545;
            }

            .message.info {
                background: #d1ecf1;
                color: #0c5460;
                border: 3px solid #17a2b8;
            }

            .empty-state {
                text-align: center;
                padding: 50px 20px;
                color: #434E70;
                font-style: italic;
                font-family: arial;
            }

            .loading {
                text-align: center;
                padding: 60px;
                color: white;
                font-size: 20px;
                font-weight: 600;
                font-family: arial black;
            }

            .no-books {
                text-align: center;
                padding: 60px 20px;
                color: #434E70;
                font-size: 18px;
                background: #CFD2DB;
                border-radius: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-family: arial;
            }

            .no-books h3 {
                color: #434E70;
                margin-bottom: 10px;
                font-size: 24px;
                font-family: arial black;
            }

            @media (max-width: 768px) {
                .profile-header {
                    height: 160px;
                    margin-bottom: 70px;
                }

                .avatar-container {
                    width: 100px;
                    height: 100px;
                    bottom: -50px;
                }

                .profile-info-card {
                    padding: 20px;
                }

                .profile-info-card h2 {
                    font-size: 24px;
                }

                .stat-card {
                    padding: 25px 15px;
                }

                .stat-card .stat-number {
                    font-size: 40px;
                }

                .achievements-grid {
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 12px;
                }

                .achievement-icon {
                    font-size: 40px;
                }

                .achievement-name {
                    font-size: 13px;
                }

                .achievement-description {
                    font-size: 11px;
                }
            }
        </style>
        
        <div class="profile-container">
            <div class="profile-header">
                <label for="avatar-input" class="avatar-container" title="Clique para alterar sua foto">
                    <img src="${avatarUrl}" 
                         alt="Avatar de ${user.nome}" 
                         class="profile-avatar" 
                         id="profile-avatar"
                         onerror="this.src='https://i.pravatar.cc/150?img=12'"/>
                </label>
                <input type="file" id="avatar-input" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"/>
            </div>

            <div class="profile-info-card" id="profileInfo">
                <h2>${user.nome}</h2>
                <button id="changeNameBtn" class="btn-edit-name">✏️ Alterar nome</button>
                <p class="profile-bio" id="bioText" title="Clique para editar">${bioTexto}</p>
            </div>

            <div class="stats-container">
                <div class="stat-card">
                    <h3>📚 Livros Lidos</h3>
                    <p class="stat-number">${livrosLidos}</p>
                </div>
            </div>

            <div class="achievements-section">
                <h3>🏆 Conquistas</h3>
                ${conquistas.length > 0 ? `
                    <div class="achievements-progress">
                        <div class="progress-text">${conquistasDesbloqueadas.length} de ${conquistas.length} conquistas desbloqueadas</div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progressoConquistas}%">${progressoConquistas}%</div>
                        </div>
                    </div>
                    <div class="achievements-tabs">
                        <button class="achievement-tab active" data-tab="all">Todas (${conquistas.length})</button>
                        <button class="achievement-tab" data-tab="unlocked">Desbloqueadas (${conquistasDesbloqueadas.length})</button>
                        <button class="achievement-tab" data-tab="locked">Bloqueadas (${conquistasBloqueadas.length})</button>
                    </div>
                    <div class="achievements-grid" id="achievementsGrid">
                        ${conquistas.map(c => `
                            <div class="achievement-card ${c.desbloqueada ? 'unlocked' : 'locked'}" data-type="${c.desbloqueada ? 'unlocked' : 'locked'}" title="${c.descricao}">
                                ${c.desbloqueada ? '<div class="achievement-badge">✓</div>' : ''}
                                <div class="achievement-icon">${c.icone || '🏆'}</div>
                                <div class="achievement-name">${c.nome || 'Conquista'}</div>
                                <div class="achievement-description">${c.descricao || 'Sem descrição'}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<div class="empty-state">Nenhuma conquista disponível no momento.</div>'}
            </div>

            <div class="profile-footer">
                <p>Membro desde ${dataCadastro}</p>
                <button id="logoutBtn" class="btn btn-danger">🚪 Sair da Conta</button>
            </div>
        </div>
    `;

    setupProfileEventListeners(container, user);
}

function setupProfileEventListeners(container, user) {
    setupAvatarUpload(container, user);
    setupBioEditor(container, user);
    setupNameChange(container, user);
    setupAchievementTabs(container);
    setupLogout(container);
}

function setupAvatarUpload(container, user) {
    const avatarInput = container.querySelector('#avatar-input');
    const avatarImg = container.querySelector('#profile-avatar');
    if (!avatarInput || !avatarImg) return;
    
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showMessage('❌ Formato não suportado. Use JPEG, PNG, GIF ou WebP.', 'error');
            avatarInput.value = '';
            return;
        }

        const tempUrl = URL.createObjectURL(file);
        const oldSrc = avatarImg.src;
        avatarImg.src = tempUrl;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                showMessage('⏳ Enviando imagem...', 'info');
                const response = await fetch('http://localhost:3000/api/profile/avatar', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ avatarUrl: event.target.result })
                });

                if (response.ok) {
                    avatarImg.src = event.target.result;
                    user.avatar_url = event.target.result;
                    updateShellAvatar(event.target.result);
                    showMessage('✅ Avatar atualizado!', 'success');
                } else {
                    const error = await response.json();
                    throw new Error(error.error || 'Erro ao atualizar avatar');
                }
            } catch (error) {
                avatarImg.src = oldSrc;
                showMessage(`❌ ${error.message}`, 'error');
            } finally {
                avatarInput.value = '';
                URL.revokeObjectURL(tempUrl);
            }
        };
        reader.onerror = () => {
            avatarImg.src = oldSrc;
            showMessage('❌ Erro ao processar imagem', 'error');
            avatarInput.value = '';
            URL.revokeObjectURL(tempUrl);
        };
        reader.readAsDataURL(file);
    });
}

function setupBioEditor(container, user) {
    const bioText = container.querySelector('#bioText');
    const profileInfo = container.querySelector('#profileInfo');
    if (!bioText || !profileInfo) return;
    
    bioText.addEventListener('click', () => {
        if (profileInfo.querySelector('textarea')) return;
        const currentBio = bioText.textContent.trim() === 'Ainda não tem uma biografia' ? '' : bioText.textContent.trim();
        
        profileInfo.innerHTML = `
            <h2>${user.nome}</h2>
            <div class="bio-edit-container">
                <textarea id="bioTextarea" class="bio-textarea" placeholder="Escreva algo sobre você..." maxlength="500">${currentBio}</textarea>
                <div class="action-buttons">
                    <button id="saveBioBtn" class="btn btn-primary">✓ Salvar</button>
                    <button id="cancelBioBtn" class="btn btn-secondary">✕ Cancelar</button>
                </div>
            </div>
        `;

        const bioTextarea = profileInfo.querySelector('#bioTextarea');
        const saveBioBtn = profileInfo.querySelector('#saveBioBtn');
        const cancelBioBtn = profileInfo.querySelector('#cancelBioBtn');
        bioTextarea.focus();

        saveBioBtn.addEventListener('click', async () => {
            const newBio = bioTextarea.value.trim();
            if (newBio.length > 500) {
                showMessage('❌ Biografia deve ter no máximo 500 caracteres', 'error');
                return;
            }
            saveBioBtn.disabled = true;
            saveBioBtn.textContent = 'Salvando...';
            try {
                const response = await fetch('http://localhost:3000/api/profile/bio', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bio: newBio })
                });
                const result = await response.json();
                if (response.ok) {
                    user.bio = result.bio;
                    restoreBioView(profileInfo, user, container);
                    showMessage('✅ Biografia atualizada!', 'success');
                } else {
                    throw new Error(result.error || 'Erro ao salvar');
                }
            } catch (error) {
                showMessage(`❌ ${error.message}`, 'error');
                saveBioBtn.disabled = false;
                saveBioBtn.textContent = '✓ Salvar';
            }
        });

        cancelBioBtn.addEventListener('click', () => restoreBioView(profileInfo, user, container));
    });
}

function restoreBioView(profileInfo, user, container) {
    profileInfo.innerHTML = `
        <h2>${user.nome}</h2>
        <button id="changeNameBtn" class="btn-edit-name">✏️ Alterar nome</button>
        <p class="profile-bio" id="bioText" title="Clique para editar">${user.bio || 'Ainda não tem uma biografia'}</p>
    `;
    setupBioEditor(container, user);
    setupNameChange(container, user);
}

function setupNameChange(container, user) {
    const changeNameBtn = container.querySelector('#changeNameBtn');
    if (!changeNameBtn) return;
    
    changeNameBtn.addEventListener('click', async () => {
        const novoNome = prompt('Digite seu novo nome:', user.nome);
        if (!novoNome || novoNome.trim() === user.nome) return;
        if (novoNome.trim().length < 3) {
            showMessage('❌ Nome deve ter no mínimo 3 caracteres', 'error');
            return;
        }
        changeNameBtn.disabled = true;
        const originalText = changeNameBtn.textContent;
        changeNameBtn.textContent = 'Salvando...';
        try {
            const response = await fetch('http://localhost:3000/api/profile/name', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ novoNome: novoNome.trim() })
            });
            const result = await response.json();
            if (response.ok && result.nome) {
                user.nome = result.nome;
                container.querySelector('.profile-info-card h2').textContent = result.nome;
                showMessage('✅ ' + result.message, 'success');
            } else {
                throw new Error(result.error || 'Erro ao atualizar nome');
            }
        } catch (error) {
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            changeNameBtn.disabled = false;
            changeNameBtn.textContent = originalText;
        }
    });
}

function setupAchievementTabs(container) {
    const tabs = container.querySelectorAll('.achievement-tab');
    const achievementsGrid = container.querySelector('#achievementsGrid');
    if (!tabs.length || !achievementsGrid) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.tab;
            const cards = achievementsGrid.querySelectorAll('.achievement-card');
            cards.forEach(card => {
                card.style.display = (filter === 'all' || filter === card.dataset.type) ? 'block' : 'none';
            });
        });
    });
}

function setupLogout(container) {
    const logoutBtn = container.querySelector('#logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async () => {
        if (!confirm('🚪 Tem certeza que deseja sair?')) return;
        logoutBtn.disabled = true;
        logoutBtn.textContent = 'Saindo...';
        try {
            const response = await fetch('http://localhost:3000/api/logout', { 
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                localStorage.removeItem('user');
                sessionStorage.clear();
                showMessage('✅ Logout realizado!', 'success');
                setTimeout(() => navigateTo('login'), 1000);
            } else {
                throw new Error('Erro no logout');
            }
        } catch (error) {
            localStorage.removeItem('user');
            sessionStorage.clear();
            navigateTo('login');
        }
    });
}

function showMessage(message, type = 'success') {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    const profileFooter = document.querySelector('.profile-footer');
    if (profileFooter) {
        profileFooter.insertBefore(messageDiv, profileFooter.firstChild);
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transition = 'opacity 0.3s ease';
                setTimeout(() => messageDiv.remove(), 300);
            }
        }, 5000);
    }
}