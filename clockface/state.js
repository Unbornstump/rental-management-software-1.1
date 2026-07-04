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

  setAuthToken(token) {
    this.authToken = token;
  },

  getAuthToken() {
    return this.authToken;
  },

  setUserRole(role) {
    this.userRole = role;
  },

  getUserRole() {
    return this.userRole;
  },

  setUsername(username) {
    this.username = username;
  },

  getUsername() {
    return this.username;
  },

  setMustChangePassword(must) {
    this.mustChangePassword = must;
  },

  getMustChangePassword() {
    return this.mustChangePassword;
  },

  isManager() {
    return this.userRole === 'manager';
  },

  setPropertyContext(property) {
    this.currentProperty = property;
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
  },

  getCurrentPage() {
    return this.currentPage;
  },

  pageParams: null,

  setPageParams(params) {
    this.pageParams = params || null;
  },

  getPageParams() {
    return this.pageParams || {};
  },

  clearPageParams() {
    this.pageParams = null;
  },

  clearAll() {
    this.authToken = null;
    this.userRole = null;
    this.username = null;
    this.mustChangePassword = false;
    this.currentProperty = null;
    this.allProperties = [];
    this.currentPage = null;
    this.pageParams = null;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppState;
}
