import { navigateTo } from '../router.js';
import { devolverLivro } from '../utils/devolucao.js';

export function renderUserDashboard(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Usuário não encontrado. Faça login novamente.');
    navigateTo('login');
    return;
  }

  // Obtém dados do localStorage
  const emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
  const reservas = JSON.parse(localStorage.getItem('reservas')) || [];
  const books = JSON.parse(localStorage.getItem('books')) || [];

  // Filtra dados do usuário logado
  const meusEmprestimos = emprestimos.filter(e => e.cpf === user.cpf);
  const minhasReservas = reservas.filter(r => r.cpf === user.cpf);

  // Gera HTML dos empréstimos usando bookId para buscar dados
  const emprestimosHtml = meusEmprestimos.length
    ? meusEmprestimos.map(e => {
        // Busca livro pelo id para garantir dados consistentes
        const book = books.find(b => b.id === e.bookId);

        const titulo = book ? book.title : e.titulo || 'Livro';
        const prazo = e.prazo || 'Indefinido';
        const bookId = book ? book.id : null;

        return `
          <li>
            <strong>${titulo}</strong> - até <em>${prazo}</em>
            ${bookId !== null ? `<button onclick="devolverLivro(${bookId}, '${user.cpf}')">Devolver</button>` : ''}
          </li>
        `;
      }).join('')
    : '<li>Nenhum empréstimo.</li>';

  // Gera HTML das reservas normalmente
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

// Exponha as funções globais necessárias
window.devolverLivro = devolverLivro;
// Caso logout e navigateTo não estejam globais, faça o mesmo:
window.navigateTo = navigateTo;
// Supondo que exista função logout em outro arquivo, importe e exponha:
window.logout = () => {
  localStorage.removeItem('user');
  navigateTo('login');
};
