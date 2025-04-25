import { navigateTo } from '../router.js';
import { devolverLivro } from '../utils/devolucao.js';

export function renderUserDashboard(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Usuário não encontrado. Faça login novamente.');
    navigateTo('login');
    return;
  }

  const emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
  const reservas = JSON.parse(localStorage.getItem('reservas')) || [];

  const meusEmprestimos = emprestimos.filter(e => e.cpf === user.cpf);
  const minhasReservas = reservas.filter(r => r.cpf === user.cpf);

  const emprestimosHtml = meusEmprestimos.length
    ? meusEmprestimos.map(e => {
        const books = JSON.parse(localStorage.getItem('books')) || [];
        const book = books.find(b => b.title === e.titulo);
        const bookId = book?.id || null;

        return `
          <li>
            <strong>${e.titulo}</strong> - até <em>${e.prazo}</em>
            ${bookId !== null ? `<button onclick="devolverLivro(${bookId}, '${user.cpf}')">Devolver</button>` : ''}
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
      <button onclick="navigateTo('books')">📚 Voltar para Livros</button>
      <button onclick="navigateTo('notificacoes')">🔔 Notificações</button>
      <button onclick="logout()">🚪 Sair</button>
    </div>

    <h2>📖 Meus Empréstimos</h2>
    <ul>${emprestimosHtml}</ul>

    <h2>🕒 Minhas Reservas</h2>
    <ul>${reservasHtml}</ul>
  `;
}

// Garante que a função de devolução esteja disponível globalmente
window.devolverLivro = devolverLivro;
