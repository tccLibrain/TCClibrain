import { books as initialBooks } from '../data/books.js';
import { navigateTo } from '../main.js';

export function renderBookDetails(container, bookId) {
  const books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  const book = books.find(b => b.id === bookId);
  const currentUserCPF = localStorage.getItem('currentUser');
  const currentUserData = JSON.parse(localStorage.getItem(`user-${currentUserCPF}`));

  if (!book || !currentUserData) {
    container.innerHTML = '<p>Livro não encontrado ou usuário não logado.</p>';
    return;
  }

  const savedRating = localStorage.getItem(`rating-${currentUserCPF}-${bookId}`) || 0;

  // Buscar todas as resenhas deste livro (de todos os usuários)
  const allReviews = [];
  for (let key in localStorage) {
    if (key.startsWith('user-')) {
      const userData = JSON.parse(localStorage.getItem(key));
      if (userData.reviews) {
        const userReviews = userData.reviews.filter(r => r.bookId === bookId);
        userReviews.forEach(r => {
          allReviews.push({ user: userData.name, text: r.text, date: r.date, cpf: userData.cpf });
        });
      }
    }
  }

  // Verifica se este usuário já fez resenha para este livro
  const userReview = currentUserData.reviews.find(r => r.bookId === bookId);

  container.innerHTML = `
    <div class="book-details">
      <div class="book-header">
        <img src="${book.cover}" class="book-cover-large"/>
        <h2>${book.title}</h2>
        <p>${book.author}</p>
      </div>

      <div class="rating-section">
        <p>NOTA:</p>
        <div id="stars" class="stars">
          ${[1, 2, 3, 4, 5].map(i => `
            <span class="star ${i <= savedRating ? 'filled' : ''}" data-value="${i}">&#9733;</span>
          `).join('')}
        </div>
        <p id="rating-value">${savedRating}</p>
      </div>

      <div class="review-section">
        <h3>Escreva uma resenha:</h3>
        <textarea id="reviewText" rows="4" placeholder="Digite sua opinião...">${userReview ? userReview.text : ''}</textarea>
        <button id="saveReviewBtn" class="btn">${userReview ? 'Atualizar Resenha' : 'Salvar Resenha'}</button>
        <div id="reviewsList">
          <h3>Resenhas:</h3>
          ${allReviews.length ? allReviews.map(r => `
            <div class="review-card">
              <strong>${r.user}</strong> <em>(${r.date})</em>
              <p>${r.text}</p>
            </div>
          `).join('') : '<p>Nenhuma resenha ainda.</p>'}
        </div>
      </div>

      <div class="loan-reserve-section">
        <h3>Status:</h3>
        <p id="statusText">${book.loanedTo ? `Emprestado para ${book.loanedTo}` : 'Disponível'}</p>
        <button id="loanBtn" class="btn">${book.loanedTo === currentUserCPF ? 'Devolver' : 'Emprestar'}</button>
        <button id="reserveBtn" class="btn" ${book.loanedTo && book.loanedTo !== currentUserCPF ? '' : 'disabled'}>
          Reservar
        </button>
        ${book.reservedBy ? `<p>Reservado por: ${book.reservedBy}</p>` : ''}
      </div>

      <div class="synopsis-section">
        <button id="toggleSynopsisBtn" class="btn">VER SINOPSE</button>
        <p id="synopsis" class="hidden">${book.synopsis || 'Sem sinopse disponível.'}</p>
      </div>

      <button id="addShelfBtn" class="btn">ADICIONAR À UMA PRATELEIRA</button>
      <button id="backBtn" class="btn-secondary">Voltar</button>
    </div>
  `;

  // ⭐ Avaliação
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const value = star.dataset.value;
      localStorage.setItem(`rating-${currentUserCPF}-${bookId}`, value);
      document.getElementById('rating-value').textContent = value;
      document.querySelectorAll('.star').forEach(s => s.classList.remove('filled'));
      for (let i = 0; i < value; i++) {
        document.querySelectorAll('.star')[i].classList.add('filled');
      }
    });
  });

  // Salvar/Atualizar resenha
  document.getElementById('saveReviewBtn').onclick = () => {
    const text = document.getElementById('reviewText').value.trim();
    if (!text) {
      alert('Escreva algo antes de salvar!');
      return;
    }

    const date = new Date().toLocaleString('pt-BR');

    if (userReview) {
      // Atualiza resenha existente
      userReview.text = text;
      userReview.date = date;
    } else {
      // Adiciona nova resenha
      currentUserData.reviews.push({ bookId, text, date });
    }

    localStorage.setItem(`user-${currentUserCPF}`, JSON.stringify(currentUserData));
    alert('Resenha salva!');
    renderBookDetails(container, bookId);
  };

  // Emprestar / Devolver
  document.getElementById('loanBtn').onclick = () => {
    if (!book.loanedTo || book.loanedTo === currentUserCPF) {
      if (book.loanedTo === currentUserCPF) {
        delete book.loanedTo;
        alert('Livro devolvido!');
      } else {
        book.loanedTo = currentUserCPF;
        alert('Você pegou este livro emprestado!');
      }
      localStorage.setItem('books', JSON.stringify(books));
      renderBookDetails(container, bookId);
    } else {
      alert('Este livro já está emprestado.');
    }
  };

  // Reservar
  document.getElementById('reserveBtn').onclick = () => {
    if (!book.reservedBy && book.loanedTo && book.loanedTo !== currentUserCPF) {
      book.reservedBy = currentUserCPF;
      localStorage.setItem('books', JSON.stringify(books));
      alert('Livro reservado!');
      renderBookDetails(container, bookId);
    } else {
      alert('Não é possível reservar agora.');
    }
  };

  // Mostrar/Ocultar sinopse
  document.getElementById('toggleSynopsisBtn').onclick = () => {
    const synopsis = document.getElementById('synopsis');
    if (synopsis.classList.contains('hidden')) {
      synopsis.classList.remove('hidden');
      document.getElementById('toggleSynopsisBtn').textContent = 'VER MENOS';
    } else {
      synopsis.classList.add('hidden');
      document.getElementById('toggleSynopsisBtn').textContent = 'VER SINOPSE';
    }
  };

  // Adicionar à prateleira
  document.getElementById('addShelfBtn').onclick = () => {
    alert('Livro adicionado à prateleira!');
  };

  // Voltar
  document.getElementById('backBtn').onclick = () => {
    navigateTo('books');
  };
}
