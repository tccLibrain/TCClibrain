// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs'); // Biblioteca para criptografar senhas

const app = express();
const port = 3000;

// Middleware para analisar o corpo das requisições JSON
app.use(express.json());

// Middleware para habilitar o CORS, permitindo requisições do seu frontend
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    next();
});

// Configurações de conexão com o banco de dados
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'librain'
};

const connection = mysql.createConnection(dbConfig);

// Testa a conexão com o banco de dados
connection.connect(err => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
});

// Rota para cadastro de usuário
app.post('/api/register', async (req, res) => {
    const { nome, cpf, senha, data_nascimento, email, genero, tel_residencial, tel_comercial, identidade, endereco, numero, complemento, cep, cidade, estado } = req.body;

    if (!cpf || !senha || !nome) {
        return res.status(400).send('Nome, CPF e senha são obrigatórios.');
    }

    try {
        // Verificar se o CPF já existe
        const [rows] = await connection.promise().query('SELECT cpf FROM usuarios WHERE cpf = ?', [cpf]);
        if (rows.length > 0) {
            return res.status(409).send('CPF já cadastrado.');
        }

        // Criptografar a senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // Inserir novo usuário no banco de dados
        const sql = `
            INSERT INTO usuarios (
                nome, cpf, senha_hash, data_nascimento, email, genero, 
                tel_residencial, tel_comercial, identidade, endereco, 
                numero, complemento, cep, cidade, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            nome, cpf, senha_hash, data_nascimento, email, genero,
            tel_residencial, tel_comercial, identidade, endereco,
            numero, complemento, cep, cidade, estado
        ];

        await connection.promise().query(sql, values);

        res.status(201).send('Usuário cadastrado com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).send('Erro interno do servidor.');
    }
});

// Rota de exemplo para testar se o servidor está funcionando
app.get('/', (req, res) => {
    res.send('Servidor Librain está funcionando!');
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});