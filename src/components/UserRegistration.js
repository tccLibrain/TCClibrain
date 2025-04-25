import folhaLogin from '../images/folhaLogin.png';
import logo_librain_Transparente from '../images/logo_librain_Transparente.png';

export function renderUserRegistration(container) {
  container.innerHTML = `
    <style>
      .containerLogin {
        background-image: url('${folhaLogin}');
        repeat: no-repeat;
        display: flex;
        width: 100%;
        height: 280px;
    }
      
      .containerCadastro img {
        margin-top: 22px;
    }
      
      .cadastro {
        margin-top: 40px;
        color: #fff;
        font-family: arial black;
        font-size: 220%;
    }
      
      .centro {
      display: flex;
      justify-content: center;
    }
    </style>

    <div class='containerCadastro centro'>
        <img src="${logo_librain_Transparente}" alt="Logo" height='200px' width='200px'>
    </div>

    <!-- cadastro etapa 1 -->
    <div class ='centro'>
      <p class='cadastro'>Cadastro</p>
      </div>

    <h1>Cadastro</h1>
    <form id="registration-step1">
      <input type="text" name="nome" placeholder="Nome" required />
      
      <label>Tipo de Usuário:</label>
      <label><input type="radio" name="tipo" value="leitor" checked /> Leitor</label>
      <label><input type="radio" name="tipo" value="admin" /> Administrador</label>
      <h4> DATA DE NaSCIMENTO </h4>
 <input type="date" name="data_nascimento" placeholder="Data de Nascimento" required />
      <label>Foto:</label>
      <input type="file" name="foto" accept="image/*"  />

      <button type="submit">Continuar</button>
    </form>
    <button onclick="navigateTo('login')">Voltar ao Login</button>
  `;

  const formStep1 = document.getElementById('registration-step1');
  formStep1.onsubmit = (e) => {
    e.preventDefault();
    const step1Data = Object.fromEntries(new FormData(formStep1));
    renderUserRegistrationStep2(container, step1Data);
  };
}

function renderUserRegistrationStep2(container, step1Data) {
  container.innerHTML = `
    <h1>Cadastro - Etapa 2</h1>
    <form id="registration-step2">
      <input type="email" name="email" placeholder="Email" required />

      <label>Gênero:</label>
      <select name="genero" required>
        <option value="feminino">Feminino</option>
        <option value="masculino">Masculino</option>
        <option value="nao_informar">Prefiro não informar</option>
      </select>

      <input type="text" name="tel_residencial" placeholder="Telefone Residencial" required />
      <input type="text" name="tel_comercial" placeholder="Telefone Comercial" required />
      <input type="text" name="identidade" placeholder="Identidade" required />
      <input type="text" name="cpf" placeholder="CPF" required />
      <input type="text" name="endereco" placeholder="Endereço" required />
      <input type="text" name="numero" placeholder="Número" required />
      <input type="text" name="complemento" placeholder="Complemento" />
      <input type="text" name="cep" placeholder="CEP" required />
      <input type="text" name="cidade" placeholder="Cidade" required />
      <input type="text" name="estado" placeholder="Estado" required />
     

      <button type="submit">Cadastrar</button>
    </form>
    <button onclick="renderUserRegistration(document.querySelector('#app'))">Voltar</button>
  `;

  const formStep2 = document.getElementById('registration-step2');
  formStep2.onsubmit = (e) => {
    e.preventDefault();
    const step2Data = Object.fromEntries(new FormData(formStep2));
    const finalData = { ...step1Data, ...step2Data };

    const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    usuarios.push(finalData);
    localStorage.setItem('usuarios', JSON.stringify(usuarios));

    alert('Cadastro realizado com sucesso!');
    navigateTo('login');
  };
}
