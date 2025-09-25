import { navigateTo, performLogout, showLoading, showError } from '../main.js';

export async function renderUserDashboard(container) {
    console.log('Carregando dashboard do usuário...');
    showLoading(container, 'Carregando seu dashboard...');
    
    let user = null;
    let dashboardData = null;
    
    try {
        // 1. Obter informações do usuário logado
        const userResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                navigateTo('login');
                return;
            }
            throw new Error('Erro ao carregar perfil do usuário');
        }
        
        user = await userResponse.json();
        console.log('Usuário logado:', user.nome);

        // 2. Obter dados do dashboard do backend
        const dashboardResponse = await fetch('http://localhost:3000/api/user/dashboard', {
            credentials: 'include'
        });
        
        if (dashboardResponse.ok) {
            dashboardData = await dashboardResponse.json();
            console.log('Dados do dashboard:', dashboardData);
        } else {
            // Se a rota não existir, buscar dados manualmente
            console.log('Rota dashboard não encontrada, buscando dados manualmente...');
            dashboardData = await getDashboardDataManually(user.cpf);
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError(container, 'Não foi possível carregar seu dashboard.');
        return;
    }

    // Renderizar o dashboard
    renderDashboardContent(container, user, dashboardData);
}

// Função para buscar dados do dashboard manualmente se a API não existir
async function getDashboardDataManually(userCpf) {
    try {
        // Buscar todos os livros e filtrar pelo usuário
        const booksResponse = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        
        if (!booksResponse.ok) {
            throw new Error('Erro ao buscar livros');
        }
        
        const allBooks = await booksResponse.json();
        
        // Filtrar livros por status
        const emprestados = allBooks.filter(book => 
            book.emprestadoPara === userCpf
        );
        
        const reservas = allBooks.filter(book => 
            book.queue && book.queue.includes(userCpf) && book.emprestadoPara !== userCpf
        );
        
        // Para devoluções pendentes, assumir que não temos essa informação
        const devolucoesPendentes = [];
        
        return {
            emprestados: emprestados.map(book => ({
                id: book.id,
                bookId: book.id,
                title: book.title,
                author: book.author,
                data_devolucao_formatada: book.returnDate,
                status: 'ativo'
            })),
            reservas: reservas.map(book => {
                const posicao = book.queue ? book.queue.indexOf(userCpf) + 1 : 1;
                return {
                    id: book.id,
                    bookId: book.id,
                    title: book.title,
                    author: book.author,
                    posicao: posicao,
                    status: 'aguardando'
                };
            }),
            devolucoesPendentes
        };
    } catch (error) {
        console.error('Erro ao buscar dados manualmente:', error);
        return {
            emprestados: [],
            reservas: [],
            devolucoesPendentes: []
        };
    }
}

function renderDashboardContent(container, user, dashboardData) {
    const { emprestados, reservas, devolucoesPendentes } = dashboardData;
    
    console.log('Renderizando dashboard:', {
        emprestados: emprestados.length,
        reservas: reservas.length,
        pendentes: devolucoesPendentes.length
    });

    const emprestimosHtml = emprestados.length
        ? emprestados.map(emprestimo => {
            const isPendente = emprestimo.status === 'pendente_devolucao';
            return `
                <li class="dashboard-item">
                    <div class="item-info">
                        <strong>${emprestimo.title}</strong>
                        <span class="item-author">por ${emprestimo.author}</span>
                        ${emprestimo.data_devolucao_formatada ? 
                            `<small class="item-date">Devolução: ${emprestimo.data_devolucao_formatada}</small>` : 
                            ''
                        }
                        <span class="item-status ${isPendente ? 'status-pending' : 'status-active'}">
                            ${isPendente ? 'Devolução Solicitada' : 'Empréstimo Ativo'}
                        </span>
                    </div>
                    <div class="item-actions">
                        ${!isPendente ? `
                            <button class="btn-devolver btn-small" data-bookid="${emprestimo.bookId}">
                                Solicitar Devolução
                            </button>
                        ` : `
                            <button class="btn-small" disabled>
                                Aguardando Aprovação
                            </button>
                        `}
                        <button class="btn-view btn-small" data-bookid="${emprestimo.bookId}">
                            Ver Detalhes
                        </button>
                    </div>
                </li>
            `;
        }).join('')
        : '<li class="no-items">Nenhum empréstimo ativo no momento.</li>';

    const reservasHtml = reservas.length
        ? reservas.map(reserva => `
                <li class="dashboard-item">
                    <div class="item-info">
                        <strong>${reserva.title}</strong>
                        <span class="item-author">por ${reserva.author}</span>
                        <small class="item-position">Posição na fila: ${reserva.posicao}</small>
                        <span class="item-status status-waiting">Aguardando</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-cancelar-reserva btn-small btn-danger" data-bookid="${reserva.bookId}">
                            Cancelar Reserva
                        </button>
                        <button class="btn-view btn-small" data-bookid="${reserva.bookId}">
                            Ver Detalhes
                        </button>
                    </div>
                </li>
            `).join('')
        : '<li class="no-items">Você não está em nenhuma fila de espera.</li>';

    const pendentesHtml = devolucoesPendentes.length
        ? devolucoesPendentes.map(pendente => `
                <li class="dashboard-item">
                    <div class="item-info">
                        <strong>${pendente.title}</strong>
                        <span class="item-author">por ${pendente.author}</span>
                        <span class="item-status status-pending">Aguardando Aprovação</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-view btn-small" data-bookid="${pendente.bookId}">
                            Ver Detalhes
                        </button>
                    </div>
                </li>
            `).join('')
        : '<li class="no-items">Nenhuma devolução pendente.</li>';

    container.innerHTML = `
        <style>
            .dashboard-header {
                text-align: center;
                margin-bottom: 20px;
                padding: 20px;
                background: var(--branco);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .dashboard-header h1 {
                color: var(--azul-escuro);
                margin: 0 0 10px 0;
            }
            
            .dashboard-header .user-greeting {
                color: var(--azul-original);
                font-size: 16px;
            }
            
            .dashboard-navigation {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
                margin-bottom: 20px;
            }
            
            .dashboard-section {
                background: var(--branco);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .dashboard-section h2 {
                color: var(--azul-escuro);
                margin: 0 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--cinza-claro);
            }
            
            .dashboard-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid var(--cinza-claro);
            }
            
            .dashboard-item:last-child {
                border-bottom: none;
            }
            
            .item-info {
                flex: 1;
            }
            
            .item-info strong {
                display: block;
                color: var(--azul-escuro);
                font-size: 16px;
                margin-bottom: 4px;
            }
            
            .item-author {
                display: block;
                color: var(--azul-claro);
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .item-date, .item-position {
                display: block;
                color: var(--cinza-escuro);
                font-size: 12px;
                margin-bottom: 4px;
            }
            
            .item-status {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .status-active {
                background-color: #d4edda;
                color: #155724;
            }
            
            .status-pending {
                background-color: #fff3cd;
                color: #856404;
            }
            
            .status-waiting {
                background-color: #cce7ff;
                color: #004085;
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
                border-radius: 6px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .btn-view {
                background-color: var(--azul-original);
                color: white;
            }
            
            .btn-view:hover {
                background-color: var(--azul-escuro);
            }
            
            .btn-devolver {
                background-color: #28a745;
                color: white;
            }
            
            .btn-devolver:hover {
                background-color: #218838;
            }
            
            .btn-danger {
                background-color: #dc3545;
                color: white;
            }
            
            .btn-danger:hover {
                background-color: #c82333;
            }
            
            .no-items {
                text-align: center;
                color: var(--azul-claro);
                font-style: italic;
                padding: 20px;
            }
            
            .stats-summary {
                display: flex;
                justify-content: space-around;
                background: var(--cinza-claro);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 15px;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-number {
                font-size: 24px;
                font-weight: bold;
                color: var(--azul-escuro);
                display: block;
            }
            
            .stat-label {
                font-size: 12px;
                color: var(--azul-claro);
            }
            
            @media (max-width: 768px) {
                .dashboard-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .item-actions {
                    align-self: stretch;
                    justify-content: center;
                }
            }
        </style>
        
        <div class="dashboard-header">
            <h1>Meu Dashboard</h1>
            <div class="user-greeting">Bem-vindo, ${user.nome}!</div>
        </div>

        <div class="dashboard-navigation">
            <button id="voltar-livros" class="btn">Explorar Livros</button>
            <button id="minhas-prateleiras" class="btn">Minhas Prateleiras</button>
            <button id="meu-perfil" class="btn">Meu Perfil</button>
            <button id="logout" class="btn btn-secondary">Sair</button>
        </div>

        <div class="stats-summary">
            <div class="stat-item">
                <span class="stat-number">${emprestados.length}</span>
                <span class="stat-label">Empréstimos</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${reservas.length}</span>
                <span class="stat-label">Reservas</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${user.livros_lidos || 0}</span>
                <span class="stat-label">Livros Lidos</span>
            </div>
        </div>

        <div class="dashboard-section">
            <h2>Meus Empréstimos Ativos</h2>
            <ul style="list-style: none; padding: 0;">
                ${emprestimosHtml}
            </ul>
        </div>

        <div class="dashboard-section">
            <h2>Minhas Reservas</h2>
            <ul style="list-style: none; padding: 0;">
                ${reservasHtml}
            </ul>
        </div>

        ${devolucoesPendentes.length > 0 ? `
            <div class="dashboard-section">
                <h2>Devoluções Pendentes</h2>
                <ul style="list-style: none; padding: 0;">
                    ${pendentesHtml}
                </ul>
            </div>
        ` : ''}
    `;

    // Event Listeners
    setupDashboardEventListeners(container, user);
}

function setupDashboardEventListeners(container, user) {
    // Navegação
    const voltarLivros = container.querySelector('#voltar-livros');
    const minhasPrateleiras = container.querySelector('#minhas-prateleiras');
    const meuPerfil = container.querySelector('#meu-perfil');
    const logoutBtn = container.querySelector('#logout');

    if (voltarLivros) {
        voltarLivros.addEventListener('click', () => navigateTo('books', { user }));
    }

    if (minhasPrateleiras) {
        minhasPrateleiras.addEventListener('click', () => navigateTo('shelves', { user }));
    }

    if (meuPerfil) {
        meuPerfil.addEventListener('click', () => navigateTo('profile', { user }));
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', performLogout);
    }

    // Botões de ação nos itens
    container.addEventListener('click', async (e) => {
        const bookId = e.target.dataset.bookid;
        
        if (e.target.classList.contains('btn-view') && bookId) {
            // Ver detalhes do livro
            navigateTo('details', { bookId: parseInt(bookId), user });
        }
        
        else if (e.target.classList.contains('btn-devolver') && bookId) {
            // Solicitar devolução
            if (confirm('Deseja realmente solicitar a devolução deste livro?')) {
                try {
                    const response = await fetch('http://localhost:3000/api/loan/request-return', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ bookId: parseInt(bookId) })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        alert(result.message || 'Solicitação de devolução enviada!');
                        renderUserDashboard(container);
                    } else {
                        const error = await response.json();
                        alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    console.error('Erro ao solicitar devolução:', error);
                    alert('Erro de conexão ao solicitar devolução.');
                }
            }
        }
        
        else if (e.target.classList.contains('btn-cancelar-reserva') && bookId) {
            // Cancelar reserva
            if (confirm('Deseja realmente cancelar esta reserva?')) {
                try {
                    const response = await fetch('http://localhost:3000/api/loan/cancel-request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ bookId: parseInt(bookId) })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        alert(result.message || 'Reserva cancelada!');
                        renderUserDashboard(container);
                    } else {
                        const error = await response.json();
                        alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    console.error('Erro ao cancelar reserva:', error);
                    alert('Erro de conexão ao cancelar reserva.');
                }
            }
        }
    });
}