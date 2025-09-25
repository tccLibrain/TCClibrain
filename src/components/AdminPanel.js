import { navigateTo, performLogout, showLoading, showError } from '../main.js';

export async function renderAdminPanel(container) {
    console.log('Carregando painel administrativo...');
    showLoading(container, 'Carregando painel administrativo...');
    
    let allUsers = [];
    let livros = [];
    let devolucoesPendentes = [];
    let emprestimosAtivos = [];
    
    try {
        // 1. Verificar se usuário é admin
        const profileResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!profileResponse.ok) {
            navigateTo('login');
            return;
        }
        
        const currentUser = await profileResponse.json();
        if (currentUser.tipo !== 'admin') {
            alert('Acesso negado! Apenas administradores podem acessar esta área.');
            navigateTo('books');
            return;
        }
        
        console.log('Admin autenticado:', currentUser.nome);

        // 2. Carregar dados necessários
        await Promise.all([
            loadUsers().then(users => allUsers = users),
            loadBooks().then(books => livros = books),
            loadPendingReturns().then(returns => devolucoesPendentes = returns),
            loadActiveLoans().then(loans => emprestimosAtivos = loans)
        ]);

        console.log('Dados carregados:', {
            usuarios: allUsers.length,
            livros: livros.length,
            devolucoesPendentes: devolucoesPendentes.length,
            emprestimosAtivos: emprestimosAtivos.length
        });

    } catch (error) {
        console.error('Erro ao carregar dados do admin:', error);
        showError(container, 'Erro ao carregar painel administrativo.');
        return;
    }

    renderAdminContent(container, {
        allUsers,
        livros,
        devolucoesPendentes,
        emprestimosAtivos
    });
}

// Funções auxiliares para carregar dados
async function loadUsers() {
    try {
        const response = await fetch('http://localhost:3000/api/users', {
            credentials: 'include'
        });
        return response.ok ? await response.json() : [];
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        return [];
    }
}

async function loadBooks() {
    try {
        const response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        return response.ok ? await response.json() : [];
    } catch (error) {
        console.error('Erro ao carregar livros:', error);
        return [];
    }
}

async function loadPendingReturns() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/devolucoes', {
            credentials: 'include'
        });
        return response.ok ? await response.json() : [];
    } catch (error) {
        console.error('Erro ao carregar devoluções:', error);
        return [];
    }
}

async function loadActiveLoans() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/emprestimos', {
            credentials: 'include'
        });
        if (response.ok) {
            return await response.json();
        }
        // Se a rota não existir, retornar array vazio
        return [];
    } catch (error) {
        console.error('Erro ao carregar empréstimos:', error);
        return [];
    }
}

function renderAdminContent(container, data) {
    const { allUsers, livros, devolucoesPendentes, emprestimosAtivos } = data;
    
    // Obter estatísticas
    const totalUsuarios = allUsers.length;
    const totalLivros = livros.length;
    const livrosEmprestados = livros.filter(l => l.emprestadoPara).length;
    const livrosDisponiveis = totalLivros - livrosEmprestados;

    container.innerHTML = `
        <style>
            .admin-container {
                padding: 20px;
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
                padding: 12px 0;
                border-bottom: 1px solid var(--cinza-claro);
            }
            
            .admin-list li:last-child {
                border-bottom: none;
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
            
            .item-actions {
                display: flex;
                gap: 8px;
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
            
            .btn-deny {
                background-color: #dc3545;
                color: white;
            }
            
            .btn-deny:hover {
                background-color: #c82333;
            }
            
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: var(--azul-claro);
                font-style: italic;
            }
        </style>

        <div class="admin-container">
            <div class="admin-header">
                <h1>Painel Administrativo</h1>
                <p>Gerencie usuários, empréstimos e sistema</p>
            </div>

            <div class="admin-stats">
                <div class="stat-card">
                    <span class="stat-number">${totalUsuarios}</span>
                    <span class="stat-label">Total de Usuários</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${totalLivros}</span>
                    <span class="stat-label">Total de Livros</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${livrosEmprestados}</span>
                    <span class="stat-label">Livros Emprestados</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${livrosDisponiveis}</span>
                    <span class="stat-label">Livros Disponíveis</span>
                </div>
            </div>

            <div class="admin-section">
                <h2>Promover Usuário a Administrador</h2>
                <div class="admin-form">
                    <input type="text" id="admin-cpf" placeholder="CPF do usuário" maxlength="14">
                    <button id="btn-add-admin" class="btn">Promover a Admin</button>
                </div>
            </div>

            <div class="admin-section">
                <h2>Devoluções Pendentes (${devolucoesPendentes.length})</h2>
                <ul class="admin-list" id="lista-devolucoes">
                    ${devolucoesPendentes.length > 0 ? 
                        devolucoesPendentes.map(dev => `
                            <li>
                                <div class="item-info">
                                    <div class="item-title">${dev.title || 'Livro ID: ' + dev.bookId}</div>
                                    <div class="item-subtitle">
                                        Solicitado por: ${dev.user_name || dev.cpf}
                                        ${dev.data_real_devolucao ? ` - em ${new Date(dev.data_real_devolucao).toLocaleDateString()}` : ''}
                                    </div>
                                </div>
                                <div class="item-actions">
                                    <button class="btn-small btn-approve" 
                                            data-bookid="${dev.bookId}" 
                                            data-cpf="${dev.cpf}">
                                        Aprovar
                                    </button>
                                </div>
                            </li>
                        `).join('') 
                        : '<li class="empty-state">Nenhuma devolução pendente</li>'
                    }
                </ul>
            </div>

            <div class="admin-section">
                <h2>Empréstimos Ativos (${emprestimosAtivos.length})</h2>
                <ul class="admin-list" id="lista-emprestimos">
                    ${emprestimosAtivos.length > 0 ? 
                        emprestimosAtivos.map(emp => `
                            <li>
                                <div class="item-info">
                                    <div class="item-title">${emp.title || 'Livro ID: ' + emp.bookId}</div>
                                    <div class="item-subtitle">
                                        Emprestado para: ${emp.user_name || emp.cpf}
                                        ${emp.data_prevista_devolucao ? ` - Devolução: ${emp.data_prevista_devolucao}` : ''}
                                        ${emp.dias_atraso > 0 ? ` (${emp.dias_atraso} dias de atraso)` : ''}
                                    </div>
                                </div>
                                <div class="item-actions">
                                    ${emp.dias_atraso > 0 ? 
                                        '<span style="color: #dc3545; font-weight: bold;">ATRASADO</span>' : 
                                        '<span style="color: #28a745;">Em dia</span>'
                                    }
                                </div>
                            </li>
                        `).join('') 
                        : '<li class="empty-state">Nenhum empréstimo ativo</li>'
                    }
                </ul>
            </div>

            <div class="admin-section">
                <h2>Ações Administrativas</h2>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button id="btn-relatorio" class="btn">Gerar Relatório</button>
                    <button id="btn-backup" class="btn">Backup Sistema</button>
                    <button id="btn-configuracoes" class="btn">Configurações</button>
                    <button id="btn-logout" class="btn btn-secondary">Sair</button>
                </div>
            </div>
        </div>
    `;

    setupAdminEventListeners(container, data);
}

function setupAdminEventListeners(container, data) {
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
    });

    // Outros botões
    const logoutBtn = container.querySelector('#btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', performLogout);
    }

    const relatorioBtn = container.querySelector('#btn-relatorio');
    if (relatorioBtn) {
        relatorioBtn.addEventListener('click', () => {
            alert('Funcionalidade de relatório em desenvolvimento.');
        });
    }

    const backupBtn = container.querySelector('#btn-backup');
    if (backupBtn) {
        backupBtn.addEventListener('click', () => {
            alert('Funcionalidade de backup em desenvolvimento.');
        });
    }

    const configBtn = container.querySelector('#btn-configuracoes');
    if (configBtn) {
        configBtn.addEventListener('click', () => {
            alert('Funcionalidade de configurações em desenvolvimento.');
        });
    }
}