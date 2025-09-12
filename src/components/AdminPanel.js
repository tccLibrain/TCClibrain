import { navigateTo } from '../main.js';

export async function renderAdminPanel(container) {
  // A validação do usuário e do tipo agora será feita no backend
  // Por enquanto, vamos renderizar o painel e tratar a lógica de
  // autenticação e autorização em uma etapa futura.

  // 1. Obter todos os usuários do backend
  let allUsers = [];
  try {
    const response = await fetch('http://localhost:3000/api/users');
    if (response.ok) {
      allUsers = await response.json();
    } else {
      console.error('Falha ao carregar usuários:', response.statusText);
      alert('Falha ao carregar usuários.');
      return;
    }
  } catch (error) {
    console.error('Erro de rede:', error);
    alert('Erro de conexão com o servidor.');
    return;
  }

  // 2. Obter todos os livros do backend
  let livros = [];
  try {
    const response = await fetch('http://localhost:3000/api/books');
    if (response.ok) {
      livros = await response.json();
    } else {
      console.error('Falha ao carregar livros:', response.statusText);
      alert('Falha ao carregar livros.');
      return;
    }
  } catch (error) {
    console.error('Erro de rede:', error);
    alert('Erro de conexão com o servidor.');
    return;
  }

  // Obter devoluções pendentes do backend
  let devolucoesPendentes = [];
  try {
    const response = await fetch('http://localhost:3000/api/admin/devolucoes');
    if (response.ok) {
      devolucoesPendentes = await response.json();
    }
  } catch (error) {
    console.error('Erro ao carregar devoluções:', error);
  }

  // Obter solicitações de empréstimo (primeiro na fila)
  const solicitacoesEmprestimo = livros.filter(book => book.queue && book.queue.length > 0);

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
  container.querySelector('#form-add-admin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminCpf = document.getElementById('admin-cpf').value.trim();

    try {
      const response = await fetch('http://localhost:3000/api/admin/add-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: adminCpf })
      });
      const message = await response.text();
      alert(message);
      if (response.ok) {
        renderAdminPanel(container);
      }
    } catch (error) {
      alert('Erro ao tentar tornar usuário admin.');
      console.error('Erro:', error);
    }
  });

  // Aprovar Devolução
  container.querySelectorAll('.btn-aprovar-devolucao').forEach(button => {
    button.onclick = async () => {
      const index = Number(button.getAttribute('data-index'));
      const devolucao = devolucoesPendentes[index];

      try {
        const response = await fetch('http://localhost:3000/api/admin/approve-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: devolucao.bookId, cpf: devolucao.cpf })
        });
        const message = await response.text();
        alert(message);
        if (response.ok) {
          renderAdminPanel(container);
        }
      } catch (error) {
        alert('Erro ao aprovar devolução.');
        console.error('Erro:', error);
      }
    };
  });

  // Aprovar Solicitação de Empréstimo
  container.querySelectorAll('.btn-aprovar-solicitacao').forEach(button => {
    button.onclick = async () => {
      const bookId = button.dataset.bookId;

      try {
        const response = await fetch('http://localhost:3000/api/admin/approve-loan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId })
        });
        const message = await response.text();
        alert(message);
        if (response.ok) {
          renderAdminPanel(container);
        }
      } catch (error) {
        alert('Erro ao aprovar empréstimo.');
        console.error('Erro:', error);
      }
    };
  });

  // Negar Solicitação de Empréstimo
  container.querySelectorAll('.btn-negar-solicitacao').forEach(button => {
    button.onclick = async () => {
      const bookId = button.dataset.bookId;

      try {
        const response = await fetch('http://localhost:3000/api/admin/deny-loan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId })
        });
        const message = await response.text();
        alert(message);
        if (response.ok) {
          renderAdminPanel(container);
        }
      } catch (error) {
        alert('Erro ao negar empréstimo.');
        console.error('Erro:', error);
      }
    };
  });

  // Logout
  container.querySelector('#logout').onclick = () => {
    localStorage.removeItem('user');
    navigateTo('login');
  };
}