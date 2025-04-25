export function renderNotificacoes(container) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      alert('Usuário não autenticado.');
      navigateTo('login');
      return;
    }
  
    const notificacoes = JSON.parse(localStorage.getItem('notificacoes')) || [];
    const minhasNotificacoes = notificacoes.filter(n => n.cpf === user.cpf);
  
    const lista = minhasNotificacoes.length
      ? minhasNotificacoes.map(n => `<li>${n.mensagem}</li>`).join('')
      : '<li>Sem notificações no momento.</li>';
  
    container.innerHTML = `
      <h1>🔔 Minhas Notificações</h1>
      <ul>${lista}</ul>
      <br />
      <button onclick="navigateTo('dashboard')">Voltar</button>
    `;
  }
  