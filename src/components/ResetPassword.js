import folhaLogin from '../images/folhaLogin.png';
import logo_librain_T from '../images/logo_librain_T.png';
import { navigateTo } from '../main.js';

export function renderResetPasswordPage(container, params = {}) {
  // Pegar token da URL se disponível
  const urlParams = new URLSearchParams(window.location.search);
  const token = params.token || urlParams.get('token') || '';

  if (!token) {
    container.innerHTML = `
      <style>
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: #434E70;
        }
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #fff;
          font-family: arial black;
          text-align: center;
          padding: 20px;
        }
        .error-container button {
          margin-top: 20px;
          background-color: #9bb4ff;
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 12px 24px;
          font-family: arial black;
          font-size: 16px;
          cursor: pointer;
        }
      </style>
      <div class="error-container">
        <h2>⚠️ Token Inválido</h2>
        <p>O link de recuperação está inválido ou expirou.</p>
        <button onclick="window.location.hash='#forgot-password'">Solicitar Novo Link</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <style>
      html, body {
        height: 100%;
        margin: 0;
        padding: 0;
        background-color: #434E70;
      }

      .containerLogin {
        background-image: url('${folhaLogin}');
        background-repeat: no-repeat;
        display: flex;
        width: 100%;
        height: 280px;
      }

      .containerLogin img {
        margin-top: 22px;
      }

      .reset-title {
        margin-top: 40px;
        color: #fff;
        font-family: arial black;
        font-size: 180%;
        text-align: center;
      }

      .reset-subtitle {
        color: #CFD2DB;
        font-family: arial;
        font-size: 90%;
        text-align: center;
        margin-top: 10px;
        padding: 0 20px;
      }

      .centro {
        display: flex;
        justify-content: center;
      }

      #reset-form {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 300px;
        margin: 20px auto;
      }
      
      #reset-form input[type="password"] {
        background-color: #CFD2DB;
        color: #434E70;
        border: none;
        border-radius: 999px;
        padding: 12px 20px;
        font-family: arial black;
        font-size: 16px;
        text-align: center;
        outline: none;
        margin-bottom: 10px;
        width: 100%;
        box-sizing: border-box;
      }
      
      #reset-form button {
        background-color: #9bb4ff;
        color: #fff;
        border: none;
        border-radius: 999px;
        padding: 12px 20px;
        font-family: arial black;
        font-size: 16px;
        text-align: center;
        outline: none;
        margin-bottom: 10px;
        width: 100%;
        box-sizing: border-box;
        cursor: pointer;
        transition: background-color 0.3s;
      }

      #reset-form button:hover {
        background-color: #8aa3f0;
      }

      #reset-form button:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
      }
      
      .back-link {
        display: flex;
        text-align: center;
        justify-content: center;
        margin-top: 30px;
        color: #fff;
        font-family: arial black;
        font-size: 80%;
      }
      
      .back-link a {
        color: #9bb4ff;
        text-decoration: none;
        cursor: pointer;
      }

      .back-link a:hover {
        text-decoration: underline;
      }

      .message {
        text-align: center;
        padding: 12px;
        border-radius: 8px;
        margin: 10px 20px;
        font-family: arial;
        font-size: 14px;
      }

      .message.success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }

      .message.error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }

      .message.info {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
      }

      .password-requirements {
        background-color: rgba(207, 210, 219, 0.2);
        border-radius: 8px;
        padding: 15px;
        margin: 10px 20px;
        color: #CFD2DB;
        font-family: arial;
        font-size: 12px;
      }

      .password-requirements ul {
        margin: 8px 0;
        padding-left: 20px;
        text-align: left;
      }

      .password-requirements li {
        margin: 5px 0;
      }
    </style>

    <div class='containerLogin centro'>
      <img src="${logo_librain_T}" alt="Logo" height='200px' width='200px'>
    </div>

    <div class='centro'>
      <p class='reset-title'>Redefinir senha</p>
    </div>

    <p class='reset-subtitle'>Digite sua nova senha</p>

    <div class="password-requirements">
      <strong>A senha deve conter:</strong>
      <ul>
        <li>Mínimo de 6 caracteres</li>
        <li>Letras e números</li>
      </ul>
    </div>

    <div id="message-container"></div>

    <form id="reset-form">
      <input type="password" name="senha" id="senha-input" placeholder="Nova senha" required />
      <input type="password" name="confirmarSenha" id="confirmar-senha-input" placeholder="Confirmar nova senha" required />
      <button type="submit">Redefinir Senha</button>
    </form>

    <div class='back-link'>
      <p><a href="#" id="back-login">Voltar para login</a></p>
    </div>
  `;

  const form = document.getElementById('reset-form');
  const senhaInput = document.getElementById('senha-input');
  const confirmarSenhaInput = document.getElementById('confirmar-senha-input');
  const messageContainer = document.getElementById('message-container');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Função para exibir mensagens
  function showMessage(message, type = 'info') {
    messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
    
    if (type === 'success') {
      setTimeout(() => {
        messageContainer.innerHTML = '';
      }, 3000);
    } else {
      setTimeout(() => {
        messageContainer.innerHTML = '';
      }, 5000);
    }
  }

  // Validar senha
  function validatePassword(senha) {
    if (senha.length < 6) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
      return 'A senha deve conter letras e números.';
    }
    return null;
  }

  // Submit do formulário
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const senha = senhaInput.value;
    const confirmarSenha = confirmarSenhaInput.value;

    // Validações
    const senhaError = validatePassword(senha);
    if (senhaError) {
      showMessage('❌ ' + senhaError, 'error');
      return;
    }

    if (senha !== confirmarSenha) {
      showMessage('❌ As senhas não coincidem.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Redefinindo...';
    
    try {
      const response = await fetch('http://localhost:3000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha: senha })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('✅ ' + data.message, 'success');
        senhaInput.value = '';
        confirmarSenhaInput.value = '';
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigateTo('login');
        }, 2000);
      } else {
        showMessage('❌ ' + (data.error || 'Erro ao redefinir senha.'), 'error');
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      showMessage('❌ Erro de conexão. Tente novamente.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Redefinir Senha';
    }
  };

  // Voltar para login
  const backLoginLink = document.getElementById('back-login');
  backLoginLink.onclick = (e) => {
    e.preventDefault();
    navigateTo('login');
  };
}