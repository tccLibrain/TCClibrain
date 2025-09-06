import { books as initialBooks } from '../data/books.js';

export function devolverLivro(bookId, cpf) {
  const devolucoesPendentes = JSON.parse(localStorage.getItem('devolucoesPendentes')) || [];
  devolucoesPendentes.push({ bookId, cpf });
  localStorage.setItem('devolucoesPendentes', JSON.stringify(devolucoesPendentes));
  alert('Solicitação de devolução enviada para aprovação.');
}

export function aprovarDevolucao(index) {
  const devolucoesPendentes = JSON.parse(localStorage.getItem('devolucoesPendentes')) || [];
  const devolucao = devolucoesPendentes[index];

  if (!devolucao) return;

  const books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  const emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
  const reservas = JSON.parse(localStorage.getItem('reservas')) || [];

  const book = books.find(b => b.id === devolucao.bookId);
  if (!book) {
    alert('Livro não encontrado.');
    return;
  }

  const novoEmprestimos = emprestimos.filter(e => !(e.cpf === devolucao.cpf && e.titulo === book.title));
  localStorage.setItem('emprestimos', JSON.stringify(novoEmprestimos));

  if (book.queue && book.queue.length > 0) {
    const proximoCpf = book.queue.shift();
    book.available = false;
    book.returnDate = gerarDataDevolucao();

    novoEmprestimos.push({
      cpf: proximoCpf,
      titulo: book.title,
      prazo: book.returnDate
    });
    localStorage.setItem('emprestimos', JSON.stringify(novoEmprestimos));

    const novasReservas = reservas.filter(r => !(r.cpf === proximoCpf && r.titulo === book.title));
    localStorage.setItem('reservas', JSON.stringify(novasReservas));

    const notificacoesKey = `notificacoes-${proximoCpf}`;
    const notificacoes = JSON.parse(localStorage.getItem(notificacoesKey)) || [];
    notificacoes.push(`📢 O livro "${book.title}" agora está disponível para você!`);
    localStorage.setItem(notificacoesKey, JSON.stringify(notificacoes));
  } else {
    book.available = true;
    book.returnDate = null;
  }

  localStorage.setItem('books', JSON.stringify(books));

  devolucoesPendentes.splice(index, 1);
  localStorage.setItem('devolucoesPendentes', JSON.stringify(devolucoesPendentes));

  alert('Devolução aprovada com sucesso!');
  navigateTo('admin');
}

function gerarDataDevolucao() {
  const hoje = new Date();
  hoje.setDate(hoje.getDate() + 7);
  return hoje.toISOString().split('T')[0];
}
