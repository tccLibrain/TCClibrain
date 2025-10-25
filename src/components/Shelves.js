import { navigateTo, showLoading, showError } from '../main.js';

export async function renderShelves(container) {
    console.log('Carregando prateleiras do usuário...');
    showLoading(container, 'Carregando suas prateleiras...');

    let user = null;
    let books = [];
    let userShelves = [];

    try {
        // 1. Obter informações do usuário logado
        const userResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                navigateTo('login');
                return;
            }
            throw new Error('Erro ao carregar perfil do usuário');
        }
        
        user = await userResponse.json();
        console.log('Usuário carregado:', user.nome);

        // 2. Carregar dados em paralelo
        const [booksResponse, shelvesResponse] = await Promise.all([
            fetch('http://localhost:3000/api/books', { credentials: 'include' }),
            fetch('http://localhost:3000/api/user/shelves', { credentials: 'include' })
        ]);

        if (booksResponse.ok) {
            books = await booksResponse.json();
            console.log('Livros carregados:', books.length);
        }

        if (shelvesResponse.ok) {
            userShelves = await shelvesResponse.json();
            console.log('Prateleiras carregadas:', userShelves.length);
        }

    } catch (error) {
        console.error('Erro ao carregar dados das prateleiras:', error);
        showError(container, 'Não foi possível carregar suas prateleiras.');
        return;
    }

    // Renderizar conteúdo das prateleiras
    renderShelvesContent(container, user, books, userShelves);
}

function renderShelvesContent(container, user, books, userShelves) {
    // Filtrar livros por categoria
    const favoriteBooks = books.filter(book => 
        user.favorites && user.favorites.includes(book.id)
    );
    
    const reservedOrBorrowedBooks = books.filter(book => {
        const isBorrowed = book.emprestadoPara === user.cpf;
        const isInQueue = book.queue && book.queue.includes(user.cpf);
        return isBorrowed || isInQueue;
    });

    console.log('Livros processados:', {
        favoritos: favoriteBooks.length,
        emprestadosReservados: reservedOrBorrowedBooks.length,
        prateleiraPersonalizadas: userShelves.length
    });

    container.innerHTML = `
        <style>
            .shelves-container {
                padding: 20px;
            }
            
            .shelves-header {
                text-align: center;
                margin-bottom: 30px;
                background: var(--branco);
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .shelves-header h1 {
                color: var(--azul-escuro);
                margin: 0 0 10px 0;
            }
            
            .shelves-header p {
                color: var(--azul-claro);
                margin: 0;
            }
            
            .shelf-section {
                background: var(--branco);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .shelf-title {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid var(--cinza-claro);
            }
            
            .shelf-title h2 {
                color: var(--azul-escuro);
                margin: 0;
                font-size: 20px;
            }
            
            .shelf-count {
                background: var(--azul-original);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .books-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .book-card-shelf {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                cursor: pointer;
                transition: transform 0.3s ease;
                background: var(--cinza-claro);
                padding: 10px;
                border-radius: 8px;
            }
            
            .book-card-shelf:hover {
                transform: translateY(-5px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }
            
            .book-card-shelf img {
                width: 90px;
                height: 130px;
                object-fit: cover;
                border-radius: 6px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                margin-bottom: 8px;
            }
            
            .book-card-shelf .book-title {
                font-size: 12px;
                font-weight: bold;
                color: var(--azul-escuro);
                margin-bottom: 4px;
                line-height: 1.2;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            
            .book-card-shelf .book-author {
                font-size: 10px;
                color: var(--azul-claro);
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
            }
            
            .empty-shelf {
                text-align: center;
                padding: 40px 20px;
                color: var(--azul-claro);
                font-style: italic;
                background: var(--cinza-claro);
                border-radius: 8px;
                border: 2px dashed var(--cinza-escuro);
            }
            
            .create-shelf-section {
                text-align: center;
                margin-bottom: 30px;
                background: var(--branco);
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .create-shelf-form {
                display: flex;
                gap: 10px;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .create-shelf-form input {
                padding: 10px 15px;
                border: 1px solid var(--cinza-escuro);
                border-radius: 6px;
                font-size: 14px;
                min-width: 200px;
            }
            
            .shelf-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 10px;
            }
            
            .btn-delete-shelf {
                background-color: #dc3545;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .btn-delete-shelf:hover {
                background-color: #c82333;
            }
            
            .shelf-stats {
                display: flex;
                justify-content: space-around;
                background: var(--cinza-claro);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 15px;
            }
            
            .stat-item {
                text-align: center;
            }
            
            .stat-number {
                font-size: 20px;
                font-weight: bold;
                color: var(--azul-escuro);
                display: block;
            }
            
            .stat-label {
                font-size: 11px;
                color: var(--azul-claro);
            }
            
            @media (max-width: 768px) {
                .shelves-container {
                    padding: 10px;
                }
                
                .books-grid {
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 10px;
                }
                
                .book-card-shelf img {
                    width: 80px;
                    height: 115px;
                }
                
                .create-shelf-form {
                    flex-direction: column;
                }
                
                .create-shelf-form input {
                    min-width: auto;
                    width: 90%;
                }
            }
        </style>

        <div class="shelves-container">
            <div class="shelves-header">
                <h1>Minhas Prateleiras</h1>
                <p>Organize seus livros do jeito que preferir</p>
            </div>

            <div class="shelf-stats">
                <div class="stat-item">
                    <span class="stat-number">${favoriteBooks.length}</span>
                    <span class="stat-label">Favoritos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${reservedOrBorrowedBooks.length}</span>
                    <span class="stat-label">Empréstimos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${userShelves.length}</span>
                    <span class="stat-label">Prateleiras</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${books.length}</span>
                    <span class="stat-label">Total Livros</span>
                </div>
            </div>

            ${renderShelf('⭐ Meus Favoritos', favoriteBooks, false)}
            
            ${renderShelf('📚 Emprestados & Reservados', reservedOrBorrowedBooks, false)}

            <div class="create-shelf-section">
                <h3 style="color: var(--azul-escuro); margin-bottom: 15px;">Criar Nova Prateleira</h3>
                <div class="create-shelf-form">
                    <input type="text" id="shelf-name-input" placeholder="Nome da prateleira..." maxlength="50" />
                    <button id="create-shelf-btn" class="btn">Criar Prateleira</button>
                </div>
            </div>

            <div id="custom-shelves-container">
                ${userShelves.map(shelf => {
                    const shelfBooks = books.filter(book => 
                        shelf.books && shelf.books.includes(book.id)
                    );
                    return renderShelf(shelf.name || shelf.nome_prateleira, shelfBooks, true, shelf.id);
                }).join('')}
            </div>
        </div>
    `;

    setupShelvesEventListeners(container, user, books, userShelves);
}

function renderShelf(shelfName, booksArray, isCustom = false, shelfId = null) {
    const booksHtml = booksArray.length > 0 
        ? booksArray.map(book => {
            // ✅ IGUAL AO BOOK LIST - Pega a URL diretamente do banco
            const imageUrl = book.cover || '';
            return `
                <div class="book-card-shelf" data-book-id="${book.id}">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${book.title}" />` : ''}
                    <div class="book-title">${book.title || 'Título não disponível'}</div>
                    <div class="book-author">${book.author || 'Autor desconhecido'}</div>
                </div>
            `;
        }).join('')
        : '<div class="empty-shelf">Nenhum livro nesta prateleira ainda</div>';

    return `
        <div class="shelf-section" ${isCustom ? `data-shelf-id="${shelfId}"` : ''}>
            <div class="shelf-title">
                <h2>${shelfName}</h2>
                <span class="shelf-count">${booksArray.length} ${booksArray.length === 1 ? 'livro' : 'livros'}</span>
            </div>
            <div class="books-grid">
                ${booksHtml}
            </div>
            ${isCustom ? `
                <div class="shelf-actions">
                    <button class="btn-delete-shelf" data-shelf-id="${shelfId}">
                        🗑️ Excluir Prateleira
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}


function setupShelvesEventListeners(container, user, books, userShelves) {
    // Criar nova prateleira
    const createBtn = container.querySelector('#create-shelf-btn');
    const nameInput = container.querySelector('#shelf-name-input');

    if (createBtn && nameInput) {
        const createShelf = async () => {
            const shelfName = nameInput.value.trim();
            if (!shelfName) {
                alert('Por favor, digite um nome para a prateleira.');
                nameInput.focus();
                return;
            }

            if (shelfName.length < 2) {
                alert('O nome deve ter pelo menos 2 caracteres.');
                nameInput.focus();
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/user/shelves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name: shelfName })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Prateleira criada com sucesso!');
                    nameInput.value = '';
                    renderShelves(container);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao criar prateleira:', error);
                alert('Erro de conexão ao criar prateleira.');
            }
        };

        createBtn.addEventListener('click', createShelf);
        
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createShelf();
            }
        });
    }

    // Event listener unificado para o container
    container.addEventListener('click', async (e) => {
        // Navegar para detalhes do livro
        const bookCard = e.target.closest('.book-card-shelf');
        if (bookCard) {
            const bookId = parseInt(bookCard.dataset.bookId);
            if (bookId) {
                console.log('Navegando para livro:', bookId);
                navigateTo('book-details', { bookId, user });
            }
            return;
        }

        // Excluir prateleira
        if (e.target.classList.contains('btn-delete-shelf')) {
            const shelfId = e.target.dataset.shelfId;
            const shelfSection = e.target.closest('.shelf-section');
            const shelfName = shelfSection.querySelector('h2').textContent;

            if (!confirm(`Deseja realmente excluir a prateleira "${shelfName}"?\n\nEsta ação não pode ser desfeita.`)) {
                return;
            }

            try {
                const response = await fetch(`http://localhost:3000/api/user/shelves/${shelfId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Prateleira excluída com sucesso!');
                    renderShelves(container);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao excluir prateleira:', error);
                alert('Erro de conexão ao excluir prateleira.');
            }
        }
    });
}