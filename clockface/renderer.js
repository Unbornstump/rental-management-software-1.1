const { ipcRenderer } = require('electron');

let sessionTimeout;
const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

function resetSessionTimeout() {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
  sessionTimeout = setTimeout(() => {
    // Session expired, logout
    Modals.performLogout();
    // Store that we logged out due to inactivity
    localStorage.setItem('loggedOutDueToInactivity', 'true');
  }, SESSION_DURATION);
}

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
  
  // Show admin nav only if user is manager
  const adminNav = document.getElementById('admin-nav');
  if (adminNav) {
    adminNav.style.display = AppState.isManager() ? 'block' : 'none';
  }

  // Hide financials and unit management links for unauthorized roles
  const financialsNav = document.querySelector('.nav-button[data-page="financials"]');
  const unitsNav = document.querySelector('.nav-button[data-page="property-units"]');
  const tenantsNav = document.querySelector('.nav-button[data-page="property-tenants"]');
  if (financialsNav) {
    financialsNav.style.display = AppState.isManager() || AppState.isAccountant() ? 'block' : 'none';
  }
  if (unitsNav) {
    unitsNav.style.display = AppState.isManager() || AppState.isPropertyOfficer() || AppState.isCaretaker() ? 'block' : 'none';
  }
  if (tenantsNav) {
    tenantsNav.style.display = AppState.isManager() || AppState.isAccountant() || AppState.isCaretaker() ? 'block' : 'none';
  }

  // Start session timeout
  resetSessionTimeout();
  
  // Reset timeout on user activity
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, resetSessionTimeout, { passive: true });
  });
  
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
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }
      Modals.showLogoutModal();
      return;
    }

    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const page = button.dataset.page;
    PageLoaders.loadPage(page);
  });
});

