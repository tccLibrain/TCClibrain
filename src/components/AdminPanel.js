import { navigateTo, performLogout, showLoading, showError } from '../main.js';

function createPlaceholderImage(title) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="80" height="120" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#9dadb7"/>
            <text x="50%" y="50%" font-family="Arial" font-size="10" fill="#ffffff" 
                  text-anchor="middle" dominant-baseline="middle">${title?.substring(0, 6) || 'Livro'}</text>
        </svg>
    `)}`;
}

export async function renderAdminPanel(container) {
    console.log('Carregando painel administrativo...');
    showLoading(container, 'Carregando painel administrativo...');
    
    let currentUser = null;
    let dashboardData = null;
    let allBooks = [];
    
    try {
        // Verificar se usuário é admin
        const profileResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!profileResponse.ok) {
            navigateTo('login');
            return;
        }
        
        currentUser = await profileResponse.json();
        if (currentUser.tipo !== 'admin') {
            alert('Acesso negado! Apenas administradores podem acessar esta área.');
            navigateTo('books');
            return;
        }
        
        console.log('Admin autenticado:', currentUser.nome);

        // Carregar dados do dashboard
        const dashboardResponse = await fetch('http://localhost:3000/api/admin/dashboard', {
            credentials: 'include'
        });
        
        if (dashboardResponse.ok) {
            dashboardData = await dashboardResponse.json();
        } else {
            throw new Error('Erro ao carregar dashboard');
        }

        // Carregar todos os livros
        const booksResponse = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        
        if (booksResponse.ok) {
            allBooks = await booksResponse.json();
        }

    } catch (error) {
        console.error('Erro ao carregar dados do admin:', error);
        showError(container, 'Erro ao carregar painel administrativo.');
        return;
    }

    renderAdminContent(container, currentUser, dashboardData, allBooks);
}

function renderAdminContent(container, currentUser, dashboardData, allBooks) {
    const { stats, emprestimos_ativos, devolucoes_pendentes } = dashboardData;
    
    container.innerHTML = `
        <style>
            .admin-container {
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .admin-header {
                text-align: center;
                margin-bottom: 30px;
                background: var(--branco);
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .admin-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: var(--branco);
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                text-align: center;
                transition: transform 0.3s ease;
            }
            
            .stat-card:hover {
                transform: translateY(-2px);
            }
            
            .stat-number {
                font-size: 32px;
                font-weight: bold;
                color: var(--azul-escuro);
                display: block;
                margin-bottom: 8px;
            }
            
            .stat-label {
                color: var(--azul-claro);
                font-size: 14px;
            }
            
            .admin-section {
                background: var(--branco);
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            
            .admin-section h2 {
                color: var(--azul-escuro);
                margin: 0 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--cinza-claro);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .section-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid var(--cinza-claro);
            }
            
            .tab-btn {
                padding: 10px 20px;
                border: none;
                background: none;
                color: var(--azul-claro);
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.3s;
            }
            
            .tab-btn.active {
                color: var(--azul-escuro);
                border-bottom-color: var(--azul-original);
                font-weight: bold;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .admin-form {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            
            .admin-form input {
                padding: 8px 12px;
                border: 1px solid var(--cinza-escuro);
                border-radius: 6px;
                font-size: 14px;
            }
            
            .admin-list {
                list-style: none;
                padding: 0;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .admin-list li {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border-bottom: 1px solid var(--cinza-claro);
                border-radius: 8px;
                margin-bottom: 8px;
                background: var(--cinza-claro);
            }
            
            .item-info {
                flex: 1;
            }
            
            .item-title {
                font-weight: bold;
                color: var(--azul-escuro);
                margin-bottom: 4px;
            }
            
            .item-subtitle {
                color: var(--azul-claro);
                font-size: 14px;
            }
            
            .item-status {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 4px;
                display: inline-block;
            }
            
            .status-active {
                background: #d4edda;
                color: #155724;
            }
            
            .status-overdue {
                background: #f8d7da;
                color: #721c24;
            }
            
            .status-pending {
                background: #fff3cd;
                color: #856404;
            }
            
            .item-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .btn-small {
                padding: 6px 12px;
                font-size: 12px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .btn-approve {
                background-color: #28a745;
                color: white;
            }
            
            .btn-approve:hover {
                background-color: #218838;
            }
            
            .btn-view {
                background-color: var(--azul-original);
                color: white;
            }
            
            .btn-view:hover {
                background-color: var(--azul-escuro);
            }
            
            .books-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 15px;
                max-height: 500px;
                overflow-y: auto;
                padding: 10px;
            }
            
            .book-card-admin {
                background: var(--cinza-claro);
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                transition: transform 0.3s ease;
                cursor: pointer;
            }
            
            .book-card-admin:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            
            .book-card-admin img {
                width: 80px;
                height: 120px;
                object-fit: cover;
                border-radius: 4px;
                margin-bottom: 8px;
            }
            
            .book-card-admin .book-title {
                font-size: 11px;
                font-weight: bold;
                color: var(--azul-escuro);
                margin-bottom: 4px;
                line-height: 1.2;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .book-card-admin .book-author {
                font-size: 10px;
                color: var(--azul-claro);
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
            }
            
            .book-status-badge {
                font-size: 9px;
                padding: 2px 6px;
                border-radius: 8px;
                margin-top: 4px;
                display: inline-block;
            }
            
            .available {
                background: #d4edda;
                color: #155724;
            }
            
            .borrowed {
                background: #f8d7da;
                color: #721c24;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: var(--azul-claro);
                font-style: italic;
            }
            
            .search-box {
                width: 100%;
                padding: 10px;
                border: 1px solid var(--cinza-escuro);
                border-radius: 6px;
                margin-bottom: 15px;
                font-size: 14px;
            }
            
            .actions-row {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 20px;
            }
            
            @media (max-width: 768px) {
                .admin-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .books-grid {
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 10px;
                }
                
                .item-actions {
                    flex-direction: column;
                    align-items: stretch;
                }
            }
        </style>

        <div class="admin-container">
            <div class="admin-header">
                <h1>Painel Administrativo</h1>
                <p>Bem-vindo, ${currentUser.nome}!</p>
            </div>

            <div class="admin-stats">
                <div class="stat-card">
                    <span class="stat-number">${stats.total_usuarios}</span>
                    <span class="stat-label">Usuários Cadastrados</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.total_livros}</span>
                    <span class="stat-label">Total de Livros</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.emprestimos_ativos}</span>
                    <span class="stat-label">Empréstimos Ativos</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${stats.devolucoes_pendentes}</span>
                    <span class="stat-label">Devoluções Pendentes</span>
                </div>
            </div>

            <div class="admin-section">
                <div class="section-tabs">
                    <button class="tab-btn active" data-tab="devolucoes">
                        Devoluções Pendentes (${devolucoes_pendentes.length})
                    </button>
                    <button class="tab-btn" data-tab="emprestimos">
                        Empréstimos Ativos (${emprestimos_ativos.length})
                    </button>
                    <button class="tab-btn" data-tab="catalogo">
                        Catálogo Completo (${allBooks.length})
                    </button>
                    <button class="tab-btn" data-tab="usuarios">
                        Gerenciar Usuários
                    </button>
                </div>

                <div id="devolucoes" class="tab-content active">
                    <h2>Devoluções Aguardando Aprovação</h2>
                    <ul class="admin-list">
                        ${devolucoes_pendentes.length > 0 ? 
                            devolucoes_pendentes.map(dev => `
                                <li>
                                    <div class="item-info">
                                        <div class="item-title">${dev.title || 'Livro ID: ' + dev.bookId}</div>
                                        <div class="item-subtitle">
                                            Solicitado por: ${dev.user_name || dev.cpf}
                                        </div>
                                        <span class="item-status status-pending">Aguardando Aprovação</span>
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn-small btn-approve" 
                                                data-bookid="${dev.bookId}" 
                                                data-cpf="${dev.cpf}">
                                            Aprovar Devolução
                                        </button>
                                        <button class="btn-small btn-view" 
                                                data-bookid="${dev.bookId}">
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </li>
                            `).join('') 
                            : '<li class="empty-state">Nenhuma devolução pendente</li>'
                        }
                    </ul>
                </div>

                <div id="emprestimos" class="tab-content">
                    <h2>Empréstimos Ativos</h2>
                    <ul class="admin-list">
                        ${emprestimos_ativos.length > 0 ? 
                            emprestimos_ativos.map(emp => `
                                <li>
                                    <div class="item-info">
                                        <div class="item-title">${emp.title || 'Livro ID: ' + emp.bookId}</div>
                                        <div class="item-subtitle">
                                            Emprestado para: ${emp.user_name || emp.cpf}<br>
                                            Devolução prevista: ${emp.data_devolucao_formatada || 'Não informada'}
                                        </div>
                                        <span class="item-status ${emp.dias_atraso > 0 ? 'status-overdue' : 'status-active'}">
                                            ${emp.dias_atraso > 0 ? `${emp.dias_atraso} dias de atraso` : 'Em dia'}
                                        </span>
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn-small btn-view" 
                                                data-bookid="${emp.bookId}">
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </li>
                            `).join('') 
                            : '<li class="empty-state">Nenhum empréstimo ativo</li>'
                        }
                    </ul>
                </div>

                <div id="catalogo" class="tab-content">
                    <h2>Catálogo Completo de Livros</h2>
                    <input type="text" class="search-box" id="book-search" placeholder="Pesquisar livros...">
                    <div class="books-grid" id="books-grid">
                        ${allBooks.map(book => `
                            <div class="book-card-admin" data-bookid="${book.id}">
                                <img src="${book.cover || createPlaceholderImage(book.title)}" 
                                     alt="${book.title}"
                                     onerror="this.src='${createPlaceholderImage('Erro')}'">
                                <div class="book-title">${book.title || 'Título não disponível'}</div>
                                <div class="book-author">${book.author || 'Autor desconhecido'}</div>
                                <span class="book-status-badge ${book.available !== false ? 'available' : 'borrowed'}">
                                    ${book.available !== false ? 'Disponível' : 'Emprestado'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div id="usuarios" class="tab-content">
                    <h2>Gerenciar Usuários</h2>
                    <div class="admin-form">
                        <input type="text" id="admin-cpf" placeholder="CPF do usuário" maxlength="14">
                        <button id="btn-add-admin" class="btn">Promover a Admin</button>
                    </div>
                    <div id="users-list">
                        <p>Carregando lista de usuários...</p>
                    </div>
                </div>
            </div>

            <div class="actions-row">
                <button id="btn-relatorio" class="btn">Gerar Relatório</button>
                <button id="btn-configuracoes" class="btn">Configurações</button>
                <button id="btn-logout" class="btn btn-secondary">Sair do Sistema</button>
            </div>
        </div>
    `;

    setupAdminEventListeners(container, allBooks);
}

function setupAdminEventListeners(container, allBooks) {
    // Sistema de abas
    const tabBtns = container.querySelectorAll('.tab-btn');
    const tabContents = container.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remover active de todas as abas
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Adicionar active na aba clicada
            btn.classList.add('active');
            const targetContent = container.querySelector(`#${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Carregar dados específicos da aba se necessário
            if (targetTab === 'usuarios') {
                loadUsersList();
            }
        });
    });

    // Busca de livros
    const bookSearch = container.querySelector('#book-search');
    const booksGrid = container.querySelector('#books-grid');

    if (bookSearch && booksGrid) {
        bookSearch.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const bookCards = booksGrid.querySelectorAll('.book-card-admin');
            
            bookCards.forEach(card => {
                const title = card.querySelector('.book-title').textContent.toLowerCase();
                const author = card.querySelector('.book-author').textContent.toLowerCase();
                
                if (title.includes(query) || author.includes(query)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Click nos livros do catálogo
    container.addEventListener('click', (e) => {
        const bookCard = e.target.closest('.book-card-admin');
        if (bookCard) {
            const bookId = bookCard.dataset.bookid;
            navigateTo('details', { bookId: parseInt(bookId) });
        }
    });

    // Aprovar devoluções
    container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-approve')) {
            const bookId = e.target.dataset.bookid;
            const cpf = e.target.dataset.cpf;

            if (!confirm('Aprovar esta devolução?')) return;

            try {
                const response = await fetch('http://localhost:3000/api/admin/approve-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId), cpf })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Devolução aprovada!');
                    renderAdminPanel(container);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao aprovar devolução:', error);
                alert('Erro de conexão.');
            }
        }

        // Ver detalhes do livro
        if (e.target.classList.contains('btn-view')) {
            const bookId = e.target.dataset.bookid;
            navigateTo('details', { bookId: parseInt(bookId) });
        }
    });

    // Promover usuário a admin
    const addAdminBtn = container.querySelector('#btn-add-admin');
    const cpfInput = container.querySelector('#admin-cpf');

    if (addAdminBtn && cpfInput) {
        // Máscara para CPF
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });

        addAdminBtn.addEventListener('click', async () => {
            const cpf = cpfInput.value.trim();
            if (!cpf) {
                alert('Por favor, insira um CPF.');
                return;
            }

            if (!confirm(`Deseja promover o usuário com CPF ${cpf} a administrador?`)) {
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/admin/add-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ cpf })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Usuário promovido com sucesso!');
                    cpfInput.value = '';
                    loadUsersList();
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao promover usuário:', error);
                alert('Erro de conexão.');
            }
        });
    }

    // Função para carregar lista de usuários
    async function loadUsersList() {
        const usersList = container.querySelector('#users-list');
        if (!usersList) return;

        try {
            usersList.innerHTML = '<p>Carregando usuários...</p>';

            const response = await fetch('http://localhost:3000/api/users', {
                credentials: 'include'
            });

            if (response.ok) {
                const users = await response.json();
                
                if (users.length === 0) {
                    usersList.innerHTML = '<p>Nenhum usuário encontrado.</p>';
                    return;
                }

                usersList.innerHTML = `
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${users.map(user => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--cinza-claro); background: var(--cinza-claro); margin-bottom: 8px; border-radius: 8px;">
                                <div>
                                    <strong>${user.nome}</strong><br>
                                    <small>CPF: ${user.cpf} | Email: ${user.email}</small><br>
                                    <small>Tipo: ${user.tipo} | Livros lidos: ${user.livros_lidos || 0}</small>
                                </div>
                                <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; background: ${user.tipo === 'admin' ? '#d4edda' : '#cce7ff'}; color: ${user.tipo === 'admin' ? '#155724' : '#004085'};">
                                    ${user.tipo}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                usersList.innerHTML = '<p>Erro ao carregar usuários.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            usersList.innerHTML = '<p>Erro de conexão ao carregar usuários.</p>';
        }
    }

    // Outros botões
    const logoutBtn = container.querySelector('#btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                performLogout();
            }
        });
    }

    const relatorioBtn = container.querySelector('#btn-relatorio');
    if (relatorioBtn) {
        relatorioBtn.addEventListener('click', () => {
            alert('Funcionalidade de relatório será implementada em breve.');
        });
    }

    const configBtn = container.querySelector('#btn-configuracoes');
    if (configBtn) {
        configBtn.addEventListener('click', () => {
            alert('Funcionalidades de configuração serão implementadas em breve.');
        });
    }
}