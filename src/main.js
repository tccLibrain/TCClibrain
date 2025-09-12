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

export async function initApp() {
    try {
        const response = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        if (response.ok) {
            const user = await response.json();
            navigateTo(user.tipo === 'admin' ? 'admin' : 'books', user);
        } else {
            navigateTo('login');
        }
    } catch (error) {
        console.error('Erro na inicialização da aplicação:', error);
        navigateTo('login');
    }
}

export async function navigateTo(screen, params = {}) {
    const user = params.user; // O usuário é passado como parâmetro da função que chamou a navegação

    // Se a tela não for login/cadastro e o usuário não foi passado, tenta buscar
    // Isso acontece quando o usuário navega por links (ex: "/books")
    if (!user && screen !== 'login' && screen !== 'register') {
        const response = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        if (response.ok) {
            params.user = await response.json();
        } else {
            // Se a sessão expirou, redireciona para o login
            screen = 'login';
        }
    }

    // Cria shell apenas em telas que não sejam login ou registro
    if (!document.querySelector('.shell-header') && screen !== 'login' && screen !== 'register') {
        await createShell(app);
    }

    // Limpa o conteúdo da tela
    const content = document.querySelector('.content');
    if (screen === 'login' || screen === 'register') {
        app.innerHTML = ''; // Limpar toda a div app para login/cadastro
    } else if (content) {
        content.innerHTML = '';
    }

    switch (screen) {
        case 'login':
            renderLoginPage(app);
            break;
        case 'register':
            renderUserRegistration(app);
            break;
        case 'books':
            renderBookList(content);
            break;
        case 'details':
            await createShell(app); // Garante que a shell exista
            const detailsContent = document.querySelector('.content'); // Pega o container de conteúdo
            renderBookDetails(detailsContent, params.bookId);
            break;
        case 'dashboard':
            renderUserDashboard(content);
            break;
        case 'profile':
            renderUserProfile(content);
            break;
        case 'shelves':
            renderShelves(content);
            break;
        case 'admin':
            if (params.user?.tipo === 'admin') {
                renderAdminPanel(content);
            } else {
                alert('Acesso negado!');
                renderBookList(content);
            }
            break;
        default:
            renderBookList(content);
    }
}

// Inicializa app
initApp();