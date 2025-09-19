import { navigateTo } from '../main.js';

export async function renderBookList(container) {
    container.innerHTML = '';

    let books = [];
    try {
        console.log('Fazendo requisição para buscar livros...');
        const response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        
        console.log('Status da resposta:', response.status);
        
        if (response.ok) {
            books = await response.json();
            console.log('Livros recebidos:', books);
            console.log('Número de livros:', books.length);
            
            // Debug: mostrar estrutura do primeiro livro
            if (books.length > 0) {
                console.log('Estrutura do primeiro livro:', books[0]);
                console.log('Propriedades do primeiro livro:', Object.keys(books[0]));
            }
        } else {
            const errorText = await response.text();
            console.error('Falha ao carregar livros:', response.statusText, errorText);
            container.innerHTML = '<div class="no-books">Erro ao carregar a lista de livros.</div>';
            return;
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        container.innerHTML = '<div class="no-books">Não foi possível conectar ao servidor.</div>';
        return;
    }

    // Verificação adicional
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

    // Container principal com as classes do seu design
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
        
        // Limpar container
        booksContainer.innerHTML = '';

        if (allBooks.length === 0) {
            booksContainer.innerHTML = '<div class="no-books">Nenhum livro encontrado para esta busca.</div>';
            return;
        }

        // Agrupar livros por gênero
        const livrosPorGenero = allBooks.reduce((acc, book) => {
            // Debug: verificar se o livro tem gênero
            console.log('Processando livro:', book.title, 'Gênero:', book.genre);
            
            // Usar um gênero padrão se não houver
            const genero = book.genre || 'Sem Gênero';
            
            if (!acc[genero]) {
                acc[genero] = [];
            }
            acc[genero].push(book);
            return acc;
        }, {});

        console.log('Livros agrupados por gênero:', livrosPorGenero);

        // Renderizar cada gênero
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
                
                // URL da imagem com fallback
                const imageUrl = book.cover || 'https://via.placeholder.com/100x140/434E70/ffffff?text=' + encodeURIComponent(book.title?.substring(0, 10) || 'Livro');
                
                card.innerHTML = `
                    <img src="${imageUrl}" 
                         alt="${book.title || 'Livro'}" 
                         onerror="this.src='https://via.placeholder.com/100x140/9dadb7/ffffff?text=Sem+Capa'">
                    <div class="book-title">
                        ${book.title || 'Título não disponível'}
                    </div>
                    <div class="book-author">
                        ${book.author || 'Autor desconhecido'}
                    </div>
                `;
                
                // Event listener melhorado para navegação
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const bookId = parseInt(card.getAttribute('data-book-id'));
                    console.log('Clicando no livro:', bookId, book.title);
                    
                    // Verificar se navigateTo está disponível
                    if (typeof navigateTo === 'function') {
                        navigateTo('details', { bookId: bookId });
                    } else {
                        console.error('Função navigateTo não está disponível');
                        // Fallback: tentar navegar diretamente
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

    // Renderizar inicialmente
    renderSections(books);

    // Função de busca
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

    // Event listeners para busca
    searchInput.addEventListener('input', doSearch);
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        doSearch();
        searchInput.focus();
    });

    // Adicionar evento de Enter para busca
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            doSearch();
        }
    });

    // Debug final
    console.log('renderBookList concluído. Total de livros:', books.length);
}