// Property Pages Module
// Handles property dashboard and property list pages

const PropertyPages = {
  // Property Dashboard (Property Space Dashboard - shown when property is selected)
  async loadPropertyDashboard(container) {
    const property = AppState.getPropertyContext();

    if (!property) {
      this.loadProperties(container);
      return;
    }

    container.innerHTML = `
      ${SharedComponents.renderPropertySpaceHeader('Dashboard', property.name)}
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

      const filteredUnits = units.filter(u => u.property == property.id);
      const filteredLeases = leases.filter(l => filteredUnits.some(u => u.id == l.unit));
      const activeLeases = filteredLeases.filter(l => l.status === 'active');
      
      const occupiedUnitIds = activeLeases.map(l => l.unit);
      const occupiedUnitsCount = new Set(occupiedUnitIds).size;
      const vacantUnits = filteredUnits.length - occupiedUnitsCount;
      const occupancyRate = filteredUnits.length > 0 ? ((occupiedUnitsCount / filteredUnits.length) * 100).toFixed(0) : 0;
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
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
      
      const activeTenantIds = activeLeases.map(l => l.tenant);
      const activeTenants = tenants.filter(t => activeTenantIds.includes(t.id)).length;

      statsGrid.innerHTML = `
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Total Units</div></div>
          <div class="stat-card-value">${filteredUnits.length}</div>
          <div class="stat-card-subtitle">${occupiedUnitsCount} occupied, ${vacantUnits} vacant</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Occupancy Rate</div></div>
          <div class="stat-card-value">${occupancyRate}%</div>
          <div class="stat-card-subtitle">${occupiedUnitsCount} of ${filteredUnits.length} units</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Active Tenants</div></div>
          <div class="stat-card-value">${activeTenants}</div>
          <div class="stat-card-subtitle">With active leases</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Rent Expected</div></div>
          <div class="stat-card-value">${totalRentExpected.toLocaleString()}</div>
          <div class="stat-card-subtitle">This month</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Rent Collected</div></div>
          <div class="stat-card-value">${totalRentCollected.toLocaleString()}</div>
          <div class="stat-card-subtitle">This month</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header"><div class="stat-card-title">Outstanding</div></div>
          <div class="stat-card-value">${outstandingRent.toLocaleString()}</div>
          <div class="stat-card-subtitle">This month</div>
        </div>
      `;

      container.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          SharedComponents.handleQuickAction(action);
        });
      });
    } catch (error) {
      statsGrid.innerHTML = `<p>Error loading dashboard: ${error.message}</p>`;
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

      const propertyStats = properties.map(prop => {
        const propUnits = units.filter(u => u.property == prop.id);
        const propLeases = tenants.filter(t => propUnits.some(u => u.id == t.unit));
        return {
          ...prop,
          unitCount: propUnits.length,
          tenantCount: propLeases.length
        };
      });

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

      gridHTML += `
        <div class="property-card add-property-card">
          <div class="add-property-icon">+</div>
          <span class="add-property-label">Add another property</span>
        </div>
      `;

      propertiesGrid.innerHTML = gridHTML;

      container.querySelectorAll('.property-card.clickable').forEach(card => {
        card.addEventListener('click', () => {
          const propertyId = card.dataset.propertyId;
          const property = AppState.getPropertyById(propertyId);
          if (property) {
            AppState.setPropertyContext(property);
            SharedComponents.updateSidebarVisibility();
            PageLoaders.loadPage('property-dashboard');
          }
        });
      });

      const addCard = container.querySelector('.add-property-card');
      if (addCard) {
        addCard.addEventListener('click', () => Modals.showPropertyModal());
      }
    } catch (error) {
      propertiesGrid.innerHTML = `<p>Error loading properties: ${error.message}</p>`;
    }
  }
};
