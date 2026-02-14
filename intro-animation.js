// Animación de Introducción Moderna - JavaScript
class IntroAnimation {
  constructor() {
    this.duration = 4500; // Duración total en milisegundos
    this.hasShown = false;
    this.init();
  }

  init() {
    // Verificar si ya se mostró la animación en esta sesión
    if (sessionStorage.getItem('introShown')) {
      return;
    }

    this.createIntroHTML();
    this.startAnimation();
    sessionStorage.setItem('introShown', 'true');
  }

  createIntroHTML() {
    const introDiv = document.createElement('div');
    introDiv.id = 'intro-animation';
    introDiv.innerHTML = `
      <!-- Elementos flotantes de fondo -->
      <div class="floating-elements">
        <div class="floating-circle"></div>
        <div class="floating-circle"></div>
        <div class="floating-circle"></div>
        <div class="floating-circle"></div>
      </div>

      <!-- Partículas flotantes -->
      <div class="particles">
        ${this.generateParticles()}
      </div>

      <!-- Efecto de ondas -->
      <div class="wave-effect"></div>

      <!-- Contenido principal -->
      <div class="intro-logo">BeaBoo</div>
      <div class="intro-subtitle">
        Descubre historias increíbles y conecta con una comunidad de escritores apasionados
      </div>

      <!-- Barra de progreso -->
      <div class="progress-container">
        <div class="progress-bar"></div>
      </div>

      <!-- Puntos de carga -->
      <div class="loading-dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>

      <!-- Texto de carga -->
      <div class="loading-text">Preparando tu experiencia...</div>
    `;

    document.body.appendChild(introDiv);
  }

  generateParticles() {
    let particles = '';
    for (let i = 0; i < 20; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      particles += `<div class="particle" style="left: ${left}%; animation-delay: ${delay}s;"></div>`;
    }
    return particles;
  }

  startAnimation() {
    const introElement = document.getElementById('intro-animation');
    
    // Simular carga de contenido
    setTimeout(() => {
      this.updateLoadingText('Cargando historias...');
    }, 1000);

    setTimeout(() => {
      this.updateLoadingText('Conectando con la comunidad...');
    }, 2000);

    setTimeout(() => {
      this.updateLoadingText('¡Casi listo!');
    }, 3000);

    // Finalizar animación
    setTimeout(() => {
      this.fadeOut();
    }, this.duration);
  }

  updateLoadingText(text) {
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.style.opacity = '0';
      setTimeout(() => {
        loadingText.textContent = text;
        loadingText.style.opacity = '1';
      }, 200);
    }
  }

  fadeOut() {
    const introElement = document.getElementById('intro-animation');
    if (introElement) {
      introElement.classList.add('fade-out');
      
      // Remover elemento después de la transición
      setTimeout(() => {
        introElement.remove();
        this.onComplete();
      }, 800);
    }
  }

  onComplete() {
    // Restaurar el scroll del body
    document.body.style.overflow = 'auto';
    
    // Verificar el estado de autenticación
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // Usuario autenticado - mostrar la aplicación principal
        const mainApp = document.getElementById('main-app');
        if (mainApp) {
          mainApp.style.display = 'flex';
          setTimeout(() => {
            mainApp.style.transition = 'opacity 0.5s ease-in';
            mainApp.style.opacity = '1';
          }, 100);
        }
      } else {
        // Usuario no autenticado - mostrar formulario de login
        const authForm = document.getElementById('auth-form');
        if (authForm) {
          authForm.style.display = 'flex';
          setTimeout(() => {
            authForm.style.transition = 'opacity 0.5s ease-in';
            authForm.style.opacity = '1';
          }, 100);
        }
      }
    });

    // Disparar evento personalizado para otros scripts
    window.dispatchEvent(new CustomEvent('introAnimationComplete'));
  }

  // Método para saltar la animación (opcional)
  skip() {
    this.fadeOut();
  }
}

// Inicializar la animación cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  // Solo mostrar la animación en la primera carga
  if (!sessionStorage.getItem('introShown')) {
    new IntroAnimation();
  }
});

// Función global para saltar la animación (opcional)
window.skipIntro = function() {
  const introElement = document.getElementById('intro-animation');
  if (introElement) {
    introElement.classList.add('fade-out');
    setTimeout(() => {
      introElement.remove();
    }, 300);
  }
};