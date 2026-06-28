const { ipcRenderer } = require('electron');

// Listen for auth token from main process
ipcRenderer.on('auth-token', (event, token) => {
  AppState.setAuthToken(token);
  apiClient.token = token;
  initializeApp();
});

// Initialize application
async function initializeApp() {
  try {
    // Load properties for context selector
    const properties = await apiClient.getProperties();
    AppState.setAllProperties(properties);

    // Update sidebar visibility based on property context
    PageLoaders.updateSidebarVisibility();

    // Load initial page - if no property context, show property list
    const property = AppState.getPropertyContext();
    if (property) {
      PageLoaders.loadPage('dashboard');
    } else {
      PageLoaders.loadPage('properties');
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Navigation handling
document.querySelectorAll('.nav-button').forEach(button => {
  button.addEventListener('click', () => {
    // Update active state
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Load page
    const page = button.dataset.page;
    PageLoaders.loadPage(page);
  });
});
