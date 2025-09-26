import folhaLogin from '../images/folhaLogin.png';
import logo_librain_T from '../images/logo_librain_T.png';
import IMask from 'imask';
import { navigateTo } from '../main.js';

// Validação oficial do CPF
function validarCPF(cpf) {
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

// Validação de senha forte
function validarSenha(senha) {
    return senha.length >= 8;
}

// Função para injetar o CSS no <head> uma única vez
function injectCSS() {
    if (document.getElementById('user-registration-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'user-registration-styles';
    style.innerHTML = `
        .containerCadastro {
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
            text-align: center;
        }
        
        .registration-form {
            margin-top: 0px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            max-width: 300px;
            margin: auto;
        }
        
        .registration-form input[type="text"],
        .registration-form input[type="password"],
        .registration-form input[type="date"],
        .registration-form input[type="email"],
        .registration-form select {
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
        
        .registration-form input::placeholder {
            color: #434E70;
            opacity: 0.7;
        }
        
        .registration-form button {
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
        }
        
        .registration-form button:hover {
            background-color: #8aa3f0;
        }
        
        .btn-voltar {
            background-color: #6c757d !important;
            margin-top: 10px;
        }
        
        .btn-voltar:hover {
            background-color: #5a6268 !important;
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
        
        a:link, a:visited {
            color: #fff;
            text-decoration: none;
        }
        
        .step-indicator {
            text-align: center;
            color: #fff;
            font-family: arial black;
            font-size: 14px;
            margin-bottom: 20px;
        }
        
        .step-indicator .step {
            display: inline-block;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #6c757d;
            color: white;
            line-height: 30px;
            margin: 0 10px;
        }
        
        .step-indicator .step.active {
            background-color: #9bb4ff;
        }
        
        .step-indicator .step.completed {
            background-color: #28a745;
        }
    `;
    document.head.appendChild(style);
}

export function renderUserRegistration(container) {
    injectCSS();

    container.innerHTML = `
        <div class='containerCadastro centro' style="background-image: url('${folhaLogin}');">
            <img src="${logo_librain_T}" alt="Logo" height='200px' width='200px'>
        </div>

        <div class='centro'>
            <p class='cadastro'>Cadastro</p>
        </div>

        <div class="step-indicator">
            <span class="step active">1</span>
            <span class="step">2</span>
        </div>

        <form class="registration-form" id="registration-step1" novalidate>
            <input id="nome" type="text" name="nome" placeholder="Nome Completo" required />
            <div id="error-nome" class="error-message"></div>

            <input id="cpf" type="text" name="cpf" placeholder="CPF" required />
            <div id="error-cpf" class="error-message"></div>

            <input id="senha" type="password" name="senha" placeholder="Crie uma senha (min. 8 caracteres)" required />
            <div id="error-senha" class="error-message"></div>

            <input id="data_nascimento" type="date" name="data_nascimento" required />
            <div id="error-data_nascimento" class="error-message"></div>

            <button type="submit">Continuar</button>
        </form>

        <div class='conta'>
            <p>Já possui uma conta?<a href="#" id="go-login" style='margin-left: 5px; color: #9bb4ff;'>Entre</a></p>
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

    formStep1.onsubmit = async (e) => {
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
        
        // Verificar se CPF já existe
        try {
            const checkCpfResponse = await fetch(`http://localhost:3000/api/check-cpf/${cpf}`, {
                credentials: 'include'
            });
            const checkCpfResult = await checkCpfResponse.json();

            if (checkCpfResult.exists) {
                document.getElementById('error-cpf').textContent = 'CPF já cadastrado.';
                return;
            }
        } catch (error) {
            console.error('Erro ao verificar CPF:', error);
            alert('Erro ao verificar CPF. Tente novamente.');
            return;
        }

        renderUserRegistrationStep2(container, { nome, cpf, senha, data_nascimento });
    };
}

function renderUserRegistrationStep2(container, step1Data) {
    container.innerHTML = `
        <div class='containerCadastro centro' style="background-image: url('${folhaLogin}');">
            <img src="${logo_librain_T}" alt="Logo" height='200px' width='200px'>
        </div>

        <div class='centro'>
            <p class='cadastro'>Cadastro</p>
        </div>

        <div class="step-indicator">
            <span class="step completed">1</span>
            <span class="step active">2</span>
        </div>

        <form class="registration-form" id="registration-step2" novalidate>
            <input id="email" type="email" name="email" placeholder="E-mail" required />
            <div id="error-email" class="error-message"></div>

            <select id="genero" name="genero" required>
                <option value="">Selecione seu gênero</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="nao_informar">Prefiro não informar</option>
            </select>
            <div id="error-genero" class="error-message"></div>

            <input id="cidade" type="text" name="cidade" placeholder="Cidade" required />
            <div id="error-cidade" class="error-message"></div>

            <input id="estado" type="text" name="estado" placeholder="Estado (ex: SP)" maxlength="2" required />
            <div id="error-estado" class="error-message"></div>

            <button type="submit">Finalizar Cadastro</button>
            <button type="button" class="btn-voltar" id="btn-voltar">Voltar</button>
        </form>
    `;

    const formStep2 = document.getElementById('registration-step2');
    const btnVoltar = document.getElementById('btn-voltar');

    btnVoltar.onclick = () => {
        renderUserRegistration(container);
    };

    // Converter estado para maiúsculas
    const estadoInput = document.getElementById('estado');
    estadoInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    formStep2.onsubmit = async (e) => {
        e.preventDefault();

        // Limpar erros anteriores
        ['email', 'genero', 'cidade', 'estado'].forEach(field => {
            document.getElementById('error-' + field).textContent = '';
        });

        const email = document.getElementById('email').value.trim();
        const genero = document.getElementById('genero').value;
        const cidade = document.getElementById('cidade').value.trim();
        const estado = document.getElementById('estado').value.trim();

        let hasError = false;

        // Validações
        if (!email.match(/^\S+@\S+\.\S+$/)) {
            document.getElementById('error-email').textContent = 'E-mail inválido.';
            hasError = true;
        }

        if (!genero) {
            document.getElementById('error-genero').textContent = 'Selecione uma opção.';
            hasError = true;
        }

        if (cidade.length < 2) {
            document.getElementById('error-cidade').textContent = 'Cidade deve ter pelo menos 2 caracteres.';
            hasError = true;
        }

        if (estado.length !== 2) {
            document.getElementById('error-estado').textContent = 'Estado deve ter 2 caracteres (ex: SP).';
            hasError = true;
        }

        if (hasError) return;

        // Dados finais para envio
        const finalData = {
            ...step1Data,
            tipo: 'leitor',
            email,
            genero,
            cidade,
            estado,
            // Campos opcionais com valores padrão
            tel_residencial: null,
            tel_comercial: null,
            identidade: null,
            endereco: null,
            numero: null,
            complemento: null,
            cep: null
        };

        console.log('Dados do cadastro:', finalData);

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(finalData)
            });
        
            if (!response.ok) {
                let errorMessage = 'Erro desconhecido no cadastro.';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (jsonError) {
                    errorMessage = await response.text();
                }
                alert(errorMessage);
                return;
            }
        
            const result = await response.json();
            alert(result.message || 'Cadastro realizado com sucesso!');
            navigateTo('login');
        
        } catch (networkError) {
            console.error('Erro de rede ou de conexão:', networkError);
            alert('Erro de rede ou de conexão. Por favor, tente novamente.');
        }
    };
}