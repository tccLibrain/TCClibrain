const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');

const app = express();

app.use(express.json());

// Configuração do CORS
app.use(cors({
    origin: 'http://localhost:5173', 
    credentials: true
}));

// Configuração da sessão
app.use(session({
    secret: 'chave_secreta_muito_segura',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Configuração do banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'aluno123',
    database: 'librain'
};

// Middleware para verificar autenticação
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).send('Não autorizado');
    }
};

// Conexão e sincronização - REMOVIDO PARA EVITAR CONFLITO COM SUA ESTRUTURA SQL
// A melhor prática é criar as tabelas com o SQL que você já tem, fora do código.
async function connectDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Conectado ao banco de dados MySQL.');
        return connection;
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error.message);
        process.exit(1);
    }
}

// Rotas da API

app.get('/api/check-cpf/:cpf', async (req, res) => {
    const { cpf } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT 1 FROM usuarios WHERE cpf = ?', [cpf]);
        if (rows.length > 0) {
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error('Erro ao verificar CPF:', error);
        res.status(500).send('Erro interno do servidor.');
    } finally {
        if (connection) connection.end();
    }
});

app.post('/api/login', async (req, res) => {
    const { cpf, senha, tipo } = req.body;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?', [cpf, tipo]);
        
        if (rows.length === 0) {
            return res.status(404).send('Usuário não encontrado');
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(senha, user.senha_hash); // CORRIGIDO: usando 'senha_hash'
        
        if (isMatch) {
            req.session.user = { id: user.id, nome: user.nome, tipo: user.tipo, cpf: user.cpf, email: user.email };
            res.status(200).json({ message: 'Login bem-sucedido', nome: user.nome, tipo: user.tipo });
        } else {
            res.status(401).send('Senha incorreta');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).send('Erro interno do servidor');
    } finally {
        if (connection) connection.end();
    }
});

app.post('/api/register', async (req, res) => {
    const { 
        nome, cpf, email, senha, tipo, genero, tel_residencial, tel_comercial, 
        identidade, endereco, numero, complemento, cep, cidade, estado, data_nascimento
    } = req.body;
    
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // AQUI ESTÁ A CORREÇÃO: Usando ?? null para tratar campos opcionais
        const params = [
            nome ?? null,
            cpf ?? null,
            email ?? null,
            senha_hash,
            tipo ?? null,
            genero ?? null,
            tel_residencial ?? null,
            tel_comercial ?? null,
            identidade ?? null,
            endereco ?? null,
            numero ?? null,
            complemento ?? null,
            cep ?? null,
            cidade ?? null,
            estado ?? null,
            data_nascimento ?? null
        ];

        const [result] = await connection.execute(
            'INSERT INTO usuarios (nome, cpf, email, senha_hash, tipo, genero, tel_residencial, tel_comercial, identidade, endereco, numero, complemento, cep, cidade, estado, data_nascimento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            params
        );
        
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!', userId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).send('CPF ou e-mail já cadastrado.');
        } else {
            console.error('Erro no cadastro:', error);
            res.status(500).send('Erro interno do servidor');
        }
    } finally {
        if (connection) connection.end();
    }
});

app.get('/api/profile', isAuthenticated, (req, res) => {
    res.json(req.session.user);
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Erro ao fazer logout.');
        }
        res.clearCookie('connect.sid'); 
        res.status(200).send('Logout bem-sucedido.');
    });
});

app.get('/api/books', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM livros');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        res.status(500).send('Erro interno do servidor.');
    } finally {
        if (connection) connection.end();
    }
});

app.get('/api/books/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SELECT * FROM livros WHERE id = ?', [id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).send('Livro não encontrado.');
        }
    } catch (error) {
        console.error('Erro ao buscar livro:', error);
        res.status(500).send('Erro interno do servidor.');
    } finally {
        if (connection) connection.end();
    }
});

// As rotas de empréstimo (loan) precisam ser totalmente reescritas para
// usar a nova tabela `emprestimos` em vez da coluna `emprestadoPara`.
// O código atual não vai funcionar com a sua nova estrutura.

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
connectDB().then(connection => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Falha ao iniciar o servidor:', err);
});