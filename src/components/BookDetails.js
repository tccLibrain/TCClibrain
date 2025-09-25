import { navigateTo } from '../main.js';

// Função para criar imagem placeholder offline
function createPlaceholderImage(title, width = 150, height = 210) {
    const text = title ? title.substring(0, 8) : 'Sem Capa';
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#9dadb7"/>
            <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#ffffff" 
                  text-anchor="middle" dominant-baseline="middle">${text}</text>
        </svg>
    `)}`;
}

export async function renderBookDetails(container, bookId) {
    console.log('Carregando detalhes do livro:', bookId);
    
    // Mostrar loading
    container.innerHTML = '<div class="loading">Carregando detalhes do livro...</div>';
    
    try {
        // 1. Obter informações do usuário logado
        let currentUser = null;
        try {
            const currentUserResponse = await fetch('http://localhost:3000/api/profile', {
                credentials: 'include'
            });
            if (currentUserResponse.ok) {
                currentUser = await currentUserResponse.json();
                console.log('Usuário logado:', currentUser.nome);
            } else {
                console.log('Usuário não logado');
            }
        } catch (error) {
            console.log('Usuário não logado ou erro na API de perfil');
        }

        // 2. Obter informações detalhadas do livro
        const bookResponse = await fetch(`http://localhost:3000/api/books/${bookId}`, {
            credentials: 'include'
        });
        
        if (!bookResponse.ok) {
            container.innerHTML = '<div class="no-books">Livro não encontrado.</div>';
            return;
        }
        
        const book = await bookResponse.json();
        console.log('Dados do livro:', book);

        // 3. Obter todas as resenhas para este livro
        let allReviews = [];
        try {
            const reviewsResponse = await fetch(`http://localhost:3000/api/reviews/${bookId}`, {
                credentials: 'include'
            });
            if (reviewsResponse.ok) {
                allReviews = await reviewsResponse.json();
                console.log('Resenhas carregadas:', allReviews.length);
            }
        } catch (error) {
            console.log('Erro ao carregar resenhas:', error);
        }

        // 4. Obter as prateleiras personalizadas do usuário (se logado)
        let userShelves = [];
        if (currentUser) {
            try {
                const shelvesResponse = await fetch(`http://localhost:3000/api/user/shelves`, {
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
        
        // Verificar se está favoritado (se usuário logado)
        const isFavorited = currentUser && currentUser.favorites && currentUser.favorites.includes(parseInt(bookId));

        // Lógica para botões de ação (apenas se usuário logado)
        let actionButtonHtml = '';
        if (currentUser) {
            const isAvailable = book.available !== false;
            const isUserInQueue = book.queue && book.queue.includes(currentUser.cpf);
            const isLoanedToUser = book.emprestadoPara === currentUser.cpf;
            
            console.log('Status do livro:', {
                isAvailable,
                isUserInQueue,
                isLoanedToUser,
                emprestadoPara: book.emprestadoPara,
                userCpf: currentUser.cpf
            });
            
            if (isLoanedToUser) {
                actionButtonHtml = `<button id="devolverBtn" class="btn">Solicitar Devolução</button>`;
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

        // Usar placeholder offline
        const imageUrl = book.cover || createPlaceholderImage(book.title);

        container.innerHTML = `
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
                    <p id="synopsis" class="hidden">${book.synopsis || 'Sem sinopse disponível.'}</p>
                </div>

                ${currentUser ? `
                    <div class="review-section">
                        <h3>Adicionar nova resenha:</h3>
                        <div class="rating-input">
                            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">&#9733;</span>`).join('')}
                        </div>
                        <textarea id="reviewText" rows="4" maxlength="500" placeholder="Escreva sua resenha..."></textarea>
                        <button id="saveReviewBtn" class="btn">Adicionar Resenha</button>
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
                                ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= (r.rating || 0) ? 'filled' : ''}">&#9733;</span>`).join('')}
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

        // ==============================
        // Event Listeners
        // ==============================

        // Sinopse toggle
        const toggleSynopsisBtn = document.getElementById('toggleSynopsisBtn');
        if (toggleSynopsisBtn) {
            toggleSynopsisBtn.onclick = () => {
                const synopsis = document.getElementById('synopsis');
                if (synopsis) {
                    synopsis.classList.toggle('hidden');
                    toggleSynopsisBtn.textContent = synopsis.classList.contains('hidden') ? 'VER SINOPSE' : 'VER MENOS';
                }
            };
        }

        // Botão voltar
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.onclick = () => {
                console.log('Voltando para lista de livros');
                navigateTo('books');
            };
        }

        // Se não há usuário logado, não adicionar mais funcionalidades
        if (!currentUser) {
            console.log('Usuário não logado, funcionalidades limitadas');
            return;
        }

        // ==============================
        // Funcionalidades para usuários logados
        // ==============================

        // Sistema de avaliação por estrelas
        let selectedRating = 0;
        let editingReviewId = null;
        const ratingStars = document.querySelectorAll('.rating-input .star');
        
        function updateStars() {
            ratingStars.forEach((s, index) => {
                s.classList.toggle('filled', index < selectedRating);
            });
        }

        ratingStars.forEach(star => {
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.value);
                updateStars();
            });
        });

        // Salvar resenha
        const saveBtn = document.getElementById('saveReviewBtn');
        if (saveBtn) {
            saveBtn.onclick = async () => {
                console.log('=== DEBUG SALVAR RESENHA ===');
                
                const text = document.getElementById('reviewText').value.trim();
                console.log('Texto da resenha:', text);
                console.log('Rating selecionado:', selectedRating);
                
                if (selectedRating === 0 && !editingReviewId) {
                    alert('Por favor, selecione uma classificação em estrelas.');
                    return;
                }
                
                let url = 'http://localhost:3000/api/reviews';
                let method = 'POST';
                let body = { 
                    bookId: parseInt(bookId), 
                    text: text, 
                    rating: selectedRating
                };

                if (editingReviewId) {
                    url = `${url}/${editingReviewId}`;
                    method = 'PUT';
                }

                console.log('URL:', url);
                console.log('Method:', method);
                console.log('Body:', body);

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify(body)
                    });

                    console.log('Status da resposta:', response.status);

                    if (response.ok) {
                        const responseData = await response.json();
                        console.log('Resposta do servidor:', responseData);
                        
                        alert(responseData.message || 'Resenha salva com sucesso!');
                        
                        // Recarregar a página de detalhes
                        renderBookDetails(container, bookId);
                    } else {
                        const errorData = await response.json();
                        console.error('Erro HTTP:', response.status, errorData);
                        
                        let userMessage = errorData.error || errorData.message || 'Erro desconhecido';
                        if (response.status === 401) {
                            userMessage = 'Você precisa estar logado para salvar resenhas';
                        } else if (response.status === 400 && errorData.error?.includes('já avaliou')) {
                            userMessage = 'Você já avaliou este livro';
                        } else if (response.status === 500) {
                            userMessage = 'Erro interno do servidor. Tente novamente.';
                        }
                        
                        alert(`Erro ao salvar resenha: ${userMessage}`);
                    }
                } catch (error) {
                    console.error('Erro de conexão:', error);
                    alert('Erro de conexão ao salvar resenha. Verifique se o servidor está rodando.');
                }
                
                console.log('=== FIM DEBUG SALVAR RESENHA ===');
            };
        }

        // Botão de solicitar empréstimo
        const solicitarBtn = document.getElementById('solicitarBtn');
        if (solicitarBtn) {
            solicitarBtn.onclick = async () => {
                console.log('=== DEBUG SOLICITAÇÃO EMPRÉSTIMO ===');
                console.log('BookId:', bookId, typeof bookId);
                console.log('Usuário:', currentUser?.nome);
                
                try {
                    const response = await fetch('http://localhost:3000/api/loan/request', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ bookId: parseInt(bookId) })
                    });
                    
                    console.log('Status da resposta:', response.status);
                    
                    if (response.ok) {
                        const responseData = await response.json();
                        alert(responseData.message || 'Empréstimo solicitado com sucesso!');
                        renderBookDetails(container, bookId);
                    } else {
                        const errorData = await response.json();
                        console.error('Erro HTTP:', response.status, errorData);
                        
                        let errorMsg = errorData.error || errorData.message || 'Erro desconhecido';
                        if (response.status === 401) errorMsg = 'Você precisa estar logado';
                        if (response.status === 400) errorMsg = errorData.error || 'Livro já está emprestado ou dados inválidos';
                        if (response.status === 404) errorMsg = 'Livro não encontrado';
                        if (response.status === 500) errorMsg = 'Erro interno do servidor';
                        
                        alert(`Erro: ${errorMsg}`);
                    }
                } catch (error) {
                    console.error('Erro na requisição:', error);
                    alert('Erro de conexão. Verifique se o servidor está rodando.');
                }
            };
        }

        // Botão de reservar (entrar na fila)
        const reservarBtn = document.getElementById('reservarBtn');
        if (reservarBtn) {
            reservarBtn.onclick = async () => {
                try {
                    const response = await fetch('http://localhost:3000/api/loan/reserve', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ bookId: parseInt(bookId) })
                    });
                    
                    if (response.ok) {
                        const responseData = await response.json();
                        alert(responseData.message || 'Você entrou na fila de espera!');
                        renderBookDetails(container, bookId);
                    } else {
                        const errorData = await response.json();
                        alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    console.error('Erro na requisição:', error);
                    alert('Erro de conexão.');
                }
            };
        }

        // Botão de devolver
        const devolverBtn = document.getElementById('devolverBtn');
        if (devolverBtn) {
            devolverBtn.onclick = async () => {
                if (!confirm('Deseja realmente solicitar a devolução deste livro?')) return;
                
                try {
                    const response = await fetch('http://localhost:3000/api/loan/request-return', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ bookId: parseInt(bookId) })
                    });
                    
                    if (response.ok) {
                        const responseData = await response.json();
                        alert(responseData.message || 'Solicitação de devolução enviada!');
                        renderBookDetails(container, bookId);
                    } else {
                        const errorData = await response.json();
                        alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    console.error('Erro na requisição:', error);
                    alert('Erro de conexão.');
                }
            };
        }

        // Favoritar
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.onclick = async () => {
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
                        const responseData = await response.json();
                        alert(responseData.message || (isFavorited ? 'Removido dos favoritos' : 'Adicionado aos favoritos'));
                        renderBookDetails(container, bookId);
                    } else {
                        const errorData = await response.json();
                        alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
                    }
                } catch (error) {
                    alert('Erro ao favoritar/desfavoritar o livro.');
                    console.error(error);
                }
            };
        }

        // Modal de prateleiras
        const modal = document.getElementById('shelfModal');
        const addShelfBtn = document.getElementById('addShelfBtn');
        const closeBtn = document.querySelector('.close-btn');
        const shelfList = document.getElementById('shelfList');

        if (addShelfBtn && modal) {
            addShelfBtn.onclick = () => {
                if (shelfList) {
                    shelfList.innerHTML = '';
                    userShelves.forEach(shelf => {
                        const shelfItem = document.createElement('div');
                        shelfItem.className = 'shelf-item';
                        shelfItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: var(--cinza-claro); border-radius: 5px;';
                        shelfItem.innerHTML = `
                            <span>${shelf.name || shelf.nome_prateleira}</span>
                            <button class="add-to-shelf-btn btn-small" data-shelf-id="${shelf.id}">Adicionar</button>
                        `;
                        shelfList.appendChild(shelfItem);
                    });
                    
                    if (userShelves.length === 0) {
                        shelfList.innerHTML = '<p>Você não tem prateleiras personalizadas. Crie uma!</p>';
                    }
                    
                    // Event listeners para os botões de adicionar à prateleira
                    shelfList.querySelectorAll('.add-to-shelf-btn').forEach(btn => {
                        btn.onclick = async () => {
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
                                    const responseData = await response.json();
                                    alert(responseData.message || 'Livro adicionado à prateleira!');
                                    modal.style.display = 'none';
                                } else {
                                    const errorData = await response.json();
                                    alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
                                }
                            } catch (error) {
                                alert('Erro ao adicionar livro à prateleira.');
                                console.error(error);
                            }
                        };
                    });
                }
                modal.style.display = 'block';
            };
        }

        if (closeBtn) {
            closeBtn.onclick = () => { 
                if (modal) modal.style.display = 'none'; 
            };
        }

        // Fechar modal clicando fora
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Funcionalidade dos botões de editar/excluir resenhas
        function attachReviewEvents() {
            document.querySelectorAll('.editReviewBtn').forEach(btn => {
                btn.onclick = (e) => {
                    const card = e.target.closest('.review-card');
                    const reviewId = card.dataset.reviewid;
                    const review = allReviews.find(r => r.id == reviewId);
                    if (review) {
                        document.getElementById('reviewText').value = review.text || '';
                        selectedRating = review.rating || 0;
                        updateStars();
                        editingReviewId = reviewId;
                        saveBtn.textContent = 'Atualizar Resenha';
                        // Scroll para o formulário
                        document.querySelector('.rating-input').scrollIntoView({ behavior: 'smooth' });
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
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include'
                        });

                        if (response.ok) {
                            const responseData = await response.json();
                            alert(responseData.message || 'Resenha excluída com sucesso!');
                            renderBookDetails(container, bookId);
                        } else {
                            const errorData = await response.json();
                            alert(`Erro ao excluir resenha: ${errorData.error || 'Erro desconhecido'}`);
                        }
                    } catch (error) {
                        alert('Erro de conexão ao excluir resenha.');
                        console.error(error);
                    }
                };
            });
        }

        attachReviewEvents();

        console.log('BookDetails renderizado com sucesso');

    } catch (error) {
        console.error('Erro ao carregar detalhes do livro:', error);
        container.innerHTML = '<div class="no-books">Erro ao carregar os detalhes do livro. Tente novamente.</div>';
    }
}