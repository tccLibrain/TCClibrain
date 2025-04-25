import { books } from '../data/books.js';
import { aprovarDevolucao } from '../utils/devolucao.js';

export function renderAdminPanel(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.tipo !== 'admin') {
    navigateTo('login');
    return;
  }

  let livros = JSON.parse(localStorage.getItem('books')) || [...books];

  const form = document.createElement('form');
  form.innerHTML = `
    <h2>Cadastrar Novo Livro</h2>
    <input type="text" id="title" placeholder="Título" required />
    <input type="text" id="author" placeholder="Autor" required />
    <button type="submit">Cadastrar</button>
  `;

  form.onsubmit = (e) => {
    e.preventDefault();
    const title = form.querySelector('#title').value.trim();
    const author = form.querySelector('#author').value.trim();

    if (!title || !author) {
      alert('Preencha todos os campos.');
      return;
    }

    const newBook = {
      id: livros.length + 1,
      title,
      author,
      available: true,
      returnDate: null,
      reviews: [],
      queue: []
    };

    livros.push(newBook);
    localStorage.setItem('books', JSON.stringify(livros));
    alert('Livro cadastrado com sucesso!');
    renderAdminPanel(container);
  };

  const bookList = livros.map(book => `
    <div style="border: 1px solid #ccc; margin-bottom: 10px; padding: 8px;">
      <strong>${book.title}</strong> - ${book.author} <br />
      Status: ${book.available ? 'Disponível' : 'Emprestado até ' + book.returnDate}
    </div>
  `).join('');

  // DEVOLUÇÕES PENDENTES
  const devolucoesPendentes = JSON.parse(localStorage.getItem('devolucoesPendentes')) || [];
  const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

  const devolucoesHtml = devolucoesPendentes.length
    ? devolucoesPendentes.map((d, index) => {
        const livro = livros.find(b => b.id === d.bookId);
        const leitor = usuarios.find(u => u.cpf === d.cpf);
        return `
          <li>
            <strong>${livro?.title || 'Livro'}</strong> - solicitado por ${leitor?.nome || d.cpf}
            <button onclick="aprovarDevolucao(${index})">Aprovar</button>
          </li>
        `;
      }).join('')
    : '<li>Nenhuma devolução pendente.</li>';

  const logoutButton = document.createElement('button');
  logoutButton.textContent = 'Sair';
  logoutButton.style.marginTop = '20px';
  logoutButton.onclick = () => {
    localStorage.removeItem('user');
    navigateTo('login');
  };

  container.innerHTML = `
    <h1>Painel do Administrador</h1>
    ${form.outerHTML}

    <h2>Livros Cadastrados</h2>
    <div>${bookList}</div>

    <h2>📥 Devoluções Pendentes</h2>
    <ul>${devolucoesHtml}</ul>
  `;

  container.appendChild(logoutButton);
}

// Torna função global para ser chamada nos botões
window.aprovarDevolucao = aprovarDevolucao;
