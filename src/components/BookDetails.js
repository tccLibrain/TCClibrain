import { books as initialBooks } from '../data/books.js';
import { navigateTo } from '../main.js';

export function renderBookDetails(container, bookId) {
  const books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  const book = books.find(b => b.id === bookId);

  const currentUser = JSON.parse(localStorage.getItem('user'));
  if (!currentUser) {
    container.innerHTML = '<p>Usuário não logado.</p>';
    navigateTo('login');
    return;
  }
  const currentUserCPF = currentUser.cpf;
  if (!currentUser.reviews) currentUser.reviews = [];
  if (!currentUser.favorites) currentUser.favorites = [];
  if (!currentUser.customShelves) currentUser.customShelves = [];

  // Buscar todas as resenhas de todos os usuários
  const allReviews = [];
  for (let key in localStorage) {
    if (key.startsWith('user-')) {
      const userData = JSON.parse(localStorage.getItem(key));
      if (userData?.reviews) {
        const userReviews = userData.reviews.filter(r => r.bookId === bookId);
        userReviews.forEach(r => {
          allReviews.push({
            user: userData.cpf === currentUserCPF ? "Você" : userData.nome,
            text: r.text,
            rating: r.rating || 0,
            date: r.date,
            cpf: userData.cpf,
            reviewId: r.id
          });
        });
      }
    }
  }

  // Média das avaliações
  const ratings = allReviews.map(r => r.rating);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;
  const isFavorited = currentUser.favorites.includes(book.id);
  
  // Nova lógica para exibir botões de ação e status
  const isAvailable = book.available;
  const isUserInQueue = book.queue?.includes(currentUserCPF);
  const isLoanedToUser = book.emprestadoPara === currentUserCPF;
  const isDevolucaoPendente = (JSON.parse(localStorage.getItem('devolucoesPendentes')) || []).some(d => d.bookId === bookId && d.cpf === currentUserCPF);
  
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
              <strong>${r.user}</strong> <em>(${r.date})</em>
              <div class="stars-display">
                ${[1, 2, 3, 4, 5].map(i => `<span class="star ${i <= r.rating ? 'filled' : ''}">&#9733;</span>`).join('')}
              </div>
              <p>${r.text.replace(/\n/g, '<br>')}</p>
              ${r.cpf === currentUserCPF ? `
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
  // JS: Estrelas e resenhas (código permanece o mesmo)
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
  saveBtn.onclick = () => {
    const text = document.getElementById('reviewText').value.trim();
    if (selectedRating === 0 && !editingReviewId) {
      alert('Por favor, selecione uma classificação em estrelas.');
      return;
    }
    const date = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    if (editingReviewId) {
      const review = currentUser.reviews.find(r => r.id === editingReviewId);
      review.text = text;
      review.rating = selectedRating;
      review.date = date;
      editingReviewId = null;
      saveBtn.textContent = 'Adicionar Resenha';
    } else {
      const reviewId = Date.now();
      currentUser.reviews.push({ id: reviewId, bookId, text, rating: selectedRating, date });
    }
    localStorage.setItem('user', JSON.stringify(currentUser));
    localStorage.setItem(`user-${currentUserCPF}`, JSON.stringify(currentUser));
    document.getElementById('reviewText').value = '';
    selectedRating = 0;
    updateStars();
    renderBookDetails(container, bookId);
  };
  function attachReviewEvents() {
    document.querySelectorAll('.editReviewBtn').forEach(btn => {
      btn.onclick = (e) => {
        const card = e.target.closest('.review-card');
        const reviewId = parseInt(card.dataset.reviewid);
        const review = currentUser.reviews.find(r => r.id === reviewId);
        document.getElementById('reviewText').value = review.text;
        selectedRating = review.rating;
        updateStars();
        editingReviewId = reviewId;
        saveBtn.textContent = 'Atualizar Resenha';
      };
    });
    document.querySelectorAll('.deleteReviewBtn').forEach(btn => {
      btn.onclick = (e) => {
        if (!confirm('Deseja realmente excluir esta resenha?')) return;
        const card = e.target.closest('.review-card');
        const reviewId = parseInt(card.dataset.reviewid);
        currentUser.reviews = currentUser.reviews.filter(r => r.id !== reviewId);
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem(`user-${currentUserCPF}`, JSON.stringify(currentUser));
        renderBookDetails(container, bookId);
      };
    });
  }
  attachReviewEvents();

  // ==============================
  // Lógica de Empréstimo, Devolução, Solicitação e Reserva
  // ==============================
  const solicitarBtn = document.getElementById('solicitarBtn');
  if (solicitarBtn) {
    solicitarBtn.onclick = () => {
      if (!book.queue) book.queue = [];
      book.queue.push(currentUserCPF);
      localStorage.setItem('books', JSON.stringify(books));
      alert('Solicitação de empréstimo enviada! Aguarde a aprovação do administrador.');
      renderBookDetails(container, bookId);
    };
  }

  const reservarBtn = document.getElementById('reservarBtn');
  if (reservarBtn) {
    reservarBtn.onclick = () => {
      if (!book.queue) book.queue = [];
      if (!book.queue.includes(currentUserCPF)) {
        book.queue.push(currentUserCPF);
        localStorage.setItem('books', JSON.stringify(books));
        alert('Você entrou na fila de espera para este livro.');
        renderBookDetails(container, bookId);
      } else {
        alert('Você já está na fila de espera para este livro.');
      }
    };
  }

  const cancelarSolicitacaoBtn = document.getElementById('cancelarSolicitacaoBtn');
  if (cancelarSolicitacaoBtn) {
    cancelarSolicitacaoBtn.onclick = () => {
      if (book.queue) {
        book.queue = book.queue.filter(cpf => cpf !== currentUserCPF);
        localStorage.setItem('books', JSON.stringify(books));
        alert('Sua solicitação/reserva foi cancelada.');
        renderBookDetails(container, bookId);
      }
    };
  }

  const devolverBtn = document.getElementById('devolverBtn');
  if (devolverBtn) {
    devolverBtn.onclick = () => {
      const devolucaoPendentes = JSON.parse(localStorage.getItem('devolucoesPendentes')) || [];
      // Verifica se a devolução já foi solicitada
      if (!devolucaoPendentes.some(d => d.bookId === bookId && d.cpf === currentUserCPF)) {
        devolucaoPendentes.push({ bookId: book.id, cpf: currentUserCPF });
        localStorage.setItem('devolucoesPendentes', JSON.stringify(devolucaoPendentes));
        alert('Solicitação de devolução enviada. Aguarde a aprovação do administrador.');
      }
      renderBookDetails(container, bookId);
    };
  }

  // ==============================
  // Sinopse (código permanece o mesmo)
  // ==============================
  document.getElementById('toggleSynopsisBtn').onclick = () => {
    const synopsis = document.getElementById('synopsis');
    synopsis.classList.toggle('hidden');
    document.getElementById('toggleSynopsisBtn').textContent = synopsis.classList.contains('hidden') ? 'VER SINOPSE' : 'VER MENOS';
  };
  
  // ==============================
  // Favoritar (código permanece o mesmo)
  // ==============================
  document.getElementById('favoriteBtn').onclick = () => {
    const index = currentUser.favorites.indexOf(book.id);
    if (index > -1) {
      currentUser.favorites.splice(index, 1);
      alert('Livro removido dos favoritos!');
    } else {
      currentUser.favorites.push(book.id);
      alert('Livro adicionado aos favoritos!');
    }
    localStorage.setItem('user', JSON.stringify(currentUser));
    localStorage.setItem(`user-${currentUser.cpf}`, JSON.stringify(currentUser));
    renderBookDetails(container, bookId);
  };
  
  // ==============================
  // Adicionar à Prateleira (via Modal) (código permanece o mesmo)
  // ==============================
  const modal = document.getElementById('shelfModal');
  const addShelfBtn = document.getElementById('addShelfBtn');
  const closeBtn = document.querySelector('.close-btn');
  const shelfList = document.getElementById('shelfList');
  const createShelfModalBtn = document.getElementById('createShelfModalBtn');
  addShelfBtn.onclick = () => {
    shelfList.innerHTML = '';
    const allShelves = currentUser.customShelves;
    if (allShelves.length > 0) {
      allShelves.forEach(shelf => {
        const shelfItem = document.createElement('div');
        shelfItem.className = 'shelf-item';
        shelfItem.innerHTML = `<p>${shelf.name}</p><button class="add-to-shelf-btn" data-shelf-name="${shelf.name}">Adicionar</button>`;
        shelfList.appendChild(shelfItem);
      });
    } else {
      shelfList.innerHTML = '<p>Você não tem prateleiras personalizadas. Crie uma!</p>';
    }
    modal.style.display = 'block';
  };
  closeBtn.onclick = () => { modal.style.display = 'none'; };
  window.onclick = (event) => { if (event.target == modal) { modal.style.display = 'none'; } };
  shelfList.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-shelf-btn')) {
      const shelfName = e.target.dataset.shelfName;
      const shelf = currentUser.customShelves.find(s => s.name === shelfName);
      if (shelf && !shelf.books.includes(book.id)) {
        shelf.books.push(book.id);
        localStorage.setItem('user', JSON.stringify(currentUser));
        localStorage.setItem(`user-${currentUser.cpf}`, JSON.stringify(currentUser));
        alert(`Livro adicionado à prateleira "${shelfName}"!`);
        modal.style.display = 'none';
      } else {
        alert('Este livro já está nesta prateleira.');
      }
    }
  });
  createShelfModalBtn.onclick = () => {
    const shelfName = prompt('Qual o nome da nova prateleira?');
    if (shelfName && shelfName.trim() !== '') {
      const existingShelf = currentUser.customShelves.find(s => s.name.toLowerCase() === shelfName.trim().toLowerCase());
      if (existingShelf) {
        alert('Uma prateleira com este nome já existe.');
        return;
      }
      const newShelf = { name: shelfName.trim(), books: [] };
      currentUser.customShelves.push(newShelf);
      localStorage.setItem('user', JSON.stringify(currentUser));
      localStorage.setItem(`user-${currentUser.cpf}`, JSON.stringify(currentUser));
      alert(`Prateleira "${shelfName}" criada com sucesso!`);
      addShelfBtn.click();
    }
  };
  
  // ==============================
  // Voltar
  // ==============================
  document.getElementById('backBtn').onclick = () => navigateTo('books');
}