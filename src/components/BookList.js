import { navigateTo } from '../main.js';

export async function renderBookList(container) {
    container.innerHTML = '';

    let books = [];
    try {
        const response = await fetch('http://localhost:3000/api/books', {
            credentials: 'include'
        });
        if (response.ok) {
            books = await response.json();
        } else {
            console.error('Falha ao carregar livros:', response.statusText);
            container.innerHTML = '<p>Erro ao carregar a lista de livros.</p>';
            return;
        }
    } catch (error) {
        console.error('Erro de rede:', error);
        container.innerHTML = '<p>Não foi possível conectar ao servidor.</p>';
        return;
    }

    const mainEl = document.createElement('div');
    mainEl.style.padding = '12px';
    mainEl.style.overflowY = 'auto';
    mainEl.innerHTML = `<div class="search-row"><input id="search-input" placeholder="Pesquisar título ou autor..."><button id="search-clear">✖</button></div>`;
    container.appendChild(mainEl);

    const searchInput = mainEl.querySelector('#search-input');
    const searchClear = mainEl.querySelector('#search-clear');

    function renderSections(allBooks) {
        mainEl.querySelectorAll('.genre-section').forEach(s => s.remove());

        // ESTA É A VERSÃO CORRETA que cria a lista de gêneros dinamicamente
        const livrosPorGenero = allBooks.reduce((acc, book) => {
            if (book.genre) {
                if (!acc[book.genre]) {
                    acc[book.genre] = [];
                }
                acc[book.genre].push(book);
            }
            return acc;
        }, {});

        Object.entries(livrosPorGenero).forEach(([genero, livrosDoGenero]) => {
            if (!livrosDoGenero.length) return;

            const section = document.createElement('section');
            section.className = 'genre-section';
            const title = document.createElement('div');
            title.className = 'genre-title';
            title.textContent = genero;
            const carousel = document.createElement('div');
            carousel.style.display = 'flex';
            carousel.style.gap = '12px';
            carousel.style.overflowX = 'auto';

            livrosDoGenero.forEach(book => {
                const card = document.createElement('div');
                card.style.flex = '0 0 auto';
                card.style.width = '110px';
                card.style.cursor = 'pointer';
                card.innerHTML = `<img src="${book.cover || ''}" style="width:100px;height:140px;object-fit:cover;border-radius:6px;"><div style="font-size:12px;margin-top:8px;text-align:center;">${book.title}</div>`;
                
                // Esta é a linha que faz o clique funcionar
                card.addEventListener('click', () => navigateTo('details', { bookId: book.id }));

                carousel.appendChild(card);
            });

            section.appendChild(title);
            section.appendChild(carousel);
            mainEl.appendChild(section);
        });
    }

    renderSections(books);

    function doSearch() {
        const q = (searchInput.value || '').trim().toLowerCase();
        renderSections(q ? books.filter(b => (b.title + ' ' + (b.author || '')).toLowerCase().includes(q)) : books);
    }

    searchInput.addEventListener('input', doSearch);
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        doSearch();
    });
}