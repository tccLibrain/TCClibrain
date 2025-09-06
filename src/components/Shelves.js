import { navigateTo } from '../main.js';
import { books as initialBooks } from '../data/books.js';

export function renderShelves(container) {
  // Limpa o container antes de renderizar
  container.innerHTML = '';

  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('Usuário não logado.');
    navigateTo('login');
    return;
  }

  // Inicializa as prateleiras se elas não existirem
  if (!user.favorites) {
    user.favorites = [];
  }
  if (!user.customShelves) {
    user.customShelves = [];
  }
  
  // Salva o usuário atualizado no localStorage
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem(`user-${user.cpf}`, JSON.stringify(user));

  const allBooks = JSON.parse(localStorage.getItem('books')) || initialBooks;

  // Filtra os livros reservados ou em lista de espera pelo usuário
  const reservedBooks = allBooks.filter(book => 
    book.requestedBy === user.cpf || (book.waitlist && book.waitlist.includes(user.cpf))
  );

  // Filtra os livros favoritos do usuário
  const favoriteBooks = allBooks.filter(book => user.favorites.includes(book.id));

  // Função para renderizar uma prateleira de livros
  const renderShelf = (shelfName, booksArray) => {
    return `
      <div class="shelf-card">
        <h3>${shelfName}</h3>
        <div class="book-list">
          ${booksArray.length > 0 ? booksArray.map(book => `
            <div class="book-card-small">
              <img src="${book.cover}" alt="${book.title}" data-book-id="${book.id}">
              <p>${book.title}</p>
            </div>
          `).join('') : '<p>Nenhum livro nesta prateleira.</p>'}
        </div>
      </div>
    `;
  };

  // Renderiza o HTML da página
  container.innerHTML = `
    <style>
      .page-header {
        text-align: center;
        margin-bottom: 20px;
      }
      .shelf-card {
        background-color: #f0f0f0;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }
      .shelf-card h3 {
        margin-top: 0;
        border-bottom: 2px solid #ccc;
        padding-bottom: 5px;
      }
      .book-list {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
      }
      .book-card-small {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        width: 100px;
        cursor: pointer;
      }
      .book-card-small img {
        width: 80px;
        height: 120px;
        object-fit: cover;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }
      .book-card-small p {
        margin: 5px 0 0;
        font-size: 0.8em;
      }
      .create-shelf-container {
        text-align: center;
        margin-bottom: 30px;
      }
      #createShelfBtn {
        padding: 10px 20px;
        font-size: 1em;
      }
      .custom-shelf-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 10px;
      }
      .custom-shelf-actions button {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.9em;
        color: #555;
      }
    </style>

    <div class="page-header">
      <h2>Minhas Prateleiras</h2>
    </div>

    ${renderShelf('⭐ Favoritos', favoriteBooks)}
    ${renderShelf('🗓️ Reservados', reservedBooks)}

    <div class="create-shelf-container">
      <button id="createShelfBtn" class="btn">Criar Nova Prateleira</button>
    </div>

    <div id="customShelvesContainer">
      ${user.customShelves.length > 0 ? user.customShelves.map(shelf => `
        <div class="shelf-card" data-shelf-name="${shelf.name}">
          <h3>${shelf.name}</h3>
          <div class="book-list">
            ${shelf.books.length > 0 ? shelf.books.map(bookId => {
              const book = allBooks.find(b => b.id === bookId);
              return book ? `
                <div class="book-card-small">
                  <img src="${book.cover}" alt="${book.title}" data-book-id="${book.id}">
                  <p>${book.title}</p>
                </div>
              ` : '';
            }).join('') : '<p>Nenhum livro nesta prateleira. Adicione um!</p>'}
          </div>
          <div class="custom-shelf-actions">
            <button class="delete-shelf-btn" data-shelf-name="${shelf.name}">Excluir Prateleira</button>
          </div>
        </div>
      `).join('') : ''}
    </div>
  `;

  // Lógica para criar uma nova prateleira
  document.getElementById('createShelfBtn').addEventListener('click', () => {
    const shelfName = prompt('Qual o nome da nova prateleira?');
    if (shelfName && shelfName.trim() !== '') {
      const existingShelf = user.customShelves.find(s => s.name.toLowerCase() === shelfName.trim().toLowerCase());
      if (existingShelf) {
        alert('Uma prateleira com este nome já existe.');
        return;
      }

      const newShelf = {
        name: shelfName.trim(),
        books: []
      };
      user.customShelves.push(newShelf);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem(`user-${user.cpf}`, JSON.stringify(user));
      renderShelves(container);
    }
  });

  // Lógica para excluir uma prateleira
  container.querySelectorAll('.delete-shelf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const shelfNameToDelete = e.target.dataset.shelfName;
      if (confirm(`Tem certeza que deseja excluir a prateleira "${shelfNameToDelete}"?`)) {
        user.customShelves = user.customShelves.filter(s => s.name !== shelfNameToDelete);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem(`user-${user.cpf}`, JSON.stringify(user));
        renderShelves(container);
      }
    });
  });

  // Evento de clique **UNIFICADO** para navegar para os detalhes do livro
  // Isso usa delegação de eventos para garantir que funcione em todos os livros
  container.addEventListener('click', (e) => {
    const clickedImage = e.target.closest('.book-card-small img');
    if (clickedImage) {
      const bookId = clickedImage.dataset.bookId;
      if (bookId) {
        navigateTo('details', { bookId: bookId });
      }
    }
  });
// Evento de clique **UNIFICADO** para navegar para os detalhes do livro
  // Isso usa delegação de eventos para garantir que funcione em todos os livros
  container.addEventListener('click', (e) => {
    // 1. Verifique se o evento de clique está sendo capturado
    console.log("Clique detectado!", e.target);

    const clickedImage = e.target.closest('.book-card-small img');
    
    // 2. Verifique se o elemento clicado é a imagem do livro
    if (clickedImage) {
      console.log("Elemento clicado é uma imagem de livro!");
      const bookId = clickedImage.dataset.bookId;

      // 3. Verifique se o ID do livro foi encontrado
      console.log("ID do livro encontrado:", bookId);

      if (bookId) {
        navigateTo('details', { bookId: bookId });
      } else {
        console.error("ID do livro não foi encontrado. Verifique o atributo data-book-id.");
      }
    } else {
      console.log("Clique em um elemento que não é uma imagem de livro.");
    }
  });
}