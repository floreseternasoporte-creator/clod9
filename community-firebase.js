// community-firebase.js - Comunidad con Firebase Realtime Database

const communityHashtagStats = new Map();
let hashtagListenerInitialized = false;

const extractHashtags = (text) => {
  const tags = String(text || '').toLowerCase().match(/#[\p{L}0-9_]+/gu) || [];
  return Array.from(new Set(tags)).slice(0, 12);
};

const formatCompactCount = (value) => {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getHashtagUsageLabel = (tag) => {
  const stats = communityHashtagStats.get(String(tag || '').toLowerCase());
  const total = Number(stats?.count || 0);
  if (total <= 0) return '0 usos';
  return `${formatCompactCount(total)} usos`;
};

function renderDetectedHashtags() {
  const input = document.getElementById('note-content');
  const preview = document.getElementById('note-hashtag-preview');
  if (!preview || !input) return;

  const tags = extractHashtags(input.value || '');
  if (!tags.length) {
    preview.classList.add('hidden');
    preview.innerHTML = '';
    return;
  }

  preview.classList.remove('hidden');
  preview.innerHTML = tags.map((tag) => `
    <div class="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50">
      <p class="text-sm font-semibold text-[#00A2FF]">${escapeHtml(tag)}</p>
      <p class="text-xs text-gray-500">${getHashtagUsageLabel(tag)}</p>
    </div>
  `).join('');
}

function syncCommunityHashtagsRealtime() {
  if (hashtagListenerInitialized) return;
  hashtagListenerInitialized = true;

  firebase.database().ref('community_hashtags').on('value', (snapshot) => {
    communityHashtagStats.clear();
    snapshot.forEach((child) => {
      const row = child.val() || {};
      const tag = String(row.tag || decodeURIComponent(child.key || '') || '').toLowerCase();
      if (!tag) return;
      communityHashtagStats.set(tag, {
        count: Number(row.count || 0),
        usersCount: Number(row.usersCount || 0),
        lastUsedAt: Number(row.lastUsedAt || 0)
      });
    });

    renderDetectedHashtags();
    if (typeof loadNotes === 'function') loadNotes();
  });
}

async function registerCommunityHashtagsUsage(userId, hashtags) {
  if (!userId || !Array.isArray(hashtags) || hashtags.length === 0) return;

  await Promise.all(hashtags.map((tagRaw) => {
    const tag = String(tagRaw || '').toLowerCase();
    if (!tag.startsWith('#')) return Promise.resolve();

    const ref = firebase.database().ref(`community_hashtags/${encodeURIComponent(tag)}`);
    return ref.transaction((current) => {
      const next = current || { tag, count: 0, usersCount: 0, users: {}, lastUsedAt: 0 };
      const users = { ...(next.users || {}) };
      const isNewUser = !users[userId];
      users[userId] = true;
      return {
        ...next,
        tag,
        count: Number(next.count || 0) + 1,
        usersCount: Number(next.usersCount || 0) + (isNewUser ? 1 : 0),
        users,
        lastUsedAt: Date.now()
      };
    });
  }));
}

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

async function fetchFirebaseNotes(path, limit = 50) {
  const notes = [];
  const snap = await firebase.database().ref(path).orderByChild('timestamp').limitToLast(limit).once('value');
  snap.forEach(child => notes.push({ id: child.key, noteId: child.key, ...child.val() }));
  return notes;
}

function normalizeNoteShape(note) {
  return {
    ...note,
    id: note.id || note.noteId,
    noteId: note.id || note.noteId,
    userId: note.userId || note.authorId,
    authorId: note.authorId || note.userId,
    hashtags: Array.isArray(note.hashtags) ? note.hashtags : extractHashtags(note.content || '')
  };
}

function mergeNotesDedup(notes) {
  const map = new Map();
  notes.forEach(raw => {
    const note = normalizeNoteShape(raw);
    if (!note.id) return;

    const current = map.get(note.id);
    if (!current || Number(note.timestamp || 0) >= Number(current.timestamp || 0)) {
      map.set(note.id, note);
    }
  });

  return Array.from(map.values()).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
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

    const hashtags = extractHashtags(content);

    const noteData = {
      content,
      authorId: user.uid,
      userId: user.uid,
      authorName: userData.username || userData.name || 'Usuario',
      authorImage: userData.profileImage || 'https://via.placeholder.com/40',
      imageUrl,
      likes: 0,
      likedBy: {},
      hashtags,
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
      // Guardar en snake_case para alinearse con API y también espejar en camelCase para compatibilidad.
      const ref = await firebase.database().ref('community_notes').push(noteData);
      await firebase.database().ref(`communityNotes/${ref.key}`).set(noteData);
      noteId = ref.key;
    }

    if (noteId && typeof moderarContenidoAutomaticamente === 'function') {
      moderarContenidoAutomaticamente(noteId, content);
    }

    await registerCommunityHashtagsUsage(user.uid, hashtags).catch((error) => {
      console.warn('No se pudo registrar hashtags en tiempo real:', error);
    });

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
      notes = (payload.notes || []).map(normalizeNoteShape);

      // Evitar lecturas extra pesadas cuando la API ya devolvió suficientes datos.
      if (notes.length === 0) {
        const [snakeCaseNotes, camelCaseNotes] = await Promise.all([
          fetchFirebaseNotes('community_notes', 50).catch(() => []),
          fetchFirebaseNotes('communityNotes', 50).catch(() => [])
        ]);

        notes = mergeNotesDedup([...notes, ...snakeCaseNotes, ...camelCaseNotes]);
      } else {
        notes = mergeNotesDedup(notes);
      }
    } catch (apiError) {
      console.warn('No se pudo cargar feed por API; fallback a Firebase cliente:', apiError);
      const [snakeCaseNotes, camelCaseNotes] = await Promise.all([
        fetchFirebaseNotes('community_notes', 50).catch(() => []),
        fetchFirebaseNotes('communityNotes', 50).catch(() => [])
      ]);
      notes = mergeNotesDedup([...snakeCaseNotes, ...camelCaseNotes]);
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
            <p class="text-sm mt-1">${escapeHtml(note.content || '')}</p>
            ${(note.hashtags || []).length ? `<div class="mt-2 flex flex-wrap gap-2">${(note.hashtags || []).map((tag) => `<div class="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200"><p class="text-xs font-semibold text-[#00A2FF]">${escapeHtml(tag)}</p><p class="text-[11px] text-gray-500">${getHashtagUsageLabel(tag)}</p></div>`).join('')}</div>` : ''}
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

      const runLikeTransaction = async (path) => {
        const tx = await firebase.database().ref(path + '/' + noteId).transaction(note => {
          if (!note) return note;
          if (!note.likedBy) note.likedBy = {};
          if (note.likedBy[user.uid]) return note;
          note.likedBy[user.uid] = true;
          note.likes = (note.likes || 0) + 1;
          return note;
        });
        if (!tx.committed || !tx.snapshot.exists()) return null;
        return tx.snapshot.val() || null;
      };

      updated = await runLikeTransaction('community_notes');
      if (!updated) {
        updated = await runLikeTransaction('communityNotes');
      }
      if (!updated) return;
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
  const noteInput = document.getElementById('note-content');
  if (noteInput) noteInput.addEventListener('input', renderDetectedHashtags);

  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      syncCommunityHashtagsRealtime();
      loadNotes();
    }
  });
});
