import { books } from '../data/books.js';
import { aprovarDevolucao } from '../utils/devolucao.js';


export function renderAdminPanel(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.tipo !== 'admin') {
    navigateTo('login');
    return;
  }

  let livros = JSON.parse(localStorage.getItem('books')) || [...books];

  container.innerHTML = `
    <h1>Painel do Administrador</h1>

    <h2>Cadastrar Novo Livro</h2>
    <form id="form-cadastrar-livro">
      <input type="text" id="title" placeholder="Título" required />
      <input type="text" id="author" placeholder="Autor" required />
      <button type="submit">Cadastrar</button>
    </form>

    <h2>Livros Cadastrados</h2>
    <div id="lista-livros">
      ${livros.map(book => `
        <div style="border: 1px solid #ccc; margin-bottom: 10px; padding: 8px;">
          <strong>${book.title}</strong> - ${book.author} <br />
          Status: ${book.available ? 'Disponível' : 'Emprestado até ' + book.returnDate}
        </div>
      `).join('')}
    </div>

    <h2>📥 Devoluções Pendentes</h2>
    <ul id="lista-devolucoes">
      ${
        (JSON.parse(localStorage.getItem('devolucoesPendentes')) || []).map((d, index) => {
          const livro = livros.find(b => b.id === d.bookId);
          const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
          const leitor = usuarios.find(u => u.cpf === d.cpf);
          return `
            <li>
              <strong>${livro?.title || 'Livro'}</strong> - solicitado por ${leitor?.nome || d.cpf}
              <button data-index="${index}" class="btn-aprovar">Aprovar</button>
            </li>
          `;
        }).join('') || '<li>Nenhuma devolução pendente.</li>'
      }
    </ul>

    <button id="logout" style="margin-top: 20px;">Sair</button>
  `;

  // Evento do formulário
  const form = container.querySelector('#form-cadastrar-livro');
  form.onsubmit = (e) => {
    e.preventDefault();
    const title = form.querySelector('#title').value.trim();
    const author = form.querySelector('#author').value.trim();

    if (!title || !author) {
      alert('Preencha todos os campos.');
      return;
    }

    const newBook = {
      id: Date.now(),
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

  // Evento para aprovar devoluções
  container.querySelectorAll('.btn-aprovar').forEach(button => {
    button.onclick = () => {
      const index = button.getAttribute('data-index');
      aprovarDevolucao(Number(index));
      renderAdminPanel(container);
    };
  });

  // Evento logout
  container.querySelector('#logout').onclick = () => {
    localStorage.removeItem('user');
    navigateTo('login');
  };
}

// Torna função global para ser chamada externamente se precisar
window.aprovarDevolucao = aprovarDevolucao;
