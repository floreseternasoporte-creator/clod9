// search-firebase.js - Búsqueda con Firebase

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
    if (!query.length) {
      clearSearchResults();
      loadPopularStories();
    }
    return;
  }

  if (query.length > 0) {
    searchContent(query);
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
}

async function getAllStories() {
  if (typeof window.loadStoriesFromAWS === 'function') {
    try {
      const stories = await window.loadStoriesFromAWS();
      if (Array.isArray(stories) && stories.length) {
        return stories;
      }
    } catch (error) {
      console.error('Error loading stories from AWS helper:', error);
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
    console.error('Error loading stories from AWS:', error);
    return [];
  }
}

async function searchContent(query) {
  const lowerQuery = query.toLowerCase();
  
  // Buscar historias
  try {
    const stories = await getAllStories();
    const storiesContainer = document.getElementById('search-books-carousel');
    storiesContainer.innerHTML = '';
    
    let foundStories = 0;
    stories.forEach(story => {
      const title = (story.title || '').toLowerCase();
      const author = (story.username || story.authorName || '').toLowerCase();
      
      if (title.includes(lowerQuery) || author.includes(lowerQuery)) {
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
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error('No se pudieron cargar autores');
    }
    const data = await response.json();
    const users = data.users || [];
    const authorsContainer = document.getElementById('search-authors-list');
    authorsContainer.innerHTML = '';

    let foundAuthors = 0;
    users.forEach((user) => {
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();

      if (username.includes(lowerQuery) || email.includes(lowerQuery)) {
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
