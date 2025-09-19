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
    container.innerHTML = '';

    let books = [];
    try {
        console.log('Fazendo requisição para buscar livros...');
        console.log('URL da requisição:', 'http://localhost:3000/api/books');
        console.log('Cookies disponíveis:', document.cookie);
        
        let response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', [...response.headers.entries()]);
        
        if (response.status === 401) {
            console.warn('Tentativa com credentials falhou, tentando sem credentials...');
            
            response = await fetch('http://localhost:3000/api/books', {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Status da segunda tentativa:', response.status);
        }
        
        if (response.ok) {
            books = await response.json();
            console.log('Livros recebidos:', books);
            console.log('Número de livros:', books.length);
            
            if (books.length > 0) {
                console.log('Estrutura do primeiro livro:', books[0]);
                console.log('Propriedades do primeiro livro:', Object.keys(books[0]));
            }
        } else if (response.status === 401) {
            const errorText = await response.text();
            console.error('Erro de autenticação (401) persistente:', errorText);
            
            container.innerHTML = `
                <div class="no-books" style="text-align: center; padding: 40px;">
                    <h3>Acesso Negado</h3>
                    <p>Você precisa fazer login para acessar os livros.</p>
                    <button id="go-to-login" style="margin-top: 10px; padding: 8px 16px; background: #9bb4ff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Fazer Login
                    </button>
                </div>
            `;
            
            const loginBtn = container.querySelector('#go-to-login');
            if (loginBtn && typeof navigateTo === 'function') {
                loginBtn.addEventListener('click', () => {
                    navigateTo('login');
                });
            }
            return;
        } else {
            const errorText = await response.text();
            console.error('Falha ao carregar livros:', response.status, response.statusText, errorText);
            container.innerHTML = '<div class="no-books">Erro ao carregar a lista de livros.</div>';
            return;
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        container.innerHTML = '<div class="no-books">Não foi possível conectar ao servidor.</div>';
        return;
    }

    if (!Array.isArray(books)) {
        console.error('Resposta não é um array:', books);
        container.innerHTML = '<div class="no-books">Erro: dados dos livros inválidos.</div>';
        return;
    }

    if (books.length === 0) {
        console.warn('Nenhum livro encontrado no banco de dados');
        container.innerHTML = '<div class="no-books">Nenhum livro encontrado no sistema.</div>';
        return;
    }

    const mainEl = document.createElement('div');
    mainEl.innerHTML = `
        <div class="search-row">
            <input id="search-input" placeholder="Pesquisar título ou autor...">
            <button id="search-clear">✖ Limpar</button>
        </div>
        <div id="books-container"></div>
    `;
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

        const livrosPorGenero = allBooks.reduce((acc, book) => {
            console.log('Processando livro:', book.title, 'Gênero:', book.genre);
            
            const genero = book.genre || 'Sem Gênero';
            
            if (!acc[genero]) {
                acc[genero] = [];
            }
            acc[genero].push(book);
            return acc;
        }, {});

        console.log('Livros agrupados por gênero:', livrosPorGenero);

        Object.entries(livrosPorGenero).forEach(([genero, livrosDoGenero]) => {
            console.log(`Renderizando gênero: ${genero} com ${livrosDoGenero.length} livros`);
            
            if (!livrosDoGenero.length) return;

            const section = document.createElement('section');
            section.className = 'genre-section';
            
            const title = document.createElement('div');
            title.className = 'genre-title';
            title.textContent = genero;
            
            const carousel = document.createElement('div');
            carousel.className = 'books-carousel';

            livrosDoGenero.forEach(book => {
                console.log('Criando card para livro:', book.title);
                
                const card = document.createElement('div');
                card.className = 'book-card';
                card.setAttribute('data-book-id', book.id);
                
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
                
                card.appendChild(img);
                card.appendChild(bookTitle);
                card.appendChild(bookAuthor);
                
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

                carousel.appendChild(card);
            });

            section.appendChild(title);
            section.appendChild(carousel);
            booksContainer.appendChild(section);
        });
    }

    renderSections(books);

    function doSearch() {
        const q = (searchInput.value || '').trim().toLowerCase();
        console.log('Fazendo busca por:', q);
        
        if (q) {
            const filteredBooks = books.filter(book => {
                const title = (book.title || '').toLowerCase();
                const author = (book.author || '').toLowerCase();
                const match = title.includes(q) || author.includes(q);
                return match;
            });
            console.log('Livros filtrados:', filteredBooks.length);
            renderSections(filteredBooks);
        } else {
            renderSections(books);
        }
    }

    searchInput.addEventListener('input', doSearch);
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        doSearch();
        searchInput.focus();
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            doSearch();
        }
    });

    console.log('renderBookList concluído. Total de livros:', books.length);
}