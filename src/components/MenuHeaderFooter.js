import { navigateTo, performLogout } from '../main.js';
import texto_e_livro from '../images/texto_e_livro.png';

export async function createShell(appContainer) {
    // Evita renderizar o shell mais de uma vez
    if (document.querySelector('.shell-header')) {
        return;
    }

    console.log('Criando shell da aplicação...');
    
    let user = null;
    try {
        const response = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        if (response.ok) {
            user = await response.json();
            console.log('Usuário carregado no shell:', user.nome);
        } else {
            console.log('Usuário não logado no shell');
        }
    } catch (error) {
        console.error('Erro ao carregar perfil do usuário no shell:', error);
    }

    const isAdmin = user && user.tipo === 'admin';
    console.log('É admin?', isAdmin);

    // Avatar padrão se não houver avatar_url
    const avatarUrl = user?.avatar_url || 'https://i.pravatar.cc/150?img=' + (user?.id || 12);

    let navLinksHtml = '';
    let footerHtml = '';
    
    if (isAdmin) {
        // Menu para o Administrador
        navLinksHtml = `
            <a href="#" data-target="books">📚 Catálogo de Livros</a>
            <a href="#" data-target="admin">⚙️ Painel Admin</a>
            <a href="#" data-target="profile">👤 Meu Perfil</a>
            <a href="#" id="logout">🚪 Sair</a>
        `;
        footerHtml = ''; 
    } else {
        // Menu para o Usuário Comum
        navLinksHtml = `
            <a href="#" data-target="books">📚 Explorar Livros</a>
            <a href="#" data-target="dashboard">📊 Meus Empréstimos</a>
            <a href="#" data-target="shelves">📚 Minhas Prateleiras</a>
            <a href="#" data-target="profile">👤 Meu Perfil</a>
            <a href="#" id="logout">🚪 Sair</a>
        `;
        // Footer de navegação para usuários comuns
        footerHtml = `
            <footer class="footer-nav">
                <button class="footer-btn active" data-target="books" title="Explorar Livros">
                    🏠 <span>Início</span>
                </button>
                <button class="footer-btn" data-target="dashboard" title="Meus Empréstimos">
                    📊<span>Empréstimos</span>
                </button>
                <button class="footer-btn" data-target="shelves" title="Minhas Prateleiras">
                    📚<span>Prateleiras</span>
                </button>
                <button class="footer-btn" data-target="profile" title="Meu Perfil">
                    👤<span>Perfil</span>
                </button>
            </footer>
        `;
    }

    appContainer.innerHTML = `
        <style>
            .shell-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 16px;
                height: 100px;
                background: var(--branco);
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
                position: fixed;
                top: 0;
                width: 100%;
                z-index: 1003;
            }

            .header-left,
            .header-center,
            .header-right {
                display: flex;
                align-items: center;
                flex: 1;
            }

            .header-left {
                justify-content: flex-start;
            }

            .header-center {
                justify-content: center;
            }

            .header-right {
                justify-content: flex-end;
                padding-right: 25px;
            }

            .shell-header .avatar {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                object-fit: cover;
                cursor: pointer;
                transition: transform 0.2s ease;
            }

            .shell-header .avatar:hover {
                transform: scale(1.1);
            }

            .shell-header .logo {
                height: 80px;
                object-fit: contain;
            }

            .menu-btn {
                font-size: 24px;
                background: var(--azul-escuro);
                color: white !important;
                border: none;
                border-radius: 6px;
                padding: 6px 12px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .menu-btn:hover {
                transform: scale(1.1);
                background: var(--azul-original);
            }

            .menu-header {
                text-align: center;
                padding: 20px 0;
                border-bottom: 1px solid #e2e8f0;
                margin-bottom: 10px;
            }

            .menu-header img {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                margin-bottom: 10px;
            }

            .menu-header h3 {
                color: var(--azul-escuro);
                margin: 0 0 5px 0;
                font-size: 16px;
            }

            .menu-header p {
                color: var(--azul-claro);
                margin: 0;
                font-size: 12px;
            }

            .menu-header hr {
                border: 1px solid #e2e8f0;
                margin: 15px 0;
            }

            #menu-wrapper nav a {
                display: block;
                padding: 15px 20px;
                color: var(--azul-escuro);
                font-size: 16px;
                text-decoration: none;
                border-left: 3px solid transparent;
                transition: all 0.3s ease;
            }

            #menu-wrapper nav a:hover {
                background-color: #f8f9fa;
                border-left-color: var(--azul-original);
                padding-left: 25px;
            }

            .footer-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px 4px;
                min-height: 50px;
                justify-content: center;
            }

            .footer-btn span {
                font-size: 10px;
                margin-top: 2px;
                line-height: 1;
            }

            @media (max-width: 768px) {
                .shell-header .avatar {
                    width: 45px;
                    height: 45px;
                }

                .shell-header .logo {
                    height: 60px;
                }

                .footer-btn span {
                    font-size: 9px;
                }
            }
        </style>

        <header class="shell-header">
            <div class="header-left">
                <img src="${avatarUrl}" 
                     alt="Avatar de ${user?.nome || 'Usuário'}" 
                     class="avatar" 
                     id="avatar-img" 
                     title="${user?.nome || 'Usuário'}"/>
            </div>

            <div class="header-center">
                <img src="${texto_e_livro}" 
                     alt="Logo Librain" 
                     class="logo" 
                     title="Sistema Librain"/>
            </div>

            <div class="header-right">
                <button class="menu-btn" id="hamburger" title="Menu">☰</button>
            </div>
        </header>

        <div id="menu-wrapper" style="background: white;">
            <div class="menu-header">
                <img src="${avatarUrl}" alt="Avatar"/>
                <h3>${user?.nome || 'Usuário'}</h3>
                <p>${isAdmin ? 'Administrador' : 'Leitor'}</p>
                <hr/>
            </div>
            <nav>${navLinksHtml}</nav>
        </div>

        <div id="overlay-menu"></div>

        <div class="content"></div>

        ${footerHtml}
    `;

    console.log('Shell HTML criado');

    // Configurar event listeners
    setupShellEventListeners(user, isAdmin);
}

function setupShellEventListeners(user, isAdmin) {
    const menuWrapper = document.getElementById('menu-wrapper');
    const overlay = document.getElementById('overlay-menu');
    const hamburger = document.getElementById('hamburger');
    const avatarImg = document.getElementById('avatar-img');

    if (!menuWrapper || !overlay || !hamburger) {
        console.error('Elementos do menu não encontrados');
        return;
    }

    // Toggle do menu hamburger
    hamburger.addEventListener('click', () => {
        const isOpen = menuWrapper.classList.contains('show');
        console.log('Toggle menu:', !isOpen);
        
        menuWrapper.classList.toggle('show');
        overlay.classList.toggle('show');
        hamburger.textContent = isOpen ? '☰' : '✕';
    });

    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', () => {
        console.log('Fechando menu pelo overlay');
        menuWrapper.classList.remove('show');
        overlay.classList.remove('show');
        hamburger.textContent = '☰';
    });

    // Navegação pelo menu lateral
    menuWrapper.addEventListener('click', async (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        
        e.preventDefault();
        console.log('Clique no menu:', a.dataset.target || a.id);
        
        // Fechar menu
        menuWrapper.classList.remove('show');
        overlay.classList.remove('show');
        hamburger.textContent = '☰';
        
        if (a.dataset.target) {
            console.log('Navegando para:', a.dataset.target);
            navigateTo(a.dataset.target, { user });
        } else if (a.id === 'logout') {
            console.log('Fazendo logout...');
            if (confirm('Deseja realmente sair do sistema?')) {
                await performLogout();
            }
        }
    });

    // Click no avatar para ir ao perfil
    if (avatarImg) {
        avatarImg.addEventListener('click', () => {
            console.log('Clique no avatar, indo para perfil');
            navigateTo('profile', { user });
        });
    }

    // Navegação pelo footer (apenas para usuários não-admin)
    if (!isAdmin) {
        const footerBtns = document.querySelectorAll('.footer-btn');
        footerBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.target;
                console.log('Footer navegação:', target);
                
                if (target) {
                    // Atualizar botão ativo
                    footerBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Navegar
                    navigateTo(target, { user });
                }
            });
        });
    }

    // Fechar menu com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuWrapper.classList.contains('show')) {
            menuWrapper.classList.remove('show');
            overlay.classList.remove('show');
            hamburger.textContent = '☰';
        }
    });

    console.log('Event listeners do shell configurados');
}

// Função para atualizar avatar no shell
export function updateShellAvatar(newAvatarUrl) {
    console.log('🔄 Atualizando avatar no shell');
    
    const avatarElements = document.querySelectorAll('.avatar, .menu-header img');
    
    avatarElements.forEach(img => {
        if (img) {
            img.src = newAvatarUrl;
            
            img.onerror = () => {
                console.warn('⚠️ Erro ao carregar avatar, usando fallback');
                img.src = 'https://i.pravatar.cc/150?img=12';
            };
        }
    });
    
    console.log(`✅ ${avatarElements.length} avatares atualizados`);
}

// Função para atualizar nome do usuário no shell
export function updateShellUserName(newName) {
    const nameElement = document.querySelector('.menu-header h3');
    if (nameElement) {
        nameElement.textContent = newName;
    }
    
    const avatarElements = document.querySelectorAll('.avatar');
    avatarElements.forEach(img => {
        if (img) {
            img.alt = `Avatar de ${newName}`;
            img.title = newName;
        }
    });
    
    console.log('✅ Nome do usuário atualizado para:', newName);
}