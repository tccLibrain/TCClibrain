-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS librain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
    avatar_url TEXT NULL,
    livros_lidos INT DEFAULT 0,
    paginas_lidas INT DEFAULT 0,
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

-- Tabela de histórico de leitura
CREATE TABLE historico_leitura (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    bookId INT NOT NULL,
    data_inicio_leitura DATE NULL,
    data_fim_leitura DATE NULL,
    status_leitura ENUM('lendo', 'lido', 'pausado', 'abandonado') DEFAULT 'lendo',
    progresso_paginas INT DEFAULT 0,
    tempo_leitura_minutos INT DEFAULT 0,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (bookId) REFERENCES livros(id) ON DELETE CASCADE
);

-- Tabela de notificações
CREATE TABLE notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    tipo ENUM('emprestimo', 'devolucao', 'reserva', 'multa', 'sistema') NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP NULL,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela de configurações do sistema
CREATE TABLE configuracoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descricao TEXT NULL,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inserção de dados de exemplo para livros com capas diferentes
INSERT INTO livros (title, author, genre, synopsis, pages, cover, isbn, editora, ano_publicacao) VALUES
('Dom Casmurro', 'Machado de Assis', 'Romance', 'A história de Bentinho e sua paixão por Capitu, narrada com a maestria característica de Machado de Assis.', 256, 'https://images-na.ssl-images-amazon.com/images/I/51Kq7P5YSGL._SX331_BO1,204,203,200_.jpg', '9788525406958', 'Ática', 1899),
('O Cortiço', 'Aluísio Azevedo', 'Realismo', 'Romance naturalista que retrata a vida em um cortiço carioca no século XIX.', 280, 'https://m.media-amazon.com/images/I/51nP8cjhBKL._SY346_.jpg', '9788594318823', 'Moderna', 1890),
('1984', 'George Orwell', 'Distopia', 'Um romance distópico sobre um regime totalitário que controla todos os aspectos da vida.', 416, 'https://images-na.ssl-images-amazon.com/images/I/519zk8ShPcL._SX321_BO1,204,203,200_.jpg', '9788535914849', 'Companhia das Letras', 1949),
('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Infantil', 'A história de um pequeno príncipe que viaja por planetas e aprende sobre a vida e o amor.', 96, 'https://images-na.ssl-images-amazon.com/images/I/51Kq7P5YSGL._SX331_BO1,204,203,200_.jpg', '9788595081512', 'HarperCollins', 1943),
('Cem Anos de Solidão', 'Gabriel García Márquez', 'Realismo Mágico', 'A saga da família Buendía na cidade fictícia de Macondo.', 432, 'https://m.media-amazon.com/images/I/51-PVubO4cL._SY346_.jpg', '9788501114632', 'Record', 1967),
('Crime e Castigo', 'Fiódor Dostoiévski', 'Romance', 'A história de Raskólnikov, um estudante pobre que comete um assassinato.', 672, 'https://images-na.ssl-images-amazon.com/images/I/51B8g-r8BnL._SX331_BO1,204,203,200_.jpg', '9788535914337', '34', 1866),
('O Senhor dos Anéis: A Sociedade do Anel', 'J.R.R. Tolkien', 'Fantasia', 'Primeira parte da épica jornada de Frodo para destruir o Um Anel.', 576, 'https://m.media-amazon.com/images/I/51eq2A4jZUL._SY346_.jpg', '9788578274934', 'HarperCollins', 1954),
('Harry Potter e a Pedra Filosofal', 'J.K. Rowling', 'Fantasia', 'A história de um menino órfão que descobre ser um bruxo no seu 11º aniversário.', 264, 'https://images-na.ssl-images-amazon.com/images/I/51jNORv6nQL._SX342_BO1,204,203,200_.jpg', '9788532511010', 'Rocco', 1997),
('Orgulho e Preconceito', 'Jane Austen', 'Romance', 'A história de Elizabeth Bennet e sua complexa relação com o Sr. Darcy.', 424, 'https://m.media-amazon.com/images/I/51V8JGT5R9L._SY346_.jpg', '9788544001677', 'Penguin Classics', 1813),
('O Alquimista', 'Paulo Coelho', 'Ficção', 'A jornada de Santiago em busca de um tesouro e do seu destino pessoal.', 208, 'https://images-na.ssl-images-amazon.com/images/I/51Z0nLAfLmL._SX331_BO1,204,203,200_.jpg', '9788576655469', 'HarperCollins', 1988),
('A Metamorfose', 'Franz Kafka', 'Ficção', 'A transformação de Gregor Samsa em um inseto gigante.', 96, 'https://m.media-amazon.com/images/I/41cVy4-lQaL._SY346_.jpg', '9788535909814', 'Companhia das Letras', 1915),
('Cem Anos de Solidão', 'Gabriel García Márquez', 'Realismo Mágico', 'História épica da família Buendía em Macondo.', 432, 'https://images-na.ssl-images-amazon.com/images/I/51wzcBXd8WL._SX331_BO1,204,203,200_.jpg', '9788501114633', 'Record', 1967),
('O Nome da Rosa', 'Umberto Eco', 'Mistério', 'Mistério medieval em um mosteiro italiano.', 544, 'https://m.media-amazon.com/images/I/51G2YvhAJdL._SY346_.jpg', '9788501058492', 'Record', 1980),
('Admirável Mundo Novo', 'Aldous Huxley', 'Ficção Científica', 'Distopia sobre uma sociedade futurista controlada.', 288, 'https://images-na.ssl-images-amazon.com/images/I/41WOLt-s3rL._SX331_BO1,204,203,200_.jpg', '9788525056122', 'Globo', 1932),
('O Apanhador no Campo de Centeio', 'J.D. Salinger', 'Romance', 'A jornada de Holden Caulfield por Nova York.', 224, 'https://m.media-amazon.com/images/I/41PcXHJK6QL._SY346_.jpg', '9788532523310', 'Editora do Autor', 1951);

-- Inserção de configurações padrão
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('dias_emprestimo', '14', 'Número padrão de dias para empréstimo'),
('max_renovacoes', '2', 'Número máximo de renovações permitidas'),
('multa_por_dia', '2.00', 'Valor da multa por dia de atraso'),
('max_emprestimos_simultaneos', '3', 'Número máximo de livros emprestados simultaneamente'),
('dias_reserva_valida', '3', 'Dias que o usuário tem para retirar um livro reservado');

-- Inserção de usuário admin padrão (senha: admin123)
INSERT INTO usuarios (nome, cpf, email, senha_hash, tipo, cidade, estado) VALUES
('Administrador', '00000000000', 'admin@librain.com', '$2b$10$xB6HjK4Z5wB8rN3F5wB8rOxB6HjK4Z5wB8rN3F5wB8rOxB6HjK4Z5w', 'admin', 'São João da Boa Vista', 'SP');

-- Criação de índices para melhorar performance
CREATE INDEX idx_usuarios_cpf ON usuarios(cpf);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);

CREATE INDEX idx_livros_title ON livros(title);
CREATE INDEX idx_livros_author ON livros(author);
CREATE INDEX idx_livros_genre ON livros(genre);
CREATE INDEX idx_livros_disponivel ON livros(disponivel);

CREATE INDEX idx_emprestimos_cpf ON emprestimos(cpf);
CREATE INDEX idx_emprestimos_bookid ON emprestimos(bookId);
CREATE INDEX idx_emprestimos_status ON emprestimos(status);
CREATE INDEX idx_emprestimos_data_devolucao ON emprestimos(data_prevista_devolucao);

CREATE INDEX idx_reservas_cpf ON reservas(cpf);
CREATE INDEX idx_reservas_bookid ON reservas(bookId);
CREATE INDEX idx_reservas_status ON reservas(status);
CREATE INDEX idx_reservas_posicao ON reservas(posicao);

CREATE INDEX idx_resenhas_cpf ON resenhas(cpf);
CREATE INDEX idx_resenhas_bookid ON resenhas(bookId);
CREATE INDEX idx_resenhas_rating ON resenhas(rating);

CREATE INDEX idx_favoritos_cpf ON favoritos(cpf);
CREATE INDEX idx_favoritos_bookid ON favoritos(bookId);

CREATE INDEX idx_prateleiras_cpf ON prateleiras(cpf);
CREATE INDEX idx_prateleira_livros_prateleira ON prateleira_livros(prateleira_id);
CREATE INDEX idx_prateleira_livros_book ON prateleira_livros(bookId);

CREATE INDEX idx_historico_cpf ON historico_leitura(cpf);
CREATE INDEX idx_historico_bookid ON historico_leitura(bookId);
CREATE INDEX idx_historico_status ON historico_leitura(status_leitura);

CREATE INDEX idx_notificacoes_cpf ON notificacoes(cpf);
CREATE INDEX idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);

-- Criação de views úteis para consultas frequentes
CREATE VIEW view_emprestimos_ativos AS
SELECT 
    e.id,
    e.bookId,
    l.title,
    l.author,
    e.cpf,
    u.nome as usuario_nome,
    e.data_retirada,
    e.data_prevista_devolucao,
    DATEDIFF(CURDATE(), e.data_prevista_devolucao) as dias_atraso,
    e.status
FROM emprestimos e
JOIN livros l ON e.bookId = l.id
JOIN usuarios u ON e.cpf = u.cpf
WHERE e.status = 'ativo';

CREATE VIEW view_livros_disponiveis AS
SELECT 
    l.*,
    CASE 
        WHEN e.id IS NULL THEN TRUE 
        ELSE FALSE 
    END as disponivel_emprestimo
FROM livros l
LEFT JOIN emprestimos e ON l.id = e.bookId AND e.status = 'ativo';

CREATE VIEW view_reservas_pendentes AS
SELECT 
    r.id,
    r.bookId,
    l.title,
    l.author,
    r.cpf,
    u.nome as usuario_nome,
    r.posicao,
    r.data_reserva,
    r.status
FROM reservas r
JOIN livros l ON r.bookId = l.id
JOIN usuarios u ON r.cpf = u.cpf
WHERE r.status = 'aguardando'
ORDER BY r.bookId, r.posicao;

-- Triggers para manter a consistência dos dados
DELIMITER //

-- Trigger para atualizar disponibilidade do livro após empréstimo
CREATE TRIGGER after_emprestimo_insert
AFTER INSERT ON emprestimos
FOR EACH ROW
BEGIN
    UPDATE livros 
    SET disponivel = FALSE 
    WHERE id = NEW.bookId;
END//

CREATE TRIGGER after_emprestimo_update
AFTER UPDATE ON emprestimos
FOR EACH ROW
BEGIN
    IF NEW.status IN ('devolvido') AND OLD.status = 'ativo' THEN
        UPDATE livros 
        SET disponivel = TRUE 
        WHERE id = NEW.bookId;
    END IF;
END//

-- Trigger para atualizar estatísticas do usuário quando um livro é devolvido
CREATE TRIGGER after_devolucao_update_stats
AFTER UPDATE ON emprestimos
FOR EACH ROW
BEGIN
    DECLARE book_pages INT DEFAULT 0;
    
    IF NEW.status = 'devolvido' AND OLD.status != 'devolvido' THEN
        -- Buscar número de páginas do livro
        SELECT pages INTO book_pages FROM livros WHERE id = NEW.bookId;
        
        -- Atualizar estatísticas do usuário
        UPDATE usuarios 
        SET livros_lidos = livros_lidos + 1,
            paginas_lidas = paginas_lidas + IFNULL(book_pages, 0)
        WHERE cpf = NEW.cpf;
    END IF;
END//

DELIMITER ;

-- Procedure para processar devolução e notificar próximo da fila
DELIMITER //
CREATE PROCEDURE ProcessarDevolucao(IN p_book_id INT, IN p_cpf VARCHAR(11))
BEGIN
    DECLARE v_proximo_cpf VARCHAR(11);
    DECLARE done INT DEFAULT FALSE;
    
    -- Atualizar status do empréstimo para devolvido
    UPDATE emprestimos 
    SET status = 'devolvido', data_real_devolucao = CURDATE()
    WHERE bookId = p_book_id AND cpf = p_cpf AND status IN ('ativo', 'pendente_devolucao');
    
    -- Buscar próximo usuário na fila de reserva
    SELECT cpf INTO v_proximo_cpf
    FROM reservas 
    WHERE bookId = p_book_id AND status = 'aguardando'
    ORDER BY posicao ASC 
    LIMIT 1;
    
    -- Se há alguém na fila, notificar
    IF v_proximo_cpf IS NOT NULL THEN
        UPDATE reservas 
        SET status = 'notificado', data_notificacao = NOW()
        WHERE bookId = p_book_id AND cpf = v_proximo_cpf;
        
        INSERT INTO notificacoes (cpf, tipo, titulo, mensagem)
        VALUES (v_proximo_cpf, 'reserva', 'Livro Disponível!', 
                CONCAT('O livro que você reservou está disponível para retirada. Você tem 3 dias para retirá-lo.'));
    END IF;
END//
DELIMITER ;
