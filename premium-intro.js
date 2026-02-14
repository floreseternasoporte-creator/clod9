// Versión Premium de la Animación de Introducción
class PremiumIntroAnimation {
  constructor() {
    this.duration = 5000;
    this.init();
  }

  init() {
    if (sessionStorage.getItem('introShown')) {
      this.showMainContent();
      return;
    }

    this.createPremiumIntro();
    this.startPremiumAnimation();
    sessionStorage.setItem('introShown', 'true');
  }

  createPremiumIntro() {
    const introDiv = document.createElement('div');
    introDiv.id = 'premium-intro';
    introDiv.innerHTML = `
      <style>
        #premium-intro {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #10a37f 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          overflow: hidden;
        }

        .premium-logo {
          font-size: 4.5rem;
          font-weight: 900;
          color: white;
          text-shadow: 0 0 30px rgba(255,255,255,0.5);
          opacity: 0;
          transform: scale(0.5) rotateY(90deg);
          animation: logoEntrance 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.5s forwards;
        }

        .premium-tagline {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
          margin-top: 1rem;
          opacity: 0;
          transform: translateY(30px);
          animation: slideUpFade 1s ease-out 1.8s forwards;
        }

        .geometric-shapes {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .shape {
          position: absolute;
          background: rgba(255, 255, 255, 0.1);
          animation: shapeFloat 8s ease-in-out infinite;
        }

        .shape.triangle {
          width: 0;
          height: 0;
          background: transparent;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-bottom: 50px solid rgba(255, 255, 255, 0.1);
        }

        .shape.square {
          width: 40px;
          height: 40px;
          transform: rotate(45deg);
        }

        .shape.circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
        }

        .premium-progress {
          width: 320px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          margin-top: 3rem;
          overflow: hidden;
          opacity: 0;
          animation: slideUpFade 0.8s ease-out 2.5s forwards;
        }

        .premium-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10a37f, #0d8b6f, #ffffff);
          border-radius: 3px;
          width: 0%;
          animation: premiumProgressFill 2.2s ease-out 2.8s forwards;
          box-shadow: 0 0 20px rgba(16, 163, 127, 0.8);
        }

        .loading-indicator {
          display: flex;
          gap: 12px;
          margin-top: 2rem;
          opacity: 0;
          animation: slideUpFade 0.8s ease-out 3s forwards;
        }

        .indicator-dot {
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          animation: dotWave 1.6s ease-in-out infinite;
        }

        .indicator-dot:nth-child(2) { animation-delay: 0.2s; }
        .indicator-dot:nth-child(3) { animation-delay: 0.4s; }
        .indicator-dot:nth-child(4) { animation-delay: 0.6s; }

        .status-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
          margin-top: 1.5rem;
          opacity: 0;
          animation: slideUpFade 0.8s ease-out 3.2s forwards;
          text-align: center;
        }

        @keyframes logoEntrance {
          0% {
            opacity: 0;
            transform: scale(0.5) rotateY(90deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1) rotateY(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateY(0deg);
          }
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shapeFloat {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-30px) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-60px) rotate(180deg);
            opacity: 0.5;
          }
          75% {
            transform: translateY(-30px) rotate(270deg);
            opacity: 0.8;
          }
        }

        @keyframes premiumProgressFill {
          from { width: 0%; }
          to { width: 100%; }
        }

        @keyframes dotWave {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1) translateY(0);
          }
          50% {
            opacity: 1;
            transform: scale(1.3) translateY(-10px);
          }
        }

        .fade-out-premium {
          opacity: 0;
          transform: scale(1.1);
          transition: all 1s ease-out;
        }
      </style>

      <div class="geometric-shapes">
        <div class="shape circle" style="top: 15%; left: 10%; animation-delay: 0s;"></div>
        <div class="shape square" style="top: 25%; right: 15%; animation-delay: 2s;"></div>
        <div class="shape triangle" style="bottom: 30%; left: 20%; animation-delay: 4s;"></div>
        <div class="shape circle" style="top: 60%; right: 25%; animation-delay: 1s;"></div>
        <div class="shape square" style="bottom: 20%; right: 10%; animation-delay: 3s;"></div>
      </div>

      <div class="premium-logo">Zenvio</div>
      <div class="premium-tagline">Tu universo de historias te espera</div>

      <div class="premium-progress">
        <div class="premium-progress-fill"></div>
      </div>

      <div class="loading-indicator">
        <div class="indicator-dot"></div>
        <div class="indicator-dot"></div>
        <div class="indicator-dot"></div>
        <div class="indicator-dot"></div>
      </div>

      <div class="status-text">Creando tu experiencia personalizada...</div>
    `;

    document.body.appendChild(introDiv);
  }

  startPremiumAnimation() {
    const statusText = document.querySelector('.status-text');
    const messages = [
      'Creando tu experiencia personalizada...',
      'Cargando historias increíbles...',
      'Conectando con escritores...',
      'Preparando la magia...',
      '¡Bienvenido a Zenvio!'
    ];

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      if (messageIndex < messages.length - 1) {
        messageIndex++;
        if (statusText) {
          statusText.style.opacity = '0';
          setTimeout(() => {
            statusText.textContent = messages[messageIndex];
            statusText.style.opacity = '1';
          }, 300);
        }
      } else {
        clearInterval(messageInterval);
      }
    }, 800);

    setTimeout(() => {
      this.fadeOutPremium();
    }, this.duration);
  }

  fadeOutPremium() {
    const introElement = document.getElementById('premium-intro');
    if (introElement) {
      introElement.classList.add('fade-out-premium');
      
      setTimeout(() => {
        introElement.remove();
        this.showMainContent();
      }, 1000);
    }
  }

  showMainContent() {
    document.body.style.overflow = 'auto';
    
    // Verificar autenticación y mostrar contenido apropiado
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          this.showApp();
        } else {
          this.showAuth();
        }
      });
    } else {
      // Fallback si Firebase no está disponible
      this.showAuth();
    }
  }

  showApp() {
    const mainApp = document.getElementById('main-app');
    if (mainApp) {
      mainApp.style.display = 'flex';
      setTimeout(() => {
        mainApp.style.transition = 'opacity 0.6s ease-in';
        mainApp.style.opacity = '1';
      }, 100);
    }
  }

  showAuth() {
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.style.display = 'flex';
      setTimeout(() => {
        authForm.style.transition = 'opacity 0.6s ease-in';
        authForm.style.opacity = '1';
      }, 100);
    }
  }
}

// Reemplazar la animación original con la versión premium
document.addEventListener('DOMContentLoaded', () => {
  if (!sessionStorage.getItem('introShown')) {
    new PremiumIntroAnimation();
  } else {
    // Si ya se mostró, mostrar contenido directamente
    document.body.style.overflow = 'auto';
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          const mainApp = document.getElementById('main-app');
          if (mainApp) {
            mainApp.style.display = 'flex';
            mainApp.style.opacity = '1';
          }
        } else {
          const authForm = document.getElementById('auth-form');
          if (authForm) {
            authForm.style.display = 'flex';
            authForm.style.opacity = '1';
          }
        }
      });
    }
  }
});