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
    console.log('=== INICIANDO RENDERIZAÇÃO DE DETALHES ===');
    console.log('BookId recebido:', bookId, 'Tipo:', typeof bookId);
    
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
                console.log('Usuário logado:', currentUser.nome, 'CPF:', currentUser.cpf);
            }
        } catch (error) {
            console.log('Usuário não logado');
        }

        console.log('Buscando livro com ID:', validBookId);
        const bookResponse = await fetch(`http://localhost:3000/api/books/${validBookId}`, {
            credentials: 'include'
        });
        
        console.log('Status da resposta:', bookResponse.status);
        
        if (!bookResponse.ok) {
            container.innerHTML = bookResponse.status === 404 
                ? '<div class="no-books">Livro não encontrado.</div>'
                : '<div class="no-books">Erro ao carregar o livro.</div>';
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
                }
            } catch (error) {
                console.log('Erro ao carregar prateleiras:', error);
            }
        }

        const ratings = allReviews.map(r => r.rating).filter(r => r && !isNaN(r));
        const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
        
        const isFavorited = currentUser && currentUser.favorites && currentUser.favorites.includes(parseInt(validBookId));

        const bookAvailable = book.available === true || book.available === 'true' || book.available === 1;
        const isEmprestado = !!book.emprestadoPara;
        
        console.log('=== STATUS DO LIVRO ===');
        console.log('book.available (raw):', book.available, 'tipo:', typeof book.available);
        console.log('bookAvailable (convertido):', bookAvailable);
        console.log('isEmprestado:', isEmprestado);
        
        let actionButtonHtml = '';
        if (currentUser) {
            const isLoanedToUser = book.emprestadoPara === currentUser.cpf;
            const isUserInQueue = book.queue && book.queue.includes(currentUser.cpf);
            
            // Verificar status de empréstimo para este livro
            let hasPendingRequest = false;
            let hasPendingReturn = false;
            
            try {
                const dashboardResponse = await fetch('http://localhost:3000/api/user/dashboard', {
                    credentials: 'include'
                });
                
                if (dashboardResponse.ok) {
                    const dashboardData = await dashboardResponse.json();
                    
                    console.log('📊 DADOS DO DASHBOARD:', dashboardData);
                    console.log('📚 Empréstimos:', dashboardData.emprestados);
                    console.log('🔄 Devoluções pendentes:', dashboardData.devolucoesPendentes);
                    
                    // Verificar empréstimos aguardando retirada
                    hasPendingRequest = dashboardData.emprestados?.some(
                        emp => {
                            console.log(`Verificando empréstimo: bookId=${emp.bookId}, status=${emp.status}, buscando=${parseInt(validBookId)}`);
                            return emp.bookId === parseInt(validBookId) && emp.status === 'aguardando_retirada';
                        }
                    );
                    
                    // Verificar devoluções pendentes
                    hasPendingReturn = dashboardData.devolucoesPendentes?.some(
                        dev => {
                            console.log(`Verificando devolução: bookId=${dev.bookId}, buscando=${parseInt(validBookId)}`);
                            return dev.bookId === parseInt(validBookId);
                        }
                    );
                    
                    console.log('📋 Status do usuário para este livro:');
                    console.log('- Aguardando retirada:', hasPendingRequest);
                    console.log('- Aguardando devolução:', hasPendingReturn);
                }
            } catch (error) {
                console.log('Erro ao verificar status:', error);
            }
            
            // Montar HTML baseado no status
            if (hasPendingRequest) {
                actionButtonHtml = `
                    <div class="status-aguardando">
                        <div class="status-icon">📚</div>
                        <div class="status-title">Empréstimo Aguardando Aprovação</div>
                        <div class="status-message">
                            Você solicitou o empréstimo deste livro.<br>
                            Aguardando confirmação do bibliotecário.
                        </div>
                        <button id="cancelarSolicitacaoBtn" class="btn btn-secondary" style="margin-top: 15px;">Cancelar Solicitação</button>
                    </div>
                `;
            } else if (hasPendingReturn) {
                actionButtonHtml = `
                    <div class="status-aguardando">
                        <div class="status-icon">📖</div>
                        <div class="status-title">Devolução Aguardando Aprovação</div>
                        <div class="status-message">
                            Você solicitou a devolução deste livro.<br>
                            Aguardando confirmação do bibliotecário.
                        </div>
                    </div>
                `;
            } else if (isLoanedToUser) {
                actionButtonHtml = `
                    <div class="loan-actions">
                        <button id="devolverBtn" class="btn">Solicitar Devolução</button>
                        <button id="marcarLidoBtn" class="btn btn-success">Marcar como Lido</button>
                    </div>
                `;
            } else if (isUserInQueue) {
                const position = book.queue.indexOf(currentUser.cpf) + 1;
                actionButtonHtml = `
                    <p>📋 Você está na posição <strong>${position}</strong> da fila</p>
                    <button id="cancelarReservaBtn" class="btn btn-secondary">Cancelar Reserva</button>
                `;
            } else if (isEmprestado) {
                actionButtonHtml = `<button id="reservarBtn" class="btn">Entrar na Fila de Espera</button>`;
            } else {
                actionButtonHtml = `<button id="solicitarBtn" class="btn">Solicitar Empréstimo</button>`;
            }
        } else {
            actionButtonHtml = '<p style="color: var(--azul-claro);">Faça login para solicitar empréstimos</p>';
        }

        const imageUrl = book.cover && book.cover.startsWith('http') 
            ? book.cover 
            : createPlaceholderImage(book.title || 'Livro');

        container.innerHTML = `
            <style>
                .book-details { max-width: 800px; margin: 0 auto; padding: 20px; }
                .book-header { display: flex; gap: 20px; margin-bottom: 20px; background: var(--branco); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .book-cover-large { width: 200px; height: 280px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); flex-shrink: 0; }
                .book-info { flex: 1; min-width: 0; }
                .book-info h2 { color: var(--azul-escuro); margin: 0 0 15px 0; font-size: 24px; word-wrap: break-word; }
                .book-info p { color: var(--azul-claro); margin: 8px 0; font-size: 16px; }
                .avg-rating { text-align: center; background: var(--cinza-claro); padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 18px; font-weight: bold; color: var(--azul-escuro); }
                .loan-reserve-section { background: var(--branco); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; text-align: center; }
                .loan-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 15px; }
                .btn-success { background-color: #28a745; color: white; }
                .btn-success:hover { background-color: #218838; }
                .btn-secondary { background-color: #6c757d; color: white; }
                .btn-secondary:hover { background-color: #5a6268; }
                .status-aguardando { background: #fff3cd; border: 3px solid #ffc107; border-radius: 12px; padding: 25px 20px; margin: 15px 0; text-align: center; box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2); }
                .status-aguardando .status-icon { font-size: 24px; margin-bottom: 10px; }
                .status-aguardando .status-title { font-size: 18px; font-weight: bold; color: #856404; margin: 10px 0; }
                .status-aguardando .status-message { font-size: 14px; color: #856404; margin: 10px 0; line-height: 1.5; }
                .synopsis-section { background: var(--branco); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
                .synopsis-section #synopsis { margin-top: 15px; line-height: 1.6; color: var(--azul-claro); }
                .hidden { display: none; }
                .review-section { background: var(--branco); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
                .rating-input { display: flex; justify-content: center; gap: 5px; margin: 15px 0; }
                .rating-input .star { font-size: 30px; color: #ddd; cursor: pointer; transition: color 0.2s; user-select: none; }
                .rating-input .star.filled { color: #ffd700; }
                .rating-input .star:hover { color: #ffed4e; }
                .shelf-options { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }
                .favorited { background-color: #dc3545; color: white; }
                #reviewsList { background: var(--branco); padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px; }
                .review-card { border: 1px solid var(--cinza-claro); border-radius: 8px; padding: 15px; margin-bottom: 15px; background: var(--cinza-claro); }
                .stars-display { margin: 8px 0; }
                .stars-display .star { font-size: 16px; color: #ddd; }
                .stars-display .star.filled { color: #ffd700; }
                .btn-small { padding: 6px 12px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px; margin-top: 8px; }
                .btn-danger { background-color: #dc3545; color: white; }
                .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); }
                .modal-content { background-color: white; margin: 15% auto; padding: 20px; border-radius: 12px; width: 80%; max-width: 500px; position: relative; }
                .close-btn { position: absolute; top: 10px; right: 20px; font-size: 24px; cursor: pointer; color: #aaa; }
                .close-btn:hover { color: #000; }
                .shelf-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: var(--cinza-claro); border-radius: 5px; }
                @media (max-width: 768px) {
                    .book-header { flex-direction: column; align-items: center; text-align: center; }
                    .loan-actions { flex-direction: column; }
                }
            </style>
            
            <div class="book-details">
                <div class="book-header">
                    <img src="${imageUrl}" class="book-cover-large" alt="${book.title}" onerror="this.src='${createPlaceholderImage('Erro')}'; this.onerror=null;"/>
                    <div class="book-info">
                        <h2>${book.title || 'Título não disponível'}</h2>
                        <p><strong>Autor:</strong> ${book.author || 'Autor desconhecido'}</p>
                        ${book.pages ? `<p><strong>Páginas:</strong> ${book.pages}</p>` : ''}
                        ${book.genre ? `<p><strong>Gênero:</strong> ${book.genre}</p>` : ''}
                        ${book.editora ? `<p><strong>Editora:</strong> ${book.editora}</p>` : ''}
                        ${book.ano_publicacao ? `<p><strong>Ano:</strong> ${book.ano_publicacao}</p>` : ''}
                    </div>
                </div>

                ${avgRating ? `<div class="avg-rating">⭐ ${avgRating} / 5 (${ratings.length} avaliação${ratings.length > 1 ? 'es' : ''})</div>` : '<div class="avg-rating">Nenhuma avaliação ainda</div>'}

                <div class="loan-reserve-section">
                    <h3>Status do Livro:</h3>
                    <p>${!isEmprestado ? 'Disponível' : 'Emprestado'}
                    ${book.returnDate ? `<br>Previsão de Devolução: ${book.returnDate}` : ''}
                    ${book.queue && book.queue.length > 0 ? `<br>Fila de espera: ${book.queue.length} pessoa(s)` : ''}</p>
                    ${actionButtonHtml}
                </div>

                <div class="synopsis-section">
                    <button id="toggleSynopsisBtn" class="btn">VER SINOPSE</button>
                    <div id="synopsis" class="hidden">${book.synopsis || 'Sem sinopse disponível.'}</div>
                </div>

                ${currentUser ? `
                    <div class="review-section">
                        <h3>Adicionar nova resenha:</h3>
                        <div class="rating-input" id="ratingInput">
                            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">★</span>`).join('')}
                        </div>
                        <textarea id="reviewText" rows="4" maxlength="500" placeholder="Escreva sua resenha..." style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; box-sizing: border-box;"></textarea>
                        <button id="saveReviewBtn" class="btn" style="margin-top: 10px;">Adicionar Resenha</button>
                    </div>
                    <div class="shelf-options">
                        <button id="favoriteBtn" class="btn ${isFavorited ? 'favorited' : ''}">${isFavorited ? '❤️ Favoritado' : '🤍 Favoritar'}</button>
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

        console.log('=== HTML RENDERIZADO COM SUCESSO ===');
        setupBookDetailsEventListeners(container, validBookId, currentUser, userShelves);

    } catch (error) {
        console.error('=== ERRO AO CARREGAR DETALHES ===', error);
        container.innerHTML = `
            <div class="no-books">
                <h3>Erro ao carregar os detalhes do livro</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="btn">Recarregar</button>
            </div>
        `;
    }
}

function setupBookDetailsEventListeners(container, bookId, currentUser, userShelves) {
    const toggleSynopsisBtn = container.querySelector('#toggleSynopsisBtn');
    const synopsis = container.querySelector('#synopsis');
    
    if (toggleSynopsisBtn && synopsis) {
        toggleSynopsisBtn.addEventListener('click', () => {
            synopsis.classList.toggle('hidden');
            toggleSynopsisBtn.textContent = synopsis.classList.contains('hidden') ? 'VER SINOPSE' : 'VER MENOS';
        });
    }

    const backBtn = container.querySelector('#backBtn');
    if (backBtn) backBtn.addEventListener('click', () => navigateTo('books'));

    if (!currentUser) return;

    // Sistema de rating
    let selectedRating = 0;
    const ratingStars = container.querySelectorAll('#ratingInput .star');
    
    const updateStars = (rating) => {
        ratingStars.forEach((s, i) => s.classList.toggle('filled', i < rating));
    };

    ratingStars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            updateStars(selectedRating);
        });
        star.addEventListener('mouseenter', () => updateStars(parseInt(star.dataset.value)));
    });

    container.querySelector('#ratingInput')?.addEventListener('mouseleave', () => updateStars(selectedRating));

    // Solicitar empréstimo
    const solicitarBtn = container.querySelector('#solicitarBtn');
    if (solicitarBtn) {
        solicitarBtn.addEventListener('click', async () => {
            if (!confirm('Deseja solicitar o empréstimo deste livro?')) return;
            solicitarBtn.disabled = true;
            solicitarBtn.textContent = 'Solicitando...';
            try {
                const res = await fetch('http://localhost:3000/api/loan/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) renderBookDetails(container, bookId);
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                solicitarBtn.disabled = false;
                solicitarBtn.textContent = 'Solicitar Empréstimo';
            }
        });
    }

    // Entrar na fila
    const reservarBtn = container.querySelector('#reservarBtn');
    if (reservarBtn) {
        reservarBtn.addEventListener('click', async () => {
            if (!confirm('Deseja entrar na fila de espera?')) return;
            reservarBtn.disabled = true;
            try {
                const res = await fetch('http://localhost:3000/api/loan/reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) renderBookDetails(container, bookId);
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                reservarBtn.disabled = false;
            }
        });
    }

    // Solicitar devolução
    const devolverBtn = container.querySelector('#devolverBtn');
    if (devolverBtn) {
        devolverBtn.addEventListener('click', async () => {
            if (!confirm('Deseja solicitar a devolução deste livro?')) return;
            devolverBtn.disabled = true;
            devolverBtn.textContent = 'Solicitando...';
            try {
                const res = await fetch('http://localhost:3000/api/loan/request-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) renderBookDetails(container, bookId);
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                devolverBtn.disabled = false;
                devolverBtn.textContent = 'Solicitar Devolução';
            }
        });
    }
    
    // Marcar como lido
    const marcarLidoBtn = container.querySelector('#marcarLidoBtn');
    if (marcarLidoBtn) {
        marcarLidoBtn.addEventListener('click', async () => {
            if (!confirm('Deseja marcar este livro como lido?')) return;
            marcarLidoBtn.disabled = true;
            try {
                const res = await fetch('http://localhost:3000/api/loan/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId), status: 'lido' })
                });
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) setTimeout(() => renderBookDetails(container, bookId), 1000);
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                marcarLidoBtn.disabled = false;
            }
        });
    }

    // Cancelar solicitação de empréstimo
    const cancelarSolicitacaoBtn = container.querySelector('#cancelarSolicitacaoBtn');
    if (cancelarSolicitacaoBtn) {
        cancelarSolicitacaoBtn.addEventListener('click', async () => {
            if (!confirm('Deseja cancelar esta solicitação de empréstimo?')) return;
            
            cancelarSolicitacaoBtn.disabled = true;
            cancelarSolicitacaoBtn.textContent = 'Cancelando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/cancel-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                const result = await res.json();
                alert(result.message || result.error);
                
                if (res.ok) {
                    renderBookDetails(container, bookId);
                }
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                cancelarSolicitacaoBtn.disabled = false;
                cancelarSolicitacaoBtn.textContent = 'Cancelar Solicitação';
            }
        });
    }

    // Cancelar reserva
    const cancelarReservaBtn = container.querySelector('#cancelarReservaBtn');
    if (cancelarReservaBtn) {
        cancelarReservaBtn.addEventListener('click', async () => {
            if (!confirm('Deseja cancelar esta reserva?')) return;
            cancelarReservaBtn.disabled = true;
            try {
                const res = await fetch('http://localhost:3000/api/loan/cancel-reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) renderBookDetails(container, bookId);
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                cancelarReservaBtn.disabled = false;
            }
        });
    }

    // Salvar resenha
    const saveBtn = container.querySelector('#saveReviewBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const text = container.querySelector('#reviewText').value.trim();
            if (selectedRating === 0) {
                alert('Selecione uma classificação em estrelas.');
                return;
            }
            saveBtn.disabled = true;
            try {
                const res = await fetch('http://localhost:3000/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId), text, rating: selectedRating })
                });
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) renderBookDetails(container, bookId);
            } catch (error) {
                alert('Erro de conexão.');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    // Favoritar
    const favoriteBtn = container.querySelector('#favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', async () => {
            const isFavorited = favoriteBtn.classList.contains('favorited');
            favoriteBtn.disabled = true;
            try {
                const res = await fetch(
                    isFavorited ? `http://localhost:3000/api/favorites/${bookId}` : 'http://localhost:3000/api/favorites',
                    {
                        method: isFavorited ? 'DELETE' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: isFavorited ? null : JSON.stringify({ bookId: parseInt(bookId) })
                    }
                );
                const result = await res.json();
                alert(result.message || result.error);
                if (res.ok) renderBookDetails(container, bookId);
            } catch (error) {
                alert('Erro ao favoritar.');
            } finally {
                favoriteBtn.disabled = false;
            }
        });
    }

    // Editar/Excluir resenha
    container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('deleteReviewBtn')) {
            const reviewCard = e.target.closest('.review-card');
            const reviewId = reviewCard.dataset.reviewid;
            if (!reviewId || !confirm('Deseja excluir esta resenha?')) return;
            
            e.target.disabled = true;
            try {
                const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (res.ok) {
                    alert('Resenha excluída!');
                    renderBookDetails(container, bookId);
                } else {
                    alert('Erro ao excluir resenha');
                }
            } catch (error) {
                alert('Erro de conexão');
            } finally {
                e.target.disabled = false;
            }
        }
        
        if (e.target.classList.contains('editReviewBtn')) {
            const reviewCard = e.target.closest('.review-card');
            const reviewId = reviewCard.dataset.reviewid;
            if (!reviewId) return;
            
            const currentText = reviewCard.querySelector('p').textContent.trim();
            const currentRating = reviewCard.querySelectorAll('.stars-display .star.filled').length;
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close-btn">&times;</span>
                    <h3>Editar Resenha</h3>
                    <div class="rating-input" id="editRatingInput">
                        ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= currentRating ? 'filled' : ''}" data-value="${i}">★</span>`).join('')}
                    </div>
                    <textarea id="editReviewText" rows="4" maxlength="500" 
                              style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 6px; 
                              resize: vertical; box-sizing: border-box; margin: 10px 0;">${currentText}</textarea>
                    <div style="text-align: center;">
                        <button id="saveEditBtn" class="btn">Salvar</button>
                        <button id="cancelEditBtn" class="btn-secondary">Cancelar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            let editRating = currentRating;
            const editStars = modal.querySelectorAll('#editRatingInput .star');
            const updateEditStars = (rating) => editStars.forEach((s, i) => s.classList.toggle('filled', i < rating));
            
            editStars.forEach(star => {
                star.addEventListener('click', () => {
                    editRating = parseInt(star.dataset.value);
                    updateEditStars(editRating);
                });
                star.addEventListener('mouseenter', () => updateEditStars(parseInt(star.dataset.value)));
            });
            
            modal.querySelector('#editRatingInput').addEventListener('mouseleave', () => updateEditStars(editRating));
            
            modal.querySelector('#saveEditBtn').addEventListener('click', async () => {
                const newText = modal.querySelector('#editReviewText').value.trim();
                if (editRating === 0) {
                    alert('Selecione uma classificação');
                    return;
                }
                try {
                    const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ text: newText, rating: editRating })
                    });
                    if (res.ok) {
                        alert('Resenha atualizada!');
                        modal.remove();
                        renderBookDetails(container, bookId);
                    } else {
                        alert('Erro ao atualizar resenha');
                    }
                } catch (error) {
                    alert('Erro de conexão');
                }
            });
            
            modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
            modal.querySelector('#cancelEditBtn').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        }
    });

    // Modal de prateleiras
    const modal = container.querySelector('#shelfModal');
    const addShelfBtn = container.querySelector('#addShelfBtn');
    const closeBtn = container.querySelector('.close-btn');
    const shelfList = container.querySelector('#shelfList');

    if (addShelfBtn && modal && shelfList) {
        addShelfBtn.addEventListener('click', () => {
            if (userShelves && userShelves.length > 0) {
                shelfList.innerHTML = userShelves.map(shelf => `
                    <div class="shelf-item">
                        <span>${shelf.name || shelf.nome_prateleira}</span>
                        <button class="add-to-shelf-btn btn-small" data-shelf-id="${shelf.id}">Adicionar</button>
                    </div>
                `).join('');
                
                shelfList.querySelectorAll('.add-to-shelf-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const shelfId = btn.dataset.shelfId;
                        btn.disabled = true;
                        btn.textContent = 'Adicionando...';
                        
                        try {
                            const res = await fetch('http://localhost:3000/api/user/shelves/add-book', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ 
                                    shelfId: parseInt(shelfId), 
                                    bookId: parseInt(bookId) 
                                })
                            });
                            const result = await res.json();
                            alert(result.message || result.error);
                            if (res.ok) modal.style.display = 'none';
                        } catch (error) {
                            alert('Erro ao adicionar livro.');
                        } finally {
                            btn.disabled = false;
                            btn.textContent = 'Adicionar';
                        }
                    });
                });
            } else {
                shelfList.innerHTML = '<p>Você não tem prateleiras. Crie uma na seção "Minhas Prateleiras"!</p>';
            }
            modal.style.display = 'block';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => { 
            if (modal) modal.style.display = 'none'; 
        });
    }
    
    window.addEventListener('click', (e) => { 
        if (e.target === modal) modal.style.display = 'none'; 
    });
    
    const createShelfModalBtn = container.querySelector('#createShelfModalBtn');
    if (createShelfModalBtn) {
        createShelfModalBtn.addEventListener('click', () => {
            const shelfName = prompt('Digite o nome da nova prateleira:');
            if (!shelfName || !shelfName.trim()) return;
            
            fetch('http://localhost:3000/api/user/shelves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: shelfName.trim() })
            })
            .then(res => res.json())
            .then(result => {
                alert(result.message || result.error);
                if (result.message) location.reload();
            })
            .catch(error => {
                console.error('Erro ao criar prateleira:', error);
                alert('Erro ao criar prateleira');
            });
        });
    }
}