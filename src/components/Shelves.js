import { navigateTo, showLoading, showError } from '../main.js';

export async function renderShelves(container) {
    console.log('=== RENDERIZANDO PRATELEIRAS ===');
    
    showLoading(container, 'Carregando suas prateleiras...');

    let user = null;
    let books = [];
    let userShelves = [];

    try {
        // 1️⃣ Buscar usuário
        const userResponse = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!userResponse.ok) {
            if (userResponse.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                navigateTo('login');
                return;
            }
            throw new Error('Erro ao carregar perfil');
        }
        
        user = await userResponse.json();
        console.log('✅ Usuário:', user.nome);

        // 2️⃣ Buscar livros e prateleiras em paralelo
        const [booksResponse, shelvesResponse] = await Promise.all([
            fetch('http://localhost:3000/api/books', { credentials: 'include' }),
            fetch('http://localhost:3000/api/user/shelves', { credentials: 'include' })
        ]);

        if (booksResponse.ok) {
            books = await booksResponse.json();
            console.log('✅ Livros:', books.length);
        }

        if (shelvesResponse.ok) {
            userShelves = await shelvesResponse.json();
            console.log('✅ Prateleiras:', userShelves.length);
        }

    } catch (error) {
        console.error('❌ Erro ao carregar prateleiras:', error);
        showError(container, 'Não foi possível carregar suas prateleiras.');
        return;
    }

    renderShelvesContent(container, user, books, userShelves);
}

function renderShelvesContent(container, user, books, userShelves) {
    // Filtrar livros por categoria
    const favoriteBooks = books.filter(book => 
        user.favorites && user.favorites.includes(book.id)
    );
    
    const borrowedOrReservedBooks = books.filter(book => {
        const isBorrowed = book.emprestadoPara === user.cpf;
        const isInQueue = book.queue && book.queue.includes(user.cpf);
        return isBorrowed || isInQueue;
    });

    console.log('📊 Categorias:', {
        favoritos: favoriteBooks.length,
        emprestados: borrowedOrReservedBooks.length,
        personalizadas: userShelves.length
    });

    container.innerHTML = `
        <style>
            .shelves-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            .shelves-header {
                text-align: center;
                margin-bottom: 30px;
                padding: 30px;
                background: linear-gradient(135deg, #434e70 0%, #5a6688 100%);
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                color: white;
            }
            
            .shelves-header h1 {
                margin: 0 0 10px 0;
                font-size: 28px;
                font-weight: 700;
            }
            
            .shelves-header p {
                margin: 0;
                font-size: 16px;
                opacity: 0.95;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                transition: transform 0.3s, box-shadow 0.3s;
            }
            
            .stat-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 4px 12px rgba(67, 78, 112, 0.2);
            }
            
            .stat-number {
                display: block;
                font-size: 32px;
                font-weight: 700;
                color: #434e70;
                margin-bottom: 8px;
            }
            
            .stat-label {
                font-size: 13px;
                color: #718096;
                font-weight: 600;
            }
            
            .shelf-section {
                background: white;
                border-radius: 12px;
                padding: 8px;
                margin-bottom: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            
            .shelf-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e2e8f0;
            }
            
            .shelf-header h2 {
                margin: 0;
                color: #2d3748;
                font-size: 20px;
                font-weight: 700;
            }
            
            .shelf-count {
                background: linear-gradient(135deg, #434e70 0%, #5a6688 100%);
                color: white;
                padding: 6px 14px;
                border-radius: 15px;
                font-size: 13px;
                font-weight: 700;
            }
            
            .books-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                gap: 20px;
            }
            
            .book-card {
                cursor: pointer;
                transition: transform 0.3s, box-shadow 0.3s;
                background: #f7fafc;
                padding: 12px;
                border-radius: 12px;
                border: 2px solid #e2e8f0;
            }
            
            .book-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 20px rgba(67, 78, 112, 0.2);
                border-color: #434e70;
            }
            
            .book-cover {
                width: 100%;
                aspect-ratio: 2/3;
                object-fit: cover;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin-bottom: 12px;
                background: linear-gradient(135deg, #434e70 0%, #5a6688 100%);
            }
            
            .book-title {
                font-size: 13px;
                font-weight: 700;
                color: #2d3748;
                margin-bottom: 6px;
                line-height: 1.3;
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                min-height: 36px;
            }
            
            .book-author {
                font-size: 12px;
                color: #718096;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .empty-shelf {
                text-align: center;
                padding: 60px 20px;
                color: #718096;
                font-style: italic;
                background: #f7fafc;
                border-radius: 12px;
                border: 2px dashed #cbd5e0;
            }
            
            .create-shelf-section {
                background: white;
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 30px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            
            .create-shelf-section h3 {
                margin: 0 0 20px 0;
                color: #2d3748;
                font-size: 20px;
                font-weight: 700;
                text-align: center;
            }
            
            .create-shelf-form {
                display: flex;
                gap: 12px;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .create-shelf-form input {
                flex: 1;
                min-width: 250px;
                padding: 12px 3px;
                max-width: 400px;  
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                font-size: 15px;
                transition: all 0.3s;
            }
            
            .create-shelf-form input:focus {
                outline: none;
                border-color: #434e70;
                box-shadow: 0 0 0 3px rgba(67, 78, 112, 0.1);
            }
            
            .shelf-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 15px;
            }
            
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #434e70 0%, #5a6688 100%);
                color: white;
            }
            
            .btn-danger {
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                color: white;
            }
            
            @media (max-width: 768px) {
                .shelves-container {
                    padding: 12px;
                }
                
                .shelves-header {
                    padding: 20px;
                }
                
                .shelves-header h1 {
                    font-size: 24px;
                }
                
                .books-grid {
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 15px;
                }
                
                .create-shelf-form {
                    flex-direction: column;
                }
                
                .create-shelf-form input {
                    min-width: 100%;
                }
                
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
        </style>

        <div class="shelves-container">
            <!-- HEADER -->
            <div class="shelves-header">
                <h1>📚 Minhas Prateleiras</h1>
                <p>Organize seus livros do jeito que preferir</p>
            </div>

            <!-- ESTATÍSTICAS -->
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${favoriteBooks.length}</span>
                    <span class="stat-label">❤️ Favoritos</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${borrowedOrReservedBooks.length}</span>
                    <span class="stat-label">📖 Empréstimos</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${userShelves.length}</span>
                    <span class="stat-label">📚 Prateleiras</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${books.length}</span>
                    <span class="stat-label">📕 Total</span>
                </div>
            </div>

            <!-- PRATELEIRAS PADRÃO -->
            ${renderShelf('⭐ Meus Favoritos', favoriteBooks, false)}
            ${renderShelf('📖 Emprestados & Reservados', borrowedOrReservedBooks, false)}

            <!-- CRIAR NOVA PRATELEIRA -->
            <div class="create-shelf-section">
                <h3>➕ Criar Nova Prateleira</h3>
                <p style="color: #718096; font-size: 14px; margin: 0 0 20px 0; text-align: center;">
                    Organize seus livros em categorias personalizadas
                </p>
                <div class="create-shelf-form">
                    <input type="text" 
                           id="shelf-name-input" 
                           placeholder="📚 Digite o nome da prateleira..." 
                           maxlength="50" />
                    <button id="create-shelf-btn" class="btn btn-primary">
                        ✓ Criar Prateleira
                    </button>
                </div>
            </div>

            <!-- PRATELEIRAS PERSONALIZADAS -->
            <div id="custom-shelves-container">
                ${userShelves.map(shelf => {
                    const shelfId = shelf.id || shelf.id_prateleira;
                    const shelfName = shelf.name || shelf.nome_prateleira;
                    const shelfBooks = books.filter(book => 
                        shelf.books && shelf.books.includes(book.id)
                    );
                    
                    console.log('📚 Prateleira:', { id: shelfId, nome: shelfName, livros: shelfBooks.length });
                    
                    return renderShelf(shelfName, shelfBooks, true, shelfId);
                }).join('')}
            </div>
        </div>
    `;

    setupShelvesEventListeners(container, user, books, userShelves);
}

function renderShelf(shelfName, booksArray, isCustom = false, shelfId = null) {
    const booksHtml = booksArray.length > 0 
        ? booksArray.map(book => `
            <div class="book-card" data-book-id="${book.id}">
                ${book.cover ? `<img src="${book.cover}" alt="${book.title}" class="book-cover" />` : '<div class="book-cover"></div>'}
                <div class="book-title">${book.title || 'Título não disponível'}</div>
                <div class="book-author">${book.author || 'Autor desconhecido'}</div>
            </div>
        `).join('')
        : '<div class="empty-shelf">📭 Nenhum livro nesta prateleira ainda</div>';

    return `
        <div class="shelf-section" ${isCustom ? `data-shelf-id="${shelfId}"` : ''}>
            <div class="shelf-header">
                <h2>${shelfName}</h2>
                <span class="shelf-count">
                    ${booksArray.length} ${booksArray.length === 1 ? 'livro' : 'livros'}
                </span>
            </div>
            <div class="books-grid">
                ${booksHtml}
            </div>
            ${isCustom ? `
                <div class="shelf-actions">
                    <button class="btn btn-danger" data-shelf-id="${shelfId}">
                        🗑️ Excluir Prateleira
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function setupShelvesEventListeners(container, user, books, userShelves) {
    // Criar prateleira
    setupCreateShelf(container);
    
    // Cliques gerais (livros e excluir prateleiras)
    setupGeneralClicks(container, user);
}

function setupCreateShelf(container) {
    const createBtn = container.querySelector('#create-shelf-btn');
    const nameInput = container.querySelector('#shelf-name-input');

    if (!createBtn || !nameInput) return;

    const createShelf = async () => {
        const shelfName = nameInput.value.trim();
        
        if (!shelfName) {
            alert('📝 Digite um nome para a prateleira');
            nameInput.focus();
            return;
        }

        if (shelfName.length < 2) {
            alert('❌ O nome deve ter pelo menos 2 caracteres');
            nameInput.focus();
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = '⏳ Criando...';

        try {
            const response = await fetch('http://localhost:3000/api/user/shelves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: shelfName })
            });

            const result = await response.json();

            if (response.ok) {
                alert('✅ ' + (result.message || 'Prateleira criada!'));
                nameInput.value = '';
                renderShelves(container);
            } else {
                throw new Error(result.error || 'Erro ao criar prateleira');
            }
        } catch (error) {
            console.error('❌ Erro:', error);
            alert(`❌ ${error.message}`);
            createBtn.disabled = false;
            createBtn.textContent = '✓ Criar';
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

function setupGeneralClicks(container, user) {
    container.addEventListener('click', async (e) => {
        // 📖 Clicar em livro
        const bookCard = e.target.closest('.book-card');
        if (bookCard) {
            const bookId = parseInt(bookCard.dataset.bookId);
            if (bookId) {
                console.log('📖 Navegando para livro:', bookId);
                navigateTo('book-details', { bookId, user });
            }
            return;
        }

        // 🗑️ Excluir prateleira
        if (e.target.classList.contains('btn-danger') && e.target.dataset.shelfId) {
            await handleDeleteShelf(e.target, container, user);
        }
    });
}

async function handleDeleteShelf(button, container, user) {
    if (button.disabled) {
        console.log('⏸️ Botão já está processando');
        return;
    }

    const shelfIdStr = button.dataset.shelfId;
    const shelfId = parseInt(shelfIdStr);
    const shelfSection = button.closest('.shelf-section');
    const shelfName = shelfSection.querySelector('h2').textContent;

    console.log('🗑️ Excluindo prateleira:', { id: shelfId, nome: shelfName });

    if (!shelfId || isNaN(shelfId)) {
        alert('❌ ID da prateleira inválido');
        return;
    }

    if (!confirm(`🗑️ Deseja realmente excluir "${shelfName}"?\n\nEsta ação não pode ser desfeita.`)) {
        console.log('❌ Exclusão cancelada');
        return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = '⏳ Excluindo...';

    try {
        // Verificar sessão
        const profileCheck = await fetch('http://localhost:3000/api/profile', {
            credentials: 'include'
        });
        
        if (!profileCheck.ok) {
            alert('Sessão expirada. Faça login novamente.');
            navigateTo('login');
            return;
        }

        // Excluir prateleira
        const response = await fetch(`http://localhost:3000/api/user/shelves/${shelfId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('📡 Status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Excluída:', result);
            alert('✅ ' + (result.message || 'Prateleira excluída!'));
            renderShelves(container);
        } else {
            let errorMessage = 'Erro desconhecido';
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
                console.error('❌ Erro do servidor:', error);
            } catch (e) {
                console.error('❌ Não foi possível ler erro');
            }
            
            alert(`❌ ${errorMessage}`);
            button.disabled = false;
            button.textContent = originalText;
        }
    } catch (error) {
        console.error('❌ Erro de conexão:', error);
        alert('❌ Erro de conexão');
        button.disabled = false;
        button.textContent = originalText;
    }
}