import folhaLogin from '../images/folhaLogin.png';
import logo_librain_Transparente from '../images/logo_librain_Transparente.png';

export function renderLoginPage(container) {
    container.innerHTML = `
    <style>
      .containerLogin {
        background-image: url('${folhaLogin}');
        repeat: no-repeat;
        display: flex;
        width: 100%;
        height: 280px;
      }

      .containerLogin img {
        margin-top: 22px;
      }

      .login {
        margin-top: 40px;
        color: #fff;
        font-family: arial black;
        font-size: 220%;
      }

      .centro {
      display: flex;
      justify-content: center;
      }

      #login-form {
    margin-top: 0px;
    display: flex;
    flex-direction: column;
    gap: 10px; /* Espaço entre os elementos */
    width: 100%;
    max-width: 300px; /* Limita a largura */
    margin: auto; /* Centraliza */
  }

  #login-form input[type="text"],
  #login-form input[type="password"] {
    background-color: #fff9b0;     /* amarelo claro */
    color: #5e3366;                /* roxo escuro */
    border: none;
    border-radius: 999px;          /* deixa bem oval */
    padding: 12px 20px;
    font-family: arial black;
    font-size: 16px;
    text-align: center;
    outline: none;
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box;
  }

  .input-preenchido {
    background-color: #fff9b0;
    color: #111;
  }

  .input-estilizado::placeholder {
    color: #5e3366;
    opacity: 0.7;
  }

  #login-form label {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  #login-form button {
        background-color: #ab84a2;     /* amarelo claro */
    color: #fff;                /* roxo escuro */
    border: none;
    border-radius: 999px;          /* deixa bem oval */
    padding: 12px 20px;
    font-family: arial black;
    font-size: 16px;
    text-align: center;
    outline: none;
    margin-bottom: 10px;
    width: 100%;
    box-sizing: border-box;
  }
  }

  #login-form + p {
    text-align: center;
  }

  .textoBacana1 {
  font-family: arial black;
  color: #fff;
  }

  .conta {
    display: flex;
    aling-text: center;
    justify-content: center;
    margin-top: 50px;
    color: #fff;
    font-family: arial black;
    font-size: 80%;
  }

  a:link {
    color: #fff;
    background-color: transparent;
    text-decoration: none;
  }

  a:visited {
    color: #fff;
    background-color: transparent;
    text-decoration: none;
  }
    </style>
      <div class='containerLogin centro'>
          <img src="${logo_librain_Transparente}" alt="Logo" height='200px' width='200px'>
      </div>

      <div class ='centro'>
      <p class='login'>Login</p>
      </div>
      <form id="login-form">
        <input type="text" name="nome" placeholder="Seu nome" required />
        <input type="text" name="cpf" placeholder="Seu CPF" required />
        
        <label>
          <input type="radio" name="tipo" value="leitor" checked />
          Leitor
        </label>
        <label>
          <input type="radio" name="tipo" value="admin" />
          Administrador
        </label>
  
        <button type="submit">Entrar</button>
      </form>
      <div class='contaclasse'>
        <p class='conta'>Ainda não fez cadastro?<a href="#" id="go-register" style='margin-left: 5px;'>Cadastre-se</a></p>
      </div>
    `;
  
    const form = document.getElementById('login-form');
    form.onsubmit = (e) => {
      e.preventDefault();
  
      const nome = form.nome.value.trim();
      const cpf = form.cpf.value.trim();
      const tipo = form.tipo.value;
  
      if (!nome || !cpf) {
        alert('Preencha todos os campos.');
        return;
      }
  
      // Salva usuário no localStorage
      localStorage.setItem('user', JSON.stringify({ nome, cpf, tipo }));
  
      alert(`Bem-vindo(a), ${nome}!`);
  
      if (tipo === 'admin') {
        navigateTo('admin');
      } else {
        navigateTo('books');
      }
    };
    const registerLink = document.getElementById('go-register');
    registerLink.onclick = (e) => {
      e.preventDefault();
      navigateTo('register');
    };
  }
  