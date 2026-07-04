// Shared Components Module
// Contains reusable UI components used across different pages

const SharedComponents = {
  // Context selector component
  renderContextSelector() {
    const property = AppState.getPropertyContext();
    const allProperties = AppState.getAllProperties();

    return `
      <div class="page-header-toolbar">
        <div class="context-selector-wrapper">
          <label for="property-context">Viewing:</label>
          <select id="property-context">
            <option value="">All Properties</option>
            ${allProperties.map(prop => `
              <option value="${prop.id}" ${property?.id == prop.id ? 'selected' : ''}>${prop.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="header-actions">
          <button class="icon-button" title="Search">🔍</button>
          ${!property ? '<button class="action-button" id="quick-add-btn">+ Add Property</button>' : ''}
        </div>
      </div>
    `;
  },

  attachContextSelectorHandler(container) {
    const select = container.querySelector('#property-context');
    if (!select) return;

    select.addEventListener('change', (e) => {
      const propertyId = e.target.value;
      if (propertyId) {
        const property = AppState.getPropertyById(propertyId);
        AppState.setPropertyContext(property);
      } else {
        AppState.clearPropertyContext();
      }
      this.updateSidebarVisibility();
      const currentPage = document.querySelector('.nav-button.active')?.dataset.page;
      if (currentPage) {
        PageLoaders.loadPage(currentPage);
      }
    });
  },

  updateSidebarVisibility() {
    const property = AppState.getPropertyContext();
    const currentPage = AppState.getCurrentPage();
    const mainContainer = document.querySelector('.main-container');
    const sidebar = document.querySelector('.sidebar');
    const propertySpaceNav = document.getElementById('property-space-nav');
    const propertyContextName = document.getElementById('property-context-name');
    const propertyContextType = document.getElementById('property-context-type');
    const showSidebar = Boolean(property) && currentPage !== 'properties';

    if (showSidebar) {
      mainContainer.classList.remove('no-sidebar');
      mainContainer.classList.add('sidebar-visible');
      sidebar.classList.remove('hidden');
      sidebar.setAttribute('aria-hidden', 'false');
      propertySpaceNav.style.display = 'flex';
      if (propertyContextName) propertyContextName.textContent = property.name;
      if (propertyContextType) {
        propertyContextType.textContent = property.property_type || 'Property';
      }
    } else {
      mainContainer.classList.add('no-sidebar');
      mainContainer.classList.remove('sidebar-visible');
      sidebar.classList.add('hidden');
      sidebar.setAttribute('aria-hidden', 'true');
      propertySpaceNav.style.display = 'none';
    }
  },

  renderPropertySpaceHeader(title, propertyName, actionsHtml = '') {
    return `
      <div class="property-space-header">
        <div class="property-space-info">
          <h1 class="property-space-title">${title}</h1>
          <p class="property-space-subtitle">${propertyName}</p>
        </div>
        ${actionsHtml}
      </div>
    `;
  },

  handleQuickAction(action) {
    const property = AppState.getPropertyContext();
    switch(action) {
      case 'add-property':
        Modals.showPropertyModal();
        break;
      case 'add-unit':
        Modals.showUnitModal(null, property?.id);
        break;
      case 'register-tenant':
        Modals.showTenantModal();
        break;
      case 'create-lease':
        Modals.showLeaseModal(null, property?.id);
        break;
      case 'record-payment':
        if (property) {
          PageLoaders.loadPage('financials');
        } else {
          alert('Please select a property first.');
        }
        break;
      case 'add-maintenance':
        alert('Maintenance logging feature coming soon');
        break;
    }
  },

  extractUnitNumber(unitNumber) {
    if (!unitNumber) return 0;
    const matches = unitNumber.match(/\d+/g);
    if (!matches || matches.length === 0) return 0;
    return parseInt(matches[matches.length - 1], 10);
  },

  escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  showToast(message, durationMs = 4000) {
    let toast = document.querySelector('.app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), durationMs);
  },
};
