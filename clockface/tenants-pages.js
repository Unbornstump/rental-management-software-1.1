// Tenants Pages Module
// Handles property tenants and legacy tenants pages

const TenantsPages = {
  // Preset colors for initials circles (deterministic based on name hash)
  INITIALS_COLORS: [
    '#2f80ed', // Blue
    '#27ae60', // Green
    '#f39c12', // Orange
    '#e74c3c', // Red
    '#9b59b6', // Purple
    '#1abc9c'  // Teal
  ],

  // Get deterministic color for initials based on name
  getInitialsColor(name) {
    if (!name) return this.INITIALS_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % this.INITIALS_COLORS.length;
    return this.INITIALS_COLORS[index];
  },

  // Extract initials from name
  getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  },

  // Get payment status for a tenant for current month
  getPaymentStatus(tenantId, rentPayments) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const tenantPayments = rentPayments.filter(p => 
      p.tenant == tenantId && 
      p.month === currentMonth && 
      p.year === currentYear
    );
    
    if (tenantPayments.length === 0) {
      return { status: 'no_record', color: '#95a5a6', label: 'No record' };
    }
    
    const totalPaid = tenantPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const totalDue = tenantPayments.reduce((sum, p) => sum + (p.amount_due || 0), 0);
    
    if (totalPaid >= totalDue) {
      return { status: 'paid', color: '#27ae60', label: 'Paid' };
    } else if (totalPaid > 0) {
      return { status: 'partial', color: '#f39c12', label: 'Partial' };
    } else {
      return { status: 'unpaid', color: '#e74c3c', label: 'Unpaid' };
    }
  },

  // Get lease expiry info
  getLeaseExpiry(lease) {
    if (!lease || lease.status !== 'active') {
      return { text: 'No active lease', color: '#95a5a6', days: null };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(lease.end_date);
    endDate.setHours(0, 0, 0, 0);
    
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Lease expired', color: '#e74c3c', days: diffDays };
    } else if (diffDays <= 7) {
      return { text: `Lease ends in ${diffDays} days`, color: '#f39c12', days: diffDays, isExpiringSoon: true };
    } else {
      return { text: `Lease ends in ${diffDays} days`, color: '#27ae60', days: diffDays };
    }
  },

  // Get payment streak for tenant
  getPaymentStreak(tenantId, rentPayments) {
    const now = new Date();
    let streak = 0;
    let checkDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    while (true) {
      const month = checkDate.getMonth() + 1;
      const year = checkDate.getFullYear();
      
      const payment = rentPayments.find(p => 
        p.tenant == tenantId && 
        p.month === month && 
        p.year === year &&
        (p.amount_paid || 0) >= (p.amount_due || 0)
      );
      
      if (payment) {
        streak++;
        checkDate.setMonth(checkDate.getMonth() - 1);
      } else {
        break;
      }
      
      // Safety limit - don't check more than 24 months back
      if (streak >= 24) break;
    }
    
    return streak >= 3 ? streak : 0;
  },
  // Property Tenants (Property Space - Tenants module)
  async loadPropertyTenants(container, params = {}) {
    const initialFilter = typeof params === 'string' ? params : (params.filter || 'all');
    const property = AppState.getPropertyContext();

    if (!property) {
      PropertyPages.loadProperties(container);
      return;
    }

    container.innerHTML = `
      ${SharedComponents.renderPropertySpaceHeader('Tenants', property.name, `
        <button class="action-button" id="create-tenant-btn">+ Register Tenant</button>
      `)}
      <div class="tenants-summary-bar" id="tenants-summary-bar">
        <span class="summary-text">Loading...</span>
      </div>
      <div class="tenants-search-wrapper">
        <input type="text" class="tenants-search-input" id="tenants-search" placeholder="Search tenants...">
      </div>
      <div class="tenant-filter-pills" id="tenant-filter-pills"></div>
      <div class="tenants-stats-bar" id="tenants-stats-bar"></div>
      <div class="tenants-grid" id="tenants-grid"></div>
    `;

    document.getElementById('create-tenant-btn').addEventListener('click', () => {
      Modals.showTenantModal(null, property.id);
    });

    const searchInput = document.getElementById('tenants-search');
    let searchQuery = '';
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      this.renderTenantsGrid(container, property, initialFilter, searchQuery);
    });

    let currentFilter = initialFilter;

    const tenantsGrid = document.getElementById('tenants-grid');

    try {
      const [allUnits, allLeases, allTenants, allTenantUnits, rentPayments] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getLeases(),
        apiClient.getTenants(),
        apiClient.getTenantUnits(),
        apiClient.getRentPayments({ property: property.id })
      ]);

      container.tenantData = {
        property,
        allUnits,
        allLeases,
        allTenants,
        allTenantUnits,
        rentPayments
      };

      this.renderSummaryBar(container);
      this.renderFilterPills(container, currentFilter);
      this.renderStatsBar(container);
      this.renderTenantsGrid(container, property, currentFilter, searchQuery);
    } catch (error) {
      tenantsGrid.innerHTML = `<p>Error loading tenants: ${error.message}</p>`;
    }
  },

  renderSummaryBar(container) {
    const data = container.tenantData;
    if (!data) return;

    const { property, allTenants, allUnits, allLeases, allTenantUnits, rentPayments } = data;
    
    const propertyUnits = allUnits.filter(u => u.property == property.id);
    const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
    const propertyTenantUnits = allTenantUnits.filter(tu => propertyUnits.some(u => u.id == tu.unit));
    
    const allPropertyTenantIds = [...new Set([...propertyLeases.map(l => l.tenant), ...propertyTenantUnits.map(tu => tu.tenant)])];
    const allPropertyTenants = allTenants.filter(t => allPropertyTenantIds.includes(t.id));
    
    const activeCount = allPropertyTenants.filter(t => t.status === 'active').length;
    const inactiveCount = allPropertyTenants.filter(t => t.status === 'inactive').length;
    
    // Calculate unpaid count for current month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let unpaidCount = 0;
    allPropertyTenants.forEach(tenant => {
      const paymentStatus = this.getPaymentStatus(tenant.id, rentPayments);
      if (paymentStatus.status === 'unpaid') {
        unpaidCount++;
      }
    });
    
    const summaryBar = container.querySelector('#tenants-summary-bar');
    const unpaidColor = unpaidCount > 0 ? '#e74c3c' : '#27ae60';
    const unpaidText = unpaidCount > 0 ? `${unpaidCount} unpaid this month` : 'All paid this month';
    
    summaryBar.innerHTML = `
      <span class="summary-text">${activeCount} active · ${inactiveCount} inactive · <span style="color: ${unpaidColor}">${unpaidText}</span></span>
    `;
  },

  renderFilterPills(container, activeFilter) {
    const data = container.tenantData;
    if (!data) return;

    const { property, allTenants, allUnits, allLeases, allTenantUnits, rentPayments } = data;
    
    const propertyUnits = allUnits.filter(u => u.property == property.id);
    const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
    const propertyTenantUnits = allTenantUnits.filter(tu => propertyUnits.some(u => u.id == tu.unit));
    
    const allPropertyTenantIds = [...new Set([...propertyLeases.map(l => l.tenant), ...propertyTenantUnits.map(tu => tu.tenant)])];
    const allPropertyTenants = allTenants.filter(t => allPropertyTenantIds.includes(t.id));
    
    const totalCount = allPropertyTenants.length;
    const activeCount = allPropertyTenants.filter(t => t.status === 'active').length;
    const inactiveCount = allPropertyTenants.filter(t => t.status === 'inactive').length;
    
    let unpaidCount = 0;
    let expiringCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 7);
    
    allPropertyTenants.forEach(tenant => {
      const paymentStatus = this.getPaymentStatus(tenant.id, rentPayments);
      if (paymentStatus.status === 'unpaid') {
        unpaidCount++;
      }
      
      const tenantLease = propertyLeases.find(l => l.tenant == tenant.id && l.status === 'active');
      if (tenantLease) {
        const endDate = new Date(tenantLease.end_date);
        if (endDate >= today && endDate <= cutoff) {
          expiringCount++;
        }
      }
    });
    
    const filters = [
      { id: 'all', label: 'All', count: totalCount },
      { id: 'active', label: 'Active', count: activeCount },
      { id: 'inactive', label: 'Inactive', count: inactiveCount },
      { id: 'unpaid', label: 'Unpaid', count: unpaidCount },
      { id: 'expiring', label: 'Expiring', count: expiringCount }
    ];
    
    const filterPills = container.querySelector('#tenant-filter-pills');
    filterPills.innerHTML = filters.map(f => `
      <button class="filter-pill ${activeFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
        ${f.label} (${f.count})
      </button>
    `).join('');
    
    filterPills.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const filter = pill.dataset.filter;
        const searchQuery = container.querySelector('#tenants-search').value.toLowerCase();
        this.renderFilterPills(container, filter);
        this.renderTenantsGrid(container, property, filter, searchQuery);
      });
    });
  },

  renderStatsBar(container) {
    const data = container.tenantData;
    if (!data) return;

    const { property, allTenants, allUnits, allLeases, allTenantUnits, rentPayments } = data;
    
    const propertyUnits = allUnits.filter(u => u.property == property.id);
    const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
    const propertyTenantUnits = allTenantUnits.filter(tu => propertyUnits.some(u => u.id == tu.unit));
    
    const allPropertyTenantIds = [...new Set([...propertyLeases.map(l => l.tenant), ...propertyTenantUnits.map(tu => tu.tenant)])];
    const allPropertyTenants = allTenants.filter(t => allPropertyTenantIds.includes(t.id));
    
    const totalCount = allPropertyTenants.length;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;
    
    allPropertyTenants.forEach(tenant => {
      const paymentStatus = this.getPaymentStatus(tenant.id, rentPayments);
      if (paymentStatus.status === 'paid') paidCount++;
      else if (paymentStatus.status === 'unpaid') unpaidCount++;
      else if (paymentStatus.status === 'partial') partialCount++;
    });
    
    const statsBar = container.querySelector('#tenants-stats-bar');
    statsBar.innerHTML = `
      <div class="stats-bar">
        <span class="stat-item" data-filter="all">Total ${totalCount}</span>
        <span class="stat-item" data-filter="paid">Paid ${paidCount}</span>
        <span class="stat-item" data-filter="unpaid">Unpaid ${unpaidCount}</span>
        <span class="stat-item" data-filter="partial">Partial ${partialCount}</span>
      </div>
    `;
    
    statsBar.querySelectorAll('.stat-item').forEach(item => {
      item.addEventListener('click', () => {
        const filter = item.dataset.filter;
        const searchQuery = container.querySelector('#tenants-search').value.toLowerCase();
        
        // Map stat filter to pill filter
        let pillFilter = 'all';
        if (filter === 'unpaid') pillFilter = 'unpaid';
        
        this.renderFilterPills(container, pillFilter);
        this.renderTenantsGrid(container, property, pillFilter, searchQuery);
      });
    });
  },

  renderTenantsGrid(container, property, filter, searchQuery = '') {
    const data = container.tenantData;
    if (!data) return;

    const { allUnits, allLeases, allTenants, allTenantUnits, rentPayments } = data;
    const tenantsGrid = container.querySelector('#tenants-grid');

    const propertyUnits = allUnits.filter(u => u.property == property.id);
    const propertyLeases = allLeases.filter(l => propertyUnits.some(u => u.id == l.unit));
    const activeLeases = propertyLeases.filter(l => l.status === 'active');
    const propertyTenantUnits = allTenantUnits.filter(tu => propertyUnits.some(u => u.id == tu.unit));

    const allPropertyTenantIds = [...new Set([...propertyLeases.map(l => l.tenant), ...propertyTenantUnits.map(tu => tu.tenant)])];
    const allPropertyTenants = allTenants.filter(t => allPropertyTenantIds.includes(t.id));

    const filteredTenants = allPropertyTenants.filter(t => {
      // Apply search filter
      if (searchQuery) {
        const name = (t.full_name || t.name || '').toLowerCase();
        const phone = (t.phone || '').toLowerCase();
        if (!name.includes(searchQuery) && !phone.includes(searchQuery)) {
          return false;
        }
      }
      
      // Apply status filter
      if (filter === 'expiring') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() + 7);
        return propertyLeases.some(l => {
          if (l.tenant != t.id || l.status !== 'active') return false;
          const end = new Date(l.end_date);
          return end >= today && end <= cutoff;
        });
      }
      if (filter === 'unpaid') {
        const paymentStatus = this.getPaymentStatus(t.id, rentPayments);
        return paymentStatus.status === 'unpaid';
      }
      if (filter === 'active') {
        return t.status === 'active';
      }
      if (filter === 'inactive') {
        return t.status === 'inactive';
      }
      return true; // 'all' filter
    });

    if (filteredTenants.length === 0) {
      let emptyTitle = 'No Tenants';
      let emptyMessage = '';
      let showButton = false;
      
      if (searchQuery) {
        emptyTitle = `No tenants match '${searchQuery}'`;
        emptyMessage = `<a href="#" class="clear-search-link">Clear search</a>`;
      } else if (allPropertyTenants.length === 0) {
        emptyTitle = 'No tenants yet';
        emptyMessage = 'Register one to get started';
        showButton = true;
      } else if (filter === 'active') {
        emptyTitle = 'No Active Tenants';
        emptyMessage = 'No active tenants. Register your first tenant to get started.';
        showButton = true;
      } else if (filter === 'inactive') {
        emptyTitle = 'No Inactive Tenants';
        emptyMessage = 'No inactive tenants. Tenants appear here after vacating.';
      } else if (filter === 'unpaid') {
        emptyTitle = 'No Unpaid Tenants';
        emptyMessage = 'All tenants have paid this month!';
      } else if (filter === 'expiring') {
        emptyTitle = 'No Expiring Leases';
        emptyMessage = 'No leases expiring within the next 7 days.';
      }
      
      tenantsGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3 class="empty-state-title">${emptyTitle}</h3>
          <p class="empty-state-text">${emptyMessage}</p>
          ${showButton ? `<button class="action-button" onclick="Modals.showTenantModal(null, ${property.id})">+ Register Tenant</button>` : ''}
        </div>
      `;
      
      // Add clear search handler
      const clearLink = tenantsGrid.querySelector('.clear-search-link');
      if (clearLink) {
        clearLink.addEventListener('click', (e) => {
          e.preventDefault();
          container.querySelector('#tenants-search').value = '';
          this.renderTenantsGrid(container, property, filter, '');
        });
      }
      return;
    }

    tenantsGrid.innerHTML = filteredTenants.map(tenant => {
      const tenantLease = activeLeases.find(l => l.tenant == tenant.id);
      const tenantUnitRecords = propertyTenantUnits.filter(tu => tu.tenant == tenant.id);
      const tenantUnitRecord = tenantUnitRecords.find(tu => tu.is_active)
        || tenantUnitRecords.sort((a, b) => new Date(b.move_in_date) - new Date(a.move_in_date))[0];
      
      let unitNumber = 'Not assigned';
      let unitId = null;
      let rentAmount = 0;

      if (tenantUnitRecord) {
        const unit = propertyUnits.find(u => u.id == tenantUnitRecord.unit);
        if (unit) {
          unitNumber = unit.unit_number;
          unitId = unit.id;
          rentAmount = unit.rent_amount || 0;
        }
      } else if (tenantLease) {
        const unit = propertyUnits.find(u => u.id == tenantLease.unit);
        if (unit) {
          unitNumber = unit.unit_number;
          unitId = unit.id;
          rentAmount = unit.rent_amount || 0;
        }
      }
      
      // Get payment status
      const paymentStatus = this.getPaymentStatus(tenant.id, rentPayments);
      
      // Get lease expiry
      const leaseExpiry = this.getLeaseExpiry(tenantLease);
      
      // Get payment streak
      const streak = this.getPaymentStreak(tenant.id, rentPayments);
      
      // Get initials and color
      const initials = this.getInitials(tenant.full_name || tenant.name);
      const initialsColor = this.getInitialsColor(tenant.full_name || tenant.name);
      
      const tenantName = tenant.full_name || tenant.name || 'N/A';
      
      return `
        <div class="tenant-card-minimal" 
             style="border-left-color: ${paymentStatus.color}"
             data-tenant-id="${tenant.id}" 
             data-unit-id="${unitId || ''}" 
             data-unit-number="${unitNumber}">
          <div class="tenant-card-top">
            <div class="initials-circle" style="background-color: ${initialsColor}">
              ${initials}
              ${streak > 0 ? `<span class="streak-badge">🔥 ${streak}</span>` : ''}
            </div>
            <div class="payment-status">
              <span class="payment-dot" style="background-color: ${paymentStatus.color}"></span>
              <span class="payment-label" style="color: ${paymentStatus.color}">${paymentStatus.label}</span>
            </div>
          </div>
          <h3 class="tenant-name">${tenantName}</h3>
          <p class="tenant-unit-rent">${unitNumber} · KES ${rentAmount.toLocaleString()}/mo</p>
          <p class="tenant-lease-status" style="color: ${leaseExpiry.color}">
            ${leaseExpiry.isExpiringSoon ? '<span class="expiring-dot">●</span> ' : ''}${leaseExpiry.text}
          </p>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.tenant-card-minimal').forEach(card => {
      card.addEventListener('click', () => {
        const tenantId = parseInt(card.dataset.tenantId);
        const unitId = card.dataset.unitId ? parseInt(card.dataset.unitId) : null;
        const unitNumber = card.dataset.unitNumber;
        const tenant = allPropertyTenants.find(t => t.id == tenantId);
        
        if (!tenant) return;
        
        // Navigate to tenant profile (for now, show detail modal)
        this.showTenantDetailModal(tenant, unitNumber, property);
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
