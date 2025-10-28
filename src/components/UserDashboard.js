import { navigateTo, showLoading, showError } from '../main.js';

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
            console.log('Rota dashboard não encontrada, buscando dados manualmente...');
            dashboardData = await getDashboardDataManually(user.cpf);
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError(container, 'Não foi possível carregar seu dashboard.');
        return;
    }

    renderDashboardContent(container, user, dashboardData);
}

async function getDashboardDataManually(userCpf) {
    try {
        const booksResponse = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        
        if (!booksResponse.ok) {
            throw new Error('Erro ao buscar livros');
        }
        
        const allBooks = await booksResponse.json();
        
        const emprestados = allBooks.filter(book => 
            book.emprestadoPara === userCpf
        );
        
        const reservas = allBooks.filter(book => 
            book.queue && book.queue.includes(userCpf) && book.emprestadoPara !== userCpf
        );
        
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
    
    const aguardandoAprovacao = emprestados.filter(e => e.status === 'aguardando_retirada');
    const emprestimosAtivos = emprestados.filter(e => e.status === 'ativo');
    const devolucoesPendentesFromEmprestimos = emprestados.filter(e => e.status === 'pendente_devolucao');
    
    const todasDevolucoesPendentes = [
        ...devolucoesPendentes,
        ...devolucoesPendentesFromEmprestimos
    ];
    
    console.log('📊 Dashboard separado:', {
        aguardandoAprovacao: aguardandoAprovacao.length,
        emprestimosAtivos: emprestimosAtivos.length,
        devolucoesPendentes: todasDevolucoesPendentes.length,
        reservas: reservas.length
    });

    const aguardandoHtml = aguardandoAprovacao.length
        ? aguardandoAprovacao.map(emprestimo => `
                <div class="dashboard-card">
                    <div class="card-content">
                        <div class="book-icon">📘</div>
                        <div class="book-details">
                            <h3 class="book-title">${emprestimo.title}</h3>
                            <p class="book-author">${emprestimo.author}</p>
                            ${emprestimo.data_devolucao_formatada ? 
                                `<p class="book-date">📅 ${emprestimo.data_devolucao_formatada}</p>` : 
                                ''
                            }
                            <span class="badge badge-warning">⏳ Aguardando Aprovação</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-danger btn-cancelar-solicitacao" data-bookid="${emprestimo.bookId}">
                            ✕ Cancelar
                        </button>
                        <button class="btn btn-secondary btn-view" data-bookid="${emprestimo.bookId}">
                            👁 Detalhes
                        </button>
                    </div>
                </div>
            `).join('')
        : '<div class="empty-state">📭 Nenhuma solicitação pendente</div>';

    const emprestimosAtivosHtml = emprestimosAtivos.length
        ? emprestimosAtivos.map(emprestimo => `
                <div class="dashboard-card">
                    <div class="card-content">
                        <div class="book-icon">📗</div>
                        <div class="book-details">
                            <h3 class="book-title">${emprestimo.title}</h3>
                            <p class="book-author">${emprestimo.author}</p>
                            ${emprestimo.data_devolucao_formatada ? 
                                `<p class="book-date">📅 ${emprestimo.data_devolucao_formatada}</p>` : 
                                ''
                            }
                            <span class="badge badge-success">✓ Empréstimo Ativo</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-primary btn-devolver" data-bookid="${emprestimo.bookId}">
                            ↩ Devolver
                        </button>
                        <button class="btn btn-secondary btn-view" data-bookid="${emprestimo.bookId}">
                            👁 Detalhes
                        </button>
                    </div>
                </div>
            `).join('')
        : '<div class="empty-state">📚 Nenhum empréstimo ativo</div>';

    const reservasHtml = reservas.length
        ? reservas.map(reserva => `
                <div class="dashboard-card">
                    <div class="card-content">
                        <div class="book-icon">📙</div>
                        <div class="book-details">
                            <h3 class="book-title">${reserva.title}</h3>
                            <p class="book-author">${reserva.author}</p>
                            <p class="book-position">🎯 Posição na fila: ${reserva.posicao}</p>
                            <span class="badge badge-info">⏳ Aguardando</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-danger btn-cancelar-reserva" data-bookid="${reserva.bookId}">
                            ✕ Cancelar
                        </button>
                        <button class="btn btn-secondary btn-view" data-bookid="${reserva.bookId}">
                            👁 Detalhes
                        </button>
                    </div>
                </div>
            `).join('')
        : '<div class="empty-state">📋 Nenhuma reserva ativa</div>';

    const pendentesHtml = todasDevolucoesPendentes.length
        ? todasDevolucoesPendentes.map(pendente => `
                <div class="dashboard-card">
                    <div class="card-content">
                        <div class="book-icon">📕</div>
                        <div class="book-details">
                            <h3 class="book-title">${pendente.title}</h3>
                            <p class="book-author">${pendente.author}</p>
                            <span class="badge badge-warning">⏳ Aguardando Aprovação</span>
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-secondary btn-view" data-bookid="${pendente.bookId}">
                            👁 Detalhes
                        </button>
                    </div>
                </div>
            `).join('')
        : '<div class="empty-state">✅ Nenhuma devolução pendente</div>';

    container.innerHTML = `
        <style>
            .dashboard-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .dashboard-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 30px;
                background: linear-gradient(135deg, #434e70 0%, #5a6688 100%);
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                color: white;
            }
            
            .dashboard-header h1 {
                margin: 0 0 10px 0;
                font-size: 28px;
                font-weight: 700;
            }
            
            .user-greeting {
                font-size: 18px;
                opacity: 0.95;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 16px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                transition: transform 0.3s;
            }
            
            .stat-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 4px 12px rgba(67, 78, 112, 0.2);
            }
            
            .stat-number {
                display: block;
                font-size: 32px;
                font-weight: 700;
                color: #434e70;
                margin-bottom: 8px;
            }
            
            .stat-label {
                font-size: 14px;
                color: #718096;
                font-weight: 600;
            }
            
            .dashboard-section {
                background: white;
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            
            .section-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e2e8f0;
            }
            
            .section-header h2 {
                margin: 0;
                color: #2d3748;
                font-size: 20px;
                font-weight: 700;
            }
            
            .dashboard-card {
                background: #f7fafc;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                border: 2px solid #e2e8f0;
                transition: all 0.3s;
            }
            
            .dashboard-card:hover {
                border-color: #434e70;
                box-shadow: 0 4px 12px rgba(67, 78, 112, 0.15);
            }
            
            .card-content {
                display: flex;
                gap: 16px;
                margin-bottom: 12px;
            }
            
            .book-icon {
                font-size: 48px;
                flex-shrink: 0;
            }
            
            .book-details {
                flex: 1;
            }
            
            .book-title {
                margin: 0 0 6px 0;
                color: #2d3748;
                font-size: 16px;
                font-weight: 700;
            }
            
            .book-author {
                margin: 0 0 6px 0;
                color: #718096;
                font-size: 14px;
            }
            
            .book-date, .book-position {
                margin: 0 0 8px 0;
                color: #4a5568;
                font-size: 13px;
                font-weight: 600;
            }
            
            .badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 700;
            }
            
            .badge-success {
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                color: #155724;
            }
            
            .badge-warning {
                background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
                color: #856404;
            }
            
            .badge-info {
                background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%);
                color: #0c5460;
            }
            
            .card-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #28a745 0%, #20963d 100%);
                color: white;
            }
            
            .btn-primary:hover {
                background: linear-gradient(135deg, #218838 0%, #1e7e34 100%);
                transform: translateY(-2px);
            }
            
            .btn-secondary {
                background: linear-gradient(135deg, #434e70 0%, #5a6688 100%);
                color: white;
            }
            
            .btn-secondary:hover {
                background: linear-gradient(135deg, #2d3748 0%, #434e70 100%);
                transform: translateY(-2px);
            }
            
            .btn-danger {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
            }
            
            .btn-danger:hover {
                background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
                transform: translateY(-2px);
            }
            
            .empty-state {
                text-align: center;
                padding: 40px;
                color: #718096;
                font-size: 16px;
                font-style: italic;
            }
            
            @media (max-width: 768px) {
                .dashboard-container {
                    padding: 12px;
                }
                
                .dashboard-header {
                    padding: 20px;
                }
                
                .dashboard-header h1 {
                    font-size: 24px;
                }
                
                .card-content {
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                
                .card-actions {
                    justify-content: center;
                }
                
                .stats-grid {
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                }
            }
        </style>
        
        <div class="dashboard-container">
            <div class="dashboard-header">
                <h1>🏠 Meu Dashboard</h1>
                <div class="user-greeting">Bem-vindo, ${user.nome}!</div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${aguardandoAprovacao.length + emprestimosAtivos.length}</span>
                    <span class="stat-label">📚 Empréstimos</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${reservas.length}</span>
                    <span class="stat-label">📋 Reservas</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${user.livros_lidos || 0}</span>
                    <span class="stat-label">✅ Livros Lidos</span>
                </div>
            </div>

            ${aguardandoAprovacao.length > 0 ? `
                <div class="dashboard-section">
                    <div class="section-header">
                        <h2>⏳ Aguardando Aprovação</h2>
                    </div>
                    ${aguardandoHtml}
                </div>
            ` : ''}

            <div class="dashboard-section">
                <div class="section-header">
                    <h2>📗 Empréstimos Ativos</h2>
                </div>
                ${emprestimosAtivosHtml}
            </div>

            ${todasDevolucoesPendentes.length > 0 ? `
                <div class="dashboard-section">
                    <div class="section-header">
                        <h2>📕 Devoluções Pendentes</h2>
                    </div>
                    ${pendentesHtml}
                </div>
            ` : ''}

            <div class="dashboard-section">
                <div class="section-header">
                    <h2>📋 Minhas Reservas</h2>
                </div>
                ${reservasHtml}
            </div>
        </div>
    `;

    setupDashboardEventListeners(container, user);
}

function setupDashboardEventListeners(container, user) {
    container.addEventListener('click', async (e) => {
        const bookId = e.target.dataset.bookid;
        
        if (e.target.classList.contains('btn-view') && bookId) {
            navigateTo('details', { bookId: parseInt(bookId), user });
        }
        
        else if (e.target.classList.contains('btn-devolver') && bookId) {
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
        
        else if (e.target.classList.contains('btn-cancelar-solicitacao') && bookId) {
            if (confirm('Deseja realmente cancelar esta solicitação de empréstimo?')) {
                try {
                    const response = await fetch('http://localhost:3000/api/loan/cancel-request', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ bookId: parseInt(bookId) })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        alert(result.message || 'Solicitação cancelada!');
                        renderUserDashboard(container);
                    } else {
                        const error = await response.json();
                        alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    console.error('Erro ao cancelar solicitação:', error);
                    alert('Erro de conexão ao cancelar solicitação.');
                }
            }
        }
    });
}