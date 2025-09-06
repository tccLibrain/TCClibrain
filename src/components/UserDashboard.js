import { navigateTo } from '../main.js';
import { books as initialBooks } from '../data/books.js';

export function renderUserDashboard(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Usuário não encontrado. Faça login novamente.');
    navigateTo('login');
    return;
  }

  const allBooks = JSON.parse(localStorage.getItem('books')) || initialBooks;

  // Usa o CPF do usuário como uma string para garantir a comparação correta
  const userCPF = String(user.cpf);

  const livrosEmprestados = allBooks.filter(book => String(book.loanedTo) === userCPF);
  const livrosSolicitados = allBooks.filter(book => String(book.requestedBy) === userCPF);
  const livrosReservados = allBooks.filter(book => book.waitlist && book.waitlist.includes(userCPF));

  const emprestimosHtml = livrosEmprestados.length
    ? livrosEmprestados.map(book => {
      const prazo = book.prazoDevolucao ? new Date(book.prazoDevolucao).toLocaleDateString('pt-BR') : 'Indefinido';
      return `
        <li>
          <strong>${book.title}</strong> - Empréstimo ativo
          <button class="btn-devolver" data-bookid="${book.id}">Devolver</button>
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
      const posicao = book.waitlist.indexOf(userCPF) + 1;
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
  container.querySelector('#logout').addEventListener('click', () => {
    localStorage.removeItem('user');
    navigateTo('login');
  });

  // Botões de devolver
  container.querySelectorAll('.btn-devolver').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = btn.dataset.bookid;
      const bookToReturn = allBooks.find(book => book.id === bookId);
      if (bookToReturn) {
        bookToReturn.loanedTo = null;
        bookToReturn.prazoDevolucao = null;
        if (bookToReturn.waitlist && bookToReturn.waitlist.length > 0) {
          const nextUserCPF = bookToReturn.waitlist.shift();
          bookToReturn.requestedBy = nextUserCPF;
          bookToReturn.requestDate = Date.now();
          alert(`Livro devolvido. Uma solicitação foi criada para o próximo usuário na fila.`);
        } else {
          alert('Livro devolvido com sucesso!');
        }
        localStorage.setItem('books', JSON.stringify(allBooks));
        renderUserDashboard(container);
      }
    });
  });

  // Botões de cancelar solicitação
  container.querySelectorAll('.btn-cancelar-solicitacao').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = String(btn.dataset.bookid); // Garante que o ID seja uma string
      const bookToCancel = allBooks.find(book => String(book.id) === bookId);
      
      if (bookToCancel && String(bookToCancel.requestedBy) === userCPF) {
        bookToCancel.requestedBy = null;
        bookToCancel.requestDate = null;
        localStorage.setItem('books', JSON.stringify(allBooks));
        alert('Solicitação cancelada com sucesso!');
        renderUserDashboard(container);
      } else {
        alert('Não foi possível cancelar a solicitação. Verifique se você é o solicitante do livro.');
      }
    });
  });

  // Botões de cancelar reserva
  container.querySelectorAll('.btn-cancelar-reserva').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = String(btn.dataset.bookid);
      const bookToCancel = allBooks.find(book => String(book.id) === bookId);
      if (bookToCancel && bookToCancel.waitlist) {
        bookToCancel.waitlist = bookToCancel.waitlist.filter(cpf => String(cpf) !== userCPF);
        localStorage.setItem('books', JSON.stringify(allBooks));
        alert('Reserva cancelada com sucesso!');
        renderUserDashboard(container);
      }
    });
  });
}