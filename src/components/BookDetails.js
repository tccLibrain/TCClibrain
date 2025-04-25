import { books as initialBooks } from '../data/books.js';

export function renderBookDetails(container, bookId) {
  const books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  const book = books.find(b => b.id === bookId);
  const user = JSON.parse(localStorage.getItem('user'));

  if (!book) {
    container.innerHTML = '<p>Livro não encontrado.</p>';
    return;
  }

  // Garante que a fila exista
  book.queue = book.queue || [];

  // Carregar comentários do localStorage
  const savedReviews = JSON.parse(localStorage.getItem(`reviews-${bookId}`)) || [];
  book.reviews = savedReviews;

  const isAvailable = book.available;
  const isInQueue = book.queue.includes(user?.cpf);

  const emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
  const jaEmprestado = emprestimos.some(e => e.cpf === user?.cpf && e.titulo === book.title);

  const reviewsHtml = book.reviews.length
    ? book.reviews.map(r => `
        <div style="margin-bottom: 8px;">
          <strong>${r.user}</strong> - ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}<br />
          ${r.comment}
        </div>
      `).join('')
    : '<p>Sem resenhas ainda.</p>';

  container.innerHTML = `
    <h2>${book.title}</h2>
    <p><em>Autor:</em> ${book.author}</p>
    <p><strong>Sinopse:</strong> ${book.synopsis}</p>
    <p>Status: ${isAvailable ? 'Disponível' : 'Emprestado até ' + book.returnDate}</p>

    <h3>Resenhas</h3>
    ${reviewsHtml}

    <div id="action-section"></div>

    <h3>Escreva uma resenha</h3>
    <form id="review-form">
      <label for="rating">Nota (1-5):</label><br />
      <input type="range" min="1" max="5" value="3" id="rating" /><span id="rating-value">3</span><br /><br />
      <textarea id="comment" rows="4" cols="40" placeholder="O que achou do livro?" required></textarea><br />
      <button type="submit">Enviar comentário</button>
    </form>

    <br />
    <button onclick="navigateTo('books')">Voltar</button>
  `;

  const ratingInput = container.querySelector('#rating');
  const ratingValueSpan = container.querySelector('#rating-value');
  ratingInput.oninput = () => {
    ratingValueSpan.textContent = ratingInput.value;
  };

  container.querySelector('#review-form').onsubmit = (e) => {
    e.preventDefault();
    const rating = parseInt(ratingInput.value);
    const comment = container.querySelector('#comment').value.trim();

    if (!comment) {
      alert('Escreva um comentário.');
      return;
    }

    const newReview = {
      user: user?.nome || 'Anônimo',
      rating,
      comment
    };

    book.reviews.push(newReview);
    localStorage.setItem(`reviews-${bookId}`, JSON.stringify(book.reviews));

    alert('Comentário enviado!');
    navigateTo('details', { bookId });
  };

  const actionSection = document.getElementById('action-section');

  if (isAvailable && !jaEmprestado) {
    const btn = document.createElement('button');
    btn.textContent = 'Reservar';
    btn.onclick = () => {
      book.available = false;
      book.returnDate = gerarDataDevolucao();

      const emprestimos = JSON.parse(localStorage.getItem('emprestimos')) || [];
      emprestimos.push({
        cpf: user?.cpf,
        titulo: book.title,
        prazo: book.returnDate
      });
      localStorage.setItem('emprestimos', JSON.stringify(emprestimos));
      localStorage.setItem('books', JSON.stringify(books));

      alert('Livro reservado com sucesso!');
      navigateTo('books');
    };
    actionSection.appendChild(btn);
  } else if (!isInQueue && book.queue.length < 2 && !jaEmprestado) {
    const btn = document.createElement('button');
    btn.textContent = 'Entrar na fila de espera';
    btn.onclick = () => {
      book.queue.push(user?.cpf);

      const reservas = JSON.parse(localStorage.getItem('reservas')) || [];
      reservas.push({
        cpf: user?.cpf,
        titulo: book.title,
        posicao: book.queue.length
      });
      localStorage.setItem('reservas', JSON.stringify(reservas));
      localStorage.setItem('books', JSON.stringify(books));

      alert('Você entrou na fila de espera.');
      navigateTo('books');
    };
    actionSection.appendChild(btn);
  } else if (isInQueue) {
    actionSection.innerHTML = '<p>Você já está na fila de espera.</p>';
  } else if (jaEmprestado) {
    actionSection.innerHTML = '<p>Você já tem este livro emprestado.</p>';
  }
}

function gerarDataDevolucao() {
  const hoje = new Date();
  hoje.setDate(hoje.getDate() + 7);
  return hoje.toISOString().split('T')[0];
}
