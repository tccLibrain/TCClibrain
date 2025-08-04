import folhaLogin from '../images/folhaLogin.png';
import logo_librain_Transparente from '../images/logo_librain_Transparente.png';

export function renderLoginPage(container) {
  // Garante que o admin e o user fixos existam
  const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
  
  // Verifica se o admin fixo existe
  const adminExiste = usuarios.some(u => u.nome === 'admin' && u.cpf === '00000000000');
  if (!adminExiste) {
    usuarios.push({
      nome: 'admin',
      cpf: '00000000000',
      tipo: 'admin'
    });
  }

  // Verifica se o user fixo existe
  const userExiste = usuarios.some(u => u.nome === 'user' && u.cpf === '11111111111');
  if (!userExiste) {
    usuarios.push({
      nome: 'user',
      cpf: '11111111111',
      tipo: 'leitor'
    });
  }

  localStorage.setItem('usuarios', JSON.stringify(usuarios));

  // Renderiza a interface
  container.innerHTML = `
      <style>
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
        gap: 10px;
        width: 100%;
        max-width: 300px;
        margin: auto;
      }

      #login-form input[type="text"],
      #login-form input[type="password"] {
        background-color: #fff9b0; /* amarelo claro */
        color: #5e3366; /* roxo escuro */
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
        background-color: #ab84a2; /* amarelo claro */
        color: #fff; /* roxo escuro */
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

      #login-form + p {
        text-align: center;
      }

      .textoBacana1 {
        font-family: arial black;
        color: #fff;
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

      <div class='centro'>
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

  // Lógica de login
  const form = document.getElementById('login-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const cpf = form.cpf.value.trim();
    const tipoSelecionado = form.tipo.value;

    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const user = usuarios.find(u => u.nome === nome && u.cpf === cpf);

    if (!user) {
      alert('Usuário não encontrado.');
      return;
    }

    if (user.tipo !== tipoSelecionado) {
      alert('Tipo de usuário incorreto.');
      return;
    }

    localStorage.setItem('user', JSON.stringify(user));
    alert(`Bem-vindo(a), ${nome}!`);
    window.navigateTo(user.tipo === 'admin' ? 'admin' : 'books');
  };

  // Link para cadastro
  const registerLink = document.getElementById('go-register');
  registerLink.onclick = (e) => {
    e.preventDefault();
    window.navigateTo('register');
  };
}
