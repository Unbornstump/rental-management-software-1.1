// Units Pages Module
// Handles property units and legacy units pages

const UnitsPages = {
  // Property Units (Property Space - Units module)
  async loadPropertyUnits(container) {
    const property = AppState.getPropertyContext();

    if (!property) {
      PropertyPages.loadProperties(container);
      return;
    }

    container.innerHTML = `
      ${SharedComponents.renderPropertySpaceHeader('Units', property.name, `
        <div class="header-actions">
          <button class="action-button" id="create-unit-btn">+ Bulk Create</button>
          <button class="action-button" id="delete-units-btn">Delete Units</button>
        </div>
      `)}
      <div id="units-container"></div>
    `;

    const createUnitButton = document.getElementById('create-unit-btn');
    const deleteUnitsButton = document.getElementById('delete-units-btn');
    const canManageUnits = AppState.isManager() || AppState.isPropertyOfficer();

    if (canManageUnits) {
      createUnitButton.addEventListener('click', () => {
        Modals.showBulkUnitModal(property.id);
      });
      deleteUnitsButton.addEventListener('click', () => {
        Modals.showDeleteUnitsModal(property.id);
      });
    } else {
      createUnitButton.style.display = 'none';
      deleteUnitsButton.style.display = 'none';
    }

    this.renderUnits(container, property);
  },

  async renderUnits(container, property) {
    const unitsContainer = document.getElementById('units-container');

    try {
      const [units, tenants, leases] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getTenants(),
        apiClient.getLeases()
      ]);

      const filteredUnits = units.filter(u => u.property == property.id);
      const activeLeases = leases.filter(l => l.status === 'active');
      const occupiedUnitIds = activeLeases.map(l => l.unit);
      
      const unitsWithOccupancy = filteredUnits.map(unit => ({
        ...unit,
        isOccupied: occupiedUnitIds.includes(unit.id)
      }));

      if (filteredUnits.length === 0) {
        const canManageUnits = AppState.isManager() || AppState.isPropertyOfficer();
        unitsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🚪</div>
            <h3 class="empty-state-title">No Units Yet</h3>
            <p class="empty-state-text">Bulk create your first units to get started.</p>
            ${canManageUnits ? `<button class="action-button" onclick="Modals.showBulkUnitModal(${property.id})">+ Bulk Create Units</button>` : ''}
          </div>
        `;
        return;
      }

      const sortedUnits = [...unitsWithOccupancy].sort((a, b) => {
        return SharedComponents.extractUnitNumber(a.unit_number) - SharedComponents.extractUnitNumber(b.unit_number);
      });

      this.renderUnitsOverview(unitsContainer, sortedUnits);
      this.renderUnitsTable(unitsContainer, sortedUnits, tenants, leases);
    } catch (error) {
      unitsContainer.innerHTML = `<p>Error loading units: ${error.message}</p>`;
    }
  },

  renderUnitsOverview(container, units) {
    const overview = document.createElement('div');
    overview.className = 'units-overview-panel';
    overview.innerHTML = `
      <h3 class="panel-title">Unit Overview</h3>
      <div class="unit-selector-grid units-overview-grid">
        ${units.map(unit => `
          <div class="unit-selector-tile unit-overview-tile"
               data-unit-id="${unit.id}"
               title="${unit.isOccupied ? 'Occupied' : 'Vacant'}">
            <span class="unit-overview-dot ${unit.isOccupied ? 'occupied' : 'vacant'}"></span>
            <span class="unit-overview-label">${unit.unit_number || 'N/A'}</span>
          </div>
        `).join('')}
      </div>
      <div class="units-overview-legend">
        <span class="legend-item"><span class="unit-overview-dot occupied"></span> Occupied</span>
        <span class="legend-item"><span class="unit-overview-dot vacant"></span> Vacant</span>
      </div>
    `;

    container.appendChild(overview);

    overview.querySelectorAll('.unit-overview-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const unitId = tile.dataset.unitId;
        const unit = units.find(u => u.id == unitId);
        if (unit) {
          Modals.showUnitEditModal(unit);
        }
      });
    });
  },

  renderUnitsTable(container, units, tenants, leases) {
    const unitTenants = {};
    leases.forEach(lease => {
      if (lease.status === 'active') {
        const tenant = tenants.find(t => t.id == lease.tenant);
        if (tenant) {
          unitTenants[lease.unit] = tenant.full_name || tenant.name || 'Unknown';
        }
      }
    });

    const tableSection = document.createElement('div');
    tableSection.className = 'units-table-section';
    tableSection.innerHTML = `
      <h3 class="panel-title">Unit Details</h3>
      <div class="units-table-container">
        <table class="units-table">
          <thead>
            <tr>
              <th>Unit</th><th>Type</th><th>Rent</th><th>Tenant</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${units.map(unit => `
              <tr class="unit-row" data-unit-id="${unit.id}">
                <td><strong>${unit.unit_number || 'N/A'}</strong></td>
                <td>${unit.unit_type || 'N/A'}</td>
                <td>${parseFloat(unit.rent_amount || 0).toLocaleString()}</td>
                <td>${unitTenants[unit.id] || '-'}</td>
                <td>
                  <span class="status-badge status-${unit.isOccupied ? 'occupied' : 'vacant'}">
                    ${unit.isOccupied ? 'Occupied' : 'Vacant'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.appendChild(tableSection);

    const canEditUnits = AppState.isManager() || AppState.isPropertyOfficer();
    tableSection.querySelectorAll('.unit-row').forEach(row => {
      row.addEventListener('click', () => {
        if (!canEditUnits) return;
        const unitId = row.dataset.unitId;
        const unit = units.find(u => u.id == unitId);
        if (unit) {
          Modals.showUnitEditModal(unit);
        }
      });
    });
  },

  // Units (Legacy - kept for compatibility)
  async loadUnits(container) {
    container.innerHTML = `
      ${SharedComponents.renderContextSelector()}
      <h1 class="page-title">Units</h1>
      <div class="page-header">
        <button class="action-button" id="create-unit-btn">Create Unit</button>
      </div>
      <ul class="data-list" id="units-list"></ul>
    `;

    SharedComponents.attachContextSelectorHandler(container);

    const canManageUnits = AppState.isManager() || AppState.isPropertyOfficer();
    const createUnitBtn = document.getElementById('create-unit-btn');
    if (canManageUnits) {
      createUnitBtn.addEventListener('click', () => {
        const property = AppState.getPropertyContext();
        Modals.showUnitModal(null, property?.id);
      });
    } else {
      createUnitBtn.style.display = 'none';
    }

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
            ${canManageUnits ? `<button class="action-button-small edit-btn" data-id="${unit.id}">Edit</button>` : ''}
            ${canManageUnits ? `<button class="action-button-small delete-btn" data-id="${unit.id}">Delete</button>` : ''}
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
  }
};
