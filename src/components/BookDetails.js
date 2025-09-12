import { navigateTo } from '../main.js';

export async function renderBookDetails(container, bookId) {
    // 1. Obter informações do usuário logado (assumindo que já temos um sistema de login com token/session)
    const currentUserResponse = await fetch('http://localhost:3000/api/profile');
    const currentUser = await currentUserResponse.json();

    if (!currentUser) {
        container.innerHTML = '<p>Usuário não logado.</p>';
        navigateTo('login');
        return;
    }

    // 2. Obter informações detalhadas do livro
    const bookResponse = await fetch(`http://localhost:3000/api/books/${bookId}`);
    const book = await bookResponse.json();

    if (!book) {
        container.innerHTML = '<p>Livro não encontrado.</p>';
        return;
    }

    // 3. Obter todas as resenhas para este livro
    const reviewsResponse = await fetch(`http://localhost:3000/api/reviews/${bookId}`);
    let allReviews = [];
    if (reviewsResponse.ok) {
        allReviews = await reviewsResponse.json();
    }

    // 4. Obter as prateleiras personalizadas do usuário
    const shelvesResponse = await fetch(`http://localhost:3000/api/user/shelves`);
    let userShelves = [];
    if (shelvesResponse.ok) {
        userShelves = await shelvesResponse.json();
    }

    // Média das avaliações
    const ratings = allReviews.map(r => r.rating);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
    
    const isFavorited = currentUser.favorites.includes(book.id);

    // Nova lógica para exibir botões de ação e status
    const isAvailable = book.available;
    const isUserInQueue = book.queue?.includes(currentUser.cpf);
    const isLoanedToUser = book.emprestadoPara === currentUser.cpf;
    const isDevolucaoPendente = book.devolucoesPendentes?.includes(currentUser.cpf); // Nova propriedade no livro para devolução pendente
    
    let actionButtonHtml = '';
    if (isLoanedToUser && !isDevolucaoPendente) {
        actionButtonHtml = `<button id="devolverBtn" class="btn">Solicitar Devolução</button>`;
    } else if (isDevolucaoPendente) {
        actionButtonHtml = `<button class="btn" disabled>Devolução Solicitada</button>`;
    } else if (isUserInQueue) {
        actionButtonHtml = `<button id="cancelarSolicitacaoBtn" class="btn">Cancelar Solicitação</button>`;
    } else if (!isAvailable) {
        actionButtonHtml = `<button id="reservarBtn" class="btn">Entrar na Fila de Espera</button>`;
    } else {
        actionButtonHtml = `<button id="solicitarBtn" class="btn">Solicitar Empréstimo</button>`;
    }

    container.innerHTML = `
        <div class="book-details">
            <div class="book-header">
                <img src="${book.cover}" class="book-cover-large"/>
                <h2>${book.title}</h2>
                <p>${book.author}</p>
            </div>

            ${avgRating ? `
                <div class="avg-rating">
                    ⭐ ${avgRating} / 5 (${ratings.length} avaliação${ratings.length > 1 ? 'es' : ''})
                </div>
            ` : '<div class="avg-rating">Nenhuma avaliação ainda</div>'}

            <div class="review-section">
                <h3>Adicionar nova resenha:</h3>
                <div class="rating-input">
                    ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}" style="cursor: pointer;">&#9733;</span>`).join('')}
                </div>
                <textarea id="reviewText" rows="4" maxlength="500" placeholder="Escreva sua resenha..."></textarea>
                <button id="saveReviewBtn" class="btn">Adicionar Resenha</button>

                <div id="reviewsList">
                    <h3>Resenhas:</h3>
                    ${allReviews.length ? allReviews.map(r => `
                        <div class="review-card" data-cpf="${r.cpf}" data-reviewid="${r.reviewId}">
                            <strong>${r.user === currentUser.nome ? "Você" : r.user}</strong> <em>(${r.date})</em>
                            <div class="stars-display">
                                ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= r.rating ? 'filled' : ''}">&#9733;</span>`).join('')}
                            </div>
                            <p>${r.text.replace(/\n/g, '<br>')}</p>
                            ${r.cpf === currentUser.cpf ? `
                                <button class="editReviewBtn btn-small">Editar</button>
                                <button class="deleteReviewBtn btn-small btn-danger">Excluir</button>
                            ` : ''}
                        </div>
                    `).join('') : '<p>Nenhuma resenha ainda.</p>'}
                </div>
            </div>

            <div class="loan-reserve-section">
                <h3>Status:</h3>
                <p id="statusText">
                    ${isAvailable ? 'Disponível' : `Emprestado`}
                    ${book.returnDate ? `<br>Previsão de Devolução: ${book.returnDate}` : ''}
                    ${book.queue && book.queue.length > 0 ? `<br>Fila de espera: ${book.queue.length} pessoa(s)` : ''}
                </p>
                ${actionButtonHtml}
            </div>

            <div class="synopsis-section">
                <button id="toggleSynopsisBtn" class="btn">VER SINOPSE</button>
                <p id="synopsis" class="hidden">${book.synopsis || 'Sem sinopse disponível.'}</p>
            </div>
            
            <div class="shelf-options">
                <button id="favoriteBtn" class="btn ${isFavorited ? 'favorited' : ''}">
                    ${isFavorited ? '❤️ Favoritado' : '🤍 Favoritar'}
                </button>
                <button id="addShelfBtn" class="btn">Adicionar à Prateleira</button>
            </div>

            <button id="backBtn" class="btn-secondary">Voltar</button>

            <div id="shelfModal" class="modal">
                <div class="modal-content">
                    <span class="close-btn">&times;</span>
                    <h3>Adicionar a uma Prateleira</h3>
                    <div id="shelfList"></div>
                    <button id="createShelfModalBtn" class="btn-small">Criar Nova Prateleira</button>
                </div>
            </div>
        </div>
    `;

    // ==============================
    // Lógica assíncrona dos Event Listeners
    // ==============================
    let selectedRating = 0;
    let editingReviewId = null;
    const ratingStars = document.querySelectorAll('.rating-input .star');
    function updateStars() {
        ratingStars.forEach(s => s.classList.remove('filled'));
        for (let i = 0; i < selectedRating; i++) ratingStars[i].classList.add('filled');
    }
    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            updateStars();
        });
    });

    const saveBtn = document.getElementById('saveReviewBtn');
    if(saveBtn) {
        saveBtn.onclick = async () => {
            const text = document.getElementById('reviewText').value.trim();
            if (selectedRating === 0 && !editingReviewId) {
                alert('Por favor, selecione uma classificação em estrelas.');
                return;
            }
            const date = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            let url = 'http://localhost:3000/api/reviews';
            let method = 'POST';
            let body = { bookId, text, rating: selectedRating, date };

            if (editingReviewId) {
                url = `${url}/${editingReviewId}`;
                method = 'PUT';
                body = { text, rating: selectedRating, date };
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (response.ok) {
                    const message = await response.text();
                    alert(message);
                    document.getElementById('reviewText').value = '';
                    selectedRating = 0;
                    updateStars();
                    editingReviewId = null;
                    saveBtn.textContent = 'Adicionar Resenha';
                    renderBookDetails(container, bookId);
                } else {
                    const errorText = await response.text();
                    alert(`Erro ao salvar resenha: ${errorText}`);
                }
            } catch (error) {
                alert('Erro de conexão ao salvar resenha.');
                console.error(error);
            }
        };
    }

    function attachReviewEvents() {
        document.querySelectorAll('.editReviewBtn').forEach(btn => {
            btn.onclick = (e) => {
                const card = e.target.closest('.review-card');
                const reviewId = card.dataset.reviewid;
                const review = allReviews.find(r => r.reviewId === reviewId);
                if (review) {
                    document.getElementById('reviewText').value = review.text;
                    selectedRating = review.rating;
                    updateStars();
                    editingReviewId = reviewId;
                    saveBtn.textContent = 'Atualizar Resenha';
                }
            };
        });
        document.querySelectorAll('.deleteReviewBtn').forEach(btn => {
            btn.onclick = async (e) => {
                if (!confirm('Deseja realmente excluir esta resenha?')) return;
                const card = e.target.closest('.review-card');
                const reviewId = card.dataset.reviewid;

                try {
                    const response = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (response.ok) {
                        const message = await response.text();
                        alert(message);
                        renderBookDetails(container, bookId);
                    } else {
                        const errorText = await response.text();
                        alert(`Erro ao excluir resenha: ${errorText}`);
                    }
                } catch (error) {
                    alert('Erro de conexão ao excluir resenha.');
                    console.error(error);
                }
            };
        });
    }
    attachReviewEvents();

    // Lógica de Empréstimo, Devolução, Solicitação e Reserva
    const solicitarBtn = document.getElementById('solicitarBtn');
    if (solicitarBtn) {
        solicitarBtn.onclick = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/loan/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId })
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro ao solicitar empréstimo.');
                console.error(error);
            }
        };
    }

    const reservarBtn = document.getElementById('reservarBtn');
    if (reservarBtn) {
        reservarBtn.onclick = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/loan/reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId })
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro ao entrar na fila de espera.');
                console.error(error);
            }
        };
    }

    const cancelarSolicitacaoBtn = document.getElementById('cancelarSolicitacaoBtn');
    if (cancelarSolicitacaoBtn) {
        cancelarSolicitacaoBtn.onclick = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/loan/cancel-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId })
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro ao cancelar solicitação.');
                console.error(error);
            }
        };
    }

    const devolverBtn = document.getElementById('devolverBtn');
    if (devolverBtn) {
        devolverBtn.onclick = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/loan/request-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookId })
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro ao solicitar devolução.');
                console.error(error);
            }
        };
    }

    // Sinopse
    document.getElementById('toggleSynopsisBtn').onclick = () => {
        const synopsis = document.getElementById('synopsis');
        synopsis.classList.toggle('hidden');
        document.getElementById('toggleSynopsisBtn').textContent = synopsis.classList.contains('hidden') ? 'VER SINOPSE' : 'VER MENOS';
    };

    // Favoritar
    document.getElementById('favoriteBtn').onclick = async () => {
        const isFavorited = document.getElementById('favoriteBtn').classList.contains('favorited');
        const method = isFavorited ? 'DELETE' : 'POST';
        const url = isFavorited ? `http://localhost:3000/api/favorites/${bookId}` : 'http://localhost:3000/api/favorites';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'POST' ? JSON.stringify({ bookId }) : null
            });
            const message = await response.text();
            alert(message);
            if (response.ok) {
                renderBookDetails(container, bookId);
            }
        } catch (error) {
            alert('Erro ao favoritar/desfavoritar o livro.');
            console.error(error);
        }
    };
    
    // Adicionar à Prateleira
    const modal = document.getElementById('shelfModal');
    const addShelfBtn = document.getElementById('addShelfBtn');
    const closeBtn = document.querySelector('.close-btn');
    const shelfList = document.getElementById('shelfList');
    const createShelfModalBtn = document.getElementById('createShelfModalBtn');
    addShelfBtn.onclick = () => {
        shelfList.innerHTML = '';
        userShelves.forEach(shelf => {
            const shelfItem = document.createElement('div');
            shelfItem.className = 'shelf-item';
            shelfItem.innerHTML = `<p>${shelf.name}</p><button class="add-to-shelf-btn" data-shelf-id="${shelf.id}">Adicionar</button>`;
            shelfList.appendChild(shelfItem);
        });
        if (userShelves.length === 0) {
            shelfList.innerHTML = '<p>Você não tem prateleiras personalizadas. Crie uma!</p>';
        }
        modal.style.display = 'block';
    };
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => { if (event.target == modal) { modal.style.display = 'none'; } };
    shelfList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-to-shelf-btn')) {
            const shelfId = e.target.dataset.shelfId;
            try {
                const response = await fetch('http://localhost:3000/api/user/shelves/add-book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ shelfId, bookId })
                });
                const message = await response.text();
                alert(message);
                modal.style.display = 'none';
                if (response.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro ao adicionar livro à prateleira.');
                console.error(error);
            }
        }
    });
    createShelfModalBtn.onclick = async () => {
        const shelfName = prompt('Qual o nome da nova prateleira?');
        if (shelfName && shelfName.trim() !== '') {
            try {
                const response = await fetch('http://localhost:3000/api/user/shelves', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: shelfName })
                });
                const message = await response.text();
                alert(message);
                if (response.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro ao criar prateleira.');
                console.error(error);
            }
        }
    };
    
    // Voltar
    document.getElementById('backBtn').onclick = () => navigateTo('books');
}