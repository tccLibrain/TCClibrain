import { renderLoginPage } from './components/LoginPage.js';
import { renderBookList } from './components/BookList.js';
import { renderUserDashboard } from './components/UserDashboard.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderUserProfile } from './components/UserProfile.js';
import { renderBookDetails } from './components/BookDetails.js';
import { renderUserRegistration } from './components/UserRegistration.js';
import { createShell } from './components/MenuHeaderFooter.js';
import { renderShelves } from './components/Shelves.js';
import { renderForgotPasswordPage } from './components/ForgotPassword.js';
import { renderResetPasswordPage } from './components/ResetPassword.js';

const app = document.getElementById('app');

// Estado global da aplicação
let currentUser = null;
let contentContainer = null;

// Verificar se o usuário está logado
async function checkAuthStatus() {
    try {
        const response = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            return user;
        }
        currentUser = null;
        return null;
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
        currentUser = null;
        return null;
    }
}

export async function initApp() {
    console.log('Inicializando aplicação...');
    
    // Verificar URL atual para navegação direta
    const hash = window.location.hash || '#books';
    const [route, ...params] = hash.substring(1).split('/');
    
    console.log('Hash inicial:', hash, 'Route:', route, 'Params:', params);
    
    // Verificar autenticação
    const user = await checkAuthStatus();
    
    // Rotas que não precisam de autenticação
    if (route === 'login' || route === 'register' || route === 'forgot-password' || route === 'reset-password') {
        navigateTo(route);
        return;
    }
    
    // Para outras rotas, verificar se está logado
    if (!user) {
        console.log('Usuário não logado, redirecionando para login');
        navigateTo('login');
        return;
    }
    
    // Navegar para a rota apropriada
    if (route === 'details' && params[0]) {
        const bookId = parseInt(params[0]);
        if (!isNaN(bookId)) {
            navigateTo('details', { bookId, user });
            return;
        }
    }
    
    // Para outras rotas
    if (['books', 'dashboard', 'profile', 'shelves', 'admin'].includes(route)) {
        navigateTo(route, { user });
    } else {
        navigateTo('books', { user });
    }
}

export async function navigateTo(screen, params = {}) {
    console.log('Navegando para:', screen, 'Parâmetros:', params);
    
    let user = params.user || currentUser;
    
    // Se não temos usuário e não é uma tela pública, verificar autenticação
    if (!user && screen !== 'login' && screen !== 'register' && screen !== 'forgot-password' && screen !== 'reset-password') {
        user = await checkAuthStatus();
        if (!user) {
            console.log('Sessão expirada, redirecionando para login');
            navigateTo('login');
            return;
        }
        params.user = user;
        currentUser = user;
    }

    // Atualizar URL no navegador
    updateBrowserURL(screen, params);

    // Preparar containers
    const container = await setupContainer(screen, user);
    if (!container) {
        console.error('Container não encontrado para a tela:', screen);
        return;
    }

    // Renderizar tela apropriada
    try {
        await renderScreen(screen, container, params);
    } catch (error) {
        console.error('Erro ao renderizar tela:', error);
        showError(container, 'Erro ao carregar página. Tente novamente.');
    }
}

function updateBrowserURL(screen, params) {
    let url = '#';
    if (screen === 'details' && params.bookId) {
        url = `#details/${params.bookId}`;
    } else if (screen !== 'login' && screen !== 'register' && screen !== 'forgot-password' && screen !== 'reset-password') {
        url = `#${screen}`;
    } else {
        url = `#${screen}`;
    }
    
    if (window.location.hash !== url) {
        window.history.pushState({}, '', url);
    }
}

async function setupContainer(screen, user) {
    if (screen === 'login' || screen === 'register' || screen === 'forgot-password' || screen === 'reset-password') {
        // Para login/register/forgot/reset, limpar toda a app
        app.innerHTML = '';
        return app;
    } else {
        // Para outras telas, verificar se shell existe
        if (!document.querySelector('.shell-header')) {
            console.log('Criando shell...');
            await createShell(app);
        }
        
        contentContainer = document.querySelector('.content');
        if (contentContainer) {
            contentContainer.innerHTML = '';
            return contentContainer;
        } else {
            console.error('Container .content não encontrado!');
            return app;
        }
    }
}

async function renderScreen(screen, container, params) {
    const user = params.user || currentUser;
    
    switch (screen) {
        case 'login':
            renderLoginPage(container);
            break;
            
        case 'register':
            renderUserRegistration(container);
            break;
            
        case 'books':
            await renderBookList(container);
            updateActiveFooterButton('books');
            break;
            
        case 'details':
            if (params.bookId) {
                console.log('Renderizando detalhes do livro:', params.bookId);
                await renderBookDetails(container, params.bookId);
                clearActiveFooterButton();
            } else {
                console.error('BookId não fornecido para detalhes');
                navigateTo('books', { user });
            }
            break;
            
        case 'dashboard':
            await renderUserDashboard(container);
            updateActiveFooterButton('dashboard');
            break;
            
        case 'profile':
            await renderUserProfile(container);
            updateActiveFooterButton('profile');
            break;
            
        case 'shelves':
            await renderShelves(container);
            updateActiveFooterButton('shelves');
            break;

        case 'forgot-password':
            renderForgotPasswordPage(container);
            break;
            
        case 'reset-password':
            renderResetPasswordPage(container, params);
            break;
            
        case 'admin':
            if (user && user.tipo === 'admin') {
                await renderAdminPanel(container);
                clearActiveFooterButton();
            } else {
                console.error('Acesso negado ao painel admin');
                alert('Acesso negado! Apenas administradores.');
                navigateTo('books', { user });
            }
            break;
            
        default:
            console.log('Tela não reconhecida, redirecionando para books');
            navigateTo('books', { user });
    }
}

// Função para atualizar botão ativo no footer
function updateActiveFooterButton(screen) {
    const footerButtons = document.querySelectorAll('.footer-btn');
    footerButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.target === screen) {
            btn.classList.add('active');
        }
    });
}

function clearActiveFooterButton() {
    const footerButtons = document.querySelectorAll('.footer-btn');
    footerButtons.forEach(btn => btn.classList.remove('active'));
}

// Manipular navegação do navegador (botões voltar/avançar)
window.addEventListener('popstate', () => {
    console.log('PopState event, hash:', window.location.hash);
    const hash = window.location.hash || '#books';
    const [route, ...params] = hash.substring(1).split('/');
    
    if (route === 'details' && params[0]) {
        const bookId = parseInt(params[0]);
        if (!isNaN(bookId)) {
            navigateTo('details', { bookId });
            return;
        }
    }
    
    if (route) {
        navigateTo(route);
    } else {
        navigateTo('books');
    }
});

// Interceptar cliques em links internos
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link) {
        e.preventDefault();
        const href = link.getAttribute('href').substring(1);
        if (href) {
            const [route, ...params] = href.split('/');
            if (route === 'details' && params[0]) {
                const bookId = parseInt(params[0]);
                if (!isNaN(bookId)) {
                    navigateTo('details', { bookId });
                    return;
                }
            }
            navigateTo(route);
        }
    }
});

// Função utilitária para logout
export async function performLogout() {
    console.log('Realizando logout...');
    
    try {
        const response = await fetch('http://localhost:3000/api/logout', { 
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('Logout realizado com sucesso');
        } else {
            console.warn('Erro no logout no servidor, mas continuando...');
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
    
    // Limpar estado local
    currentUser = null;
    localStorage.clear();
    sessionStorage.clear();
    
    // Limpar DOM
    if (app) {
        app.innerHTML = '';
    }
    
    // Redirecionar para login
    navigateTo('login');
    
    // Pequeno delay para garantir que tudo foi limpo
    setTimeout(() => {
        if (window.location.hash !== '#login') {
            window.location.hash = '#login';
        }
    }, 100);
}

// Função utilitária para mostrar loading
export function showLoading(container, message = 'Carregando...') {
    if (!container) return;
    
    container.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            color: var(--azul-claro);
        ">
            <div style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid var(--azul-original);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <p style="margin: 0; font-size: 16px;">${message}</p>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

// Função utilitária para mostrar erro
export function showError(container, message = 'Ocorreu um erro') {
    if (!container) return;
    
    container.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            color: #dc3545;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            margin: 20px;
        ">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h3 style="margin: 0 0 10px 0; color: #721c24;">Erro</h3>
            <p style="margin: 0; font-size: 16px; color: #721c24;">${message}</p>
            <button onclick="window.location.reload()" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: var(--azul-original);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
            ">
                Tentar Novamente
            </button>
        </div>
    `;
}

// Função utilitária para obter usuário atual
export function getCurrentUser() {
    return currentUser;
}

// Função utilitária para atualizar usuário atual
export function setCurrentUser(user) {
    currentUser = user;
    console.log('Usuário atualizado:', user ? user.nome : 'null');
}

// Função para verificar se usuário é admin
export function isAdmin() {
    return currentUser && currentUser.tipo === 'admin';
}

// Interceptar erros globais
window.addEventListener('error', (event) => {
    console.error('Erro global capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejeitada não tratada:', event.reason);
});

// Inicializar aplicação quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

console.log('main.js carregado e inicializado');