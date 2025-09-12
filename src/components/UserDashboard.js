import { navigateTo } from '../main.js';

export async function renderUserDashboard(container) {
    // 1. Obter informações do usuário logado
    let user = null;
    try {
        const userResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        if (userResponse.ok) {
            user = await userResponse.json();
        } else {
            alert('Sessão expirada. Faça login novamente.');
            navigateTo('login');
            return;
        }
    } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error);
        alert('Não foi possível carregar seu perfil.');
        return;
    }

    // 2. Obter os livros diretamente do backend (todos os livros)
    let allBooks = [];
    try {
        const booksResponse = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        if (booksResponse.ok) {
            allBooks = await booksResponse.json();
        }
    } catch (error) {
        console.error('Erro ao carregar lista de livros:', error);
        allBooks = [];
    }

    // 3. Filtrar livros com base nos dados obtidos
    const userId = user.id;

    const livrosEmprestados = allBooks.filter(book => String(book.emprestadoPara) === String(userId));
    const livrosSolicitados = allBooks.filter(book => book.fila_espera && book.fila_espera[0] === userId && !book.emprestadoPara);
    const livrosReservados = allBooks.filter(book => book.fila_espera && book.fila_espera.includes(userId));

    const emprestimosHtml = livrosEmprestados.length
        ? livrosEmprestados.map(book => {
            const devolucaoPendente = book.devolucoesPendentes && book.devolucoesPendentes.includes(userId);
            return `
                <li>
                    <strong>${book.title}</strong> - Empréstimo ativo
                    ${devolucaoPendente ? `
                        <button class="btn-devolver" data-bookid="${book.id}" disabled>Devolução Solicitada</button>
                    ` : `
                        <button class="btn-devolver" data-bookid="${book.id}">Devolver</button>
                    `}
                </li>
            `;
        }).join('')
        : '<li>Nenhum empréstimo ativo.</li>';

    const solicitacoesHtml = livrosSolicitados.length
        ? livrosSolicitados.map(book => `
                <li>
                    <strong>${book.title}</strong> - Aguardando retirada
                    <button class="btn-cancelar-solicitacao" data-bookid="${book.id}">Cancelar</button>
                </li>
            `).join('')
        : '<li>Nenhuma solicitação pendente.</li>';

    const reservasHtml = livrosReservados.length
        ? livrosReservados.map(book => {
            const posicao = book.fila_espera.indexOf(userId) + 1;
            return `
                <li>
                    <strong>${book.title}</strong> - Posição na fila: <em>${posicao}</em>
                    <button class="btn-cancelar-reserva" data-bookid="${book.id}">Cancelar</button>
                </li>
            `;
        }).join('')
        : '<li>Não está em nenhuma fila de espera.</li>';

    container.innerHTML = `
        <h1>Olá, ${user.nome}</h1>
        <div style="margin-bottom: 1rem;">
            <button id="voltar-livros" class="btn">📚 Voltar para Livros</button>
            <button id="minhas-prateleiras" class="btn">📚 Minhas Prateleiras</button>
            <button id="logout" class="btn btn-secondary">🚪 Sair</button>
        </div>

        <h2>📖 Meus Empréstimos</h2>
        <ul>${emprestimosHtml}</ul>

        <h2>📨 Solicitações Pendentes</h2>
        <ul>${solicitacoesHtml}</ul>

        <h2>🕒 Minhas Reservas</h2>
        <ul>${reservasHtml}</ul>
    `;

    // Botões do topo
    container.querySelector('#voltar-livros').addEventListener('click', () => navigateTo('books'));
    container.querySelector('#minhas-prateleiras').addEventListener('click', () => navigateTo('shelves'));
    container.querySelector('#logout').addEventListener('click', async () => {
        try {
            await fetch('http://localhost:3000/api/logout', { 
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
        navigateTo('login');
    });

    // Botões de devolver
    container.querySelectorAll('.btn-devolver').forEach(btn => {
        btn.addEventListener('click', async () => {
            const bookId = btn.dataset.bookid;
            try {
                const response = await fetch('http://localhost:3000/api/loan/request-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId }),
                    credentials: 'include'
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderUserDashboard(container);
                }
            } catch (error) {
                alert('Erro ao solicitar devolução.');
                console.error(error);
            }
        });
    });

    // Botões de cancelar solicitação/reserva
    const btnsCancelar = container.querySelectorAll('.btn-cancelar-solicitacao, .btn-cancelar-reserva');
    btnsCancelar.forEach(btn => {
        btn.addEventListener('click', async () => {
            const bookId = btn.dataset.bookid;
            try {
                const response = await fetch('http://localhost:3000/api/loan/cancel-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId }),
                    credentials: 'include'
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderUserDashboard(container);
                }
            } catch (error) {
                alert('Erro ao cancelar.');
                console.error(error);
            }
        });
    });
}