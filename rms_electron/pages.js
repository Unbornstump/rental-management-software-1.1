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
    const propertyNavItems = document.getElementById('property-nav-items');
    if (propertyNavItems) {
      propertyNavItems.style.display = property ? 'block' : 'none';
    }
  },

  // Dashboard (Property Space Dashboard - shown when property is selected)
  async loadDashboard(container) {
    const property = AppState.getPropertyContext();

    // If no property context, show property list instead
    if (!property) {
      this.loadPropertyList(container);
      return;
    }

    container.innerHTML = `
      <div class="property-space-header">
        <div class="property-space-info">
          <h1 class="property-space-title">${property.name}</h1>
          <p class="property-space-subtitle">${property.address || 'No address'}</p>
        </div>
        <button class="action-button exit-property-btn" data-action="exit">← Back to Properties</button>
      </div>
      <div class="stats-grid" id="dashboard-stats"></div>
      <div class="dashboard-grid">
        <div class="quick-actions-panel">
          <h3 class="panel-title">Quick Actions</h3>
          <div class="quick-actions-list">
            <button class="quick-action-btn" data-action="add-unit">+ Add Unit</button>
            <button class="quick-action-btn" data-action="register-tenant">+ Register Tenant</button>
            <button class="quick-action-btn" data-action="create-lease">+ Create Lease</button>
            <button class="quick-action-btn" data-action="record-payment">+ Record Payment</button>
            <button class="quick-action-btn" data-action="add-maintenance">+ Log Maintenance</button>
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

    // Attach exit button handler
    const exitBtn = container.querySelector('.exit-property-btn');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        AppState.clearPropertyContext();
        this.updateSidebarVisibility();
        this.loadPage('properties');
      });
    }

    const statsGrid = document.getElementById('dashboard-stats');

    try {
      const [units, tenants, leases] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getTenants(),
        apiClient.getLeases()
      ]);

      // Filter by current property
      const filteredUnits = units.filter(u => u.property == property.id);
      const filteredLeases = leases.filter(l => filteredUnits.some(u => u.id == l.unit));

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon green">🚪</div>
            <div class="stat-card-title">Units</div>
          </div>
          <div class="stat-card-value">${filteredUnits.length}</div>
          <div class="stat-card-subtitle">Available: ${filteredUnits.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon orange">�</div>
            <div class="stat-card-title">Tenants</div>
          </div>
          <div class="stat-card-value">${tenants.length}</div>
          <div class="stat-card-subtitle">Active leases</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon purple">�</div>
            <div class="stat-card-title">Leases</div>
          </div>
          <div class="stat-card-value">${filteredLeases.length}</div>
          <div class="stat-card-subtitle">Expiring: 0</div>
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

  // Properties
  async loadProperties(container) {
    container.innerHTML = `
      <h1 class="page-title">Properties</h1>
      <div class="properties-grid" id="properties-grid"></div>
    `;

    const propertiesGrid = document.getElementById('properties-grid');

    try {
      const [properties, units, tenants] = await Promise.all([
        apiClient.getProperties(),
        apiClient.getUnits(),
        apiClient.getTenants()
      ]);

      // Calculate stats for each property
      const propertyStats = properties.map(prop => {
        const propUnits = units.filter(u => u.property == prop.id);
        const propTenants = tenants.filter(t => propUnits.some(u => u.id == t.unit));
        return {
          ...prop,
          unitCount: propUnits.length,
          tenantCount: propTenants.length
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
            this.loadPage('dashboard');
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

  // Units
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

  // Tenants
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

    // Navigation guard: property-specific pages require a property context
    const propertySpecificPages = ['units', 'landlords', 'tenants', 'leases', 'financials', 'maintenance', 'reports'];
    if (propertySpecificPages.includes(pageName) && !AppState.getPropertyContext()) {
      contentDiv.innerHTML = `
        <div class="guard-message">
          <h2 class="guard-title">Select a Property First</h2>
          <p class="guard-text">Please select a property from the dropdown above to view this section.</p>
          <button class="action-button" onclick="document.querySelector('[data-page=\'properties\']')?.click()">Go to Properties</button>
        </div>
      `;
      return;
    }

    switch (pageName) {
      case 'dashboard':
        this.loadDashboard(contentDiv);
        break;
      case 'properties':
        this.loadProperties(contentDiv);
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
