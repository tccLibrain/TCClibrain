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

        const dashboardResponse = await fetch('http://localhost:3000/api/admin/dashboard', {
            credentials: 'include'
        });
        
        if (dashboardResponse.ok) {
            dashboardData = await dashboardResponse.json();
        } else {
            throw new Error('Erro ao carregar dashboard');
        }

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
    
    const aguardandoRetirada = emprestimos_ativos.filter(emp => emp.status === 'aguardando_retirada');
    const emprestimosAtivos = emprestimos_ativos.filter(emp => emp.status === 'ativo');
    
    container.innerHTML = `
       <style>
            html, body {
                margin: 0;
                padding: 0;
                background-color: #434E70;
            }

            .admin-container {
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .admin-header {
                text-align: center;
                margin-bottom: 30px;
                background: #CFD2DB;
                padding: 25px 20px;
                border-radius: 25px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .admin-header h1 {
                color: #434E70;
                font-family: arial black;
                margin: 0 0 10px 0;
                font-size: 28px;
            }

            .admin-header p {
                color: #434E70;
                font-family: arial black;
                margin: 0;
                font-size: 14px;
            }
            
            .admin-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: #CFD2DB;
                padding: 25px 20px;
                border-radius: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                text-align: center;
                transition: transform 0.3s ease;
            }
            
            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            }
            
            .stat-number {
                font-size: 36px;
                font-weight: bold;
                color: #434E70;
                display: block;
                margin-bottom: 10px;
                font-family: arial black;
            }
            
            .stat-label {
                color: #434E70;
                font-size: 14px;
                font-family: arial black;
            }
            
            .admin-section {
                background: #CFD2DB;
                padding: 25px;
                border-radius: 25px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 20px;
            }
            
            .section-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 25px;
                border-bottom: 2px solid #434E70;
                flex-wrap: wrap;
                padding-bottom: 5px;
            }
            
            .tab-btn {
                padding: 12px 20px;
                border: none;
                background: none;
                color: #434E70;
                cursor: pointer;
                border-bottom: 3px solid transparent;
                transition: all 0.3s;
                font-family: arial black;
                font-size: 13px;
                border-radius: 10px 10px 0 0;
            }
            
            .tab-btn.active {
                color: #9bb4ff;
                border-bottom-color: #9bb4ff;
                font-weight: bold;
                background: rgba(155, 180, 255, 0.1);
            }

            .tab-btn:hover {
                background: rgba(155, 180, 255, 0.15);
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }

            .tab-content h2 {
                color: #434E70;
                font-family: arial black;
                margin-bottom: 20px;
                font-size: 22px;
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
                padding: 20px;
                border: none;
                border-radius: 20px;
                margin-bottom: 15px;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                gap: 20px;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px;
                color: #434E70;
                font-style: italic;
                font-family: arial black;
            }
            
            .item-info {
                flex: 1;
                min-width: 0;
            }
            
            .item-title {
                font-weight: bold;
                color: #434E70;
                margin-bottom: 8px;
                font-family: arial black;
                font-size: 15px;
            }
            
            .item-subtitle {
                color: #434E70;
                font-size: 13px;
                font-family: arial;
                line-height: 1.6;
                margin-bottom: 8px;
            }
            
            .item-status {
                padding: 6px 16px;
                border-radius: 999px;
                font-size: 12px;
                font-weight: bold;
                display: inline-block;
                font-family: arial black;
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
                gap: 10px;
                flex-wrap: wrap;
                align-items: center;
                justify-content: flex-end;
            }
            
            .btn-small {
                padding: 10px 18px;
                font-size: 12px;
                border: none;
                border-radius: 999px;
                cursor: pointer;
                transition: all 0.3s;
                font-family: arial black;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                white-space: nowrap;
            }

            .btn-small:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }
            
            .btn-approve {
                background-color: #28a745;
                color: white;
            }
            
            .btn-approve:hover {
                background-color: #218838;
            }
            
            .btn-confirm {
                background-color: #007bff;
                color: white;
            }
            
            .btn-confirm:hover {
                background-color: #0056b3;
            }
            
            .btn-view {
                background-color: #9bb4ff;
                color: white;
            }
            
            .btn-view:hover {
                background-color: #7a9dff;
            }

            .btn {
                background-color: #9bb4ff;
                color: white;
                border: none;
                border-radius: 999px;
                padding: 12px 24px;
                font-family: arial black;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            }

            .btn:hover {
                background-color: #7a9dff;
                transform: translateY(-2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }

            .btn-secondary {
                background-color: #6c757d;
            }

            .btn-secondary:hover {
                background-color: #5a6268;
            }
            
            .report-section {
                background: white;
                padding: 20px;
                border-radius: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .report-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .report-card {
                background: #CFD2DB;
                padding: 20px;
                border-radius: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .report-card h4 {
                margin: 0 0 12px 0;
                color: #434E70;
                font-family: arial black;
                font-size: 16px;
            }
            
            .report-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .report-list li {
                padding: 8px 0;
                font-size: 14px;
                color: #434E70;
                font-family: arial;
                line-height: 1.5;
            }
            
            .actions-row {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 20px;
            }

            .search-box, 
            input[type="text"],
            input[type="email"] {
                background-color: white;
                color: #434E70;
                border: 2px solid #9bb4ff;
                border-radius: 999px;
                padding: 12px 20px;
                font-family: arial black;
                font-size: 14px;
                text-align: center;
                outline: none;
                box-sizing: border-box;
                transition: all 0.3s ease;
            }

            .search-box:focus,
            input[type="text"]:focus,
            input[type="email"]:focus {
                border-color: #7a9dff;
                box-shadow: 0 0 0 3px rgba(155, 180, 255, 0.2);
            }

            .admin-form {
                display: flex;
                gap: 10px;
                align-items: center;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }

            .admin-form input {
                flex: 1;
                min-width: 200px;
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
                background: white;
                border-radius: 15px;
                padding: 12px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            }

            .book-card-admin:hover {
                transform: translateY(-5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }

            .book-card-admin img {
                width: 80px;
                height: 120px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 8px;
            }

            .book-title {
                font-size: 11px;
                font-weight: bold;
                color: #434E70;
                margin-bottom: 4px;
                line-height: 1.3;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                font-family: arial black;
            }

            .book-author {
                font-size: 10px;
                color: #434E70;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                font-family: arial;
            }

            .book-status-badge {
                font-size: 9px;
                padding: 4px 10px;
                border-radius: 999px;
                margin-top: 6px;
                display: inline-block;
                font-family: arial black;
            }

            .book-status-badge.available {
                background: #d4edda;
                color: #155724;
            }

            .book-status-badge.borrowed {
                background: #f8d7da;
                color: #721c24;
            }

            .users-card {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border: none;
                margin-bottom: 12px;
                border-radius: 20px;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            @media (max-width: 768px) {
                .admin-container {
                    padding: 15px;
                }

                .admin-header h1 {
                    font-size: 24px;
                }

                .admin-stats {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }

                .stat-card {
                    padding: 20px 15px;
                }

                .stat-number {
                    font-size: 28px;
                }

                .admin-list li {
                    flex-direction: column;
                    align-items: flex-start;
                    padding: 20px;
                    gap: 15px;
                }
                
                .item-actions {
                    width: 100%;
                    flex-direction: column;
                    align-items: stretch;
                }

                .btn-small {
                    width: 100%;
                    padding: 12px;
                }

                .admin-form {
                    flex-direction: column;
                }

                .admin-form input {
                    width: 100%;
                }

                .admin-form .btn {
                    width: 100%;
                }

                .section-tabs {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 10px;
                }

                .tab-btn {
                    white-space: nowrap;
                    font-size: 12px;
                    padding: 10px 15px;
                }

                .books-grid {
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 12px;
                }

                .users-card {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
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
                    ${aguardandoRetirada.length > 0 ? `
                        <button class="tab-btn active" data-tab="aguardando">
                            🕐 Aguardando Retirada (${aguardandoRetirada.length})
                        </button>
                    ` : ''}
                    <button class="tab-btn ${aguardandoRetirada.length === 0 ? 'active' : ''}" data-tab="devolucoes">
                        Devoluções Pendentes (${devolucoes_pendentes.length})
                    </button>
                    <button class="tab-btn" data-tab="emprestimos">
                        Empréstimos Ativos (${emprestimosAtivos.length})
                    </button>
                    <button class="tab-btn" data-tab="catalogo">
                        Catálogo (${allBooks.length})
                    </button>
                    <button class="tab-btn" data-tab="usuarios">
                        Gerenciar Usuários
                    </button>
                    <button class="tab-btn" data-tab="relatorio">
                        📊 Relatórios
                    </button>
                </div>

                ${aguardandoRetirada.length > 0 ? `
                    <div id="aguardando" class="tab-content active">
                        <h2>Empréstimos Aguardando Retirada</h2>
                        <p style="color: #856404; padding: 15px; background: #fff3cd; border-radius: 20px; margin-bottom: 15px; text-align: center; font-family: arial black;">
                            📋 Estes usuários solicitaram empréstimos. Confirme quando retirarem o livro.
                        </p>
                        <ul class="admin-list">
                            ${aguardandoRetirada.map(emp => `
                                <li>
                                    <div class="item-info">
                                        <div class="item-title">${emp.title || 'Livro ID: ' + emp.bookId}</div>
                                        <div class="item-subtitle">
                                            Para: ${emp.user_name || emp.cpf}<br>
                                            Devolução prevista: ${emp.data_devolucao_formatada || 'Não informada'}
                                        </div>
                                        <span class="item-status status-pending">🕐 Aguardando Retirada</span>
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn-small btn-confirm" 
                                                data-bookid="${emp.bookId}"
                                                data-cpf="${emp.cpf}">
                                            ✓ Confirmar Retirada
                                        </button>
                                        <button class="btn-small btn-view" 
                                                data-bookid="${emp.bookId}">
                                            👁 Ver Detalhes
                                        </button>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div id="devolucoes" class="tab-content ${aguardandoRetirada.length === 0 ? 'active' : ''}">
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
                                            ✓ Aprovar Devolução
                                        </button>
                                        <button class="btn-small btn-view" 
                                                data-bookid="${dev.bookId}">
                                            👁 Ver Detalhes
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
                        ${emprestimosAtivos.length > 0 ? 
                            emprestimosAtivos.map(emp => `
                                <li>
                                    <div class="item-info">
                                        <div class="item-title">${emp.title || 'Livro ID: ' + emp.bookId}</div>
                                        <div class="item-subtitle">
                                            Emprestado para: ${emp.user_name || emp.cpf}<br>
                                            Devolução prevista: ${emp.data_devolucao_formatada || 'Não informada'}
                                        </div>
                                        <span class="item-status ${emp.dias_atraso > 0 ? 'status-overdue' : 'status-active'}">
                                            ${emp.dias_atraso > 0 ? `⚠️ ${emp.dias_atraso} dias de atraso` : '✓ Empréstimo Ativo'}
                                        </span>
                                    </div>
                                    <div class="item-actions">
                                        <button class="btn-small btn-view" 
                                                data-bookid="${emp.bookId}">
                                            👁 Ver Detalhes
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
                    <input type="text" class="search-box" id="book-search" placeholder="Pesquisar livros..." style="width: 100%; margin-bottom: 15px;">
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
                        <button id="btn-add-admin" class="btn">➕ Promover a Admin</button>
                        <button id="btn-remove-admin" class="btn btn-secondary">➖ Remover Admin</button>
                    </div>
                    <div id="users-list">
                        <p style="text-align: center; font-family: arial black; color: #434E70;">Carregando lista de usuários...</p>
                    </div>
                </div>

                <div id="relatorio" class="tab-content">
                    <h2>Relatórios e Estatísticas</h2>
                    <button id="btn-load-report" class="btn" style="margin-bottom: 20px;">Gerar Relatório Completo</button>
                    <div id="report-content">
                        <p style="text-align: center; color: #434E70; font-family: arial black;">Clique no botão acima para gerar o relatório</p>
                    </div>
                </div>
            </div>

            <div class="actions-row">
                <button id="btn-logout" class="btn btn-secondary">Sair do Sistema</button>
            </div>
        </div>
    `;

    setupAdminEventListeners(container, allBooks);
}

function setupAdminEventListeners(container, allBooks) {
    const tabBtns = container.querySelectorAll('.tab-btn');
    const tabContents = container.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetContent = container.querySelector(`#${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            if (targetTab === 'usuarios') {
                loadUsersList();
            }
        });
    });

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

    container.addEventListener('click', (e) => {
        const bookCard = e.target.closest('.book-card-admin');
        if (bookCard) {
            const bookId = bookCard.dataset.bookid;
            navigateTo('details', { bookId: parseInt(bookId) });
        }
    });

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

        if (e.target.classList.contains('btn-confirm')) {
            const bookId = e.target.dataset.bookid;
            const cpf = e.target.dataset.cpf;

            if (!confirm('Confirmar que o usuário retirou o livro?')) return;

            try {
                const response = await fetch('http://localhost:3000/api/admin/confirm-pickup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId), cpf })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Retirada confirmada!');
                    renderAdminPanel(container);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao confirmar retirada:', error);
                alert('Erro de conexão.');
            }
        }

        if (e.target.classList.contains('btn-view')) {
            const bookId = e.target.dataset.bookid;
            navigateTo('details', { bookId: parseInt(bookId) });
        }
    });

    const addAdminBtn = container.querySelector('#btn-add-admin');
    const removeAdminBtn = container.querySelector('#btn-remove-admin');
    const cpfInput = container.querySelector('#admin-cpf');

    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    if (addAdminBtn && cpfInput) {
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

    if (removeAdminBtn && cpfInput) {
        removeAdminBtn.addEventListener('click', async () => {
            const cpf = cpfInput.value.trim();
            if (!cpf) {
                alert('Por favor, insira um CPF.');
                return;
            }

            if (!confirm(`⚠️ Deseja remover privilégios de administrador do usuário com CPF ${cpf}?\n\nO usuário voltará a ser um leitor comum.`)) {
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/admin/remove-admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ cpf })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Privilégios de administrador removidos!');
                    cpfInput.value = '';
                    loadUsersList();
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao remover admin:', error);
                alert('Erro de conexão.');
            }
        });
    }

    const btnLoadReport = container.querySelector('#btn-load-report');
    const reportContent = container.querySelector('#report-content');

    if (btnLoadReport && reportContent) {
        btnLoadReport.addEventListener('click', async () => {
            reportContent.innerHTML = '<p style="text-align: center; font-family: arial black; color: #434E70;">Carregando relatório...</p>';

            try {
                const response = await fetch('http://localhost:3000/api/admin/report', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    renderReport(reportContent, data);
                } else {
                    reportContent.innerHTML = '<p style="color: red; font-family: arial black;">Erro ao carregar relatório</p>';
                }
            } catch (error) {
                console.error('Erro ao carregar relatório:', error);
                reportContent.innerHTML = '<p style="color: red; font-family: arial black;">Erro de conexão</p>';
            }
        });
    }

    async function loadUsersList() {
        const usersList = container.querySelector('#users-list');
        if (!usersList) return;

        try {
            usersList.innerHTML = '<p style="text-align: center; font-family: arial black; color: #434E70;">Carregando usuários...</p>';

            const response = await fetch('http://localhost:3000/api/users', {
                credentials: 'include'
            });

            if (response.ok) {
                const users = await response.json();
                
                if (users.length === 0) {
                    usersList.innerHTML = '<p style="text-align: center; font-family: arial black; color: #434E70;">Nenhum usuário encontrado.</p>';
                    return;
                }

                usersList.innerHTML = `
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${users.map(user => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: none; margin-bottom: 10px; border-radius: 999px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                                <div>
                                    <strong style="font-family: arial black; color: #434E70;">${user.nome}</strong><br>
                                    <small style="font-family: arial; color: #434E70;">CPF: ${user.cpf} | Email: ${user.email}</small><br>
                                    <small style="font-family: arial; color: #434E70;">Tipo: ${user.tipo} | Livros lidos: ${user.livros_lidos || 0}</small>
                                </div>
                                <span style="padding: 6px 12px; border-radius: 999px; font-size: 12px; font-family: arial black; background: ${user.tipo === 'admin' ? '#d4edda' : '#cce7ff'}; color: ${user.tipo === 'admin' ? '#155724' : '#004085'};">
                                    ${user.tipo}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                usersList.innerHTML = '<p style="text-align: center; font-family: arial black; color: red;">Erro ao carregar usuários.</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            usersList.innerHTML = '<p style="text-align: center; font-family: arial black; color: red;">Erro de conexão ao carregar usuários.</p>';
        }
    }

    function renderReport(reportContent, data) {
        const { stats, topBooks, topUsers, monthlyLoans } = data;

        reportContent.innerHTML = `
            <div class="report-section">
                <h3 style="color: #434E70; margin-bottom: 15px; font-family: arial black;">Estatísticas Gerais</h3>
                <div class="report-grid">
                    <div class="report-card">
                        <h4>Total de Leitores</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #9bb4ff; font-family: arial black;">${stats.total_leitores}</p>
                    </div>
                    <div class="report-card">
                        <h4>Empréstimos Concluídos</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #28a745; font-family: arial black;">${stats.emprestimos_concluidos}</p>
                    </div>
                    <div class="report-card">
                        <h4>Empréstimos Atrasados</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #dc3545; font-family: arial black;">${stats.emprestimos_atrasados}</p>
                    </div>
                    <div class="report-card">
                        <h4>Média de Avaliações</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #ffc107; font-family: arial black;">${stats.media_avaliacoes ? parseFloat(stats.media_avaliacoes).toFixed(1) + '/5' : 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h3 style="color: #434E70; margin-bottom: 15px; font-family: arial black;">Livros Mais Emprestados</h3>
                <div class="report-card">
                    <ul class="report-list">
                        ${topBooks.map((book, index) => `
                            <li><strong style="font-family: arial black;">${index + 1}.</strong> ${book.title} - ${book.total_emprestimos} empréstimos</li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="report-section">
                <h3 style="color: #434E70; margin-bottom: 15px; font-family: arial black;">Usuários Mais Ativos</h3>
                <div class="report-card">
                    <ul class="report-list">
                        ${topUsers.map((user, index) => `
                            <li><strong style="font-family: arial black;">${index + 1}.</strong> ${user.nome} - ${user.total_emprestimos} empréstimos | ${user.livros_lidos} livros lidos</li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="report-section">
                <h3 style="color: #434E70; margin-bottom: 15px; font-family: arial black;">Empréstimos por Mês</h3>
                <div class="report-card">
                    <ul class="report-list">
                        ${monthlyLoans.map(month => `
                            <li><strong style="font-family: arial black;">${month.mes}:</strong> ${month.total} empréstimos</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    const logoutBtn = container.querySelector('#btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                performLogout();
            }
        });
    }
}