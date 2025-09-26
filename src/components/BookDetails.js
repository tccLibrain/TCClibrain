import { navigateTo } from '../main.js';

function createPlaceholderImage(title, width = 150, height = 210) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#9dadb7"/>
            <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#ffffff" 
                  text-anchor="middle" dominant-baseline="middle">${title?.substring(0, 8) || 'Livro'}</text>
        </svg>
    `)}`;
}

export async function renderBookDetails(container, bookId) {
    console.log('Carregando detalhes do livro:', bookId);
    
    // Validar se bookId é válido
    const validBookId = parseInt(bookId);
    if (!validBookId || isNaN(validBookId)) {
        console.error('BookId inválido:', bookId);
        container.innerHTML = '<div class="no-books">ID do livro inválido.</div>';
        return;
    }
    
    container.innerHTML = '<div class="loading">Carregando detalhes do livro...</div>';
    
    try {
        let currentUser = null;
        try {
            const currentUserResponse = await fetch('http://localhost:3000/api/profile', {
                credentials: 'include'
            });
            if (currentUserResponse.ok) {
                currentUser = await currentUserResponse.json();
                console.log('Usuário logado:', currentUser.nome);
            }
        } catch (error) {
            console.log('Usuário não logado ou erro na API de perfil');
        }

        console.log('Fazendo requisição para:', `http://localhost:3000/api/books/${validBookId}`);
        const bookResponse = await fetch(`http://localhost:3000/api/books/${validBookId}`, {
            credentials: 'include'
        });
        
        console.log('Status da resposta:', bookResponse.status);
        
        if (!bookResponse.ok) {
            if (bookResponse.status === 404) {
                container.innerHTML = '<div class="no-books">Livro não encontrado.</div>';
            } else {
                container.innerHTML = '<div class="no-books">Erro ao carregar o livro.</div>';
            }
            return;
        }
        
        const book = await bookResponse.json();
        console.log('Dados do livro recebidos:', book);

        let allReviews = [];
        try {
            const reviewsResponse = await fetch(`http://localhost:3000/api/reviews/${validBookId}`, {
                credentials: 'include'
            });
            if (reviewsResponse.ok) {
                allReviews = await reviewsResponse.json();
                console.log('Resenhas carregadas:', allReviews.length);
            }
        } catch (error) {
            console.log('Erro ao carregar resenhas:', error);
        }

        let userShelves = [];
        if (currentUser) {
            try {
                const shelvesResponse = await fetch('http://localhost:3000/api/user/shelves', {
                    credentials: 'include'
                });
                if (shelvesResponse.ok) {
                    userShelves = await shelvesResponse.json();
                    console.log('Prateleiras carregadas:', userShelves.length);
                }
            } catch (error) {
                console.log('Erro ao carregar prateleiras:', error);
            }
        }

        // Calcular média das avaliações
        const ratings = allReviews.map(r => r.rating).filter(r => r && !isNaN(r));
        const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
        
        // Verificar se o livro está nos favoritos do usuário
        const isFavorited = currentUser && currentUser.favorites && currentUser.favorites.includes(parseInt(validBookId));

        // Determinar o estado do livro e as ações disponíveis
        let actionButtonHtml = '';
        if (currentUser) {
            const isAvailable = book.available !== false;
            const isLoanedToUser = book.emprestadoPara === currentUser.cpf;
            const isUserInQueue = book.queue && book.queue.includes(currentUser.cpf);
            
            console.log('Status do livro:', {
                available: isAvailable,
                loanedToUser: isLoanedToUser,
                userInQueue: isUserInQueue,
                emprestadoPara: book.emprestadoPara,
                userCpf: currentUser.cpf
            });
            
            if (isLoanedToUser) {
                actionButtonHtml = `
                    <div class="loan-actions">
                        <button id="devolverBtn" class="btn">Solicitar Devolução</button>
                        <button id="marcarLidoBtn" class="btn btn-success">Marcar como Lido</button>
                        <button id="marcarNaoTerminadoBtn" class="btn btn-secondary">Não Terminei</button>
                    </div>
                `;
            } else if (isUserInQueue) {
                const position = book.queue.indexOf(currentUser.cpf) + 1;
                actionButtonHtml = `
                    <p>Você está na posição ${position} da fila</p>
                    <button id="cancelarReservaBtn" class="btn btn-secondary">Cancelar Reserva</button>
                `;
            } else if (!isAvailable) {
                actionButtonHtml = `<button id="reservarBtn" class="btn">Entrar na Fila de Espera</button>`;
            } else {
                actionButtonHtml = `<button id="solicitarBtn" class="btn">Solicitar Empréstimo</button>`;
            }
        } else {
            actionButtonHtml = '<p style="color: var(--azul-claro);">Faça login para solicitar empréstimos</p>';
        }

        const imageUrl = book.cover || createPlaceholderImage(book.title);

        container.innerHTML = `
            <style>
                .book-details {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .book-header {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    background: var(--branco);
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .book-cover-large {
                    width: 200px;
                    height: 280px;
                    object-fit: cover;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    flex-shrink: 0;
                }
                
                .book-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .book-info h2 {
                    color: var(--azul-escuro);
                    margin: 0 0 15px 0;
                    font-size: 24px;
                    word-wrap: break-word;
                }
                
                .book-info p {
                    color: var(--azul-claro);
                    margin: 8px 0;
                    font-size: 16px;
                }
                
                .avg-rating {
                    text-align: center;
                    background: var(--cinza-claro);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 18px;
                    font-weight: bold;
                    color: var(--azul-escuro);
                }
                
                .loan-reserve-section {
                    background: var(--branco);
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                    text-align: center;
                }
                
                .loan-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin-top: 15px;
                }
                
                .btn-success {
                    background-color: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.3s;
                }
                
                .btn-success:hover {
                    background-color: #218838;
                }
                
                .synopsis-section {
                    background: var(--branco);
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }
                
                .synopsis-section #synopsis {
                    margin-top: 15px;
                    line-height: 1.6;
                    color: var(--azul-claro);
                }
                
                .hidden {
                    display: none;
                }
                
                .review-section {
                    background: var(--branco);
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }
                
                .rating-input {
                    display: flex;
                    justify-content: center;
                    gap: 5px;
                    margin: 15px 0;
                }
                
                .rating-input .star {
                    font-size: 30px;
                    color: #ddd;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                
                .rating-input .star.filled {
                    color: #ffd700;
                }
                
                .rating-input .star:hover {
                    color: #ffed4e;
                }
                
                .shelf-options {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                
                .favorited {
                    background-color: #dc3545;
                    color: white;
                }
                
                #reviewsList {
                    background: var(--branco);
                    padding: 20px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    margin-bottom: 20px;
                }
                
                .review-card {
                    border: 1px solid var(--cinza-claro);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 15px;
                    background: var(--cinza-claro);
                }
                
                .review-card:last-child {
                    margin-bottom: 0;
                }
                
                .stars-display {
                    margin: 8px 0;
                }
                
                .stars-display .star {
                    font-size: 16px;
                    color: #ddd;
                }
                
                .stars-display .star.filled {
                    color: #ffd700;
                }
                
                .btn-small {
                    padding: 6px 12px;
                    font-size: 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 8px;
                    margin-top: 8px;
                }
                
                .btn-danger {
                    background-color: #dc3545;
                    color: white;
                }
                
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0,0,0,0.5);
                }
                
                .modal-content {
                    background-color: white;
                    margin: 15% auto;
                    padding: 20px;
                    border-radius: 12px;
                    width: 80%;
                    max-width: 500px;
                    position: relative;
                }
                
                .close-btn {
                    position: absolute;
                    top: 10px;
                    right: 20px;
                    font-size: 24px;
                    cursor: pointer;
                    color: #aaa;
                }
                
                .close-btn:hover {
                    color: #000;
                }
                
                .shelf-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    margin: 5px 0;
                    background: var(--cinza-claro);
                    border-radius: 5px;
                }
                
                @media (max-width: 768px) {
                    .book-header {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    
                    .loan-actions {
                        flex-direction: column;
                    }
                }
            </style>
            
            <div class="book-details">
                <div class="book-header">
                    <img src="${imageUrl}" 
                         class="book-cover-large" 
                         alt="${book.title}"
                         onerror="this.src='${createPlaceholderImage('Erro')}'; this.onerror=null;"/>
                    <div class="book-info">
                        <h2>${book.title || 'Título não disponível'}</h2>
                        <p><strong>Autor:</strong> ${book.author || 'Autor desconhecido'}</p>
                        ${book.pages ? `<p><strong>Páginas:</strong> ${book.pages}</p>` : ''}
                        ${book.genre ? `<p><strong>Gênero:</strong> ${book.genre}</p>` : ''}
                        ${book.editora ? `<p><strong>Editora:</strong> ${book.editora}</p>` : ''}
                        ${book.ano_publicacao ? `<p><strong>Ano:</strong> ${book.ano_publicacao}</p>` : ''}
                    </div>
                </div>

                ${avgRating ? `
                    <div class="avg-rating">
                        ⭐ ${avgRating} / 5 (${ratings.length} avaliação${ratings.length > 1 ? 'es' : ''})
                    </div>
                ` : '<div class="avg-rating">Nenhuma avaliação ainda</div>'}

                <div class="loan-reserve-section">
                    <h3>Status do Livro:</h3>
                    <p id="statusText">
                        ${book.available !== false ? 'Disponível' : 'Emprestado'}
                        ${book.returnDate ? `<br>Previsão de Devolução: ${book.returnDate}` : ''}
                        ${book.queue && book.queue.length > 0 ? `<br>Fila de espera: ${book.queue.length} pessoa(s)` : ''}
                    </p>
                    ${actionButtonHtml}
                </div>

                <div class="synopsis-section">
                    <button id="toggleSynopsisBtn" class="btn">VER SINOPSE</button>
                    <div id="synopsis" class="hidden">${book.synopsis || 'Sem sinopse disponível.'}</div>
                </div>

                ${currentUser ? `
                    <div class="review-section">
                        <h3>Adicionar nova resenha:</h3>
                        <div class="rating-input">
                            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">★</span>`).join('')}
                        </div>
                        <textarea id="reviewText" rows="4" maxlength="500" placeholder="Escreva sua resenha..." style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; box-sizing: border-box;"></textarea>
                        <button id="saveReviewBtn" class="btn" style="margin-top: 10px;">Adicionar Resenha</button>
                    </div>

                    <div class="shelf-options">
                        <button id="favoriteBtn" class="btn ${isFavorited ? 'favorited' : ''}">
                            ${isFavorited ? '❤️ Favoritado' : '🤍 Favoritar'}
                        </button>
                        <button id="addShelfBtn" class="btn">Adicionar à Prateleira</button>
                    </div>
                ` : '<div class="no-books">Faça login para avaliar e favoritar livros</div>'}

                <div id="reviewsList">
                    <h3>Resenhas dos usuários:</h3>
                    ${allReviews.length ? allReviews.map(r => `
                        <div class="review-card" data-cpf="${r.cpf || ''}" data-reviewid="${r.id || ''}">
                            <strong>${currentUser && r.cpf === currentUser.cpf ? "Você" : (r.user || 'Usuário')}</strong> 
                            <em>(${r.date || 'Data não disponível'})</em>
                            <div class="stars-display">
                                ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= (r.rating || 0) ? 'filled' : ''}">★</span>`).join('')}
                            </div>
                            <p>${(r.text || 'Sem texto').replace(/\n/g, '<br>')}</p>
                            ${currentUser && r.cpf === currentUser.cpf ? `
                                <button class="editReviewBtn btn-small">Editar</button>
                                <button class="deleteReviewBtn btn-small btn-danger">Excluir</button>
                            ` : ''}
                        </div>
                    `).join('') : '<p>Nenhuma resenha ainda. Seja o primeiro a avaliar!</p>'}
                </div>

                <button id="backBtn" class="btn-secondary">← Voltar aos Livros</button>

                ${currentUser ? `
                    <div id="shelfModal" class="modal">
                        <div class="modal-content">
                            <span class="close-btn">&times;</span>
                            <h3>Adicionar a uma Prateleira</h3>
                            <div id="shelfList"></div>
                            <button id="createShelfModalBtn" class="btn-small">Criar Nova Prateleira</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        setupBookDetailsEventListeners(container, validBookId, currentUser, userShelves, allReviews);

    } catch (error) {
        console.error('Erro ao carregar detalhes do livro:', error);
        container.innerHTML = `
            <div class="no-books">
                <h3>Erro ao carregar os detalhes do livro</h3>
                <p>Tente novamente mais tarde.</p>
                <button onclick="window.location.reload()" class="btn">Recarregar</button>
            </div>
        `;
    }
}

function setupBookDetailsEventListeners(container, bookId, currentUser, userShelves, allReviews) {
    // Toggle da sinopse
    const toggleSynopsisBtn = container.querySelector('#toggleSynopsisBtn');
    const synopsis = container.querySelector('#synopsis');
    
    if (toggleSynopsisBtn && synopsis) {
        toggleSynopsisBtn.addEventListener('click', () => {
            if (synopsis.classList.contains('hidden')) {
                synopsis.classList.remove('hidden');
                toggleSynopsisBtn.textContent = 'VER MENOS';
            } else {
                synopsis.classList.add('hidden');
                toggleSynopsisBtn.textContent = 'VER SINOPSE';
            }
        });
    }

    // Botão voltar
    const backBtn = container.querySelector('#backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => navigateTo('books'));
    }

    if (!currentUser) return;

    // Sistema de avaliação por estrelas
    let selectedRating = 0;
    const ratingStars = container.querySelectorAll('.rating-input .star');
    
    function updateStars() {
        ratingStars.forEach((star, index) => {
            if (index < selectedRating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
    }

    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            updateStars();
        });
        
        star.addEventListener('mouseenter', () => {
            const hoverValue = parseInt(star.dataset.value);
            ratingStars.forEach((s, i) => {
                if (i < hoverValue) {
                    s.style.color = '#ffed4e';
                } else {
                    s.style.color = s.classList.contains('filled') ? '#ffd700' : '#ddd';
                }
            });
        });
    });

    container.addEventListener('mouseleave', () => {
        updateStars();
    });

    // Botões de empréstimo/reserva/devolução
    const solicitarBtn = container.querySelector('#solicitarBtn');
    const reservarBtn = container.querySelector('#reservarBtn');
    const devolverBtn = container.querySelector('#devolverBtn');
    const cancelarReservaBtn = container.querySelector('#cancelarReservaBtn');

    if (solicitarBtn) {
        solicitarBtn.addEventListener('click', async () => {
            if (!confirm('Deseja realmente solicitar o empréstimo deste livro?')) return;
            
            try {
                const response = await fetch('http://localhost:3000/api/loan/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Empréstimo solicitado com sucesso!');
                    renderBookDetails(container, bookId);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                alert('Erro de conexão.');
            }
        });
    }

    if (reservarBtn) {
        reservarBtn.addEventListener('click', async () => {
            if (!confirm('Deseja entrar na fila de espera para este livro?')) return;
            
            try {
                const response = await fetch('http://localhost:3000/api/loan/reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Você entrou na fila de espera!');
                    renderBookDetails(container, bookId);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                alert('Erro de conexão.');
            }
        });
    }

    if (devolverBtn) {
        devolverBtn.addEventListener('click', async () => {
            if (!confirm('Deseja realmente solicitar a devolução deste livro?')) return;
            
            try {
                const response = await fetch('http://localhost:3000/api/loan/request-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Solicitação de devolução enviada!');
                    renderBookDetails(container, bookId);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro na requisição:', error);
                alert('Erro de conexão.');
            }
        });
    }

    // Salvar resenha
    const saveBtn = container.querySelector('#saveReviewBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const text = container.querySelector('#reviewText').value.trim();
            
            if (selectedRating === 0) {
                alert('Por favor, selecione uma classificação em estrelas.');
                return;
            }
            
            try {
                const response = await fetch('http://localhost:3000/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        bookId: parseInt(bookId), 
                        text: text, 
                        rating: selectedRating
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || 'Resenha salva com sucesso!');
                    renderBookDetails(container, bookId);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro de conexão:', error);
                alert('Erro de conexão ao salvar resenha.');
            }
        });
    }

    // Favoritar
    const favoriteBtn = container.querySelector('#favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async () => {
            const isFavorited = favoriteBtn.classList.contains('favorited');
            const method = isFavorited ? 'DELETE' : 'POST';
            const url = isFavorited ? 
                `http://localhost:3000/api/favorites/${bookId}` : 
                'http://localhost:3000/api/favorites';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: method === 'POST' ? JSON.stringify({ bookId: parseInt(bookId) }) : null
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert(result.message || (isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos'));
                    renderBookDetails(container, bookId);
                } else {
                    const error = await response.json();
                    alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                }
            } catch (error) {
                alert('Erro ao favoritar/desfavoritar o livro.');
                console.error(error);
            }
        });
    }

    // Modal de prateleiras
    const modal = container.querySelector('#shelfModal');
    const addShelfBtn = container.querySelector('#addShelfBtn');
    const closeBtn = container.querySelector('.close-btn');
    const shelfList = container.querySelector('#shelfList');

    if (addShelfBtn && modal) {
        addShelfBtn.addEventListener('click', () => {
            if (shelfList) {
                shelfList.innerHTML = '';
                userShelves.forEach(shelf => {
                    const shelfItem = document.createElement('div');
                    shelfItem.className = 'shelf-item';
                    shelfItem.innerHTML = `
                        <span>${shelf.name || shelf.nome_prateleira}</span>
                        <button class="add-to-shelf-btn btn-small" data-shelf-id="${shelf.id}">Adicionar</button>
                    `;
                    shelfList.appendChild(shelfItem);
                });
                
                if (userShelves.length === 0) {
                    shelfList.innerHTML = '<p>Você não tem prateleiras personalizadas. Crie uma!</p>';
                }
                
                shelfList.querySelectorAll('.add-to-shelf-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const shelfId = btn.dataset.shelfId;
                        try {
                            const response = await fetch('http://localhost:3000/api/user/shelves/add-book', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ 
                                    shelfId: parseInt(shelfId), 
                                    bookId: parseInt(bookId) 
                                })
                            });
                            
                            if (response.ok) {
                                const result = await response.json();
                                alert(result.message || 'Livro adicionado à prateleira!');
                                modal.style.display = 'none';
                            } else {
                                const error = await response.json();
                                alert(`Erro: ${error.error || 'Erro desconhecido'}`);
                            }
                        } catch (error) {
                            alert('Erro ao adicionar livro à prateleira.');
                            console.error(error);
                        }
                    });
                });
            }
            modal.style.display = 'block';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => { 
            if (modal) modal.style.display = 'none'; 
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}