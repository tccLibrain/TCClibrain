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
    
    // Separar empréstimos aguardando retirada dos ativos
    const aguardandoRetirada = emprestimos_ativos.filter(emp => emp.status === 'aguardando_retirada');
    const emprestimosAtivos = emprestimos_ativos.filter(emp => emp.status === 'ativo');
    
    console.log('=== DEBUG ADMIN ===');
    console.log('Total empréstimos:', emprestimos_ativos.length);
    console.log('Aguardando retirada:', aguardandoRetirada.length);
    console.log('Ativos:', emprestimosAtivos.length);
    console.log('Empréstimos aguardando:', aguardandoRetirada);
    
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
            
            .section-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 2px solid var(--cinza-claro);
                flex-wrap: wrap;
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
            
            .empty-state {
                text-align: center;
                padding: 40px;
                color: var(--azul-claro);
                font-style: italic;
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
            
            .btn-confirm {
                background-color: #007bff;
                color: white;
            }
            
            .btn-confirm:hover {
                background-color: #0056b3;
            }
            
            .btn-view {
                background-color: var(--azul-original);
                color: white;
            }
            
            .btn-view:hover {
                background-color: var(--azul-escuro);
            }
            
            .report-section {
                background: var(--cinza-claro);
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .report-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-top: 20px;
            }
            
            .report-card {
                background: var(--branco);
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .report-card h4 {
                margin: 0 0 10px 0;
                color: var(--azul-escuro);
            }
            
            .report-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .report-list li {
                padding: 5px 0;
                font-size: 14px;
                color: var(--azul-claro);
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
                        <p style="color: #856404; padding: 10px; background: #fff3cd; border-radius: 6px; margin-bottom: 15px;">
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
                    <input type="text" class="search-box" id="book-search" placeholder="Pesquisar livros..." style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid var(--cinza-escuro); border-radius: 6px;">
                    <div class="books-grid" id="books-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px; max-height: 500px; overflow-y: auto; padding: 10px;">
                        ${allBooks.map(book => `
                            <div class="book-card-admin" data-bookid="${book.id}" style="background: var(--cinza-claro); border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; transition: transform 0.3s ease;">
                                <img src="${book.cover || createPlaceholderImage(book.title)}" 
                                    alt="${book.title}"
                                    style="width: 80px; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;"
                                    onerror="this.src='${createPlaceholderImage('Erro')}'">
                                <div class="book-title" style="font-size: 11px; font-weight: bold; color: var(--azul-escuro); margin-bottom: 4px; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${book.title || 'Título não disponível'}</div>
                                <div class="book-author" style="font-size: 10px; color: var(--azul-claro); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;">${book.author || 'Autor desconhecido'}</div>
                                <span class="book-status-badge ${book.available !== false ? 'available' : 'borrowed'}" style="font-size: 9px; padding: 2px 6px; border-radius: 8px; margin-top: 4px; display: inline-block; ${book.available !== false ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}">
                                    ${book.available !== false ? 'Disponível' : 'Emprestado'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>

               <div id="usuarios" class="tab-content">
                    <h2>Gerenciar Usuários</h2>
                    <div class="admin-form" style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px; flex-wrap: wrap;">
                        <input type="text" id="admin-cpf" placeholder="CPF do usuário" maxlength="14" style="padding: 8px 12px; border: 1px solid var(--cinza-escuro); border-radius: 6px; font-size: 14px;">
                        <button id="btn-add-admin" class="btn">➕ Promover a Admin</button>
                        <button id="btn-remove-admin" class="btn btn-secondary" style="background-color: #dc3545;">➖ Remover Admin</button>
                    </div>
                    <div id="users-list">
                        <p>Carregando lista de usuários...</p>
                    </div>
                </div>

                <div id="relatorio" class="tab-content">
                    <h2>Relatórios e Estatísticas</h2>
                    <button id="btn-load-report" class="btn" style="margin-bottom: 20px;">Gerar Relatório Completo</button>
                    <div id="report-content">
                        <p style="text-align: center; color: var(--azul-claro);">Clique no botão acima para gerar o relatório</p>
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
    // Sistema de abas
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

        // Confirmar retirada
        if (e.target.classList.contains('btn-confirm')) {
            const bookId = e.target.dataset.bookid;
            const cpf = e.target.dataset.cpf;

            if (!confirm('Confirmar que o usuário retirou o livro?')) return;

            try {
                console.log('Enviando confirmação:', { bookId, cpf });
                
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

        // Ver detalhes do livro
        if (e.target.classList.contains('btn-view')) {
            const bookId = e.target.dataset.bookid;
            navigateTo('details', { bookId: parseInt(bookId) });
        }
    });

   // Promover usuário a admin
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

    // Gerar relatório
    const btnLoadReport = container.querySelector('#btn-load-report');
    const reportContent = container.querySelector('#report-content');

    if (btnLoadReport && reportContent) {
        btnLoadReport.addEventListener('click', async () => {
            reportContent.innerHTML = '<p style="text-align: center;">Carregando relatório...</p>';

            try {
                const response = await fetch('http://localhost:3000/api/admin/report', {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    renderReport(reportContent, data);
                } else {
                    reportContent.innerHTML = '<p style="color: red;">Erro ao carregar relatório</p>';
                }
            } catch (error) {
                console.error('Erro ao carregar relatório:', error);
                reportContent.innerHTML = '<p style="color: red;">Erro de conexão</p>';
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

    // Função para renderizar relatório
    function renderReport(reportContent, data) {
        const { stats, topBooks, topUsers, monthlyLoans } = data;

        reportContent.innerHTML = `
            <div class="report-section">
                <h3 style="color: var(--azul-escuro); margin-bottom: 15px;">Estatísticas Gerais</h3>
                <div class="report-grid">
                    <div class="report-card">
                        <h4>Total de Leitores</h4>
                        <p style="font-size: 24px; font-weight: bold; color: var(--azul-original);">${stats.total_leitores}</p>
                    </div>
                    <div class="report-card">
                        <h4>Empréstimos Concluídos</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #28a745;">${stats.emprestimos_concluidos}</p>
                    </div>
                    <div class="report-card">
                        <h4>Empréstimos Atrasados</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #dc3545;">${stats.emprestimos_atrasados}</p>
                    </div>
                    <div class="report-card">
                        <h4>Média de Avaliações</h4>
                        <p style="font-size: 24px; font-weight: bold; color: #ffc107;">${stats.media_avaliacoes ? parseFloat(stats.media_avaliacoes).toFixed(1) + '/5' : 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div class="report-section">
                <h3 style="color: var(--azul-escuro); margin-bottom: 15px;">Livros Mais Emprestados</h3>
                <div class="report-card">
                    <ul class="report-list">
                        ${topBooks.map((book, index) => `
                            <li><strong>${index + 1}.</strong> ${book.title} - ${book.total_emprestimos} empréstimos</li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="report-section">
                <h3 style="color: var(--azul-escuro); margin-bottom: 15px;">Usuários Mais Ativos</h3>
                <div class="report-card">
                    <ul class="report-list">
                        ${topUsers.map((user, index) => `
                            <li><strong>${index + 1}.</strong> ${user.nome} - ${user.total_emprestimos} empréstimos | ${user.livros_lidos} livros lidos</li>
                        `).join('')}
                    </ul>
                </div>
            </div>

            <div class="report-section">
                <h3 style="color: var(--azul-escuro); margin-bottom: 15px;">Empréstimos por Mês</h3>
                <div class="report-card">
                    <ul class="report-list">
                        ${monthlyLoans.map(month => `
                            <li><strong>${month.mes}:</strong> ${month.total} empréstimos</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // Logout
    const logoutBtn = container.querySelector('#btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Deseja realmente sair do sistema?')) {
                performLogout();
            }
        });
    }
}