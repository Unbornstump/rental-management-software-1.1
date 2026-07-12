// Control Center Module
// Handles the centralized navigation overlay for Administration and Financial Hub

const ControlCenter = {
  isOpen: false,

  init() {
    const hamburgerBtn = document.getElementById('control-center-btn');
    const overlay = document.getElementById('control-center-overlay');
    const backdrop = document.getElementById('control-center-backdrop');
    const adminCard = document.getElementById('administration-card-btn');
    const financialHubCard = document.getElementById('financial-hub-card-btn');

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

    // Ripple effect for cards
    if (adminCard) {
      this.initRippleEffect(adminCard);
      adminCard.addEventListener('click', () => {
        this.close();
        this.navigateToAdministration();
      });
    }

    if (financialHubCard) {
      this.initRippleEffect(financialHubCard);
      financialHubCard.addEventListener('click', () => {
        this.close();
        this.navigateToFinancialHub();
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

    // Load placeholder stats for cards
    this.loadPlaceholderStats();
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
    const navBtn = document.getElementById('control-center-btn');
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

  async loadPlaceholderStats() {
    try {
      // Fetch real Administration stats
      const adminStats = await apiClient.getAdministrationStats();

      // Fetch real Financial Hub stats (global view across all properties)
      const financialStats = await apiClient.getFinancialHubStats();

      // Update Administration card
      const adminCard = document.querySelector('.administration-card');
      if (adminCard) {
        adminCard.querySelector('[data-stat="users"]').textContent = adminStats.users || '0';
        adminCard.querySelector('[data-stat="roles"]').textContent = adminStats.roles || '0';
        adminCard.querySelector('[data-stat="permissions"]').textContent = adminStats.permissions || '0';
      }

      // Update Financial Hub card
      const financialCard = document.querySelector('.financial-hub-card');
      if (financialCard) {
        const collectionRate = financialStats.collection_rate || 0;
        const netToOwners = financialStats.net_to_owners || 0;
        const lastUpdated = financialStats.last_updated ? new Date(financialStats.last_updated) : null;

        financialCard.querySelector('[data-stat="collection-rate"]').textContent = `${collectionRate}%`;
        financialCard.querySelector('[data-stat="net-to-owners"]').textContent = `KES ${netToOwners.toLocaleString()}`;
        financialCard.querySelector('[data-stat="last-updated"]').textContent = lastUpdated 
          ? `Updated ${lastUpdated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'No data';
      }
    } catch (error) {
      console.error('Error loading Control Center stats:', error);
      // Fallback to zeros if API fails
      const adminCard = document.querySelector('.administration-card');
      if (adminCard) {
        adminCard.querySelector('[data-stat="users"]').textContent = '0';
        adminCard.querySelector('[data-stat="roles"]').textContent = '0';
        adminCard.querySelector('[data-stat="permissions"]').textContent = '0';
      }

      const financialCard = document.querySelector('.financial-hub-card');
      if (financialCard) {
        financialCard.querySelector('[data-stat="collection-rate"]').textContent = '0%';
        financialCard.querySelector('[data-stat="net-to-owners"]').textContent = 'KES 0';
        financialCard.querySelector('[data-stat="last-updated"]').textContent = 'No data';
      }
    }
  },

  open() {
    const overlay = document.getElementById('control-center-overlay');
    const navBtn = document.getElementById('control-center-btn');
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
    const overlay = document.getElementById('control-center-overlay');
    const navBtn = document.getElementById('control-center-btn');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      this.isOpen = false;
    }
    if (navBtn) {
      navBtn.classList.remove('active');
    }
  },

  navigateToAdministration() {
    AppState.clearPropertyContext();
    PageLoaders.navigate('admin-hub');
  },

  navigateToFinancialHub() {
    AppState.clearPropertyContext();
    PageLoaders.navigate('treasury');
  },

  // Legacy method names for backward compatibility
  navigateToAdmin() {
    this.navigateToAdministration();
  },

  navigateToTreasury() {
    this.navigateToFinancialHub();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ControlCenter.init();
});
