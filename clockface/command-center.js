// Command Center Module
// Handles the centralized navigation overlay for Admin and Treasury

const CommandCenter = {
  isOpen: false,

  init() {
    const hamburgerBtn = document.getElementById('command-center-btn');
    const overlay = document.getElementById('command-center-overlay');
    const backdrop = document.getElementById('command-center-backdrop');
    const adminDoor = document.getElementById('admin-door-btn');
    const treasuryDoor = document.getElementById('treasury-door-btn');

    if (!hamburgerBtn || !overlay) return;

    // Toggle overlay open/close
    hamburgerBtn.addEventListener('click', () => {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    });

    // Magnetic hover effect for Dynamic Island
    this.initMagneticEffect(hamburgerBtn);

    // Ripple effect for doors
    if (adminDoor) {
      this.initRippleEffect(adminDoor);
      adminDoor.addEventListener('click', () => {
        this.close();
        this.navigateToAdmin();
      });
    }

    if (treasuryDoor) {
      this.initRippleEffect(treasuryDoor);
      treasuryDoor.addEventListener('click', () => {
        this.close();
        this.navigateToTreasury();
      });
    }

    // Close on backdrop click
    if (backdrop) {
      backdrop.addEventListener('click', () => this.close());
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Scroll behavior for Dynamic Island
    this.initScrollBehavior();
  },

  initMagneticEffect(element) {
    element.addEventListener('mousemove', (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const moveX = x * 0.3;
      const moveY = y * 0.3;
      
      element.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.06)`;
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = '';
    });
  },

  initRippleEffect(element) {
    element.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        background: rgba(212, 175, 55, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        width: 100px;
        height: 100px;
        left: ${x - 50}px;
        top: ${y - 50}px;
      `;
      
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  },

  initScrollBehavior() {
    const navBtn = document.getElementById('command-center-btn');
    const contentArea = document.querySelector('.content-area');
    
    if (!navBtn || !contentArea) return;

    let scrollTimeout;
    let isScrolling = false;

    contentArea.addEventListener('scroll', () => {
      if (!isScrolling) {
        navBtn.classList.add('scrolled');
        isScrolling = true;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        navBtn.classList.remove('scrolled');
        isScrolling = false;
      }, 150);
    });
  },

  open() {
    const overlay = document.getElementById('command-center-overlay');
    const navBtn = document.getElementById('command-center-btn');
    if (overlay) {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      this.isOpen = true;
    }
    if (navBtn) {
      navBtn.classList.add('active');
    }
  },

  close() {
    const overlay = document.getElementById('command-center-overlay');
    const navBtn = document.getElementById('command-center-btn');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      this.isOpen = false;
    }
    if (navBtn) {
      navBtn.classList.remove('active');
    }
  },

  navigateToAdmin() {
    AppState.clearPropertyContext();
    PageLoaders.navigate('admin-hub');
  },

  navigateToTreasury() {
    AppState.clearPropertyContext();
    PageLoaders.navigate('treasury');
  },

  navigateToFinancials() {
    // Alias for backward compatibility
    this.navigateToTreasury();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CommandCenter.init();
});
