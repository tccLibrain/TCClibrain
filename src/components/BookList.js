import { navigateTo } from '../main.js';

function createPlaceholderSVG(title = 'Sem Capa') {
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="150" height="210" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#9dadb7"/>
            <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#ffffff" text-anchor="middle" dy=".3em">${title}</text>
        </svg>
    `)}`;
}

export async function renderBookList(container) {
    container.innerHTML = '<div class="loading">Carregando livros...</div>';

    let books = [];
    let currentUser = null;
    
    try {
        // Verificar se o usuário está logado
        const userResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        if (userResponse.ok) {
            currentUser = await userResponse.json();
            console.log('Usuário logado:', currentUser.nome);
        }
    } catch (error) {
        console.log('Usuário não logado');
    }

    try {
        console.log('Fazendo requisição para buscar livros...');
        
        let response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status da resposta:', response.status);
        
        if (response.ok) {
            books = await response.json();
            console.log('Livros recebidos:', books.length);
        } else if (response.status === 401) {
            // Usuário não logado, mostrar interface de login
            container.innerHTML = `
                <div class="no-books" style="text-align: center; padding: 40px;">
                    <h3>Bem-vindo ao Librain!</h3>
                    <p>Para acessar o catálogo de livros, você precisa fazer login.</p>
                    <button id="go-to-login" class="btn" style="margin-top: 10px;">
                        Fazer Login
                    </button>
                    <br>
                    <button id="go-to-register" class="btn-secondary" style="margin-top: 10px;">
                        Criar Conta
                    </button>
                </div>
            `;
            
            const loginBtn = container.querySelector('#go-to-login');
            const registerBtn = container.querySelector('#go-to-register');
            
            if (loginBtn) {
                loginBtn.addEventListener('click', () => navigateTo('login'));
            }
            if (registerBtn) {
                registerBtn.addEventListener('click', () => navigateTo('register'));
            }
            return;
        } else {
            const errorText = await response.text();
            console.error('Falha ao carregar livros:', response.status, response.statusText, errorText);
            container.innerHTML = '<div class="no-books">Erro ao carregar a lista de livros. Tente fazer login novamente.</div>';
            return;
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        container.innerHTML = `
            <div class="no-books">
                <h3>Erro de Conexão</h3>
                <p>Não foi possível conectar ao servidor. Verifique sua conexão com a internet e se o servidor está rodando.</p>
                <button onclick="location.reload()" class="btn">Tentar Novamente</button>
            </div>
        `;
        return;
    }

    if (!Array.isArray(books)) {
        console.error('Resposta não é um array:', books);
        container.innerHTML = '<div class="no-books">Erro: dados dos livros inválidos.</div>';
        return;
    }

    if (books.length === 0) {
        console.warn('Nenhum livro encontrado no banco de dados');
        container.innerHTML = `
            <div class="no-books">
                <h3>Nenhum livro encontrado</h3>
                <p>O catálogo está vazio no momento.</p>
                ${currentUser && currentUser.tipo === 'admin' ? 
                    '<p><em>Como administrador, você pode adicionar livros ao sistema.</em></p>' : 
                    ''
                }
            </div>
        `;
        return;
    }

    // Renderizar interface principal
    const mainEl = document.createElement('div');
    mainEl.innerHTML = `
        <div class="books-header">
            <h2>Catálogo de Livros</h2>
            ${currentUser ? `<p>Bem-vindo, ${currentUser.nome}!</p>` : ''}
        </div>
        <div class="search-row">
            <input id="search-input" placeholder="Pesquisar título ou autor..." type="text">
            <button id="search-clear" title="Limpar busca">✖</button>
        </div>
        <div id="books-container"></div>
    `;
    container.innerHTML = '';
    container.appendChild(mainEl);

    const searchInput = mainEl.querySelector('#search-input');
    const searchClear = mainEl.querySelector('#search-clear');
    const booksContainer = mainEl.querySelector('#books-container');

    function renderSections(allBooks) {
        console.log('Renderizando seções com', allBooks.length, 'livros');
        
        booksContainer.innerHTML = '';

        if (allBooks.length === 0) {
            booksContainer.innerHTML = '<div class="no-books">Nenhum livro encontrado para esta busca.</div>';
            return;
        }

        // Agrupar livros por gênero
        const livrosPorGenero = allBooks.reduce((acc, book) => {
            const genero = book.genre || 'Sem Gênero';
            if (!acc[genero]) {
                acc[genero] = [];
            }
            acc[genero].push(book);
            return acc;
        }, {});

        // Ordenar gêneros alfabeticamente, mas colocar "Sem Gênero" no final
        const generosOrdenados = Object.keys(livrosPorGenero).sort((a, b) => {
            if (a === 'Sem Gênero') return 1;
            if (b === 'Sem Gênero') return -1;
            return a.localeCompare(b);
        });

        generosOrdenados.forEach(genero => {
            const livrosDoGenero = livrosPorGenero[genero];
            
            if (!livrosDoGenero.length) return;

            const section = document.createElement('section');
            section.className = 'genre-section';
            
            const title = document.createElement('div');
            title.className = 'genre-title';
            title.textContent = genero;
            
            const carousel = document.createElement('div');
            carousel.className = 'books-carousel';

            livrosDoGenero.forEach(book => {
                const card = document.createElement('div');
                card.className = 'book-card';
                card.setAttribute('data-book-id', book.id);
                
                // Status do livro
                const isAvailable = book.available !== false;
                const statusClass = isAvailable ? 'available' : 'unavailable';
                const statusText = isAvailable ? 'Disponível' : 'Emprestado';
                
                // Média de avaliações
                const avgRating = book.avgRating ? parseFloat(book.avgRating).toFixed(1) : null;
                const reviewCount = book.reviewCount || 0;
                
                const img = document.createElement('img');
                img.alt = book.title || 'Livro';
                
                const handleImageError = () => {
                    console.log('Erro ao carregar imagem para:', book.title, 'Usando placeholder SVG');
                    img.src = createPlaceholderSVG('Sem Capa');
                    img.removeEventListener('error', handleImageError);
                };
                
                if (book.cover && book.cover.trim() !== '') {
                    img.src = book.cover;
                    img.addEventListener('error', handleImageError, { once: true });
                } else {
                    img.src = createPlaceholderSVG('Sem Capa');
                }
                
                const bookTitle = document.createElement('div');
                bookTitle.className = 'book-title';
                bookTitle.textContent = book.title || 'Título não disponível';
                
                const bookAuthor = document.createElement('div');
                bookAuthor.className = 'book-author';
                bookAuthor.textContent = book.author || 'Autor desconhecido';
                
                const bookStatus = document.createElement('div');
                bookStatus.className = `book-status ${statusClass}`;
                bookStatus.textContent = statusText;
                
                const bookRating = document.createElement('div');
                bookRating.className = 'book-rating';
                if (avgRating) {
                    bookRating.innerHTML = `⭐ ${avgRating} (${reviewCount})`;
                } else {
                    bookRating.innerHTML = `<span style="color: #999;">Sem avaliações</span>`;
                }
                
                card.appendChild(img);
                card.appendChild(bookTitle);
                card.appendChild(bookAuthor);
                card.appendChild(bookStatus);
                card.appendChild(bookRating);
                
                // Event listener para clicar no livro
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const bookId = parseInt(card.getAttribute('data-book-id'));
                    console.log('Clicando no livro:', bookId, book.title);
                    
                    if (typeof navigateTo === 'function') {
                        navigateTo('details', { bookId: bookId });
                    } else {
                        console.error('Função navigateTo não está disponível');
                        window.location.hash = `#details/${bookId}`;
                    }
                });

                // Hover effect
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-2px)';
                    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = '';
                });

                carousel.appendChild(card);
            });

            section.appendChild(title);
            section.appendChild(carousel);
            booksContainer.appendChild(section);
        });
    }

    // Renderizar todos os livros inicialmente
    renderSections(books);

    // Função de busca
    function doSearch() {
        const query = (searchInput.value || '').trim().toLowerCase();
        console.log('Fazendo busca por:', query);
        
        if (query) {
            const filteredBooks = books.filter(book => {
                const title = (book.title || '').toLowerCase();
                const author = (book.author || '').toLowerCase();
                const genre = (book.genre || '').toLowerCase();
                
                return title.includes(query) || 
                       author.includes(query) || 
                       genre.includes(query);
            });
            console.log('Livros filtrados:', filteredBooks.length);
            renderSections(filteredBooks);
        } else {
            renderSections(books);
        }
    }

    // Event listeners para busca
    searchInput.addEventListener('input', doSearch);
    
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        doSearch();
        searchInput.focus();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doSearch();
        }
    });

    // Auto-focus no campo de busca se não estiver em mobile
    if (window.innerWidth > 768) {
        searchInput.focus();
    }

    console.log('renderBookList concluído. Total de livros:', books.length);
    console.log('Usuário atual:', currentUser ? currentUser.nome : 'Não logado');
}