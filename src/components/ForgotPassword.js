import folhaLogin from '../images/folhaLogin.png';
import logo_librain_T from '../images/logo_librain_T.png';
import { navigateTo } from '../main.js';

export function renderForgotPasswordPage(container) {
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

      .forgot-title {
        margin-top: 40px;
        color: #fff;
        font-family: arial black;
        font-size: 180%;
        text-align: center;
      }

      .forgot-subtitle {
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

      #forgot-form {
        margin-top: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 300px;
        margin: 20px auto;
      }
      
      #forgot-form input[type="text"] {
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
      
      #forgot-form button {
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

      #forgot-form button:hover {
        background-color: #8aa3f0;
      }

      #forgot-form button:disabled {
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
    </style>

    <div class='containerLogin centro'>
      <img src="${logo_librain_T}" alt="Logo" height='200px' width='200px'>
    </div>

    <div class='centro'>
      <p class='forgot-title'>Esqueci minha senha</p>
    </div>

    <p class='forgot-subtitle'>Digite seu CPF para receber instruções de recuperação</p>

    <div id="message-container"></div>

    <form id="forgot-form">
      <input type="text" name="cpf" id="cpf-input" placeholder="CPF" maxlength="14" required />
      <button type="submit">Enviar</button>
    </form>

    <div class='back-link'>
      <p>Lembrou sua senha? <a href="#" id="back-login">Fazer login</a></p>
    </div>
  `;

  const form = document.getElementById('forgot-form');
  const cpfInput = document.getElementById('cpf-input');
  const messageContainer = document.getElementById('message-container');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Máscara de CPF
  cpfInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
  });

  // Função para exibir mensagens
  function showMessage(message, type = 'info') {
    messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
    
    setTimeout(() => {
      messageContainer.innerHTML = '';
    }, 5000);
  }

  // Submit do formulário
  form.onsubmit = async (e) => {
    e.preventDefault();
    
    const cpf = cpfInput.value.replace(/\D/g, '');
    
    if (cpf.length !== 11) {
      showMessage('❌ Por favor, digite um CPF válido com 11 dígitos.', 'error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    
    try {
      const response = await fetch('http://localhost:3000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('✅ ' + data.message, 'success');
        cpfInput.value = '';
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigateTo('login');
        }, 3000);
      } else {
        showMessage('❌ ' + (data.error || 'Erro ao processar solicitação.'), 'error');
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error);
      showMessage('❌ Erro de conexão. Tente novamente.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar';
    }
  };

  // Voltar para login
  const backLoginLink = document.getElementById('back-login');
  backLoginLink.onclick = (e) => {
    e.preventDefault();
    navigateTo('login');
  };
}