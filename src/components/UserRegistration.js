import folhaLogin from '../images/folhaLogin.png';
import logo_librain_T from '../images/logo_librain_T.png';
import IMask from 'imask';
import { navigateTo } from '../main.js';

// Lista completa de estados brasileiros
const ESTADOS_BRASILEIROS = [
    { sigla: 'AC', nome: 'Acre' },
    { sigla: 'AL', nome: 'Alagoas' },
    { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' },
    { sigla: 'BA', nome: 'Bahia' },
    { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' },
    { sigla: 'ES', nome: 'Espírito Santo' },
    { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' },
    { sigla: 'MT', nome: 'Mato Grosso' },
    { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' },
    { sigla: 'PA', nome: 'Pará' },
    { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' },
    { sigla: 'PE', nome: 'Pernambuco' },
    { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' },
    { sigla: 'RN', nome: 'Rio Grande do Norte' },
    { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' },
    { sigla: 'RR', nome: 'Roraima' },
    { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' },
    { sigla: 'SE', nome: 'Sergipe' },
    { sigla: 'TO', nome: 'Tocantins' }
];

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

// Validação de email
function validarEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
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
            font-size: 0.85rem;
            margin-top: -8px;
            margin-bottom: 8px;
            text-align: center;
            font-weight: normal;
        }
        
        .success-message {
            color: #51cf66;
            font-size: 0.85rem;
            margin-top: -8px;
            margin-bottom: 8px;
            text-align: center;
            font-weight: normal;
        }
        
        .registration-form {
            margin-top: 0px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
            max-width: 320px;
            margin: auto;
            padding: 0 20px;
        }
        
        .registration-form input[type="text"],
        .registration-form input[type="password"],
        .registration-form input[type="date"],
        .registration-form input[type="email"],
        .registration-form select {
            background-color: #CFD2DB;
            color: #434E70;
            border: 2px solid transparent;
            border-radius: 999px;
            padding: 10px 18px;
            font-family: arial black;
            font-size: 14px;
            text-align: center;
            outline: none;
            margin-bottom: 10px;
            width: 100%;
            max-width: 280px;
            margin-left: auto;
            margin-right: auto;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }
        
        .registration-form input:focus,
        .registration-form select:focus {
            border-color: #9bb4ff;
            background-color: #e8ebf0;
            transform: scale(1.02);
        }
        
        .registration-form input.error,
        .registration-form select.error {
            border-color: #ff6b6b;
            animation: shake 0.3s;
        }
        
        .registration-form input.valid,
        .registration-form select.valid {
            border-color: #51cf66;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .registration-form input::placeholder {
            color: #434E70;
            opacity: 0.7;
        }
        
        .registration-form select {
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23434E70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 15px center;
            background-size: 20px;
            padding-right: 45px;
        }
        
        .registration-form button {
            background-color: #9bb4ff;
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 12px 20px;
            font-family: arial black;
            font-size: 14px;
            text-align: center;
            outline: none;
            margin-bottom: 10px;
            width: 100%;
            max-width: 280px;
            margin-left: auto;
            margin-right: auto;
            box-sizing: border-box;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .registration-form button:hover {
            background-color: #8aa3f0;
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        
        .registration-form button:active {
            transform: translateY(0);
        }
        
        .registration-form button:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
            opacity: 0.6;
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
            margin-top: 30px;
            margin-bottom: 30px;
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
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background-color: #6c757d;
            color: white;
            line-height: 35px;
            margin: 0 10px;
            transition: all 0.3s ease;
            font-weight: bold;
        }
        
        .step-indicator .step.active {
            background-color: #9bb4ff;
            transform: scale(1.15);
            box-shadow: 0 4px 8px rgba(155, 180, 255, 0.4);
        }
        
        .step-indicator .step.completed {
            background-color: #51cf66;
        }
        
        .password-strength {
            height: 4px;
            background-color: #ddd;
            border-radius: 2px;
            margin-top: -5px;
            margin-bottom: 10px;
            overflow: hidden;
            max-width: 280px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .password-strength-bar {
            height: 100%;
            transition: all 0.3s ease;
            width: 0;
        }
        
        .password-strength-bar.weak {
            width: 33%;
            background-color: #ff6b6b;
        }
        
        .password-strength-bar.medium {
            width: 66%;
            background-color: #ffd93d;
        }
        
        .password-strength-bar.strong {
            width: 100%;
            background-color: #51cf66;
        }
        
        .form-hint {
            font-size: 0.75rem;
            color: #ccc;
            text-align: center;
            margin-top: -8px;
            margin-bottom: 8px;
        }
        
        @media (max-width: 480px) {
            .registration-form {
                max-width: 100%;
                padding: 0 15px;
            }
            
            .registration-form input[type="text"],
            .registration-form input[type="password"],
            .registration-form input[type="date"],
            .registration-form input[type="email"],
            .registration-form select,
            .registration-form button {
                max-width: 100%;
            }
            
            .password-strength {
                max-width: 100%;
            }
            
            .cadastro {
                font-size: 180%;
            }
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
            <div class="password-strength">
                <div id="password-strength-bar" class="password-strength-bar"></div>
            </div>
            <div id="error-senha" class="error-message"></div>

            <input id="data_nascimento" type="date" name="data_nascimento" required />
            <div class="form-hint">Data de Nascimento</div>
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

    // Máscara de CPF
    IMask(document.getElementById('cpf'), {
        mask: '000.000.000-00',
    });

    // Indicador de força da senha
    const senhaInput = document.getElementById('senha');
    const strengthBar = document.getElementById('password-strength-bar');
    
    senhaInput.addEventListener('input', (e) => {
        const senha = e.target.value;
        strengthBar.className = 'password-strength-bar';
        
        if (senha.length === 0) {
            strengthBar.style.width = '0';
        } else if (senha.length < 6) {
            strengthBar.classList.add('weak');
        } else if (senha.length < 10) {
            strengthBar.classList.add('medium');
        } else {
            strengthBar.classList.add('strong');
        }
    });

    const formStep1 = document.getElementById('registration-step1');

    // Validação em tempo real
    const setupRealTimeValidation = (inputId, validationFn, errorMsg) => {
        const input = document.getElementById(inputId);
        const errorDiv = document.getElementById('error-' + inputId);
        
        input.addEventListener('blur', () => {
            const value = input.value.trim();
            if (value && !validationFn(value)) {
                input.classList.add('error');
                input.classList.remove('valid');
                errorDiv.textContent = errorMsg;
            } else if (value) {
                input.classList.remove('error');
                input.classList.add('valid');
                errorDiv.textContent = '';
            }
        });
        
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) {
                input.classList.remove('error');
                errorDiv.textContent = '';
            }
        });
    };

    setupRealTimeValidation('nome', (val) => val.length >= 3, 'Nome deve ter pelo menos 3 caracteres');
    setupRealTimeValidation('cpf', (val) => validarCPF(val.replace(/[^\d]+/g, '')), 'CPF inválido');
    setupRealTimeValidation('senha', validarSenha, 'Senha deve ter pelo menos 8 caracteres');

    formStep1.onsubmit = async (e) => {
        e.preventDefault();
        console.log('Formulário step 1 enviado');

        ['nome', 'cpf', 'senha', 'data_nascimento'].forEach(field => {
            const errorDiv = document.getElementById('error-' + field);
            if (errorDiv) errorDiv.textContent = '';
            const input = document.getElementById(field);
            if (input) input.classList.remove('error');
        });

        const nomeInput = document.getElementById('nome');
        const cpfInput = document.getElementById('cpf');
        const senhaInput = document.getElementById('senha');
        const dataNascInput = document.getElementById('data_nascimento');

        if (!nomeInput || !cpfInput || !senhaInput || !dataNascInput) {
            console.error('Campos do formulário não encontrados');
            return;
        }

        const nome = nomeInput.value.trim();
        let cpf = cpfInput.value.trim();
        cpf = cpf.replace(/[^\d]/g, '');
        const senha = senhaInput.value.trim();
        const data_nascimento = dataNascInput.value.trim();

        console.log('Dados coletados:', { nome, cpf: cpf.length, senha: senha.length, data_nascimento });

        let hasError = false;

        if (nome.length < 3) {
            nomeInput.classList.add('error');
            document.getElementById('error-nome').textContent = 'Nome deve ter pelo menos 3 caracteres.';
            hasError = true;
        }

        if (!validarCPF(cpf)) {
            cpfInput.classList.add('error');
            document.getElementById('error-cpf').textContent = 'CPF inválido.';
            hasError = true;
        }

        if (!validarSenha(senha)) {
            senhaInput.classList.add('error');
            document.getElementById('error-senha').textContent = 'Senha deve ter pelo menos 8 caracteres.';
            hasError = true;
        }

        if (!data_nascimento) {
            dataNascInput.classList.add('error');
            document.getElementById('error-data_nascimento').textContent = 'Data de nascimento é obrigatória.';
            hasError = true;
        } else {
            // Validar idade mínima (13 anos)
            const dataNasc = new Date(data_nascimento);
            const hoje = new Date();
            let idade = hoje.getFullYear() - dataNasc.getFullYear();
            const m = hoje.getMonth() - dataNasc.getMonth();
            
            if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
                idade--;
            }
            
            if (idade < 13) {
                dataNascInput.classList.add('error');
                document.getElementById('error-data_nascimento').textContent = 'Você deve ter pelo menos 13 anos.';
                hasError = true;
            }
        }

        if (hasError) {
            console.log('Erros de validação encontrados');
            return;
        }
        
        console.log('Validação passou, verificando CPF...');
        
        // Verificar se CPF já existe
        try {
            const checkCpfResponse = await fetch(`http://localhost:3000/api/check-cpf/${cpf}`, {
                credentials: 'include'
            });
            const checkCpfResult = await checkCpfResponse.json();

            if (checkCpfResult.exists) {
                cpfInput.classList.add('error');
                document.getElementById('error-cpf').textContent = 'CPF já cadastrado.';
                return;
            }
            
            console.log('CPF disponível, indo para step 2');
        } catch (error) {
            console.error('Erro ao verificar CPF:', error);
            alert('Erro ao verificar CPF. Tente novamente.');
            return;
        }

        // Se chegou aqui, está tudo OK - ir para step 2
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
            <span class="step completed">✓</span>
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

            <select id="estado" name="estado" required>
                <option value="">Selecione seu estado</option>
                ${ESTADOS_BRASILEIROS.map(estado => 
                    `<option value="${estado.sigla}">${estado.sigla} - ${estado.nome}</option>`
                ).join('')}
            </select>
            <div id="error-estado" class="error-message"></div>

            <button type="submit" id="btn-finalizar">Finalizar Cadastro</button>
            <button type="button" class="btn-voltar" id="btn-voltar">Voltar</button>
        </form>
    `;

    const formStep2 = document.getElementById('registration-step2');
    const btnVoltar = document.getElementById('btn-voltar');

    btnVoltar.onclick = () => {
        renderUserRegistration(container);
    };

    // Validação em tempo real para email
    const emailInput = document.getElementById('email');
    const errorEmail = document.getElementById('error-email');
    
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !validarEmail(email)) {
            emailInput.classList.add('error');
            errorEmail.textContent = 'E-mail inválido.';
        } else if (email) {
            emailInput.classList.remove('error');
            emailInput.classList.add('valid');
            errorEmail.textContent = '';
        }
    });

    formStep2.onsubmit = async (e) => {
        e.preventDefault();

        // Limpar erros anteriores
        ['email', 'genero', 'cidade', 'estado'].forEach(field => {
            document.getElementById('error-' + field).textContent = '';
            document.getElementById(field).classList.remove('error');
        });

        const email = document.getElementById('email').value.trim();
        const genero = document.getElementById('genero').value;
        const cidade = document.getElementById('cidade').value.trim();
        const estado = document.getElementById('estado').value;

        let hasError = false;

        // Validações
        if (!validarEmail(email)) {
            document.getElementById('email').classList.add('error');
            document.getElementById('error-email').textContent = 'E-mail inválido.';
            hasError = true;
        }

        if (!genero) {
            document.getElementById('genero').classList.add('error');
            document.getElementById('error-genero').textContent = 'Selecione uma opção.';
            hasError = true;
        }

        if (cidade.length < 2) {
            document.getElementById('cidade').classList.add('error');
            document.getElementById('error-cidade').textContent = 'Cidade deve ter pelo menos 2 caracteres.';
            hasError = true;
        }

        if (!estado) {
            document.getElementById('estado').classList.add('error');
            document.getElementById('error-estado').textContent = 'Selecione um estado.';
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
            tel_residencial: null,
            tel_comercial: null,
            identidade: null,
            endereco: null,
            numero: null,
            complemento: null,
            cep: null
        };

        console.log('Dados do cadastro:', finalData);

        const btnFinalizar = document.getElementById('btn-finalizar');
        btnFinalizar.disabled = true;
        btnFinalizar.textContent = 'Cadastrando...';

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
            alert(result.message || 'Cadastro realizado com sucesso! Bem-vindo ao Librain!');
            navigateTo('login');
        
        } catch (networkError) {
            console.error('Erro de rede ou de conexão:', networkError);
            alert('Erro de rede ou de conexão. Por favor, tente novamente.');
        } finally {
            btnFinalizar.disabled = false;
            btnFinalizar.textContent = 'Finalizar Cadastro';
        }
    };
}