import { navigateTo } from '../main.js';

export async function renderBookDetails(container, bookId) {
    console.log('=== BOOK DETAILS - INICIANDO ===');
    console.log('BookId:', bookId);
    
    const validBookId = parseInt(bookId);
    if (!validBookId || isNaN(validBookId)) {
        container.innerHTML = '<div class="no-books">ID do livro inválido.</div>';
        return;
    }
    
    container.innerHTML = '<div class="loading">Carregando...</div>';
    
    try {
        // 1️⃣ Buscar usuário logado
        let currentUser = null;
        try {
            const userRes = await fetch('http://localhost:3000/api/profile', { credentials: 'include' });
            if (userRes.ok) currentUser = await userRes.json();
        } catch (error) {
            console.log('Usuário não logado');
        }

        // 2️⃣ Buscar livro
        const bookRes = await fetch(`http://localhost:3000/api/books/${validBookId}`, { credentials: 'include' });
        if (!bookRes.ok) {
            container.innerHTML = '<div class="no-books">Livro não encontrado.</div>';
            return;
        }
        const book = await bookRes.json();

        // 3️⃣ Buscar status do usuário para este livro
        let userStatus = {
            isAwaitingPickup: false,
            isActive: false,
            isPendingReturn: false,
            isInQueue: false,
            queuePosition: 0,
            loanDate: null,
            hasReturnedBefore: false,
            lastLoanStatus: null,
            returnDate: null
        };
        
        if (currentUser) {
               try {
                const statusRes = await fetch(`http://localhost:3000/api/books/${validBookId}/user-status`, { credentials: 'include' });
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    userStatus = { ...userStatus, ...statusData };
                    
                    // 🔍 DEBUG COMPLETO
                    console.log('🔍 === DEBUG MARCAR COMO LIDO ===');
                    console.log('Status completo:', userStatus);
                    console.log('hasReturnedBefore:', userStatus.hasReturnedBefore);
                    console.log('lastLoanStatus:', userStatus.lastLoanStatus);
                    console.log('returnDate:', userStatus.returnDate);
                    console.log('book.available:', book.available);
                }
            } catch (error) {
                console.error('Erro ao buscar status:', error);
            }
        }

        // 4️⃣ Buscar resenhas
        let allReviews = [];
        try {
            const reviewsRes = await fetch(`http://localhost:3000/api/reviews/${validBookId}`, { credentials: 'include' });
            if (reviewsRes.ok) allReviews = await reviewsRes.json();
        } catch (error) {
            console.warn('Erro ao carregar resenhas');
        }

        // 5️⃣ Buscar prateleiras
        let userShelves = [];
        if (currentUser) {
            try {
                const shelvesRes = await fetch('http://localhost:3000/api/user/shelves', { credentials: 'include' });
                if (shelvesRes.ok) userShelves = await shelvesRes.json();
            } catch (error) {
                console.warn('Erro ao carregar prateleiras');
            }
        }

        // 6️⃣ Calcular média de avaliações
        const ratings = allReviews.map(r => r.rating).filter(r => r && !isNaN(r));
        const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
        
        // 7️⃣ Verificar favorito
        const isFavorited = currentUser?.favorites?.includes(parseInt(validBookId));

        // 8️⃣ RENDERIZAR BOTÕES BASEADO NO STATUS
        let actionButtonsHtml = '';
        
        if (currentUser) {
            if (userStatus.isPendingReturn) {
                // 📖 DEVOLUÇÃO PENDENTE
                actionButtonsHtml = `
                    <div class="status-card status-warning">
                        <div class="status-icon">📖</div>
                        <div class="status-title">Devolução Aguardando Aprovação</div>
                        <div class="status-message">
                            Você solicitou a devolução deste livro.<br>
                            Aguardando confirmação do bibliotecário.
                        </div>
                    </div>
                `;
            } 
            else if (userStatus.isAwaitingPickup) {
                // ⏳ AGUARDANDO RETIRADA
                actionButtonsHtml = `
                    <div class="status-card status-warning">
                        <div class="status-icon">⏳</div>
                        <div class="status-title">Empréstimo Aguardando Aprovação</div>
                        <div class="status-message">
                            Seu empréstimo foi solicitado em: <strong>${userStatus.loanDate || 'Data não disponível'}</strong><br>
                            Aguardando confirmação do bibliotecário para retirada.
                        </div>
                        <button id="cancelarSolicitacaoBtn" class="btn btn-secondary" style="margin-top: 15px;">
                            ❌ Cancelar Solicitação
                        </button>
                    </div>
                `;
            } 
           else if (userStatus.isActive) {
    // ✅ EMPRÉSTIMO ATIVO
    actionButtonsHtml = `
        <div class="status-card status-success">
            <div class="status-icon">✅</div>
            <div class="status-title">Você está com este livro emprestado!</div>
            <div class="status-message">
                📅 Data de retirada: <strong>${userStatus.loanDate || 'Não disponível'}</strong><br>
                📆 Prazo de devolução: <strong>${userStatus.returnDate || 'Não disponível'}</strong><br>
                🔄 Lembre-se de devolver dentro do prazo
            </div>
            <div class="action-buttons" style="margin-top: 15px;">
                <button id="devolverBtn" class="btn btn-primary">
                    📤 Solicitar Devolução
                </button>
            </div>
        </div>
    `;
}
            else if (userStatus.isInQueue) {
                // 📋 NA FILA
                actionButtonsHtml = `
                    <div class="status-card status-info">
                        <div class="status-icon">📋</div>
                        <div class="status-title">Você está na fila de espera</div>
                        <div class="status-message">
                            Posição: <strong>#${userStatus.queuePosition}</strong><br>
                            Você será notificado quando o livro estiver disponível.
                        </div>
                        <button id="cancelarReservaBtn" class="btn btn-secondary" style="margin-top: 15px;">
                            ❌ Sair da Fila
                        </button>
                    </div>
                `;
            } 
            else if (!book.available) {
                // 🔒 INDISPONÍVEL
                actionButtonsHtml = `
                    <div class="status-card status-unavailable">
                        <div class="status-icon">🔒</div>
                        <div class="status-title">Livro Indisponível</div>
                        <div class="status-message">
                            Este livro está emprestado no momento.<br>
                            ${book.returnDate ? `📅 Previsão de devolução: <strong>${book.returnDate}</strong>` : ''}
                        </div>
                        <button id="reservarBtn" class="btn btn-primary" style="margin-top: 15px;">
                            📋 Entrar na Fila de Espera
                        </button>
                    </div>
                `;
            } 
            else {
                // ✅ DISPONÍVEL
                const hasReturnedBefore = userStatus.hasReturnedBefore && userStatus.lastLoanStatus !== 'lido';
                
                actionButtonsHtml = `
                    <div class="status-card status-available">
                        <div class="status-icon">✅</div>
                        <div class="status-title">Livro Disponível!</div>
                        <div class="status-message">
                            Este livro está disponível para empréstimo.
                        </div>
                        <div class="action-buttons" style="margin-top: 15px;">
                            <button id="solicitarBtn" class="btn btn-primary">
                                📚 Solicitar Empréstimo
                            </button>
                            ${hasReturnedBefore ? `
                                <button id="marcarLidoBtn" class="btn btn-success">
                                    ✓ Marcar como Lido
                                </button>
                                <div class="info-badge">
                                    Você devolveu este livro em ${userStatus.returnDate}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            actionButtonsHtml = `
                <div class="status-card status-info">
                    <div class="status-message">
                        🔐 Faça login para solicitar empréstimos
                    </div>
                </div>
            `;
        }

        // 9️⃣ RENDERIZAR HTML COMPLETO
        const imageUrl = book.cover || '';

        container.innerHTML = `
               <style>
                html, body {
                    margin: 0;
                    padding: 0;
                    background-color: #434E70;
                }

                .book-details { 
                    max-width: 900px; 
                    margin: 0 auto; 
                    padding: 20px; 
                }
                
                .book-header { 
                    display: flex; 
                    gap: 30px; 
                    margin-bottom: 30px; 
                    background: #CFD2DB; 
                    padding: 30px; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                }
                
                .book-cover-large { 
                    width: 220px; 
                    height: 320px; 
                    object-fit: cover; 
                    border-radius: 15px; 
                    box-shadow: 0 8px 24px rgba(0,0,0,0.2); 
                    flex-shrink: 0; 
                    background: linear-gradient(135deg, #434E70 0%); 
                }
                
                .book-info { 
                    flex: 1; 
                    min-width: 0; 
                }
                
                .book-info h2 { 
                    color: #434E70; 
                    margin: 0 0 20px 0; 
                    font-size: 28px; 
                    font-weight: 700; 
                    line-height: 1.3; 
                    font-family: arial black;
                }
                
                .book-info p { 
                    color: #434E70; 
                    margin: 10px 0; 
                    font-size: 16px; 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    font-family: arial;
                }
                
                .book-info p strong { 
                    color: #434E70; 
                    min-width: 80px; 
                    font-family: arial black;
                }
                
                .avg-rating { 
                    background: linear-gradient(135deg, #434E70 0%); 
                    color: white; 
                    padding: 20px; 
                    border-radius: 999px; 
                    text-align: center; 
                    margin-bottom: 30px; 
                    font-size: 24px; 
                    font-weight: 700; 
                    box-shadow: 0 4px 12px rgba(155, 180, 255, 0.4); 
                    font-family: arial black;
                }
                
                .status-card { 
                    padding: 30px; 
                    border-radius: 20px; 
                    margin-bottom: 30px; 
                    text-align: center; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                    transition: transform 0.3s ease; 
                }
                
                .status-card:hover { 
                    transform: translateY(-2px); 
                    box-shadow: 0 6px 24px rgba(0,0,0,0.2); 
                }
                
                .status-icon { 
                    font-size: 48px; 
                    margin-bottom: 15px; 
                }
                
                .status-title { 
                    font-size: 22px; 
                    font-weight: 700; 
                    margin: 15px 0 10px 0; 
                    font-family: arial black;
                }
                
                .status-message { 
                    font-size: 16px; 
                    line-height: 1.6; 
                    font-family: arial;
                }
                
                .status-success { 
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
                    border: 3px solid #28a745; 
                }
                
                .status-success .status-title, 
                .status-success .status-message { 
                    color: #155724; 
                }
                
                .status-warning { 
                    background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); 
                    border: 3px solid #ffc107; 
                }
                
                .status-warning .status-title, 
                .status-warning .status-message { 
                    color: #856404; 
                }
                
                .status-info { 
                    background: linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%); 
                    border: 3px solid #17a2b8; 
                }
                
                .status-info .status-title, 
                .status-info .status-message { 
                    color: #0c5460; 
                }
                
                .status-unavailable { 
                    background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); 
                    border: 3px solid #dc3545; 
                }
                
                .status-unavailable .status-title, 
                .status-unavailable .status-message { 
                    color: #721c24; 
                }
                
                .status-available { 
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
                    border: 3px solid #28a745; 
                }
                
                .status-available .status-title, 
                .status-available .status-message { 
                    color: #155724; 
                }
                
                .action-buttons { 
                    display: flex; 
                    gap: 15px; 
                    justify-content: center; 
                    flex-wrap: wrap; 
                }
                
                .already-read-badge, .info-badge { 
                    background: white; 
                    padding: 12px 20px; 
                    border-radius: 999px; 
                    font-size: 14px; 
                    font-weight: 600; 
                    color: #28a745; 
                    margin-top: 10px; 
                    font-family: arial black;
                }
                
                .btn { 
                    padding: 12px 24px; 
                    border: none; 
                    border-radius: 999px; 
                    font-size: 14px; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.3s ease; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                    font-family: arial black;
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
                    background: linear-gradient(135deg, #434E70 0%); 
                    color: white; 
                }
                
                .btn-success { 
                    background: linear-gradient(135deg, #28a745 0%, #218838 100%); 
                    color: white; 
                }
                
                .btn-secondary { 
                    background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%); 
                    color: white; 
                }
                
                .btn-danger { 
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                    color: white; 
                }
                
                .synopsis-section { 
                    background: #CFD2DB; 
                    padding: 25px; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                    margin-bottom: 30px; 
                }
                
                .synopsis-section #synopsis { 
                    margin-top: 20px; 
                    line-height: 1.8; 
                    color: #434E70; 
                    font-size: 16px; 
                    font-family: arial;
                }
                
                .hidden { 
                    display: none; 
                }
                
                .review-section { 
                    background: #CFD2DB; 
                    padding: 25px; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                    margin-bottom: 30px; 
                }

                .review-section h3 {
                    color: #434E70;
                    font-family: arial black;
                    margin: 0 0 15px 0;
                }
                
                .rating-input { 
                    display: flex; 
                    justify-content: center; 
                    gap: 8px; 
                    margin: 20px 0; 
                }
                
                .rating-input .star { 
                    font-size: 36px; 
                    color: #e0e0e0; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                    user-select: none; 
                }
                
                .rating-input .star.filled { 
                    color: #ffd700; 
                }
                
                .rating-input .star:hover { 
                    color: #ffed4e; 
                    transform: scale(1.2); 
                }
                
                #reviewsList { 
                    background: #CFD2DB; 
                    padding: 25px; 
                    border-radius: 20px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15); 
                    margin-bottom: 30px; 
                }

                #reviewsList h3 {
                    color: #434E70;
                    font-family: arial black;
                    margin: 0 0 20px 0;
                }
                
                .review-card { 
                    border: 2px solid white; 
                    border-radius: 20px; 
                    padding: 20px; 
                    margin-bottom: 20px; 
                    background: white; 
                    transition: all 0.3s ease; 
                }
                
                .review-card:hover { 
                    border-color: #434E70; 
                    box-shadow: 0 4px 12px rgba(155, 180, 255, 0.2); 
                }

                .review-card strong {
                    font-family: arial black;
                    color: #434E70;
                }

                .review-card em {
                    font-family: arial;
                    color: #434E70;
                }

                .review-card p {
                    font-family: arial;
                    color: #434E70;
                }
                
                .stars-display { 
                    margin: 10px 0; 
                }
                
                .stars-display .star { 
                    font-size: 18px; 
                    color: #e0e0e0; 
                }
                
                .stars-display .star.filled { 
                    color: #ffd700; 
                }
                
                .shelf-options { 
                    display: flex; 
                    gap: 15px; 
                    justify-content: center; 
                    margin-bottom: 30px; 
                    flex-wrap: wrap; 
                }
                
                .favorited { 
                    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                }

                textarea {
                    width: 100%;
                    padding: 15px;
                    border: 2px solid white;
                    border-radius: 20px;
                    font-size: 16px;
                    resize: vertical;
                    box-sizing: border-box;
                    font-family: arial;
                    color: #434E70;
                    background: white;
                }

                textarea:focus {
                    outline: none;
                    border-color: #434E70;
                    box-shadow: 0 0 0 3px rgba(155, 180, 255, 0.2);
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
                    background-color: #CFD2DB;
                    margin: 10% auto;
                    padding: 30px;
                    border-radius: 20px;
                    width: 90%;
                    max-width: 500px;
                    position: relative;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }

                .modal-content h3 {
                    margin: 0 0 20px 0;
                    color: #434E70;
                    font-family: arial black;
                }

                .close-btn {
                    position: absolute;
                    top: 15px;
                    right: 25px;
                    font-size: 32px;
                    cursor: pointer;
                    color: #434E70;
                    font-weight: bold;
                }

                .close-btn:hover {
                    color: #434E70;
                }
                
                @media (max-width: 768px) {
                    .book-header { 
                        flex-direction: column; 
                        align-items: center; 
                        text-align: center; 
                        padding: 20px; 
                    }
                    
                    .book-cover-large { 
                        width: 180px; 
                        height: 260px; 
                    }
                    
                    .action-buttons { 
                        flex-direction: column; 
                    }
                    
                    .btn { 
                        width: 100%; 
                    }
                }
            </style>
            
            <div class="book-details">
                <div class="book-header">
                    ${imageUrl ? `<img src="${imageUrl}" class="book-cover-large" alt="${book.title}" />` : ''}
                    <div class="book-info">
                        <h2>${book.title || 'Título não disponível'}</h2>
                        <p><strong>Autor:</strong> ${book.author || 'Desconhecido'}</p>
                        ${book.pages ? `<p><strong>Páginas:</strong> ${book.pages}</p>` : ''}
                        ${book.genre ? `<p><strong>Gênero:</strong> ${book.genre}</p>` : ''}
                        ${book.editora ? `<p><strong>Editora:</strong> ${book.editora}</p>` : ''}
                        ${book.ano_publicacao ? `<p><strong>Ano:</strong> ${book.ano_publicacao}</p>` : ''}
                    </div>
                </div>

                ${avgRating ? `<div class="avg-rating">⭐ ${avgRating} / 5 (${ratings.length} avaliação${ratings.length > 1 ? 'ões' : ''})</div>` : '<div class="avg-rating">Nenhuma avaliação ainda</div>'}

                ${actionButtonsHtml}

                <div class="synopsis-section">
                    <button id="toggleSynopsisBtn" class="btn btn-primary">📖 VER SINOPSE</button>
                    <div id="synopsis" class="hidden">${book.synopsis || 'Sem sinopse disponível.'}</div>
                </div>

                ${currentUser ? `
                    <div class="review-section">
                        <h3 style="margin: 0 0 15px 0; color: #2d3748; font-size: 20px;">✍️ Adicionar Resenha</h3>
                        <div class="rating-input" id="ratingInput">
                            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">★</span>`).join('')}
                        </div>
                        <textarea id="reviewText" rows="4" maxlength="500" placeholder="Compartilhe sua opinião sobre este livro..." style="width: 100%; padding: 15px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 16px; resize: vertical; box-sizing: border-box;"></textarea>
                        <button id="saveReviewBtn" class="btn btn-primary" style="margin-top: 15px; width: 100%;">✓ Publicar Resenha</button>
                    </div>
                    <div class="shelf-options">
                        <button id="favoriteBtn" class="btn ${isFavorited ? 'favorited' : 'btn-primary'}">${isFavorited ? '❤️ Favoritado' : '🤍 Favoritar'}</button>
                        <button id="addShelfBtn" class="btn btn-primary">📚 Adicionar à Prateleira</button>
                    </div>
                ` : '<div style="text-align: center; padding: 30px; background: white; border-radius: 16px; margin-bottom: 30px;">🔐 Faça login para avaliar e favoritar</div>'}

                <div id="reviewsList">
                    <h3 style="margin: 0 0 20px 0; color: #2d3748; font-size: 22px;">💬 Resenhas (${allReviews.length})</h3>
                    ${allReviews.length ? allReviews.map(r => `
                        <div class="review-card" data-cpf="${r.cpf || ''}" data-reviewid="${r.id || ''}">
                            <strong style="font-size: 18px; color: #2d3748;">${currentUser && r.cpf === currentUser.cpf ? "Você" : (r.user || 'Usuário')}</strong> 
                            <em style="color: #718096; font-size: 14px;">(${r.date || 'Data não disponível'})</em>
                            <div class="stars-display">
                                ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= (r.rating || 0) ? 'filled' : ''}">★</span>`).join('')}
                            </div>
                            <p style="margin: 15px 0 0 0; color: #4a5568; line-height: 1.6;">${(r.text || 'Sem texto').replace(/\n/g, '<br>')}</p>
                            ${currentUser && r.cpf === currentUser.cpf ? `
                                <div style="margin-top: 15px;">
                                    <button class="editReviewBtn btn" style="padding: 8px 16px; font-size: 14px;">✏️ Editar</button>
                                    <button class="deleteReviewBtn btn btn-danger" style="padding: 8px 16px; font-size: 14px;">🗑️ Excluir</button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('') : '<p style="text-align: center; color: #718096; padding: 40px;">Nenhuma resenha ainda. Seja o primeiro!</p>'}
                </div>

                <button id="backBtn" class="btn btn-secondary" style="width: 100%;">← Voltar</button>

                ${currentUser ? `
                    <div id="shelfModal" class="modal" style="display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5);">
                        <div class="modal-content" style="background-color: white; margin: 10% auto; padding: 30px; border-radius: 16px; width: 90%; max-width: 500px; position: relative;">
                            <span class="close-btn" style="position: absolute; top: 15px; right: 25px; font-size: 32px; cursor: pointer; color: #aaa;">&times;</span>
                            <h3 style="margin: 0 0 20px 0; color: #2d3748;">📚 Adicionar a uma Prateleira</h3>
                            <div id="shelfList"></div>
                            <button id="createShelfModalBtn" class="btn btn-primary" style="margin-top: 20px; width: 100%;">+ Criar Nova Prateleira</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        console.log('✅ HTML renderizado');
        
        // 🔟 CONFIGURAR EVENT LISTENERS
        setupBookDetailsEventListeners(container, validBookId, currentUser, userShelves);

    } catch (error) {
        console.error('❌ ERRO:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3>Erro ao carregar o livro</h3>
                <p>${error.message}</p>
                <button onclick="window.location.reload()" class="btn btn-primary">🔄 Recarregar</button>
            </div>
        `;
    }
}

// ===================================
// EVENT LISTENERS
// ===================================

function setupBookDetailsEventListeners(container, bookId, currentUser, userShelves) {
    // Sinopse
    const toggleBtn = container.querySelector('#toggleSynopsisBtn');
    const synopsis = container.querySelector('#synopsis');
    if (toggleBtn && synopsis) {
        toggleBtn.addEventListener('click', () => {
            synopsis.classList.toggle('hidden');
            toggleBtn.textContent = synopsis.classList.contains('hidden') ? '📖 VER SINOPSE' : '📖 VER MENOS';
        });
    }

    // Voltar
    const backBtn = container.querySelector('#backBtn');
    if (backBtn) backBtn.addEventListener('click', () => navigateTo('books'));

    if (!currentUser) return;

    // Sistema de rating
    setupRatingSystem(container, bookId);
    
    // Botões de ação
    setupActionButtons(container, bookId);
    
    // Favoritar
    setupFavoriteButton(container, bookId);
    
    // Resenhas
    setupReviewButtons(container, bookId);
    
    // Prateleiras
    setupShelfModal(container, bookId, userShelves);
}

function setupRatingSystem(container, bookId) {
    let selectedRating = 0;
    const stars = container.querySelectorAll('#ratingInput .star');
    const saveBtn = container.querySelector('#saveReviewBtn');
    
    if (!stars.length || !saveBtn) return;
    
    const updateStars = (rating) => stars.forEach((s, i) => s.classList.toggle('filled', i < rating));
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            updateStars(selectedRating);
        });
        star.addEventListener('mouseenter', () => updateStars(parseInt(star.dataset.value)));
    });
    
    container.querySelector('#ratingInput').addEventListener('mouseleave', () => updateStars(selectedRating));
    
    saveBtn.addEventListener('click', async () => {
        const text = container.querySelector('#reviewText').value.trim();
        
        if (selectedRating === 0) {
            alert('⭐ Selecione uma classificação');
            return;
        }
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Publicando...';
        
        try {
            const res = await fetch('http://localhost:3000/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ bookId: parseInt(bookId), text, rating: selectedRating })
            });
            
            const result = await res.json();
            
            if (res.ok) {
                alert('✅ ' + result.message);
                window.location.reload();
            } else {
                alert('❌ ' + result.error);
                saveBtn.disabled = false;
                saveBtn.textContent = '✓ Publicar Resenha';
            }
        } catch (error) {
            alert('❌ Erro de conexão');
            saveBtn.disabled = false;
            saveBtn.textContent = '✓ Publicar Resenha';
        }
    });
}

function setupActionButtons(container, bookId) {
    const buttons = {
        solicitar: container.querySelector('#solicitarBtn'),
        reservar: container.querySelector('#reservarBtn'),
        devolver: container.querySelector('#devolverBtn'),
        marcarLido: container.querySelector('#marcarLidoBtn'),
        cancelarSolicitacao: container.querySelector('#cancelarSolicitacaoBtn'),
        cancelarReserva: container.querySelector('#cancelarReservaBtn')
    };

    // Solicitar
    if (buttons.solicitar) {
        buttons.solicitar.addEventListener('click', async () => {
            if (!confirm('📚 Solicitar empréstimo?')) return;
            
            buttons.solicitar.disabled = true;
            buttons.solicitar.textContent = 'Solicitando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert('✅ ' + result.message);
                    window.location.reload();
                } else {
                    alert('❌ ' + result.error);
                    buttons.solicitar.disabled = false;
                    buttons.solicitar.textContent = '📚 Solicitar Empréstimo';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                buttons.solicitar.disabled = false;
                buttons.solicitar.textContent = '📚 Solicitar Empréstimo';
            }
        });
    }

    // Reservar
    if (buttons.reservar) {
        buttons.reservar.addEventListener('click', async () => {
            if (!confirm('📋 Entrar na fila de espera?')) return;
            
            buttons.reservar.disabled = true;
            buttons.reservar.textContent = 'Reservando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert('✅ ' + result.message);
                    window.location.reload();
                } else {
                    alert('❌ ' + result.error);
                    buttons.reservar.disabled = false;
                    buttons.reservar.textContent = '📋 Entrar na Fila de Espera';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                buttons.reservar.disabled = false;
                buttons.reservar.textContent = '📋 Entrar na Fila de Espera';
            }
        });
    }

    // Devolver
    if (buttons.devolver) {
        buttons.devolver.addEventListener('click', async () => {
            if (!confirm('📤 Solicitar devolução deste livro?')) return;
            
            buttons.devolver.disabled = true;
            buttons.devolver.textContent = 'Solicitando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/request-return', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert('✅ ' + result.message);
                    window.location.reload();
                } else {
                    alert('❌ ' + result.error);
                    buttons.devolver.disabled = false;
                    buttons.devolver.textContent = '📤 Solicitar Devolução';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                buttons.devolver.disabled = false;
                buttons.devolver.textContent = '📤 Solicitar Devolução';
            }
        });
    }

    // Marcar como Lido
    if (buttons.marcarLido) {
        buttons.marcarLido.addEventListener('click', async () => {
            const choice = confirm('📖 Você terminou de ler este livro?\n\nClique OK se leu completamente\nClique Cancelar se não terminou');
            const status = choice ? 'lido' : 'nao_terminado';
            
            buttons.marcarLido.disabled = true;
            buttons.marcarLido.textContent = 'Salvando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId), status })
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert('✅ ' + result.message);
                    window.location.reload();
                } else {
                    alert('❌ ' + result.error);
                    buttons.marcarLido.disabled = false;
                    buttons.marcarLido.textContent = '✓ Marcar como Lido';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                buttons.marcarLido.disabled = false;
                buttons.marcarLido.textContent = '✓ Marcar como Lido';
            }
        });
    }

    // Cancelar Solicitação
    if (buttons.cancelarSolicitacao) {
        buttons.cancelarSolicitacao.addEventListener('click', async () => {
            if (!confirm('❌ Cancelar esta solicitação?')) return;
            
            buttons.cancelarSolicitacao.disabled = true;
            buttons.cancelarSolicitacao.textContent = 'Cancelando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/cancel-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert('✅ ' + result.message);
                    window.location.reload();
                } else {
                    alert('❌ ' + result.error);
                    buttons.cancelarSolicitacao.disabled = false;
                    buttons.cancelarSolicitacao.textContent = '❌ Cancelar Solicitação';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                buttons.cancelarSolicitacao.disabled = false;
                buttons.cancelarSolicitacao.textContent = '❌ Cancelar Solicitação';
            }
        });
    }

    // Cancelar Reserva
    if (buttons.cancelarReserva) {
        buttons.cancelarReserva.addEventListener('click', async () => {
            if (!confirm('❌ Sair da fila de espera?')) return;
            
            buttons.cancelarReserva.disabled = true;
            buttons.cancelarReserva.textContent = 'Cancelando...';
            
            try {
                const res = await fetch('http://localhost:3000/api/loan/cancel-reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ bookId: parseInt(bookId) })
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    alert('✅ ' + result.message);
                    window.location.reload();
                } else {
                    alert('❌ ' + result.error);
                    buttons.cancelarReserva.disabled = false;
                    buttons.cancelarReserva.textContent = '❌ Sair da Fila';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                buttons.cancelarReserva.disabled = false;
                buttons.cancelarReserva.textContent = '❌ Sair da Fila';
            }
        });
    }
}

function setupFavoriteButton(container, bookId) {
    const favoriteBtn = container.querySelector('#favoriteBtn');
    if (!favoriteBtn) return;
    
    favoriteBtn.addEventListener('click', async () => {
        const isFavorited = favoriteBtn.classList.contains('favorited');
        favoriteBtn.disabled = true;
        const originalText = favoriteBtn.textContent;
        favoriteBtn.textContent = isFavorited ? 'Removendo...' : 'Favoritando...';
        
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
            
            if (res.ok) {
                alert('✅ ' + result.message);
                window.location.reload();
            } else {
                alert('❌ ' + result.error);
                favoriteBtn.disabled = false;
                favoriteBtn.textContent = originalText;
            }
        } catch (error) {
            alert('❌ Erro de conexão');
            favoriteBtn.disabled = false;
            favoriteBtn.textContent = originalText;
        }
    });
}

function setupReviewButtons(container, bookId) {
    container.addEventListener('click', async (e) => {
        // DELETE
        if (e.target.classList.contains('deleteReviewBtn')) {
            if (e.target.disabled) return;
            
            const reviewCard = e.target.closest('.review-card');
            const reviewId = reviewCard.dataset.reviewid;
            
            if (!reviewId || !confirm('🗑️ Excluir esta resenha?')) return;
            
            e.target.disabled = true;
            e.target.textContent = 'Excluindo...';
            
            try {
                const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (res.ok) {
                    alert('✅ Resenha excluída!');
                    window.location.reload();
                } else {
                    const result = await res.json().catch(() => ({ error: 'Erro' }));
                    alert('❌ ' + result.error);
                    e.target.disabled = false;
                    e.target.textContent = '🗑️ Excluir';
                }
            } catch (error) {
                alert('❌ Erro de conexão');
                e.target.disabled = false;
                e.target.textContent = '🗑️ Excluir';
            }
        }
        
        // EDIT
        if (e.target.classList.contains('editReviewBtn')) {
            if (e.target.disabled) return;
            
            const reviewCard = e.target.closest('.review-card');
            const reviewId = reviewCard.dataset.reviewid;
            
            if (!reviewId) return;
            
            const currentText = reviewCard.querySelector('p').textContent.trim();
            const currentRating = reviewCard.querySelectorAll('.stars-display .star.filled').length;
            
            openEditModal(reviewId, currentText, currentRating);
        }
    });
}

function openEditModal(reviewId, currentText, currentRating) {
    document.querySelectorAll('.modal').forEach(m => m.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    
    modal.innerHTML = `
        <div style="background: white; margin: 10% auto; padding: 30px; border-radius: 16px; width: 90%; max-width: 500px; position: relative;">
            <span class="close-btn" style="position: absolute; top: 15px; right: 25px; font-size: 32px; cursor: pointer; color: #aaa;">&times;</span>
            <h3 style="margin: 0 0 20px 0; color: #2d3748;">✏️ Editar Resenha</h3>
            <div id="editRatingInput" style="display: flex; justify-content: center; gap: 8px; margin: 20px 0;">
                ${[1, 2, 3, 4, 5].map(i => 
                    `<span class="star ${i <= currentRating ? 'filled' : ''}" data-value="${i}" style="font-size: 36px; color: ${i <= currentRating ? '#ffd700' : '#e0e0e0'}; cursor: pointer; user-select: none;">★</span>`
                ).join('')}
            </div>
            <textarea id="editReviewText" rows="4" maxlength="500" style="width: 100%; padding: 15px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 16px; resize: vertical; box-sizing: border-box; margin: 10px 0;">${currentText}</textarea>
            <div style="text-align: center; margin-top: 20px;">
                <button id="saveEditBtn" class="btn btn-primary" style="margin-right: 10px;">✓ Salvar</button>
                <button id="cancelEditBtn" class="btn btn-secondary">✕ Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let editRating = currentRating;
    const editStars = modal.querySelectorAll('#editRatingInput .star');
    const updateStars = (rating) => editStars.forEach((s, i) => {
        s.classList.toggle('filled', i < rating);
        s.style.color = i < rating ? '#ffd700' : '#e0e0e0';
    });
    
    editStars.forEach(star => {
        star.addEventListener('click', () => {
            editRating = parseInt(star.dataset.value);
            updateStars(editRating);
        });
        star.addEventListener('mouseenter', () => updateStars(parseInt(star.dataset.value)));
    });
    
    modal.querySelector('#editRatingInput').addEventListener('mouseleave', () => updateStars(editRating));
    
    const saveBtn = modal.querySelector('#saveEditBtn');
    saveBtn.addEventListener('click', async () => {
        if (saveBtn.disabled) return;
        
        const newText = modal.querySelector('#editReviewText').value.trim();
        
        if (editRating === 0) {
            alert('⭐ Selecione uma classificação');
            return;
        }
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando...';
        
        try {
            const res = await fetch(`http://localhost:3000/api/reviews/${reviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text: newText, rating: editRating })
            });
            
            if (res.ok) {
                alert('✅ Resenha atualizada!');
                modal.remove();
                window.location.reload();
            } else {
                const result = await res.json().catch(() => ({ error: 'Erro' }));
                alert('❌ ' + result.error);
                saveBtn.disabled = false;
                saveBtn.textContent = '✓ Salvar';
            }
        } catch (error) {
            alert('❌ Erro de conexão');
            saveBtn.disabled = false;
            saveBtn.textContent = '✓ Salvar';
        }
    });
    
    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancelEditBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function setupShelfModal(container, bookId, userShelves) {
    const shelfModal = container.querySelector('#shelfModal');
    const addShelfBtn = container.querySelector('#addShelfBtn');
    const closeBtn = shelfModal?.querySelector('.close-btn');
    const shelfList = container.querySelector('#shelfList');

    if (!addShelfBtn || !shelfModal || !shelfList) return;
    
    addShelfBtn.addEventListener('click', () => {
        if (userShelves && userShelves.length > 0) {
            shelfList.innerHTML = userShelves.map(shelf => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 8px; border: 2px solid #e2e8f0;">
                    <span style="font-size: 16px; color: #2d3748; font-weight: 600;">${shelf.name || shelf.nome_prateleira}</span>
                    <button class="add-to-shelf-btn btn btn-primary" data-shelf-id="${shelf.id}" style="padding: 8px 16px; font-size: 14px;">+ Adicionar</button>
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
                            body: JSON.stringify({ shelfId: parseInt(shelfId), bookId: parseInt(bookId) })
                        });
                        
                        const result = await res.json();
                        alert(result.message || result.error);
                        if (res.ok) shelfModal.style.display = 'none';
                    } catch (error) {
                        alert('❌ Erro ao adicionar');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = '+ Adicionar';
                    }
                });
            });
        } else {
            shelfList.innerHTML = '<p style="text-align: center; color: #718096; padding: 20px;">Você não tem prateleiras. Crie uma na página "Minhas Prateleiras"!</p>';
        }
        shelfModal.style.display = 'block';
    });

    if (closeBtn) closeBtn.addEventListener('click', () => shelfModal.style.display = 'none');
    
    window.addEventListener('click', (e) => { if (e.target === shelfModal) shelfModal.style.display = 'none'; });
    
    const createBtn = container.querySelector('#createShelfModalBtn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            const name = prompt('📚 Nome da nova prateleira:');
            if (!name || !name.trim()) return;
            
            fetch('http://localhost:3000/api/user/shelves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: name.trim() })
            })
            .then(res => res.json())
            .then(result => {
                alert(result.message || result.error);
                if (result.message) location.reload();
            })
            .catch(() => alert('❌ Erro ao criar prateleira'));
        });
    }
}