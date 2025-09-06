import { navigateTo } from '../main.js';
import { books as initialBooks } from '../data/books.js';

export function renderAdminPanel(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.tipo !== 'admin') {
    navigateTo('login');
    return;
  }

  let livros = JSON.parse(localStorage.getItem('books')) || [...initialBooks];
  
  // Obter todos os usuários do localStorage para a lógica interna
  const allUsers = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('user-')) {
      const storedUser = JSON.parse(localStorage.getItem(key));
      allUsers.push(storedUser);
    }
  }

  // Obter livros com solicitações de empréstimo (primeiro na fila)
  const solicitacoesEmprestimo = livros.filter(book => book.queue && book.queue.length > 0);

  // Obter devoluções pendentes (da sua lógica original)
  const devolucoesPendentes = JSON.parse(localStorage.getItem('devolucoesPendentes')) || [];

  container.innerHTML = `
    <h1>Painel do Administrador</h1>

    <div class="admin-panel-section">
      <h2>Adicionar Novo Administrador</h2>
      <form id="form-add-admin">
        <input type="text" id="admin-cpf" placeholder="CPF do usuário" required>
        <button type="submit">Tornar Admin</button>
      </form>
    </div>

    <div class="admin-panel-section">
      <h2>📥 Devoluções Pendentes</h2>
      <ul id="lista-devolucoes">
        ${devolucoesPendentes.map((d, index) => {
          const livro = livros.find(b => b.id === d.bookId);
          const leitor = allUsers.find(u => u.cpf === d.cpf);
          return `
            <li>
              <strong>${livro?.title || 'Livro'}</strong> - por ${leitor?.nome || d.cpf}
              <button data-index="${index}" class="btn-aprovar-devolucao">Aprovar Devolução</button>
            </li>
          `;
        }).join('') || '<li>Nenhuma devolução pendente.</li>'}
      </ul>
    </div>

    <div class="admin-panel-section">
      <h2>✍️ Solicitações de Empréstimo</h2>
      <ul id="lista-solicitacoes">
        ${solicitacoesEmprestimo.map(book => {
          const solicitanteCpf = book.queue[0];
          const solicitante = allUsers.find(u => u.cpf === solicitanteCpf);
          const nomeSolicitante = solicitante ? solicitante.nome : 'Usuário Desconhecido';
          return `
            <li>
              <strong>${book.title}</strong> - solicitada por ${nomeSolicitante}
              <button class="btn-aprovar-solicitacao" data-book-id="${book.id}">Aprovar</button>
              <button class="btn-negar-solicitacao" data-book-id="${book.id}">Negar</button>
            </li>
          `;
        }).join('') || '<li>Nenhuma solicitação pendente.</li>'}
      </ul>
    </div>
    
    <button id="logout" style="margin-top: 20px;">Sair</button>
  `;

  // === Event Listeners ===

  // Adicionar novo admin por CPF
  container.querySelector('#form-add-admin').addEventListener('submit', (e) => {
    e.preventDefault();
    const adminCpf = document.getElementById('admin-cpf').value.trim();
    const targetUser = allUsers.find(u => u.cpf === adminCpf);

    if (targetUser) {
      if (targetUser.tipo === 'admin') {
        alert('Este usuário já é um administrador.');
      } else {
        targetUser.tipo = 'admin';
        localStorage.setItem(`user-${targetUser.cpf}`, JSON.stringify(targetUser));
        alert(`O usuário ${targetUser.nome} agora é um administrador.`);
        renderAdminPanel(container);
      }
    } else {
      alert('Usuário não encontrado. Verifique o CPF.');
    }
  });

  // Aprovar Devolução
  container.querySelectorAll('.btn-aprovar-devolucao').forEach(button => {
    button.onclick = () => {
      const index = Number(button.getAttribute('data-index'));
      const devolucao = devolucoesPendentes[index];
      
      const livro = livros.find(b => b.id === devolucao.bookId);
      if (livro) {
        livro.available = true;
        livro.returnDate = null;
        livro.emprestadoPara = null;
        
        devolucoesPendentes.splice(index, 1);
        localStorage.setItem('devolucoesPendentes', JSON.stringify(devolucoesPendentes));
        localStorage.setItem('books', JSON.stringify(livros));
        
        alert(`Devolução de "${livro.title}" aprovada.`);
        renderAdminPanel(container);
      }
    };
  });

  // Aprovar Solicitação de Empréstimo
  container.querySelectorAll('.btn-aprovar-solicitacao').forEach(button => {
    button.onclick = () => {
      const bookId = button.dataset.bookId;
      const livro = livros.find(b => b.id === bookId);
      if (livro && livro.queue.length > 0) {
        const solicitanteCpf = livro.queue.shift();
        livro.available = false;
        livro.emprestadoPara = solicitanteCpf;
        const returnDate = new Date();
        returnDate.setDate(returnDate.getDate() + 14);
        livro.returnDate = returnDate.toISOString().split('T')[0];

        localStorage.setItem('books', JSON.stringify(livros));
        alert(`Empréstimo de "${livro.title}" aprovado para ${solicitanteCpf}.`);
        renderAdminPanel(container);
      }
    };
  });

  // Negar Solicitação de Empréstimo
  container.querySelectorAll('.btn-negar-solicitacao').forEach(button => {
    button.onclick = () => {
      const bookId = button.dataset.bookId;
      const livro = livros.find(b => b.id === bookId);
      if (livro && livro.queue.length > 0) {
        livro.queue.shift();
        localStorage.setItem('books', JSON.stringify(livros));
        alert(`Solicitação de "${livro.title}" negada. O próximo da fila, se houver, será considerado.`);
        renderAdminPanel(container);
      }
    };
  });

  // Logout
  container.querySelector('#logout').onclick = () => {
    localStorage.removeItem('user');
    navigateTo('login');
  };
}