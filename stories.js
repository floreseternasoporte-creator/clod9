
// js/stories.js - Historias con AWS (auth en Firebase)

document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const storiesApi = '/api/get-stories';
    const uploadStoryApi = '/api/upload-story';
    const deleteStoryApi = '/api/delete-story';
    const updateStoryApi = '/api/update-story';

    const storiesContainer = document.getElementById('stories');
    const storyViewer = document.getElementById('story-viewer');
    const storyUploadModal = document.getElementById('story-upload-modal');

    // Event Listeners
    document.getElementById('add-story-btn').addEventListener('click', () => {
        storyUploadModal.classList.add('active');
    });

    document.getElementById('story-upload-back').addEventListener('click', () => {
        storyUploadModal.classList.remove('active');
        resetUploadForm();
    });

    document.getElementById('story-file').addEventListener('change', handleFileSelect);
    document.getElementById('story-upload-form').addEventListener('submit', handleStoryUpload);
    document.getElementById('story-viewer-close').addEventListener('click', closeStoryViewer);

    setTimeout(() => loadStories(), 500);
    setInterval(() => loadStories(), 30000);

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.querySelector('.story-upload-preview');
                const previewImg = preview.querySelector('img');
                previewImg.src = event.target.result;
                preview.style.display = 'block';
                document.querySelector('.file-input-label').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    function resetUploadForm() {
        document.getElementById('story-upload-form').reset();
        document.querySelector('.story-upload-preview').style.display = 'none';
        document.querySelector('.file-input-label').style.display = 'flex';
        const progressDiv = document.querySelector('.upload-progress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
            progressDiv.querySelector('.progress-bar').style.width = '0%';
        }
    }

    async function loadStories() {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setTimeout(loadStories, 1000);
            return;
        }

        try {
            const response = await fetch(storiesApi);
            if (!response.ok) {
                throw new Error('No se pudieron cargar las historias');
            }
            const data = await response.json();
            const stories = data.stories || [];

            storiesContainer.innerHTML = '';

            if (stories.length > 0) {
                const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
                const recentStories = stories.filter(story => story.timestamp > twelveHoursAgo);

                // Eliminar historias viejas
                const oldStories = stories.filter(story => story.timestamp <= twelveHoursAgo);
                await Promise.all(
                    oldStories.map((story) =>
                        fetch(deleteStoryApi, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ storyId: story.id })
                        }).catch((err) => console.log('Error deleting old story:', err))
                    )
                );

                // Agrupar por usuario
                const storiesByUser = {};
                recentStories.forEach(story => {
                    if (!storiesByUser[story.userId]) {
                        storiesByUser[story.userId] = [];
                    }
                    storiesByUser[story.userId].push(story);
                });

                for (const userId in storiesByUser) {
                    const userStories = storiesByUser[userId];
                    if (userStories.length > 0) {
                        const latestStory = userStories[0];
                        const storyElement = createStoryElement(latestStory, userId);
                        if (storyElement) {
                            storiesContainer.appendChild(storyElement);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error loading stories:', error);
        }
    }

    function createStoryElement(storyData, userId) {
        const storyDiv = document.createElement('div');
        storyDiv.className = 'flex flex-col items-center flex-shrink-0 cursor-pointer';
        
        // Usar username, nunca email, y saltar si es anónimo
        let displayName = storyData.username || storyData.email?.split('@')[0] || '';
        
        // No mostrar historias anónimas
        if (!displayName || displayName.toLowerCase() === 'anónimo' || displayName.toLowerCase() === 'anonimo') {
            return null;
        }
        
        storyDiv.innerHTML = `
            <div class="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 p-0.5">
                <div class="w-full h-full rounded-full border-2 border-white overflow-hidden">
                    <img src="${storyData.coverImage || 'https://via.placeholder.com/150'}" alt="${displayName}" class="w-full h-full object-cover">
                </div>
            </div>
            <span class="text-xs mt-1 text-gray-900 font-medium max-w-[64px] truncate">${displayName}</span>
        `;
        storyDiv.addEventListener('click', () => openStoryViewer(userId));
        return storyDiv;
    }

    function handleStoryUpload(e) {
        e.preventDefault();
        const file = document.getElementById('story-file').files[0];
        if (!file) {
            alert('Por favor selecciona una imagen para tu relato');
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("Debes iniciar sesión para publicar un relato.");
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publicando...';

        const progressDiv = document.querySelector('.upload-progress');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const progressText = progressDiv.querySelector('.progress-text');
        progressDiv.style.display = 'block';

        progressText.textContent = 'Subiendo...';
        progressBar.style.width = '30%';

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const coverImageData = reader.result;
                const response = await fetch(uploadStoryApi, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.uid,
                        username: currentUser.displayName || currentUser.email.split('@')[0],
                        email: currentUser.email,
                        coverImageData,
                        coverImageFileName: file.name,
                        coverImageContentType: file.type || 'image/jpeg'
                    })
                });

                if (!response.ok) {
                    throw new Error('No se pudo publicar el relato');
                }

                progressBar.style.width = '100%';
                progressText.textContent = '¡Relato publicado!';

                setTimeout(() => {
                    storyUploadModal.classList.remove('active');
                    resetUploadForm();
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Publicar Relato';
                    loadStories();
                }, 500);
            } catch (error) {
                console.error("Error al publicar relato:", error);
                alert('Error al publicar la nota. Por favor intenta de nuevo.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publicar Relato';
                progressDiv.style.display = 'none';
            }
        };
        reader.onerror = () => {
            alert('No se pudo leer la imagen.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publicar Relato';
            progressDiv.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async function openStoryViewer(userId) {
        try {
            const response = await fetch(`${storiesApi}?userId=${encodeURIComponent(userId)}`);
            if (!response.ok) {
                throw new Error('No se pudieron cargar las historias');
            }
            const data = await response.json();
            const stories = data.stories || [];
            
            if (stories.length === 0) return;

            const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
            const recentStories = stories.filter(story => story.timestamp > twelveHoursAgo);
            
            if (recentStories.length === 0) return;

            const storyContent = document.querySelector('.story-content');
            storyContent.innerHTML = '';
            recentStories.sort((a, b) => a.timestamp - b.timestamp);
            
            let currentStoryIndex = 0;
            const currentUser = auth.currentUser;

            function showStory(index) {
                const story = recentStories[index];

                // Incrementar vistas
                if (currentUser && currentUser.uid !== userId) {
                    const nextViews = (story.views || 0) + 1;
                    story.views = nextViews;
                    fetch(updateStoryApi, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ storyId: story.id, updates: { views: nextViews } })
                    }).catch((error) => console.warn('No se pudo actualizar vistas:', error));
                }

                const displayName = story.username || story.email?.split('@')[0] || 'Usuario';
                
                storyContent.innerHTML = `
                    <div class="story-header">
                        <div class="story-progress-container">
                            ${recentStories.map((_, i) => `<div class="story-progress"><div class="story-progress-bar" style="width: ${i < index ? '100%' : (i === index ? '0%' : '0%')}"></div></div>`).join('')}
                        </div>
                        <div class="story-user-info">
                            <span class="username">${displayName}</span>
                        </div>
                    </div>
                    <div class="story-top-controls">
                        <button class="story-close">×</button>
                        ${currentUser && currentUser.uid === userId ? `
                            <div class="story-options" data-story-id="${story.id}">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                    <circle cx="12" cy="5" r="2"/>
                                    <circle cx="12" cy="12" r="2"/>
                                    <circle cx="12" cy="19" r="2"/>
                                </svg>
                            </div>
                        ` : ''}
                    </div>
                    <img src="${story.coverImage}" class="story-image">
                    <div class="story-footer">
                        <div class="story-views">${story.views || 0} vistas</div>
                    </div>
                `;

                const progressBar = storyContent.querySelectorAll('.story-progress-bar')[index];
                setTimeout(() => progressBar.style.width = '100%', 100);

                storyContent.querySelector('.story-close').addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeStoryViewer();
                });

                const optionsButton = storyContent.querySelector('.story-options');
                if (optionsButton) {
                    optionsButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const storyIdToDelete = e.currentTarget.dataset.storyId;
                        
                        const menu = document.createElement('div');
                        menu.className = 'story-options-menu';
                        menu.innerHTML = `<button class="delete-option"><i class="fas fa-trash-alt"></i><span>Eliminar historia</span></button>`;
                        document.body.appendChild(menu);
                        setTimeout(() => menu.classList.add('active'), 10);
                        
                        menu.querySelector('.delete-option').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            menu.remove();
                            await deleteStory(storyIdToDelete);
                        });
                    });
                }

                setTimeout(() => {
                    if (currentStoryIndex < recentStories.length - 1) {
                        currentStoryIndex++;
                        showStory(currentStoryIndex);
                    } else {
                        closeStoryViewer();
                    }
                }, 5000);
            }

            showStory(currentStoryIndex);
            storyViewer.classList.add('active');
        } catch (error) {
            console.error('Error opening story viewer:', error);
        }
    }

    async function deleteStory(storyId) {
        try {
            const response = await fetch(deleteStoryApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId })
            });
            if (!response.ok) {
                throw new Error('No se pudo eliminar la historia');
            }
            closeStoryViewer();
            loadStories();
        } catch (error) {
            console.error("Error deleting story:", error);
            alert('Error al eliminar la historia');
        }
    }

    function closeStoryViewer() {
        storyViewer.classList.remove('active');
    }
});
