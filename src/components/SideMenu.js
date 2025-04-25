// src/components/SideMenu.js
export function renderSideMenu() {
    return `
      <div id="menu-lateral" class="menu-lateral">
        <ul>
          <li onclick="navigateTo('dashboard')">👤 Perfil</li>
          <li onclick="navigateTo('notificacoes')">🔔 Notificações</li>
          <li>🛠 Suporte</li>
          <li>📚 Estante</li>
          <li>📝 Feedback</li>
          <li>⚙️ Configurações</li>
        </ul>
      </div>
      <div id="overlay-menu" class="overlay hidden"></div>
    `;
  }
  