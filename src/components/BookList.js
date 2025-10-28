import { navigateTo } from '../main.js';

export async function renderBookList(container) {
    console.log('=== RENDERIZANDO LISTA DE LIVROS ===');
    
    container.innerHTML = '<div class="loading">Carregando livros...</div>';
    
    try {
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

        const response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar livros');
        }
        
        const books = await response.json();
        console.log('Total de livros carregados:', books.length);

        if (books.length === 0) {
            container.innerHTML = '<div class="no-books">Nenhum livro encontrado.</div>';
            return;
        }

        container.innerHTML = `
            <style>
                html, body {
                    margin: 0;
                    padding: 0;
                    background-color: #434E70;
                }

                .books-container { 
                    max-width: 1400px; 
                    margin: 0 auto; 
                    padding: 20px;
                }
                
                /* SEARCH & FILTERS */
                .search-filter-container { 
                    background: #CFD2DB; 
                    padding: 25px; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                    margin-bottom: 30px; 
                }
                
                .search-bar { 
                    display: flex; 
                    gap: 15px; 
                    margin-bottom: 20px; 
                    flex-wrap: wrap; 
                }
                
                .search-bar input, .search-bar select { 
                    flex: 1; 
                    min-width: 200px; 
                    padding: 12px 3px; 
                    border: 2px solid white; 
                    border-radius: 999px; 
                    font-size: 14px; 
                    transition: all 0.3s;
                    background: white;
                    color: #434E70;
                    font-family: arial black;
                    text-align: center;
                }
                
                .search-bar input:focus, .search-bar select:focus { 
                    outline: none; 
                    border-color: #9bb4ff; 
                    box-shadow: 0 0 0 3px rgba(155, 180, 255, 0.2);
                }
                
                .search-bar input::placeholder { 
                    color: #434E70; 
                    opacity: 0.7;
                }
                
                .search-bar select {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23434E70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 15px center;
                    background-size: 18px;
                    padding-right: 45px;
                    cursor: pointer;
                }
                
                /* FILTER TAGS */
                .filter-tags { 
                    display: flex; 
                    gap: 12px; 
                    flex-wrap: wrap; 
                    justify-content: center;
                }
                
                .filter-tag { 
                    padding: 10px 20px; 
                    background: white; 
                    border: 2px solid white; 
                    border-radius: 999px; 
                    cursor: pointer; 
                    font-size: 14px; 
                    font-weight: 600;
                    transition: all 0.3s;
                    color: #434E70;
                    font-family: arial black;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                }
                
                .filter-tag:hover { 
                    background: #e8ecef; 
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                }
                
                .filter-tag.active { 
                    background: linear-gradient(135deg, #9bb4ff 0%, #7a9dff 100%); 
                    color: white; 
                    border-color: #9bb4ff;
                    box-shadow: 0 4px 12px rgba(155, 180, 255, 0.4);
                }
                
                /* BOOKS GRID */
                .books-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); 
                    gap: 24px; 
                    padding: 0 4px;
                    justify-items: center;
                }
                
                /* BOOK CARD */
                .book-card { 
                    background: #CFD2DB; 
                    border-radius: 15px; 
                    padding: 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
                    transition: all 0.3s ease; 
                    cursor: pointer; 
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 180px;
                }
                
                .book-card:hover { 
                    transform: translateY(-5px); 
                    box-shadow: 0 8px 20px rgba(155, 180, 255, 0.3); 
                }
                
                .book-cover-wrapper {
                    position: relative;
                    width: 100%;
                    padding-top: 150%;
                    overflow: hidden;
                    border-radius: 15px 15px 0 0;
                    background: linear-gradient(135deg, #9bb4ff 0%, #7a9dff 100%);
                }
                
                .book-cover { 
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%; 
                    height: 100%; 
                    object-fit: cover; 
                    transition: transform 0.3s ease;
                }
                
                .book-card:hover .book-cover { 
                    transform: scale(1.05); 
                }
                
                .book-info {
                    padding: 16px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .book-title { 
                    font-weight: 700; 
                    color: #434E70; 
                    margin: 0; 
                    font-size: 14px; 
                    line-height: 1.4; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                    display: -webkit-box; 
                    -webkit-line-clamp: 2; 
                    -webkit-box-orient: vertical;
                    min-height: 40px;
                    font-family: arial black;
                }
                
                .book-author { 
                    color: #434E70; 
                    font-size: 12px; 
                    margin: 0;
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                    white-space: nowrap;
                    font-family: arial;
                }
                
                .book-rating { 
                    color: #ffd700; 
                    font-size: 12px; 
                    margin: 0;
                    font-weight: 600;
                    font-family: arial black;
                }
                
                .book-status { 
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 6px 14px; 
                    border-radius: 999px; 
                    font-size: 11px; 
                    font-weight: 700; 
                    margin-top: auto;
                    align-self: flex-start;
                    font-family: arial black;
                }
                
                .status-disponivel { 
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
                    color: #155724; 
                    border: 2px solid #28a745;
                }
                
                .status-emprestado { 
                    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); 
                    color: #721c24; 
                    border: 2px solid #dc3545;
                }
                
                .favorite-badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                    z-index: 10;
                }
                
                /* EMPTY STATE */
                .no-books { 
                    text-align: center; 
                    padding: 60px 20px; 
                    color: #434E70; 
                    font-size: 18px;
                    background: #CFD2DB;
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    font-family: arial;
                }
                
                .no-books h3 {
                    color: #434E70;
                    margin-bottom: 10px;
                    font-size: 24px;
                    font-family: arial black;
                }
                
                /* LOADING */
                .loading { 
                    text-align: center; 
                    padding: 60px; 
                    color: white; 
                    font-size: 20px;
                    font-weight: 600;
                    font-family: arial black;
                }
                
                /* RESULTS COUNT */
                .results-count {
                    text-align: center;
                    margin-bottom: 20px;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    font-family: arial black;
                }
                
                @media (max-width: 768px) {
                    .books-grid { 
                        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
                        gap: 16px;
                        justify-items: center;
                    }
                    .search-bar { flex-direction: column; }
                    .search-bar input, .search-bar select { min-width: 100%; }
                    .filter-tags { justify-content: center; }
                    .book-info { padding: 14px; }
                    .book-title { font-size: 13px; min-height: 36px; }
                    .book-card { max-width: 160px; }
                }
                
                @media (min-width: 769px) and (max-width: 1024px) {
                    .books-grid { 
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        justify-items: center;
                    }
                    .book-card { max-width: 180px; }
                }
            </style>
            
            <div class="books-container">
                <div class="search-filter-container">
                    <div class="search-bar">
                        <input type="text" id="searchInput" placeholder="🔍 Buscar por título ou autor..." />
                        <select id="genreFilter">
                            <option value="">📚 Todos os Gêneros</option>
                        </select>
                    </div>
                    <div class="filter-tags">
                        <button class="filter-tag active" data-filter="all">📖 Todos</button>
                        <button class="filter-tag" data-filter="available">✅ Disponíveis</button>
                        <button class="filter-tag" data-filter="unavailable">🔒 Emprestados</button>
                        ${currentUser ? '<button class="filter-tag" data-filter="favorites">❤️ Favoritos</button>' : ''}
                    </div>
                </div>
                
                <div class="results-count" id="resultsCount"></div>
                <div class="books-grid" id="booksGrid"></div>
            </div>
        `;

        const genres = [...new Set(books.map(b => b.genre).filter(Boolean))].sort();
        const genreFilter = container.querySelector('#genreFilter');
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            genreFilter.appendChild(option);
        });

        function renderBookCards(filteredBooks) {
            const booksGrid = container.querySelector('#booksGrid');
            const resultsCount = container.querySelector('#resultsCount');
            
            resultsCount.textContent = `${filteredBooks.length} ${filteredBooks.length === 1 ? 'livro encontrado' : 'livros encontrados'}`;
            
            if (filteredBooks.length === 0) {
                booksGrid.innerHTML = `
                    <div class="no-books">
                        <h3>📚 Nenhum livro encontrado</h3>
                        <p>Tente ajustar os filtros de busca</p>
                    </div>
                `;
                return;
            }

            booksGrid.innerHTML = filteredBooks.map(book => {
                const isAvailable = book.available === true || book.available === 'true' || book.available === 1;
                const isFavorited = currentUser && currentUser.favorites && currentUser.favorites.includes(book.id);
                
                const imageUrl = book.cover || '';
                const avgRating = book.avgRating ? parseFloat(book.avgRating).toFixed(1) : null;
                const stars = avgRating ? '⭐'.repeat(Math.round(avgRating)) : '';

                return `
                    <div class="book-card" data-book-id="${book.id}" data-favorite="${isFavorited}">
                        ${isFavorited ? '<div class="favorite-badge">❤️</div>' : ''}
                        <div class="book-cover-wrapper">
                            ${imageUrl ? `<img src="${imageUrl}" class="book-cover" alt="${book.title}" />` : ''}
                        </div>
                        <div class="book-info">
                            <div class="book-title">${book.title}</div>
                            <div class="book-author">${book.author || 'Autor desconhecido'}</div>
                            ${avgRating ? `<div class="book-rating">${stars} ${avgRating}</div>` : ''}
                            <span class="book-status ${isAvailable ? 'status-disponivel' : 'status-emprestado'}">
                                ${isAvailable ? '✓ Disponível' : '✗ Emprestado'}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');

            booksGrid.querySelectorAll('.book-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const bookId = parseInt(card.getAttribute('data-book-id'));
                    console.log('Clicando no livro ID:', bookId);
                    
                    if (typeof navigateTo === 'function') {
                        navigateTo('book-details', { bookId: bookId });
                    } else {
                        window.location.hash = `#book-details/${bookId}`;
                    }
                });
            });
        }

        let currentFilter = 'all';
        renderBookCards(books);

        const filterTags = container.querySelectorAll('.filter-tag');
        const searchInput = container.querySelector('#searchInput');
        const genreFilterSelect = container.querySelector('#genreFilter');

        function applyFilters() {
            let filtered = books;

            if (currentFilter === 'available') {
                filtered = filtered.filter(b => b.available === true || b.available === 'true' || b.available === 1);
            } else if (currentFilter === 'unavailable') {
                filtered = filtered.filter(b => !(b.available === true || b.available === 'true' || b.available === 1));
            } else if (currentFilter === 'favorites' && currentUser) {
                filtered = filtered.filter(b => currentUser.favorites && currentUser.favorites.includes(b.id));
            }

            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) {
                filtered = filtered.filter(b => 
                    (b.title && b.title.toLowerCase().includes(searchTerm)) ||
                    (b.author && b.author.toLowerCase().includes(searchTerm))
                );
            }

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
                <h3>❌ Erro ao carregar os livros</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #9bb4ff 0%, #7a9dff 100%); color: white; border: none; border-radius: 999px; cursor: pointer; font-weight: 600; font-family: arial black; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">🔄 Recarregar</button>
            </div>
        `;
    }
}