import folhaLogin from '../images/folhaLogin.png';
import logo_librain_T from '../images/logo_librain_T.png';
import IMask from 'imask';
import { navigateTo } from '../main.js';

// Validação oficial do CPF
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.charAt(10));
}

// Validação telefone - exatamente 11 dígitos (DDD + número)
function validarTelefone(numero) {
  return numero.replace(/\D/g, '').length === 11;
}

// Validação de senha forte
function validarSenha(senha) {
  return senha.length >= 8;
}

export function renderUserRegistration(container) {
  container.innerHTML = `
    <style>
      .containerCadastro {
        background-image: url('${folhaLogin}');
        background-repeat: no-repeat;
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

      .error-message {
        color: #ff6b6b;
        font-size: 0.9rem;
        margin-top: -8px;
        margin-bottom: 8px;
      }

      #registration-step1 {
        margin-top: 0px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
        max-width: 300px;
        margin: auto;
      }

      #registration-step1 input[type="text"],
      #registration-step1 input[type="password"],
      #registration-step1 input[type="date"] {
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

      .input-estilizado::placeholder {
        color: #5e3366;
        opacity: 0.7;
      }

      #registration-step1 button {
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
    </style>

    <div class='containerCadastro centro'>
      <img src="${logo_librain_T}" alt="Logo" height='200px' width='200px'>
    </div>

    <div class='centro'>
      <p class='cadastro'>Cadastro</p>
    </div>

    <form id="registration-step1" novalidate>
      <input id="nome" type="text" name="nome" placeholder="Nome Completo" required />
      <div id="error-nome" class="error-message"></div>

      <input id="cpf" type="text" name="cpf" placeholder="CPF" required />
      <div id="error-cpf" class="error-message"></div>

      <input id="senha" type="password" name="senha" placeholder="Crie uma senha" required />
      <div id="error-senha" class="error-message"></div>

      <input id="data_nascimento" type="date" name="data_nascimento" required />
      <div id="error-data_nascimento" class="error-message"></div>

      <button type="submit">Continuar</button>
    </form>

    <div class='contaclasse'>
        <p class='conta'>Já possui uma conta?<a href="#" id="go-login" style='margin-left: 5px; color: #9bb4ff;'>Entre</a></p>
      </div>
  `;

  const linkLogin = document.getElementById('go-login');
  if (linkLogin) {
    linkLogin.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('login');
    });
  }

  IMask(document.getElementById('cpf'), {
    mask: '000.000.000-00',
  });

  const formStep1 = document.getElementById('registration-step1');

  formStep1.onsubmit = (e) => {
    e.preventDefault();

    ['nome', 'cpf', 'senha', 'data_nascimento'].forEach(field => {
      document.getElementById('error-' + field).textContent = '';
    });

    const nome = document.getElementById('nome').value.trim();
    let cpf = document.getElementById('cpf').value.trim();
    cpf = cpf.replace(/[^\d]+/g, '');
    const senha = document.getElementById('senha').value.trim();
    const data_nascimento = document.getElementById('data_nascimento').value.trim();

    let hasError = false;

    if (nome.length < 3) {
      document.getElementById('error-nome').textContent = 'Nome deve ter pelo menos 3 caracteres.';
      hasError = true;
    }

    if (!validarCPF(cpf)) {
      document.getElementById('error-cpf').textContent = 'CPF inválido.';
      hasError = true;
    } else {
      const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
      const cpfExistente = usuarios.find(user => user.cpf === cpf);
      if (cpfExistente) {
        document.getElementById('error-cpf').textContent = 'CPF já cadastrado.';
        hasError = true;
      }
    }

    if (!validarSenha(senha)) {
      document.getElementById('error-senha').textContent = 'Senha deve ter pelo menos 8 caracteres.';
      hasError = true;
    }

    if (!data_nascimento) {
      document.getElementById('error-data_nascimento').textContent = 'Data de nascimento é obrigatória.';
      hasError = true;
    }

    if (hasError) return;

    renderUserRegistrationStep2(container, { nome, cpf, senha, data_nascimento });
  };
}

function renderUserRegistrationStep2(container, step1Data) {
  container.innerHTML = `
    <style>
      form {
        max-width: 400px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        color: #fff;
        font-family: Arial, sans-serif;
      }
      label { font-weight: bold; }
      input, select {
        padding: 8px;
        border-radius: 8px;
        border: none;
        font-size: 1rem;
      }
      .error-message {
        color: #ff6b6b;
        font-size: 0.9rem;
        margin-top: -8px;
        margin-bottom: 8px;
      }
      button {
        background-color: #ab84a2;
        color: white;
        border: none;
        border-radius: 999px;
        padding: 12px 20px;
        font-family: arial black;
        font-size: 16px;
        cursor: pointer;
      }
      #btn-voltar {
        background-color: #9bb4ff;
        margin-top: 10px;
      }
    </style>

    <h1>Cadastro - Etapa 2</h1>
    <form id="registration-step2" novalidate>
      <label for="email">Email</label>
      <input id="email" type="email" name="email" placeholder="exemplo@dominio.com" required />
      <div id="error-email" class="error-message"></div>

      <label for="genero">Gênero</label>
      <select id="genero" name="genero" required>
        <option value="">Selecione</option>
        <option value="feminino">Feminino</option>
        <option value="masculino">Masculino</option>
        <option value="nao_informar">Prefiro não informar</option>
      </select>
      <div id="error-genero" class="error-message"></div>

      <!-- Outros campos -->
      <label for="tel_residencial">Telefone Residencial</label>
      <input id="tel_residencial" type="tel" name="tel_residencial" placeholder="(00) 00000-0000" required />
      <div id="error-tel_residencial" class="error-message"></div>

      <label for="tel_comercial">Telefone Comercial</label>
      <input id="tel_comercial" type="tel" name="tel_comercial" placeholder="(00) 00000-0000" required />
      <div id="error-tel_comercial" class="error-message"></div>

      <label for="identidade">Identidade</label>
      <input id="identidade" type="text" name="identidade" placeholder="Identidade" required />
      <div id="error-identidade" class="error-message"></div>

      <label for="endereco">Endereço</label>
      <input id="endereco" type="text" name="endereco" placeholder="Endereço" required />
      <div id="error-endereco" class="error-message"></div>

      <label for="numero">Número</label>
      <input id="numero" type="text" name="numero" placeholder="Número" required />
      <div id="error-numero" class="error-message"></div>

      <label for="cep">CEP</label>
      <input id="cep" type="text" name="cep" placeholder="00000-000" required />
      <div id="error-cep" class="error-message"></div>

      <label for="cidade">Cidade</label>
      <input id="cidade" type="text" name="cidade" placeholder="Cidade" required />
      <div id="error-cidade" class="error-message"></div>

      <label for="estado">Estado</label>
      <input id="estado" type="text" name="estado" placeholder="Estado" required />
      <div id="error-estado" class="error-message"></div>

      <button type="submit">Finalizar Cadastro</button>
      <button type="button" id="btn-voltar">Voltar</button>
    </form>
  `;

  IMask(document.getElementById('tel_residencial'), { mask: '(00) 00000-0000' });
  IMask(document.getElementById('tel_comercial'), { mask: '(00) 00000-0000' });
  IMask(document.getElementById('cep'), { mask: '00000-000' });

  const formStep2 = document.getElementById('registration-step2');
  const btnVoltar = document.getElementById('btn-voltar');

  btnVoltar.onclick = () => {
    renderUserRegistration(container);
  };

  formStep2.onsubmit = (e) => {
    e.preventDefault();

    ['email','genero','tel_residencial','tel_comercial','identidade','endereco','numero','cep','cidade','estado']
      .forEach(field => document.getElementById('error-' + field).textContent = '');

    const email = document.getElementById('email').value.trim();
    const genero = document.getElementById('genero').value;
    const tel_residencial = document.getElementById('tel_residencial').value.trim();
    const tel_comercial = document.getElementById('tel_comercial').value.trim();
    const identidade = document.getElementById('identidade').value.trim();
    const endereco = document.getElementById('endereco').value.trim();
    const numero = document.getElementById('numero').value.trim();
    const cep = document.getElementById('cep').value.trim();
    const cidade = document.getElementById('cidade').value.trim();
    const estado = document.getElementById('estado').value.trim();

    let hasError = false;

    if (!email.match(/^\S+@\S+\.\S+$/)) {
      document.getElementById('error-email').textContent = 'Email inválido.';
      hasError = true;
    }

    if (!genero) {
      document.getElementById('error-genero').textContent = 'Selecione uma opção.';
      hasError = true;
    }

    if (!validarTelefone(tel_residencial)) {
      document.getElementById('error-tel_residencial').textContent = 'Telefone inválido.';
      hasError = true;
    }

    if (!validarTelefone(tel_comercial)) {
      document.getElementById('error-tel_comercial').textContent = 'Telefone inválido.';
      hasError = true;
    }

    if (identidade.length < 3) {
      document.getElementById('error-identidade').textContent = 'Identidade inválida.';
      hasError = true;
    }

    if (endereco.length < 3) {
      document.getElementById('error-endereco').textContent = 'Endereço inválido.';
      hasError = true;
    }

    if (!numero) {
      document.getElementById('error-numero').textContent = 'Número inválido.';
      hasError = true;
    }

    if (cep.replace(/[^\d]/g, '').length !== 8) {
      document.getElementById('error-cep').textContent = 'CEP inválido.';
      hasError = true;
    }

    if (cidade.length < 3) {
      document.getElementById('error-cidade').textContent = 'Cidade inválida.';
      hasError = true;
    }

    if (estado.length < 2) {
      document.getElementById('error-estado').textContent = 'Estado inválido.';
      hasError = true;
    }

    if (hasError) return;

    const finalData = {
      ...step1Data,
      tipo: 'leitor',
      email,
      genero,
      tel_residencial,
      tel_comercial,
      identidade,
      endereco,
      numero,
      cep: cep.replace('-', ''),
      cidade,
      estado
    };

    const apiUrl = 'http://localhost:3000/api/register';

    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text) });
        }
        return response.text();
    })
    .then(message => {
        alert(message);
        navigateTo('login');
    })
    .catch(error => {
        console.error('Erro de cadastro:', error);
        alert(error.message);
    });
  }
}
