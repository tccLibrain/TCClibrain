import { books as initialBooks } from '../data/books.js';
import { navigateTo } from '../main.js';

export function renderBookDetails(container, bookId) {
  const books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  const book = books.find(b => b.id === bookId);

  if (!book) {
    container.innerHTML = '<p>Livro não encontrado.</p>';
    return;
  }

  container.innerHTML = `
    <div class="book-details">
      <img src="${book.cover}" class="book-cover-large"/>
      <h2>${book.title}</h2>
      <p><strong>Autor:</strong> ${book.author}</p>
      <p><strong>Status:</strong> ${book.available ? 'Disponível' : 'Emprestado'}</p>

      <button id="borrowBtn">Emprestar</button>
      <button id="returnBtn">Devolver</button>
      <textarea id="reviewInput" placeholder="Escreva sua resenha..."></textarea>
      <button id="saveReviewBtn">Salvar Resenha</button>
      <button id="backBtn">Voltar</button>
    </div>
  `;

  document.getElementById('borrowBtn').onclick = () => {
    if (book.available) {
      book.available = false;
      localStorage.setItem('books', JSON.stringify(books));
      renderBookDetails(container, bookId);
      alert('Livro emprestado!');
    } else alert('Livro já está emprestado.');
  };

  document.getElementById('returnBtn').onclick = () => {
    if (!book.available) {
      book.available = true;
      localStorage.setItem('books', JSON.stringify(books));
      renderBookDetails(container, bookId);
      alert('Livro devolvido!');
    } else alert('Livro já está disponível.');
  };

  document.getElementById('saveReviewBtn').onclick = () => {
    const review = document.getElementById('reviewInput').value;
    if (!review.trim()) return alert('Escreva algo antes de salvar.');
    const reviews = JSON.parse(localStorage.getItem(`reviews-${bookId}`)) || [];
    reviews.push(review);
    localStorage.setItem(`reviews-${bookId}`, JSON.stringify(reviews));
    document.getElementById('reviewInput').value = '';
    alert('Resenha salva!');
  };

  document.getElementById('backBtn').onclick = () => {
    navigateTo('books');
  };
}
