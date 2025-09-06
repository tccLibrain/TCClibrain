import { books as initialBooks } from '../data/books.js';
import { navigateTo } from '../main.js';

const livrosPorGenero = {
  "Fantasia":[2,3,8,19],"Mistério":[14],"Romance":[1,7],
  "Clássicos":[4,5,6,9,11,10],"Young Adult":[15,16,17],"Terror":[13],"Ficção Científica":[18]
};

export function renderBookList(container){
  container.innerHTML='';
  let books = JSON.parse(localStorage.getItem('books')) || initialBooks;
  if(!localStorage.getItem('books')) localStorage.setItem('books', JSON.stringify(books));

  const mainEl = document.createElement('div');
  mainEl.style.padding='12px'; mainEl.style.overflowY='auto';
  mainEl.innerHTML=`<div class="search-row"><input id="search-input" placeholder="Pesquisar título ou autor..."><button id="search-clear">✖</button></div>`;
  container.appendChild(mainEl);

  const searchInput=mainEl.querySelector('#search-input');
  const searchClear=mainEl.querySelector('#search-clear');

  function renderSections(allBooks){
    mainEl.querySelectorAll('.genre-section').forEach(s=>s.remove());
    Object.entries(livrosPorGenero).forEach(([genero,ids])=>{
      const livrosDoGenero=ids.map(id=>allBooks.find(b=>b.id===id)).filter(Boolean);
      if(!livrosDoGenero.length) return;

      const section=document.createElement('section'); section.className='genre-section';
      const title=document.createElement('div'); title.className='genre-title'; title.textContent=genero;
      const carousel=document.createElement('div'); carousel.style.display='flex'; carousel.style.gap='12px'; carousel.style.overflowX='auto';

      livrosDoGenero.forEach(book=>{
        const card=document.createElement('div'); card.style.flex='0 0 auto'; card.style.width='110px'; card.style.cursor='pointer';
        card.innerHTML=`<img src="${book.cover||''}" style="width:100px;height:140px;object-fit:cover;border-radius:6px;"><div style="font-size:12px;margin-top:8px;text-align:center;">${book.title}</div>`;
        card.addEventListener('click',()=>navigateTo('details',{bookId:book.id}));
        carousel.appendChild(card);
      });

      section.appendChild(title); section.appendChild(carousel); mainEl.appendChild(section);
    });
  }

  renderSections(books);

  function doSearch(){
    const q=(searchInput.value||'').trim().toLowerCase();
    renderSections(q?books.filter(b=>(b.title+' '+(b.author||'')).toLowerCase().includes(q)):books);
  }

  searchInput.addEventListener('input',doSearch);
  searchClear.addEventListener('click',()=>{ searchInput.value=''; doSearch(); });
}
