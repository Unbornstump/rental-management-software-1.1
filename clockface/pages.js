// Page Loaders for RMS
// Main routing and page loader coordinator

const PageLoaders = {
  // Context selector component - delegated to SharedComponents
  renderContextSelector() {
    return SharedComponents.renderContextSelector();
  },

  attachContextSelectorHandler(container) {
    SharedComponents.attachContextSelectorHandler(container);
  },

  updateSidebarVisibility() {
    SharedComponents.updateSidebarVisibility();
  },

  syncNavActiveState(pageName) {
    const navMap = {
      'property-dashboard': 'property-dashboard',
      'property-units': 'property-units',
      'property-tenants': 'property-tenants',
      'financials': 'financials',
      'financials-tenant-detail': 'financials',
    };
    const activePage = navMap[pageName];
    if (!activePage) return;

    document.querySelectorAll('.nav-button[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === activePage);
    });
  },

  renderPropertySpaceHeader(title, propertyName, actionsHtml = '') {
    return SharedComponents.renderPropertySpaceHeader(title, propertyName, actionsHtml);
  },

  // Property Dashboard - delegated to PropertyPages
  async loadPropertyDashboard(container) {
    PropertyPages.loadPropertyDashboard(container);
  },

  // Properties - delegated to PropertyPages
  async loadProperties(container) {
    PropertyPages.loadProperties(container);
  },

  // Property Units - delegated to UnitsPages
  async loadPropertyUnits(container) {
    UnitsPages.loadPropertyUnits(container);
  },

  // Units (Legacy) - delegated to UnitsPages
  async loadUnits(container) {
    UnitsPages.loadUnits(container);
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

  // Property Tenants - delegated to TenantsPages
  async loadPropertyTenants(container, params = {}) {
    TenantsPages.loadPropertyTenants(container, params);
  },

  // Tenants (Legacy) - delegated to TenantsPages
  async loadTenants(container) {
    TenantsPages.loadTenants(container);
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
  navigate(pageName, params = {}) {
    AppState.setPageParams(params);
    this.loadPage(pageName);
  },

  loadPage(pageName) {
    const contentDiv = document.getElementById('page-content');
    contentDiv.innerHTML = '<p>Loading...</p>';

    // Track current page
    AppState.setCurrentPage(pageName);

    // Handle back button action
    if (pageName === 'back-to-properties') {
      AppState.clearPropertyContext();
      AppState.clearPageParams();
      AppState.setCurrentPage('properties');
      this.updateSidebarVisibility();
      contentDiv.innerHTML = '';
      this.loadProperties(contentDiv);
      return;
    }

    // Property space pages - require property context
    const propertySpacePages = ['property-dashboard', 'property-units', 'property-tenants', 'financials-tenant-detail'];
    if (propertySpacePages.includes(pageName) && !AppState.getPropertyContext()) {
      AppState.setCurrentPage('properties');
      this.loadProperties(contentDiv);
      this.updateSidebarVisibility();
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
        TenantsPages.loadPropertyTenants(contentDiv, AppState.getPageParams());
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
      case 'treasury':
        // Load treasury (formerly financials) with an error fallback so failures show a clear message
        try {
          const p = FinancialsPages.loadFinancials(contentDiv, AppState.getPageParams());
          if (p && typeof p.then === 'function') {
            p.catch(err => {
              contentDiv.innerHTML = `<p class="error-text">Couldn't load treasury — try again (${err.message})</p>`;
            });
          }
        } catch (err) {
          contentDiv.innerHTML = `<p class="error-text">Couldn't load treasury — try again (${err.message})</p>`;
        }
        break;
      case 'financials-tenant-detail':
      case 'treasury-tenant-detail':
        FinancialsPages.loadTenantDetail(contentDiv, AppState.getPageParams());
        break;
      case 'maintenance':
        this.loadMaintenance(contentDiv);
        break;
      case 'reports':
        this.loadReports(contentDiv);
        break;
      case 'admin-hub':
        AdminPages.loadAdminHub();
        break;
      case 'admin-staff':
        AdminPages.loadStaffManagement();
        break;
      case 'admin-roles':
        AdminPages.loadRolesPermissions();
        break;
      case 'admin-audit':
        AdminPages.loadAuditLog();
        break;
      case 'admin-settings':
        AdminPages.loadSystemSettings();
        break;
      default:
        contentDiv.innerHTML = '<p>Page not found</p>';
    }

    // Update sidebar visibility and nav state after page load
    this.updateSidebarVisibility();
    this.syncNavActiveState(pageName);
  }
};
