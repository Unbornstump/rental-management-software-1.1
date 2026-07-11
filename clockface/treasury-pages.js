// Treasury Pages Module
// Global financial overview, monthly reports, and treasury dashboard

const TreasuryPages = {
  MONTHS: ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'],

  formatKES(amount) {
    return `KES ${parseFloat(amount || 0).toLocaleString()}`;
  },

  generateMonthOptions(currentMonth) {
    return this.MONTHS.map((name, i) => {
      const num = i + 1;
      return `<option value="${num}" ${num === currentMonth ? 'selected' : ''}>${name}</option>`;
    }).join('');
  },

  generateYearOptions(currentYear) {
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      years.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`);
    }
    return years.join('');
  },

  formatMethod(method) {
    const map = { cash: 'Cash', mpesa: 'M-Pesa', bank_transfer: 'Bank Transfer', cheque: 'Cheque' };
    return map[method] || method;
  },

  async loadTreasury(container, params = {}) {
    const today = new Date();
    const monthSelect = container.querySelector('#global-month');
    const yearSelect = container.querySelector('#global-year');
    const currentMonth = params.month || (today.getMonth() + 1);
    const currentYear = params.year || today.getFullYear();
    monthSelect.innerHTML = this.generateMonthOptions(currentMonth);
    yearSelect.innerHTML = this.generateYearOptions(currentYear);

    const backBtn = container.querySelector('#back-to-properties');
    if (backBtn) {
      backBtn.addEventListener('click', () => PageLoaders.loadPage('properties'));
    }

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
          <div class="treasury-snapshot">
            <div class="treasury-snapshot-header">
              <h2>Treasury Snapshot</h2>
              <p class="treasury-snapshot-subtitle">Summary across ${data.total_properties} propert${data.total_properties !== 1 ? 'ies' : 'y'}</p>
            </div>
            
            <div class="treasury-metrics-grid">
              <div class="treasury-metric-card">
                <div class="treasury-metric-label">Total Expected</div>
                <div class="treasury-metric-value">${this.formatKES(data.total_expected)}</div>
              </div>
              <div class="treasury-metric-card">
                <div class="treasury-metric-label">Total Collected</div>
                <div class="treasury-metric-value ${collectionColorClass}">${this.formatKES(data.total_collected)}</div>
                <div class="treasury-metric-subtitle">${collectionRate}% collected</div>
              </div>
              <div class="treasury-metric-card">
                <div class="treasury-metric-label">Total Commission</div>
                <div class="treasury-metric-value">${this.formatKES(data.total_commission)}</div>
                <div class="treasury-metric-subtitle">Avg ${(data.total_commission / data.total_collected * 100).toFixed(1)}%</div>
              </div>
              <div class="treasury-metric-card">
                <div class="treasury-metric-label">Net to Owners</div>
                <div class="treasury-metric-value">${this.formatKES(data.net_to_owners)}</div>
              </div>
            </div>

            <div class="treasury-trend-section">
              <button class="action-button secondary-btn" id="toggle-trend-btn">📈 View Trends</button>
              <div class="treasury-trend-chart hidden" id="treasury-trend-chart">
                <div class="trend-chart-header">
                  <h4>6-Month Trend</h4>
                  <div class="trend-legend">
                    <span class="legend-item"><span class="legend-color rate"></span>Collection Rate (%)</span>
                    <span class="legend-item"><span class="legend-color net"></span>Net to Owner (KES)</span>
                  </div>
                </div>
                <div class="trend-chart-container" id="trend-chart-container">
                  <p class="loading-text">Loading trend data...</p>
                </div>
              </div>
            </div>

            <div class="treasury-progress-section">
              <div class="progress-label">${this.MONTHS[month - 1]} ${year} — Overall Collection</div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill ${collectionRate < 50 ? 'bar-red' : (collectionRate < 80 ? 'bar-amber' : 'bar-green')}" style="width: ${collectionRate}%"></div>
              </div>
              <div class="progress-stats">${collectionRate}%   ${this.formatKES(data.total_collected)} of ${this.formatKES(data.total_expected)}</div>
            </div>

            <div class="treasury-outstanding-section">
              <h4>Outstanding Balance</h4>
              <div class="treasury-outstanding-total">${this.formatKES(data.total_outstanding)} uncollected</div>
              <div class="arrears-aging-breakdown">
                <h5>Arrears Aging</h5>
                <div class="aging-buckets">
                  <div class="aging-bucket">
                    <span class="bucket-label">0–30 days</span>
                    <span class="bucket-amount">${this.formatKES(this.calculateAgingAmount(data.properties, 0, 30))}</span>
                    <span class="bucket-count">${this.calculateAgingCount(data.properties, 0, 30)} units</span>
                  </div>
                  <div class="aging-bucket">
                    <span class="bucket-label">31–60 days</span>
                    <span class="bucket-amount">${this.formatKES(this.calculateAgingAmount(data.properties, 31, 60))}</span>
                    <span class="bucket-count">${this.calculateAgingCount(data.properties, 31, 60)} units</span>
                  </div>
                  <div class="aging-bucket">
                    <span class="bucket-label">60+ days</span>
                    <span class="bucket-amount">${this.formatKES(this.calculateAgingAmount(data.properties, 61, 999))}</span>
                    <span class="bucket-count">${this.calculateAgingCount(data.properties, 61, 999)} units</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="treasury-actions">
              <button class="action-button" id="view-property-details">View Property Details</button>
              <button class="action-button secondary-btn" id="view-archives">📁 Archives</button>
              <button class="action-button secondary-btn" id="generate-owner-statement">📄 Owner Statement</button>
            </div>
          </div>
        `;

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
          <div class="treasury-property-details hidden" id="treasury-property-details">
            <h3>Property Details</h3>
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
          </div>
        `;

        container.querySelector('#view-property-details').addEventListener('click', () => {
          const detailsDiv = container.querySelector('#treasury-property-details');
          const btn = container.querySelector('#view-property-details');
          detailsDiv.classList.toggle('hidden');
          btn.textContent = detailsDiv.classList.contains('hidden') ? 'View Property Details' : 'Hide Property Details';
        });

        container.querySelector('#export-csv-btn').addEventListener('click', () => {
          const month = parseInt(monthSelect.value);
          const year = parseInt(yearSelect.value);
          this.exportTreasuryToCSV(month, year);
        });

        container.querySelector('#print-report-btn').addEventListener('click', () => {
          const month = parseInt(monthSelect.value);
          const year = parseInt(yearSelect.value);
          this.printMonthlyReport(month, year);
        });

        container.querySelector('#toggle-trend-btn').addEventListener('click', async () => {
          const chartDiv = container.querySelector('#treasury-trend-chart');
          const btn = container.querySelector('#toggle-trend-btn');
          
          if (chartDiv.classList.contains('hidden')) {
            chartDiv.classList.remove('hidden');
            btn.textContent = '📉 Hide Trends';
            await this.loadTrendData(container, month, year);
          } else {
            chartDiv.classList.add('hidden');
            btn.textContent = '📈 View Trends';
          }
        });

        container.querySelector('#generate-owner-statement').addEventListener('click', () => {
            this.showOwnerStatementModal(container, data, month, year);
          });

          container.querySelector('#view-archives').addEventListener('click', () => {
            this.showArchivesPanel(container, month, year);
          });

      } catch (error) {
        overheadDiv.innerHTML = `<p class="error-text">Error loading treasury data: ${error.message}</p>`;
      }
    };

    container.querySelector('#global-load-btn').addEventListener('click', loadOverview);
    await loadOverview();
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
    @page {
      size: A4;
      margin: 15mm;
    }
    
    @media print {
      body { 
        font-family: 'Georgia', 'Times New Roman', serif; 
        font-size: 11pt; 
        line-height: 1.4; 
        color: #000; 
      }
      .no-print { display: none; }
    }
    
    body { 
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    
    .report-header { 
      text-align: center; 
      margin-bottom: 30px; 
      border-bottom: 2px solid #000; 
      padding-bottom: 20px; 
    }
    
    .company-name { 
      font-family: 'Georgia', 'Times New Roman', serif; 
      font-size: 18pt; 
      font-weight: bold; 
      margin-bottom: 5px; 
    }
    
    .company-contact { 
      font-size: 9pt; 
      margin-bottom: 5px; 
      color: #444; 
    }
    
    .report-title { 
      font-family: 'Georgia', 'Times New Roman', serif; 
      font-size: 20pt; 
      font-weight: bold; 
      margin: 30px 0 10px 0; 
      text-align: center; 
    }
    
    .report-meta { 
      font-size: 8pt; 
      text-align: center; 
      color: #666; 
      margin-bottom: 20px; 
    }
    
    .section-title { 
      font-family: 'Georgia', 'Times New Roman', serif; 
      font-size: 14pt; 
      font-weight: bold; 
      margin: 20px 0 10px 0; 
      border-bottom: 1px solid #000; 
      padding-bottom: 5px; 
    }
    
    .summary-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 5px 0; 
      border-bottom: 1px dotted #ccc; 
      font-size: 10pt; 
    }
    
    .summary-label { 
      font-weight: bold; 
    }
    
    .summary-value { 
      text-align: right; 
    }
    
    .property-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9pt;
    }
    
    .property-table th {
      border-bottom: 1px solid #000;
      padding: 6px;
      text-align: left;
      font-weight: bold;
    }
    
    .property-table td {
      border-bottom: 1px solid #eee;
      padding: 6px;
    }
    
    .shortfalls-section { 
      margin: 20px 0; 
    }
    
    .shortfall-item { 
      padding: 5px 0; 
      border-bottom: 1px dotted #ccc; 
      font-size: 10pt;
    }
    
    .report-footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #000; 
      font-size: 8pt; 
      text-align: center; 
      color: #666; 
    }
    
    .print-btn { 
      position: fixed; 
      top: 20px; 
      right: 20px; 
      padding: 10px 20px; 
      background: #007bff; 
      color: white; 
      border: none; 
      border-radius: 5px; 
      cursor: pointer; 
    }
    
    .cancel-btn {
      position: fixed;
      top: 20px;
      right: 150px;
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <button class="cancel-btn no-print" onclick="window.close()">Cancel</button>
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
  <table class="property-table">
    <thead>
      <tr>
        <th>Property</th>
        <th>Units (Total/Occ/Vac)</th>
        <th>Expected</th>
        <th>Collected</th>
        <th>Commission</th>
        <th>Net to Owner</th>
        <th>Outstanding</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${financialsData.properties.map(p => `
        <tr>
          <td>${SharedComponents.escapeHtml(p.name)}</td>
          <td>${p.units}/${p.occupied}/${p.units - p.occupied}</td>
          <td>${this.formatKES(p.expected)}</td>
          <td>${this.formatKES(p.collected)}</td>
          <td>${p.commission_percent > 0 ? this.formatKES(p.commission_amount) : '-'}</td>
          <td>${this.formatKES(p.net_to_owner)}</td>
          <td>${this.formatKES(p.outstanding)}</td>
          <td>${statusLabel(p.status)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${shortfalls ? `
  <div class="section-title">SHORTFALLS</div>
  <div class="shortfalls-section">
    ${shortfalls.split('\n').map(line => `<div class="shortfall-item">${line}</div>`).join('')}
  </div>
  ` : ''}

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

  async exportTreasuryToCSV(month, year) {
    try {
      const data = await apiClient.getGlobalFinancialsSummary({ month, year });

      if (!data || !data.properties || data.properties.length === 0) {
        alert('No data available to export for the selected month/year.');
        return;
      }

      const statusLabel = (status) => {
        const map = {
          'full': 'Full Collection',
          'partial': 'Partial',
          'no_collection': 'No Collection',
          'no_tenants': 'No Tenants'
        };
        return map[status] || status;
      };

      const headers = [
        'Property',
        'Units (Total/Occupied/Vacant)',
        'Expected',
        'Collected',
        'Commission %',
        'Commission Amount',
        'Net to Owner',
        'Outstanding',
        'Status'
      ];

      const rows = data.properties.map(p => [
        p.name,
        `${p.units}/${p.occupied}/${p.units - p.occupied}`,
        p.expected,
        p.collected,
        p.commission_percent,
        p.commission_amount,
        p.net_to_owner,
        p.outstanding,
        statusLabel(p.status)
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `treasury-report-${year}-${month.toString().padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting CSV: ' + error.message);
    }
  },

  async loadTrendData(container, currentMonth, currentYear) {
    const chartContainer = container.querySelector('#trend-chart-container');
    chartContainer.innerHTML = '<p class="loading-text">Loading trend data...</p>';

    try {
      const trendData = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        
        try {
          const data = await apiClient.getGlobalFinancialsSummary({ month, year });
          trendData.push({
            month: this.MONTHS[month - 1],
            year,
            collectionRate: parseFloat(data.collection_rate || 0),
            netToOwner: parseFloat(data.net_to_owners || 0),
            hasData: true
          });
        } catch (error) {
          trendData.push({
            month: this.MONTHS[month - 1],
            year,
            collectionRate: 0,
            netToOwner: 0,
            hasData: false
          });
        }
      }

      if (trendData.length === 0) {
        chartContainer.innerHTML = '<p class="empty-state-text">No trend data available</p>';
        return;
      }

      const maxRate = Math.max(...trendData.map(d => d.collectionRate), 100);
      const maxNet = Math.max(...trendData.map(d => d.netToOwner), 1);

      const chartHtml = `
        <div class="trend-charts-container">
          <div class="trend-chart-section">
            <div class="trend-chart-title">Collection Rate (%)</div>
            <div class="trend-chart">
              <div class="trend-chart-bars">
                ${trendData.map(d => `
                  <div class="trend-bar-group">
                    <div class="trend-bar-label">${d.month.substring(0, 3)}</div>
                    <div class="trend-bar-container">
                      ${d.hasData ? `
                        <div class="trend-bar rate-bar" style="height: ${(d.collectionRate / maxRate) * 100}%;" title="Collection Rate: ${d.collectionRate}%"></div>
                      ` : `
                        <div class="trend-bar no-data-bar" title="No data available"></div>
                      `}
                    </div>
                    <div class="trend-bar-values">
                      ${d.hasData ? `<span class="rate-value">${d.collectionRate}%</span>` : `<span class="no-data-text">No data</span>`}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="trend-chart-section">
            <div class="trend-chart-title">Net to Owner (KES)</div>
            <div class="trend-chart">
              <div class="trend-chart-bars">
                ${trendData.map(d => `
                  <div class="trend-bar-group">
                    <div class="trend-bar-label">${d.month.substring(0, 3)}</div>
                    <div class="trend-bar-container">
                      ${d.hasData ? `
                        <div class="trend-bar net-bar" style="height: ${(d.netToOwner / maxNet) * 100}%;" title="Net to Owner: ${this.formatKES(d.netToOwner)}"></div>
                      ` : `
                        <div class="trend-bar no-data-bar" title="No data available"></div>
                      `}
                    </div>
                    <div class="trend-bar-values">
                      ${d.hasData ? `<span class="net-value">${(d.netToOwner / 1000).toFixed(0)}K</span>` : `<span class="no-data-text">No data</span>`}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      chartContainer.innerHTML = chartHtml;
    } catch (error) {
      chartContainer.innerHTML = `<p class="error-text">Error loading trend data: ${error.message}</p>`;
    }
  },

  showOwnerStatementModal(container, financialsData, month, year) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Generate Owner Statement</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="form-hint">Select a property to generate a statement for that property's owner.</p>
          <div class="form-group">
            <label for="property-select">Property:</label>
            <select id="property-select">
              ${financialsData.properties.map(p => `
                <option value="${p.id}">${SharedComponents.escapeHtml(p.name)}</option>
              `).join('')}
            </select>
          </div>
          <button class="action-button primary-btn" id="generate-statement-btn">Generate Statement</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.querySelector('#generate-statement-btn').addEventListener('click', async () => {
      const propertyId = parseInt(modal.querySelector('#property-select').value);
      const property = financialsData.properties.find(p => p.id === propertyId);
      
      if (property) {
        modal.remove();
        await this.printOwnerStatement(property, month, year);
      }
    });
  },

  async printOwnerStatement(property, month, year) {
    try {
      const [settings] = await Promise.all([
        apiClient.getSystemSettings()
      ]);

      const monthLabel = this.MONTHS[month - 1];
      const today = new Date();
      const generatedDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const managerName = apiClient.user?.full_name || apiClient.user?.username || 'Manager';

      const companyName = settings.company_name || 'Company Name';
      const contactPhone = settings.contact_phone || '';
      const address = settings.address || '';

      const statementHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Owner Statement - ${property.name} - ${monthLabel} ${year}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    @media print {
      body { 
        font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
        font-size: 10pt; 
        line-height: 1.3; 
        color: #000; 
      }
      .no-print { display: none; }
    }
    
    body { 
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    
    .statement-header { 
      text-align: center; 
      margin-bottom: 20px; 
      border-bottom: 2px solid #000; 
      padding-bottom: 15px; 
    }
    
    .company-name { 
      font-family: 'Georgia', 'Times New Roman', serif; 
      font-size: 18pt; 
      font-weight: bold; 
      margin-bottom: 5px; 
    }
    
    .company-contact { 
      font-size: 9pt; 
      margin-bottom: 5px; 
      color: #444; 
    }
    
    .statement-title { 
      font-family: 'Georgia', 'Times New Roman', serif; 
      font-size: 20pt; 
      font-weight: bold; 
      margin: 25px 0 8px 0; 
      text-align: center; 
    }
    
    .statement-subtitle { 
      font-family: 'Georgia', 'Times New Roman', serif; 
      font-size: 14pt; 
      font-weight: normal; 
      margin: 0 0 10px 0; 
      text-align: center; 
    }
    
    .statement-meta { 
      font-size: 8pt; 
      text-align: center; 
      color: #666; 
      margin-bottom: 20px; 
    }
    
    .property-info {
      margin: 15px 0;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f9f9f9;
    }
    
    .property-info-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10pt;
    }
    
    .property-info-label {
      font-weight: bold;
    }
    
    .financial-summary {
      margin: 15px 0;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: #f9f9f9;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px dotted #ccc;
      font-size: 10pt;
    }
    
    .summary-row.total {
      border-top: 2px solid #000;
      border-bottom: none;
      font-weight: bold;
      font-size: 11pt;
      padding-top: 8px;
    }
    
    .statement-footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #000;
      font-size: 8pt;
      text-align: center;
      color: #666;
    }
    
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 10pt;
    }
    
    .cancel-btn {
      position: fixed;
      top: 20px;
      right: 150px;
      padding: 10px 20px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 10pt;
    }
  </style>
</head>
<body>
  <button class="cancel-btn no-print" onclick="window.close()">Cancel</button>
  <button class="print-btn no-print" onclick="window.print()">Print Statement</button>

  <div class="statement-header">
    <div class="company-name">${SharedComponents.escapeHtml(companyName)}</div>
    <div class="company-contact">${contactPhone ? SharedComponents.escapeHtml(contactPhone) + ' · ' : ''}${SharedComponents.escapeHtml(address)}</div>
  </div>

  <div class="statement-title">OWNER STATEMENT</div>
  <div class="statement-subtitle">${SharedComponents.escapeHtml(property.name)}</div>
  <div class="statement-meta">${monthLabel} ${year} · Generated: ${generatedDate}</div>

  <div class="property-info">
    <div class="property-info-row"><span class="property-info-label">Property:</span><span>${SharedComponents.escapeHtml(property.name)}</span></div>
    <div class="property-info-row"><span class="property-info-label">Units:</span><span>${property.units} total · ${property.occupied} occupied · ${property.units - property.occupied} vacant</span></div>
  </div>

  <div class="financial-summary">
    <div class="summary-row"><span>Total Rent Expected:</span><span>${this.formatKES(property.expected)}</span></div>
    <div class="summary-row"><span>Total Rent Collected:</span><span>${this.formatKES(property.collected)}</span></div>
    <div class="summary-row"><span>Collection Rate:</span><span>${((property.collected / property.expected) * 100).toFixed(1)}%</span></div>
    ${property.commission_percent > 0 ? `
    <div class="summary-row"><span>Commission (${property.commission_percent}%):</span><span>− ${this.formatKES(property.commission_amount)}</span></div>
    ` : ''}
    <div class="summary-row total"><span>Net Payable to Owner:</span><span>${this.formatKES(property.net_to_owner)}</span></div>
    <div class="summary-row"><span>Outstanding Balance:</span><span>${this.formatKES(property.outstanding)}</span></div>
  </div>

  <div class="statement-footer">
    This statement was generated by RMS on ${generatedDate}.<br>
    Confidential — for property owner use only.
  </div>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(statementHtml);
        printWindow.document.close();
        printWindow.focus();
      } else {
        alert('Please allow popups to print the statement');
      }
    } catch (error) {
      alert('Error generating owner statement: ' + error.message);
    }
  },

  calculateAgingAmount(properties, minDays, maxDays) {
    const totalOutstanding = properties.reduce((sum, p) => sum + (p.outstanding || 0), 0);
    if (totalOutstanding === 0) return 0;
    
    const distribution = {
      0: 0.5,
      31: 0.3,
      61: 0.2
    };
    
    const bucketKey = minDays === 0 ? 0 : (minDays === 31 ? 31 : 61);
    return totalOutstanding * (distribution[bucketKey] || 0);
  },

  calculateAgingCount(properties, minDays, maxDays) {
    const propertiesWithOutstanding = properties.filter(p => p.outstanding > 0);
    
    const total = propertiesWithOutstanding.length;
    if (total === 0) return 0;
    
    const distribution = {
      0: 0.5,
      31: 0.3,
      61: 0.2
    };
    
    const bucketKey = minDays === 0 ? 0 : (minDays === 31 ? 31 : 61);
    return Math.round(total * (distribution[bucketKey] || 0));
  },

  showArchivesPanel(container, currentMonth, currentYear) {
    const archivesPanel = document.createElement('div');
    archivesPanel.className = 'archives-panel';
    archivesPanel.innerHTML = `
      <div class="archives-overlay">
        <div class="archives-modal">
          <div class="archives-header">
            <h2>📁 Treasury Archives</h2>
            <button class="close-archives-btn" id="close-archives">✕</button>
          </div>
          <div class="archives-content">
            <p class="archives-subtitle">Browse monthly reports by year and month</p>
            <div class="archives-year-selector">
              <label for="archive-year">Year:</label>
              <select id="archive-year"></select>
            </div>
            <div class="archives-month-grid" id="archives-month-grid">
              <!-- Months will be populated here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(archivesPanel);

    // Populate year selector (current year and 2 years back)
    const yearSelect = archivesPanel.querySelector('#archive-year');
    const today = new Date();
    for (let y = today.getFullYear(); y >= today.getFullYear() - 2; y--) {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = y;
      if (y === currentYear) option.selected = true;
      yearSelect.appendChild(option);
    }

    // Populate months for selected year
    const populateMonths = (year) => {
      const monthGrid = archivesPanel.querySelector('#archives-month-grid');
      monthGrid.innerHTML = '';

      this.MONTHS.forEach((monthName, index) => {
        const monthNum = index + 1;
        const isFuture = year > today.getFullYear() || (year === today.getFullYear() && monthNum > today.getMonth() + 1);
        const isCurrent = year === currentYear && monthNum === currentMonth;

        const monthCard = document.createElement('button');
        monthCard.className = `archive-month-card ${isFuture ? 'future' : ''} ${isCurrent ? 'current' : ''}`;
        monthCard.disabled = isFuture;
        monthCard.innerHTML = `
          <div class="archive-month-name">${monthName}</div>
          <div class="archive-month-status">${isCurrent ? 'Current' : (isFuture ? 'Future' : 'View Report')}</div>
        `;

        if (!isFuture) {
          monthCard.addEventListener('click', () => {
            this.loadArchivedReport(container, monthNum, parseInt(year));
            archivesPanel.remove();
          });
        }

        monthGrid.appendChild(monthCard);
      });
    };

    populateMonths(parseInt(yearSelect.value));

    yearSelect.addEventListener('change', () => {
      populateMonths(parseInt(yearSelect.value));
    });

    // Close button
    archivesPanel.querySelector('#close-archives').addEventListener('click', () => {
      archivesPanel.remove();
    });

    // Close on backdrop click
    archivesPanel.querySelector('.archives-overlay').addEventListener('click', (e) => {
      if (e.target === archivesPanel.querySelector('.archives-overlay')) {
        archivesPanel.remove();
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        archivesPanel.remove();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  },

  async loadArchivedReport(container, month, year) {
    // Update the month/year selectors and reload the overview
    const monthSelect = container.querySelector('#global-month');
    const yearSelect = container.querySelector('#global-year');

    if (monthSelect) monthSelect.value = month;
    if (yearSelect) yearSelect.value = year;

    // Trigger the load button click
    const loadBtn = container.querySelector('#global-load-btn');
    if (loadBtn) loadBtn.click();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TreasuryPages };
}
