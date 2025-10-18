const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


const nodemailer = require('nodemailer');

// Configurar transportador de email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true para 465, false para outras portas
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verificar configuração do email ao iniciar
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Erro na configuração do email:', error);
        console.log('⚠️ Os emails NÃO serão enviados. Verifique as configurações no .env');
    } else {
        console.log('✅ Servidor de email configurado e pronto para enviar mensagens');
    }
});

// Função auxiliar para enviar email
async function enviarEmail(destinatario, assunto, html) {
    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"LibRain" <libraintcc@gmail.com>',
            to: destinatario,
            subject: assunto,
            html: html
        });
        
        console.log('✅ Email enviado com sucesso para:', destinatario);
        console.log('📧 Message ID:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        return { success: false, error: error.message };
    }
}

// SEM LIMITE de tamanho no body
app.use(express.json({ limit: 'Infinity' }));
app.use(express.urlencoded({ limit: 'Infinity', extended: true }));

app.use(express.static('public'));

// Configuração do CORS para permitir que o frontend envie cookies de sessão
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Configuração de sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'seu-secret-super-seguro',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true apenas em HTTPS
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
        console.log('=== CRIANDO POOL DE CONEXÕES ===');
        console.log('Configuração do banco:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            hasPassword: !!dbConfig.password
        });
        
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10, 
            queueLimit: 0,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
        });
        
        console.log('Pool criado, testando conexão...');
        
        // Testar conexão
        const connection = await pool.getConnection();
        console.log('Conexão de teste obtida com sucesso');
        
        // Testar query
        const [result] = await connection.execute('SELECT VERSION() as version');
        console.log('Versão do MySQL:', result[0].version);
        
        // Verificar se o database existe
        const [dbCheck] = await connection.execute('SELECT DATABASE() as db');
        console.log('Database atual:', dbCheck[0].db);
        
        connection.release();
        console.log('Pool de conexões MySQL criado e testado com sucesso!');
        
    } catch (error) {
        console.error('=== ERRO CRÍTICO AO CRIAR POOL ===');
        console.error('Mensagem:', error.message);
        console.error('Código:', error.code);
        console.error('Stack:', error.stack);
        
        // Dicas de solução baseadas no erro
        if (error.code === 'ECONNREFUSED') {
            console.error('\n🔥 DICA: MySQL não está rodando ou não está na porta correta');
            console.error('Verifique se o MySQL está iniciado e rodando na porta 3306');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n🔥 DICA: Problema de autenticação');
            console.error('Verifique usuário e senha do banco');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('\n🔥 DICA: Database não existe');
            console.error('Execute o script SQL para criar o database librain');
        }
        
        process.exit(1);
    }
}

// Middleware para verificar a autenticação do usuário
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Não autorizado. Por favor, faça login.' });
    }
};

// Middleware para verificar se o usuário é admin
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.tipo === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
};

// Função auxiliar para limpar CPF
const cleanCPF = (cpf) => {
    if (!cpf) return null;
    return cpf.toString().replace(/[^\d]/g, '');
};

// ================================
// ROTAS DE AUTENTICAÇÃO
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
        
        const cpfLimpo = cleanCPF(cpf);
        
        if (!cpfLimpo || cpfLimpo.length !== 11) {
            return res.status(400).json({ 
                error: 'CPF deve ter 11 dígitos válidos' 
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            
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
            let isMatch = false;
            
            // Verificar se é o hash da senha ou senha em texto plano (para admin padrão)
            if (user.senha_hash === 'admin123' && senha === 'admin123') {
                isMatch = true;
                // Opcionalmente, criptografar a senha para o futuro
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('admin123', salt);
                await connection.execute(
                    'UPDATE usuarios SET senha_hash = ? WHERE cpf = ?',
                    [hashedPassword, cpfLimpo]
                );
            } else {
                isMatch = await bcrypt.compare(senha, user.senha_hash);
            }

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
            error: 'Erro interno do servidor'
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
            error: 'Erro interno do servidor'
        });
    }
});

app.get('/api/profile', isAuthenticated, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar dados completos do usuário
        const [userRows] = await connection.execute(
            'SELECT * FROM usuarios WHERE cpf = ?', 
            [req.session.user.cpf]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const user = userRows[0];
        
        // Buscar favoritos do usuário
        const [favoritos] = await connection.execute(
            'SELECT bookId FROM favoritos WHERE cpf = ?', 
            [req.session.user.cpf]
        );
        
        const profileData = {
            id: user.id,
            nome: user.nome,
            cpf: user.cpf,
            email: user.email,
            tipo: user.tipo,
            bio: user.bio,
            avatar_url: user.avatar_url,
            livros_lidos: user.livros_lidos,
            paginas_lidas: user.paginas_lidas,
            data_cadastro: user.data_cadastro,
            favorites: favoritos.map(f => f.bookId)
        };
        
        res.json(profileData);
    } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


app.put('/api/profile/avatar', isAuthenticated, async (req, res) => {
    console.log('=== UPLOAD DE AVATAR ===');
    console.log('Body recebido:', { hasAvatarUrl: !!req.body.avatarUrl });
    console.log('User CPF da sessão:', req.session.user.cpf);
    
    const { avatarUrl } = req.body;
    const userCpf = req.session.user.cpf;
    
    if (!avatarUrl) {
        console.log('Avatar URL não fornecida');
        return res.status(400).json({ error: 'URL do avatar é obrigatória' });
    }
    
    // CORREÇÃO: Aceitar data:image/ OU URLs http/https
    const isValidFormat = avatarUrl.startsWith('data:image/') || 
                          avatarUrl.startsWith('http://') || 
                          avatarUrl.startsWith('https://');
    
    if (!isValidFormat) {
        console.log('Formato de avatar inválido:', avatarUrl.substring(0, 50));
        return res.status(400).json({ 
            error: 'Formato de imagem inválido. Use uma imagem em base64 ou URL válida.' 
        });
    }
    
    // REMOVIDO: Verificação de tamanho máximo
    // Agora aceita qualquer tamanho (LONGTEXT suporta até 4GB)
    
    let connection;
    try {
        console.log('Conectando ao banco para atualizar avatar...');
        connection = await pool.getConnection();
        
        const [result] = await connection.execute(
            'UPDATE usuarios SET avatar_url = ?, data_atualizacao = NOW() WHERE cpf = ?',
            [avatarUrl, userCpf]
        );
        
        console.log('Resultado da atualização:', result.affectedRows);
        
        if (result.affectedRows > 0) {
            req.session.user.avatar_url = avatarUrl;
            
            console.log('✅ Avatar atualizado com sucesso');
            res.status(200).json({ 
                message: 'Avatar atualizado com sucesso!',
                avatar_url: avatarUrl
            });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
    } catch (error) {
        console.error('=== ERRO NO UPLOAD DE AVATAR ===');
        console.error('Mensagem:', error.message);
        console.error('Código:', error.code);
        
        // CORREÇÃO: Mensagens de erro específicas
        if (error.code === 'ER_NET_PACKET_TOO_LARGE') {
            res.status(413).json({ 
                error: 'Imagem muito grande para o banco de dados. Configure max_allowed_packet no MySQL.'
            });
        } else if (error.code === 'WARN_DATA_TRUNCATED') {
            res.status(413).json({ 
                error: 'Imagem truncada. Aumente o tamanho da coluna avatar_url.'
            });
        } else {
            res.status(500).json({ 
                error: 'Erro ao salvar avatar',
                details: error.message 
            });
        }
    } finally {
        if (connection) connection.release();
    }
});


app.put('/api/profile/bio', isAuthenticated, async (req, res) => {
    const { bio } = req.body;
    const userCpf = req.session.user.cpf;
    
    // Validação do tamanho da biografia
    if (bio && bio.length > 500) {
        return res.status(400).json({ error: 'Biografia deve ter no máximo 500 caracteres' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Atualizar biografia no banco
        const [result] = await connection.execute(
            'UPDATE usuarios SET bio = ?, data_atualizacao = NOW() WHERE cpf = ?',
            [bio || null, userCpf]
        );
        
        if (result.affectedRows > 0) {
            // Buscar dados atualizados do usuário
            const [userRows] = await connection.execute(
                'SELECT nome, bio FROM usuarios WHERE cpf = ?',
                [userCpf]
            );
            
            if (userRows.length > 0) {
                const updatedUser = userRows[0];
                res.status(200).json({
                    message: 'Biografia atualizada com sucesso!',
                    nome: updatedUser.nome,
                    bio: updatedUser.bio
                });
            } else {
                res.status(404).json({ error: 'Usuário não encontrado' });
            }
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao atualizar biografia:', error);
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
// ROTAS DE LIVROS
// ================================



app.get('/api/books', async (req, res) => {
    console.log('=== DEBUG: Requisição para /api/books recebida ===');
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [rows] = await connection.execute(`
            SELECT 
                l.*,
                CASE 
                    WHEN e.id IS NOT NULL AND e.status = 'ativo' THEN false
                    ELSE true 
                END as available,
                e.cpf as emprestadoPara,
                e.data_prevista_devolucao as returnDate,
                COUNT(r.id) as reviewCount,
                AVG(r.rating) as avgRating
            FROM livros l
            LEFT JOIN emprestimos e ON l.id = e.bookId AND e.status = 'ativo'
            LEFT JOIN resenhas r ON l.id = r.id
            GROUP BY l.id, e.id, e.cpf, e.data_prevista_devolucao
            ORDER BY l.title
        `);
        
        console.log('Query executada, livros encontrados:', rows.length);
        
        // Processar os dados para o formato esperado pelo frontend
        const processedBooks = rows.map(book => ({
            ...book,
            available: book.available === 1 || book.available === true || book.available === 'true',
            reviewCount: parseInt(book.reviewCount) || 0,
            avgRating: book.avgRating ? parseFloat(book.avgRating) : null
        }));
        
        console.log('Primeiros 3 livros processados:', processedBooks.slice(0, 3).map(b => ({
            id: b.id,
            title: b.title,
            available: b.available
        })));
        
        res.json(processedBooks);
    } catch (error) {
        console.error('=== ERRO NA ROTA /api/books ===');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});


app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar livro - APENAS status "ativo" torna indisponível
        const [bookRows] = await connection.execute(`
            SELECT 
                l.*,
                CASE 
                    WHEN e.id IS NOT NULL AND e.status = 'ativo' THEN false
                    ELSE true 
                END as available,
                e.cpf as emprestadoPara,
                DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as returnDate
            FROM livros l
            LEFT JOIN emprestimos e ON l.id = e.bookId AND e.status = 'ativo'
            WHERE l.id = ?
        `, [id]);
        
        if (bookRows.length === 0) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        const book = bookRows[0];
        book.available = book.available === 1 || book.available === true;
        
        // Buscar fila de espera do livro
        const [queueRows] = await connection.execute(`
            SELECT cpf FROM reservas 
            WHERE bookId = ? AND status = 'aguardando' 
            ORDER BY posicao ASC
        `, [id]);
        
        book.queue = queueRows.map(row => row.cpf);
        
        res.json(book);
        
    } catch (error) {
        console.error('Erro ao buscar detalhes do livro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }

});

app.get('/api/user/loan-history/:bookId', isAuthenticated, async (req, res) => {
    const { bookId } = req.params;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [history] = await connection.execute(`
            SELECT * FROM emprestimos 
            WHERE bookId = ? AND cpf = ? AND status = 'devolvido'
            ORDER BY data_real_devolucao DESC
        `, [bookId, userCpf]);
        
        res.json(history);
        
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTAS DE EMPRÉSTIMO
// ================================

app.post('/api/loan/request', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== SOLICITAÇÃO DE EMPRÉSTIMO ===');
    console.log('BookId:', bookId, 'CPF:', userCpf);
    
    if (!bookId) {
        return res.status(400).json({ error: 'ID do livro é obrigatório' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar limite de 3 empréstimos ativos/aguardando
        const [activeLoans] = await connection.execute(
            'SELECT COUNT(*) as total FROM emprestimos WHERE cpf = ? AND status IN ("ativo", "aguardando_retirada")',
            [userCpf]
        );
        
        if (activeLoans[0].total >= 3) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Você atingiu o limite de 3 empréstimos simultâneos.' 
            });
        }
        
        // Verificar se o livro existe
        const [bookRows] = await connection.execute(
            'SELECT * FROM livros WHERE id = ?', 
            [bookId]
        );
        
        if (bookRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        // Verificar se já existe empréstimo ativo ou aguardando
        const [existingLoans] = await connection.execute(
            'SELECT * FROM emprestimos WHERE bookId = ? AND status IN ("ativo", "aguardando_retirada")', 
            [bookId]
        );
        
        if (existingLoans.length > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Este livro já está emprestado ou aguardando aprovação' 
            });
        }
        
        // Criar empréstimo com status "aguardando_retirada"
        const dataRetirada = new Date();
        const dataPrevisaDevolucao = new Date();
        dataPrevisaDevolucao.setDate(dataRetirada.getDate() + 14);
        
        await connection.execute(`
            INSERT INTO emprestimos (bookId, cpf, data_retirada, data_prevista_devolucao, status) 
            VALUES (?, ?, ?, ?, 'aguardando_retirada')
        `, [bookId, userCpf, dataRetirada, dataPrevisaDevolucao]);
        
        console.log('✅ Empréstimo criado com status: aguardando_retirada');
        
        await connection.commit();
        res.status(200).json({ 
            message: '📚 Empréstimo solicitado! Aguardando aprovação do bibliotecário.' 
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao solicitar empréstimo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


app.post('/api/admin/confirm-pickup', isAuthenticated, isAdmin, async (req, res) => {
    const { bookId, cpf } = req.body;
    
    console.log('=== CONFIRMANDO RETIRADA ===');
    console.log('BookId:', bookId, 'CPF:', cpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Buscar empréstimo aguardando retirada
        const [emprestimo] = await connection.execute(
            'SELECT * FROM emprestimos WHERE bookId = ? AND cpf = ? AND status = "aguardando_retirada"',
            [bookId, cpf]
        );
        
        if (emprestimo.length === 0) {
            await connection.rollback();
            return res.status(404).json({ 
                error: 'Empréstimo aguardando retirada não encontrado' 
            });
        }
        
        // Atualizar status para "ativo"
        await connection.execute(
            'UPDATE emprestimos SET status = "ativo" WHERE bookId = ? AND cpf = ? AND status = "aguardando_retirada"',
            [bookId, cpf]
        );
        
        // Criar notificação para o usuário
        await connection.execute(
            `INSERT INTO notificacoes (cpf, tipo, titulo, mensagem) 
             VALUES (?, 'emprestimo', 'Retirada Confirmada ✓', 
                     'Sua retirada foi confirmada. Aproveite a leitura! Devolva até o prazo.')`,
            [cpf]
        );
        
        console.log('✅ Retirada confirmada - Status atualizado para ativo');
        
        await connection.commit();
        res.json({ message: 'Retirada confirmada com sucesso!' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao confirmar retirada:', error);
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
        
        // Verificar se já está na fila
        const [existingReservation] = await connection.execute(
            'SELECT * FROM reservas WHERE bookId = ? AND cpf = ? AND status = "aguardando"',
            [bookId, userCpf]
        );
        
        if (existingReservation.length > 0) {
            return res.status(400).json({ error: 'Você já está na fila para este livro' });
        }
        
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
        
        res.status(200).json({ 
            message: `Você entrou na fila de espera! Posição: ${nextPosition}` 
        });
        
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
    
    console.log('=== SOLICITAÇÃO DE DEVOLUÇÃO ===');
    console.log('BookId:', bookId, 'CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Atualizar status para "pendente_devolucao"
        const [result] = await connection.execute(`
            UPDATE emprestimos 
            SET status = 'pendente_devolucao', data_real_devolucao = NOW() 
            WHERE bookId = ? AND cpf = ? AND status = 'ativo'
        `, [bookId, userCpf]);
        
        if (result.affectedRows > 0) {
            console.log('✅ Devolução solicitada - Status: pendente_devolucao');
            res.status(200).json({ 
                message: '📖 Devolução solicitada! Aguardando aprovação do bibliotecário.' 
            });
        } else {
            res.status(400).json({ 
                error: 'Empréstimo ativo não encontrado' 
            });
        }
        
    } catch (error) {
        console.error('Erro ao solicitar devolução:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Cancelar reserva (fila de espera)
app.post('/api/loan/cancel-reserve', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== CANCELAR RESERVA ===');
    console.log('BookId:', bookId, 'CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Deletar reserva
        const [result] = await connection.execute(
            'DELETE FROM reservas WHERE bookId = ? AND cpf = ? AND status = "aguardando"',
            [bookId, userCpf]
        );
        
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Reserva não encontrada' });
        }
        
        // Reordenar posições na fila
        const [remainingQueue] = await connection.execute(
            'SELECT id FROM reservas WHERE bookId = ? AND status = "aguardando" ORDER BY posicao ASC',
            [bookId]
        );
        
        for (let i = 0; i < remainingQueue.length; i++) {
            await connection.execute(
                'UPDATE reservas SET posicao = ? WHERE id = ?',
                [i + 1, remainingQueue[i].id]
            );
        }
        
        await connection.commit();
        res.json({ message: 'Reserva cancelada com sucesso!' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao cancelar reserva:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Cancelar reserva

app.post('/api/loan/cancel-request', isAuthenticated, async (req, res) => {
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== CANCELAR SOLICITAÇÃO ===');
    console.log('BookId:', bookId, 'CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Cancelar empréstimo aguardando retirada
        const [result] = await connection.execute(
            'DELETE FROM emprestimos WHERE bookId = ? AND cpf = ? AND status = "aguardando_retirada"',
            [bookId, userCpf]
        );
        
        if (result.affectedRows > 0) {
            await connection.commit();
            res.json({ message: 'Solicitação cancelada com sucesso!' });
        } else {
            // Tentar cancelar reserva
            await connection.rollback();
            const cancelReserveResult = await fetch('http://localhost:3000/api/loan/cancel-reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId })
            });
            
            if (cancelReserveResult.ok) {
                res.json({ message: 'Reserva cancelada com sucesso!' });
            } else {
                res.status(404).json({ error: 'Solicitação não encontrada' });
            }
        }
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao cancelar solicitação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/loan/mark-read', isAuthenticated, async (req, res) => {
    const { bookId, status } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== MARCAR COMO LIDO ===');
    console.log('BookId:', bookId, 'Status:', status, 'CPF:', userCpf);
    
    if (!['lido', 'nao_terminado'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Buscar empréstimo devolvido mais recente
        const [emprestimo] = await connection.execute(
            `SELECT * FROM emprestimos 
             WHERE bookId = ? AND cpf = ? AND status = 'devolvido' 
             ORDER BY data_real_devolucao DESC LIMIT 1`,
            [bookId, userCpf]
        );
        
        if (emprestimo.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Você só pode marcar como lido após devolver o livro' 
            });
        }
        
        const emprestimoId = emprestimo[0].id;
        const statusAnterior = emprestimo[0].status_leitura;
        
        // Atualizar status de leitura
        await connection.execute(
            'UPDATE emprestimos SET status_leitura = ?, data_marcado_lido = ? WHERE id = ?',
            [status, status === 'lido' ? new Date() : null, emprestimoId]
        );
        
        // Se marcado como lido E não estava lido antes, incrementar contador
        if (status === 'lido' && statusAnterior !== 'lido') {
            await connection.execute(
                'UPDATE usuarios SET livros_lidos = livros_lidos + 1 WHERE cpf = ?',
                [userCpf]
            );
            
            // Verificar conquistas
            try {
                await connection.execute('CALL VerificarConquistas(?)', [userCpf]);
            } catch (error) {
                console.log('Erro ao verificar conquistas:', error.message);
            }
        }
        // Se estava lido e agora não está, decrementar
        else if (status === 'nao_terminado' && statusAnterior === 'lido') {
            await connection.execute(
                'UPDATE usuarios SET livros_lidos = GREATEST(livros_lidos - 1, 0) WHERE cpf = ?',
                [userCpf]
            );
        }
        
        await connection.commit();
        
        res.json({ 
            message: status === 'lido' ? 
                'Parabéns por terminar o livro! 🎉' : 
                'Status atualizado!' 
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao marcar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTAS DE NOTIFICAÇÕES
// ================================

app.get('/api/user/notifications', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [notifications] = await connection.execute(
            'SELECT * FROM notificacoes WHERE cpf = ? ORDER BY data_criacao DESC LIMIT 20',
            [userCpf]
        );
        
        res.json(notifications);
        
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/user/notifications/mark-read', isAuthenticated, async (req, res) => {
    const { notificationId } = req.body;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        await connection.execute(
            'UPDATE notificacoes SET lida = TRUE, data_leitura = NOW() WHERE id = ? AND cpf = ?',
            [notificationId, userCpf]
        );
        
        res.json({ message: 'Notificação marcada como lida' });
        
    } catch (error) {
        console.error('Erro ao marcar notificação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTAS DE RESENHAS
// ================================

app.post('/api/reviews', isAuthenticated, async (req, res) => {
    const { bookId, text, rating } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== RECEBENDO RESENHA ===');
    console.log('Body:', req.body);
    console.log('User CPF:', userCpf);
    
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
        
        // Verificar se usuário já tem resenha para este livro
        const [existingReview] = await connection.execute(
            'SELECT id FROM resenhas WHERE bookId = ? AND cpf = ?', 
            [bookId, userCpf]
        );
        
        if (existingReview.length > 0) {
            return res.status(400).json({ error: 'Você já avaliou este livro' });
        }
        
        await connection.execute(`
            INSERT INTO resenhas (bookId, cpf, rating, text, date) 
            VALUES (?, ?, ?, ?, NOW())
        `, [bookId, userCpf, ratingNum, text || '']);
        
        console.log('Resenha salva com sucesso');
        res.status(200).json({ message: 'Resenha adicionada com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao adicionar resenha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/reviews/:bookId', async (req, res) => {
    const { bookId } = req.params;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [reviews] = await connection.execute(`
            SELECT r.*, u.nome as user_name,
                   DATE_FORMAT(r.date, '%d/%m/%Y às %H:%i') as formatted_date
            FROM resenhas r
            JOIN usuarios u ON r.cpf = u.cpf
            WHERE r.bookId = ?
            ORDER BY r.date DESC
        `, [bookId]);
        
        // Formatar dados para o frontend
        const formattedReviews = reviews.map(review => ({
            id: review.id,
            bookId: review.bookId,
            cpf: review.cpf,
            rating: review.rating,
            text: review.text,
            date: review.formatted_date,
            user: review.user_name
        }));
        
        res.json(formattedReviews);
        
    } catch (error) {
        console.error('Erro ao buscar resenhas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Atualizar resenha

app.put('/api/reviews/:reviewId', isAuthenticated, async (req, res) => {
    const { reviewId } = req.params;
    const { text, rating } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== EDITAR RESENHA ===');
    console.log('ReviewId:', reviewId, 'Rating:', rating);
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se a resenha pertence ao usuário
        const [review] = await connection.execute(
            'SELECT * FROM resenhas WHERE id = ? AND cpf = ?',
            [reviewId, userCpf]
        );
        
        if (review.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para editar esta resenha' });
        }
        
        await connection.execute(
            'UPDATE resenhas SET text = ?, rating = ?, date = NOW() WHERE id = ?',
            [text || '', rating, reviewId]
        );
        
        res.json({ message: 'Resenha atualizada com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao atualizar resenha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


// Deletar resenha
app.delete('/api/reviews/:reviewId', isAuthenticated, async (req, res) => {
    const { reviewId } = req.params;
    const userCpf = req.session.user.cpf;
    
    console.log('🗑️ DELETAR RESENHA:', reviewId, 'User CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se a resenha existe e pertence ao usuário
        const [review] = await connection.execute(
            'SELECT cpf FROM resenhas WHERE id = ?',
            [reviewId]
        );
        
        console.log('Review encontrada:', review);
        
        if (review.length === 0) {
            return res.status(404).json({ error: 'Resenha não encontrada' });
        }
        
        // Comparar CPFs (convertendo ambos para string limpa)
        const reviewCpf = cleanCPF(review[0].cpf);
        const sessionCpf = cleanCPF(userCpf);
        
        console.log('Comparando CPFs - Review:', reviewCpf, 'Sessão:', sessionCpf);
        
        if (reviewCpf !== sessionCpf) {
            return res.status(403).json({ error: 'Você não tem permissão para excluir esta resenha' });
        }
        
        // Deletar resenha
        await connection.execute('DELETE FROM resenhas WHERE id = ?', [reviewId]);
        
        console.log('✅ Resenha deletada com sucesso');
        res.json({ message: 'Resenha excluída com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao excluir resenha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
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
        
        res.status(200).json({ message: 'Livro adicionado aos favoritos!' });
        
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
            res.status(200).json({ message: 'Livro removido dos favoritos!' });
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
        
        const [shelves] = await connection.execute(`
            SELECT p.*, GROUP_CONCAT(pl.bookId) as book_ids
            FROM prateleiras p
            LEFT JOIN prateleira_livros pl ON p.id = pl.prateleira_id
            WHERE p.cpf = ?
            GROUP BY p.id
        `, [userCpf]);
        
        // Formatar resposta
        const formattedShelves = shelves.map(shelf => ({
            id: shelf.id,
            name: shelf.nome_prateleira,
            nome_prateleira: shelf.nome_prateleira,
            books: shelf.book_ids ? shelf.book_ids.split(',').map(id => parseInt(id)) : []
        }));
        
        res.json(formattedShelves);
        
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
    
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nome da prateleira é obrigatório' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        await connection.execute(
            'INSERT INTO prateleiras (cpf, nome_prateleira) VALUES (?, ?)', 
            [userCpf, name.trim()]
        );
        
        res.status(200).json({ message: 'Prateleira criada com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao criar prateleira:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.delete('/api/user/shelves/:shelfId', isAuthenticated, async (req, res) => {
    const { shelfId } = req.params;
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se a prateleira pertence ao usuário
        const [shelfCheck] = await connection.execute(
            'SELECT id FROM prateleiras WHERE id = ? AND cpf = ?',
            [shelfId, userCpf]
        );
        
        if (shelfCheck.length === 0) {
            return res.status(403).json({ error: 'Prateleira não encontrada ou não pertence a você' });
        }
        
        // Deletar prateleira (os livros da prateleira serão removidos automaticamente devido ao CASCADE)
        await connection.execute(
            'DELETE FROM prateleiras WHERE id = ? AND cpf = ?', 
            [shelfId, userCpf]
        );
        
        res.status(200).json({ message: 'Prateleira excluída com sucesso!' });
        
    } catch (error) {
        console.error('Erro ao excluir prateleira:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/user/shelves/add-book', isAuthenticated, async (req, res) => {
    const { shelfId, bookId } = req.body;
    
    if (!shelfId || !bookId) {
        return res.status(400).json({ error: 'shelfId e bookId são obrigatórios' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se a prateleira pertence ao usuário
        const [shelfCheck] = await connection.execute(
            'SELECT id FROM prateleiras WHERE id = ? AND cpf = ?',
            [shelfId, req.session.user.cpf]
        );
        
        if (shelfCheck.length === 0) {
            return res.status(403).json({ error: 'Prateleira não encontrada ou não pertence a você' });
        }
        
        await connection.execute(
            'INSERT INTO prateleira_livros (prateleira_id, bookId) VALUES (?, ?)', 
            [shelfId, bookId]
        );
        
        res.status(200).json({ message: 'Livro adicionado à prateleira!' });
        
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

// ================================
// ROTA DE DASHBOARD DO USUÁRIO
// ================================

app.get('/api/user/dashboard', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar empréstimos ativos
        const [emprestados] = await connection.execute(`
            SELECT e.*, l.title, l.author, 
                   DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as data_devolucao_formatada
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
             WHERE e.cpf = ? AND e.status IN ('ativo', 'aguardando_retirada')
            ORDER BY e.data_prevista_devolucao ASC
        `, [userCpf]);
        
        // Buscar reservas
        const [reservas] = await connection.execute(`
            SELECT r.*, l.title, l.author
            FROM reservas r
            JOIN livros l ON r.bookId = l.id
            WHERE r.cpf = ? AND r.status = 'aguardando'
            ORDER BY r.posicao ASC
        `, [userCpf]);
        
        // Buscar devoluções pendentes
        const [devolucoesPendentes] = await connection.execute(`
            SELECT e.*, l.title, l.author
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            WHERE e.cpf = ? AND e.status = 'pendente_devolucao'
            ORDER BY e.data_real_devolucao ASC
        `, [userCpf]);
        
        res.json({
            emprestados,
            reservas,
            devolucoesPendentes
        });
        
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


// ================================
// CONQUISTAS DO USUÁRIO
// ================================

// Verificar e conceder conquistas
app.post('/api/user/check-achievements', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Chamar a stored procedure
        await connection.execute('CALL VerificarConquistas(?)', [userCpf]);
        
        res.json({ message: 'Conquistas verificadas!' });
        
    } catch (error) {
        console.error('Erro ao verificar conquistas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


// ================================
// CONQUISTAS DO USUÁRIO
// ================================

app.get('/api/user/achievements', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar conquistas do usuário
        const [userData] = await connection.execute(
            'SELECT conquistas_desbloqueadas FROM usuarios WHERE cpf = ?',
            [userCpf]
        );
        
        const conquistasDesbloqueadas = userData[0].conquistas_desbloqueadas || [];
        
        // Buscar todas as conquistas disponíveis
        const [allAchievements] = await connection.execute(
            'SELECT * FROM conquistas_disponiveis WHERE ativa = TRUE ORDER BY ordem_exibicao'
        );
        
        // Marcar quais estão desbloqueadas
        const achievements = allAchievements.map(achievement => ({
            ...achievement,
            desbloqueada: conquistasDesbloqueadas.includes(achievement.id)
        }));
        
        res.json(achievements);
        
    } catch (error) {
        console.error('Erro ao buscar conquistas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});
app.get('/api/user/achievements', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    console.log('=== BUSCANDO CONQUISTAS ===');
    console.log('CPF do usuário:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar conquistas do usuário
        const [userData] = await connection.execute(
            'SELECT conquistas_desbloqueadas FROM usuarios WHERE cpf = ?',
            [userCpf]
        );
        
        console.log('Dados do usuário:', userData[0]);
        
        let conquistasDesbloqueadas = [];
        
        // Parse seguro do JSON
        if (userData[0] && userData[0].conquistas_desbloqueadas) {
            try {
                // Se já for um array, usar diretamente
                if (Array.isArray(userData[0].conquistas_desbloqueadas)) {
                    conquistasDesbloqueadas = userData[0].conquistas_desbloqueadas;
                } 
                // Se for string JSON, parsear
                else if (typeof userData[0].conquistas_desbloqueadas === 'string') {
                    conquistasDesbloqueadas = JSON.parse(userData[0].conquistas_desbloqueadas);
                }
            } catch (e) {
                console.log('Erro ao parsear conquistas, usando array vazio:', e.message);
                conquistasDesbloqueadas = [];
            }
        }
        
        console.log('Conquistas desbloqueadas (IDs):', conquistasDesbloqueadas);
        
        // Buscar todas as conquistas disponíveis
        const [allAchievements] = await connection.execute(
            'SELECT * FROM conquistas_disponiveis WHERE ativa = TRUE ORDER BY ordem_exibicao'
        );
        
        console.log('Total de conquistas disponíveis:', allAchievements.length);
        
        // Marcar quais estão desbloqueadas
        const achievements = allAchievements.map(achievement => {
            const desbloqueada = conquistasDesbloqueadas.includes(achievement.id);
            return {
                id: achievement.id,
                nome: achievement.nome,
                descricao: achievement.descricao,
                icone: achievement.icone,
                condicao_tipo: achievement.condicao_tipo,
                condicao_valor: achievement.condicao_valor,
                desbloqueada: desbloqueada
            };
        });
        
        console.log('Conquistas processadas:', achievements.length);
        console.log('Desbloqueadas:', achievements.filter(a => a.desbloqueada).length);
        
        res.json(achievements);
        
    } catch (error) {
        console.error('=== ERRO AO BUSCAR CONQUISTAS ===');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

// Verificar e conceder conquistas
app.post('/api/user/check-achievements', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Chamar a stored procedure
        await connection.execute('CALL VerificarConquistas(?)', [userCpf]);
        
        res.json({ message: 'Conquistas verificadas!' });
        
    } catch (error) {
        console.error('Erro ao verificar conquistas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTAS ADMIN
// ================================

app.get('/api/admin/dashboard', isAuthenticated, isAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        console.log('=== CARREGANDO DASHBOARD ADMIN ===');
        
        // Estatísticas gerais
        const [stats] = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM usuarios) as total_usuarios,
                (SELECT COUNT(*) FROM livros) as total_livros,
                (SELECT COUNT(*) FROM emprestimos WHERE status IN ('ativo', 'aguardando_retirada')) as emprestimos_ativos,
                (SELECT COUNT(*) FROM emprestimos WHERE status = 'pendente_devolucao') as devolucoes_pendentes
        `);
        
        console.log('Stats:', stats[0]);
        
        // Empréstimos ativos E aguardando retirada
        const [emprestimos_ativos] = await connection.execute(`
            SELECT 
                e.*,
                l.title,
                l.author,
                u.nome as user_name,
                DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as data_devolucao_formatada,
                DATE_FORMAT(e.data_retirada, '%d/%m/%Y %H:%i') as data_solicitacao_formatada,
                DATEDIFF(CURDATE(), e.data_prevista_devolucao) as dias_atraso
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            JOIN usuarios u ON e.cpf = u.cpf
            WHERE e.status IN ('ativo', 'aguardando_retirada')
            ORDER BY 
                CASE e.status 
                    WHEN 'aguardando_retirada' THEN 1 
                    WHEN 'ativo' THEN 2 
                END,
                e.data_retirada DESC
        `);
        
        console.log('Empréstimos ativos encontrados:', emprestimos_ativos.length);
        console.log('Aguardando retirada:', emprestimos_ativos.filter(e => e.status === 'aguardando_retirada').length);
        console.log('Ativos:', emprestimos_ativos.filter(e => e.status === 'ativo').length);
        
        // Log detalhado dos aguardando retirada
        const aguardando = emprestimos_ativos.filter(e => e.status === 'aguardando_retirada');
        aguardando.forEach(emp => {
            console.log(`- ${emp.title} para ${emp.user_name} (CPF: ${emp.cpf})`);
        });
        
        // Devoluções pendentes
        const [devolucoes_pendentes] = await connection.execute(`
            SELECT 
                e.*,
                l.title,
                l.author,
                u.nome as user_name,
                DATE_FORMAT(e.data_real_devolucao, '%d/%m/%Y') as data_devolucao_solicitada
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            JOIN usuarios u ON e.cpf = u.cpf
            WHERE e.status = 'pendente_devolucao'
            ORDER BY e.data_real_devolucao ASC
        `);
        
        console.log('Devoluções pendentes:', devolucoes_pendentes.length);
        
        res.json({
            stats: stats[0],
            emprestimos_ativos,
            devolucoes_pendentes
        });
        
    } catch (error) {
        console.error('=== ERRO NO DASHBOARD ADMIN ===');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


app.get('/api/admin/debug-emprestimos', isAuthenticated, isAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [todos] = await connection.execute(`
            SELECT 
                e.id,
                e.bookId,
                l.title,
                e.cpf,
                u.nome,
                e.status,
                DATE_FORMAT(e.data_retirada, '%d/%m/%Y %H:%i') as data_retirada
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            JOIN usuarios u ON e.cpf = u.cpf
            WHERE e.status IN ('aguardando_retirada', 'ativo')
            ORDER BY e.data_retirada DESC
        `);
        
        res.json({
            total: todos.length,
            aguardando_retirada: todos.filter(e => e.status === 'aguardando_retirada'),
            ativos: todos.filter(e => e.status === 'ativo'),
            todos
        });
        
    } catch (error) {
        console.error('Erro no debug:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/admin/approve-return', isAuthenticated, isAdmin, async (req, res) => {
    const { bookId, cpf } = req.body;
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Atualizar empréstimo para devolvido
        const [result] = await connection.execute(`
            UPDATE emprestimos 
            SET status = 'devolvido', data_real_devolucao = CURDATE()
            WHERE bookId = ? AND cpf = ? AND status = 'pendente_devolucao'
        `, [bookId, cpf]);
        
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Empréstimo não encontrado' });
        }
        
        // Verificar se há alguém na fila para este livro
        const [nextInQueue] = await connection.execute(`
            SELECT cpf FROM reservas 
            WHERE bookId = ? AND status = 'aguardando' 
            ORDER BY posicao ASC 
            LIMIT 1
        `, [bookId]);
        
        if (nextInQueue.length > 0) {
            const nextUserCpf = nextInQueue[0].cpf;
            
            // Atualizar status da reserva
            await connection.execute(`
                UPDATE reservas 
                SET status = 'notificado', data_notificacao = NOW()
                WHERE bookId = ? AND cpf = ?
            `, [bookId, nextUserCpf]);
            
            // Criar notificação
            await connection.execute(`
                INSERT INTO notificacoes (cpf, tipo, titulo, mensagem)
                VALUES (?, 'reserva', 'Livro Disponível!', 
                        'O livro que você reservou está disponível para retirada.')
            `, [nextUserCpf]);
        }
        
        await connection.commit();
        res.status(200).json({ message: 'Devolução aprovada com sucesso!' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao aprovar devolução:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [users] = await connection.execute(`
            SELECT id, nome, cpf, email, tipo, livros_lidos, data_cadastro
            FROM usuarios
            ORDER BY nome ASC
        `);
        
        res.json(users);
        
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/admin/add-admin', isAuthenticated, isAdmin, async (req, res) => {
    const { cpf } = req.body;
    
    if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório' });
    }
    
    const cpfLimpo = cleanCPF(cpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [result] = await connection.execute(`
            UPDATE usuarios 
            SET tipo = 'admin' 
            WHERE cpf = ?
        `, [cpfLimpo]);
        
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Usuário promovido a administrador com sucesso!' });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao promover usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

app.post('/api/admin/remove-admin', isAuthenticated, isAdmin, async (req, res) => {
    const { cpf } = req.body;
    
    if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório' });
    }
    
    const cpfLimpo = cleanCPF(cpf);
    const adminCpf = cleanCPF(req.session.user.cpf);
    
    // Impedir que o admin remova a si mesmo
    if (cpfLimpo === adminCpf) {
        return res.status(400).json({ error: 'Você não pode remover seus próprios privilégios de administrador!' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se o usuário é admin
        const [user] = await connection.execute(
            'SELECT tipo FROM usuarios WHERE cpf = ?',
            [cpfLimpo]
        );
        
        if (user.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        if (user[0].tipo !== 'admin') {
            return res.status(400).json({ error: 'Este usuário não é um administrador' });
        }
        
        // Remover privilégios de admin
        const [result] = await connection.execute(`
            UPDATE usuarios 
            SET tipo = 'leitor' 
            WHERE cpf = ?
        `, [cpfLimpo]);
        
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Privilégios de administrador removidos com sucesso!' });
        } else {
            res.status(404).json({ error: 'Erro ao remover privilégios' });
        }
        
    } catch (error) {
        console.error('Erro ao remover admin:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Gerar relatório administrativo
app.get('/api/admin/report', isAuthenticated, isAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Estatísticas gerais
        const [stats] = await connection.execute(`
            SELECT 
                (SELECT COUNT(*) FROM usuarios WHERE tipo = 'leitor') as total_leitores,
                (SELECT COUNT(*) FROM livros) as total_livros,
                (SELECT COUNT(*) FROM emprestimos WHERE status = 'ativo') as emprestimos_ativos,
                (SELECT COUNT(*) FROM emprestimos WHERE status = 'devolvido') as emprestimos_concluidos,
                (SELECT COUNT(*) FROM emprestimos WHERE DATEDIFF(CURDATE(), data_prevista_devolucao) > 0 AND status = 'ativo') as emprestimos_atrasados,
                (SELECT COUNT(*) FROM reservas WHERE status = 'aguardando') as reservas_ativas,
                (SELECT COUNT(*) FROM resenhas) as total_resenhas,
                (SELECT AVG(rating) FROM resenhas) as media_avaliacoes
        `);
        
        // Livros mais emprestados
        const [topBooks] = await connection.execute(`
            SELECT l.title, l.author, COUNT(e.id) as total_emprestimos
            FROM livros l
            JOIN emprestimos e ON l.id = e.bookId
            GROUP BY l.id
            ORDER BY total_emprestimos DESC
            LIMIT 10
        `);
        
        // Usuários mais ativos
        const [topUsers] = await connection.execute(`
            SELECT u.nome, u.livros_lidos, COUNT(e.id) as total_emprestimos
            FROM usuarios u
            LEFT JOIN emprestimos e ON u.cpf = e.cpf
            WHERE u.tipo = 'leitor'
            GROUP BY u.cpf
            ORDER BY total_emprestimos DESC
            LIMIT 10
        `);
        
        // Empréstimos por mês (últimos 6 meses)
        const [monthlyLoans] = await connection.execute(`
            SELECT 
                DATE_FORMAT(data_retirada, '%Y-%m') as mes,
                COUNT(*) as total
            FROM emprestimos
            WHERE data_retirada >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(data_retirada, '%Y-%m')
            ORDER BY mes DESC
        `);
        
        res.json({
            stats: stats[0],
            topBooks,
            topUsers,
            monthlyLoans
        });
        
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});


app.post('/api/admin/test-route', (req, res) => {
    console.log('ROTA DE TESTE FUNCIONOU!');
    res.json({ message: 'Rota funcionando!' });
});

// Cancelar empréstimo expirado
app.post('/api/admin/cancel-expired-loan', isAuthenticated, isAdmin, async (req, res) => {
    const { bookId, cpf } = req.body;
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Deletar empréstimo
        const [result] = await connection.execute(
            'DELETE FROM emprestimos WHERE bookId = ? AND cpf = ? AND status = "ativo"',
            [bookId, cpf]
        );
        
        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Empréstimo não encontrado' });
        }
        
        // Verificar próximo na fila
        const [nextInQueue] = await connection.execute(
            'SELECT cpf FROM reservas WHERE bookId = ? AND status = "aguardando" ORDER BY posicao ASC LIMIT 1',
            [bookId]
        );
        
        if (nextInQueue.length > 0) {
            const nextUserCpf = nextInQueue[0].cpf;
            
            // Notificar próximo
            await connection.execute(
                'UPDATE reservas SET status = "notificado", data_notificacao = NOW() WHERE bookId = ? AND cpf = ?',
                [bookId, nextUserCpf]
            );
            
            await connection.execute(
                'INSERT INTO notificacoes (cpf, tipo, titulo, mensagem) VALUES (?, "reserva", "Livro Disponível!", "O livro que você reservou está disponível.")',
                [nextUserCpf]
            );
        }
        
        await connection.commit();
        res.json({ message: 'Empréstimo cancelado e próximo usuário notificado!' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao cancelar empréstimo:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});
// ================================
// ROTAS DE RECUPERAÇÃO DE SENHA
// ================================

const crypto = require('crypto');

// Rota: Solicitar recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
    const { cpf } = req.body;
    
    console.log('=== SOLICITAÇÃO DE RECUPERAÇÃO DE SENHA ===');
    console.log('CPF recebido:', cpf);
    
    if (!cpf) {
        return res.status(400).json({ error: 'CPF é obrigatório' });
    }
    
    const cpfLimpo = cleanCPF(cpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar usuário pelo CPF
        const [users] = await connection.execute(
            'SELECT id, nome, email, cpf FROM usuarios WHERE cpf = ?',
            [cpfLimpo]
        );
        
        // Por segurança, sempre retornar sucesso mesmo se o CPF não existir
        if (users.length === 0) {
            console.log('⚠️ Tentativa de recuperação para CPF não cadastrado:', cpfLimpo);
            return res.json({ 
                message: 'Se o CPF estiver cadastrado, você receberá um email com instruções.' 
            });
        }
        
        const user = users[0];
        
        // Gerar token único
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // Token expira em 1 hora
        
        // Salvar token no banco de dados
        await connection.execute(
            'INSERT INTO password_reset_tokens (cpf, token, expira_em) VALUES (?, ?, ?)',
            [cpfLimpo, token, expiresAt]
        );
        
        // Criar link de recuperação
        const resetLink = `http://localhost:5173/#reset-password?token=${token}`;
        
        // Montar HTML do email
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                    .header { background-color: #434E70; color: #ffffff; padding: 30px; text-align: center; }
                    .content { padding: 30px; color: #333333; line-height: 1.6; }
                    .button { display: inline-block; background-color: #9bb4ff; color: #ffffff !important; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; margin: 20px 0; }
                    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
                    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Recuperação de Senha</h1>
                        <p>LibRain - Sistema de Biblioteca</p>
                    </div>
                    <div class="content">
                        <p>Olá, <strong>${user.nome}</strong>!</p>
                        <p>Recebemos uma solicitação para redefinir a senha da sua conta no LibRain.</p>
                        <p>Clique no botão abaixo para criar uma nova senha:</p>
                        <div style="text-align: center;">
                            <a href="${resetLink}" class="button">Redefinir Minha Senha</a>
                        </div>
                        <div class="warning">
                            <strong>⏰ Atenção:</strong> Este link expira em <strong>1 hora</strong>.
                        </div>
                        <p>Ou copie e cole este link no seu navegador:</p>
                        <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">
                            ${resetLink}
                        </p>
                        <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                        <p style="font-size: 14px; color: #6c757d;">
                            <strong>Não solicitou esta alteração?</strong><br>
                            Se você não fez esta solicitação, ignore este email. Sua senha permanecerá a mesma.
                        </p>
                    </div>
                    <div class="footer">
                        <p>Este é um email automático. Por favor, não responda.</p>
                        <p>© ${new Date().getFullYear()} LibRain - Todos os direitos reservados</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Enviar email
        console.log(`📧 Enviando email para: ${user.email}`);
        const emailResult = await enviarEmail(
            user.email,
            '🔐 Recuperação de Senha - LibRain',
            emailHtml
        );
        
        if (emailResult.success) {
            console.log('✅ Email enviado com sucesso!');
            res.json({ 
                message: 'Email de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam.'
            });
        } else {
            console.error('❌ Falha ao enviar email:', emailResult.error);
            res.json({ 
                message: 'Solicitação processada. Se o CPF estiver cadastrado, você receberá um email.'
            });
        }
        
    } catch (error) {
        console.error('Erro ao processar recuperação:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Rota: Redefinir senha com token
app.post('/api/reset-password', async (req, res) => {
    const { token, novaSenha } = req.body;
    
    console.log('=== REDEFINIÇÃO DE SENHA ===');
    
    if (!token || !novaSenha) {
        return res.status(400).json({ 
            error: 'Token e nova senha são obrigatórios' 
        });
    }
    
    if (novaSenha.length < 6) {
        return res.status(400).json({ 
            error: 'A senha deve ter no mínimo 6 caracteres' 
        });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Buscar token válido
        const [tokenData] = await connection.execute(
            `SELECT cpf FROM password_reset_tokens 
             WHERE token = ? AND usado = FALSE AND expira_em > NOW()`,
            [token]
        );
        
        if (tokenData.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Token inválido ou expirado' 
            });
        }
        
        const cpf = tokenData[0].cpf;
        
        // Hash da nova senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(novaSenha, salt);
        
        // Atualizar senha
        await connection.execute(
            'UPDATE usuarios SET senha_hash = ?, data_atualizacao = NOW() WHERE cpf = ?',
            [senhaHash, cpf]
        );
        
        // Marcar token como usado
        await connection.execute(
            'UPDATE password_reset_tokens SET usado = TRUE WHERE token = ?',
            [token]
        );
        
        await connection.commit();
        
        console.log('✅ Senha redefinida com sucesso');
        
        res.json({ message: 'Senha alterada com sucesso! Você já pode fazer login.' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao redefinir senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTA DE ALTERAÇÃO DE NOME
// ================================

app.put('/api/profile/name', isAuthenticated, async (req, res) => {
    const { novoNome } = req.body;
    const userCpf = req.session.user.cpf;
    
    if (!novoNome || !novoNome.trim()) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    if (novoNome.trim().length < 3) {
        return res.status(400).json({ error: 'Nome deve ter no mínimo 3 caracteres' });
    }
    
    if (novoNome.trim().length > 255) {
        return res.status(400).json({ error: 'Nome deve ter no máximo 255 caracteres' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [result] = await connection.execute(
            'UPDATE usuarios SET nome = ?, data_atualizacao = NOW() WHERE cpf = ?',
            [novoNome.trim(), userCpf]
        );
        
        if (result.affectedRows > 0) {
            // Atualizar sessão
            req.session.user.nome = novoNome.trim();
            
            res.json({ 
                message: 'Nome atualizado com sucesso!',
                nome: novoNome.trim()
            });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao atualizar nome:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// TESTE DE CONEXÃO
// ================================

app.get('/api/test-connection', async (req, res) => {
    let connection;
    let count = null;
    let totalBooks = 'N/A';
    let tablesExist = false;
    
    try {
        console.log('=== TESTE DE CONEXÃO ===');
        console.log('Config do banco:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            hasPassword: !!dbConfig.password
        });
        
        connection = await pool.getConnection();
        console.log('Conexão obtida com sucesso');
        
        // Testar query simples
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('Query de teste executada:', rows);
        
        // Testar se a tabela livros existe
        const [tables] = await connection.execute('SHOW TABLES LIKE "livros"');
        tablesExist = tables.length > 0;
        console.log('Tabela livros existe:', tablesExist);
        
        if (tablesExist) {
            // Contar livros
            [count] = await connection.execute('SELECT COUNT(*) as total FROM livros');
            totalBooks = count[0].total;
            console.log('Total de livros na base:', totalBooks);
        }
        
        res.json({
            connection: 'OK',
            database: dbConfig.database,
            tablesExist: tablesExist,
            totalBooks: totalBooks
        });
        
    } catch (error) {
        console.error('=== ERRO NO TESTE DE CONEXÃO ===');
        console.error('Erro:', error);
        res.status(500).json({
            error: 'Erro de conexão',
            details: error.message,
            code: error.code,
            sqlState: error.sqlState
        });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/debug-books', async (req, res) => {
    let connection;
    let tables = []; 
    let count = null;
    let books = [];
    
    try {
        connection = await pool.getConnection();
        console.log('=== DEBUG LIVROS ===');
        
        // Verificar se tabela existe
        [tables] = await connection.execute("SHOW TABLES LIKE 'livros'");
        const tableExists = tables.length > 0;
        console.log('Tabela livros existe:', tableExists);
        
        if (tableExists) {
            // Verificar estrutura da tabela
            const [structure] = await connection.execute("DESCRIBE livros");
            console.log('Estrutura da tabela livros:');
            structure.forEach(col => console.log(`- ${col.Field}: ${col.Type}`));
            
            // Contar registros
            [count] = await connection.execute("SELECT COUNT(*) as total FROM livros");
            console.log('Total de livros:', count[0].total);
            
            // Buscar alguns livros
            [books] = await connection.execute("SELECT id, title, author FROM livros LIMIT 5");
            console.log('Primeiros 5 livros:', books);
        }
        
        res.json({
            tableExists: tableExists,
            totalBooks: tableExists ? count[0].total : 0,
            sampleBooks: books 
        });
        
    } catch (error) {
        console.error('Erro no debug:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ================================

app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({ 
        error: 'Erro interno do servidor'
    });
});

// ================================
// INICIALIZAÇÃO DO SERVIDOR
// ================================

createPool().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Rotas disponíveis:');
        console.log('- Autenticação: /api/login, /api/register, /api/logout');
        console.log('- Livros: /api/books, /api/books/:id');
        console.log('- Empréstimos: /api/loan/request, /api/loan/reserve, /api/loan/request-return');
        console.log('- Resenhas: /api/reviews, /api/reviews/:bookId');
        console.log('- Favoritos: /api/favorites');
        console.log('- Prateleiras: /api/user/shelves');
        console.log('- Admin: /api/admin/*');
        console.log('- Dashboard: /api/user/dashboard');
        console.log('- Perfil: /api/profile');
    });
}).catch(err => {
    console.error('Falha ao iniciar o servidor:', err);
    process.exit(1);
});