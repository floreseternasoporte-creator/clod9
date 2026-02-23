// community-firebase.js - Comunidad con Firebase Realtime Database

async function fetchUserProfile(user) {
  try {
    const snap = await firebase.database().ref('users/' + user.uid).once('value');
    const data = snap.val();
    if (data) return data;
  } catch (error) {
    console.warn('No se pudo cargar perfil desde Realtime Database:', error);
  }

  return {
    username: user.displayName || user.email?.split('@')[0] || 'Usuario',
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

  try {
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

    if (response.ok) {
      const data = await response.json();
      if (data.imageUrl) return data.imageUrl;
    }
  } catch (error) {
    console.warn('No se pudo subir imagen por API, se usa base64 en Firebase:', error);
  }

  return imageData;
}

function setPublishButtonState(isLoading) {
  const publishButton = document.getElementById('publish-note-btn') || document.querySelector('button[onclick="publishNote()"]');
  if (!publishButton) return;

  publishButton.disabled = isLoading;
  publishButton.innerHTML = isLoading
    ? '<span class="epic-loader" style="width:20px;height:20px;border-radius:7px;"></span>'
    : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2L11 13"/><path stroke-linecap="round" stroke-linejoin="round" d="M22 2L15 22l-4-9-9-4 20-7z"/></svg>';
}

async function publishNote() {
  const content = document.getElementById('note-content')?.value.trim() || '';
  const imageInput = document.getElementById('note-image');

  if (!content && (!imageInput || !imageInput.files.length)) {
    alert('Por favor escribe algo o agrega una imagen');
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Debes iniciar sesión');
    return;
  }

  setPublishButtonState(true);

  try {
    const userData = await fetchUserProfile(user);
    let imageUrl = '';

    if (imageInput && imageInput.files.length > 0) {
      const file = imageInput.files[0];
      imageUrl = await uploadCommunityImage(file, user.uid);
    }

    const noteData = {
      content,
      authorId: user.uid,
      userId: user.uid,
      authorName: userData.username || userData.name || 'Usuario',
      authorImage: userData.profileImage || 'https://via.placeholder.com/40',
      imageUrl,
      likes: 0,
      likedBy: {},
      timestamp: Date.now()
    };

    let noteId = null;

    // Priorizar API server-side para evitar bloqueos por reglas de Firebase en cliente.
    try {
      const response = await fetch('/api/community-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      });

      if (!response.ok) {
        throw new Error(`API community-notes devolvió ${response.status}`);
      }

      const payload = await response.json();
      noteId = payload?.note?.id || null;
    } catch (apiError) {
      console.warn('No se pudo publicar por API; fallback a Firebase cliente:', apiError);
      const ref = await firebase.database().ref('communityNotes').push(noteData);
      noteId = ref.key;
    }

    if (noteId && typeof moderarContenidoAutomaticamente === 'function') {
      moderarContenidoAutomaticamente(noteId, content);
    }

    const noteContent = document.getElementById('note-content');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');

    if (noteContent) noteContent.value = '';
    if (imageInput) imageInput.value = '';
    if (imagePreview) imagePreview.classList.add('hidden');
    if (previewImg) previewImg.src = '';

    if (typeof updateNoteCharCounter === 'function') updateNoteCharCounter();
    if (typeof switchCommunityTab === 'function') switchCommunityTab('feed');

    loadNotes();
  } catch (error) {
    console.error('Error al publicar en Firebase:', error);
    alert('Error al publicar');
  } finally {
    setPublishButtonState(false);
  }
}

async function loadNotes() {
  const feedContainer = document.getElementById('notes-feed');
  if (!feedContainer) return;

  feedContainer.innerHTML = '<div class="p-4 text-center text-gray-500">Cargando...</div>';

  try {
    let notes = [];

    try {
      const response = await fetch('/api/community-notes?limit=50');
      if (!response.ok) {
        throw new Error(`API community-notes devolvió ${response.status}`);
      }

      const payload = await response.json();
      notes = (payload.notes || []).map(note => ({ ...note, id: note.id || note.noteId, noteId: note.id || note.noteId }));
    } catch (apiError) {
      console.warn('No se pudo cargar feed por API; fallback a Firebase cliente:', apiError);
      const snap = await firebase.database().ref('communityNotes').orderByChild('timestamp').limitToLast(50).once('value');
      snap.forEach(child => notes.push({ id: child.key, noteId: child.key, ...child.val() }));
      notes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

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
          <img src="${note.authorImage || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover" alt="${note.authorName || 'Usuario'}">
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <span class="font-semibold text-sm">${note.authorName || 'Usuario'}</span>
              <span class="text-xs text-gray-500">${timeAgo(note.timestamp || Date.now())}</span>
            </div>
            <p class="text-sm mt-1">${note.content || ''}</p>
            ${note.imageUrl ? `<img src="${note.imageUrl}" class="mt-2 rounded-2xl max-h-96 w-full object-cover" alt="Imagen">` : ''}
            <div class="flex items-center space-x-4 mt-3 text-gray-500">
              <button id="like-btn-${note.id}" onclick="likeNote('${note.id}')" class="flex items-center space-x-1 hover:text-red-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span id="like-count-${note.id}" class="text-sm">${note.likes || 0}</span>
              </button>
            </div>
          </div>
        </div>
      `;
      feedContainer.appendChild(noteCard);
    });
  } catch (error) {
    console.error('Error cargando notas desde Firebase:', error);
    feedContainer.innerHTML = '<div class="p-4 text-center text-red-500">Error al cargar</div>';
  }
}

async function likeNote(noteId) {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert('Debes iniciar sesión');
    return;
  }

  try {
    let updated = null;

    try {
      const response = await fetch('/api/community-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', noteId, userId: user.uid })
      });

      if (!response.ok) {
        throw new Error(`API community-notes devolvió ${response.status}`);
      }

      const payload = await response.json();
      updated = payload.note || null;
    } catch (apiError) {
      console.warn('No se pudo dar like por API; fallback a Firebase cliente:', apiError);
      const noteRef = firebase.database().ref('communityNotes/' + noteId);
      const tx = await noteRef.transaction(note => {
        if (!note) return note;
        if (!note.likedBy) note.likedBy = {};
        if (note.likedBy[user.uid]) return note;
        note.likedBy[user.uid] = true;
        note.likes = (note.likes || 0) + 1;
        return note;
      });

      if (!tx.committed || !tx.snapshot.exists()) return;
      updated = tx.snapshot.val() || {};
    }

    if (!updated) return;

    const likeCount = document.getElementById(`like-count-${noteId}`);
    const likeBtn = document.getElementById(`like-btn-${noteId}`);
    if (likeCount) likeCount.textContent = updated.likes || 0;
    if (likeBtn) {
      likeBtn.style.opacity = '0.6';
      likeBtn.style.pointerEvents = 'none';
    }
  } catch (error) {
    console.error('Error en like Firebase:', error);
  }
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
      const preview = document.getElementById('preview-img');
      const previewWrap = document.getElementById('image-preview');
      if (preview) preview.src = e.target.result;
      if (previewWrap) previewWrap.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

function removeImage() {
  const input = document.getElementById('note-image');
  const preview = document.getElementById('image-preview');
  if (input) input.value = '';
  if (preview) preview.classList.add('hidden');
}

// Cargar notas al abrir la app con sesión activa
document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loadNotes();
    }
  });
});
