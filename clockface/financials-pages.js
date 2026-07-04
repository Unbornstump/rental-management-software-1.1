// Financials Pages Module
// Rent payment grid, tenant payment panel, and payment history

const FinancialsPages = {
  MONTHS: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],

  formatKES(amount) {
    return `KES ${parseFloat(amount || 0).toLocaleString()}`;
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
      container.innerHTML = '<p>Please select a property to view financials.</p>';
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
              <button type="button" class="link-btn" id="pay-exact-btn">Pay Exact Amount (${this.formatKES(data.current_month_expected)})</button>
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

    amountInput.addEventListener('input', () => {
      submitBtn.disabled = !(parseFloat(amountInput.value) > 0);
    });

    container.querySelector('#pay-exact-btn').addEventListener('click', () => {
      amountInput.value = parseFloat(data.current_month_expected || data.rent_amount);
      submitBtn.disabled = false;
    });

    submitBtn.addEventListener('click', () => {
      this.submitTenantPayment(container);
    });

    const headerPrint = container.querySelector('#header-print-receipt');
    if (headerPrint) {
      headerPrint.addEventListener('click', () => {
        this.printReceipt(state.lastPayment || this.buildReceiptFromDashboard(data), data);
      });
    }

    this.attachHistorySortHandler(container);
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

  buildReceiptFromDashboard(data) {
    return {
      billing_month: data.billing_month,
      billing_year: data.billing_year,
      amount_paid: data.current_month_paid,
      amount_expected: data.current_month_expected,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      payment_date: data.payment_date,
      status: data.current_month_status,
      id: data.payment_id,
      recorded_by_name: data.recorded_by_name
    };
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

      this.updateTenantDetailAfterPayment(container, data, result);
    } catch (error) {
      alert('Error recording payment: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Payment';
    }
  },

  updateTenantDetailAfterPayment(container, data, payment) {
    const state = container.tenantDetailState;
    const monthLabel = `${this.MONTHS[data.billing_month - 1]} ${data.billing_year}`;
    const feedback = container.querySelector('#payment-feedback');
    const status = payment.status;
    const paid = parseFloat(payment.amount_paid || 0);
    const expected = parseFloat(payment.amount_expected || 0);
    const owed = Math.max(expected - paid, 0);

    let feedbackHtml = '';

    if (status === 'paid') {
      feedbackHtml = `
        <div class="feedback-result feedback-paid">
          <div class="feedback-status">Paid</div>
          <p>${this.formatKES(paid)} received — Fully paid for ${monthLabel}</p>
          <button class="action-button primary-btn" id="feedback-print-receipt">Print Receipt</button>
        </div>`;
    } else if (status === 'partial') {
      feedbackHtml = `
        <div class="feedback-result feedback-partial">
          <div class="feedback-status">Partial</div>
          <p>${this.formatKES(paid)} received — ${this.formatKES(owed)} still owed</p>
          <button class="action-button primary-btn" id="feedback-print-receipt">Print Receipt</button>
        </div>`;
    } else if (status === 'overpaid') {
      const breakdown = this.computeSurplusBreakdown(paid, expected, data.rent_amount);
      feedbackHtml = `
        <div class="feedback-result feedback-overpaid">
          <div class="feedback-status">Overpaid</div>
          <p>${this.formatKES(paid)} received on ${this.formatKES(expected)} rent</p>
          <p>Surplus: ${this.formatKES(breakdown.surplus)}</p>
          <p>Credit: ${breakdown.fullMonths} full months + ${breakdown.remainingDays} days into next month</p>
          <p class="credit-formula">(${this.formatKES(data.rent_amount)}/month = ~${this.formatKES(breakdown.dailyRate)}/day)</p>
          <button class="action-button primary-btn" id="feedback-print-receipt">Print Receipt</button>
        </div>`;
    }

    feedback.innerHTML = feedbackHtml;

    container.querySelector('#credit-arrears-bar').innerHTML = this.renderCreditArrearsBar(data);
    container.querySelector('#tenant-history-table').innerHTML = this.renderTenantHistoryTable(data.payment_history);

    const statusBadge = container.querySelector('#header-status-badge');
    if (statusBadge) {
      statusBadge.className = `status-badge status-${data.current_month_status}`;
      statusBadge.textContent = data.current_month_status;
    }

    const headerPrint = container.querySelector('#header-print-receipt');
    if (headerPrint) {
      headerPrint.classList.remove('hidden');
    }

    const submitBtn = container.querySelector('#submit-payment-btn');
    submitBtn.textContent = 'Submit Payment';
    submitBtn.disabled = true;
    container.querySelector('#payment-amount').value = '';

    const printBtn = container.querySelector('#feedback-print-receipt');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.printReceipt(payment, data);
      });
    }

    if (headerPrint) {
      headerPrint.onclick = () => this.printReceipt(payment, data);
    }

    this.attachHistorySortHandler(container);
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

  printReceipt(payment, tenantData) {
    const monthLabel = `${this.MONTHS[payment.billing_month - 1]} ${payment.billing_year}`;
    const receiptNo = tenantData.receipt_number ||
      (payment.id ? `RCP-${payment.billing_year}-${String(payment.id).padStart(4, '0')}` : 'RCP-PENDING');
    const paid = parseFloat(payment.amount_paid || 0);
    const expected = parseFloat(payment.amount_expected || tenantData.current_month_expected || tenantData.rent_amount || 0);
    const owed = Math.max(expected - paid, 0);
    const breakdown = this.computeSurplusBreakdown(paid, expected, tenantData.rent_amount);
    const status = payment.status || tenantData.current_month_status;
    const recordedBy = payment.recorded_by_name || tenantData.recorded_by_name || '—';

    let balanceSection = '';
    if (status === 'partial') {
      balanceSection = `<div class="row highlight"><span>Balance Remaining:</span><span>${this.formatKES(owed)}</span></div>`;
    }
    if (status === 'overpaid' && breakdown.surplus > 0) {
      balanceSection = `
        <div class="row"><span>Surplus:</span><span>${this.formatKES(breakdown.surplus)}</span></div>
        <div class="row"><span>Credit:</span><span>${breakdown.fullMonths} months + ${breakdown.remainingDays} days</span></div>`;
    }

    const win = window.open('', '_blank', 'width=480,height=720');
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Receipt ${receiptNo}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Georgia, serif; padding: 32px; max-width: 420px; margin: 0 auto; color: #111; }
        h1 { text-align: center; font-size: 20px; margin: 0 0 4px; }
        .subtitle { text-align: center; color: #555; font-size: 13px; margin-bottom: 20px; }
        .receipt-no { text-align: center; font-size: 12px; color: #666; margin-bottom: 16px; }
        .divider { border-top: 2px solid #111; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
        .row.highlight { font-weight: bold; margin-top: 8px; }
        .total { font-size: 16px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #888; border-top: 1px dashed #ccc; padding-top: 12px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>${tenantData.property_name || ''}</h1>
      <div class="subtitle">${tenantData.property_address || ''}</div>
      <div class="receipt-no">Receipt No: ${receiptNo}</div>
      <div class="divider"></div>
      <div class="row"><span>Date:</span><span>${payment.payment_date ? this.formatDate(payment.payment_date) : this.formatDate(new Date())}</span></div>
      <div class="row"><span>Tenant:</span><span>${tenantData.tenant_name}</span></div>
      <div class="row"><span>Phone:</span><span>${tenantData.phone || '—'}</span></div>
      <div class="row"><span>Unit:</span><span>${tenantData.unit_number}</span></div>
      <div class="row"><span>Lease:</span><span>${this.formatDate(tenantData.lease_start)} → ${this.formatDate(tenantData.lease_end)}</span></div>
      <div class="row"><span>Billing Month:</span><span>${monthLabel}</span></div>
      <div class="row"><span>Monthly Rent:</span><span>${this.formatKES(tenantData.rent_amount)}</span></div>
      <div class="divider"></div>
      <div class="row total"><span>Amount Paid:</span><span>${this.formatKES(paid)}</span></div>
      <div class="row"><span>Method:</span><span>${this.formatMethod(payment.payment_method)}</span></div>
      <div class="row"><span>Reference:</span><span>${payment.reference_number || '—'}</span></div>
      <div class="row"><span>Status:</span><span>${status.charAt(0).toUpperCase() + status.slice(1)}</span></div>
      ${balanceSection}
      <div class="row"><span>Recorded By:</span><span>${recordedBy}</span></div>
      <div class="footer">This is a system-generated receipt — mijengo RMS</div>
      </body></html>
    `);
    win.document.close();
    win.print();
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
