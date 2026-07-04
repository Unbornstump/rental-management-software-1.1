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

  async loadFinancials(container) {
    const property = AppState.getPropertyContext();
    if (!property) {
      container.innerHTML = '<p>Please select a property to view financials.</p>';
      return;
    }

    const today = new Date();
    container.financialsState = {
      property,
      month: today.getMonth() + 1,
      year: today.getFullYear(),
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
          this.showPaymentPanel(container, parseInt(tenantId));
        }
      });
    });
  },

  async showPaymentPanel(container, tenantId) {
    const state = container.financialsState;
    let panel = document.getElementById('payment-side-panel');

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'payment-side-panel';
      panel.className = 'payment-side-panel';
      document.body.appendChild(panel);
    }

    panel.innerHTML = '<div class="panel-loading">Loading...</div>';
    panel.classList.add('open');
    document.body.classList.add('panel-open');

    const closePanel = () => {
      panel.classList.remove('open');
      document.body.classList.remove('panel-open');
    };

    try {
      const data = await apiClient.getTenantDashboard(tenantId, {
        month: state.month,
        year: state.year
      });

      panel.innerHTML = `
        <div class="panel-header">
          <h2>${data.tenant_name}</h2>
          <button class="panel-close" id="panel-close">&times;</button>
        </div>
        <div class="panel-body">
          <div class="panel-section panel-tenant-info">
            <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
            <p><strong>Unit:</strong> ${data.unit_number}${data.unit_type ? ` (${data.unit_type})` : ''}</p>
            <p><strong>Lease:</strong> ${new Date(data.lease_start).toLocaleDateString()} → ${new Date(data.lease_end).toLocaleDateString()}</p>
            <p><strong>Monthly Rent:</strong> ${this.formatKES(data.rent_amount)}</p>
          </div>

          <div class="panel-section">
            <h3>Current Month Payment</h3>
            <div class="panel-status-row">
              <span class="status-badge status-${data.current_month_status}">${data.current_month_status}</span>
              ${data.payment_streak >= 3 ? '<span class="streak-badge">🔥 ' + data.payment_streak + ' month streak</span>' : ''}
            </div>
            <p><strong>Paid:</strong> ${this.formatKES(data.current_month_paid)} / ${this.formatKES(data.current_month_expected)}</p>
            ${parseFloat(data.amount_owed || 0) > 0 ? `<p class="amount-owed"><strong>Still owed:</strong> ${this.formatKES(data.amount_owed)}</p>` : ''}
            ${data.payment_date ? `<p><strong>Payment date:</strong> ${new Date(data.payment_date).toLocaleDateString()}</p>` : ''}
            ${data.payment_method ? `<p><strong>Method:</strong> ${this.formatMethod(data.payment_method)}</p>` : ''}
            ${data.reference_number ? `<p><strong>Reference:</strong> ${data.reference_number}</p>` : ''}
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
            ${data.is_late ? `<p class="late-notice">Payment recorded ${data.days_overdue} days after due date</p>` : ''}
            ${data.is_overdue && !data.payment_date ? `<p class="late-notice">${data.days_overdue} days overdue</p>` : ''}
          </div>

          ${parseFloat(data.credit_balance || 0) > 0 ? `
            <div class="panel-section panel-credit">
              <p>💳 ${this.formatKES(data.credit_balance)} in credit (carried forward)</p>
            </div>
          ` : ''}

          ${data.months_in_arrears >= 2 ? `
            <div class="panel-section panel-arrears">
              <p>⚠️ ${data.months_in_arrears} months unpaid — ${this.formatKES(data.total_outstanding)} outstanding</p>
              <button class="action-button secondary-btn" id="arrears-notice-btn">Generate Arrears Notice</button>
            </div>
          ` : ''}

          <div class="panel-actions">
            <button class="action-button primary-btn" id="mark-paid-btn">Mark as Paid</button>
            <button class="action-button" id="partial-pay-btn">Record Partial Payment</button>
            <button class="action-button secondary-btn" id="add-note-btn">Add Note</button>
            <button class="action-button secondary-btn" id="view-history-btn">View Full History</button>
          </div>

          <div id="panel-form-area" class="panel-form-area hidden"></div>

          <div id="panel-history-area" class="panel-history-area hidden">
            <h4>Payment History</h4>
            <table class="data-table compact-table">
              <thead>
                <tr><th>Month</th><th>Expected</th><th>Paid</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                ${data.payment_history.map(p => `
                  <tr>
                    <td>${this.MONTHS[p.billing_month - 1]} ${p.billing_year}</td>
                    <td>${this.formatKES(p.amount_expected)}</td>
                    <td>${this.formatKES(p.amount_paid)}</td>
                    <td><span class="status-badge status-${p.status}">${p.status}</span></td>
                    <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      panel.querySelector('#panel-close').addEventListener('click', closePanel);

      panel.querySelector('#mark-paid-btn').addEventListener('click', () => {
        this.showPaymentForm(panel, data, 'paid', container);
      });

      panel.querySelector('#partial-pay-btn').addEventListener('click', () => {
        this.showPaymentForm(panel, data, 'partial', container);
      });

      panel.querySelector('#add-note-btn').addEventListener('click', () => {
        this.showNoteForm(panel, data, container);
      });

      panel.querySelector('#view-history-btn').addEventListener('click', () => {
        const historyArea = panel.querySelector('#panel-history-area');
        historyArea.classList.toggle('hidden');
      });

      const arrearsBtn = panel.querySelector('#arrears-notice-btn');
      if (arrearsBtn) {
        arrearsBtn.addEventListener('click', () => {
          this.generateArrearsNotice(data);
        });
      }

    } catch (error) {
      panel.innerHTML = `
        <div class="panel-header">
          <h2>Error</h2>
          <button class="panel-close" id="panel-close">&times;</button>
        </div>
        <div class="panel-body"><p>${error.message}</p></div>
      `;
      panel.querySelector('#panel-close').addEventListener('click', closePanel);
    }
  },

  formatMethod(method) {
    const map = { cash: 'Cash', mpesa: 'M-Pesa', bank_transfer: 'Bank Transfer', cheque: 'Cheque' };
    return map[method] || method;
  },

  showPaymentForm(panel, data, mode, container) {
    const formArea = panel.querySelector('#panel-form-area');
    const defaultAmount = mode === 'paid'
      ? parseFloat(data.current_month_expected || data.rent_amount)
      : '';

    formArea.classList.remove('hidden');
    formArea.innerHTML = `
      <h4>${mode === 'paid' ? 'Mark as Paid' : 'Record Partial Payment'}</h4>
      <div class="form-group">
        <label>Amount Received</label>
        <input type="number" id="panel-amount" value="${defaultAmount}" step="0.01" ${mode === 'paid' ? 'readonly' : ''}>
      </div>
      <div class="form-group">
        <label>Payment Method</label>
        <select id="panel-method">
          <option value="mpesa">M-Pesa</option>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>
      <div class="form-group">
        <label>Reference Number</label>
        <input type="text" id="panel-reference" placeholder="M-Pesa code, cheque no., etc.">
      </div>
      <div class="form-group">
        <label>Payment Date</label>
        <input type="date" id="panel-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="panel-notes" rows="2"></textarea>
      </div>
      <div class="form-actions">
        <button class="action-button primary-btn" id="panel-submit">Submit</button>
        <button class="action-button secondary-btn" id="panel-cancel">Cancel</button>
      </div>
    `;

    formArea.querySelector('#panel-cancel').addEventListener('click', () => {
      formArea.classList.add('hidden');
    });

    formArea.querySelector('#panel-submit').addEventListener('click', async () => {
      const state = container.financialsState;
      const payload = {
        tenant_id: data.tenant_id,
        month: state.month,
        year: state.year,
        amount_paid: formArea.querySelector('#panel-amount').value,
        payment_method: formArea.querySelector('#panel-method').value,
        reference_number: formArea.querySelector('#panel-reference').value,
        payment_date: formArea.querySelector('#panel-date').value,
        notes: formArea.querySelector('#panel-notes').value
      };

      try {
        const result = await apiClient.recordForTenant(payload);
        formArea.classList.add('hidden');
        await this.refreshGridData(container);
        this.showPaymentPanel(container, data.tenant_id);

        if (mode === 'paid') {
          this.offerPrintReceipt(result, data);
        }
      } catch (error) {
        alert('Error recording payment: ' + error.message);
      }
    });
  },

  showNoteForm(panel, data, container) {
    const formArea = panel.querySelector('#panel-form-area');
    formArea.classList.remove('hidden');
    formArea.innerHTML = `
      <h4>Add Note</h4>
      <div class="form-group">
        <label>Note</label>
        <textarea id="panel-note-text" rows="3">${data.notes || ''}</textarea>
      </div>
      <div class="form-actions">
        <button class="action-button primary-btn" id="panel-note-submit">Save Note</button>
        <button class="action-button secondary-btn" id="panel-note-cancel">Cancel</button>
      </div>
    `;

    formArea.querySelector('#panel-note-cancel').addEventListener('click', () => {
      formArea.classList.add('hidden');
    });

    formArea.querySelector('#panel-note-submit').addEventListener('click', async () => {
      const state = container.financialsState;
      try {
        await apiClient.recordForTenant({
          tenant_id: data.tenant_id,
          month: state.month,
          year: state.year,
          note_only: true,
          notes: formArea.querySelector('#panel-note-text').value
        });
        formArea.classList.add('hidden');
        this.showPaymentPanel(container, data.tenant_id);
      } catch (error) {
        alert('Error saving note: ' + error.message);
      }
    });
  },

  offerPrintReceipt(payment, tenantData) {
    if (!confirm('Payment recorded! Print receipt?')) return;
    this.printReceipt(payment, tenantData);
  },

  printReceipt(payment, tenantData) {
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
      <html><head><title>Payment Receipt</title>
      <style>body{font-family:sans-serif;padding:24px;max-width:360px;margin:0 auto}
      h2{text-align:center;border-bottom:2px solid #333;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;margin:8px 0}
      .total{font-size:18px;font-weight:bold;margin-top:16px;border-top:1px solid #ccc;padding-top:8px}
      </style></head><body>
      <h2>Payment Receipt</h2>
      <div class="row"><span>Property:</span><span>${tenantData.property_name || ''}</span></div>
      <div class="row"><span>Tenant:</span><span>${tenantData.tenant_name}</span></div>
      <div class="row"><span>Unit:</span><span>${tenantData.unit_number}</span></div>
      <div class="row"><span>Month:</span><span>${this.MONTHS[payment.billing_month - 1]} ${payment.billing_year}</span></div>
      <div class="row"><span>Method:</span><span>${this.formatMethod(payment.payment_method)}</span></div>
      <div class="row"><span>Reference:</span><span>${payment.reference_number || '-'}</span></div>
      <div class="row"><span>Date:</span><span>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}</span></div>
      <div class="row total"><span>Amount:</span><span>${this.formatKES(payment.amount_paid)}</span></div>
      <p style="text-align:center;margin-top:24px;color:#666;font-size:12px">Thank you for your payment</p>
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
