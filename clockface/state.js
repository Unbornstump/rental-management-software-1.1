// State Management for RMS
// Handles shared application state like the currently selected property

const AppState = {
  authToken: null,
  userRole: null, // 'manager', 'accountant', 'property_officer', 'caretaker'
  username: null,
  mustChangePassword: false,
  currentProperty: null, // null = all properties, object = specific property
  allProperties: [],
  currentPage: null, // Track current page for sidebar visibility

  persistSessionState() {
    if (typeof localStorage === 'undefined') return;

    if (this.authToken) {
      localStorage.setItem('rms.authToken', this.authToken);
    } else {
      localStorage.removeItem('rms.authToken');
    }

    if (this.userRole) {
      localStorage.setItem('rms.userRole', this.userRole);
    } else {
      localStorage.removeItem('rms.userRole');
    }

    if (this.username) {
      localStorage.setItem('rms.username', this.username);
    } else {
      localStorage.removeItem('rms.username');
    }

    localStorage.setItem('rms.mustChangePassword', this.mustChangePassword ? 'true' : 'false');

    if (this.currentProperty?.id) {
      localStorage.setItem('rms.currentPropertyId', String(this.currentProperty.id));
    } else {
      localStorage.removeItem('rms.currentPropertyId');
    }
  },

  clearPersistentSession() {
    if (typeof localStorage === 'undefined') return;

    ['rms.authToken', 'rms.userRole', 'rms.username', 'rms.mustChangePassword', 'rms.currentPropertyId', 'rms.pageParams'].forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  setAuthToken(token) {
    this.authToken = token;
    this.persistSessionState();
  },

  getAuthToken() {
    return this.authToken;
  },

  setUserRole(role) {
    this.userRole = role;
    this.persistSessionState();
  },

  getUserRole() {
    return this.userRole;
  },

  setUsername(username) {
    this.username = username;
    this.persistSessionState();
  },

  getUsername() {
    return this.username;
  },

  setMustChangePassword(must) {
    this.mustChangePassword = must;
    this.persistSessionState();
  },

  getMustChangePassword() {
    return this.mustChangePassword;
  },

  isManager() {
    return this.userRole === 'manager';
  },

  setPropertyContext(property) {
    this.currentProperty = property;
    this.persistSessionState();
    // Trigger event for components to react
    document.dispatchEvent(new CustomEvent('propertyContextChanged', { 
      detail: { property } 
    }));
  },

  getPropertyContext() {
    return this.currentProperty;
  },

  clearPropertyContext() {
    this.currentProperty = null;
    document.dispatchEvent(new CustomEvent('propertyContextChanged', { 
      detail: { property: null } 
    }));
  },

  setAllProperties(properties) {
    this.allProperties = properties;
  },

  getAllProperties() {
    return this.allProperties;
  },

  getPropertyById(id) {
    return this.allProperties.find(p => p.id == id);
  },

  setCurrentPage(page) {
    this.currentPage = page;
    this.persistSessionState();
  },

  getCurrentPage() {
    return this.currentPage;
  },

  pageParams: null,

  setPageParams(params) {
    this.pageParams = params || null;
    this.persistSessionState();
  },

  getPageParams() {
    return this.pageParams || {};
  },

  clearPageParams() {
    this.pageParams = null;
  },

  clearAll() {
    this.clearPersistentSession();
    this.authToken = null;
    this.userRole = null;
    this.username = null;
    this.mustChangePassword = false;
    this.currentProperty = null;
    this.allProperties = [];
    this.currentPage = null;
    this.pageParams = null;
    this.unsavedChanges = false;
  },

  setUnsavedChanges(hasChanges) {
    this.unsavedChanges = hasChanges;
  },

  hasUnsavedChanges() {
    return this.unsavedChanges;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppState;
}
