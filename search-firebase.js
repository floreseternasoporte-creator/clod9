// search-firebase.js - Búsqueda con Firebase

function normalizeSearchTerm(value) {
  return String(value || '').trim().toLowerCase().replace(/^@+/, '');
}

function handleSearchInput() {
  const query = document.getElementById('search-input').value.trim();
  const clearBtn = document.getElementById('clear-search-btn');
  
  if (query.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }

  if (typeof window.performRealTimeSearch === 'function') {
    window.performRealTimeSearch();
    if (query.length > 0) {
      searchInfoContent(query);
    } else {
      renderSearchInfoList([]);
    }
    if (!query.length) {
      clearSearchResults();
      loadPopularStories();
    }
    return;
  }

  if (query.length > 0) {
    searchContent(query);
    searchInfoContent(query);
  } else {
    clearSearchResults();
    loadPopularStories();
  }
}

function clearSearchInput() {
  document.getElementById('search-input').value = '';
  document.getElementById('clear-search-btn').classList.add('hidden');
  clearSearchResults();
  loadPopularStories();
}

function clearSearchResults() {
  document.getElementById('search-books-carousel').innerHTML = '';
  document.getElementById('search-authors-list').innerHTML = '';
  const infoList = document.getElementById('search-info-list');
  if (infoList) infoList.innerHTML = '';
}

function detectWikipediaEntertainmentType(text) {
  const normalized = (text || '').toLowerCase();

  const seriesKeywords = ['serie', 'series', 'tv series', 'television series', 'temporada', 'episodio', 'anime'];
  if (seriesKeywords.some(k => normalized.includes(k))) return 'Serie';

  const movieKeywords = ['película', 'pelicula', 'film', 'movie', 'cine', 'largometraje'];
  if (movieKeywords.some(k => normalized.includes(k))) return 'Película';

  const bookKeywords = ['libro', 'novela', 'book', 'author', 'autor', 'escritor', 'literatura'];
  if (bookKeywords.some(k => normalized.includes(k))) return 'Libro';

  return null;
}

function renderSearchInfoList(items) {
  const infoList = document.getElementById('search-info-list');
  if (!infoList) return;

  if (!items || items.length === 0) {
    infoList.innerHTML = '<div class="text-center text-gray-500 py-8">Escribe algo para que Baro te responda con información precisa.</div>';
    return;
  }

  const item = items[0];
  const isXuaProfile = (item?.title || '').toLowerCase() === 'xua xia';
  const showIdentityTags = Boolean(item?.title || item?.isVerified || item?.founderLabel);
  const verifiedBadge = item?.isVerified
    ? `<span class="inline-flex items-center justify-center w-4 h-4 rounded-full ${isXuaProfile ? 'bg-pink-500 shadow-[0_0_0_3px_rgba(244,114,182,0.18)]' : 'bg-[#1d9bf0]'} text-white text-[10px] font-bold" title="Verified profile">✓</span>`
    : '';
  const founderBadge = item?.founderLabel
    ? `<span class="inline-flex items-center rounded-full ${isXuaProfile ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-[#f1f5f9] text-[#0f172a]'} text-[10px] font-semibold px-2 py-0.5">${item.founderLabel}</span>`
    : '';
  const cardClasses = isXuaProfile
    ? 'relative overflow-hidden bg-gradient-to-br from-[#fff1f7] via-white to-[#ffe4ef] border border-pink-200 rounded-2xl p-4 shadow-[0_10px_30px_rgba(236,72,153,0.18)]'
    : 'bg-white border border-[#e6e6e6] rounded-2xl p-4 shadow-sm';
  const responseLabel = isXuaProfile ? 'Valentine Special' : 'Respuesta de IA';
  const separatorClass = isXuaProfile ? 'border-pink-200/70' : 'border-[#e6e6e6]';
  const footerTextClass = isXuaProfile ? 'text-pink-600' : 'text-gray-500';
  const romanticDecor = isXuaProfile
    ? `<div class="pointer-events-none absolute inset-0"><span class="absolute top-3 right-4 text-pink-300 text-lg">❤</span><span class="absolute bottom-3 left-4 text-pink-200 text-xl">❤</span></div>`
    : '';

  infoList.innerHTML = `
    <article class="${cardClasses}"> 
      ${romanticDecor}
      <div class="relative flex items-start gap-3">
        <img src="https://i.ibb.co/21fZ5Wkp/IMG-7701.png" alt="Baro" class="w-9 h-9 rounded-full flex-shrink-0">
        <div class="min-w-0 w-full">
          <p class="text-[11px] font-semibold tracking-wide uppercase ${isXuaProfile ? 'text-pink-500' : 'text-gray-500'} mb-2">${responseLabel}</p>
          ${showIdentityTags ? `
            <div class="mb-2 flex flex-wrap items-center gap-2">
              ${item?.title ? `<span class="text-sm font-semibold ${isXuaProfile ? 'text-pink-700' : 'text-[#111111]'}">${item.title}</span>` : ''}
              ${verifiedBadge}
              ${founderBadge}
            </div>
          ` : ''}
          <p id="search-info-typed-text" class="text-sm ${isXuaProfile ? 'text-pink-900' : 'text-[#111111]'} leading-relaxed"></p>
          <div class="mt-3 pt-3 border-t ${separatorClass} flex items-center gap-2">
            <img src="https://i.ibb.co/21fZ5Wkp/IMG-7701.png" alt="Baro" class="w-4 h-4 rounded-full">
            <span class="text-[11px] ${footerTextClass}">Generado por Baro</span>
          </div>
        </div>
      </div>
    </article>
  `;

  const typedText = document.getElementById('search-info-typed-text');
  if (!typedText) return;

  const fullText = item.summary || '';
  let charIndex = 0;

  return new Promise(resolve => {
    const typeInterval = setInterval(() => {
      charIndex += 1;
      typedText.textContent = fullText.slice(0, charIndex);

      if (charIndex >= fullText.length) {
        clearInterval(typeInterval);
        resolve();
      }
    }, 18);
  });
}

function renderSearchInfoLoading() {
  const infoList = document.getElementById('search-info-list');
  if (!infoList) return;

  infoList.innerHTML = `
    <article class="bg-white border border-[#e6e6e6] rounded-2xl p-4 shadow-sm">
      <div class="flex items-center gap-3">
        <img src="https://i.ibb.co/21fZ5Wkp/IMG-7701.png" alt="Baro" class="w-9 h-9 rounded-full flex-shrink-0">
        <div class="w-full">
          <p class="text-[11px] font-semibold tracking-wide uppercase text-gray-500 mb-2">Baro está pensando</p>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-gray-500/70 animate-bounce" style="animation-delay:0ms"></span>
            <span class="w-2 h-2 rounded-full bg-gray-500/70 animate-bounce" style="animation-delay:140ms"></span>
            <span class="w-2 h-2 rounded-full bg-gray-500/70 animate-bounce" style="animation-delay:280ms"></span>
          </div>
        </div>
      </div>
    </article>
  `;
}

async function searchInfoContent(query) {
  const cleanQuery = (query || '').trim();
  const normalizedQuery = cleanQuery.toLowerCase();

  if (normalizedQuery.includes('darel vega')) {
    await renderSearchInfoList([
      {
        title: 'Darel Vega',
        isVerified: true,
        founderLabel: 'Founder · CEO',
        summary: 'Darel Vega is the current founder and CEO of Baro and Atenis. He was born in Cuba.'
      }
    ]);
    return;
  }

  if (normalizedQuery.includes('xua xia')) {
    await renderSearchInfoList([
      {
        title: 'Xua Xia',
        isVerified: true,
        founderLabel: 'Co-founder · CEO',
        summary: 'Xua Xia is the co-founder and CEO, and Darel Vega\'s girlfriend. She is from China.'
      }
    ]);
    return;
  }

  if (cleanQuery.length < 3) {
    renderSearchInfoList([]);
    return;
  }

  renderSearchInfoLoading();

  const languages = ['es', 'en'];
  let selectedResult = null;

  for (const lang of languages) {
    try {
      const openSearchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=1&namespace=0&format=json&origin=*`;
      const openSearchResponse = await fetch(openSearchUrl);
      if (!openSearchResponse.ok) continue;

      const openSearchData = await openSearchResponse.json();
      const bestTitle = openSearchData?.[1]?.[0];
      if (!bestTitle) continue;

      const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
      const summaryResponse = await fetch(summaryUrl);
      if (!summaryResponse.ok) continue;

      const summaryData = await summaryResponse.json();
      const extract = (summaryData?.extract || '').trim();
      if (extract.length < 40) continue;

      selectedResult = {
        title: summaryData?.title || bestTitle,
        summary: extract.length > 280 ? `${extract.slice(0, 280)}...` : extract
      };
      break;
    } catch (error) {
      continue;
    }
  }

  if (!selectedResult) {
    await renderSearchInfoList([{ summary: 'No encontré una respuesta clara en Wikipedia para esa búsqueda. Intenta con otro término más específico.' }]);
    return;
  }

  await renderSearchInfoList([selectedResult]);
}

async function getAllStories() {
  if (typeof window.loadStoriesFromFirebase === 'function') {
    try {
      const stories = await window.loadStoriesFromFirebase();
      if (Array.isArray(stories) && stories.length) {
        return stories;
      }
    } catch (error) {
      console.error('Error loading stories from Firebase helper:', error);
    }
  }

  try {
    const response = await fetch('/api/get-stories');
    if (!response.ok) {
      throw new Error('No se pudo cargar historias');
    }
    const data = await response.json();
    return data.stories || [];
  } catch (error) {
    console.error('Error loading stories from Firebase:', error);
    return [];
  }
}

async function searchContent(query) {
  const lowerQuery = normalizeSearchTerm(query);
  
  // Buscar historias
  try {
    const stories = await getAllStories();
    const storiesContainer = document.getElementById('search-books-carousel');
    storiesContainer.innerHTML = '';
    
    let foundStories = 0;
    stories.forEach(story => {
      const title = normalizeSearchTerm(story.title || '');
      const author = normalizeSearchTerm(story.username || story.authorName || story.author || '');
      const synopsis = normalizeSearchTerm(story.synopsis || '');
      
      if (title.includes(lowerQuery) || author.includes(lowerQuery) || synopsis.includes(lowerQuery)) {
        const storyCard = document.createElement('div');
        storyCard.className = 'cursor-pointer';
        storyCard.innerHTML = `
          <img src="${story.coverImage || 'https://via.placeholder.com/150'}" 
               class="w-full aspect-[3/4] object-cover rounded-lg" 
               alt="${story.title || 'Historia'}">
        `;
        storyCard.onclick = () => openStoryDetail(story);
        storiesContainer.appendChild(storyCard);
        foundStories++;
      }
    });
    
    if (foundStories === 0) {
      storiesContainer.innerHTML = '<div class="col-span-3 text-center text-gray-500 py-8">No se encontraron historias</div>';
    }
  } catch (error) {
    console.error('Error buscando historias:', error);
  }
  
  // Buscar autores
  try {
    const response = await fetch(`/api/users?q=${encodeURIComponent(query)}&limit=30`);
    if (!response.ok) {
      throw new Error('No se pudieron cargar autores');
    }
    const data = await response.json();
    const users = data.users || [];
    const authorsContainer = document.getElementById('search-authors-list');
    authorsContainer.innerHTML = '';

    let foundAuthors = 0;
    users.forEach((user) => {
      const username = normalizeSearchTerm(user.username || '');
      const name = normalizeSearchTerm(user.name || user.displayName || '');
      const email = normalizeSearchTerm(user.email || '');

      if (username.includes(lowerQuery) || name.includes(lowerQuery) || email.includes(lowerQuery)) {
        const authorCard = document.createElement('div');
        authorCard.className = 'flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer';
        authorCard.innerHTML = `
          <img src="${user.profileImage || 'https://via.placeholder.com/40'}"
               class="w-12 h-12 rounded-full object-cover"
               alt="${user.username}">
          <div class="flex-1">
            <p class="font-semibold text-sm">${user.username || 'Usuario'}</p>
            <p class="text-xs text-gray-500">@${user.username || 'usuario'}</p>
          </div>
          <button onclick="followUser('${user.userId}')" class="px-4 py-1.5 bg-[#00A2FF] text-white text-sm font-semibold rounded-full hover:bg-[#0066CC]">
            Seguir
          </button>
        `;
        authorCard.onclick = (e) => {
          if (!e.target.closest('button')) {
            openAuthorProfile(user.userId);
          }
        };
        authorsContainer.appendChild(authorCard);
        foundAuthors++;
      }
    });

    if (foundAuthors === 0) {
      authorsContainer.innerHTML = '<div class="text-center text-gray-500 py-8">No se encontraron autores</div>';
    }
  } catch (error) {
    console.error('Error buscando autores:', error);
  }
}

async function followUser(userId) {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    alert('Debes iniciar sesión');
    return;
  }
  
  try {
    const response = await fetch('/api/following', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        targetUserId: userId,
        action: 'follow'
      })
    });
    if (!response.ok) {
      throw new Error('No se pudo seguir');
    }
    alert('Ahora sigues a este usuario');
  } catch (error) {
    console.error('Error:', error);
    alert('Error al seguir usuario');
  }
}

// Cargar historias populares al abrir búsqueda
async function loadPopularStories() {
  try {
    const stories = await getAllStories();
    const storiesContainer = document.getElementById('search-books-carousel');
    storiesContainer.innerHTML = '';
    
    stories
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 12)
      .forEach(story => {
        const storyCard = document.createElement('div');
        storyCard.className = 'cursor-pointer';
        storyCard.innerHTML = `
          <img src="${story.coverImage || 'https://via.placeholder.com/150'}" 
               class="w-full aspect-[3/4] object-cover rounded-lg" 
               alt="${story.title || 'Historia'}">
        `;
        storyCard.onclick = () => openStoryDetail(story);
        storiesContainer.appendChild(storyCard);
      });
  } catch (error) {
    console.error('Error:', error);
  }
}

// Cargar al abrir búsqueda
document.addEventListener('DOMContentLoaded', () => {
  const searchView = document.getElementById('search-view');
  if (searchView) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (!searchView.classList.contains('hidden')) {
          loadPopularStories();
        }
      });
    });
    observer.observe(searchView, { attributes: true, attributeFilter: ['class'] });
  }
});
