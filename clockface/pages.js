// Page Loaders for RMS
// Each function handles loading a specific page's content

const PageLoaders = {
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
      // Update sidebar visibility
      this.updateSidebarVisibility();
      // Reload current page with new context
      const currentPage = document.querySelector('.nav-button.active')?.dataset.page;
      if (currentPage) {
        this.loadPage(currentPage);
      }
    });
  },

  updateSidebarVisibility() {
    const property = AppState.getPropertyContext();
    const globalNav = document.getElementById('global-nav');
    const propertySpaceNav = document.getElementById('property-space-nav');
    const propertyContextName = document.getElementById('property-context-name');

    if (property) {
      globalNav.style.display = 'none';
      propertySpaceNav.style.display = 'block';
      propertyContextName.textContent = property.name;
    } else {
      globalNav.style.display = 'block';
      propertySpaceNav.style.display = 'none';
    }
  },

  // Property Dashboard (Property Space Dashboard - shown when property is selected)
  async loadPropertyDashboard(container) {
    const property = AppState.getPropertyContext();

    if (!property) {
      this.loadProperties(container);
      return;
    }

    container.innerHTML = `
      <div class="stats-grid" id="dashboard-stats"></div>
      <div class="dashboard-grid">
        <div class="quick-actions-panel">
          <h3 class="panel-title">Quick Actions</h3>
          <div class="quick-actions-list">
            <button class="quick-action-btn" data-action="add-unit">+ Add Unit</button>
            <button class="quick-action-btn" data-action="register-tenant">+ Register Tenant</button>
          </div>
        </div>
        <div class="recent-activity-panel">
          <h3 class="panel-title">Recent Activity</h3>
          <div class="activity-list" id="activity-list">
            <div class="activity-item">
              <span class="activity-icon">✔</span>
              <span class="activity-text">Entered property space</span>
              <span class="activity-time">Just now</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const statsGrid = document.getElementById('dashboard-stats');

    try {
      const [units, tenants, leases, payments] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getTenants(),
        apiClient.getLeases(),
        apiClient.getPayments()
      ]);

      // Filter by current property
      const filteredUnits = units.filter(u => u.property == property.id);
      const filteredLeases = leases.filter(l => filteredUnits.some(u => u.id == l.unit));
      const activeLeases = filteredLeases.filter(l => l.status === 'active');
      
      // Calculate occupancy based on active leases (not unit status field)
      const occupiedUnitIds = activeLeases.map(l => l.unit);
      const occupiedUnitsCount = new Set(occupiedUnitIds).size; // Count unique units with active leases
      const vacantUnits = filteredUnits.length - occupiedUnitsCount;
      const occupancyRate = filteredUnits.length > 0 ? ((occupiedUnitsCount / filteredUnits.length) * 100).toFixed(0) : 0;
      
      // Calculate rent stats for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      // Total rent expected = sum of rent amounts from units with active leases
      const occupiedUnits = filteredUnits.filter(u => occupiedUnitIds.includes(u.id));
      const totalRentExpected = occupiedUnits.reduce((sum, unit) => sum + (parseFloat(unit.rent_amount) || 0), 0);
      
      const propertyLeaseIds = filteredLeases.map(l => l.id);
      const filteredPayments = payments.filter(p => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate.getMonth() + 1 === currentMonth && 
               paymentDate.getFullYear() === currentYear &&
               propertyLeaseIds.includes(p.invoice);
      });
      
      const totalRentCollected = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
      const outstandingRent = totalRentExpected - totalRentCollected;
      
      // Count active tenants (tenants with active leases in this property)
      const activeTenantIds = activeLeases.map(l => l.tenant);
      const activeTenants = tenants.filter(t => activeTenantIds.includes(t.id)).length;

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon green">🚪</div>
            <div class="stat-card-title">Total Units</div>
          </div>
          <div class="stat-card-value">${filteredUnits.length}</div>
          <div class="stat-card-subtitle">${occupiedUnitsCount} occupied, ${vacantUnits} vacant</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon blue">📊</div>
            <div class="stat-card-title">Occupancy Rate</div>
          </div>
          <div class="stat-card-value">${occupancyRate}%</div>
          <div class="stat-card-subtitle">${occupiedUnitsCount} of ${filteredUnits.length} units</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon orange">👥</div>
            <div class="stat-card-title">Active Tenants</div>
          </div>
          <div class="stat-card-value">${activeTenants}</div>
          <div class="stat-card-subtitle">With active leases</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon purple">💰</div>
            <div class="stat-card-title">Rent Expected</div>
          </div>
          <div class="stat-card-value">${totalRentExpected.toLocaleString()}</div>
          <div class="stat-card-subtitle">This month</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon green">✅</div>
            <div class="stat-card-title">Rent Collected</div>
          </div>
          <div class="stat-card-value">${totalRentCollected.toLocaleString()}</div>
          <div class="stat-card-subtitle">This month</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon red">⚠️</div>
            <div class="stat-card-title">Outstanding</div>
          </div>
          <div class="stat-card-value">${outstandingRent.toLocaleString()}</div>
          <div class="stat-card-subtitle">This month</div>
        </div>
      `;

      // Attach quick action handlers
      container.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          this.handleQuickAction(action);
        });
      });
    } catch (error) {
      statsGrid.innerHTML = `<p>Error loading dashboard: ${error.message}</p>`;
    }
  },

  // Property List (shown when no property context - the "higher-level view")
  async loadPropertyList(container) {
    container.innerHTML = `
      <div class="property-list-header">
        <h1 class="page-title">Properties</h1>
        <button class="action-button" id="create-property-btn">+ Add Property</button>
      </div>
      <div class="properties-grid" id="properties-grid"></div>
    `;

    const createBtn = container.querySelector('#create-property-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => Modals.showPropertyModal());
    }

    const propertiesGrid = document.getElementById('properties-grid');

    try {
      const properties = await apiClient.getProperties();

      if (properties.length === 0) {
        propertiesGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🏢</div>
            <h3 class="empty-state-title">No Properties Yet</h3>
            <p class="empty-state-text">Create your first property to get started managing your rentals.</p>
            <button class="action-button" onclick="Modals.showPropertyModal()">+ Add Property</button>
          </div>
        `;
        return;
      }

      propertiesGrid.innerHTML = properties.map(prop => `
        <div class="property-card" data-property-id="${prop.id}">
          <div class="property-card-header">
            <h3 class="property-card-title">${prop.name}</h3>
            <span class="property-card-badge">Active</span>
          </div>
          <p class="property-card-address">${prop.address || 'No address'}</p>
          <button class="action-button enter-property-btn" data-property-id="${prop.id}">Enter Property →</button>
        </div>
      `).join('');

      // Attach enter property handlers
      container.querySelectorAll('.enter-property-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const propertyId = btn.dataset.propertyId;
          const property = AppState.getPropertyById(propertyId);
          if (property) {
            AppState.setPropertyContext(property);
            this.updateSidebarVisibility();
            this.loadPage('dashboard');
          }
        });
      });
    } catch (error) {
      propertiesGrid.innerHTML = `<p>Error loading properties: ${error.message}</p>`;
    }
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
        alert('Payment recording feature coming soon');
        break;
      case 'add-maintenance':
        alert('Maintenance logging feature coming soon');
        break;
    }
  },

  // Properties (General App View - the "lobby" to pick a property)
  async loadProperties(container) {
    container.innerHTML = `
      <div class="property-list-header">
        <h1 class="page-title">Properties</h1>
      </div>
      <div class="properties-grid" id="properties-grid"></div>
    `;

    const propertiesGrid = document.getElementById('properties-grid');

    try {
      const [properties, units, tenants] = await Promise.all([
        apiClient.getProperties(),
        apiClient.getUnits(),
        apiClient.getTenants()
      ]);

      // Store properties in state for later use
      AppState.setAllProperties(properties);

      if (properties.length === 0) {
        propertiesGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🏢</div>
            <h3 class="empty-state-title">No Properties Yet</h3>
            <p class="empty-state-text">Create your first property to get started managing your rentals.</p>
            <button class="action-button" onclick="Modals.showPropertyModal()">+ Add Property</button>
          </div>
        `;
        return;
      }

      // Calculate stats for each property
      const propertyStats = properties.map(prop => {
        const propUnits = units.filter(u => u.property == prop.id);
        const propLeases = tenants.filter(t => propUnits.some(u => u.id == t.unit));
        return {
          ...prop,
          unitCount: propUnits.length,
          tenantCount: propLeases.length
        };
      });

      // Render property cards
      let gridHTML = propertyStats.map(prop => `
        <div class="property-card clickable" data-property-id="${prop.id}">
          <div class="property-card-header">
            <div class="property-card-icon">🏢</div>
            <span class="property-card-badge">Active</span>
          </div>
          <h3 class="property-card-title">${prop.name || 'N/A'}</h3>
          <p class="property-card-location">${prop.property_type || 'N/A'} — ${prop.location || 'N/A'}</p>
          <div class="property-card-stats">
            <div class="property-card-stat">
              <span class="stat-value">${prop.unitCount}</span>
              <span class="stat-label">Units</span>
            </div>
            <div class="property-card-stat">
              <span class="stat-value">${prop.tenantCount}</span>
              <span class="stat-label">Tenants</span>
            </div>
          </div>
        </div>
      `).join('');

      // Add "Add Property" tile
      gridHTML += `
        <div class="property-card add-property-card">
          <div class="add-property-icon">+</div>
          <span class="add-property-label">Add another property</span>
        </div>
      `;

      propertiesGrid.innerHTML = gridHTML;

      // Attach click handlers for property cards
      container.querySelectorAll('.property-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
          const propertyId = card.dataset.propertyId;
          const property = AppState.getPropertyById(propertyId);
          if (property) {
            AppState.setPropertyContext(property);
            this.updateSidebarVisibility();
            this.loadPage('property-dashboard');
          }
        });
      });

      // Attach click handler for "Add Property" tile
      const addCard = container.querySelector('.add-property-card');
      if (addCard) {
        addCard.addEventListener('click', () => Modals.showPropertyModal());
      }
    } catch (error) {
      propertiesGrid.innerHTML = `<p>Error loading properties: ${error.message}</p>`;
    }
  },

  // Property Units (Property Space - Units module)
  async loadPropertyUnits(container) {
    const property = AppState.getPropertyContext();

    if (!property) {
      this.loadProperties(container);
      return;
    }

    // Get saved view preference or default to grid
    const savedView = localStorage.getItem('unitsViewPreference') || 'grid';

    container.innerHTML = `
      <div class="property-space-header">
        <div class="property-space-info">
          <h1 class="property-space-title">Units</h1>
          <p class="property-space-subtitle">${property.name}</p>
        </div>
        <div class="header-actions">
          <button class="action-button" id="create-unit-btn">+ Bulk Create</button>
          <div class="view-toggle">
            <button class="view-toggle-btn ${savedView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="2" width="7" height="7" rx="1"/>
                <rect x="11" y="2" width="7" height="7" rx="1"/>
                <rect x="2" y="11" width="7" height="7" rx="1"/>
                <rect x="11" y="11" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button class="view-toggle-btn ${savedView === 'table' ? 'active' : ''}" data-view="table" title="Table View">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <rect x="2" y="3" width="16" height="3" rx="1"/>
                <rect x="2" y="8" width="16" height="3" rx="1"/>
                <rect x="2" y="13" width="16" height="3" rx="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div id="units-container"></div>
    `;

    document.getElementById('create-unit-btn').addEventListener('click', () => {
      Modals.showBulkUnitModal(property.id);
    });

    // Handle view toggle
    container.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        localStorage.setItem('unitsViewPreference', view);
        container.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderUnits(container, property, view);
      });
    });

    // Initial render
    this.renderUnits(container, property, savedView);
  },

  async renderUnits(container, property, view) {
    const unitsContainer = document.getElementById('units-container');

    try {
      const [units, tenants, leases] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getTenants(),
        apiClient.getLeases()
      ]);

      const filteredUnits = units.filter(u => u.property == property.id);

      // Determine occupancy for each unit based on active leases
      const activeLeases = leases.filter(l => l.status === 'active');
      const occupiedUnitIds = activeLeases.map(l => l.unit);
      
      const unitsWithOccupancy = filteredUnits.map(unit => ({
        ...unit,
        isOccupied: occupiedUnitIds.includes(unit.id)
      }));

      if (filteredUnits.length === 0) {
        unitsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🚪</div>
            <h3 class="empty-state-title">No Units Yet</h3>
            <p class="empty-state-text">Bulk create your first units to get started.</p>
            <button class="action-button" onclick="Modals.showBulkUnitModal(${property.id})">+ Bulk Create Units</button>
          </div>
        `;
        return;
      }

      if (view === 'grid') {
        this.renderUnitsGrid(unitsContainer, unitsWithOccupancy);
      } else {
        this.renderUnitsTable(unitsContainer, unitsWithOccupancy, tenants, leases);
      }
    } catch (error) {
      unitsContainer.innerHTML = `<p>Error loading units: ${error.message}</p>`;
    }
  },

  renderUnitsGrid(container, units) {
    // Sort units numerically by the number portion
    const sortedUnits = [...units].sort((a, b) => {
      const numA = this.extractUnitNumber(a.unit_number);
      const numB = this.extractUnitNumber(b.unit_number);
      return numA - numB;
    });

    container.innerHTML = `<div class="units-grid compact-grid">${sortedUnits.map(unit => `
      <div class="unit-card compact" data-unit-id="${unit.id}">
        <div class="unit-card-status status-${unit.isOccupied ? 'occupied' : 'vacant'}"></div>
        <div class="unit-card-content">
          <div class="unit-card-number">${unit.unit_number || 'N/A'}</div>
          <div class="unit-card-badge ${unit.isOccupied ? 'occupied' : 'vacant'}">${unit.isOccupied ? 'Occupied' : 'Vacant'}</div>
          <div class="unit-card-type">${unit.unit_type || 'N/A'}</div>
          <div class="unit-card-rent">${parseFloat(unit.rent_amount || 0).toLocaleString()}</div>
        </div>
      </div>
    `).join('')}</div>`;

    // Attach click handlers
    container.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', () => {
        const unitId = card.dataset.unitId;
        const unit = sortedUnits.find(u => u.id == unitId);
        if (unit) {
          Modals.showUnitEditModal(unit);
        }
      });
    });
  },

  extractUnitNumber(unitNumber) {
    // Extract the numeric portion from unit name (e.g., "A 1" -> 1, "Room 10" -> 10, "a1 10" -> 10)
    if (!unitNumber) return 0;
    // Match the last sequence of digits in the string to handle formats like "a1 10"
    const matches = unitNumber.match(/\d+/g);
    if (!matches || matches.length === 0) return 0;
    // Return the last number found (the actual unit number)
    return parseInt(matches[matches.length - 1], 10);
  },

  renderUnitsTable(container, units, tenants, leases) {
    // Sort units numerically by the number portion
    const sortedUnits = [...units].sort((a, b) => {
      const numA = this.extractUnitNumber(a.unit_number);
      const numB = this.extractUnitNumber(b.unit_number);
      return numA - numB;
    });

    // Get tenant names for occupied units
    const unitTenants = {};
    leases.forEach(lease => {
      if (lease.status === 'active') {
        const tenant = tenants.find(t => t.id == lease.tenant);
        if (tenant) {
          unitTenants[lease.unit] = tenant.full_name || tenant.name || 'Unknown';
        }
      }
    });

    container.innerHTML = `
      <div class="units-table-container">
        <table class="units-table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Type</th>
              <th>Rent</th>
              <th>Tenant</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sortedUnits.map(unit => `
              <tr class="unit-row" data-unit-id="${unit.id}">
                <td><strong>${unit.unit_number || 'N/A'}</strong></td>
                <td>${unit.unit_type || 'N/A'}</td>
                <td>${parseFloat(unit.rent_amount || 0).toLocaleString()}</td>
                <td>${unitTenants[unit.id] || '-'}</td>
                <td><span class="status-badge status-${unit.status || 'vacant'}">${unit.status === 'occupied' ? 'Occupied' : 'Vacant'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach click handlers
    container.querySelectorAll('.unit-row').forEach(row => {
      row.addEventListener('click', () => {
        const unitId = row.dataset.unitId;
        const unit = sortedUnits.find(u => u.id == unitId);
        if (unit) {
          Modals.showUnitEditModal(unit);
        }
      });
    });
  },

  // Units (Legacy - kept for compatibility)
  async loadUnits(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Units</h1>
      <div class="page-header">
        <button class="action-button" id="create-unit-btn">Create Unit</button>
      </div>
      <ul class="data-list" id="units-list"></ul>
    `;

    this.attachContextSelectorHandler(container);

    document.getElementById('create-unit-btn').addEventListener('click', () => {
      const property = AppState.getPropertyContext();
      Modals.showUnitModal(null, property?.id);
    });

    const list = document.getElementById('units-list');
    const property = AppState.getPropertyContext();

    try {
      const units = await apiClient.getUnits();
      const filteredUnits = property ? units.filter(u => u.property == property.id) : units;

      if (!filteredUnits || filteredUnits.length === 0) {
        list.innerHTML = '<li>No units found.</li>';
        return;
      }

      list.innerHTML = filteredUnits.map(unit => `
        <li class="data-item">
          <div class="data-item-content">
            <strong>${unit.unit_number || 'N/A'}</strong>
            <span>${unit.unit_type || 'N/A'} — ${unit.rent_amount || 'N/A'}</span>
          </div>
          <div class="data-item-actions">
            <button class="action-button-small edit-btn" data-id="${unit.id}">Edit</button>
            <button class="action-button-small delete-btn" data-id="${unit.id}">Delete</button>
          </div>
        </li>
      `).join('');

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const unit = filteredUnits.find(u => u.id == id);
          Modals.showUnitModal(unit, property?.id);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this unit?')) {
            try {
              await apiClient.deleteUnit(id);
              this.loadUnits(container);
            } catch (error) {
              alert('Error deleting unit: ' + error.message);
            }
          }
        });
      });
    } catch (error) {
      list.innerHTML = `<li>Error loading units: ${error.message}</li>`;
    }
  },

  // Landlords
  async loadLandlords(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Landlords</h1>
      <div class="page-header">
        <button class="action-button" id="create-landlord-btn">Create Landlord</button>
      </div>
      <ul class="data-list" id="landlords-list"></ul>
    `;

    this.attachContextSelectorHandler(container);

    document.getElementById('create-landlord-btn').addEventListener('click', () => {
      Modals.showLandlordModal();
    });

    const list = document.getElementById('landlords-list');

    try {
      const landlords = await apiClient.getLandlords();
      if (!landlords || landlords.length === 0) {
        list.innerHTML = '<li>No landlords found.</li>';
        return;
      }

      list.innerHTML = landlords.map(landlord => `
        <li class="data-item">
          <div class="data-item-content">
            <strong>${landlord.name || 'N/A'}</strong>
            <span>${landlord.email || 'N/A'} — ${landlord.phone || 'N/A'}</span>
          </div>
          <div class="data-item-actions">
            <button class="action-button-small edit-btn" data-id="${landlord.id}">Edit</button>
            <button class="action-button-small delete-btn" data-id="${landlord.id}">Delete</button>
          </div>
        </li>
      `).join('');

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const landlord = landlords.find(l => l.id == id);
          Modals.showLandlordModal(landlord);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this landlord?')) {
            try {
              await apiClient.deleteLandlord(id);
              this.loadLandlords(container);
            } catch (error) {
              alert('Error deleting landlord: ' + error.message);
            }
          }
        });
      });
    } catch (error) {
      list.innerHTML = `<li>Error loading landlords: ${error.message}</li>`;
    }
  },

  // Property Tenants (Property Space - Tenants module)
  async loadPropertyTenants(container, initialFilter = 'active') {
    const property = AppState.getPropertyContext();

    if (!property) {
      this.loadProperties(container);
      return;
    }

    container.innerHTML = `
      <div class="property-space-header">
        <div class="property-space-info">
          <h1 class="property-space-title">Tenants</h1>
          <p class="property-space-subtitle">${property.name}</p>
        </div>
        <button class="action-button" id="create-tenant-btn">+ Register Tenant</button>
      </div>
      <div class="tenant-filter-tabs">
        <button class="filter-tab ${initialFilter === 'active' ? 'active' : ''}" data-filter="active">Active Tenants</button>
        <button class="filter-tab ${initialFilter === 'inactive' ? 'active' : ''}" data-filter="inactive">Inactive Tenants</button>
      </div>
      <div class="tenants-grid" id="tenants-grid"></div>
    `;

    document.getElementById('create-tenant-btn').addEventListener('click', () => {
      Modals.showTenantModal(null, property.id);
    });

    // Filter tab handling
    let currentFilter = initialFilter;
    const filterTabs = container.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        this.renderTenantsGrid(container, property, currentFilter);
      });
    });

    const tenantsGrid = document.getElementById('tenants-grid');

    try {
      const [allUnits, allLeases, allTenants, allTenantUnits] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getLeases(),
        apiClient.getTenants(),
        apiClient.getTenantUnits()
      ]);

      // Store data for filtering
      container.tenantData = {
        property,
        allUnits,
        allLeases,
        allTenants,
        allTenantUnits
      };

      // Initial render with requested filter
      this.renderTenantsGrid(container, property, initialFilter);
    } catch (error) {
      tenantsGrid.innerHTML = `<p>Error loading tenants: ${error.message}</p>`;
    }
  },

  // Render tenants grid based on filter
  renderTenantsGrid(container, property, filter) {
    const data = container.tenantData;
    if (!data) return;

    const { allUnits, allLeases, allTenants, allTenantUnits } = data;
    const tenantsGrid = container.querySelector('#tenants-grid');

    // Filter tenants by property
    const propertyUnits = allUnits.filter(u => u.property == property.id);
    const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
    const activeLeases = propertyLeases.filter(l => l.status === 'active');
    const propertyTenantUnits = allTenantUnits.filter(tu => propertyUnits.some(u => u.id == tu.unit));

    // Get all tenants who have ever been in this property
    const allPropertyTenantIds = [...new Set([...propertyLeases.map(l => l.tenant), ...propertyTenantUnits.map(tu => tu.tenant)])];
    const allPropertyTenants = allTenants.filter(t => allPropertyTenantIds.includes(t.id));

    // Filter by tenant status
    const filteredTenants = allPropertyTenants.filter(t => {
      if (filter === 'active') {
        return t.status === 'active';
      } else {
        return t.status === 'inactive';
      }
    });

    if (filteredTenants.length === 0) {
      const emptyMessage = filter === 'active' 
        ? 'No active tenants. Register your first tenant to get started.'
        : 'No inactive tenants. Tenants appear here after vacating.';
      tenantsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">${filter === 'active' ? 'No Active Tenants' : 'No Inactive Tenants'}</h3>
          <p class="empty-state-text">${emptyMessage}</p>
          ${filter === 'active' ? `<button class="action-button" onclick="Modals.showTenantModal(null, ${property.id})">+ Register Tenant</button>` : ''}
        </div>
      `;
      return;
    }

    tenantsGrid.innerHTML = filteredTenants.map(tenant => {
      const tenantLease = activeLeases.find(l => l.tenant == tenant.id);
      const tenantUnitRecord = propertyTenantUnits.find(tu => tu.tenant == tenant.id);
      const hasLease = !!tenantLease;
      const isInactive = tenant.status === 'inactive';
      
      let unitNumber = 'Not assigned';
      let unitId = null;
      let moveOutDate = null;

      if (tenantUnitRecord) {
        const unit = propertyUnits.find(u => u.id == tenantUnitRecord.unit);
        if (unit) {
          unitNumber = unit.unit_number;
          unitId = unit.id;
          if (!tenantUnitRecord.is_active && tenantUnitRecord.move_out_date) {
            moveOutDate = tenantUnitRecord.move_out_date;
          }
        }
      } else if (tenantLease) {
        const unit = propertyUnits.find(u => u.id == tenantLease.unit);
        if (unit) {
          unitNumber = unit.unit_number;
          unitId = unit.id;
        }
      }
      
      return `
        <div class="tenant-card ${!hasLease ? 'no-lease' : ''} ${isInactive ? 'inactive' : ''}" 
             data-tenant-id="${tenant.id}" 
             data-has-lease="${hasLease}" 
             data-unit-id="${unitId || ''}" 
             data-unit-number="${unitNumber}"
             data-move-out-date="${moveOutDate || ''}"
             data-is-inactive="${isInactive}">
          <div class="tenant-card-header">
            <div class="tenant-card-icon">👤</div>
            <span class="tenant-card-badge ${isInactive ? 'status-inactive' : (hasLease ? 'status-active' : 'status-no-lease')}">${isInactive ? 'Inactive' : (hasLease ? 'Active' : 'No Lease')}</span>
          </div>
          <h3 class="tenant-card-title">${tenant.full_name || tenant.name || 'N/A'}</h3>
          <p class="tenant-card-contact">${tenant.phone || 'N/A'}</p>
          <div class="tenant-card-unit">
            <span class="unit-label">Unit:</span>
            <span class="unit-value">${unitNumber}</span>
          </div>
          ${isInactive && moveOutDate ? `
            <div class="tenant-card-move-out">
              <span class="move-out-label">Moved out:</span>
              <span class="move-out-value">${new Date(moveOutDate).toLocaleDateString()}</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach click handlers for tenant cards
    container.querySelectorAll('.tenant-card').forEach(card => {
      card.addEventListener('click', () => {
        const tenantId = parseInt(card.dataset.tenantId);
        const hasLease = card.dataset.hasLease === 'true';
        const unitId = card.dataset.unitId ? parseInt(card.dataset.unitId) : null;
        const unitNumber = card.dataset.unitNumber;
        const isInactive = card.dataset.isInactive === 'true';
        const tenant = filteredTenants.find(t => t.id == tenantId);
        
        if (!tenant) return;
        
        if (isInactive) {
          // Show inactive tenant options (Re-lease or Delete)
          this.showInactiveTenantModal(tenant, unitId, unitNumber, property);
        } else if (!hasLease) {
          // Show options for tenants without lease
          this.showTenantOptionsModal(tenant, unitId, unitNumber, property);
        } else {
          // Show tenant detail modal with vacate option
          this.showTenantDetailModal(tenant, unitNumber, property);
        }
      });
    });
  },

  // Tenant Options Modal (for tenants without lease)
  showTenantOptionsModal(tenant, unitId, unitNumber, property) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Tenant Options</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tenant-info-summary">
            <h3>${tenant.full_name || tenant.name}</h3>
            <p>Unit: ${unitNumber}</p>
            <p class="warning-text">This tenant has no active lease and cannot be charged rent.</p>
          </div>
          <div class="action-buttons">
            <button class="action-button primary-btn" id="create-lease-btn">Create Lease</button>
            <button class="action-button danger-btn" id="remove-tenant-btn">Remove Tenant</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#create-lease-btn').addEventListener('click', () => {
      modal.remove();
      // Get unit rent amount
      apiClient.getUnits().then(units => {
        const unit = units.find(u => u.id == unitId);
        if (unit) {
          Modals.showLeaseAgreementModal(tenant.id, tenant.full_name, unitId, unitNumber, unit.rent_amount);
        }
      });
    });

    modal.querySelector('#remove-tenant-btn').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to remove ${tenant.full_name} from unit ${unitNumber}? This will vacate the unit and deactivate the tenant.`)) {
        try {
          await this.vacateTenant(tenant.id, unitId);
          modal.remove();
          this.loadPropertyTenants(document.getElementById('page-content'));
        } catch (error) {
          alert('Error removing tenant: ' + error.message);
        }
      }
    });
  },

  // Tenant Detail Modal (for tenants with lease)
  showTenantDetailModal(tenant, unitNumber, property) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Tenant Details</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tenant-info-summary">
            <h3>${tenant.full_name || tenant.name}</h3>
            <p><strong>Phone:</strong> ${tenant.phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${tenant.email || 'N/A'}</p>
            <p><strong>Unit:</strong> ${unitNumber}</p>
            <p><strong>Status:</strong> ${tenant.status === 'active' ? 'Active' : 'Inactive'}</p>
          </div>
          <div class="action-buttons">
            <button class="action-button danger-btn" id="vacate-tenant-btn">Vacate Tenant</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#vacate-tenant-btn').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to vacate ${tenant.full_name} from unit ${unitNumber}? This will mark the unit as vacant and terminate their lease.`)) {
        try {
          await this.vacateTenant(tenant.id, null, unitNumber);
          modal.remove();
          this.loadPropertyTenants(document.getElementById('page-content'));
        } catch (error) {
          alert('Error vacating tenant: ' + error.message);
        }
      }
    });
  },

  // Vacate tenant logic
  async vacateTenant(tenantId, unitId, unitNumber) {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Deactivate TenantUnit record
    const tenantUnits = await apiClient.getTenantUnits();
    const tenantUnitRecord = tenantUnits.find(tu => tu.tenant == tenantId && tu.is_active);
    if (tenantUnitRecord) {
      await apiClient.updateTenantUnit(tenantUnitRecord.id, {
        is_active: false,
        move_out_date: today
      });
      unitId = tenantUnitRecord.unit; // Get unit ID from record if not provided
    }

    // 2. Terminate lease if exists
    const leases = await apiClient.getLeases();
    const activeLease = leases.find(l => l.tenant == tenantId && l.status === 'active');
    if (activeLease) {
      await apiClient.updateLease(activeLease.id, { status: 'terminated' });
    }

    // 3. Update unit status to vacant
    if (unitId) {
      await apiClient.updateUnit(unitId, { status: 'vacant' });
    }

    // 4. Set tenant status to inactive
    await apiClient.updateTenant(tenantId, { status: 'inactive' });
  },

  // Inactive Tenant Modal (Re-lease or Delete)
  showInactiveTenantModal(tenant, unitId, unitNumber, property) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Inactive Tenant</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tenant-info-summary">
            <h3>${tenant.full_name || tenant.name}</h3>
            <p><strong>Phone:</strong> ${tenant.phone || 'N/A'}</p>
            <p><strong>Last Unit:</strong> ${unitNumber || 'N/A'}</p>
            <p><strong>Status:</strong> Inactive</p>
          </div>
          <div class="action-buttons">
            <button class="action-button primary-btn" id="re-lease-btn">Re-lease</button>
            <button class="action-button danger-btn" id="delete-tenant-btn">Delete Tenant</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#re-lease-btn').addEventListener('click', () => {
      modal.remove();
      // Show unit selector for re-leasing
      this.showReLeaseUnitSelector(tenant, property);
    });

    modal.querySelector('#delete-tenant-btn').addEventListener('click', async () => {
      const tenantName = tenant.full_name || tenant.name;
      const confirmed = confirm(`Are you sure you want to permanently delete ${tenantName}? This will remove all their history and cannot be undone.`);
      
      if (confirmed) {
        try {
          await this.deleteTenant(tenant.id);
          modal.remove();
          this.loadPropertyTenants(document.getElementById('page-content'), 'inactive');
        } catch (error) {
          alert('Error deleting tenant: ' + error.message);
        }
      }
    });
  },

  // Re-lease Unit Selector
  async showReLeaseUnitSelector(tenant, property) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    // Fetch vacant units
    const allUnits = await apiClient.getUnits();
    const propertyUnits = allUnits.filter(u => u.property == property.id && u.status === 'vacant');
    
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Select Unit for Re-lease</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tenant-info-summary">
            <h3>${tenant.full_name || tenant.name}</h3>
            <p>Select a vacant unit to assign this tenant:</p>
          </div>
          <div class="unit-selector-grid" id="re-lease-unit-grid">
            ${propertyUnits.map(unit => `
              <div class="unit-selector-tile" data-unit-id="${unit.id}" data-unit-number="${unit.unit_number}" data-rent="${unit.rent_amount}">
                ${unit.unit_number}
              </div>
            `).join('')}
          </div>
          ${propertyUnits.length === 0 ? '<p class="no-units-msg">No vacant units available.</p>' : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelectorAll('.unit-selector-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const unitId = parseInt(tile.dataset.unitId);
        const unitNumber = tile.dataset.unitNumber;
        const rentAmount = parseFloat(tile.dataset.rent);
        modal.remove();
        // Open lease agreement modal with isReLease flag
        Modals.showLeaseAgreementModal(tenant.id, tenant.full_name, unitId, unitNumber, rentAmount, true);
      });
    });
  },

  // Delete tenant logic (cascade delete)
  async deleteTenant(tenantId) {
    // Delete tenant directly and let backend FK cascade remove history.
    // This avoids partial failures when pre-deleting related records in the UI.
    await apiClient.deleteTenant(tenantId);
  },

  // Tenants (Legacy - kept for compatibility)
  async loadTenants(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Tenants</h1>
      <div class="page-header">
        <button class="action-button" id="create-tenant-btn">Create Tenant</button>
      </div>
      <ul class="data-list" id="tenants-list"></ul>
    `;

    this.attachContextSelectorHandler(container);

    document.getElementById('create-tenant-btn').addEventListener('click', () => {
      Modals.showTenantModal();
    });

    const list = document.getElementById('tenants-list');
    const property = AppState.getPropertyContext();

    try {
      const [allUnits, allLeases, allTenants] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getLeases(),
        apiClient.getTenants()
      ]);

      let filteredTenants = allTenants;
      
      if (property) {
        const propertyUnits = allUnits.filter(u => u.property == property.id);
        const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
        const propertyTenantIds = propertyLeases.map(l => l.tenant);
        filteredTenants = allTenants.filter(t => propertyTenantIds.includes(t.id));
      }

      if (!filteredTenants || filteredTenants.length === 0) {
        list.innerHTML = '<li>No tenants found.</li>';
        return;
      }

      list.innerHTML = filteredTenants.map(tenant => `
        <li class="data-item">
          <div class="data-item-content">
            <strong>${tenant.name || 'N/A'}</strong>
            <span>${tenant.email || 'N/A'} — ${tenant.phone || 'N/A'}</span>
          </div>
          <div class="data-item-actions">
            <button class="action-button-small edit-btn" data-id="${tenant.id}">Edit</button>
            <button class="action-button-small delete-btn" data-id="${tenant.id}">Delete</button>
          </div>
        </li>
      `).join('');

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const tenant = filteredTenants.find(t => t.id == id);
          Modals.showTenantModal(tenant);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this tenant?')) {
            try {
              await apiClient.deleteTenant(id);
              this.loadTenants(container);
            } catch (error) {
              alert('Error deleting tenant: ' + error.message);
            }
          }
        });
      });
    } catch (error) {
      list.innerHTML = `<li>Error loading tenants: ${error.message}</li>`;
    }
  },

  // Leases
  async loadLeases(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Leases</h1>
      <div class="page-header">
        <button class="action-button" id="create-lease-btn">Create Lease</button>
      </div>
      <ul class="data-list" id="leases-list"></ul>
    `;

    this.attachContextSelectorHandler(container);

    document.getElementById('create-lease-btn').addEventListener('click', () => {
      const property = AppState.getPropertyContext();
      Modals.showLeaseModal(null, property?.id);
    });

    const list = document.getElementById('leases-list');
    const property = AppState.getPropertyContext();

    try {
      const [allUnits, allLeases] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getLeases()
      ]);

      const filteredLeases = property 
        ? allLeases.filter(l => {
            const unit = allUnits.find(u => u.id == l.unit);
            return unit && unit.property == property.id;
          })
        : allLeases;

      if (!filteredLeases || filteredLeases.length === 0) {
        list.innerHTML = '<li>No leases found.</li>';
        return;
      }

      list.innerHTML = filteredLeases.map(lease => `
        <li class="data-item">
          <div class="data-item-content">
            <strong>${lease.lease_number || 'N/A'}</strong>
            <span>${lease.start_date || 'N/A'} — ${lease.end_date || 'N/A'}</span>
            <small>Status: ${lease.status || 'N/A'}</small>
          </div>
          <div class="data-item-actions">
            <button class="action-button-small edit-btn" data-id="${lease.id}">Edit</button>
            <button class="action-button-small delete-btn" data-id="${lease.id}">Delete</button>
          </div>
        </li>
      `).join('');

      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const lease = filteredLeases.find(l => l.id == id);
          Modals.showLeaseModal(lease, property?.id);
        });
      });

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this lease?')) {
            try {
              await apiClient.deleteLease(id);
              this.loadLeases(container);
            } catch (error) {
              alert('Error deleting lease: ' + error.message);
            }
          }
        });
      });
    } catch (error) {
      list.innerHTML = `<li>Error loading leases: ${error.message}</li>`;
    }
  },

  // Financials
  async loadFinancials(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Financials</h1>
      <div class="financials-tabs">
        <button class="tab-button active" data-tab="invoices">Invoices</button>
        <button class="tab-button" data-tab="payments">Payments</button>
        <button class="tab-button" data-tab="expenses">Expenses</button>
      </div>
      <div id="financials-content"></div>
    `;

    this.attachContextSelectorHandler(container);

    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.loadFinancialsTab(button.dataset.tab);
      });
    });

    this.loadFinancialsTab('invoices');
  },

  async loadFinancialsTab(tab) {
    const contentDiv = document.getElementById('financials-content');
    contentDiv.innerHTML = '<p>Loading...</p>';

    const property = AppState.getPropertyContext();

    try {
      const [allUnits, allLeases] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getLeases()
      ]);

      let propertyLeases = allLeases;
      if (property) {
        const propertyUnits = allUnits.filter(u => u.property == property.id);
        propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
      }

      let data;
      let title;

      switch (tab) {
        case 'invoices':
          data = await apiClient.getInvoices();
          title = 'Invoices';
          break;
        case 'payments':
          data = await apiClient.getPayments();
          title = 'Payments';
          break;
        case 'expenses':
          data = await apiClient.getExpenses();
          title = 'Expenses';
          break;
      }

      const filteredData = data.filter(item => {
        if (item.lease) {
          return propertyLeases.some(l => l.id == item.lease);
        }
        return false;
      });

      if (!filteredData || filteredData.length === 0) {
        contentDiv.innerHTML = `<p>No ${title.toLowerCase()} found.</p>`;
        return;
      }

      contentDiv.innerHTML = `
        <h2 class="section-title">${title}</h2>
        <ul class="data-list">
          ${filteredData.map(item => `
            <li>
              ${item.invoice_number || item.payment_number || item.expense_number || 'N/A'} — 
              ${item.amount || 'N/A'} — 
              ${item.status || item.date || 'N/A'}
            </li>
          `).join('')}
        </ul>
      `;
    } catch (error) {
      contentDiv.innerHTML = `<p>Error loading ${tab}: ${error.message}</p>`;
    }
  },

  // Maintenance
  async loadMaintenance(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Maintenance</h1>
      <div class="maintenance-header">
        <button class="action-button" id="create-maintenance-btn">Create Request</button>
      </div>
      <ul class="data-list" id="maintenance-list"></ul>
    `;

    this.attachContextSelectorHandler(container);

    const list = document.getElementById('maintenance-list');
    const property = AppState.getPropertyContext();

    try {
      const [allUnits, allRequests] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getMaintenanceRequests()
      ]);

      const filteredRequests = property
        ? allRequests.filter(r => {
            const unit = allUnits.find(u => u.id == r.unit);
            return unit && unit.property == property.id;
          })
        : allRequests;

      if (!filteredRequests || filteredRequests.length === 0) {
        list.innerHTML = '<li>No maintenance requests found.</li>';
        return;
      }

      list.innerHTML = filteredRequests.map(req => `
        <li>
          <div class="maintenance-item">
            <strong>${req.title || 'N/A'}</strong>
            <span class="maintenance-status status-${(req.status || 'pending').toLowerCase()}">${req.status || 'Pending'}</span>
            <p>${req.description || 'No description'}</p>
            <small>Unit: ${req.unit || 'N/A'} | Priority: ${req.priority || 'N/A'} | Created: ${req.created_date || 'N/A'}</small>
          </div>
        </li>
      `).join('');
    } catch (error) {
      list.innerHTML = `<li>Error loading maintenance requests: ${error.message}</li>`;
    }
  },

  // Reports
  async loadReports(container) {
    container.innerHTML = `
      ${this.renderContextSelector()}
      <h1 class="page-title">Reports</h1>
      <div class="reports-grid">
        <div class="report-card">
          <h3>Occupancy Rate</h3>
          <p id="occupancy-rate">Loading...</p>
        </div>
        <div class="report-card">
          <h3>Total Revenue</h3>
          <p id="total-revenue">Loading...</p>
        </div>
        <div class="report-card">
          <h3>Pending Maintenance</h3>
          <p id="pending-maintenance">Loading...</p>
        </div>
        <div class="report-card">
          <h3>Active Leases</h3>
          <p id="active-leases">Loading...</p>
        </div>
      </div>
      <h2 class="section-title">Recent Activity</h2>
      <ul class="data-list" id="recent-activity"></ul>
    `;

    this.attachContextSelectorHandler(container);

    const property = AppState.getPropertyContext();

    try {
      const [properties, units, leases, payments, maintenance] = await Promise.all([
        apiClient.getProperties(),
        apiClient.getUnits(),
        apiClient.getLeases(),
        apiClient.getPayments(),
        apiClient.getMaintenanceRequests()
      ]);

      // Filter by property if context is set
      let filteredUnits = units;
      let filteredLeases = leases;
      let filteredPayments = payments;
      let filteredMaintenance = maintenance;

      if (property) {
        filteredUnits = units.filter(u => u.property == property.id);
        filteredLeases = leases.filter(l => filteredUnits.some(u => u.id == l.unit));
        filteredPayments = payments.filter(p => filteredLeases.some(l => l.id == p.lease));
        filteredMaintenance = maintenance.filter(m => filteredUnits.some(u => u.id == m.unit));
      }

      // Calculate occupancy rate
      const totalUnits = filteredUnits.length;
      const occupiedUnits = filteredLeases.filter(l => l.status === 'active').length;
      const occupancyRate = totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : 0;
      document.getElementById('occupancy-rate').textContent = `${occupancyRate}%`;

      // Calculate total revenue
      const totalRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      document.getElementById('total-revenue').textContent = `${totalRevenue.toLocaleString()}`;

      // Count pending maintenance
      const pendingMaintenance = filteredMaintenance.filter(m => m.status === 'pending').length;
      document.getElementById('pending-maintenance').textContent = pendingMaintenance;

      // Count active leases
      const activeLeases = filteredLeases.filter(l => l.status === 'active').length;
      document.getElementById('active-leases').textContent = activeLeases;

      // Recent activity
      const recentActivity = [
        ...filteredLeases.slice(-3).map(l => ({ type: 'Lease', text: `${l.lease_number || 'N/A'} - ${l.status || 'N/A'}` })),
        ...filteredPayments.slice(-3).map(p => ({ type: 'Payment', text: `${p.payment_number || 'N/A'} - ${p.amount || 'N/A'}` })),
        ...filteredMaintenance.slice(-3).map(m => ({ type: 'Maintenance', text: `${m.title || 'N/A'} - ${m.status || 'N/A'}` }))
      ];

      const activityList = document.getElementById('recent-activity');
      if (recentActivity.length === 0) {
        activityList.innerHTML = '<li>No recent activity.</li>';
      } else {
        activityList.innerHTML = recentActivity.map(item => `
          <li><strong>${item.type}:</strong> ${item.text}</li>
        `).join('');
      }
    } catch (error) {
      container.innerHTML = `<p>Error loading reports: ${error.message}</p>`;
    }
  },

  // Main page loader
  loadPage(pageName) {
    const contentDiv = document.getElementById('page-content');
    contentDiv.innerHTML = '<p>Loading...</p>';

    // Handle back button action
    if (pageName === 'back-to-properties') {
      AppState.clearPropertyContext();
      this.updateSidebarVisibility();
      this.loadPage('properties');
      return;
    }

    // Property space pages - require property context
    const propertySpacePages = ['property-dashboard', 'property-units', 'property-tenants'];
    if (propertySpacePages.includes(pageName) && !AppState.getPropertyContext()) {
      this.loadProperties(contentDiv);
      return;
    }

    switch (pageName) {
      case 'properties':
        this.loadProperties(contentDiv);
        break;
      case 'property-dashboard':
        this.loadPropertyDashboard(contentDiv);
        break;
      case 'property-units':
        this.loadPropertyUnits(contentDiv);
        break;
      case 'property-tenants':
        this.loadPropertyTenants(contentDiv);
        break;
      case 'units':
        this.loadUnits(contentDiv);
        break;
      case 'landlords':
        this.loadLandlords(contentDiv);
        break;
      case 'tenants':
        this.loadTenants(contentDiv);
        break;
      case 'leases':
        this.loadLeases(contentDiv);
        break;
      case 'financials':
        this.loadFinancials(contentDiv);
        break;
      case 'maintenance':
        this.loadMaintenance(contentDiv);
        break;
      case 'reports':
        this.loadReports(contentDiv);
        break;
      default:
        contentDiv.innerHTML = '<p>Page not found</p>';
    }
  }
};
