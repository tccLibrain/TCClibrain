export function renderNotificacoes(container) {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert("Usuário não encontrado. Faça login novamente.");
    return;
  }

  // Pega notificações do localStorage (se houver)
  const notificacoes = JSON.parse(localStorage.getItem('notificacoes')) || [];

  const minhasNotificacoes = notificacoes.filter(n => n.cpf === user.cpf);

  container.innerHTML = `
    <h1>🔔 Minhas Notificações</h1>
    <ul>
      ${
        minhasNotificacoes.length
          ? minhasNotificacoes.map(n => `<li>${n.mensagem}</li>`).join("")
          : "<li>Sem notificações no momento.</li>"
      }
    </ul>
    <button id="voltar-dashboard">⬅️ Voltar</button>
  `;

  // Voltar para dashboard
  document.getElementById("voltar-dashboard").addEventListener("click", () => {
    import("./UserDashboard.js").then(module => {
      module.renderUserDashboard(container);
    });
  });
}
