import { devolverLivro } from '../utils/devolucao.js';
import { navigateTo } from '../main.js';

export function renderUserDashboard(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Usuário não encontrado. Faça login novamente.');
    navigateTo('login');
    return;
  }

  const emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
  const reservas = JSON.parse(localStorage.getItem('reservas')) || [];
  const books = JSON.parse(localStorage.getItem('books')) || [];

  const meusEmprestimos = emprestimos.filter(e => e.cpf === user.cpf);
  const minhasReservas = reservas.filter(r => r.cpf === user.cpf);

  const emprestimosHtml = meusEmprestimos.length
    ? meusEmprestimos.map(e => {
        const book = books.find(b => b.id === e.bookId);
        const titulo = book ? book.title : e.titulo || 'Livro';
        const prazo = e.prazo || 'Indefinido';
        const bookId = book ? book.id : null;
        return `
          <li>
            <strong>${titulo}</strong> - até <em>${prazo}</em>
            ${bookId !== null ? `<button class="btn-devolver" data-bookid="${bookId}">Devolver</button>` : ''}
          </li>
        `;
      }).join('')
    : '<li>Nenhum empréstimo.</li>';

  const reservasHtml = minhasReservas.length
    ? minhasReservas.map(r => `<li><strong>${r.titulo}</strong> - posição <em>${r.posicao}</em></li>`).join('')
    : '<li>Não está em nenhuma fila.</li>';

  container.innerHTML = `
    <h1>Olá, ${user.nome}</h1>
    <div style="margin-bottom: 1rem;">
      <button id="voltar-livros">📚 Voltar para Livros</button>
      <button id="notificacoes">🔔 Notificações</button>
      <button id="logout">🚪 Sair</button>
    </div>

    <h2>📖 Meus Empréstimos</h2>
    <ul>${emprestimosHtml}</ul>

    <h2>🕒 Minhas Reservas</h2>
    <ul>${reservasHtml}</ul>
  `;

  // Botões do topo
  container.querySelector('#voltar-livros').addEventListener('click', () => navigateTo('books'));
  container.querySelector('#notificacoes').addEventListener('click', () => navigateTo('notificacoes'));
  container.querySelector('#logout').addEventListener('click', () => {
    localStorage.removeItem('user');
    navigateTo('login');
  });

  // Botões de devolver
  container.querySelectorAll('.btn-devolver').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = btn.dataset.bookid;
      devolverLivro(bookId, user.cpf);
      renderUserDashboard(container); // atualiza a lista
    });
  });
}
