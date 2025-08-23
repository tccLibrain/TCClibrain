import folhaLogin from '../images/folhaLogin.png';
import logo_librain_T from '../images/logo_librain_T.png';
import { navigateTo } from '../router.js';

export function renderLoginPage(container) {
  // Inicializa usuários padrão
  const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

  const adminExiste = usuarios.some(u => u.cpf === '00000000000');
  if (!adminExiste) {
    usuarios.push({
      nome: 'admin',
      cpf: '00000000000',
      senha: 'admin123', // senha padrão
      tipo: 'admin'
    });
  }

  const userExiste = usuarios.some(u => u.cpf === '11111111111');
  if (!userExiste) {
    usuarios.push({
      nome: 'user',
      cpf: '11111111111',
      senha: 'user123', // senha padrão
      tipo: 'leitor'
    });
  }

  localStorage.setItem('usuarios', JSON.stringify(usuarios));

  // Renderiza tela de login
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
        .containerLogin img { margin-top: 22px; }
        .login {
          margin-top: 40px;
          color: #fff;
          font-family: arial black;
          font-size: 220%;
        }
        .centro { display: flex; justify-content: center; }
        #login-form {
          margin-top: 0px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          max-width: 300px;
          margin: auto;
        }
        #login-form input[type="text"],
        #login-form input[type="password"] {
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
        #login-form button {
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
        }
        .conta {
          display: flex;
          text-align: center;
          justify-content: center;
          margin-top: 50px;
          color: #fff;
          font-family: arial black;
          font-size: 80%;
        }
        a:link, a:visited { color: #fff; text-decoration: none; }
      </style>

      <div class='containerLogin centro'>
        <img src="${logo_librain_T}" alt="Logo" height='200px' width='200px'>
      </div>

      <div class='centro'>
        <p class='login'>Login</p>
      </div>

      <form id="login-form">
        <input type="text" name="cpf" placeholder="CPF" required />
        <input type="password" name="senha" placeholder="Senha" required />
        
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
        <p class='conta'>Ainda não fez cadastro?<a href="#" id="go-register" style='margin-left: 5px; color: #9bb4ff;'>Cadastre-se</a></p>
      </div>
  `;

  // Lógica de Login
  const form = document.getElementById('login-form');
  form.onsubmit = (e) => {
    e.preventDefault();

    const cpfInput = form.cpf.value.replace(/\D/g, ''); // só números
    const senhaInput = form.senha.value.trim();
    const tipoSelecionado = form.tipo.value;

    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const user = usuarios.find(u => u.cpf === cpfInput);

    if (!user) {
      alert('Usuário não encontrado.');
      return;
    }

    if (user.tipo !== tipoSelecionado) {
      alert('Tipo de usuário incorreto.');
      return;
    }

    if (user.senha !== senhaInput) {
      alert('Senha incorreta.');
      return;
    }

    localStorage.setItem('usuarioLogado', JSON.stringify(user));
    alert(`Bem-vindo(a), ${user.nome}!`);
    navigateTo(user.tipo === 'admin' ? 'admin' : 'books');
  };

  // Link para cadastro
  const registerLink = document.getElementById('go-register');
  registerLink.onclick = (e) => {
    e.preventDefault();
    navigateTo('register');
  };
}
