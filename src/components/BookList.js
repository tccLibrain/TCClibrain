import { navigateTo } from '../main.js';

export async function renderBookList(container) {
    console.log('=== RENDERIZANDO LISTA DE LIVROS ===');
    
    container.innerHTML = '<div class="loading">Carregando livros...</div>';
    
    try {
        // Buscar usuário atual
        let currentUser = null;
        try {
            const userResponse = await fetch('http://localhost:3000/api/profile', {
                credentials: 'include'
            });
            if (userResponse.ok) {
                currentUser = await userResponse.json();
                console.log('Usuário atual:', currentUser.nome);
            }
        } catch (error) {
            console.log('Usuário não logado');
        }

        // Buscar livros
        const response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar livros');
        }
        
        const books = await response.json();
        console.log('Total de livros carregados:', books.length);
        console.log('Livros indisponíveis:', books.filter(b => !b.available).length);

        if (books.length === 0) {
            container.innerHTML = '<div class="no-books">Nenhum livro encontrado.</div>';
            return;
        }

        // HTML da lista de livros
        container.innerHTML = `
            <style>
                .books-container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                .search-filter-container { background: var(--branco); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
                .search-bar { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
                .search-bar input, .search-bar select { flex: 1; min-width: 200px; padding: 12px; border: 2px solid var(--cinza-claro); border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
                .search-bar input:focus, .search-bar select:focus { outline: none; border-color: var(--azul-claro); }
                .filter-tags { display: flex; gap: 10px; flex-wrap: wrap; }
                .filter-tag { padding: 8px 16px; background: var(--cinza-claro); border: none; border-radius: 20px; cursor: pointer; font-size: 14px; transition: all 0.3s; }
                .filter-tag.active { background: var(--azul-escuro); color: white; }
                .filter-tag:hover { background: var(--azul-claro); color: white; }
                .books-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
                .book-card { background: var(--branco); border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; cursor: pointer; position: relative; }
                .book-card:hover { transform: translateY(-5px); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
                .book-cover { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; background: #f0f0f0; }
                .book-title { font-weight: bold; color: var(--azul-escuro); margin: 8px 0; font-size: 16px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
                .book-author { color: var(--azul-claro); font-size: 14px; margin-bottom: 8px; }
                .book-status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 8px; }
                .status-disponivel { background: #d4edda; color: #155724; }
                .status-emprestado { background: #f8d7da; color: #721c24; }
                .book-rating { color: #ffd700; font-size: 14px; margin-top: 5px; }
                .no-books { text-align: center; padding: 40px; color: var(--azul-claro); font-size: 18px; }
                .loading { text-align: center; padding: 40px; color: var(--azul-claro); font-size: 18px; }
                @media (max-width: 768px) {
                    .books-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
                    .book-cover { height: 200px; }
                }
            </style>
            
            <div class="books-container">
                <div class="search-filter-container">
                    <div class="search-bar">
                        <input type="text" id="searchInput" placeholder="🔍 Buscar por título ou autor..." />
                        <select id="genreFilter">
                            <option value="">Todos os Gêneros</option>
                        </select>
                    </div>
                    <div class="filter-tags">
                        <button class="filter-tag active" data-filter="all">Todos</button>
                        <button class="filter-tag" data-filter="available">Disponíveis</button>
                        <button class="filter-tag" data-filter="unavailable">Emprestados</button>
                        ${currentUser ? '<button class="filter-tag" data-filter="favorites">Favoritos</button>' : ''}
                    </div>
                </div>
                
                <div class="books-grid" id="booksGrid"></div>
            </div>
        `;

        // Preencher filtro de gêneros
        const genres = [...new Set(books.map(b => b.genre).filter(Boolean))].sort();
        const genreFilter = container.querySelector('#genreFilter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        // Função para renderizar os cards
        function renderBookCards(filteredBooks) {
            const booksGrid = container.querySelector('#booksGrid');
            
            if (filteredBooks.length === 0) {
                booksGrid.innerHTML = '<div class="no-books">Nenhum livro encontrado com os filtros aplicados.</div>';
                return;
            }

            booksGrid.innerHTML = filteredBooks.map(book => {
                const isAvailable = book.available === true || book.available === 'true' || book.available === 1;
                const isFavorited = currentUser && currentUser.favorites && currentUser.favorites.includes(book.id);
                
                // ✅ SEM PLACEHOLDER - Só usa a URL do banco
                const imageUrl = book.cover || '';
                
                const avgRating = book.avgRating ? parseFloat(book.avgRating).toFixed(1) : null;
                const stars = avgRating ? '⭐'.repeat(Math.round(avgRating)) : '';

                return `
                    <div class="book-card" data-book-id="${book.id}" data-favorite="${isFavorited}">
                        ${imageUrl ? `<img src="${imageUrl}" class="book-cover" alt="${book.title}" />` : '<div class="book-cover"></div>'}
                        <div class="book-title">${book.title}</div>
                        <div class="book-author">${book.author || 'Autor desconhecido'}</div>
                        ${avgRating ? `<div class="book-rating">${stars} ${avgRating}</div>` : ''}
                        <span class="book-status ${isAvailable ? 'status-disponivel' : 'status-emprestado'}">
                            ${isAvailable ? '✓ Disponível' : '✗ Emprestado'}
                        </span>
                    </div>
                `;
            }).join('');

            // Event listeners para os cards
            booksGrid.querySelectorAll('.book-card').forEach(card => {
             // Event listener para clicar no livro
card.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const bookId = parseInt(card.getAttribute('data-book-id'));
    const bookTitle = card.querySelector('.book-title').textContent;
    console.log('Clicando no livro:', bookId, bookTitle);
    
    if (typeof navigateTo === 'function') {
        navigateTo('book-details', { bookId: bookId });  // ✅ CORRETO
    } else {
        console.error('Função navigateTo não está disponível');
        window.location.hash = `#book-details/${bookId}`;  // ✅ CORRETO
    }
});
            });
        }

        // Inicializar com todos os livros
        let currentFilter = 'all';
        renderBookCards(books);

        // Event listeners para filtros
        const filterTags = container.querySelectorAll('.filter-tag');
        const searchInput = container.querySelector('#searchInput');
        const genreFilterSelect = container.querySelector('#genreFilter');

        function applyFilters() {
            let filtered = books;

            // Filtro de status
            if (currentFilter === 'available') {
                filtered = filtered.filter(b => b.available === true || b.available === 'true' || b.available === 1);
            } else if (currentFilter === 'unavailable') {
                filtered = filtered.filter(b => !(b.available === true || b.available === 'true' || b.available === 1));
            } else if (currentFilter === 'favorites' && currentUser) {
                filtered = filtered.filter(b => currentUser.favorites && currentUser.favorites.includes(b.id));
            }

            // Filtro de busca
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                filtered = filtered.filter(b => 
                    (b.title && b.title.toLowerCase().includes(searchTerm)) ||
                    (b.author && b.author.toLowerCase().includes(searchTerm))
                );
            }

            // Filtro de gênero
            const selectedGenre = genreFilterSelect.value;
            if (selectedGenre) {
                filtered = filtered.filter(b => b.genre === selectedGenre);
            }

            renderBookCards(filtered);
        }

        filterTags.forEach(tag => {
            tag.addEventListener('click', () => {
                filterTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentFilter = tag.dataset.filter;
                applyFilters();
            });
        });

        searchInput.addEventListener('input', applyFilters);
        genreFilterSelect.addEventListener('change', applyFilters);

        console.log('✅ Lista de livros renderizada com sucesso');

    } catch (error) {
        console.error('Erro ao carregar livros:', error);
        container.innerHTML = `
            <div class="no-books">
                <h3>Erro ao carregar os livros</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="btn">Recarregar</button>
            </div>
        `;
    }
}