// Financials Pages Module
// Rent payment grid, tenant payment panel, and payment history

const FinancialsPages = {
  MONTHS: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],

  formatKES(amount) {
    return `KES ${parseFloat(amount || 0).toLocaleString()}`;
  },

  buildPaymentPreviewState(data, amountValue = '') {
    const currentPaid = parseFloat(data.current_month_paid || 0);
    const expected = parseFloat(data.current_month_expected || data.rent_amount || 0);
    const enteredAmount = parseFloat(amountValue || 0);
    const previewPaid = currentPaid + enteredAmount;
    const status = previewPaid >= expected
      ? (previewPaid > expected ? 'overpaid' : 'paid')
      : (previewPaid > 0 ? 'partial' : 'unpaid');
    const owed = Math.max(expected - previewPaid, 0);
    const surplus = Math.max(previewPaid - expected, 0);

    return {
      current_month_paid: previewPaid,
      current_month_expected: expected,
      current_month_status: status,
      owed,
      surplus,
      rent_amount: parseFloat(data.rent_amount || 0)
    };
  },

  statusDotClass(status) {
    const map = { paid: 'paid', partial: 'partial', unpaid: 'unpaid', overpaid: 'paid', vacant: 'vacant-payment' };
    return map[status] || 'unpaid';
  },

  formatAmountLine(unit) {
    if (unit.is_vacant) return 'Vacant';
    const paid = parseFloat(unit.amount_paid || 0);
    const expected = parseFloat(unit.amount_expected || 0);
    if (unit.status === 'paid' || unit.status === 'overpaid') {
      return `${this.formatKES(paid)} ✓`;
    }
    return `${this.formatKES(paid)} / ${this.formatKES(expected).replace('KES ', '')}`;
  },

  generateMonthOptions(currentMonth) {
    return this.MONTHS.map((name, i) => {
      const num = i + 1;
      return `<option value="${num}" ${num === currentMonth ? 'selected' : ''}>${name}</option>`;
    }).join('');
  },

  generateYearOptions(currentYear) {
    let options = '';
    for (let y = currentYear; y >= currentYear - 2; y--) {
      options += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
    }
    return options;
  },

  async loadFinancials(container, params = {}) {
    const property = AppState.getPropertyContext();
    if (!property) {
      // Global Financials overview (rollup across all properties)
      container.innerHTML = `
        <div class="property-space-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="back-link" id="back-to-properties">← Back to Properties</button>
            <div>
              <h1 class="page-title">Financials</h1>
              <p class="property-list-subtitle">Overview across all properties</p>
            </div>
          </div>
          <button class="action-button secondary-btn" id="print-report-btn">Print Monthly Report</button>
        </div>
        <div class="financials-global-controls">
          <label>Month:</label>
          <select id="global-month"></select>
          <label>Year:</label>
          <select id="global-year"></select>
          <button class="action-button" id="global-load-btn">Load</button>
        </div>
        <div class="financials-overhead" id="financials-overhead">Loading...</div>
        <div class="financials-per-property" id="financials-per-property">Loading...</div>
      `;

      const today = new Date();
      const monthSelect = container.querySelector('#global-month');
      const yearSelect = container.querySelector('#global-year');
      const currentMonth = params.month || (today.getMonth() + 1);
      const currentYear = params.year || today.getFullYear();
      monthSelect.innerHTML = this.generateMonthOptions(currentMonth);
      yearSelect.innerHTML = this.generateYearOptions(currentYear);

      const loadOverview = async () => {
        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        const overheadDiv = container.querySelector('#financials-overhead');
        const perPropDiv = container.querySelector('#financials-per-property');
        overheadDiv.innerHTML = '<p class="loading-text">Loading...</p>';
        perPropDiv.innerHTML = '';

        try {
          const data = await apiClient.getGlobalFinancialsSummary({ month, year });

          const collectionRate = parseFloat(data.collection_rate || 0);
          const collectionColorClass = collectionRate < 50 ? 'rate-red' : (collectionRate < 80 ? 'rate-amber' : 'rate-green');

          overheadDiv.innerHTML = `
            <div class="financials-summary-strip">
              <div class="summary-card">
                <div class="summary-card-label">Total Expected</div>
                <div class="summary-card-value">${this.formatKES(data.total_expected)}</div>
                <div class="summary-card-subtitle">Across ${data.total_properties} props</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Total Collected</div>
                <div class="summary-card-value">${this.formatKES(data.total_collected)}</div>
                <div class="summary-card-subtitle ${collectionColorClass}">${collectionRate}% collected</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Total Commission</div>
                <div class="summary-card-value">${this.formatKES(data.total_commission)}</div>
                <div class="summary-card-subtitle">Avg ${(data.total_commission / data.total_collected * 100).toFixed(1)}%</div>
              </div>
              <div class="summary-card">
                <div class="summary-card-label">Net to Owners</div>
                <div class="summary-card-value">${this.formatKES(data.net_to_owners)}</div>
                <div class="summary-card-subtitle"></div>
              </div>
            </div>
            <div class="collection-progress-section">
              <div class="progress-label">${this.MONTHS[month - 1]} ${year} — Overall Collection</div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill ${collectionRate < 50 ? 'bar-red' : (collectionRate < 80 ? 'bar-amber' : 'bar-green')}" style="width: ${collectionRate}%"></div>
              </div>
              <div class="progress-stats">${collectionRate}%   ${this.formatKES(data.total_collected)} of ${this.formatKES(data.total_expected)}</div>
            </div>
          `;

          if (data.properties.length === 0) {
            perPropDiv.innerHTML = '<p class="empty-state-text">No properties found</p>';
            return;
          }

          const statusBadgeClass = (status) => {
            const map = {
              'full': 'status-full',
              'partial': 'status-partial',
              'no_collection': 'status-no-collection',
              'no_tenants': 'status-no-tenants'
            };
            return map[status] || '';
          };

          const statusLabel = (status) => {
            const map = {
              'full': 'Full Collection',
              'partial': 'Partial',
              'no_collection': 'No Collection',
              'no_tenants': 'No Tenants'
            };
            return map[status] || status;
          };

          perPropDiv.innerHTML = `
            <table class="data-table financials-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Units</th>
                  <th>Occupied</th>
                  <th>Expected</th>
                  <th>Collected</th>
                  <th>Commission %</th>
                  <th>Commission Amt</th>
                  <th>Net to Owner</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.properties.map(p => `
                  <tr class="clickable-row" data-property-id="${p.id}">
                    <td>${SharedComponents.escapeHtml(p.name)}</td>
                    <td>${p.units}</td>
                    <td>${p.occupied}</td>
                    <td>${this.formatKES(p.expected)}</td>
                    <td>${this.formatKES(p.collected)}</td>
                    <td>${p.commission_percent}%</td>
                    <td>${this.formatKES(p.commission_amount)}</td>
                    <td>${this.formatKES(p.net_to_owner)}</td>
                    <td><span class="status-badge ${statusBadgeClass(p.status)}">${statusLabel(p.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="outstanding-summary">
              <h4>Outstanding — ${this.MONTHS[month - 1]} ${year}</h4>
              <div class="outstanding-total">${this.formatKES(data.total_outstanding)} uncollected across ${data.properties.length} properties</div>
              <div class="outstanding-details">
                ${data.properties.filter(p => p.outstanding > 0).map(p => `
                  <div class="outstanding-item">
                    <span>${SharedComponents.escapeHtml(p.name)}</span>
                    <span>${this.formatKES(p.outstanding)} ${p.status === 'no_collection' ? '— no payments recorded' : 'still owed'}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;

          // Add click handlers for property rows
          perPropDiv.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', () => {
              const propertyId = parseInt(row.dataset.propertyId);
              const property = data.properties.find(p => p.id === propertyId);
              if (property) {
                AppState.setPropertyContext({ id: property.id, name: property.name });
                PageLoaders.navigate('financials', { month, year });
              }
            });
          });

        } catch (error) {
          overheadDiv.innerHTML = `<p class="error-text">Error loading financials: ${error.message}</p>`;
        }
      };

      container.querySelector('#global-load-btn').addEventListener('click', loadOverview);
      const backBtn = container.querySelector('#back-to-properties');
      if (backBtn) backBtn.addEventListener('click', () => PageLoaders.loadPage('properties'));

      container.querySelector('#print-report-btn').addEventListener('click', () => {
        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        this.printMonthlyReport(month, year);
      });

      await loadOverview();
      return;
    }

    const today = new Date();
    container.financialsState = {
      property,
      month: params.month || params.billingMonth || today.getMonth() + 1,
      year: params.year || params.billingYear || today.getFullYear(),
      filter: 'all',
      gridData: null
    };

    container.innerHTML = `
      ${SharedComponents.renderPropertySpaceHeader('Financials', property.name, `
        <div class="header-actions">
          <button class="action-button secondary-btn" id="generate-billing-btn">Generate Billing Cycle</button>
          <button class="action-button secondary-btn" id="export-grid-btn">Export CSV</button>
        </div>
      `)}
      <div class="financials-tabs">
        <button class="financials-tab active" data-tab="payment-grid">Payment Grid</button>
        <button class="financials-tab" data-tab="payment-history">Payment History</button>
      </div>
      <div id="financials-content"></div>
    `;

    container.querySelectorAll('.financials-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.financials-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'payment-grid') {
          this.loadPaymentGrid(container);
        } else {
          this.loadPaymentHistory(container);
        }
      });
    });

    container.querySelector('#generate-billing-btn').addEventListener('click', () => {
      this.showGenerateBillingModal(property, container);
    });

    container.querySelector('#export-grid-btn').addEventListener('click', () => {
      this.exportGridToCSV(container);
    });

    await this.loadPaymentGrid(container);
  },

  async loadPaymentGrid(container) {
    const state = container.financialsState;
    const contentDiv = container.querySelector('#financials-content');

    contentDiv.innerHTML = `
      <div class="billing-cycle-selector">
        <label>Billing Month:</label>
        <select id="billing-month">${this.generateMonthOptions(state.month)}</select>
        <select id="billing-year">${this.generateYearOptions(state.year)}</select>
        <button class="action-button" id="load-billing-btn">Load</button>
      </div>
      <div class="rent-metric-cards" id="rent-summary"></div>
      <div class="payment-filter-tabs" id="payment-filters">
        <button class="filter-tab active" data-filter="all">All</button>
        <button class="filter-tab" data-filter="paid">Paid</button>
        <button class="filter-tab" data-filter="unpaid">Unpaid</button>
        <button class="filter-tab" data-filter="partial">Partial</button>
        <button class="filter-tab" data-filter="vacant">Vacant</button>
      </div>
      <div id="payment-grid-container"></div>
    `;

    contentDiv.querySelector('#load-billing-btn').addEventListener('click', async () => {
      state.month = parseInt(contentDiv.querySelector('#billing-month').value);
      state.year = parseInt(contentDiv.querySelector('#billing-year').value);
      await this.refreshGridData(container);
    });

    contentDiv.querySelectorAll('#payment-filters .filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        contentDiv.querySelectorAll('#payment-filters .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.filter = tab.dataset.filter;
        this.renderPaymentGrid(container);
      });
    });

    await this.refreshGridData(container);
  },

  async refreshGridData(container) {
    const state = container.financialsState;
    const gridContainer = container.querySelector('#payment-grid-container');
    const summaryDiv = container.querySelector('#rent-summary');

    summaryDiv.innerHTML = '<p class="loading-text">Loading...</p>';
    gridContainer.innerHTML = '';

    try {
      const data = await apiClient.getPaymentGrid({
        property: state.property.id,
        month: state.month,
        year: state.year
      });
      state.gridData = data;
      this.renderMetricCards(summaryDiv, data.summary);
      this.renderPaymentGrid(container);
    } catch (error) {
      summaryDiv.innerHTML = '';
      gridContainer.innerHTML = `<p class="error-text">Error loading payment grid: ${error.message}</p>`;
    }
  },

  renderMetricCards(container, summary) {
    container.innerHTML = `
      <div class="metric-card">
        <div class="metric-card-label">Occupied Units</div>
        <div class="metric-card-value">${summary.occupied}</div>
      </div>
      <div class="metric-card metric-paid">
        <div class="metric-card-label"><span class="metric-dot paid"></span> Paid</div>
        <div class="metric-card-value">${summary.paid}</div>
      </div>
      <div class="metric-card metric-unpaid">
        <div class="metric-card-label"><span class="metric-dot unpaid"></span> Unpaid</div>
        <div class="metric-card-value">${summary.unpaid}</div>
      </div>
      <div class="metric-card metric-partial">
        <div class="metric-card-label"><span class="metric-dot partial"></span> Partial</div>
        <div class="metric-card-value">${summary.partial}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-label">Collected</div>
        <div class="metric-card-value">${this.formatKES(summary.total_collected)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card-label">Expected</div>
        <div class="metric-card-value">${this.formatKES(summary.total_expected)}</div>
      </div>
      <div class="metric-card metric-rate">
        <div class="metric-card-label">Collection Rate</div>
        <div class="metric-card-value">${summary.collection_rate || 0}%</div>
      </div>
    `;
  },

  renderPaymentGrid(container) {
    const state = container.financialsState;
    const gridContainer = container.querySelector('#payment-grid-container');
    const data = state.gridData;

    if (!data || !data.units) return;

    let units = [...data.units].sort((a, b) =>
      SharedComponents.extractUnitNumber(a.unit_number) - SharedComponents.extractUnitNumber(b.unit_number)
    );

    if (state.filter !== 'all') {
      units = units.filter(u => u.status === state.filter);
    }

    if (units.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💰</div>
          <h3 class="empty-state-title">No Units Match Filter</h3>
          <p class="empty-state-text">Try a different filter or billing month.</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = `
      <div class="payment-grid-panel">
        <div class="unit-selector-grid payment-grid">
          ${units.map(unit => `
            <div class="unit-selector-tile payment-grid-tile ${unit.is_vacant ? 'vacant-tile' : 'clickable'}"
                 data-unit-id="${unit.unit_id}"
                 data-tenant-id="${unit.tenant_id || ''}"
                 title="${unit.is_vacant ? 'Vacant' : unit.tenant_name}">
              <span class="unit-overview-dot ${this.statusDotClass(unit.status)}"></span>
              <span class="unit-overview-label">${unit.unit_number || 'N/A'}</span>
              ${unit.tenant_name ? `<span class="payment-grid-tenant">${unit.tenant_name}</span>` : ''}
              <span class="payment-grid-amount">${this.formatAmountLine(unit)}</span>
              ${unit.payment_streak >= 3 ? '<span class="streak-badge" title="On-time streak">🔥</span>' : ''}
              ${unit.is_overdue ? `<span class="overdue-tag">${unit.days_overdue}d overdue</span>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="units-overview-legend payment-grid-legend">
          <span class="legend-item"><span class="unit-overview-dot paid"></span> Paid</span>
          <span class="legend-item"><span class="unit-overview-dot partial"></span> Partial</span>
          <span class="legend-item"><span class="unit-overview-dot unpaid"></span> Unpaid</span>
          <span class="legend-item"><span class="unit-overview-dot vacant-payment"></span> Vacant</span>
        </div>
      </div>
    `;

    gridContainer.querySelectorAll('.payment-grid-tile.clickable').forEach(tile => {
      tile.addEventListener('click', () => {
        const tenantId = tile.dataset.tenantId;
        if (tenantId) {
          this.navigateToTenantDetail(parseInt(tenantId), state.month, state.year);
        }
      });
    });
  },

  navigateToTenantDetail(tenantId, billingMonth, billingYear) {
    PageLoaders.navigate('financials-tenant-detail', {
      tenantId,
      billingMonth,
      billingYear
    });
  },

  navigateBackToFinancials(billingMonth, billingYear) {
    PageLoaders.navigate('financials', {
      month: billingMonth,
      year: billingYear
    });
  },

  formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  computeSurplusBreakdown(amountPaid, amountExpected, monthlyRent) {
    const paid = parseFloat(amountPaid || 0);
    const expected = parseFloat(amountExpected || 0);
    const rent = parseFloat(monthlyRent || 0);
    const surplus = Math.max(paid - expected, 0);
    if (surplus <= 0 || rent <= 0) {
      return { surplus: 0, fullMonths: 0, remainingDays: 0, dailyRate: 0 };
    }
    const fullMonths = Math.floor(surplus / rent);
    const remainder = surplus % rent;
    const dailyRate = rent / 30;
    const remainingDays = Math.floor(remainder / dailyRate);
    return { surplus, fullMonths, remainingDays, dailyRate };
  },

  async loadTenantDetail(container, params = {}) {
    const property = AppState.getPropertyContext();
    const tenantId = params.tenantId;
    const billingMonth = parseInt(params.billingMonth) || new Date().getMonth() + 1;
    const billingYear = parseInt(params.billingYear) || new Date().getFullYear();

    if (!property || !tenantId) {
      container.innerHTML = '<p>Invalid tenant or property context.</p>';
      return;
    }

    container.tenantDetailState = {
      tenantId,
      billingMonth,
      billingYear,
      property,
      lastPayment: null,
      dashboard: null
    };

    container.innerHTML = '<p class="loading-text">Loading tenant financials...</p>';

    try {
      const data = await apiClient.getTenantDashboard(tenantId, {
        month: billingMonth,
        year: billingYear
      });
      container.tenantDetailState.dashboard = data;
      this.renderTenantDetailPage(container, data);
    } catch (error) {
      container.innerHTML = `<p class="error-text">Error loading tenant: ${error.message}</p>`;
    }
  },

  renderTenantDetailPage(container, data) {
    const state = container.tenantDetailState;
    const monthLabel = `${this.MONTHS[data.billing_month - 1]} ${data.billing_year}`;
    const unitLabel = `${data.unit_number}${data.unit_type ? ` (${data.unit_type})` : ''}`;
    const hasPayment = parseFloat(data.current_month_paid || 0) > 0;

    container.innerHTML = `
      <div class="tenant-detail-page">
        <div class="tenant-detail-header">
          <button class="back-link" id="back-to-financials">← Back to Financials</button>
          <div class="tenant-detail-title">
            <h1>${data.tenant_name}</h1>
            <span class="tenant-detail-subtitle">— ${unitLabel}</span>
          </div>
          <button class="action-button secondary-btn ${hasPayment ? '' : 'hidden'}" id="header-print-receipt">Print Receipt</button>
        </div>

        <div class="tenant-info-strip">
          <div class="info-strip-card">
            <div class="info-strip-label">Phone</div>
            <div class="info-strip-value">${data.phone || '—'}</div>
          </div>
          <div class="info-strip-card">
            <div class="info-strip-label">Unit</div>
            <div class="info-strip-value">${unitLabel}</div>
          </div>
          <div class="info-strip-card">
            <div class="info-strip-label">Lease Period</div>
            <div class="info-strip-value">${this.formatDate(data.lease_start)} → ${this.formatDate(data.lease_end)}</div>
          </div>
          <div class="info-strip-card">
            <div class="info-strip-label">Monthly Rent</div>
            <div class="info-strip-value">${this.formatKES(data.rent_amount)}</div>
          </div>
          <div class="info-strip-card">
            <div class="info-strip-label">Status</div>
            <div class="info-strip-value"><span class="status-badge status-${data.current_month_status}" id="header-status-badge">${data.current_month_status}</span></div>
          </div>
        </div>

        <div class="tenant-payment-columns">
          <div class="record-payment-card">
            <h3>Record Payment — ${monthLabel}</h3>
            <div class="form-group">
              <label for="payment-amount">Amount Paid</label>
              <div class="amount-input-row">
                <span class="currency-prefix">KES</span>
                <input type="number" id="payment-amount" min="0" step="0.01" placeholder="0.00">
              </div>
              <button type="button" class="link-btn" id="pay-exact-btn">Pay Remaining (${this.formatKES(Math.max(parseFloat(data.current_month_expected || 0) - parseFloat(data.current_month_paid || 0), 0))})</button>
              <p class="form-hint">This amount is added to the monthly running total.</p>
            </div>
            <div class="form-group">
              <label for="payment-method">Method</label>
              <select id="payment-method">
                <option value="mpesa">M-Pesa</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div class="form-group">
              <label for="payment-reference">Ref No.</label>
              <input type="text" id="payment-reference" placeholder="Optional">
            </div>
            <div class="form-group">
              <label for="payment-notes">Notes</label>
              <textarea id="payment-notes" rows="2" placeholder="Optional">${data.notes || ''}</textarea>
            </div>
            <button class="action-button primary-btn full-width-btn" id="submit-payment-btn" disabled>Submit Payment</button>
          </div>

          <div class="payment-feedback-card" id="payment-feedback">
            <div class="feedback-placeholder">
              <p>Payment result will appear here after submission.</p>
            </div>
          </div>
        </div>

        <div class="credit-arrears-bar" id="credit-arrears-bar">
          ${this.renderCreditArrearsBar(data)}
        </div>

        <div class="tenant-history-section">
          <h3>Payment History</h3>
          <div id="tenant-history-table">${this.renderTenantHistoryTable(data.payment_history)}</div>
        </div>
      </div>
    `;

    container.querySelector('#back-to-financials').addEventListener('click', () => {
      this.navigateBackToFinancials(state.billingMonth, state.billingYear);
    });

    const amountInput = container.querySelector('#payment-amount');
    const submitBtn = container.querySelector('#submit-payment-btn');
    const syncPreview = () => {
      const hasPositiveAmount = parseFloat(amountInput.value || 0) > 0;
      submitBtn.disabled = !hasPositiveAmount;
      this.renderPaymentFeedbackColumn(container, data, amountInput.value);
    };

    amountInput.addEventListener('input', syncPreview);

    container.querySelector('#pay-exact-btn').addEventListener('click', () => {
      const remaining = Math.max(
        parseFloat(data.current_month_expected || data.rent_amount) - parseFloat(data.current_month_paid || 0),
        0
      );
      amountInput.value = remaining;
      submitBtn.disabled = !(remaining > 0);
      syncPreview();
    });

    submitBtn.addEventListener('click', () => {
      this.submitTenantPayment(container);
    });

    const headerPrint = container.querySelector('#header-print-receipt');
    if (headerPrint) {
      headerPrint.addEventListener('click', () => {
        this.printReceiptFromPreview(this.buildReceiptData(data, this.buildPaymentPreviewState(data, amountInput.value)));
      });
    }

    this.attachHistorySortHandler(container);

    this.renderPaymentFeedbackColumn(container, data, amountInput.value);
  },

  renderCreditArrearsBar(data) {
    const creditNote = parseFloat(data.credit_balance || 0) > 0
      ? `<span class="credit-note">approx ${data.credit_days || 0} days into next month</span>`
      : '';

    return `
      <div class="summary-pill"><span class="pill-label">Credit Balance</span><span class="pill-value">${this.formatKES(data.credit_balance)}</span>${creditNote}</div>
      <div class="summary-pill"><span class="pill-label">Months in Arrears</span><span class="pill-value">${data.months_in_arrears}</span></div>
      <div class="summary-pill"><span class="pill-label">Total Outstanding</span><span class="pill-value">${this.formatKES(data.total_outstanding)}</span></div>
      <div class="summary-pill"><span class="pill-label">Streak</span><span class="pill-value">${data.payment_streak} months on time</span></div>
    `;
  },

  renderTenantHistoryTable(history, sortDesc = true) {
    if (!history || history.length === 0) {
      return '<p class="empty-history">No payment history yet</p>';
    }

    const sorted = [...history].sort((a, b) => {
      const da = a.billing_year * 100 + a.billing_month;
      const db = b.billing_year * 100 + b.billing_month;
      return sortDesc ? db - da : da - db;
    });

    return `
      <table class="data-table sortable-history" id="tenant-history-sortable">
        <thead>
          <tr>
            <th class="sortable-th" data-sort="month">Month ↕</th>
            <th>Expected</th><th>Paid</th><th>Status</th><th>Method</th>
            <th>Reference</th><th>Date</th><th>Late?</th><th>Recorded By</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(p => `
            <tr>
              <td>${this.MONTHS[p.billing_month - 1]} ${p.billing_year}</td>
              <td>${this.formatKES(p.amount_expected)}</td>
              <td>${this.formatKES(p.amount_paid)}</td>
              <td><span class="status-badge status-${p.status}">${p.status}</span></td>
              <td>${p.payment_method ? this.formatMethod(p.payment_method) : '—'}</td>
              <td>${p.reference_number || '—'}</td>
              <td>${p.payment_date ? this.formatDate(p.payment_date) : '—'}</td>
              <td>${p.is_late ? `${p.days_overdue} days late` : (p.payment_date ? 'On time' : '—')}</td>
              <td>${p.recorded_by_name || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  renderPaymentBreakdown(data, previewState = null) {
    const monthLabel = `${this.MONTHS[data.billing_month - 1]} ${data.billing_year}`;
    const txs = data.month_transactions || [];

    const lines = txs.map(tx => {
      const ref = tx.reference_number ? `  ${tx.reference_number}` : '';
      const method = tx.payment_method_display || this.formatMethod(tx.payment_method);
      return `<div class="breakdown-line"><span>${this.formatDateShort(tx.payment_date)}</span><span>${this.formatKES(tx.amount)}</span><span>${method}${ref}</span></div>`;
    }).join('');

    const paid = previewState ? previewState.current_month_paid : parseFloat(data.current_month_paid || 0);
    const expected = previewState ? previewState.current_month_expected : parseFloat(data.current_month_expected || 0);
    const surplus = previewState ? previewState.surplus : Math.max(paid - expected, 0);
    const owed = previewState ? previewState.owed : Math.max(expected - paid, 0);

    let totalsHtml = `
      <div class="breakdown-totals">
        <div class="breakdown-total-row"><span>Total paid:</span><strong>${this.formatKES(paid)}</strong></div>
        <div class="breakdown-total-row"><span>Expected:</span><strong>${this.formatKES(expected)}</strong></div>`;

    if (owed > 0) {
      totalsHtml += `<div class="breakdown-total-row owed"><span>Still owed:</span><strong>${this.formatKES(owed)}</strong></div>`;
    }
    if (surplus > 0) {
      const surplusBreakdown = this.computeSurplusBreakdown(paid, expected, data.rent_amount);
      const nextMonth = data.next_month_name || 'next month';
      totalsHtml += `<div class="breakdown-total-row surplus"><span>Surplus:</span><strong>${this.formatKES(surplus)} → ${surplusBreakdown.remainingDays} days credit into ${nextMonth}</strong></div>`;
    }
    totalsHtml += '</div>';

    return `
      <div class="payment-breakdown">
        <h4>Payment breakdown — ${monthLabel}</h4>
        <div class="breakdown-lines">${lines || '<div class="breakdown-line"><span>No transactions yet</span><span>—</span><span>—</span></div>'}</div>
        <div class="breakdown-divider"></div>
        ${totalsHtml}
      </div>`;
  },

  formatDateShort(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  },

  buildReceiptData(data, previewState = null) {
    const paid = previewState ? previewState.current_month_paid : parseFloat(data.current_month_paid || 0);
    const expected = previewState ? previewState.current_month_expected : parseFloat(data.current_month_expected || data.rent_amount || 0);
    const owed = previewState ? previewState.owed : Math.max(expected - paid, 0);
    const surplus = previewState ? previewState.surplus : Math.max(paid - expected, 0);
    const breakdown = this.computeSurplusBreakdown(paid, expected, data.rent_amount);
    const txs = data.month_transactions || [];
    const latestTx = txs.length ? txs[txs.length - 1] : null;

    return {
      propertyName: data.property_name,
      propertyAddress: data.property_address || '',
      receiptNo: data.receipt_number || (latestTx && latestTx.receipt_number) || 'RCP-PENDING',
      date: latestTx ? latestTx.payment_date : data.payment_date,
      tenantName: data.tenant_name,
      phone: data.phone,
      unitLabel: `${data.unit_number}${data.unit_type ? ` (${data.unit_type})` : ''}`,
      leaseStart: data.lease_start,
      leaseEnd: data.lease_end,
      monthLabel: `${this.MONTHS[data.billing_month - 1]} ${data.billing_year}`,
      rentAmount: data.rent_amount,
      totalPaid: paid,
      methods: data.payment_methods_summary || '—',
      references: data.references_summary || '—',
      status: previewState ? previewState.current_month_status : data.current_month_status,
      owed,
      surplus,
      creditDays: breakdown.remainingDays,
      nextMonth: data.next_month_name || '',
      recordedBy: data.recorded_by_name || (latestTx && latestTx.recorded_by_name) || '—',
    };
  },

  renderReceiptPreviewHtml(receipt) {
    const statusLabel = receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1);
    let extraRows = '';
    if (receipt.status === 'partial' && receipt.owed > 0) {
      extraRows += `<div class="receipt-row"><span>Balance Remaining:</span><span>${this.formatKES(receipt.owed)}</span></div>`;
    }
    if (receipt.surplus > 0) {
      extraRows += `
        <div class="receipt-row"><span>Surplus:</span><span>${this.formatKES(receipt.surplus)}</span></div>
        <div class="receipt-row"><span>Credit:</span><span>≈ ${receipt.creditDays} days (${receipt.nextMonth})</span></div>`;
    }

    return `
      <div class="receipt-preview-card">
        <div class="receipt-preview-header">
          <div class="receipt-property">${receipt.propertyName}</div>
          <div class="receipt-address">${receipt.propertyAddress}</div>
        </div>
        <div class="receipt-preview-title">RENT RECEIPT</div>
        <div class="receipt-row"><span>Receipt No:</span><span>${receipt.receiptNo}</span></div>
        <div class="receipt-row"><span>Date:</span><span>${this.formatDate(receipt.date)}</span></div>
        <div class="receipt-divider"></div>
        <div class="receipt-row"><span>Tenant:</span><span>${receipt.tenantName}</span></div>
        <div class="receipt-row"><span>Unit:</span><span>${receipt.unitLabel}</span></div>
        <div class="receipt-row"><span>Phone:</span><span>${receipt.phone || '—'}</span></div>
        <div class="receipt-row"><span>Lease:</span><span>${this.formatDate(receipt.leaseStart)} → ${this.formatDate(receipt.leaseEnd)}</span></div>
        <div class="receipt-divider"></div>
        <div class="receipt-row"><span>Billing Month:</span><span>${receipt.monthLabel}</span></div>
        <div class="receipt-row"><span>Monthly Rent:</span><span>${this.formatKES(receipt.rentAmount)}</span></div>
        <div class="receipt-row receipt-total"><span>Total Paid:</span><span>${this.formatKES(receipt.totalPaid)}</span></div>
        <div class="receipt-row"><span>Method:</span><span>${receipt.methods}</span></div>
        <div class="receipt-row"><span>Reference:</span><span>${receipt.references}</span></div>
        <div class="receipt-row"><span>Status:</span><span>${statusLabel}</span></div>
        ${extraRows}
        <div class="receipt-row"><span>Recorded by:</span><span>${receipt.recordedBy}</span></div>
        <div class="receipt-footer">System-generated receipt · mijengo RMS</div>
      </div>`;
  },

  async printMonthlyReport(month, year) {
    try {
      const [financialsData, settings] = await Promise.all([
        apiClient.getGlobalFinancialsSummary({ month, year }),
        apiClient.getSystemSettings()
      ]);

      const monthLabel = this.MONTHS[month - 1];
      const today = new Date();
      const generatedDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const managerName = apiClient.user?.full_name || apiClient.user?.username || 'Manager';

      const companyName = settings.company_name || 'Company Name';
      const contactPhone = settings.contact_phone || '';
      const address = settings.address || '';

      const statusLabel = (status) => {
        const map = {
          'full': 'Full Collection',
          'partial': 'Partial',
          'no_collection': 'No Collection',
          'no_tenants': 'No Tenants'
        };
        return map[status] || status;
      };

      // Build shortfalls section
      const shortfalls = financialsData.properties
        .filter(p => p.outstanding > 0)
        .map(p => {
          const shortfallDetails = [];
          if (p.status === 'no_collection') {
            shortfallDetails.push(`  ${p.name} → No payments recorded → KES ${p.outstanding.toLocaleString()} owed`);
          } else {
            shortfallDetails.push(`  ${p.name} → Partial collection → KES ${p.outstanding.toLocaleString()} still owed`);
          }
          return shortfallDetails.join('\n');
        })
        .join('\n');

      const reportHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Financial Report - ${monthLabel} ${year}</title>
  <style>
    @media print {
      body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #000; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .company-name { font-size: 18pt; font-weight: bold; margin-bottom: 5px; }
    .company-contact { font-size: 11pt; margin-bottom: 5px; }
    .report-title { font-size: 16pt; font-weight: bold; margin: 30px 0 10px 0; text-align: center; }
    .report-meta { font-size: 10pt; text-align: center; color: #666; margin-bottom: 20px; }
    .section-title { font-size: 12pt; font-weight: bold; margin: 20px 0 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .summary-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #ccc; }
    .summary-label { font-weight: bold; }
    .summary-value { text-align: right; }
    .property-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
    .property-name { font-size: 13pt; font-weight: bold; margin-bottom: 10px; }
    .property-detail { display: flex; justify-content: space-between; padding: 3px 0; }
    .property-detail-label { font-weight: bold; }
    .shortfalls-section { margin: 20px 0; }
    .shortfall-item { padding: 5px 0; border-bottom: 1px dotted #ccc; }
    .notes-section { margin: 30px 0; }
    .notes-area { border: 1px solid #ccc; padding: 20px; min-height: 100px; background: #fafafa; }
    .report-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #000; font-size: 9pt; text-align: center; color: #666; }
    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
    .print-btn:hover { background: #0056b3; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print Report</button>

  <div class="report-header">
    <div class="company-name">${SharedComponents.escapeHtml(companyName)}</div>
    <div class="company-contact">${contactPhone ? SharedComponents.escapeHtml(contactPhone) + ' · ' : ''}${SharedComponents.escapeHtml(address)}</div>
  </div>

  <div class="report-title">MONTHLY FINANCIAL REPORT</div>
  <div class="report-title">${monthLabel} ${year}</div>
  <div class="report-meta">Generated: ${generatedDate} · Prepared by: ${SharedComponents.escapeHtml(managerName)}</div>

  <div class="section-title">PORTFOLIO SUMMARY</div>
  <div class="summary-row"><span class="summary-label">Total Properties:</span><span class="summary-value">${financialsData.total_properties}</span></div>
  <div class="summary-row"><span class="summary-label">Total Units:</span><span class="summary-value">${financialsData.total_units}</span></div>
  <div class="summary-row"><span class="summary-label">Occupied Units:</span><span class="summary-value">${financialsData.total_occupied}</span></div>
  <div class="summary-row"><span class="summary-label">Occupancy Rate:</span><span class="summary-value">${financialsData.occupancy_rate}%</span></div>
  <div class="summary-row"><span class="summary-label">Total Rent Expected:</span><span class="summary-value">${this.formatKES(financialsData.total_expected)}</span></div>
  <div class="summary-row"><span class="summary-label">Total Rent Collected:</span><span class="summary-value">${this.formatKES(financialsData.total_collected)}</span></div>
  <div class="summary-row"><span class="summary-label">Collection Rate:</span><span class="summary-value">${financialsData.collection_rate}%</span></div>
  <div class="summary-row"><span class="summary-label">Total Commission Earned:</span><span class="summary-value">${this.formatKES(financialsData.total_commission)}</span></div>
  <div class="summary-row"><span class="summary-label">Net Payable to Owners:</span><span class="summary-value">${this.formatKES(financialsData.net_to_owners)}</span></div>
  <div class="summary-row"><span class="summary-label">Total Outstanding:</span><span class="summary-value">${this.formatKES(financialsData.total_outstanding)}</span></div>

  <div class="section-title">PER-PROPERTY BREAKDOWN</div>
  ${financialsData.properties.map((p, index) => `
    <div class="property-section ${index > 0 && index % 3 === 0 ? 'page-break' : ''}">
      <div class="property-name">${SharedComponents.escapeHtml(p.name)} — ${p.property_type} — ${SharedComponents.escapeHtml(p.location)}</div>
      <div class="property-detail"><span class="property-detail-label">Units:</span><span>${p.units} total · ${p.occupied} occupied · ${p.units - p.occupied} vacant</span></div>
      <div class="property-detail"><span class="property-detail-label">Expected:</span><span>${this.formatKES(p.expected)}</span></div>
      <div class="property-detail"><span class="property-detail-label">Collected:</span><span>${this.formatKES(p.collected)}</span></div>
      ${p.commission_percent > 0 ? `
      <div class="property-detail"><span class="property-detail-label">Commission (${p.commission_percent}%):</span><span>− ${this.formatKES(p.commission_amount)}</span></div>
      ` : ''}
      <div class="property-detail"><span class="property-detail-label">Net to Owner:</span><span>${this.formatKES(p.net_to_owner)}</span></div>
      <div class="property-detail"><span class="property-detail-label">Outstanding:</span><span>${this.formatKES(p.outstanding)}</span></div>
      <div class="property-detail"><span class="property-detail-label">Status:</span><span>${statusLabel(p.status)}</span></div>
    </div>
  `).join('')}

  ${shortfalls ? `
  <div class="section-title">SHORTFALLS</div>
  <div class="shortfalls-section">
    ${shortfalls.split('\n').map(line => `<div class="shortfall-item">${line}</div>`).join('')}
  </div>
  ` : ''}

  <div class="section-title">NOTES</div>
  <div class="notes-section">
    <div class="notes-area"></div>
  </div>

  <div class="report-footer">
    This report was generated by RMS on ${generatedDate}.<br>
    Confidential — for internal use only.
  </div>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.focus();
      } else {
        alert('Please allow popups to print the report');
      }
    } catch (error) {
      alert('Error generating report: ' + error.message);
    }
  },

  renderPaymentStatusSummary(data, previewState = null) {
    const monthLabel = `${this.MONTHS[data.billing_month - 1]} ${data.billing_year}`;
    const paid = previewState ? previewState.current_month_paid : parseFloat(data.current_month_paid || 0);
    const expected = previewState ? previewState.current_month_expected : parseFloat(data.current_month_expected || 0);
    const owed = previewState ? previewState.owed : Math.max(expected - paid, 0);
    const status = previewState ? previewState.current_month_status : data.current_month_status;
    const statusClass = `feedback-${status === 'overpaid' ? 'overpaid' : status}`;

    let message = '';
    if (status === 'paid') {
      message = `${this.formatKES(paid)} received — Fully paid for ${monthLabel}`;
    } else if (status === 'partial') {
      message = `${this.formatKES(paid)} received — ${this.formatKES(owed)} still owed`;
    } else if (status === 'overpaid') {
      const surplus = parseFloat(data.surplus_amount || paid - expected);
      message = `${this.formatKES(paid)} received on ${this.formatKES(expected)} rent · Surplus ${this.formatKES(surplus)}`;
    } else {
      message = `${this.formatKES(paid)} recorded for ${monthLabel}`;
    }

    return `
      <div class="feedback-result ${statusClass}">
        <div class="feedback-status">${status}</div>
        <p>${message}</p>
      </div>`;
  },

  renderPaymentFeedbackColumn(container, data, amountValue = '') {
    const feedback = container.querySelector('#payment-feedback');
    if (!feedback) return;

    const previewState = this.buildPaymentPreviewState(data, amountValue);
    const receipt = this.buildReceiptData(data, previewState);
    feedback.innerHTML = `
      ${this.renderPaymentStatusSummary(data, previewState)}
      ${this.renderPaymentBreakdown(data, previewState)}
      ${this.renderReceiptPreviewHtml(receipt)}
      <button class="action-button primary-btn full-width-btn" id="feedback-print-receipt">Print Receipt</button>
    `;

    const headerPrint = container.querySelector('#header-print-receipt');
    if (headerPrint) headerPrint.classList.remove('hidden');

    const printHandler = () => this.printReceiptFromPreview(receipt);
    feedback.querySelector('#feedback-print-receipt').addEventListener('click', printHandler);
    if (headerPrint) headerPrint.onclick = printHandler;
  },

  printReceiptFromPreview(receipt) {
    const bodyHtml = this.renderReceiptPreviewHtml(receipt);
    const win = window.open('', '_blank', 'width=480,height=720');
    win.document.write(`
      <!DOCTYPE html><html><head><title>Receipt ${receipt.receiptNo}</title>
      <style>
        body { font-family: Georgia, serif; padding: 24px; margin: 0; background: #fff; }
        .receipt-preview-card { max-width: 400px; margin: 0 auto; font-size: 13px; color: #111; }
        .receipt-preview-header { text-align: center; margin-bottom: 12px; }
        .receipt-property { font-weight: 700; font-size: 15px; }
        .receipt-address { color: #555; font-size: 12px; }
        .receipt-preview-title { text-align: center; font-weight: 700; letter-spacing: 0.05em; margin: 12px 0; border-top: 1px solid #111; border-bottom: 1px solid #111; padding: 6px 0; }
        .receipt-row { display: flex; justify-content: space-between; margin: 5px 0; gap: 12px; }
        .receipt-row span:last-child { text-align: right; }
        .receipt-total { font-weight: 700; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 6px; }
        .receipt-divider { border-top: 1px dashed #ccc; margin: 8px 0; }
        .receipt-footer { text-align: center; margin-top: 16px; font-size: 11px; color: #888; border-top: 1px dashed #ccc; padding-top: 10px; }
        @media print { body { padding: 12px; } }
      </style></head><body>${bodyHtml}</body></html>`);
    win.document.close();
    win.print();
  },

  updateTenantDetailAfterPayment(container, data) {
    container.querySelector('#credit-arrears-bar').innerHTML = this.renderCreditArrearsBar(data);
    container.querySelector('#tenant-history-table').innerHTML = this.renderTenantHistoryTable(data.payment_history);

    const statusBadge = container.querySelector('#header-status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge status-${data.current_month_status}`;
      statusBadge.textContent = data.current_month_status;
    }

    const submitBtn = container.querySelector('#submit-payment-btn');
    submitBtn.textContent = 'Submit Payment';
    submitBtn.disabled = true;
    container.querySelector('#payment-amount').value = '';
    container.querySelector('#payment-reference').value = '';

    const remaining = Math.max(
      parseFloat(data.current_month_expected || 0) - parseFloat(data.current_month_paid || 0),
      0
    );
    const payExactBtn = container.querySelector('#pay-exact-btn');
    if (payExactBtn) {
      payExactBtn.textContent = `Pay Remaining (${this.formatKES(remaining)})`;
    }

    this.renderPaymentFeedbackColumn(container, data, '');
    this.attachHistorySortHandler(container);
  },

  async submitTenantPayment(container) {
    const state = container.tenantDetailState;
    const amount = container.querySelector('#payment-amount').value;

    const payload = {
      tenant_id: state.tenantId,
      month: state.billingMonth,
      year: state.billingYear,
      amount_paid: amount,
      payment_method: container.querySelector('#payment-method').value,
      reference_number: container.querySelector('#payment-reference').value,
      payment_date: new Date().toISOString().split('T')[0],
      notes: container.querySelector('#payment-notes').value
    };

    const submitBtn = container.querySelector('#submit-payment-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const result = await apiClient.recordForTenant(payload);
      state.lastPayment = result;

      const data = await apiClient.getTenantDashboard(state.tenantId, {
        month: state.billingMonth,
        year: state.billingYear
      });
      state.dashboard = data;

      this.updateTenantDetailAfterPayment(container, data);
    } catch (error) {
      alert('Error recording payment: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Payment';
    }
  },

  attachHistorySortHandler(container) {
    const th = container.querySelector('.sortable-th');
    if (!th || th.dataset.bound) return;
    th.dataset.bound = '1';
    let sortDesc = true;
    th.addEventListener('click', () => {
      sortDesc = !sortDesc;
      const data = container.tenantDetailState.dashboard;
      if (data) {
        container.querySelector('#tenant-history-table').innerHTML =
          this.renderTenantHistoryTable(data.payment_history, sortDesc);
        this.attachHistorySortHandler(container);
      }
    });
  },

  formatMethod(method) {
    const map = { cash: 'Cash', mpesa: 'M-Pesa', bank_transfer: 'Bank Transfer', cheque: 'Cheque' };
    return map[method] || method;
  },

  generateArrearsNotice(data) {
    const notice = `
RENT ARREARS NOTICE

Date: ${new Date().toLocaleDateString()}

To: ${data.tenant_name}
Unit: ${data.unit_number}
Phone: ${data.phone || 'N/A'}

Dear ${data.tenant_name},

This is to notify you that your rent account is in arrears.

Months unpaid: ${data.months_in_arrears}
Total outstanding: ${this.formatKES(data.total_outstanding)}

Please settle the outstanding amount within 7 days to avoid further action.

Property Management
    `.trim();

    const win = window.open('', '_blank', 'width=500,height=600');
    win.document.write(`<pre style="font-family:serif;padding:32px;white-space:pre-wrap">${notice}</pre>`);
    win.document.close();
    win.print();
  },

  exportGridToCSV(container) {
    const state = container.financialsState;
    const data = state.gridData;
    if (!data || !data.units) {
      alert('No data to export. Load the payment grid first.');
      return;
    }

    const headers = ['Unit', 'Tenant', 'Status', 'Expected', 'Paid', 'Due Date', 'Payment Date', 'Method', 'Reference'];
    const rows = data.units.map(u => [
      u.unit_number,
      u.tenant_name || 'Vacant',
      u.status,
      u.amount_expected,
      u.amount_paid,
      u.due_date || '',
      u.payment_date || '',
      u.payment_method || '',
      u.reference_number || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-payments-${state.year}-${state.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async loadPaymentHistory(container) {
    const state = container.financialsState;
    const contentDiv = container.querySelector('#financials-content');
    const today = new Date();

    contentDiv.innerHTML = `
      <div class="history-filters">
        <select id="history-month">
          <option value="">All Months</option>
          ${this.generateMonthOptions(today.getMonth() + 1)}
        </select>
        <select id="history-year">${this.generateYearOptions(today.getFullYear())}</select>
        <select id="history-status">
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="overpaid">Overpaid</option>
        </select>
        <input type="text" id="history-search" placeholder="Search tenant or unit...">
        <button class="action-button" id="history-load-btn">Filter</button>
      </div>
      <div id="history-table-container"><p class="loading-text">Loading...</p></div>
    `;

    const loadHistory = async () => {
      const tableContainer = contentDiv.querySelector('#history-table-container');
      tableContainer.innerHTML = '<p class="loading-text">Loading...</p>';

      try {
        const params = { property: state.property.id };
        const month = contentDiv.querySelector('#history-month').value;
        const year = contentDiv.querySelector('#history-year').value;
        const status = contentDiv.querySelector('#history-status').value;
        if (month) params.month = month;
        if (year) params.year = year;
        if (status) params.status = status;

        const payments = await apiClient.getRentPayments(params);
        const search = contentDiv.querySelector('#history-search').value.toLowerCase();

        let filtered = Array.isArray(payments) ? payments : (payments.results || []);
        if (search) {
          filtered = filtered.filter(p =>
            (p.tenant_name || '').toLowerCase().includes(search) ||
            (p.unit_number || '').toLowerCase().includes(search)
          );
        }

        if (filtered.length === 0) {
          tableContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📋</div>
              <h3 class="empty-state-title">No Payment Records</h3>
              <p class="empty-state-text">Payment records appear here when you record rent from the grid.</p>
            </div>
          `;
          return;
        }

        tableContainer.innerHTML = `
          <table class="data-table">
            <thead>
              <tr>
                <th>Month</th><th>Unit</th><th>Tenant</th><th>Expected</th>
                <th>Paid</th><th>Status</th><th>Method</th><th>Reference</th>
                <th>Date</th><th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => `
                <tr>
                  <td>${this.MONTHS[p.billing_month - 1]} ${p.billing_year}</td>
                  <td>${p.unit_number || 'N/A'}</td>
                  <td>${p.tenant_name || 'N/A'}</td>
                  <td>${this.formatKES(p.amount_expected)}</td>
                  <td>${this.formatKES(p.amount_paid)}</td>
                  <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                  <td>${p.payment_method ? this.formatMethod(p.payment_method) : '-'}</td>
                  <td>${p.reference_number || '-'}</td>
                  <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td>
                  <td>${p.recorded_by_name || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } catch (error) {
        tableContainer.innerHTML = `<p class="error-text">Error loading history: ${error.message}</p>`;
      }
    };

    contentDiv.querySelector('#history-load-btn').addEventListener('click', loadHistory);
    await loadHistory();
  },

  showGenerateBillingModal(property, container) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const today = new Date();

    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Generate Billing Cycle</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="form-hint">Optional: pre-populate payment records for all active leases. Individual payments can be recorded without this step.</p>
          <div class="form-group">
            <label>Month:</label>
            <select id="billing-month">${this.generateMonthOptions(today.getMonth() + 1)}</select>
          </div>
          <div class="form-group">
            <label>Year:</label>
            <select id="billing-year">${this.generateYearOptions(today.getFullYear())}</select>
          </div>
          <button class="action-button primary-btn" id="generate-btn">Generate</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#generate-btn').addEventListener('click', async () => {
      const month = parseInt(modal.querySelector('#billing-month').value);
      const year = parseInt(modal.querySelector('#billing-year').value);

      try {
        const result = await apiClient.generateBillingCycle({ month, year, property: property.id });
        modal.remove();
        await this.refreshGridData(container);
        alert(`Billing cycle generated: ${result.created} created, ${result.skipped} skipped.`);
      } catch (error) {
        alert('Error generating billing cycle: ' + error.message);
      }
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FinancialsPages };
}
