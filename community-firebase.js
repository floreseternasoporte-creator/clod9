// community-firebase.js - Comunidad con AWS (auth en Firebase)

async function fetchUserProfile(user) {
  try {
    const response = await fetch(`/api/users?userId=${user.uid}`);
    if (response.ok) {
      const data = await response.json();
      return data.user || null;
    }
  } catch (error) {
    console.warn('No se pudo cargar perfil desde AWS:', error);
  }

  const fallbackName = user.displayName || user.email?.split('@')[0] || 'Usuario';
  return {
    userId: user.uid,
    username: fallbackName,
    profileImage: user.photoURL || 'https://via.placeholder.com/40'
  };
}

async function uploadCommunityImage(file, userId) {
  const reader = new FileReader();
  const imageData = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageData,
      fileName: file.name,
      userId,
      timestamp: Date.now(),
      contentType: file.type || 'image/jpeg',
      imageType: 'community'
    })
  });

  if (!response.ok) {
    throw new Error('No se pudo subir la imagen');
  }

  const data = await response.json();
  return data.imageUrl;
}

async function publishNote() {
  const content = document.getElementById('note-content').value.trim();
  const imageInput = document.getElementById('note-image');
  
  if (!content && !imageInput.files.length) {
    alert('Por favor escribe algo o agrega una imagen');
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Debes iniciar sesión');
    return;
  }

  const publishButton = document.querySelector('button[onclick="publishNote()"]');
  publishButton.disabled = true;
  publishButton.textContent = 'Publicando...';

  try {
    const userData = await fetchUserProfile(user);
    let imageUrl = null;

    if (imageInput.files.length > 0) {
      const file = imageInput.files[0];
      imageUrl = await uploadCommunityImage(file, user.uid);
    }

    const noteData = {
      content,
      userId: user.uid,
      authorName: userData.username || 'Usuario',
      authorImage: userData.profileImage || 'https://via.placeholder.com/40',
      imageUrl
    };

    const response = await fetch('/api/community-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });

    if (!response.ok) {
      throw new Error('No se pudo guardar la nota');
    }
    
    document.getElementById('note-content').value = '';
    imageInput.value = '';
    document.getElementById('image-preview').classList.add('hidden');
    switchCommunityTab('feed');
    publishButton.disabled = false;
    publishButton.textContent = 'Publicar';
    
    loadNotes();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al publicar');
    publishButton.disabled = false;
    publishButton.textContent = 'Publicar';
  }
}

async function loadNotes() {
  const feedContainer = document.getElementById('notes-feed');
  feedContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Cargando...</div>';

  try {
    const response = await fetch('/api/community-notes?limit=50');
    if (!response.ok) {
      throw new Error('No se pudieron cargar las notas');
    }
    const data = await response.json();
    const notes = data.notes || [];
    feedContainer.innerHTML = '';

    if (notes.length === 0) {
      feedContainer.innerHTML = '<div class="p-8 text-center text-gray-500">No hay publicaciones aún</div>';
      return;
    }

    notes.forEach(note => {
      const noteCard = document.createElement('div');
      noteCard.className = 'p-4 hover:bg-gray-50 transition-colors';
      noteCard.innerHTML = `
        <div class="flex items-start space-x-3">
          <img src="${note.authorImage}" class="w-10 h-10 rounded-full object-cover" alt="${note.authorName}">
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <span class="font-semibold text-sm">${note.authorName}</span>
              <span class="text-xs text-gray-500">${timeAgo(note.timestamp)}</span>
            </div>
            <p class="text-sm mt-1">${note.content}</p>
            ${note.imageUrl ? `<img src="${note.imageUrl}" class="mt-2 rounded-2xl max-h-96 w-full object-cover" alt="Imagen">` : ''}
            <div class="flex items-center space-x-4 mt-3 text-gray-500">
              <button onclick="likeNote('${note.id}')" class="flex items-center space-x-1 hover:text-red-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span class="text-sm">${note.likes || 0}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      feedContainer.appendChild(noteCard);
    });
  } catch (error) {
    console.error('Error:', error);
    feedContainer.innerHTML = '<div class="p-4 text-center text-red-500">Error al cargar</div>';
  }
}

async function likeNote(noteId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Debes iniciar sesión');
    return;
  }
  
  const response = await fetch('/api/community-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like', noteId })
  });

  if (!response.ok) {
    alert('No se pudo registrar el like');
    return;
  }

  loadNotes();
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + 'm';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.floor(hours / 24);
  return days + 'd';
}

function handleNoteImagePreview(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('preview-img').src = e.target.result;
      document.getElementById('image-preview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function removeImage() {
  document.getElementById('note-image').value = '';
  document.getElementById('image-preview').classList.add('hidden');
}

// Cargar notas al abrir comunidad
document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loadNotes();
    }
  });
});
