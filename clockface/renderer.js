const { ipcRenderer } = require('electron');

ipcRenderer.on('auth-token', (event, authData) => {
  // Handle both old (string) and new (object) auth data formats for backward compatibility
  const token = typeof authData === 'string' ? authData : authData.token;
  const role = typeof authData === 'object' ? authData.role : null;
  const username = typeof authData === 'object' ? authData.username : null;
  const mustChangePassword = typeof authData === 'object' ? authData.mustChangePassword : false;
  
  AppState.setAuthToken(token);
  apiClient.token = token;
  
  if (role) {
    AppState.setUserRole(role);
  }
  if (username) {
    AppState.setUsername(username);
  }
  if (mustChangePassword) {
    AppState.setMustChangePassword(true);
    // Show password change dialog
    showPasswordChangeDialog();
  }
  
  // Show admin nav if user is manager
  const adminNav = document.getElementById('admin-nav');
  if (adminNav && AppState.isManager()) {
    adminNav.style.display = 'block';
  }
  
  WorkspaceLoading.run();
});

document.querySelectorAll('.nav-button').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;

    if (action === 'back-to-properties') {
      PageLoaders.loadPage('back-to-properties');
      return;
    }
    
    if (action === 'logout') {
      // Clear auth and return to login
      AppState.clearAll?.();
      ipcRenderer.send('logout');
      return;
    }

    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const page = button.dataset.page;
    PageLoaders.loadPage(page);
  });
});

