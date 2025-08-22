import { books as initialBooks } from '../data/books.js';
import { navigateTo } from '../main.js';

// Defina os gêneros de cada livro (você pode expandir conforme quiser)
const livrosPorGenero = {
  "Romance": [1, 7], // IDs do books.js
  "Fantasia": [2, 3, 8, 19],
  "Clássicos": [4, 5, 6, 9, 11, 10],
  "Young Adult": [15, 16, 17],
  "Terror": [13],
  "Mistério": [14],
  "Ficção Científica": [18],
};

export function renderBookList(container) {
  const books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  localStorage.setItem('books', JSON.stringify(books));

  container.innerHTML = '';

  // Criar cada carrossel por gênero
  Object.entries(livrosPorGenero).forEach(([genero, ids]) => {
    const section = document.createElement('div');
    section.className = 'genre-section';

    const title = document.createElement('h2');
    title.textContent = genero;
    section.appendChild(title);

    const carousel = document.createElement('div');
    carousel.className = 'carousel';

    ids.forEach(id => {
      const book = books.find(b => b.id === id);
      if (!book) return;

      const card = document.createElement('div');
      card.className = 'book-card';
      card.innerHTML = `
        <img src="${book.cover}" alt="${book.title}" class="book-cover"/>
        <h3 class="book-title">${book.title}</h3>
      `;
      card.addEventListener('click', () => {
        navigateTo('details', { bookId: book.id });
      });
      carousel.appendChild(card);
    });

    section.appendChild(carousel);
    container.appendChild(section);
  });

  // Estilos do carrossel
  const style = document.createElement('style');
  style.textContent = `
    .genre-section {
      margin-bottom: 40px;
    }

    .genre-section h2 {
      margin-left: 20px;
      color: #fff;
      font-size: 1.5rem;
    }

    .carousel {
      display: flex;
      overflow-x: auto;
      gap: 16px;
      padding: 10px 20px;
      scroll-behavior: smooth;
    }

    .carousel::-webkit-scrollbar {
      height: 8px;
    }

    .carousel::-webkit-scrollbar-thumb {
      background: #444;
      border-radius: 4px;
    }

    .book-card {
      flex: 0 0 auto;
      width: 140px;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .book-card:hover {
      transform: scale(1.1);
    }

    .book-cover {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.5);
    }

    .book-title {
      font-size: 0.9rem;
      color: #fff;
      text-align: center;
      margin-top: 6px;
    }

    body {
      background-color: #111;
      font-family: 'Segoe UI', sans-serif;
      color: #fff;
    }
  `;
  container.appendChild(style);
}
