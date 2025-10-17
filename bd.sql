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
    estado VARCHAR(2) NULL,
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

-- Tabela de empréstimos (COM STATUS AGUARDANDO_RETIRADA)
CREATE TABLE emprestimos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bookId INT NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    data_retirada DATE NOT NULL,
    data_prevista_devolucao DATE NOT NULL,
    data_real_devolucao DATE NULL,
    status ENUM('aguardando_retirada', 'ativo', 'devolvido', 'atrasado', 'pendente_devolucao') DEFAULT 'aguardando_retirada',
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

CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cpf VARCHAR(11) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expira_em TIMESTAMP NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cpf) REFERENCES usuarios(cpf) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_token (token),
    INDEX idx_cpf_usado (cpf, usado)
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================

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

-- ==========================================
-- TRIGGERS
-- ==========================================

DELIMITER //

-- Trigger: Quando empréstimo é inserido com status ATIVO, marcar livro como indisponível
CREATE TRIGGER after_emprestimo_insert
AFTER INSERT ON emprestimos
FOR EACH ROW
BEGIN
    IF NEW.status = 'ativo' THEN
        UPDATE livros SET disponivel = FALSE WHERE id = NEW.bookId;
    END IF;
END//

-- Trigger: Quando empréstimo é atualizado
CREATE TRIGGER after_emprestimo_update
AFTER UPDATE ON emprestimos
FOR EACH ROW
BEGIN
    -- Se mudou para devolvido, liberar livro
    IF NEW.status = 'devolvido' AND OLD.status != 'devolvido' THEN
        UPDATE livros SET disponivel = TRUE WHERE id = NEW.bookId;
        
        -- Se marcou como lido, incrementar contador
        IF NEW.status_leitura = 'lido' AND OLD.status_leitura != 'lido' THEN
            UPDATE usuarios SET livros_lidos = livros_lidos + 1 WHERE cpf = NEW.cpf;
        END IF;
    END IF;
    
    -- Se mudou de aguardando_retirada para ativo, marcar livro como indisponível
    IF NEW.status = 'ativo' AND OLD.status = 'aguardando_retirada' THEN
        UPDATE livros SET disponivel = FALSE WHERE id = NEW.bookId;
    END IF;
END//

DELIMITER ;

-- ==========================================
-- STORED PROCEDURE PARA CONQUISTAS
-- ==========================================

DELIMITER //

CREATE PROCEDURE VerificarConquistas(IN user_cpf VARCHAR(11))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE conquista_id_val INT;
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
    
    -- Inicializar conquistas do usuário (garantir que seja JSON array)
    SELECT COALESCE(conquistas_desbloqueadas, JSON_ARRAY()) INTO user_conquistas
    FROM usuarios WHERE cpf = user_cpf;
    
    OPEN conquistas_cursor;
    
    read_loop: LOOP
        FETCH conquistas_cursor INTO conquista_id_val, conquista_nome, conquista_tipo, conquista_valor;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Verificar se conquista já foi desbloqueada
        IF NOT JSON_CONTAINS(user_conquistas, CAST(conquista_id_val AS JSON), '$') THEN
        
            -- Obter estatística do usuário
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
            
            -- Verificar se atingiu a meta
            IF user_stat >= conquista_valor THEN
            
                -- Desbloquear conquista
                UPDATE usuarios 
                SET conquistas_desbloqueadas = JSON_ARRAY_APPEND(
                    COALESCE(conquistas_desbloqueadas, JSON_ARRAY()), 
                    '$', 
                    conquista_id_val
                )
                WHERE cpf = user_cpf;
                
                -- Criar notificação
                INSERT INTO notificacoes (cpf, tipo, titulo, mensagem)
                VALUES (user_cpf, 'conquista', 'Nova Conquista Desbloqueada!', 
                        CONCAT('Parabéns! Você desbloqueou: ', conquista_nome));
                        
                -- Atualizar conquistas locais para não tentar desbloquear novamente
                SELECT conquistas_desbloqueadas INTO user_conquistas
                FROM usuarios WHERE cpf = user_cpf;
            END IF;
        END IF;
    END LOOP;
    
    CLOSE conquistas_cursor;
END//

DELIMITER ;

-- ==========================================
-- VIEWS ÚTEIS
-- ==========================================

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
WHERE e.status IN ('ativo', 'aguardando_retirada', 'pendente_devolucao');

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

-- ==========================================
-- INSERÇÃO DE DADOS INICIAIS
-- ==========================================

-- Admin padrão
INSERT INTO usuarios (nome, cpf, email, senha_hash, tipo, cidade, estado) VALUES
('Administrador do Sistema', '12345678900', 'admin@librain.com', 'admin123', 'admin', 'São João da Boa Vista', 'SP');

-- Usuário teste
INSERT INTO usuarios (nome, cpf, email, senha_hash, tipo, cidade, estado, genero) VALUES
('Usuário Teste', '11111111111', 'teste@librain.com', '$2a$10$L3KFRj4y2h5nYgRhC8ZK8.rO5fJ9qR2N4LM6KF5dK3vH8pO5iG3Pa', 'leitor', 'São Paulo', 'SP', 'nao_informar');

-- ==========================================
-- CONQUISTAS
-- ==========================================

INSERT INTO conquistas_disponiveis (nome, descricao, icone, condicao_tipo, condicao_valor, ordem_exibicao) VALUES
('Primeiro Passo', 'Realize seu primeiro empréstimo', '📚', 'emprestimos_realizados', 1, 1),
('Leitor Iniciante', 'Leia 3 livros', '🔥', 'livros_lidos', 3, 2),
('Leitor Regular', 'Leia 5 livros', '📖', 'livros_lidos', 5, 3),
('Bibliotecário', 'Leia 10 livros', '📚', 'livros_lidos', 10, 4),
('Devorador de Livros', 'Leia 25 livros', '🎓', 'livros_lidos', 25, 5),
('Mestre dos Livros', 'Leia 50 livros', '👑', 'livros_lidos', 50, 6),
('Crítico Literário', 'Escreva 5 resenhas', '✍️', 'resenhas_escritas', 5, 7),
('Resenhista Expert', 'Escreva 15 resenhas', '🏆', 'resenhas_escritas', 15, 8),
('Grande Crítico', 'Escreva 30 resenhas', '⭐', 'resenhas_escritas', 30, 9),
('Veterano do Librain', 'Seja membro por 30 dias', '🎖️', 'dias_cadastrado', 30, 10),
('Membro de Longa Data', 'Seja membro por 90 dias', '💫', 'dias_cadastrado', 90, 11),
('Lenda do Librain', 'Seja membro por 365 dias', '🌟', 'dias_cadastrado', 365, 12),
('Explorador Ativo', 'Realize 5 empréstimos', '🚀', 'emprestimos_realizados', 5, 13),
('Usuário Dedicado', 'Realize 20 empréstimos', '💎', 'emprestimos_realizados', 20, 14),
('Maratonista Literário', 'Realize 50 empréstimos', '🏃', 'emprestimos_realizados', 50, 15);

-- ==========================================
-- LIVROS (45 LIVROS POPULARES)
-- ==========================================

INSERT INTO livros (title, author, genre, synopsis, pages, cover, isbn, editora, ano_publicacao) VALUES
-- Clássicos da Literatura Brasileira (5)
('Dom Casmurro', 'Machado de Assis', 'Romance', 'A história de Bentinho e sua paixão por Capitu, narrada com a maestria característica de Machado de Assis.', 256, 'https://m.media-amazon.com/images/I/71jB9F8FLWL._SL1500_.jpg', '9788525406958', 'Ática', 1899),
('O Cortiço', 'Aluísio Azevedo', 'Realismo', 'Romance naturalista que retrata a vida em um cortiço carioca no século XIX.', 280, 'https://m.media-amazon.com/images/I/81gNveZxrHL._SL1500_.jpg', '9788594318823', 'Moderna', 1890),
('Memórias Póstumas de Brás Cubas', 'Machado de Assis', 'Romance', 'Narrado por um defunto autor, este romance revolucionou a literatura brasileira.', 368, 'https://m.media-amazon.com/images/I/71uqx-1NZRL._SL1000_.jpg', '9788535911662', 'Companhia das Letras', 1881),
('Grande Sertão: Veredas', 'Guimarães Rosa', 'Romance', 'Obra-prima da literatura brasileira que narra a história de Riobaldo, um ex-jagunço.', 624, 'https://m.media-amazon.com/images/I/71iw1m8VqjL._SL1000_.jpg', '9788535908770', 'Companhia das Letras', 1956),
('Capitães da Areia', 'Jorge Amado', 'Romance', 'A história de um grupo de meninos de rua em Salvador.', 280, 'https://m.media-amazon.com/images/I/71Iov8MqHnL._SL1000_.jpg', '9788535914061', 'Companhia das Letras', 1937),

-- Distopias e Ficção Científica (8)
('1984', 'George Orwell', 'Distopia', 'Um romance distópico sobre um regime totalitário que controla todos os aspectos da vida.', 416, 'https://m.media-amazon.com/images/I/71rpa1-kyvL._SL1500_.jpg', '9788535914849', 'Companhia das Letras', 1949),
('Admirável Mundo Novo', 'Aldous Huxley', 'Ficção Científica', 'Distopia sobre uma sociedade futurista rigidamente controlada.', 288, 'https://m.media-amazon.com/images/I/81zE42gT3xL._SL1500_.jpg', '9788525056122', 'Globo', 1932),
('Fahrenheit 451', 'Ray Bradbury', 'Ficção Científica', 'Em uma sociedade onde livros são proibidos, um bombeiro questiona seu papel.', 194, 'https://m.media-amazon.com/images/I/71OFqSRFDgL._SL1500_.jpg', '9788579272233', 'Globo', 1953),
('Neuromancer', 'William Gibson', 'Ficção Científica', 'Romance cyberpunk que definiu o gênero e inspirou Matrix.', 304, 'https://m.media-amazon.com/images/I/71Q8l0qzXQL._SL1500_.jpg', '9788576572480', 'Aleph', 1984),
('Fundação', 'Isaac Asimov', 'Ficção Científica', 'A saga épica sobre o colapso e renascimento da civilização galáctica.', 255, 'https://m.media-amazon.com/images/I/91dxrs7hZIL._SL1500_.jpg', '9788576573371', 'Aleph', 1951),
('Duna', 'Frank Herbert', 'Ficção Científica', 'Épico de ficção científica sobre política, religião e ecologia no planeta desértico Arrakis.', 680, 'https://m.media-amazon.com/images/I/81zN7udGRUL._SL1500_.jpg', '9788576573074', 'Aleph', 1965),
('O Guia do Mochileiro das Galáxias', 'Douglas Adams', 'Ficção Científica', 'Comédia sci-fi sobre a jornada de Arthur Dent pelo universo.', 224, 'https://m.media-amazon.com/images/I/81XQFmbbcXL._SL1500_.jpg', '9788580416350', 'Arqueiro', 1979),
('A Máquina do Tempo', 'H.G. Wells', 'Ficção Científica', 'Um cientista viaja para o futuro distante e descobre o destino da humanidade.', 118, 'https://m.media-amazon.com/images/I/71oHRZc13QL._SL1000_.jpg', '9788582850350', 'Zahar', 1895),

-- Fantasia (7)
('Harry Potter e a Pedra Filosofal', 'J.K. Rowling', 'Fantasia', 'A história de um menino órfão que descobre ser um bruxo no seu 11º aniversário.', 264, 'https://m.media-amazon.com/images/I/81ibfYk4qmL._SL1500_.jpg', '9788532511010', 'Rocco', 1997),
('O Hobbit', 'J.R.R. Tolkien', 'Fantasia', 'A jornada inesperada de Bilbo Bolseiro em busca do tesouro de Smaug.', 336, 'https://m.media-amazon.com/images/I/91M9xPIf10L._SL1500_.jpg', '9788595084780', 'HarperCollins', 1937),
('O Senhor dos Anéis: A Sociedade do Anel', 'J.R.R. Tolkien', 'Fantasia', 'A primeira parte da épica jornada para destruir o Um Anel.', 576, 'https://m.media-amazon.com/images/I/91jBdIDK4XL._SL1500_.jpg', '9788595084803', 'HarperCollins', 1954),
('As Crônicas de Nárnia: O Leão, a Feiticeira e o Guarda-Roupa', 'C.S. Lewis', 'Fantasia', 'Quatro irmãos descobrem um mundo mágico dentro de um guarda-roupa.', 206, 'https://m.media-amazon.com/images/I/71yJLhQekBL._SL1000_.jpg', '9788578270698', 'WMF Martins Fontes', 1950),
('A Guerra dos Tronos', 'George R.R. Martin', 'Fantasia', 'Primeiro livro da saga As Crônicas de Gelo e Fogo, sobre a luta pelo Trono de Ferro.', 694, 'https://m.media-amazon.com/images/I/91dSMhdIzTL._SL1500_.jpg', '9788544102114', 'LeYa', 1996),
('Percy Jackson e o Ladrão de Raios', 'Rick Riordan', 'Fantasia', 'Um garoto descobre ser filho de Poseidon e precisa impedir uma guerra entre os deuses.', 377, 'https://m.media-amazon.com/images/I/91xB09l2JwL._SL1500_.jpg', '9788598078355', 'Intrínseca', 2005),
('Eragon', 'Christopher Paolini', 'Fantasia', 'Um jovem fazendeiro encontra um ovo de dragão e se torna um cavaleiro de dragões.', 544, 'https://m.media-amazon.com/images/I/81FJB-bGYWL._SL1500_.jpg', '9788580410839', 'Rocco Jovens Leitores', 2003),

-- Romance Clássico Internacional (6)
('Orgulho e Preconceito', 'Jane Austen', 'Romance', 'A história de Elizabeth Bennet e sua complexa relação com o Sr. Darcy.', 424, 'https://m.media-amazon.com/images/I/71Q1tPupKjL._SL1500_.jpg', '9788544001677', 'Penguin Classics', 1813),
('Crime e Castigo', 'Fiódor Dostoiévski', 'Romance', 'A história psicológica de Raskólnikov, um estudante pobre que comete um assassinato.', 672, 'https://m.media-amazon.com/images/I/71O2XIytdqL._SL1360_.jpg', '9788535914337', '34', 1866),
('Os Miseráveis', 'Victor Hugo', 'Romance', 'A história de Jean Valjean e sua redenção na França do século XIX.', 1232, 'https://m.media-amazon.com/images/I/91HWdXGxTiL._SL1500_.jpg', '9788544001523', 'Martin Claret', 1862),
('Anna Karenina', 'Liev Tolstói', 'Romance', 'Romance sobre amor, traição e sociedade na Rússia czarista.', 864, 'https://m.media-amazon.com/images/I/71kVQ1i7TqL._SL1000_.jpg', '9788535911664', 'Companhia das Letras', 1877),
('O Morro dos Ventos Uivantes', 'Emily Brontë', 'Romance', 'História de amor e vingança nas charnecas inglesas.', 416, 'https://m.media-amazon.com/images/I/71b1nwg3tkL._SL1000_.jpg', '9788544001356', 'Penguin Companhia', 1847),
('Jane Eyre', 'Charlotte Brontë', 'Romance', 'A história de uma governanta e seu amor pelo misterioso Sr. Rochester.', 520, 'https://m.media-amazon.com/images/I/71HAE9SgLEL._SL1500_.jpg', '9788544001363', 'Penguin Companhia', 1847),

-- Literatura Latino-Americana (4)
('Cem Anos de Solidão', 'Gabriel García Márquez', 'Realismo Mágico', 'A saga épica da família Buendía na cidade fictícia de Macondo.', 432, 'https://m.media-amazon.com/images/I/91TvVQS7loL._SL1500_.jpg', '9788501114632', 'Record', 1967),
('A Casa dos Espíritos', 'Isabel Allende', 'Realismo Mágico', 'Saga familiar que percorre três gerações no Chile.', 512, 'https://m.media-amazon.com/images/I/81L-xWX7c1L._SL1500_.jpg', '9788528619690', 'Bertrand Brasil', 1982),
('O Amor nos Tempos do Cólera', 'Gabriel García Márquez', 'Romance', 'História de amor que dura mais de meio século.', 368, 'https://m.media-amazon.com/images/I/71MJy92w07L._SL1000_.jpg', '9788501058898', 'Record', 1985),
('Rayuela (O Jogo da Amarelinha)', 'Julio Cortázar', 'Romance', 'Romance experimental que pode ser lido em diferentes ordens.', 608, 'https://m.media-amazon.com/images/I/71KU5DPWBZL._SL1000_.jpg', '9788520927335', 'Civilização Brasileira', 1963),

-- Suspense e Mistério (5)
('O Nome da Rosa', 'Umberto Eco', 'Mistério', 'Mistério medieval ambientado em um mosteiro italiano no século XIV.', 544, 'https://m.media-amazon.com/images/I/91dSGM7yyoL._SL1500_.jpg', '9788501058492', 'Record', 1980),
('E Não Sobrou Nenhum', 'Agatha Christie', 'Mistério', 'Dez pessoas são convidadas para uma ilha e começam a morrer uma a uma.', 272, 'https://m.media-amazon.com/images/I/71cRQzPJj+L._SL1000_.jpg', '9788595084728', 'HarperCollins', 1939),
('O Código Da Vinci', 'Dan Brown', 'Suspense', 'Um professor de simbologia se envolve em uma conspiração secular.', 464, 'https://m.media-amazon.com/images/I/71zRH5VThbL._SL1000_.jpg', '9788580416312', 'Arqueiro', 2003),
('Garota Exemplar', 'Gillian Flynn', 'Suspense', 'Um thriller psicológico sobre o desaparecimento de uma mulher.', 432, 'https://m.media-amazon.com/images/I/71-3bXKLxsL._SL1000_.jpg', '9788580574357', 'Intrínseca', 2012),
('A Garota no Trem', 'Paula Hawkins', 'Suspense', 'Uma mulher observa um casal de seu trem e se envolve em um mistério.', 368, 'https://m.media-amazon.com/images/I/81gJ29-yw1L._SL1500_.jpg', '9788501104571', 'Record', 2015),

-- Ficção Contemporânea e Outros (10)
('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', 'Infantil', 'A história de um pequeno príncipe que viaja por planetas e aprende sobre a vida e o amor.', 96, 'https://m.media-amazon.com/images/I/61WM6E0Y+tL._SL1000_.jpg', '9788595081512', 'HarperCollins', 1943),
('O Alquimista', 'Paulo Coelho', 'Ficção', 'A jornada espiritual de Santiago em busca de um tesouro e do seu destino pessoal.', 208, 'https://m.media-amazon.com/images/I/51M7XGLQTBL._SL1000_.jpg', '9788576655469', 'HarperCollins', 1988),
('A Metamorfose', 'Franz Kafka', 'Ficção', 'A surreal transformação de Gregor Samsa em um inseto gigante.', 96, 'https://m.media-amazon.com/images/I/71Q0u9FzZaL._SL1500_.jpg', '9788535909814', 'Companhia das Letras', 1915),
('O Apanhador no Campo de Centeio', 'J.D. Salinger', 'Romance', 'A jornada de Holden Caulfield pelas ruas de Nova York.', 224, 'https://m.media-amazon.com/images/I/81OthjkJBuL._SL1500_.jpg', '9788532523310', 'Todavia', 1951),
('A Culpa é das Estrelas', 'John Green', 'Romance', 'História de amor entre dois adolescentes com câncer.', 288, 'https://m.media-amazon.com/images/I/71ecK2RltsL._SL1000_.jpg', '9788580573466', 'Intrínseca', 2012),
('A Menina que Roubava Livros', 'Markus Zusak', 'Drama', 'Uma garota rouba livros na Alemanha nazista, narrado pela Morte.', 480, 'https://m.media-amazon.com/images/I/71WL+6L4jzL._SL1000_.jpg', '9788580573466', 'Intrínseca', 2005),
('O Diário de Anne Frank', 'Anne Frank', 'Biografia', 'O diário real de uma menina judia escondida durante o Holocausto.', 352, 'https://m.media-amazon.com/images/I/71wdVJU7k7L._SL1000_.jpg', '9788501061812', 'Record', 1947),
('Sapiens', 'Yuval Noah Harari', 'Não-ficção', 'Uma breve história da humanidade desde a Idade da Pedra.', 464, 'https://m.media-amazon.com/images/I/71RlJH2XVTL._SL1500_.jpg', '9788525432629', 'L&PM', 2011),
('O Poder do Hábito', 'Charles Duhigg', 'Autoajuda', 'Como os hábitos funcionam e como podemos mudá-los.', 408, 'https://m.media-amazon.com/images/I/71g0HPcWNGL._SL1000_.jpg', '9788539004119', 'Objetiva', 2012),
('It: A Coisa', 'Stephen King', 'Terror', 'Um grupo de amigos enfrenta uma entidade maligna em sua cidade natal.', 1104, 'https://m.media-amazon.com/images/I/71W0aKfJHmL._SL1500_.jpg', '9788581052380', 'Suma', 1986);



SET GLOBAL max_allowed_packet=134217728; 
SET GLOBAL innodb_buffer_pool_size=268435456; 
