const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});


// ================================
// TESTE CRÍTICO DE ROTAS
// ================================
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

console.log('🔍 Registrando rota de teste...');

app.get('/api/test-simple', (req, res) => {
    console.log('✅ Rota de teste chamada!');
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando!',
        timestamp: new Date().toISOString()
    });
});

console.log('✅ Rota de teste registrada');

// ✅ CONFIGURAR IMAGENS - APENAS UMA VEZ
app.use('/book-covers', express.static(path.join(__dirname, '../public/book-covers')));
console.log('📂 Servindo imagens de:', path.join(__dirname, '../public/book-covers'));

// DEPOIS vêm as outras configurações
app.use(express.json({ limit: 'Infinity' }));
app.use(express.urlencoded({ limit: 'Infinity', extended: true }));
app.use(express.static('public'));


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
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Permitir requisições sem origin (como mobile apps ou curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
    host: process.env.MYSQLHOST || 'localhost',
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'librain'
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


// 🆕 LISTAR TODOS OS LIVROS
app.get('/api/books', async (req, res) => {
    console.log('📚 GET /api/books - Buscando todos os livros');
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [books] = await connection.execute(`
            SELECT 
                l.*,
                CASE 
                    WHEN e.id IS NOT NULL AND e.status IN ('ativo', 'aguardando_retirada') THEN false
                    ELSE true 
                END as available
            FROM livros l
            LEFT JOIN emprestimos e ON l.id = e.bookId 
                AND e.status IN ('ativo', 'aguardando_retirada')
            ORDER BY l.title ASC
        `);
        
        const formattedBooks = books.map(book => ({
            ...book,
            available: book.available === 1 || book.available === true
        }));
        
        console.log(`✅ Retornando ${formattedBooks.length} livros`);
        res.json(formattedBooks);
        
    } catch (error) {
        console.error('❌ Erro ao buscar livros:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});


app.get('/api/books/:id/user-status', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const userCpf = req.session.user.cpf;
    
    console.log('🔍 === VERIFICANDO STATUS DO USUÁRIO ===');
    console.log('BookId:', id, 'CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // 1️⃣ Buscar empréstimo ativo/aguardando do usuário para este livro
        const [emprestimo] = await connection.execute(`
            SELECT id, status, data_retirada, data_prevista_devolucao,
                   DATE_FORMAT(data_retirada, '%d/%m/%Y') as data_formatada,
                   DATE_FORMAT(data_prevista_devolucao, '%d/%m/%Y') as data_devolucao_formatada
            FROM emprestimos 
            WHERE bookId = ? AND cpf = ? 
            AND status IN ('aguardando_retirada', 'ativo', 'pendente_devolucao')
            ORDER BY data_retirada DESC 
            LIMIT 1
        `, [id, userCpf]);
        
        console.log('📊 Empréstimo ativo encontrado:', emprestimo.length > 0 ? emprestimo[0] : 'nenhum');
        
        // 2️⃣ Buscar reserva na fila
        const [reserva] = await connection.execute(`
            SELECT posicao 
            FROM reservas 
            WHERE bookId = ? AND cpf = ? AND status = 'aguardando'
        `, [id, userCpf]);
        
        console.log('📋 Reserva encontrada:', reserva.length > 0 ? `posição ${reserva[0]?.posicao}` : 'nenhuma');
        
        // 3️⃣ Buscar último empréstimo devolvido e seu status de leitura
        const [ultimaDevolucao] = await connection.execute(`
            SELECT status_leitura, DATE_FORMAT(data_real_devolucao, '%d/%m/%Y') as data_devolucao
            FROM emprestimos 
            WHERE bookId = ? AND cpf = ? AND status = 'devolvido'
            ORDER BY data_real_devolucao DESC 
            LIMIT 1
        `, [id, userCpf]);
        
        console.log('📖 Última devolução:', ultimaDevolucao.length > 0 ? ultimaDevolucao[0] : 'nenhuma');
        
        // 4️⃣ Determinar flags booleanas baseadas no status
        let response = {
            isAwaitingPickup: false,
            isActive: false,
            isPendingReturn: false,
            isInQueue: false,
            queuePosition: 0,
            loanDate: null,
            returnDate: null, // ✅ IMPORTANTE: Inicializar como null
            hasReturnedBefore: false,
            lastLoanStatus: null
        };
        
        // Se tem empréstimo ativo/pendente
        if (emprestimo.length > 0) {
            const status = emprestimo[0].status;
            
            if (status === 'aguardando_retirada') {
                response.isAwaitingPickup = true;
                response.loanDate = emprestimo[0].data_formatada;
                console.log('✅ Status: AGUARDANDO RETIRADA');
            } 
            else if (status === 'ativo') {
                response.isActive = true;
                response.loanDate = emprestimo[0].data_formatada;
                response.returnDate = emprestimo[0].data_devolucao_formatada; // ✅ Data do empréstimo ATIVO
                console.log('✅ Status: ATIVO - Devolução:', emprestimo[0].data_devolucao_formatada);
            } 
            else if (status === 'pendente_devolucao') {
                response.isPendingReturn = true;
                response.loanDate = emprestimo[0].data_formatada;
                console.log('✅ Status: PENDENTE DEVOLUÇÃO');
            }
        }
        
        // Se tem reserva
        if (reserva.length > 0) {
            response.isInQueue = true;
            response.queuePosition = reserva[0].posicao;
            console.log('✅ Status: NA FILA - Posição', reserva[0].posicao);
        }
        
        // ✅ CORREÇÃO: Se já devolveu antes (mas NÃO sobrescrever returnDate de empréstimo ativo)
        if (ultimaDevolucao.length > 0) {
            response.hasReturnedBefore = true;
            response.lastLoanStatus = ultimaDevolucao[0].status_leitura;
            
            // ⚠️ IMPORTANTE: Só preencher returnDate se NÃO tiver empréstimo ativo
            if (!response.returnDate) {
                response.returnDate = ultimaDevolucao[0].data_devolucao;
            }
            
            console.log('✅ Já devolveu antes - Status de leitura:', ultimaDevolucao[0].status_leitura);
        }
        
        console.log('📤 Resposta final:', response);
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            isAwaitingPickup: false,
            isActive: false,
            isPendingReturn: false,
            isInQueue: false,
            queuePosition: 0,
            hasReturnedBefore: false,
            lastLoanStatus: null,
            returnDate: null
        });
    } finally {
        if (connection) connection.release();
    }
});


app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // ✅ CORRIGIDO: Inclui ambos os status que tornam o livro indisponível
        const [bookRows] = await connection.execute(`
            SELECT 
                l.*,
                CASE 
                    WHEN e.id IS NOT NULL AND e.status IN ('ativo', 'aguardando_retirada') THEN false
                    ELSE true 
                END as available,
                e.cpf as emprestadoPara,
                e.status as emprestimoStatus,
                DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as returnDate
            FROM livros l
            LEFT JOIN emprestimos e ON l.id = e.bookId 
                AND e.status IN ('ativo', 'aguardando_retirada')
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
        
        console.log(`📚 Livro ${id}: disponível=${book.available}, status_emprestimo=${book.emprestimoStatus || 'nenhum'}`);
        
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
    console.log('\n========================================');
    console.log('🔥 NOVA SOLICITAÇÃO DE EMPRÉSTIMO');
    console.log('========================================');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User CPF:', req.session.user?.cpf);
    console.log('Body recebido:', JSON.stringify(req.body));
    
    const { bookId } = req.body;
    const userCpf = req.session.user.cpf;
    
    // Validação inicial
    if (!bookId) {
        console.log('❌ ERRO: BookId não fornecido');
        return res.status(400).json({ error: 'ID do livro é obrigatório' });
    }
    
    const bookIdInt = parseInt(bookId);
    if (isNaN(bookIdInt)) {
        console.log('❌ ERRO: BookId inválido:', bookId);
        return res.status(400).json({ error: 'ID do livro inválido' });
    }
    
    console.log('✅ Validações OK - BookId:', bookIdInt, 'CPF:', userCpf);
    
    let connection;
    try {
        console.log('📡 Obtendo conexão do pool...');
        connection = await pool.getConnection();
        console.log('✅ Conexão obtida');
        
        console.log('🔄 Iniciando transação...');
        await connection.beginTransaction();
        console.log('✅ Transação iniciada');
        
        // 1️⃣ Verificar limite de empréstimos
        console.log('📊 Verificando limite de empréstimos ativos...');
        const [activeLoans] = await connection.execute(
            'SELECT COUNT(*) as total FROM emprestimos WHERE cpf = ? AND status IN ("ativo", "aguardando_retirada")',
            [userCpf]
        );
        console.log('Total de empréstimos ativos:', activeLoans[0].total);
        
        if (activeLoans[0].total >= 3) {
            console.log('❌ LIMITE ATINGIDO: Usuário já tem 3 empréstimos');
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Você atingiu o limite de 3 empréstimos simultâneos.' 
            });
        }
        console.log('✅ Limite OK');
        
        // 2️⃣ Verificar se o livro existe
        console.log('📚 Verificando se o livro existe...');
        const [bookRows] = await connection.execute(
            'SELECT id, title FROM livros WHERE id = ?', 
            [bookIdInt]
        );
        
        if (bookRows.length === 0) {
            console.log('❌ ERRO: Livro não encontrado no DB');
            await connection.rollback();
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        console.log('✅ Livro encontrado:', bookRows[0].title);
        
        // 3️⃣ Verificar se já existe empréstimo ativo
        console.log('🔍 Verificando empréstimos ativos do livro...');
        const [existingLoans] = await connection.execute(
            'SELECT id, cpf, status FROM emprestimos WHERE bookId = ? AND status IN ("ativo", "aguardando_retirada")', 
            [bookIdInt]
        );
        
        if (existingLoans.length > 0) {
            console.log('❌ CONFLITO: Livro já tem empréstimo ativo');
            console.log('Detalhes:', existingLoans[0]);
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Este livro já está emprestado ou aguardando aprovação' 
            });
        }
        console.log('✅ Livro disponível para empréstimo');
        
        // 4️⃣ Criar empréstimo
        console.log('💾 Criando registro de empréstimo...');
        const dataRetirada = new Date();
        const dataPrevisaDevolucao = new Date();
        dataPrevisaDevolucao.setDate(dataRetirada.getDate() + 14);
        
        console.log('Data retirada:', dataRetirada.toISOString());
        console.log('Data prevista devolução:', dataPrevisaDevolucao.toISOString());
        
        const [insertResult] = await connection.execute(`
            INSERT INTO emprestimos (bookId, cpf, data_retirada, data_prevista_devolucao, status) 
            VALUES (?, ?, ?, ?, 'aguardando_retirada')
        `, [bookIdInt, userCpf, dataRetirada, dataPrevisaDevolucao]);
        
        console.log('✅ Empréstimo criado - ID:', insertResult.insertId);
        
        console.log('🔄 Commitando transação...');
        await connection.commit();
        console.log('✅ TRANSAÇÃO COMMITADA COM SUCESSO');
        
        console.log('📤 Enviando resposta de sucesso...');
        res.status(200).json({ 
            message: '📚 Empréstimo solicitado! Aguardando aprovação do bibliotecário.',
            loanId: insertResult.insertId
        });
        console.log('✅ Resposta enviada com sucesso');
        console.log('========================================\n');
        
    } catch (error) {
        console.error('\n❌ ========== ERRO CAPTURADO ==========');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Tipo:', error.constructor.name);
        console.error('Mensagem:', error.message);
        console.error('Código:', error.code);
        console.error('SQL State:', error.sqlState);
        console.error('SQL Message:', error.sqlMessage);
        console.error('Stack:', error.stack);
        console.error('=====================================\n');
        
        if (connection) {
            console.log('🔄 Fazendo rollback...');
            try {
                await connection.rollback();
                console.log('✅ Rollback executado');
            } catch (rollbackError) {
                console.error('❌ Erro no rollback:', rollbackError.message);
            }
        }
        
        // Resposta de erro detalhada
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: error.code
        });
    } finally {
        if (connection) {
            console.log('🔓 Liberando conexão...');
            connection.release();
            console.log('✅ Conexão liberada');
        }
    }
});

console.log('✅ Rota /api/loan/request registrada com debug detalhado');


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
        
        // 1️⃣ Tentar cancelar empréstimo aguardando retirada
        const [emprestimo] = await connection.execute(
            'DELETE FROM emprestimos WHERE bookId = ? AND cpf = ? AND status = "aguardando_retirada"',
            [bookId, userCpf]
        );
        
        if (emprestimo.affectedRows > 0) {
            console.log('✅ Empréstimo aguardando retirada cancelado');
            await connection.commit();
            return res.json({ message: 'Solicitação cancelada com sucesso!' });
        }
        
        // 2️⃣ Se não achou empréstimo, tentar cancelar reserva
        const [reserva] = await connection.execute(
            'DELETE FROM reservas WHERE bookId = ? AND cpf = ? AND status = "aguardando"',
            [bookId, userCpf]
        );
        
        if (reserva.affectedRows > 0) {
            console.log('✅ Reserva cancelada');
            
            // Reordenar fila
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
            return res.json({ message: 'Reserva cancelada com sucesso!' });
        }
        
        // 3️⃣ Não encontrou nada
        await connection.rollback();
        console.log('❌ Nenhuma solicitação encontrada');
        res.status(404).json({ error: 'Nenhuma solicitação ativa encontrada' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Erro ao cancelar:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }


});app.post('/api/loan/mark-read', isAuthenticated, async (req, res) => {
    const { bookId, status } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== MARCAR COMO LIDO (Corrigido) ===');
    
    if (!['lido', 'nao_terminado'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        
        const [emprestimo] = await connection.execute(
            `SELECT id, status_leitura FROM emprestimos 
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

        await connection.execute(
            'UPDATE emprestimos SET status_leitura = ?, data_marcado_lido = ? WHERE id = ?',
            [status, status === 'lido' ? new Date() : null, emprestimoId]
        );
        
        await connection.commit();
        
        res.json({ 
            message: status === 'lido' ? 
                'Parabéns por terminar o livro! 🎉' : 
                'Status atualizado!' 
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Erro ao marcar status:', error);
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

// POST - Criar resenha
app.post('/api/reviews', isAuthenticated, async (req, res) => {
    const { bookId, text, rating } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('=== RECEBENDO RESENHA ===');
    console.log('Body:', req.body);
    console.log('User CPF:', userCpf);
    
    if (!bookId || !rating) {
        return res.status(400).json({ error: 'BookId e rating são obrigatórios' });
    }
    
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ error: 'Rating deve ser um número entre 1 e 5' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
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
        
        console.log('✅ Resenha salva com sucesso');
        res.status(200).json({ message: 'Resenha adicionada com sucesso!' });
        
    } catch (error) {
        console.error('❌ Erro ao adicionar resenha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// GET - Buscar resenhas de um livro
app.get('/api/reviews/:bookId', async (req, res) => {
    const { bookId } = req.params;
    
    console.log('📚 Buscando resenhas do livro:', bookId);
    
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
        
        const formattedReviews = reviews.map(review => ({
            id: review.id,
            bookId: review.bookId,
            cpf: review.cpf,
            rating: review.rating,
            text: review.text,
            date: review.formatted_date,
            user: review.user_name
        }));
        
        console.log(`✅ Encontradas ${formattedReviews.length} resenhas`);
        res.json(formattedReviews);
        
    } catch (error) {
        console.error('❌ Erro ao buscar resenhas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// PUT - Atualizar resenha
app.put('/api/reviews/:reviewId', isAuthenticated, async (req, res) => {
    const { reviewId } = req.params;
    const { text, rating } = req.body;
    const userCpf = req.session.user.cpf;
    
    console.log('📝 === EDITAR RESENHA ===');
    console.log('ReviewId:', reviewId, 'Rating:', rating);
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [review] = await connection.execute(
            'SELECT cpf FROM resenhas WHERE id = ?',
            [reviewId]
        );
        
        if (review.length === 0) {
            return res.status(404).json({ error: 'Resenha não encontrada' });
        }
        
        if (cleanCPF(review[0].cpf) !== cleanCPF(userCpf)) {
            return res.status(403).json({ error: 'Sem permissão para editar' });
        }
        
        await connection.execute(
            'UPDATE resenhas SET text = ?, rating = ?, date = NOW() WHERE id = ?',
            [text || '', rating, reviewId]
        );
        
        console.log('✅ Resenha atualizada');
        res.json({ message: 'Resenha atualizada com sucesso!' });
        
    } catch (error) {
        console.error('❌ Erro ao atualizar resenha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// DELETE - Deletar resenha (DEVE VIR POR ÚLTIMO)
app.delete('/api/reviews/:reviewId', isAuthenticated, async (req, res) => {
    const { reviewId } = req.params;
    const userCpf = req.session.user.cpf;
    
    console.log('🗑️ === DELETAR RESENHA ===');
    console.log('ReviewId:', reviewId);
    console.log('User CPF:', userCpf);
    
    if (!reviewId || isNaN(reviewId)) {
        console.log('❌ ReviewId inválido');
        return res.status(400).json({ error: 'ID da resenha inválido' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar resenha
        const [review] = await connection.execute(
            'SELECT id, cpf, bookId FROM resenhas WHERE id = ?',
            [reviewId]
        );
        
        console.log('📊 Resenha encontrada?', review.length > 0);
        
        if (review.length === 0) {
            console.log('❌ Resenha não existe');
            return res.status(404).json({ error: 'Resenha não encontrada' });
        }
        
        // Comparar CPFs
        const reviewCpf = cleanCPF(review[0].cpf);
        const sessionCpf = cleanCPF(userCpf);
        
        console.log('🔍 Review CPF:', reviewCpf);
        console.log('🔍 Session CPF:', sessionCpf);
        console.log('🔍 Match?', reviewCpf === sessionCpf);
        
        if (reviewCpf !== sessionCpf) {
            console.log('❌ Sem permissão');
            return res.status(403).json({ 
                error: 'Você não tem permissão para excluir esta resenha' 
            });
        }
        
        // Deletar
        const [deleteResult] = await connection.execute(
            'DELETE FROM resenhas WHERE id = ?',
            [reviewId]
        );
        
        console.log('🗑️ Linhas deletadas:', deleteResult.affectedRows);
        
        if (deleteResult.affectedRows === 0) {
            return res.status(500).json({ error: 'Erro ao excluir' });
        }
        
        console.log('✅ Resenha deletada com sucesso!');
        res.status(200).json({ 
            message: 'Resenha excluída com sucesso!',
            deletedId: reviewId 
        });
        
    } catch (error) {
        console.error('❌ ERRO AO EXCLUIR:', error.message);
        res.status(500).json({ 
            error: 'Erro interno do servidor'
        });
    } finally {
        if (connection) connection.release();
    }
});

console.log('✅ Rotas de resenhas registradas (POST, GET, PUT, DELETE)');

// ================================
// TESTE DE ROTAS - TEMPORÁRIO
// ================================

app.get('/api/test-routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        }
    });
    res.json(routes.filter(r => r.path && r.path.includes('/api/reviews')));
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
    
    console.log('=== GET PRATELEIRAS ===');
    console.log('User CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar estrutura da tabela
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'prateleiras'
        `);
        
        console.log('📋 Colunas da tabela prateleiras:', columns.map(c => c.COLUMN_NAME));
        
        // Determinar qual coluna de CPF usar
        let cpfColumn = 'cpf'; // padrão
        if (columns.some(c => c.COLUMN_NAME === 'user_cpf')) {
            cpfColumn = 'user_cpf';
        } else if (columns.some(c => c.COLUMN_NAME === 'cpf_usuario')) {
            cpfColumn = 'cpf_usuario';
        }
        
        console.log('✅ Usando coluna de CPF:', cpfColumn);
        
        // Buscar prateleiras do usuário
        const [shelves] = await connection.execute(`
            SELECT p.*, GROUP_CONCAT(pl.bookId) as book_ids
            FROM prateleiras p
            LEFT JOIN prateleira_livros pl ON p.id = pl.prateleira_id
            WHERE p.${cpfColumn} = ?
            GROUP BY p.id
        `, [userCpf]);
        
        console.log('📚 Prateleiras encontradas:', shelves.length);
        
        // Formatar resposta
        const formattedShelves = shelves.map(shelf => {
            console.log('Prateleira:', {
                id: shelf.id,
                nome: shelf.nome_prateleira,
                cpf: shelf[cpfColumn],
                book_ids: shelf.book_ids
            });
            
            return {
                id: shelf.id,
                name: shelf.nome_prateleira,
                nome_prateleira: shelf.nome_prateleira,
                user_cpf: shelf[cpfColumn],
                cpf: shelf[cpfColumn],
                books: shelf.book_ids ? shelf.book_ids.split(',').map(id => parseInt(id)) : []
            };
        });
        
        console.log('✅ Retornando', formattedShelves.length, 'prateleiras');
        res.json(formattedShelves);
        
    } catch (error) {
        console.error('❌ Erro ao buscar prateleiras:', error);
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

app.get('/api/user/shelves', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    console.log('=== GET PRATELEIRAS ===');
    console.log('User CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar estrutura da tabela
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'prateleiras'
        `);
        
        console.log('📋 Colunas da tabela prateleiras:', columns.map(c => c.COLUMN_NAME));
        
        // Determinar qual coluna de CPF usar
        let cpfColumn = 'cpf'; // padrão
        if (columns.some(c => c.COLUMN_NAME === 'user_cpf')) {
            cpfColumn = 'user_cpf';
        } else if (columns.some(c => c.COLUMN_NAME === 'cpf_usuario')) {
            cpfColumn = 'cpf_usuario';
        }
        
        console.log('✅ Usando coluna de CPF:', cpfColumn);
        
        // Buscar prateleiras do usuário
        const [shelves] = await connection.execute(`
            SELECT p.*, GROUP_CONCAT(pl.bookId) as book_ids
            FROM prateleiras p
            LEFT JOIN prateleira_livros pl ON p.id = pl.prateleira_id
            WHERE p.${cpfColumn} = ?
            GROUP BY p.id
        `, [userCpf]);
        
        console.log('📚 Prateleiras encontradas:', shelves.length);
        
        // Formatar resposta
        const formattedShelves = shelves.map(shelf => {
            console.log('Prateleira:', {
                id: shelf.id,
                nome: shelf.nome_prateleira,
                cpf: shelf[cpfColumn],
                book_ids: shelf.book_ids
            });
            
            return {
                id: shelf.id,
                name: shelf.nome_prateleira,
                nome_prateleira: shelf.nome_prateleira,
                user_cpf: shelf[cpfColumn],
                cpf: shelf[cpfColumn],
                books: shelf.book_ids ? shelf.book_ids.split(',').map(id => parseInt(id)) : []
            };
        });
        
        console.log('✅ Retornando', formattedShelves.length, 'prateleiras');
        res.json(formattedShelves);
        
    } catch (error) {
        console.error('❌ Erro ao buscar prateleiras:', error);
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
    
    console.log('📊 Dashboard solicitado para CPF:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // ✅ CORRIGIDO: Buscar AMBOS os status (ativo E aguardando_retirada)
        const [emprestados] = await connection.execute(`
            SELECT e.*, l.title, l.author, 
                   DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as data_devolucao_formatada
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            WHERE e.cpf = ? AND e.status IN ('ativo', 'aguardando_retirada')
            ORDER BY e.data_prevista_devolucao ASC
        `, [userCpf]);
        
        console.log(`📚 Empréstimos ativos/aguardando: ${emprestados.length}`);
        emprestados.forEach(emp => {
            console.log(`  - Livro ${emp.bookId} (${emp.title}): ${emp.status}`);
        });
        
        // Buscar reservas
        const [reservas] = await connection.execute(`
            SELECT r.*, l.title, l.author
            FROM reservas r
            JOIN livros l ON r.bookId = l.id
            WHERE r.cpf = ? AND r.status = 'aguardando'
            ORDER BY r.posicao ASC
        `, [userCpf]);
        
        console.log(`📋 Reservas ativas: ${reservas.length}`);
        
        // Buscar devoluções pendentes
        const [devolucoesPendentes] = await connection.execute(`
            SELECT e.*, l.title, l.author
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            WHERE e.cpf = ? AND e.status = 'pendente_devolucao'
            ORDER BY e.data_real_devolucao ASC
        `, [userCpf]);
        
        console.log(`📖 Devoluções pendentes: ${devolucoesPendentes.length}`);
        
        res.json({
            emprestados,
            reservas,
            devolucoesPendentes
        });
        
    } catch (error) {
        console.error('❌ Erro ao buscar dashboard:', error);
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
    
    console.log('=== BUSCANDO CONQUISTAS ===');
    console.log('CPF do usuário:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // 1️⃣ Buscar dados do usuário
        const [userData] = await connection.execute(
            'SELECT conquistas_desbloqueadas, livros_lidos FROM usuarios WHERE cpf = ?',
            [userCpf]
        );
        
        if (userData.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        console.log('📊 Dados do usuário:', {
            livros_lidos: userData[0].livros_lidos,
            conquistas_raw: userData[0].conquistas_desbloqueadas
        });
        
        // 2️⃣ Parse seguro das conquistas desbloqueadas
        let conquistasDesbloqueadas = [];
        
        try {
            const rawData = userData[0].conquistas_desbloqueadas;
            
            if (!rawData || rawData === 'null' || rawData === '') {
                conquistasDesbloqueadas = [];
            } else if (Array.isArray(rawData)) {
                conquistasDesbloqueadas = rawData;
            } else if (Buffer.isBuffer(rawData)) {
                const jsonStr = rawData.toString('utf8');
                conquistasDesbloqueadas = JSON.parse(jsonStr);
            } else if (typeof rawData === 'string') {
                conquistasDesbloqueadas = JSON.parse(rawData);
            } else if (typeof rawData === 'object') {
                conquistasDesbloqueadas = rawData;
            }
            
            // Garantir que é um array
            if (!Array.isArray(conquistasDesbloqueadas)) {
                conquistasDesbloqueadas = [];
            }
            
        } catch (parseError) {
            console.log('⚠️ Erro ao parsear conquistas, usando array vazio:', parseError.message);
            conquistasDesbloqueadas = [];
        }
        
        console.log('🎯 Conquistas desbloqueadas (IDs):', conquistasDesbloqueadas);
        
        // 3️⃣ Buscar todas as conquistas disponíveis
        const [allAchievements] = await connection.execute(
            'SELECT * FROM conquistas_disponiveis WHERE ativa = TRUE ORDER BY ordem_exibicao'
        );
        
        console.log('📚 Total de conquistas disponíveis:', allAchievements.length);
        
        // 4️⃣ Buscar estatísticas do usuário para calcular progresso
        const [stats] = await connection.execute(`
            SELECT 
                u.livros_lidos,
                (SELECT COUNT(*) FROM emprestimos WHERE cpf = u.cpf) as total_emprestimos,
                (SELECT COUNT(*) FROM resenhas WHERE cpf = u.cpf) as total_resenhas,
                DATEDIFF(CURDATE(), u.data_cadastro) as dias_cadastrado
            FROM usuarios u
            WHERE u.cpf = ?
        `, [userCpf]);
        
        const userStats = stats[0];
        console.log('📊 Estatísticas do usuário:', userStats);
        
        // 5️⃣ Montar array de conquistas com status
        const achievements = allAchievements.map(achievement => {
            const desbloqueada = conquistasDesbloqueadas.includes(achievement.id);
            
            // Calcular progresso atual
            let progressoAtual = 0;
            switch(achievement.condicao_tipo) {
                case 'livros_lidos':
                    progressoAtual = userStats.livros_lidos;
                    break;
                case 'emprestimos_realizados':
                    progressoAtual = userStats.total_emprestimos;
                    break;
                case 'resenhas_escritas':
                    progressoAtual = userStats.total_resenhas;
                    break;
                case 'dias_cadastrado':
                    progressoAtual = userStats.dias_cadastrado;
                    break;
            }
            
            const progressoPorcentagem = Math.min(100, Math.round((progressoAtual / achievement.condicao_valor) * 100));
            
            return {
                id: achievement.id,
                nome: achievement.nome,
                descricao: achievement.descricao,
                icone: achievement.icone || '🏆',
                condicao_tipo: achievement.condicao_tipo,
                condicao_valor: achievement.condicao_valor,
                desbloqueada: desbloqueada,
                progresso_atual: progressoAtual,
                progresso_porcentagem: progressoPorcentagem
            };
        });
        
        const totalDesbloqueadas = achievements.filter(a => a.desbloqueada).length;
        
        console.log('✅ Conquistas processadas:', {
            total: achievements.length,
            desbloqueadas: totalDesbloqueadas,
            bloqueadas: achievements.length - totalDesbloqueadas
        });
        
        res.json(achievements);
        
    } catch (error) {
        console.error('=== ERRO AO BUSCAR CONQUISTAS ===');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTA DE DEBUG PARA FORÇAR VERIFICAÇÃO
// ================================

app.post('/api/user/check-achievements', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    console.log('🔍 Verificando conquistas manualmente para:', userCpf);
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Chamar procedure de verificação
        await connection.execute('CALL VerificarConquistas(?)', [userCpf]);
        
        console.log('✅ Verificação concluída');
        
        res.json({ 
            message: 'Conquistas verificadas com sucesso!',
            info: 'Se você desbloqueou novas conquistas, elas aparecerão no seu perfil.'
        });
        
    } catch (error) {
        console.error('❌ Erro ao verificar conquistas:', error);
        res.status(500).json({ 
            error: 'Erro ao verificar conquistas',
            details: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});



// ================================
// ROTAS ADMIN
// ================================


app.get('/api/admin/achievements-debug', isAuthenticated, isAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Buscar estatísticas gerais
        const [conquistas] = await connection.execute(
            'SELECT * FROM conquistas_disponiveis ORDER BY ordem_exibicao'
        );
        
        const [usuarios] = await connection.execute(`
            SELECT 
                u.nome,
                u.cpf,
                u.livros_lidos,
                u.conquistas_desbloqueadas,
                JSON_LENGTH(COALESCE(u.conquistas_desbloqueadas, JSON_ARRAY())) as total_desbloqueadas,
                (SELECT COUNT(*) FROM emprestimos WHERE cpf = u.cpf) as total_emprestimos,
                (SELECT COUNT(*) FROM resenhas WHERE cpf = u.cpf) as total_resenhas
            FROM usuarios u
            WHERE u.tipo = 'leitor'
            ORDER BY total_desbloqueadas DESC
            LIMIT 10
        `);
        
        res.json({
            total_conquistas_disponiveis: conquistas.length,
            conquistas_ativas: conquistas.filter(c => c.ativa).length,
            top_usuarios: usuarios,
            todas_conquistas: conquistas
        });
        
    } catch (error) {
        console.error('Erro no debug:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

console.log('✅ Rotas de conquistas corrigidas e registradas');

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
    
    console.log('=== APROVANDO DEVOLUÇÃO ===');
    console.log('BookId:', bookId, 'CPF:', cpf);
    
    if (!bookId || !cpf) {
        return res.status(400).json({ error: 'BookId e CPF são obrigatórios' });
    }
    
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
            return res.status(404).json({ 
                error: 'Empréstimo pendente de devolução não encontrado' 
            });
        }
        
        console.log('✅ Devolução aprovada');
        
        // Verificar se há alguém na fila para este livro
        const [nextInQueue] = await connection.execute(`
            SELECT cpf FROM reservas 
            WHERE bookId = ? AND status = 'aguardando' 
            ORDER BY posicao ASC 
            LIMIT 1
        `, [bookId]);
        
        if (nextInQueue.length > 0) {
            const nextUserCpf = nextInQueue[0].cpf;
            
            console.log('📋 Próximo na fila:', nextUserCpf);
            
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
            
            console.log('✅ Próximo usuário notificado');
        }
        
        await connection.commit();
        res.status(200).json({ 
            message: 'Devolução aprovada com sucesso!' 
        });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Erro ao aprovar devolução:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
    } finally {
        if (connection) connection.release();
    }
});

// ================================
// ROTA: CONFIRMAR RETIRADA (VERIFICAR SE EXISTE)
// ================================

app.post('/api/admin/confirm-pickup', isAuthenticated, isAdmin, async (req, res) => {
    const { bookId, cpf } = req.body;
    
    console.log('=== CONFIRMANDO RETIRADA ===');
    console.log('BookId:', bookId, 'CPF:', cpf);
    
    if (!bookId || !cpf) {
        return res.status(400).json({ error: 'BookId e CPF são obrigatórios' });
    }
    
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
        console.error('❌ Erro ao confirmar retirada:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            details: error.message 
        });
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
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    
    if (err.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
            error: 'Banco de dados indisponível' 
        });
    }
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        return res.status(500).json({ 
            error: 'Erro de autenticação no banco de dados' 
        });
    }
    
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

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
