// Workspace loading overlay — real async stages after login

const WorkspaceLoading = {
  stages: [
    { percentage: 20, label: 'Authenticated' },
    { percentage: 40, label: 'Setting up your workspace...' },
    { percentage: 70, label: 'Loading your properties...' },
    { percentage: 90, label: 'Almost there...' },
    { percentage: 100, label: 'Welcome' },
  ],

  failedStage: 0,
  isRunning: false,

  getOverlay() {
    return document.getElementById('workspace-loading-overlay');
  },

  updateProgress(percentage, label) {
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressStage = document.getElementById('progress-stage');

    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
    if (progressStage) progressStage.textContent = label;
  },

  showProgress() {
    const overlay = this.getOverlay();
    if (!overlay) return;
    overlay.querySelector('.loading-content').style.display = 'flex';
    overlay.querySelector('.error-state').style.display = 'none';
  },

  showError() {
    const overlay = this.getOverlay();
    if (!overlay) return;
    overlay.querySelector('.loading-content').style.display = 'none';
    overlay.querySelector('.error-state').style.display = 'flex';
  },

  showAuthError() {
    const overlay = this.getOverlay();
    if (!overlay) return;
    overlay.querySelector('.loading-content').style.display = 'none';

    const errorState = overlay.querySelector('.error-state');
    errorState.style.display = 'flex';
    errorState.querySelector('.error-title').textContent = 'Authentication Error';
    errorState.querySelector('.error-message').textContent = 'Your session may have expired. Please log in again.';
  },

  waitForPaint() {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  },

  async runStage(stageIndex, fn) {
    const stage = this.stages[stageIndex - 1];
    this.updateProgress(stage.percentage, stage.label);
    await fn();
    this.failedStage = stageIndex;
  },

  async run() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.showProgress();
    this.updateProgress(0, 'Initializing...');

    const startFrom = this.failedStage > 0 ? this.failedStage : 1;

    try {
      if (startFrom <= 1) {
        await this.runStage(1, async () => {
          await this.waitForPaint();
        });
      }

      if (startFrom <= 2) {
        await this.runStage(2, async () => {
          PageLoaders.updateSidebarVisibility();
          await this.waitForPaint();
        });
      }

      let properties = AppState.getAllProperties();
      if (startFrom <= 3) {
        await this.runStage(3, async () => {
          properties = await apiClient.getProperties();
        });
      }

      if (startFrom <= 4) {
        await this.runStage(4, async () => {
          AppState.setAllProperties(properties);
          PageLoaders.updateSidebarVisibility();
          await this.waitForPaint();
        });
      }

      if (startFrom <= 5) {
        await this.runStage(5, async () => {
          const container = document.getElementById('page-content');
          await PropertyPages.loadProperties(container);
          await this.waitForPaint();
        });
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      await this.complete();
    } catch (error) {
      console.error('Workspace loading failed:', error);

      // Check for 401 auth error specifically
      if (error.response?.status === 401) {
        this.showAuthError();
      } else {
        this.showError();
      }
    } finally {
      this.isRunning = false;
    }
  },

  async complete() {
    const overlay = this.getOverlay();
    const mainContainer = document.querySelector('.main-container');

    if (overlay) overlay.classList.add('fade-out');
    if (mainContainer) mainContainer.classList.add('fade-in');

    await new Promise(resolve => setTimeout(resolve, 300));

    if (overlay) {
      overlay.style.display = 'none';
      overlay.classList.remove('fade-out');
    }
  },

  retry() {
    this.showProgress();
    this.updateProgress(0, 'Initializing...');
    this.run();
  },

  logout() {
    AppState.setAuthToken(null);
    apiClient.token = null;
    ipcRenderer.send('logout');
  },

  init() {
    const retryBtn = document.getElementById('loading-retry-btn');
    const logoutBtn = document.getElementById('loading-logout-btn');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.retry());
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  WorkspaceLoading.init();
});
