// Tenants Pages Module
// Handles property tenants and legacy tenants pages

const TenantsPages = {
  // Property Tenants (Property Space - Tenants module)
  async loadPropertyTenants(container, params = {}) {
    const initialFilter = typeof params === 'string' ? params : (params.filter || 'active');
    const property = AppState.getPropertyContext();

    if (!property) {
      PropertyPages.loadProperties(container);
      return;
    }

    container.innerHTML = `
      ${SharedComponents.renderPropertySpaceHeader('Tenants', property.name, `
        <button class="action-button" id="create-tenant-btn">+ Register Tenant</button>
      `)}
      <div class="tenant-filter-tabs">
        <button class="filter-tab ${initialFilter === 'active' ? 'active' : ''}" data-filter="active">Active Tenants</button>
        <button class="filter-tab ${initialFilter === 'inactive' ? 'active' : ''}" data-filter="inactive">Inactive Tenants</button>
        ${initialFilter === 'expiring' ? '<button class="filter-tab active" data-filter="expiring">Expiring Leases</button>' : ''}
      </div>
      <div class="tenants-grid" id="tenants-grid"></div>
    `;

    document.getElementById('create-tenant-btn').addEventListener('click', () => {
      Modals.showTenantModal(null, property.id);
    });

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

      container.tenantData = {
        property,
        allUnits,
        allLeases,
        allTenants,
        allTenantUnits
      };

      this.renderTenantsGrid(container, property, initialFilter);
    } catch (error) {
      tenantsGrid.innerHTML = `<p>Error loading tenants: ${error.message}</p>`;
    }
  },

  renderTenantsGrid(container, property, filter) {
    const data = container.tenantData;
    if (!data) return;

    const { allUnits, allLeases, allTenants, allTenantUnits } = data;
    const tenantsGrid = container.querySelector('#tenants-grid');

    const propertyUnits = allUnits.filter(u => u.property == property.id);
    const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
    const activeLeases = propertyLeases.filter(l => l.status === 'active');
    const propertyTenantUnits = allTenantUnits.filter(tu => propertyUnits.some(u => u.id == tu.unit));

    const allPropertyTenantIds = [...new Set([...propertyLeases.map(l => l.tenant), ...propertyTenantUnits.map(tu => tu.tenant)])];
    const allPropertyTenants = allTenants.filter(t => allPropertyTenantIds.includes(t.id));

    const filteredTenants = allPropertyTenants.filter(t => {
      if (filter === 'expiring') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + 14);
        return propertyLeases.some(l => {
          if (l.tenant != t.id || l.status !== 'active') return false;
          const end = new Date(l.end_date);
          return end >= today && end <= cutoff;
        });
      }
      if (filter === 'active') {
        return t.status === 'active';
      }
      return t.status === 'inactive';
    });

    if (filteredTenants.length === 0) {
      const emptyTitles = {
        active: 'No Active Tenants',
        inactive: 'No Inactive Tenants',
        expiring: 'No Expiring Leases',
      };
      const emptyMessages = {
        active: 'No active tenants. Register your first tenant to get started.',
        inactive: 'No inactive tenants. Tenants appear here after vacating.',
        expiring: 'No leases expiring within the next 14 days.',
      };
      tenantsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">${emptyTitles[filter] || 'No Tenants'}</h3>
          <p class="empty-state-text">${emptyMessages[filter] || ''}</p>
          ${filter === 'active' ? `<button class="action-button" onclick="Modals.showTenantModal(null, ${property.id})">+ Register Tenant</button>` : ''}
        </div>
      `;
      return;
    }

    tenantsGrid.innerHTML = filteredTenants.map(tenant => {
      const tenantLease = activeLeases.find(l => l.tenant == tenant.id);
      const tenantUnitRecords = propertyTenantUnits.filter(tu => tu.tenant == tenant.id);
      const tenantUnitRecord = tenantUnitRecords.find(tu => tu.is_active)
        || tenantUnitRecords.sort((a, b) => new Date(b.move_in_date) - new Date(a.move_in_date))[0];
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
          this.showInactiveTenantModal(tenant, unitId, unitNumber, property);
        } else if (!hasLease) {
          this.showTenantOptionsModal(tenant, unitId, unitNumber, property);
        } else {
          this.showTenantDetailModal(tenant, unitNumber, property);
        }
      });
    });
  },

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
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#create-lease-btn').addEventListener('click', () => {
      modal.remove();
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
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

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

  async vacateTenant(tenantId, unitId, unitNumber) {
    const today = new Date().toISOString().split('T')[0];
    
    const tenantUnits = await apiClient.getTenantUnits();
    const tenantUnitRecord = tenantUnits.find(tu => tu.tenant == tenantId && tu.is_active);
    if (tenantUnitRecord) {
      await apiClient.updateTenantUnit(tenantUnitRecord.id, {
        is_active: false,
        move_out_date: today
      });
      unitId = tenantUnitRecord.unit;
    }

    const leases = await apiClient.getLeases();
    const activeLease = leases.find(l => l.tenant == tenantId && l.status === 'active');
    if (activeLease) {
      await apiClient.updateLease(activeLease.id, { status: 'terminated' });
    }

    if (unitId) {
      await apiClient.updateUnit(unitId, { status: 'vacant' });
    }

    await apiClient.updateTenant(tenantId, { status: 'inactive' });
  },

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
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#re-lease-btn').addEventListener('click', () => {
      modal.remove();
      Modals.showReLeaseUnitSelector(tenant, property);
    });

    modal.querySelector('#delete-tenant-btn').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to delete ${tenant.full_name}? This action cannot be undone.`)) {
        try {
          await apiClient.deleteTenant(tenant.id);
          modal.remove();
          this.loadPropertyTenants(document.getElementById('page-content'));
        } catch (error) {
          alert('Error deleting tenant: ' + error.message);
        }
      }
    });
  },

  // Legacy Tenants page
  async loadTenants(container) {
    container.innerHTML = `
      ${SharedComponents.renderContextSelector()}
      <h1 class="page-title">Tenants</h1>
      <div class="page-header">
        <button class="action-button" id="create-tenant-btn">Create Tenant</button>
      </div>
      <ul class="data-list" id="tenants-list"></ul>
    `;

    SharedComponents.attachContextSelectorHandler(container);

    document.getElementById('create-tenant-btn').addEventListener('click', () => {
      Modals.showTenantModal();
    });

    const list = document.getElementById('tenants-list');
    const property = AppState.getPropertyContext();

    try {
      const tenants = await apiClient.getTenants();
      const filteredTenants = property ? tenants.filter(t => {
        // Filter by property if property context is set
        // This would require additional logic to get tenant's property
        return true; // For now, show all tenants
      }) : tenants;

      if (!filteredTenants || filteredTenants.length === 0) {
        list.innerHTML = '<li>No tenants found.</li>';
        return;
      }

      list.innerHTML = filteredTenants.map(tenant => `
        <li class="data-item">
          <div class="data-item-content">
            <strong>${tenant.full_name || tenant.name || 'N/A'}</strong>
            <span>${tenant.phone || 'N/A'} — ${tenant.email || 'N/A'}</span>
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
  }
};
