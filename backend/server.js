const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configuração do CORS para permitir que o frontend envie cookies de sessão
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Configuração da sessão para autenticação
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_secreta_muito_segura',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Use 'true' em produção com HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configuração do banco de dados usando variáveis de ambiente
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'librain'
};

// Cria um pool de conexões para melhor desempenho
let pool;
async function createPool() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Pool de conexões MySQL criado.');
    } catch (error) {
        console.error('Erro ao criar o pool de conexões:', error.message);
        process.exit(1);
    }
}

// Middleware para verificar a autenticação do usuário
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).send('Não autorizado. Por favor, faça login.');
    }
};

// Função auxiliar para limpar CPF
const cleanCPF = (cpf) => {
    if (!cpf) return null;
    return cpf.toString().replace(/[^\d]/g, '');
};

// ================================
// ROTAS EXISTENTES (mantidas)
// ================================

app.get('/api/check-cpf/:cpf', async (req, res) => {
    const { cpf } = req.params;
    
    if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório' });
    }
    
    const cpfLimpo = cleanCPF(cpf);
    
    if (!cpfLimpo) {
        return res.status(400).json({ error: 'CPF inválido' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT 1 FROM usuarios WHERE cpf = ?', [cpfLimpo]);
        res.json({ exists: rows.length > 0 });
    } catch (error) {
        console.error('Erro ao verificar CPF:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { cpf, senha } = req.body;
        
        if (!cpf || !senha) {
            return res.status(400).json({ 
                error: 'CPF e senha são obrigatórios',
                details: { cpf: !cpf, senha: !senha }
            });
        }
        
        if (typeof cpf !== 'string' || typeof senha !== 'string') {
            return res.status(400).json({ 
                error: 'CPF e senha devem ser strings válidas' 
            });
        }
        
        const cpfLimpo = cleanCPF(cpf);
        
        if (!cpfLimpo || cpfLimpo.length !== 11) {
            return res.status(400).json({ 
                error: 'CPF deve ter 11 dígitos válidos' 
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            
            console.log('Tentativa de login com CPF:', cpfLimpo);
            
            const [rows] = await connection.execute(
                'SELECT * FROM usuarios WHERE cpf = ?', 
                [cpfLimpo]
            );

            if (rows.length === 0) {
                return res.status(404).json({ 
                    error: 'Usuário não encontrado' 
                });
            }

            const user = rows[0];
            const isMatch = await bcrypt.compare(senha, user.senha_hash);

            if (isMatch) {
                req.session.user = { 
                    id: user.id, 
                    nome: user.nome, 
                    tipo: user.tipo, 
                    cpf: user.cpf, 
                    email: user.email 
                };
                
                console.log('Login bem-sucedido para:', user.nome);
                res.status(200).json({ 
                    message: 'Login bem-sucedido!', 
                    nome: user.nome, 
                    tipo: user.tipo 
                });
            } else {
                res.status(401).json({ 
                    error: 'Senha incorreta' 
                });
            }
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const {
            nome, cpf, email, senha, tipo, genero, tel_residencial, tel_comercial,
            identidade, endereco, numero, complemento, cep, cidade, estado, data_nascimento
        } = req.body;

        if (!nome || !cpf || !email || !senha) {
            return res.status(400).json({
                error: 'Nome, CPF, email e senha são obrigatórios'
            });
        }

        const cpfLimpo = cleanCPF(cpf);
        
        if (!cpfLimpo || cpfLimpo.length !== 11) {
            return res.status(400).json({
                error: 'CPF deve ter 11 dígitos válidos'
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();

            const [existingCpf] = await connection.execute(
                'SELECT id FROM usuarios WHERE cpf = ?', 
                [cpfLimpo]
            );
            
            if (existingCpf.length > 0) {
                return res.status(409).json({
                    error: 'CPF já cadastrado'
                });
            }

            const salt = await bcrypt.genSalt(10);
            const senha_hash = await bcrypt.hash(senha, salt);

            const params = [
                nome || null,
                cpfLimpo || null,
                email || null,
                senha_hash,
                tipo || 'leitor',
                genero || null,
                tel_residencial || null,
                tel_comercial || null,
                identidade || null,
                endereco || null,
                numero || null,
                complemento || null,
                cep || null,
                cidade || null,
                estado || null,
                data_nascimento || null
            ];

            const sql = `
                INSERT INTO usuarios (
                    nome, cpf, email, senha_hash, tipo, genero, tel_residencial, tel_comercial,
                    identidade, endereco, numero, complemento, cep, cidade, estado, data_nascimento
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.execute(sql, params);
            
            console.log('Usuário cadastrado com sucesso:', nome);
            res.status(201).json({ 
                message: 'Usuário cadastrado com sucesso!' 
            });

        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'CPF ou e-mail já cadastrado'
            });
        }
        res.status(500).json({
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/profile', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar favoritos do usuário
        const [favoritos] = await connection.execute(
            'SELECT bookId FROM favoritos WHERE cpf = ?', 
            [req.session.user.cpf]
        );
        
        const user = {
            ...req.session.user,
            favorites: favoritos.map(f => f.bookId)
        };
        
        res.json(user);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ 
                error: 'Erro ao fazer logout' 
            });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ 
            message: 'Logout bem-sucedido' 
        });
    });
});

// ================================
// ROTAS DE LIVROS (modificadas)
// ================================

app.get('/api/books', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM livros ORDER BY title');
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar livros:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ 
            error: 'ID do livro é obrigatório' 
        });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar livro com informações de empréstimo
        const [rows] = await connection.execute(`
            SELECT l.*, 
                   CASE WHEN e.id IS NULL THEN true ELSE false END as available,
                   e.cpf as emprestadoPara,
                   DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as returnDate
            FROM livros l 
            LEFT JOIN emprestimos e ON l.id = e.bookId AND e.status = 'ativo'
            WHERE l.id = ?
        `, [id]);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ 
                error: 'Livro não encontrado' 
            });
        }
    } catch (error) {
        console.error('Erro ao buscar livro:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor' 
        });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// NOVAS ROTAS DE EMPRÉSTIMO
// ================================

app.post('/api/loan/request', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    if (!bookId) {
        return res.status(400).json({ error: 'ID do livro é obrigatório' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se o livro existe e está disponível
        const [bookRows] = await connection.execute(
            'SELECT * FROM livros WHERE id = ?', 
            [bookId]
        );
        
        if (bookRows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        // Verificar se já existe empréstimo ativo
        const [activeLoans] = await connection.execute(
            'SELECT * FROM emprestimos WHERE bookId = ? AND status = "ativo"', 
            [bookId]
        );
        
        if (activeLoans.length > 0) {
            return res.status(400).json({ error: 'Livro já está emprestado' });
        }
        
        // Criar empréstimo
        const dataRetirada = new Date();
        const dataPrevisaDevolucao = new Date();
        dataPrevisaDevolucao.setDate(dataRetirada.getDate() + 14); // 14 dias para devolver
        
        await connection.execute(`
            INSERT INTO emprestimos (bookId, cpf, data_retirada, data_prevista_devolucao, status) 
            VALUES (?, ?, ?, ?, 'ativo')
        `, [bookId, userCpf, dataRetirada, dataPrevisaDevolucao]);
        
        res.status(200).send('Empréstimo solicitado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao solicitar empréstimo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/loan/reserve', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar próxima posição na fila
        const [queueRows] = await connection.execute(
            'SELECT MAX(posicao) as maxPos FROM reservas WHERE bookId = ? AND status = "aguardando"', 
            [bookId]
        );
        
        const nextPosition = (queueRows[0].maxPos || 0) + 1;
        
        await connection.execute(`
            INSERT INTO reservas (bookId, cpf, posicao, status, data_reserva) 
            VALUES (?, ?, ?, 'aguardando', NOW())
        `, [bookId, userCpf, nextPosition]);
        
        res.status(200).send(`Você entrou na fila de espera! Posição: ${nextPosition}`);
        
    } catch (error) {
        console.error('Erro ao entrar na fila:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/loan/request-return', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Atualizar status do empréstimo
        const [result] = await connection.execute(`
            UPDATE emprestimos 
            SET status = 'pendente_devolucao', data_real_devolucao = NOW() 
            WHERE bookId = ? AND cpf = ? AND status = 'ativo'
        `, [bookId, userCpf]);
        
        if (result.affectedRows > 0) {
            res.status(200).send('Solicitação de devolução enviada!');
        } else {
            res.status(400).json({ error: 'Empréstimo não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao solicitar devolução:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTAS DE RESENHAS
// ================================
// Função auxiliar para converter data para formato MySQL
function formatDateForMySQL(dateInput) {
    let date;
    
    if (!dateInput) {
        // Se não há data, usar data atual
        date = new Date();
    } else if (dateInput instanceof Date) {
        // Se já é um objeto Date
        date = dateInput;
    } else if (typeof dateInput === 'string') {
        // Se é uma string, tentar diferentes formatos
        if (dateInput.includes('/')) {
            // Formato brasileiro: "19/09/2025, 16:40" ou "19/09/2025"
            const parts = dateInput.split(', ');
            const datePart = parts[0]; // "19/09/2025"
            const timePart = parts[1] || '00:00'; // "16:40" ou padrão
            
            const [day, month, year] = datePart.split('/');
            const [hour, minute] = timePart.split(':');
            
            date = new Date(year, month - 1, day, hour || 0, minute || 0);
        } else {
            // Tentar parse direto
            date = new Date(dateInput);
        }
    } else {
        // Fallback para data atual
        date = new Date();
    }
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
        date = new Date(); // Usar data atual se inválida
    }
    
    // Converter para formato MySQL: YYYY-MM-DD HH:MM:SS
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ROTA CORRIGIDA PARA ADICIONAR RESENHAS
app.post('/api/reviews', isAuthenticated, async (req, res) => {
    const { bookId, text, rating, date } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('Dados recebidos para resenha:', { bookId, text, rating, date, userCpf });
    
    if (!bookId || !rating) {
        return res.status(400).json({ error: 'BookId e rating são obrigatórios' });
    }
    
    // Validar rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: 'Rating deve ser um número entre 1 e 5' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Formatar a data corretamente
        const formattedDate = formatDateForMySQL(date);
        console.log('Data formatada para MySQL:', formattedDate);
        
        await connection.execute(`
            INSERT INTO resenhas (bookId, cpf, rating, text, date) 
            VALUES (?, ?, ?, ?, ?)
        `, [bookId, userCpf, ratingNum, text || '', formattedDate]);
        
        console.log('Resenha salva com sucesso');
        res.status(200).json({ message: 'Resenha adicionada com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao adicionar resenha:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

// Substitua a rota POST /api/reviews no server.js por esta versão com debug completo:

app.post('/api/reviews', isAuthenticated, async (req, res) => {
    console.log('=== DEBUG SERVIDOR - RECEBENDO RESENHA ===');
    console.log('Headers da requisição:', req.headers);
    console.log('Corpo da requisição (req.body):', req.body);
    console.log('Sessão do usuário:', req.session.user);
    
    const { bookId, text, rating } = req.body;
    const userCpf = req.session?.user?.cpf;
    
    console.log('Dados extraídos:', { bookId, text, rating, userCpf });
    
    // Verificações básicas
    if (!userCpf) {
        console.log('ERRO: Usuário não encontrado na sessão');
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    if (!bookId) {
        console.log('ERRO: bookId ausente');
        return res.status(400).json({ error: 'BookId é obrigatório' });
    }
    
    if (!rating) {
        console.log('ERRO: rating ausente');
        return res.status(400).json({ error: 'Rating é obrigatório' });
    }
    
    // Validar rating
    const ratingNum = parseInt(rating);
    console.log('Rating convertido:', ratingNum);
    
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        console.log('ERRO: rating inválido');
        return res.status(400).json({ error: 'Rating deve ser um número entre 1 e 5' });
    }
    
    let connection;
    try {
        console.log('Tentando conectar ao banco de dados...');
        connection = await pool.getConnection();
        console.log('Conexão com banco estabelecida');
        
        // Verificar se o livro existe
        console.log('Verificando se livro existe...');
        const [bookCheck] = await connection.execute('SELECT id FROM livros WHERE id = ?', [bookId]);
        console.log('Resultado verificação livro:', bookCheck);
        
        if (bookCheck.length === 0) {
            console.log('ERRO: Livro não encontrado');
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        // Verificar se usuário já tem resenha para este livro
        console.log('Verificando resenhas existentes...');
        const [existingReview] = await connection.execute(
            'SELECT id FROM resenhas WHERE bookId = ? AND cpf = ?', 
            [bookId, userCpf]
        );
        console.log('Resenhas existentes:', existingReview);
        
        if (existingReview.length > 0) {
            console.log('AVISO: Usuário já tem resenha para este livro');
            return res.status(400).json({ error: 'Você já avaliou este livro' });
        }
        
        console.log('Inserindo resenha no banco...');
        console.log('Parâmetros da query:', [bookId, userCpf, ratingNum, text || '']);
        
        const [result] = await connection.execute(`
            INSERT INTO resenhas (bookId, cpf, rating, text, date) 
            VALUES (?, ?, ?, ?, NOW())
        `, [bookId, userCpf, ratingNum, text || '']);
        
        console.log('Resultado da inserção:', result);
        console.log('ID da resenha inserida:', result.insertId);
        
        console.log('Resenha salva com sucesso!');
        res.status(200).json({ message: 'Resenha adicionada com sucesso!' });
        
    } catch (error) {
        console.error('ERRO DETALHADO NO SERVIDOR:', error);
        console.error('Stack trace:', error.stack);
        console.error('Código do erro:', error.code);
        console.error('SQL State:', error.sqlState);
        console.error('SQL Message:', error.sqlMessage);
        
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            console.log('Liberando conexão com banco');
            connection.release();
        }
    }
    
    console.log('=== FIM DEBUG SERVIDOR ===');
});

// ================================
// ROTAS DE FAVORITOS
// ================================

app.post('/api/favorites', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        await connection.execute(
            'INSERT INTO favoritos (cpf, bookId) VALUES (?, ?)', 
            [userCpf, bookId]
        );
        
        res.status(200).send('Livro adicionado aos favoritos!');
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Livro já está nos favoritos' });
        } else {
            console.error('Erro ao adicionar favorito:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/favorites/:bookId', isAuthenticated, async (req, res) => {
    const { bookId } = req.params;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [result] = await connection.execute(
            'DELETE FROM favoritos WHERE cpf = ? AND bookId = ?', 
            [userCpf, bookId]
        );
        
        if (result.affectedRows > 0) {
            res.status(200).send('Livro removido dos favoritos!');
        } else {
            res.status(404).json({ error: 'Favorito não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao remover favorito:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTAS DE PRATELEIRAS
// ================================

app.get('/api/user/shelves', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [rows] = await connection.execute(
            'SELECT * FROM prateleiras WHERE cpf = ?', 
            [userCpf]
        );
        
        res.json(rows);
        
    } catch (error) {
        console.error('Erro ao buscar prateleiras:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/user/shelves', isAuthenticated, async (req, res) => {
    const { name } = req.body;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        await connection.execute(
            'INSERT INTO prateleiras (cpf, nome_prateleira) VALUES (?, ?)', 
            [userCpf, name]
        );
        
        res.status(200).send('Prateleira criada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao criar prateleira:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/user/shelves/add-book', isAuthenticated, async (req, res) => {
    const { shelfId, bookId } = req.body;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        await connection.execute(
            'INSERT INTO prateleira_livros (prateleira_id, bookId) VALUES (?, ?)', 
            [shelfId, bookId]
        );
        
        res.status(200).send('Livro adicionado à prateleira!');
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Livro já está nesta prateleira' });
        } else {
            console.error('Erro ao adicionar livro à prateleira:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    } finally {
        if (connection) connection.release();
    }
});

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Inicia o servidor e o pool de conexões
createPool().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Rotas disponíveis:');
        console.log('- GET /api/books (lista de livros)');
        console.log('- GET /api/books/:id (detalhes do livro)');
        console.log('- POST /api/loan/request (solicitar empréstimo)');
        console.log('- POST /api/reviews (adicionar resenha)');
        console.log('- POST /api/favorites (favoritar livro)');
        console.log('- GET /api/profile (perfil do usuário)');
    });
}).catch(err => {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
});