// Property Pages Module
// Handles property dashboard and property list pages

const PropertyPages = {
  openPropertyMenu: null,

  MONTHS: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],

  formatKES(amount) {
    return `KES ${parseFloat(amount || 0).toLocaleString()}`;
  },

  occupancyColor(rate) {
    if (rate < 50) return 'rate-red';
    if (rate <= 80) return 'rate-amber';
    return 'rate-green';
  },

  collectionColor(rate) {
    if (rate >= 100) return 'rate-green';
    if (rate > 0) return 'rate-amber';
    return 'rate-red';
  },

  collectionBarColor(rate) {
    if (rate >= 100) return 'bar-green';
    if (rate >= 50) return 'bar-amber';
    return 'bar-red';
  },

  statusDotClass(status) {
    const map = { paid: 'paid', partial: 'partial', unpaid: 'unpaid', overpaid: 'paid' };
    return map[status] || 'unpaid';
  },

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
      <div class="dashboard-collection-section" id="dashboard-collection"></div>
      <div class="dashboard-two-col">
        <div class="dashboard-payment-status-panel" id="dashboard-payment-status"></div>
        <div class="dashboard-alerts-panel hidden" id="dashboard-alerts"></div>
      </div>
      <div class="dashboard-grid">
        <div class="quick-actions-panel">
          <h3 class="panel-title">Quick Actions</h3>
          <div class="quick-actions-list" id="dashboard-quick-actions"></div>
        </div>
        <div class="recent-activity-panel">
          <h3 class="panel-title">Recent Activity</h3>
          <div class="activity-list" id="activity-list"><p class="loading-text">Loading...</p></div>
        </div>
      </div>
      <div class="dashboard-snapshot-panel" id="dashboard-snapshot"></div>
    `;

    try {
      const params = { property: property.id };
      const [summary, paymentStatus, alerts, activity, snapshot] = await Promise.all([
        apiClient.getDashboardSummary(params),
        apiClient.getDashboardPaymentStatus(params),
        apiClient.getDashboardAlerts(params),
        apiClient.getDashboardActivity({ ...params, limit: 8 }),
        apiClient.getDashboardSnapshot(params),
      ]);

      container.dashboardData = { summary, paymentStatus, alerts, snapshot, property };

      this.renderDashboardStats(container, summary);
      this.renderCollectionBar(container, paymentStatus, summary);
      this.renderPaymentStatusPanel(container, paymentStatus);
      this.renderAlertsPanel(container, alerts);
      this.renderActivityFeed(container, activity);
      this.renderSnapshotPanel(container, snapshot);
      this.renderQuickActions(container, summary, alerts);
    } catch (error) {
      container.querySelector('#dashboard-stats').innerHTML =
        `<p class="error-text">Error loading dashboard: ${error.message}</p>`;
    }
  },

  renderDashboardStats(container, s) {
    const occPct = parseFloat(s.occupancy_rate || 0);
    const collRate = parseFloat(s.collection_rate || 0);
    const outstanding = parseFloat(s.outstanding || 0);
    const occupiedPct = s.total_units ? (s.occupied / s.total_units * 100) : 0;

    const outstandingSubtitle = outstanding <= 0
      ? '<span class="subtitle-positive">All tenants up to date</span>'
      : `${s.unpaid_tenant_count} tenant${s.unpaid_tenant_count !== 1 ? 's' : ''} yet to pay`;

    document.getElementById('dashboard-stats').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-title">Total Units</div>
        <div class="stat-card-value">${s.total_units}</div>
        <div class="stat-card-subtitle">${s.occupied} occupied, ${s.vacant} vacant</div>
        <div class="mini-occupancy-bar" title="${s.occupied} occupied / ${s.vacant} vacant">
          <div class="mini-occupancy-fill" style="width:${occupiedPct}%"></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Occupancy Rate</div>
        <div class="stat-card-value ${this.occupancyColor(occPct)}">${occPct}%</div>
        <div class="stat-card-subtitle">${s.occupied} of ${s.total_units} units</div>
        <div class="stat-card-trend">${s.occupancy_trend}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Active Tenants</div>
        <div class="stat-card-value">${s.active_tenants}</div>
        <div class="stat-card-subtitle">With active leases</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Rent Expected</div>
        <div class="stat-card-value">${this.formatKES(s.rent_expected)}</div>
        <div class="stat-card-subtitle">Across ${s.occupied_units_for_rent} occupied unit${s.occupied_units_for_rent !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Rent Collected</div>
        <div class="stat-card-value ${this.collectionColor(collRate)}">${this.formatKES(s.rent_collected)}</div>
        <div class="stat-card-subtitle">${collRate}% collected this month</div>
        ${(() => {
          try {
            const prop = (container && container.dashboardData && container.dashboardData.property) || null;
            if (!prop) return '';
            const commissionPct = parseFloat(prop.commission_percent || 0);
            const rentCollected = parseFloat(s.rent_collected || 0);
            const commissionAmt = (rentCollected * (commissionPct / 100));
            const net = rentCollected - commissionAmt;
            return `
              <div class="stat-card-small">Commission (${commissionPct}%): − ${this.formatKES(commissionAmt)}</div>
              <div class="stat-card-small">Net: ${this.formatKES(net)}</div>
            `;
          } catch (err) { return ''; }
        })()}
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Outstanding</div>
        <div class="stat-card-value ${outstanding <= 0 ? 'rate-green' : ''}">${this.formatKES(outstanding)}</div>
        <div class="stat-card-subtitle">${outstandingSubtitle}</div>
      </div>
    `;
  },

  renderCollectionBar(container, paymentStatus, summary) {
    const ps = paymentStatus.summary;
    const rate = parseFloat(ps.collection_rate || 0);
    const monthLabel = this.MONTHS[paymentStatus.month - 1];
    const barClass = this.collectionBarColor(rate);

    document.getElementById('dashboard-collection').innerHTML = `
      <div class="collection-glance clickable" id="goto-financials" title="Open Financials">
        <div class="collection-glance-header">
          <span>${monthLabel} ${paymentStatus.year} Collection</span>
          <span class="collection-rate-badge ${barClass}">${rate}%</span>
        </div>
        <div class="collection-progress-track">
          <div class="collection-progress-fill ${barClass}" style="width:${Math.min(rate, 100)}%"></div>
        </div>
        <div class="collection-glance-footer">
          <span>${this.formatKES(ps.collected)} of ${this.formatKES(ps.expected)} collected</span>
          <span class="collection-counts">${ps.paid} paid · ${ps.partial} partial · ${ps.unpaid} unpaid</span>
        </div>
      </div>
    `;

    document.getElementById('goto-financials').addEventListener('click', () => {
      PageLoaders.navigate('financials', { month: paymentStatus.month, year: paymentStatus.year });
    });
  },

  renderPaymentStatusPanel(container, data) {
    const monthLabel = this.MONTHS[data.month - 1];
    const panel = document.getElementById('dashboard-payment-status');

    let bannerHtml = '';
    if (data.banner) {
      bannerHtml = `<div class="dashboard-banner banner-${data.banner.type}">${data.banner.message}</div>`;
    }

    if (data.items.length === 0) {
      panel.innerHTML = `
        <h3 class="panel-title">Payment Status — ${monthLabel} ${data.year}</h3>
        ${bannerHtml}
        <p class="empty-history">No occupied units</p>
      `;
      return;
    }

    panel.innerHTML = `
      <h3 class="panel-title">Payment Status — ${monthLabel} ${data.year}</h3>
      ${bannerHtml}
      <div class="payment-status-list">
        ${data.items.map(item => `
          <div class="payment-status-row clickable" data-tenant-id="${item.tenant_id}"
               data-month="${data.month}" data-year="${data.year}">
            <span class="unit-overview-dot ${this.statusDotClass(item.status)}"></span>
            <span class="psr-tenant">${item.tenant_name}</span>
            <span class="psr-unit">${item.unit_number}</span>
            <span class="status-badge status-${item.status}">${item.status}</span>
            <span class="psr-amount">${this.formatKES(item.amount_paid)} / ${this.formatKES(item.amount_expected).replace('KES ', '')}</span>
          </div>
        `).join('')}
      </div>
    `;

    panel.querySelectorAll('.payment-status-row').forEach(row => {
      row.addEventListener('click', () => {
        PageLoaders.navigate('financials-tenant-detail', {
          tenantId: parseInt(row.dataset.tenantId),
          billingMonth: parseInt(row.dataset.month),
          billingYear: parseInt(row.dataset.year),
        });
      });
    });
  },

  renderAlertsPanel(container, alerts) {
    const panel = document.getElementById('dashboard-alerts');
    const twoCol = container.querySelector('.dashboard-two-col');
    if (!alerts || alerts.length === 0) {
      panel.classList.add('hidden');
      if (twoCol) twoCol.classList.add('single-col');
      return;
    }
    if (twoCol) twoCol.classList.remove('single-col');
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <h3 class="panel-title">Needs Attention</h3>
      <div class="alerts-list">
        ${alerts.map((a, i) => `
          <div class="alert-item alert-${a.urgency} clickable" data-alert-idx="${i}">${a.message}</div>
        `).join('')}
      </div>
    `;

    panel.querySelectorAll('.alert-item').forEach(el => {
      el.addEventListener('click', () => {
        const alert = alerts[parseInt(el.dataset.alertIdx)];
        this.handleAlertNavigation(alert, container);
      });
    });
  },

  handleAlertNavigation(alert, container) {
    const data = container.dashboardData;
    if (!data) return;
    const { summary } = data;

    if (alert.navigate === 'financials-tenant-detail' && alert.tenant_id) {
      PageLoaders.navigate('financials-tenant-detail', {
        tenantId: alert.tenant_id,
        billingMonth: summary.month,
        billingYear: summary.year,
      });
    } else if (alert.navigate === 'financials') {
      PageLoaders.navigate('financials', { month: summary.month, year: summary.year });
    } else if (alert.navigate === 'property-units') {
      PageLoaders.loadPage('property-units');
    } else if (alert.navigate === 'property-tenants') {
      const params = alert.type === 'expiring_lease' ? { filter: 'expiring' } : {};
      PageLoaders.navigate('property-tenants', params);
    }
  },

  renderActivityFeed(container, events) {
    const list = document.getElementById('activity-list');
    if (!events || events.length === 0) {
      list.innerHTML = '<p class="empty-history">No recent activity</p>';
      return;
    }

    list.innerHTML = events.map((e, i) => `
      <div class="activity-item clickable" data-event-idx="${i}">
        <span class="activity-text">${e.message}</span>
        <span class="activity-time">${e.relative_time}</span>
      </div>
    `).join('');

    list.querySelectorAll('.activity-item').forEach(el => {
      el.addEventListener('click', () => {
        const event = events[parseInt(el.dataset.eventIdx)];
        this.handleActivityNavigation(event, container);
      });
    });
  },

  handleActivityNavigation(event, container) {
    const data = container.dashboardData;
    if (!data) return;

    if (event.navigate === 'financials-tenant-detail' && event.tenant_id) {
      PageLoaders.navigate('financials-tenant-detail', {
        tenantId: event.tenant_id,
        billingMonth: event.billing_month || data.summary.month,
        billingYear: event.billing_year || data.summary.year,
      });
    } else if (event.navigate === 'property-tenants') {
      PageLoaders.loadPage('property-tenants');
    }
  },

  renderSnapshotPanel(container, snap) {
    const lv = snap.longest_vacancy;
    const vacancyLine = lv
      ? `${lv.unit_number} (${lv.days} days)`
      : '—';

    document.getElementById('dashboard-snapshot').innerHTML = `
      <div class="snapshot-card">
        <h3 class="panel-title">${snap.month_label} Snapshot</h3>
        <div class="snapshot-grid">
          <div class="snapshot-row"><span>Occupied units</span><strong>${snap.occupied_units}</strong></div>
          <div class="snapshot-row"><span>Expected rent</span><strong>${this.formatKES(snap.expected_rent)}</strong></div>
          <div class="snapshot-row"><span>Collected</span><strong>${this.formatKES(snap.collected)} (${snap.collection_rate}%)</strong></div>
          <div class="snapshot-row"><span>Outstanding</span><strong>${this.formatKES(snap.outstanding)}</strong></div>
          <div class="snapshot-row"><span>Overdue tenants</span><strong>${snap.overdue_tenants}</strong></div>
          <div class="snapshot-row"><span>Leases expiring</span><strong>${snap.leases_expiring} (within 30 days)</strong></div>
          <div class="snapshot-row"><span>Vacant units</span><strong>${snap.vacant_units}</strong></div>
          <div class="snapshot-row"><span>Longest vacancy</span><strong>${vacancyLine}</strong></div>
        </div>
      </div>
    `;
  },

  renderQuickActions(container, summary, alerts) {
    const hasExpiring = alerts.some(a => a.type === 'expiring_lease');
    const hasUnits = summary.total_units > 0;
    const actions = [
      { id: 'add-unit', label: '+ Add Unit' },
      { id: 'register-tenant', label: '+ Register Tenant', disabled: !hasUnits },
      { id: 'record-payment', label: '+ Record Payment' },
      { id: 'view-financials', label: '→ View Financials' },
    ];
    if (hasExpiring) {
      actions.push({ id: 'expiring-leases', label: '→ Expiring Leases' });
    }

    const list = document.getElementById('dashboard-quick-actions');
    list.innerHTML = actions.map(a =>
      `<button class="quick-action-btn ${a.disabled ? 'disabled' : ''}" data-action="${a.id}" ${a.disabled ? 'disabled title="Add a unit first."' : ''}>${a.label}</button>`
    ).join('');

    list.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (btn.disabled) return;
        if (action === 'view-financials') {
          PageLoaders.navigate('financials', { month: summary.month, year: summary.year });
        } else if (action === 'expiring-leases') {
          PageLoaders.navigate('property-tenants', { filter: 'expiring' });
        } else {
          SharedComponents.handleQuickAction(action);
        }
      });
    });
  },

  // Properties (General App View - the "lobby" to pick a property)
  closePropertyMenu() {
    if (this.openPropertyMenu) {
      this.openPropertyMenu.remove();
      this.openPropertyMenu = null;
    }
    document.removeEventListener('click', this._handleMenuOutsideClick);
  },

  _handleMenuOutsideClick(e) {
    if (!PropertyPages.openPropertyMenu) return;
    if (PropertyPages.openPropertyMenu.contains(e.target)) return;
    if (e.target.closest('.property-gear-btn')) return;
    PropertyPages.closePropertyMenu();
  },

  setupPropertyCardMenus(container, propertyStats) {
    this._propertyStatsMap = {};
    propertyStats.forEach(p => { this._propertyStatsMap[p.id] = p; });

    container.querySelectorAll('.property-gear-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const propId = btn.dataset.propertyId;
        const prop = this._propertyStatsMap[propId] || AppState.getPropertyById(propId);
        if (!prop) return;

        if (this.openPropertyMenu && this.openPropertyMenu.parentElement === btn.parentElement) {
          this.closePropertyMenu();
          return;
        }
        this.closePropertyMenu();

        const menu = document.createElement('div');
        menu.className = 'property-card-menu';
        menu.innerHTML = `
          <button type="button" class="property-menu-item" data-action="edit">Edit Property</button>
          <div class="property-menu-divider"></div>
          <button type="button" class="property-menu-item danger" data-action="delete">Delete Property</button>
        `;

        menu.querySelector('[data-action="edit"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.closePropertyMenu();
          Modals.showPropertyModal(prop);
        });

        menu.querySelector('[data-action="delete"]').addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.closePropertyMenu();
          Modals.showDeletePropertyModal(prop, {
            unitCount: prop.unitCount,
            tenantCount: prop.tenantCount,
            activeTenants: prop.activeTenants,
          }, () => this.onPropertyDeleted(container, prop.id));
        });

        btn.parentElement.appendChild(menu);
        this.openPropertyMenu = menu;

        setTimeout(() => {
          document.addEventListener('click', this._handleMenuOutsideClick);
        }, 0);
      });
    });
  },

  onPropertyDeleted(container, propertyId) {
    if (AppState.getPropertyContext()?.id == propertyId) {
      AppState.clearPropertyContext();
      PageLoaders.loadPage('properties');
      return;
    }
    AppState.setAllProperties(AppState.getAllProperties().filter(p => p.id != propertyId));
    const card = container.querySelector(`.property-card[data-property-id="${propertyId}"]`);
    if (card) card.remove();
    if (!container.querySelector('.property-card[data-property-id]')) {
      this.loadProperties(container);
    }
  },

  async loadProperties(container) {
    container.innerHTML = `
      <div class="property-list-header">
        <div class="property-list-header-text">
          <h1 class="page-title">Properties</h1>
          <p class="property-list-subtitle">Select a property to get started</p>
        </div>
        <div class="header-actions">
          <button type="button" class="logout-button" id="logout-btn">
            <span class="logout-icon">→</span>
            Exit
          </button>
          <button type="button" class="action-button" id="add-property-header-btn">+ Add Property</button>
        </div>
      </div>
      <div class="properties-grid" id="properties-grid"></div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        console.log('Logout button clicked');
        // Check for unsaved changes before logout
        if (AppState.hasUnsavedChanges()) {
          console.log('Showing unsaved changes modal');
          Modals.showUnsavedChangesModal();
        } else {
          console.log('Showing logout modal');
          Modals.showLogoutModal();
        }
      });
    } else {
      console.error('Logout button not found');
    }

    document.getElementById('add-property-header-btn').addEventListener('click', () => {
      Modals.showPropertyModal();
    });

    // Theme toggle handlers
    const themeToggle = document.getElementById('header-theme-toggle');
    if (themeToggle && window.RMSTheme) {
      themeToggle.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          try { window.RMSTheme.setTheme(theme); } catch (e) { console.error(e); }
        });
      });
      // Reflect current preference
      const current = window.RMSTheme ? window.RMSTheme.getTheme() : null;
      if (current) {
        document.querySelectorAll('.theme-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === current));
      }
    }

    const propertiesGrid = document.getElementById('properties-grid');

    try {
      const [properties, units, leases] = await Promise.all([
        apiClient.getProperties(),
        apiClient.getUnits(),
        apiClient.getLeases(),
      ]);

      AppState.setAllProperties(properties);

      if (properties.length === 0) {
        propertiesGrid.innerHTML = `
          <div class="empty-state centered-empty">
            <h3 class="empty-state-title">No Properties Yet</h3>
            <p class="empty-state-text">Start building your rental portfolio.</p>
            <button class="action-button" onclick="Modals.showPropertyModal()">Add Your First Property</button>
          </div>
        `;
        return;
      }

      const propertyStats = properties.map(prop => {
        const propUnits = units.filter(u => u.property == prop.id);
        const propUnitIds = new Set(propUnits.map(u => u.id));
        const propLeases = leases.filter(l => propUnitIds.has(l.unit));
        const tenantIds = new Set(propLeases.map(l => l.tenant));
        return {
          ...prop,
          unitCount: propUnits.length,
          tenantCount: tenantIds.size,
          activeTenants: propLeases.filter(l => l.status === 'active').length,
        };
      });

      let gridHTML = propertyStats.map(prop => `
        <div class="property-card" data-property-id="${prop.id}">
          <div class="property-card-main clickable">
            <div class="property-card-header">
              <div class="property-card-icon">🏢</div>
              <span class="property-card-badge">Active</span>
            </div>
            <h3 class="property-card-title">${SharedComponents.escapeHtml(prop.name) || 'N/A'}</h3>
            <p class="property-card-location">${SharedComponents.escapeHtml(prop.property_type) || 'N/A'} — ${SharedComponents.escapeHtml(prop.location) || 'N/A'}</p>
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
          <div class="property-card-footer">
            <button type="button" class="property-gear-btn" data-property-id="${prop.id}" aria-label="Property settings">⚙</button>
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

      container.querySelectorAll('.property-card-main.clickable').forEach(main => {
        main.addEventListener('click', () => {
          const card = main.closest('.property-card');
          const propertyId = card.dataset.propertyId;
          const property = AppState.getPropertyById(propertyId);
          if (property) {
            AppState.setPropertyContext(property);
            PageLoaders.loadPage('property-dashboard');
          }
        });
      });

      this.setupPropertyCardMenus(container, propertyStats);

      const addCard = container.querySelector('.add-property-card');
      if (addCard) {
        addCard.addEventListener('click', () => Modals.showPropertyModal());
      }
    } catch (error) {
      propertiesGrid.innerHTML = `<p>Error loading properties: ${error.message}</p>`;
    }
  }
};
