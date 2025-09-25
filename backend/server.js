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
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit
        });
        console.log('Pool de conexões MySQL criado.');
        
        // Testar conexão
        const connection = await pool.getConnection();
        console.log('Conexão com banco de dados estabelecida com sucesso');
        connection.release();
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
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Query complexa para obter informações completas dos livros
        const [rows] = await connection.execute(`
            SELECT 
                l.*,
                CASE WHEN e.id IS NULL THEN true ELSE false END as available,
                e.cpf as emprestadoPara,
                DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as returnDate,
                COUNT(DISTINCT r.id) as reviewCount,
                AVG(r.rating) as avgRating
            FROM livros l 
            LEFT JOIN emprestimos e ON l.id = e.bookId AND e.status = 'ativo'
            LEFT JOIN resenhas r ON l.id = r.bookId
            GROUP BY l.id
            ORDER BY l.title
        `);
        
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
        
        // Buscar livro com informações de empréstimo e fila
        const [bookRows] = await connection.execute(`
            SELECT l.*, 
                   CASE WHEN e.id IS NULL THEN true ELSE false END as available,
                   e.cpf as emprestadoPara,
                   DATE_FORMAT(e.data_prevista_devolucao, '%d/%m/%Y') as returnDate,
                   GROUP_CONCAT(DISTINCT r.cpf ORDER BY r.posicao) as queue
            FROM livros l 
            LEFT JOIN emprestimos e ON l.id = e.bookId AND e.status = 'ativo'
            LEFT JOIN reservas r ON l.id = r.bookId AND r.status = 'aguardando'
            WHERE l.id = ?
            GROUP BY l.id
        `, [id]);
        
        if (bookRows.length > 0) {
            const book = bookRows[0];
            // Converter queue string em array
            book.queue = book.queue ? book.queue.split(',') : [];
            res.json(book);
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
// ROTAS DE EMPRÉSTIMO
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
        await connection.beginTransaction();
        
        // Verificar se o livro existe e está disponível
        const [bookRows] = await connection.execute(
            'SELECT * FROM livros WHERE id = ?', 
            [bookId]
        );
        
        if (bookRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        // Verificar se já existe empréstimo ativo para este livro
        const [activeLoans] = await connection.execute(
            'SELECT * FROM emprestimos WHERE bookId = ? AND status = "ativo"', 
            [bookId]
        );
        
        if (activeLoans.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Livro já está emprestado' });
        }
        
        // Verificar se o usuário já tem este livro emprestado
        const [userActiveLoans] = await connection.execute(
            'SELECT * FROM emprestimos WHERE cpf = ? AND bookId = ? AND status = "ativo"', 
            [userCpf, bookId]
        );
        
        if (userActiveLoans.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Você já tem este livro emprestado' });
        }
        
        // Criar empréstimo
        const dataRetirada = new Date();
        const dataPrevisaDevolucao = new Date();
        dataPrevisaDevolucao.setDate(dataRetirada.getDate() + 14); // 14 dias para devolver
        
        await connection.execute(`
            INSERT INTO emprestimos (bookId, cpf, data_retirada, data_prevista_devolucao, status) 
            VALUES (?, ?, ?, ?, 'ativo')
        `, [bookId, userCpf, dataRetirada, dataPrevisaDevolucao]);
        
        await connection.commit();
        res.status(200).json({ message: 'Empréstimo realizado com sucesso!' });
        
    } catch (error) {
        if (connection) await connection.rollback();
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
            res.status(200).json({ message: 'Solicitação de devolução enviada!' });
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
// ROTAS ADMIN
// ================================

app.get('/api/admin/devolucoes', isAuthenticated, isAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const [pendingReturns] = await connection.execute(`
            SELECT e.*, l.title, u.nome as user_name
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            JOIN usuarios u ON e.cpf = u.cpf
            WHERE e.status = 'pendente_devolucao'
            ORDER BY e.data_real_devolucao ASC
        `);
        
        res.json(pendingReturns);
        
    } catch (error) {
        console.error('Erro ao buscar devoluções:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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

        

        const [pendingReturns] = await connection.execute(`

            SELECT e.*, l.title, u.nome as user_name

            FROM emprestimos e

            JOIN livros l ON e.bookId = l.id

            JOIN usuarios u ON e.cpf = u.cpf

            WHERE e.status = 'pendente_devolucao'

            ORDER BY e.data_real_devolucao ASC

        `);

        

        res.json(pendingReturns);

        

    } catch (error) {

        console.error('Erro ao buscar devoluÃ§Ãµes:', error);

        res.status(500).json({ error: 'Erro interno do servidor' });

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

        

        // Atualizar emprÃ©stimo para devolvido

        const [result] = await connection.execute(`

            UPDATE emprestimos 

            SET status = 'devolvido', data_real_devolucao = CURDATE()

            WHERE bookId = ? AND cpf = ? AND status = 'pendente_devolucao'

        `, [bookId, cpf]);

        

        if (result.affectedRows === 0) {

            await connection.rollback();

            return res.status(404).json({ error: 'EmprÃ©stimo nÃ£o encontrado' });

        }

        

        // Verificar se hÃ¡ alguÃ©m na fila para este livro

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

            

            // Criar notificaÃ§Ã£o

            await connection.execute(`

                INSERT INTO notificacoes (cpf, tipo, titulo, mensagem)

                VALUES (?, 'reserva', 'Livro DisponÃ­vel!', 

                        'O livro que vocÃª reservou estÃ¡ disponÃ­vel para retirada.')

            `, [nextUserCpf]);

        }

        

        await connection.commit();

        res.status(200).json({ message: 'DevoluÃ§Ã£o aprovada com sucesso!' });

        

    } catch (error) {

        if (connection) await connection.rollback();

        console.error('Erro ao aprovar devoluÃ§Ã£o:', error);

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

            SELECT id, nome, cpf, email, tipo, data_cadastro

            FROM usuarios

            ORDER BY nome ASC

        `);

        

        res.json(users);

        

    } catch (error) {

        console.error('Erro ao buscar usuÃ¡rios:', error);

        res.status(500).json({ error: 'Erro interno do servidor' });

    } finally {

        if (connection) connection.release();

    }

});

app.post('/api/admin/add-admin', isAuthenticated, isAdmin, async (req, res) => {

    const { cpf } = req.body;

    

    if (!cpf) {

        return res.status(400).json({ error: 'CPF Ã© obrigatÃ³rio' });

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

            res.status(200).json({ message: 'UsuÃ¡rio promovido a administrador com sucesso!' });

        } else {

            res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });

        }

        

    } catch (error) {

        console.error('Erro ao promover usuÃ¡rio:', error);

        res.status(500).json({ error: 'Erro interno do servidor' });

    } finally {

        if (connection) connection.release();

    }

});
// ================================
// ROTAS DE PERFIL MELHORADAS - Adicionar ao server.js
// ================================

// Rota para atualizar avatar do usuário
app.put('/api/profile/avatar', isAuthenticated, async (req, res) => {
    const { avatarUrl } = req.body;
    const userCpf = req.session.user.cpf;
    
    if (!avatarUrl) {
        return res.status(400).json({ error: 'URL do avatar é obrigatória' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Atualizar avatar no banco
        const [result] = await connection.execute(
            'UPDATE usuarios SET avatar_url = ?, data_atualizacao = NOW() WHERE cpf = ?',
            [avatarUrl, userCpf]
        );
        
        if (result.affectedRows > 0) {
            // Atualizar dados da sessão
            req.session.user.avatar_url = avatarUrl;
            
            res.status(200).json({ 
                message: 'Avatar atualizado com sucesso!',
                avatar_url: avatarUrl
            });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao atualizar avatar:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Rota para atualizar biografia do usuário
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

// Rota para atualizar dados gerais do perfil
app.put('/api/profile/update', isAuthenticated, async (req, res) => {
    const {
        nome, email, tel_residencial, tel_comercial, 
        endereco, numero, complemento, cep, cidade, estado
    } = req.body;
    const userCpf = req.session.user.cpf;
    
    // Validações básicas
    if (nome && nome.length < 3) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 3 caracteres' });
    }
    
    if (email && !email.match(/^\S+@\S+\.\S+$/)) {
        return res.status(400).json({ error: 'E-mail inválido' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar se email já existe para outro usuário
        if (email) {
            const [existingEmail] = await connection.execute(
                'SELECT id FROM usuarios WHERE email = ? AND cpf != ?',
                [email, userCpf]
            );
            
            if (existingEmail.length > 0) {
                return res.status(409).json({ error: 'Este e-mail já está em uso por outro usuário' });
            }
        }
        
        // Atualizar dados
        const updateFields = [];
        const updateValues = [];
        
        if (nome) {
            updateFields.push('nome = ?');
            updateValues.push(nome);
        }
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (tel_residencial !== undefined) {
            updateFields.push('tel_residencial = ?');
            updateValues.push(tel_residencial);
        }
        if (tel_comercial !== undefined) {
            updateFields.push('tel_comercial = ?');
            updateValues.push(tel_comercial);
        }
        if (endereco !== undefined) {
            updateFields.push('endereco = ?');
            updateValues.push(endereco);
        }
        if (numero !== undefined) {
            updateFields.push('numero = ?');
            updateValues.push(numero);
        }
        if (complemento !== undefined) {
            updateFields.push('complemento = ?');
            updateValues.push(complemento);
        }
        if (cep !== undefined) {
            updateFields.push('cep = ?');
            updateValues.push(cep);
        }
        if (cidade !== undefined) {
            updateFields.push('cidade = ?');
            updateValues.push(cidade);
        }
        if (estado !== undefined) {
            updateFields.push('estado = ?');
            updateValues.push(estado);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        
        updateFields.push('data_atualizacao = NOW()');
        updateValues.push(userCpf);
        
        const sql = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE cpf = ?`;
        const [result] = await connection.execute(sql, updateValues);
        
        if (result.affectedRows > 0) {
            // Atualizar dados da sessão se necessário
            if (nome) req.session.user.nome = nome;
            if (email) req.session.user.email = email;
            
            res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Rota para obter estatísticas detalhadas do usuário
app.get('/api/profile/stats', isAuthenticated, async (req, res) => {
    const userCpf = req.session.user.cpf;
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Estatísticas de empréstimos
        const [emprestimosStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_emprestimos,
                SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as emprestimos_ativos,
                SUM(CASE WHEN status = 'devolvido' THEN 1 ELSE 0 END) as emprestimos_devolvidos,
                SUM(CASE WHEN status = 'atrasado' THEN 1 ELSE 0 END) as emprestimos_atrasados
            FROM emprestimos WHERE cpf = ?
        `, [userCpf]);
        
        // Estatísticas de favoritos
        const [favoritosCount] = await connection.execute(
            'SELECT COUNT(*) as total_favoritos FROM favoritos WHERE cpf = ?',
            [userCpf]
        );
        
        // Estatísticas de resenhas
        const [resenhasStats] = await connection.execute(`
            SELECT 
                COUNT(*) as total_resenhas,
                AVG(rating) as media_avaliacoes
            FROM resenhas WHERE cpf = ?
        `, [userCpf]);
        
        // Gêneros mais lidos
        const [generosStats] = await connection.execute(`
            SELECT 
                l.genre,
                COUNT(*) as quantidade
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            WHERE e.cpf = ? AND e.status = 'devolvido'
            GROUP BY l.genre
            ORDER BY quantidade DESC
            LIMIT 5
        `, [userCpf]);
        
        // Livros emprestados recentemente
        const [livrosRecentes] = await connection.execute(`
            SELECT 
                l.title,
                l.author,
                l.cover,
                e.data_retirada,
                e.status
            FROM emprestimos e
            JOIN livros l ON e.bookId = l.id
            WHERE e.cpf = ?
            ORDER BY e.data_retirada DESC
            LIMIT 5
        `, [userCpf]);
        
        res.json({
            emprestimos: emprestimosStats[0],
            favoritos: favoritosCount[0].total_favoritos,
            resenhas: {
                total: resenhasStats[0].total_resenhas,
                media_avaliacoes: parseFloat(resenhasStats[0].media_avaliacoes || 0).toFixed(1)
            },
            generos_mais_lidos: generosStats,
            livros_recentes: livrosRecentes
        });
        
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Rota para alterar senha do usuário
app.put('/api/profile/change-password', isAuthenticated, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
    const userCpf = req.session.user.cpf;
    
    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }
    
    if (novaSenha.length < 8) {
        return res.status(400).json({ error: 'Nova senha deve ter pelo menos 8 caracteres' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Verificar senha atual
        const [userRows] = await connection.execute(
            'SELECT senha_hash FROM usuarios WHERE cpf = ?',
            [userCpf]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const isMatch = await bcrypt.compare(senhaAtual, userRows[0].senha_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        
        // Gerar hash da nova senha
        const salt = await bcrypt.genSalt(10);
        const novaSenhaHash = await bcrypt.hash(novaSenha, salt);
        
        // Atualizar senha no banco
        const [result] = await connection.execute(
            'UPDATE usuarios SET senha_hash = ?, data_atualizacao = NOW() WHERE cpf = ?',
            [novaSenhaHash, userCpf]
        );
        
        if (result.affectedRows > 0) {
            res.status(200).json({ message: 'Senha alterada com sucesso!' });
        } else {
            res.status(500).json({ error: 'Erro ao alterar senha' });
        }
        
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// Rota para deletar conta do usuário
app.delete('/api/profile/delete-account', isAuthenticated, async (req, res) => {
    const { senha } = req.body;
    const userCpf = req.session.user.cpf;
    
    if (!senha) {
        return res.status(400).json({ error: 'Senha é obrigatória para deletar a conta' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar senha
        const [userRows] = await connection.execute(
            'SELECT senha_hash FROM usuarios WHERE cpf = ?',
            [userCpf]
        );
        
        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        const isMatch = await bcrypt.compare(senha, userRows[0].senha_hash);
        
        if (!isMatch) {
            await connection.rollback();
            return res.status(401).json({ error: 'Senha incorreta' });
        }
        
        // Verificar se há empréstimos ativos
        const [emprestimosAtivos] = await connection.execute(
            'SELECT COUNT(*) as count FROM emprestimos WHERE cpf = ? AND status = "ativo"',
            [userCpf]
        );
        
        if (emprestimosAtivos[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({ 
                error: 'Não é possível deletar a conta. Você possui empréstimos ativos.' 
            });
        }
        
        // Deletar usuário (as foreign keys com CASCADE vão deletar os dados relacionados)
        const [result] = await connection.execute(
            'DELETE FROM usuarios WHERE cpf = ?',
            [userCpf]
        );
        
        if (result.affectedRows > 0) {
            await connection.commit();
            
            // Destruir sessão
            req.session.destroy();
            
            res.status(200).json({ message: 'Conta deletada com sucesso!' });
        } else {
            await connection.rollback();
            res.status(500).json({ error: 'Erro ao deletar conta' });
        }
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erro ao deletar conta:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
        if (connection) connection.release();
    }
});

// ================================

// MIDDLEWARE DE TRATAMENTO DE ERROS

// ================================

app.use((error, req, res, next) => {

    console.error('Erro nÃ£o tratado:', error);

    res.status(500).json({ 

        error: 'Erro interno do servidor'

    });

});

// ================================

// INICIALIZAÃ‡ÃƒO DO SERVIDOR

// ================================

createPool().then(() => {

    app.listen(PORT, () => {

        console.log(`Servidor rodando em http://localhost:${PORT}`);

        console.log('Rotas disponÃ­veis:');

        console.log('- AutenticaÃ§Ã£o: /api/login, /api/register, /api/logout');

        console.log('- Livros: /api/books, /api/books/:id');

        console.log('- EmprÃ©stimos: /api/loan/request, /api/loan/reserve, /api/loan/request-return');

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