import { renderLoginPage } from './components/LoginPage.js';
import { renderBookList } from './components/BookList.js';
import { renderUserDashboard } from './components/UserDashboard.js';
import { renderAdminPanel } from './components/AdminPanel.js';
import { renderUserProfile } from './components/UserProfile.js';
import { renderBookDetails } from './components/BookDetails.js';
import { renderUserRegistration } from './components/UserRegistration.js';
import { createShell } from './components/MenuHeaderFooter.js';
import { renderShelves } from './components/Shelves.js';

const app = document.getElementById('app');

// Verificar se o usuário está logado
async function checkAuthStatus() {
    try {
        const response = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
        return null;
    }
}

export async function initApp() {
    console.log('Inicializando aplicação...');
    
    // Verificar URL atual para navegação direta
    const hash = window.location.hash;
    const path = hash.substring(1); // Remove o #
    
    if (path.startsWith('details/')) {
        const bookId = path.split('/')[1];
        if (bookId && !isNaN(bookId)) {
            const user = await checkAuthStatus();
            if (user) {
                navigateTo('details', { bookId: parseInt(bookId), user });
                return;
            }
        }
    }
    
    // Verificar autenticação para outras rotas
    const user = await checkAuthStatus();
    
    if (user) {
        console.log('Usuário logado:', user.nome);
        // Navegar baseado no tipo de usuário e URL atual
        if (path === 'admin' && user.tipo === 'admin') {
            navigateTo('admin', { user });
        } else if (path === 'profile') {
            navigateTo('profile', { user });
        } else if (path === 'dashboard') {
            navigateTo('dashboard', { user });
        } else if (path === 'shelves') {
            navigateTo('shelves', { user });
        } else {
            navigateTo('books', { user });
        }
    } else {
        console.log('Usuário não logado, redirecionando para login');
        navigateTo('login');
    }
}

export async function navigateTo(screen, params = {}) {
    console.log('Navegando para:', screen, 'Parâmetros:', params);
    
    let user = params.user;
    
    // Se não temos usuário nos parâmetros e não é uma tela pública, verificar autenticação
    if (!user && screen !== 'login' && screen !== 'register') {
        user = await checkAuthStatus();
        if (!user) {
            console.log('Sessão expirada, redirecionando para login');
            navigateTo('login');
            return;
        }
        params.user = user;
    }

    // Atualizar URL no navegador
    if (screen === 'details' && params.bookId) {
        window.history.pushState({}, '', `#details/${params.bookId}`);
    } else if (screen !== 'login' && screen !== 'register') {
        window.history.pushState({}, '', `#${screen}`);
    } else {
        window.history.pushState({}, '', '#');
    }

    // Limpar container apropriado
    if (screen === 'login' || screen === 'register') {
        // Para login/register, limpar toda a app
        app.innerHTML = '';
    } else {
        // Para outras telas, verificar se shell existe
        if (!document.querySelector('.shell-header')) {
            await createShell(app);
        }
        
        const content = document.querySelector('.content');
        if (content) {
            content.innerHTML = '';
        }
    }

    // Renderizar tela apropriada
    const container = (screen === 'login' || screen === 'register') ? app : document.querySelector('.content');
    
    if (!container) {
        console.error('Container não encontrado para a tela:', screen);
        return;
    }

    try {
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
                    await renderBookDetails(container, params.bookId);
                } else {
                    console.error('BookId não fornecido para detalhes');
                    navigateTo('books', params);
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
                
            case 'admin':
                if (user && user.tipo === 'admin') {
                    await renderAdminPanel(container);
                } else {
                    console.error('Acesso negado ao painel admin');
                    alert('Acesso negado!');
                    navigateTo('books', params);
                }
                break;
                
            default:
                console.log('Tela não reconhecida, redirecionando para books');
                navigateTo('books', params);
        }
    } catch (error) {
        console.error('Erro ao renderizar tela:', error);
        container.innerHTML = `
            <div class="no-books">
                <h3>Erro ao carregar página</h3>
                <p>Ocorreu um erro inesperado. Tente novamente.</p>
                <button onclick="location.reload()" class="btn">Recarregar</button>
            </div>
        `;
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

// Manipular navegação do navegador (botões voltar/avançar)
window.addEventListener('popstate', () => {
    const hash = window.location.hash.substring(1);
    if (hash.startsWith('details/')) {
        const bookId = hash.split('/')[1];
        if (bookId && !isNaN(bookId)) {
            navigateTo('details', { bookId: parseInt(bookId) });
        }
    } else if (hash) {
        navigateTo(hash);
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
            navigateTo(href);
        }
    }
});

// Função utilitária para logout
export async function performLogout() {
    try {
        await fetch('http://localhost:3000/api/logout', { 
            method: 'POST',
            credentials: 'include'
        });
        console.log('Logout realizado com sucesso');
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
    
    // Limpar estado local
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirecionar para login
    navigateTo('login');
}

// Função utilitária para mostrar loading
export function showLoading(container, message = 'Carregando...') {
    if (container) {
        container.innerHTML = `<div class="loading">${message}</div>`;
    }
}

// Função utilitária para mostrar erro
export function showError(container, message = 'Ocorreu um erro') {
    if (container) {
        container.innerHTML = `
            <div class="no-books">
                <h3>Erro</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn">Tentar Novamente</button>
            </div>
        `;
    }
}

// Inicializar aplicação quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

console.log('main.js carregado');