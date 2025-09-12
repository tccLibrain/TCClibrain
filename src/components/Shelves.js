import { navigateTo } from '../main.js';

export async function renderShelves(container) {
    // Limpa o container antes de renderizar
    container.innerHTML = '';

    let user = null;
    let books = [];
    let userShelves = [];

    // 1. Obter informações do usuário logado
    try {
        const userResponse = await fetch('http://localhost:3000/api/profile');
        if (userResponse.ok) {
            user = await userResponse.json();
        } else {
            alert('Sessão expirada. Faça login novamente.');
            navigateTo('login');
            return;
        }
    } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error);
        alert('Não foi possível carregar seu perfil.');
        return;
    }

    // 2. Obter a lista de todos os livros
    try {
        const booksResponse = await fetch('http://localhost:3000/api/books');
        if (booksResponse.ok) {
            books = await booksResponse.json();
        }
    } catch (error) {
        console.error('Erro ao carregar livros:', error);
        books = [];
    }

    // 3. Obter as prateleiras personalizadas do usuário
    try {
        const shelvesResponse = await fetch('http://localhost:3000/api/user/shelves');
        if (shelvesResponse.ok) {
            userShelves = await shelvesResponse.json();
        }
    } catch (error) {
        console.error('Erro ao carregar prateleiras:', error);
        userShelves = [];
    }

    // Filtra os livros favoritos do usuário
    const favoriteBooks = books.filter(book => user.favorites.includes(book.id));
    
    // Filtra os livros reservados ou emprestados para o usuário
    const reservedBooks = books.filter(book => {
        return book.emprestadoPara === user.cpf || (book.queue && book.queue.includes(user.cpf));
    });

    // Função para renderizar uma prateleira de livros
    const renderShelf = (shelfName, booksArray, isCustom = false, shelfId = null) => {
        return `
            <div class="shelf-card">
                <h3>${shelfName}</h3>
                <div class="book-list">
                    ${booksArray.length > 0 ? booksArray.map(book => `
                        <div class="book-card-small">
                            <img src="${book.cover}" alt="${book.title}" data-book-id="${book.id}">
                            <p>${book.title}</p>
                        </div>
                    `).join('') : '<p>Nenhum livro nesta prateleira.</p>'}
                </div>
                ${isCustom ? `
                    <div class="custom-shelf-actions">
                        <button class="delete-shelf-btn" data-shelf-id="${shelfId}">Excluir Prateleira</button>
                    </div>
                ` : ''}
            </div>
        `;
    };

    // Renderiza o HTML da página
    container.innerHTML = `
        <style>
            .page-header {
                text-align: center;
                margin-bottom: 20px;
            }
            .shelf-card {
                background-color: #f0f0f0;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .shelf-card h3 {
                margin-top: 0;
                border-bottom: 2px solid #ccc;
                padding-bottom: 5px;
            }
            .book-list {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
            }
            .book-card-small {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                width: 100px;
                cursor: pointer;
            }
            .book-card-small img {
                width: 80px;
                height: 120px;
                object-fit: cover;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .book-card-small p {
                margin: 5px 0 0;
                font-size: 0.8em;
            }
            .create-shelf-container {
                text-align: center;
                margin-bottom: 30px;
            }
            #createShelfBtn {
                padding: 10px 20px;
                font-size: 1em;
            }
            .custom-shelf-actions {
                display: flex;
                justify-content: flex-end; /* Altera para alinhar à direita */
                align-items: center;
                margin-top: 10px;
            }
            .custom-shelf-actions button {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.9em;
                color: #555;
            }
        </style>

        <div class="page-header">
            <h2>Minhas Prateleiras</h2>
        </div>

        ${renderShelf('⭐ Favoritos', favoriteBooks)}
        ${renderShelf('🗓️ Emprestados & Reservados', reservedBooks)}

        <div class="create-shelf-container">
            <button id="createShelfBtn" class="btn">Criar Nova Prateleira</button>
        </div>

        <div id="customShelvesContainer">
            ${userShelves.length > 0 ? userShelves.map(shelf => {
                const shelfBooks = books.filter(book => shelf.books.includes(book.id));
                return renderShelf(shelf.name, shelfBooks, true, shelf.id);
            }).join('') : ''}
        </div>
    `;

    // Lógica para criar uma nova prateleira
    document.getElementById('createShelfBtn').addEventListener('click', async () => {
        const shelfName = prompt('Qual o nome da nova prateleira?');
        if (shelfName && shelfName.trim() !== '') {
            try {
                const response = await fetch('http://localhost:3000/api/user/shelves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: shelfName })
                });

                if (response.ok) {
                    alert('Prateleira criada com sucesso!');
                    renderShelves(container);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.message}`);
                }
            } catch (error) {
                alert('Erro ao criar prateleira.');
                console.error(error);
            }
        }
    });

    // Lógica para excluir uma prateleira (usando delegação de eventos)
    container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-shelf-btn')) {
            const shelfIdToDelete = e.target.dataset.shelfId;
            if (confirm(`Tem certeza que deseja excluir esta prateleira?`)) {
                try {
                    const response = await fetch(`http://localhost:3000/api/user/shelves/${shelfIdToDelete}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (response.ok) {
                        alert('Prateleira excluída com sucesso!');
                        renderShelves(container);
                    } else {
                        const error = await response.json();
                        alert(`Erro: ${error.message}`);
                    }
                } catch (error) {
                    alert('Erro ao excluir prateleira.');
                    console.error(error);
                }
            }
        }
    });

    // Evento de clique unificado para navegar para os detalhes do livro
    container.addEventListener('click', (e) => {
        const clickedImage = e.target.closest('.book-card-small img');
        if (clickedImage) {
            const bookId = clickedImage.dataset.bookId;
            if (bookId) {
                navigateTo('details', { bookId: bookId });
            }
        }
    });
}