-- Criação do banco de dados
DROP DATABASE IF EXISTS librain;
CREATE DATABASE librain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE librain;

-- Tabela de usuários
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    tipo ENUM('leitor', 'admin') DEFAULT 'leitor',
    genero ENUM('feminino', 'masculino', 'nao_informar') NULL,
    tel_residencial VARCHAR(15) NULL,
    tel_comercial VARCHAR(15) NULL,
    identidade VARCHAR(20) NULL,
    endereco VARCHAR(255) NULL,
    numero VARCHAR(10) NULL,
    complemento VARCHAR(100) NULL,
    cep VARCHAR(8) NULL,
    cidade VARCHAR(100) NULL,
    estado VARCHAR(50) NULL,
    data_nascimento DATE NULL,
    bio TEXT NULL,
    avatar_url LONGTEXT NULL,
    livros_lidos INT DEFAULT 0,
    paginas_lidas INT DEFAULT 0,
    conquistas_desbloqueadas JSON DEFAULT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de livros
CREATE TABLE livros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NULL,
    genre VARCHAR(100) NULL,
    synopsis TEXT NULL,
    pages INT NULL,
    cover TEXT NULL,
    isbn VARCHAR(20) NULL,
    editora VARCHAR(100) NULL,
    ano_publicacao SMALLINT NULL,
    disponivel BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de empréstimos
CREATE TABLE emprestimos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookId INT NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    data_retirada DATE NOT NULL,
    data_prevista_devolucao DATE NOT NULL,
    data_real_devolucao DATE NULL,
    status ENUM('ativo', 'devolvido', 'atrasado', 'pendente_devolucao') DEFAULT 'ativo',
    status_leitura ENUM('lendo', 'lido', 'nao_terminado') DEFAULT 'lendo',
    data_marcado_lido DATE NULL,
    renovacoes INT DEFAULT 0,
    multa_valor DECIMAL(10,2) DEFAULT 0.00,
    observacoes TEXT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bookId) REFERENCES livros(id) ON DELETE CASCADE,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela de reservas (fila de espera)
CREATE TABLE reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookId INT NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    posicao INT NOT NULL,
    status ENUM('aguardando', 'notificado', 'expirado', 'cancelado') DEFAULT 'aguardando',
    data_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_notificacao TIMESTAMP NULL,
    data_expiracao TIMESTAMP NULL,
    data_cancelamento TIMESTAMP NULL,
    FOREIGN KEY (bookId) REFERENCES livros(id) ON DELETE CASCADE,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_user_book_reservation (bookId, cpf)
);

-- Tabela de resenhas
CREATE TABLE resenhas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookId INT NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bookId) REFERENCES livros(id) ON DELETE CASCADE,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY unique_user_book_review (bookId, cpf)
);

-- Tabela de favoritos
CREATE TABLE favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    bookId INT NOT NULL,
    data_favoritado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (bookId) REFERENCES livros(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_book_favorite (cpf, bookId)
);

-- Tabela de prateleiras personalizadas
CREATE TABLE prateleiras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    nome_prateleira VARCHAR(100) NOT NULL,
    descricao TEXT NULL,
    cor VARCHAR(7) DEFAULT '#9bb4ff',
    publica BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela de livros nas prateleiras
CREATE TABLE prateleira_livros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prateleira_id INT NOT NULL,
    bookId INT NOT NULL,
    data_adicionado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prateleira_id) REFERENCES prateleiras(id) ON DELETE CASCADE,
    FOREIGN KEY (bookId) REFERENCES livros(id) ON DELETE CASCADE,
    UNIQUE KEY unique_shelf_book (prateleira_id, bookId)
);

-- Tabela de notificações
CREATE TABLE notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    tipo ENUM('emprestimo', 'devolucao', 'reserva', 'multa', 'sistema', 'conquista') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP NULL,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela de conquistas disponíveis
CREATE TABLE conquistas_disponiveis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    icone VARCHAR(50) DEFAULT '🏆',
    condicao_tipo ENUM('livros_lidos', 'emprestimos_realizados', 'resenhas_escritas', 'dias_cadastrado') NOT NULL,
    condicao_valor INT NOT NULL,
    ordem_exibicao INT DEFAULT 0,
    ativa BOOLEAN DEFAULT TRUE
);

-- Inserção de livros com URLs funcionais
INSERT INTO livros (title, author, genre, synopsis, pages, cover, isbn, editora, ano_publicacao) VALUES
('Dom Casmurro', 'Machado de Assis', 'Romance', 'A história de Bentinho e sua paixão por Capitu, narrada com a maestria característica de Machado de Assis.', 256, 'https://images-na.ssl-images-amazon.com/images/I/41-KQ-Q9vUL._SY344_BO1,204,203,200_.jpg', '9788525406958', 'Ática', 1899),

('O Cortiço', 'Aluísio Azevedo', 'Realismo', 'Romance naturalista que retrata a vida em um cortiço carioca no século XIX.', 280, 'https://images-na.ssl-images-amazon.com/images/I/51nP8cjhBKL._SY344_BO1,204,203,200_.jpg', '9788594318823', 'Moderna', 1890),

('1984', 'George Orwell', 'Distopia', 'Um romance distópico sobre um regime totalitário que controla todos os aspectos da vida.', 416, 'https://images-na.ssl-images-amazon.com/images/I/51-NeHaF3KL._SY344_BO1,204,203,200_.jpg', '9788535914849', 'Companhia das Letras', 1949),

('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Infantil', 'A história de um pequeno príncipe que viaja por planetas e aprende sobre a vida e o amor.', 96, 'https://images-na.ssl-images-amazon.com/images/I/41npMv0VGwL._SY344_BO1,204,203,200_.jpg', '9788595081512', 'HarperCollins', 1943),

('Cem Anos de Solidão', 'Gabriel García Márquez', 'Realismo Mágico', 'A saga épica da família Buendía na cidade fictícia de Macondo.', 432, 'https://images-na.ssl-images-amazon.com/images/I/51-PVubO4cL._SY344_BO1,204,203,200_.jpg', '9788501114632', 'Record', 1967),

('Crime e Castigo', 'Fiódor Dostoiévski', 'Romance', 'A história psicológica de Raskólnikov, um estudante pobre que comete um assassinato.', 672, 'https://images-na.ssl-images-amazon.com/images/I/51B8g-r8BnL._SY344_BO1,204,203,200_.jpg', '9788535914337', '34', 1866),

('Harry Potter e a Pedra Filosofal', 'J.K. Rowling', 'Fantasia', 'A história de um menino órfão que descobre ser um bruxo no seu 11º aniversário.', 264, 'https://images-na.ssl-images-amazon.com/images/I/51jNORv6nQL._SY344_BO1,204,203,200_.jpg', '9788532511010', 'Rocco', 1997),

('Orgulho e Preconceito', 'Jane Austen', 'Romance', 'A história de Elizabeth Bennet e sua complexa relação com o Sr. Darcy.', 424, 'https://images-na.ssl-images-amazon.com/images/I/51V8JGT5R9L._SY344_BO1,204,203,200_.jpg', '9788544001677', 'Penguin Classics', 1813),

('O Alquimista', 'Paulo Coelho', 'Ficção', 'A jornada espiritual de Santiago em busca de um tesouro e do seu destino pessoal.', 208, 'https://images-na.ssl-images-amazon.com/images/I/51Z0nLAfLmL._SY344_BO1,204,203,200_.jpg', '9788576655469', 'HarperCollins', 1988),

('A Metamorfose', 'Franz Kafka', 'Ficção', 'A surreal transformação de Gregor Samsa em um inseto gigante.', 96, 'https://images-na.ssl-images-amazon.com/images/I/41cVy4-lQaL._SY344_BO1,204,203,200_.jpg', '9788535909814', 'Companhia das Letras', 1915),

('O Nome da Rosa', 'Umberto Eco', 'Mistério', 'Mistério medieval ambientado em um mosteiro italiano no século XIV.', 544, 'https://images-na.ssl-images-amazon.com/images/I/51G2YvhAJdL._SY344_BO1,204,203,200_.jpg', '9788501058492', 'Record', 1980),

('Admirável Mundo Novo', 'Aldous Huxley', 'Ficção Científica', 'Distopia sobre uma sociedade futurista rigidamente controlada.', 288, 'https://images-na.ssl-images-amazon.com/images/I/41WOLt-s3rL._SY344_BO1,204,203,200_.jpg', '9788525056122', 'Globo', 1932),

('O Apanhador no Campo de Centeio', 'J.D. Salinger', 'Romance', 'A jornada de Holden Caulfield pelas ruas de Nova York.', 224, 'https://images-na.ssl-images-amazon.com/images/I/41PcXHJK6QL._SY344_BO1,204,203,200_.jpg', '9788532523310', 'Editora do Autor', 1951),

('Fahrenheit 451', 'Ray Bradbury', 'Ficção Científica', 'Em uma sociedade onde livros são proibidos, um bombeiro questiona seu papel.', 194, 'https://images-na.ssl-images-amazon.com/images/I/41PQMjJ2XpL._SY344_BO1,204,203,200_.jpg', '9788579272233', 'Globo', 1953),

('O Hobbit', 'J.R.R. Tolkien', 'Fantasia', 'A jornada inesperada de Bilbo Bolseiro em busca do tesouro de Smaug.', 336, 'https://images-na.ssl-images-amazon.com/images/I/51eq2A4jZUL._SY344_BO1,204,203,200_.jpg', '9788595084780', 'HarperCollins', 1937);

-- Inserção de conquistas
INSERT INTO conquistas_disponiveis (nome, descricao, icone, condicao_tipo, condicao_valor, ordem_exibicao) VALUES
('Primeiro Passo', 'Realize seu primeiro empréstimo', '📚', 'emprestimos_realizados', 1, 1),
('Leitor Iniciante', 'Leia 3 livros', '🔥', 'livros_lidos', 3, 2),
('Bibliotecário', 'Leia 10 livros', '📖', 'livros_lidos', 10, 3),
('Devorador de Livros', 'Leia 25 livros', '🎓', 'livros_lidos', 25, 4),
('Mestre dos Livros', 'Leia 50 livros', '👑', 'livros_lidos', 50, 5),
('Crítico Literário', 'Escreva 5 resenhas', '✍️', 'resenhas_escritas', 5, 6),
('Resenhista Expert', 'Escreva 15 resenhas', '🏆', 'resenhas_escritas', 15, 7),
('Veterano do Librain', 'Seja membro por 30 dias', '⭐', 'dias_cadastrado', 30, 8),
('Explorador Ativo', 'Realize 5 empréstimos', '🚀', 'emprestimos_realizados', 5, 9),
('Usuário Dedicado', 'Realize 20 empréstimos', '💎', 'emprestimos_realizados', 20, 10);

-- Inserção de usuário admin com senha em texto plano para teste
-- Senha: admin123 (será criptografada no primeiro login)
INSERT INTO usuarios (nome, cpf, email, senha_hash, tipo, cidade, estado) VALUES
('Administrador do Sistema', '12345678900', 'admin@librain.com', 'admin123', 'admin', 'São João da Boa Vista', 'SP');

-- Inserir um usuário teste comum com senha criptografada
-- Senha: teste123
INSERT INTO usuarios (nome, cpf, email, senha_hash, tipo, cidade, estado, genero) VALUES
('Usuário Teste', '11111111111', 'teste@librain.com', '$2a$10$L3KFRj4y2h5nYgRhC8ZK8.rO5fJ9qR2N4LM6KF5dK3vH8pO5iG3Pa', 'leitor', 'São Paulo', 'SP', 'nao_informar');

-- Criação de índices para performance
CREATE INDEX idx_usuarios_cpf ON usuarios(cpf);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_emprestimos_cpf ON emprestimos(cpf);
CREATE INDEX idx_emprestimos_bookid ON emprestimos(bookId);
CREATE INDEX idx_emprestimos_status ON emprestimos(status);
CREATE INDEX idx_reservas_cpf ON reservas(cpf);
CREATE INDEX idx_reservas_bookid ON reservas(bookId);
CREATE INDEX idx_livros_title ON livros(title);
CREATE INDEX idx_livros_author ON livros(author);
CREATE INDEX idx_livros_genre ON livros(genre);

-- Triggers para manter consistência
DELIMITER //

CREATE TRIGGER after_emprestimo_insert
AFTER INSERT ON emprestimos
FOR EACH ROW
BEGIN
    UPDATE livros SET disponivel = FALSE WHERE id = NEW.bookId;
END//

CREATE TRIGGER after_emprestimo_update
AFTER UPDATE ON emprestimos
FOR EACH ROW
BEGIN
    IF NEW.status = 'devolvido' AND OLD.status != 'devolvido' THEN
        UPDATE livros SET disponivel = TRUE WHERE id = NEW.bookId;
        
        -- Incrementar contador de livros lidos se marcado como lido
        IF NEW.status_leitura = 'lido' AND OLD.status_leitura != 'lido' THEN
            UPDATE usuarios SET livros_lidos = livros_lidos + 1 WHERE cpf = NEW.cpf;
        END IF;
    END IF;
END//

DELIMITER ;

-- Procedure para verificar e conceder conquistas
DELIMITER //

CREATE PROCEDURE VerificarConquistas(IN user_cpf VARCHAR(11))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE conquista_id INT;
    DECLARE conquista_nome VARCHAR(100);
    DECLARE conquista_tipo ENUM('livros_lidos', 'emprestimos_realizados', 'resenhas_escritas', 'dias_cadastrado');
    DECLARE conquista_valor INT;
    DECLARE user_stat INT DEFAULT 0;
    DECLARE user_conquistas JSON;
    
    DECLARE conquistas_cursor CURSOR FOR
        SELECT id, nome, condicao_tipo, condicao_valor 
        FROM conquistas_disponiveis 
        WHERE ativa = TRUE
        ORDER BY ordem_exibicao;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SELECT COALESCE(conquistas_desbloqueadas, JSON_ARRAY()) INTO user_conquistas
    FROM usuarios WHERE cpf = user_cpf;
    
    OPEN conquistas_cursor;
    
    read_loop: LOOP
        FETCH conquistas_cursor INTO conquista_id, conquista_nome, conquista_tipo, conquista_valor;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        IF NOT JSON_CONTAINS(user_conquistas, CAST(conquista_id AS JSON)) THEN
            CASE conquista_tipo
                WHEN 'livros_lidos' THEN
                    SELECT livros_lidos INTO user_stat FROM usuarios WHERE cpf = user_cpf;
                WHEN 'emprestimos_realizados' THEN
                    SELECT COUNT(*) INTO user_stat FROM emprestimos WHERE cpf = user_cpf;
                WHEN 'resenhas_escritas' THEN
                    SELECT COUNT(*) INTO user_stat FROM resenhas WHERE cpf = user_cpf;
                WHEN 'dias_cadastrado' THEN
                    SELECT DATEDIFF(CURDATE(), data_cadastro) INTO user_stat FROM usuarios WHERE cpf = user_cpf;
            END CASE;
            
            IF user_stat >= conquista_valor THEN
                UPDATE usuarios 
                SET conquistas_desbloqueadas = JSON_ARRAY_APPEND(COALESCE(conquistas_desbloqueadas, JSON_ARRAY()), '$', conquista_id)
                WHERE cpf = user_cpf;
                
                INSERT INTO notificacoes (cpf, tipo, titulo, mensagem)
                VALUES (user_cpf, 'conquista', 'Nova Conquista Desbloqueada!', 
                        CONCAT('Parabéns! Você desbloqueou: ', conquista_nome));
            END IF;
        END IF;
    END LOOP;
    
    CLOSE conquistas_cursor;
END//

DELIMITER ;

-- View para facilitar consultas de empréstimos ativos
CREATE VIEW view_emprestimos_ativos AS
SELECT 
    e.id,
    e.bookId,
    e.cpf,
    u.nome as nome_usuario,
    l.title as titulo_livro,
    l.author as autor_livro,
    e.data_retirada,
    e.data_prevista_devolucao,
    e.status,
    DATEDIFF(CURDATE(), e.data_prevista_devolucao) as dias_atraso
FROM emprestimos e
JOIN usuarios u ON e.cpf = u.cpf
JOIN livros l ON e.bookId = l.id
WHERE e.status IN ('ativo', 'pendente_devolucao');

-- View para estatísticas de usuários
CREATE VIEW view_estatisticas_usuarios AS
SELECT 
    u.cpf,
    u.nome,
    u.tipo,
    u.livros_lidos,
    u.data_cadastro,
    COUNT(DISTINCT e.id) as total_emprestimos,
    COUNT(DISTINCT f.id) as total_favoritos,
    COUNT(DISTINCT r.id) as total_resenhas,
    COUNT(DISTINCT p.id) as total_prateleiras
FROM usuarios u
LEFT JOIN emprestimos e ON u.cpf = e.cpf
LEFT JOIN favoritos f ON u.cpf = f.cpf
LEFT JOIN resenhas r ON u.cpf = r.cpf
LEFT JOIN prateleiras p ON u.cpf = p.cpf
GROUP BY u.cpf;

-- Inserir alguns dados de teste para empréstimos e favoritos
INSERT INTO emprestimos (bookId, cpf, data_retirada, data_prevista_devolucao, status) VALUES
(1, '11111111111', CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 9 DAY, 'ativo'),
(3, '11111111111', CURDATE() - INTERVAL 15 DAY, CURDATE() - INTERVAL 1 DAY, 'ativo');

INSERT INTO favoritos (cpf, bookId) VALUES
('11111111111', 2),
('11111111111', 4),
('11111111111', 5);

INSERT INTO resenhas (bookId, cpf, rating, text) VALUES
(2, '11111111111', 5, 'Excelente livro! Recomendo muito.'),
(4, '11111111111', 4, 'Uma história tocante e bem escrita.');

INSERT INTO prateleiras (cpf, nome_prateleira, descricao) VALUES
('11111111111', 'Meus Clássicos', 'Livros clássicos que quero ler'),
('11111111111', 'Ficção Científica', 'Minha coleção de ficção científica favorita');

INSERT INTO prateleira_livros (prateleira_id, bookId) VALUES
(1, 1),
(1, 2),
(2, 3),
(2, 12);