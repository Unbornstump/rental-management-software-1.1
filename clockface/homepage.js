const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  setupDotGridAnimation();
  setupTypewriterEffect();
  setupFeatureCardAnimations();
});

function setupEventListeners() {
  const getStartedBtn = document.getElementById('get-started-btn');
  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      ipcRenderer.send('open-login-window');
    });
  }

  const settingsGear = document.getElementById('settings-gear');
  if (settingsGear) {
    settingsGear.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSettingsPopover();
    });
  }

  const settingsModal = document.getElementById('settings-modal');
  const settingsPopover = document.getElementById('settings-popover');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsPopover();
      }
    });
  }
  if (settingsPopover) {
    settingsPopover.addEventListener('click', (e) => e.stopPropagation());
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-toggle-btn');
      if (!btn) return;
      setTheme(btn.dataset.theme);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettingsPopover();
    }
  });
}

function loadSettings() {
  const theme = localStorage.getItem('theme') || 'light';
  setTheme(theme, false);
}

function setTheme(theme, persist = true) {
  document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  if (persist) {
    localStorage.setItem('theme', theme);
  }
}

function toggleSettingsPopover() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  modal.classList.toggle('visible');
}

function closeSettingsPopover() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.remove('visible');
  }
}

function setupDotGridAnimation() {
  const hero = document.querySelector('.hero-section');
  if (!hero) return;

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    hero.style.setProperty('--mouse-x', x + 'px');
    hero.style.setProperty('--mouse-y', y + 'px');
  });
}

function setupTypewriterEffect() {
  const description = document.querySelector('.hero-description');
  if (!description) return;

  const rawText = description.dataset.typewriterText || '';
  const lines = rawText.split('\n');
  description.textContent = '';

  setTimeout(() => {
    let lineIndex = 0;
    let charIndex = 0;

    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    cursor.textContent = '|';
    description.appendChild(cursor);

    function typeChar() {
      if (lineIndex >= lines.length) {
        cursor.remove();
        return;
      }

      const line = lines[lineIndex];
      if (charIndex < line.length) {
        cursor.insertAdjacentText('beforebegin', line.charAt(charIndex));
        charIndex++;
        setTimeout(typeChar, 40);
        return;
      }

      lineIndex++;
      charIndex = 0;
      if (lineIndex < lines.length) {
        const br = document.createElement('br');
        cursor.before(br);
        setTimeout(typeChar, 40);
      } else {
        cursor.remove();
      }
    }

    typeChar();
  }, 400);
}

function setupFeatureCardAnimations() {
  const featureCards = document.querySelectorAll('.feature-card');
  if (featureCards.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const cardIndex = Array.from(featureCards).indexOf(entry.target);
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, cardIndex * 120);
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.1
  });

  featureCards.forEach((card) => {
    observer.observe(card);
  });
}
