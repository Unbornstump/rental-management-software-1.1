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

    // Open overlay
    hamburgerBtn.addEventListener('click', () => this.open());

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

    // Admin door click
    if (adminDoor) {
      adminDoor.addEventListener('click', () => {
        this.close();
        this.navigateToAdmin();
      });
    }

    // Treasury door click
    if (treasuryDoor) {
      treasuryDoor.addEventListener('click', () => {
        this.close();
        this.navigateToTreasury();
      });
    }
  },

  open() {
    const overlay = document.getElementById('command-center-overlay');
    if (overlay) {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      this.isOpen = true;
    }
  },

  close() {
    const overlay = document.getElementById('command-center-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      this.isOpen = false;
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
