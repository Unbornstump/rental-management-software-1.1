// Modal Functions for RMS
// Handles all modal dialogs for creating/editing entities

const Modals = {
  renderUnitTypeFields(selectedType = '', customValue = '') {
    return `
          <div class="form-group">
            <label for="unit-type">Unit Type</label>
            <select id="unit-type" name="unit_type">
              ${UnitTypes.renderSelectOptions(selectedType)}
            </select>
          </div>
          <div class="form-group unit-type-other-group" id="unit-type-other-group" style="display: ${UnitTypes.isOther(selectedType) ? 'block' : 'none'};">
            <label for="unit-type-custom">Specify unit type</label>
            <input type="text" id="unit-type-custom" name="unit_type_custom" placeholder="e.g. Penthouse, Warehouse" value="${SharedComponents.escapeHtml(customValue)}">
          </div>`;
  },

  attachUnitTypeOtherToggle(modal) {
    const select = modal.querySelector('#unit-type');
    const otherGroup = modal.querySelector('#unit-type-other-group');
    if (!select || !otherGroup) return;
    const toggle = () => {
      otherGroup.style.display = UnitTypes.isOther(select.value) ? 'block' : 'none';
    };
    select.addEventListener('change', toggle);
    toggle();
  },

  getUnitTypePayload(formData) {
    const unitType = formData.get('unit_type');
    const custom = (formData.get('unit_type_custom') || '').trim();
    return {
      unit_type: unitType,
      unit_type_custom: UnitTypes.isOther(unitType) ? custom : '',
    };
  },

  attachBulkUnitValidation(modal) {
    const form = modal.querySelector('#bulk-unit-form');
    FormValidation.attachForm(form, {
      'unit-prefix': {
        validate: (v) => (v && v.trim())
          ? true
          : "Give these units a name or prefix, e.g. 'Room' or 'Unit'.",
      },
      'unit-count': {
        validate: (v) => {
          const n = parseInt(v, 10);
          if (!v || Number.isNaN(n) || n < 1) {
            return "Enter how many units you'd like to create (must be at least 1).";
          }
          return true;
        },
      },
      'rent-amount': {
        validate: (v) => {
          if (v === '' || v === null) {
            return "Enter a rent amount to continue — this can't be left blank.";
          }
          if (parseFloat(v) < 0) return 'Rent amount cannot be negative.';
          return true;
        },
      },
      'unit-type': {
        validate: (v) => (v ? true : 'Select a unit type to continue.'),
      },
      'unit-type-custom': {
        validate: (v, _input, formEl) => {
          const type = formEl.querySelector('#unit-type')?.value;
          if (UnitTypes.isOther(type) && !(v || '').trim()) {
            return 'Please specify the unit type when "Other" is selected.';
          }
          return true;
        },
      },
    });
  },

  attachTenantFormValidation(modal) {
    const form = modal.querySelector('#tenant-form');
    FormValidation.attachForm(form, {
      'tenant-name': {
        validate: (v) => (v && v.trim()) ? true : 'Please enter the tenant\'s full name.',
      },
      'tenant-phone': {
        validate: (v) => {
          if (!v || !v.trim()) return 'Please enter a phone number.';
          if (!PhoneValidation.isValidKenyanNumber(v)) {
            return "That doesn't look like a valid phone number.";
          }
          return true;
        },
        markValidOnPass: true,
      },
    });
    PhoneValidation.attachLiveValidation(form.querySelector('#tenant-phone'));
  },

  // Property Modal
  showPropertyModal(property = null) {
    const isEdit = property !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Property' : 'Create Property'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="property-form">
          <div class="form-group">
            <label for="property-name">Name</label>
            <input type="text" id="property-name" name="name" value="${property?.name || ''}">
          </div>
          <div class="form-group">
            <label for="property-type">Property Type</label>
            <select id="property-type" name="property_type">
              <option value="">Select type</option>
              <option value="apartment" ${property?.property_type === 'apartment' ? 'selected' : ''}>Apartment</option>
              <option value="house" ${property?.property_type === 'house' ? 'selected' : ''}>House</option>
              <option value="commercial" ${property?.property_type === 'commercial' ? 'selected' : ''}>Commercial</option>
              <option value="land" ${property?.property_type === 'land' ? 'selected' : ''}>Land</option>
            </select>
          </div>
          <div class="form-group">
            <label for="property-location">Location</label>
            <input type="text" id="property-location" name="location" value="${property?.location || ''}">
          </div>
          <div class="form-group">
            <label for="property-description">Description</label>
            <textarea id="property-description" name="owner_details">${property?.owner_details || property?.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label for="property-commission">Commission (%)</label>
            <input type="number" id="property-commission" name="commission_percent" min="0" max="100" step="0.01" value="${property?.commission_percent ?? 10.00}">
            <small class="form-hint">Percentage of rent collected retained as commission.</small>
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">${isEdit ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    FormValidation.attachForm(modal.querySelector('#property-form'), {
      'property-name': { validate: (v) => (v && v.trim()) ? true : 'Enter a property name.' },
      'property-type': { validate: (v) => (v ? true : 'Select a property type.') },
      'property-location': { validate: (v) => (v && v.trim()) ? true : 'Enter a location for this property.' },
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Track unsaved changes
    const form = modal.querySelector('#property-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        AppState.setUnsavedChanges(true);
      });
    });

    modal.querySelector('#property-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!FormValidation.validateForm(e.target)) return;
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        property_type: formData.get('property_type'),
        location: formData.get('location'),
        owner_details: formData.get('owner_details'),
        commission_percent: parseFloat(formData.get('commission_percent') || 0)
      };

      try {
        if (isEdit) {
          await apiClient.updateProperty(property.id, data);
        } else {
          await apiClient.createProperty(data);
        }
        AppState.setUnsavedChanges(false);
        modal.remove();
        PageLoaders.loadPage('properties');
      } catch (error) {
        alert('Error saving property: ' + error.message);
      }
    });
  },

  // Unit Modal
  showUnitModal(unit = null, preselectedPropertyId = null) {
    if (!(AppState.isManager() || AppState.isPropertyOfficer())) {
      alert('You do not have permission to manage units.');
      return;
    }
    const isEdit = unit !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Unit' : 'Add Unit'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="unit-form">
          <div class="form-group">
            <label for="unit-number">Unit Number</label>
            <input type="text" id="unit-number" name="unit_number" value="${unit?.unit_number || ''}">
          </div>
          ${this.renderUnitTypeFields(unit?.unit_type || '', unit?.unit_type_custom || '')}
          <div class="form-group">
            <label for="rent-amount">Rent Amount</label>
            <input type="number" id="rent-amount" name="rent_amount" value="${unit?.rent_amount || ''}">
          </div>
          <div class="form-group">
            <label for="property">Property</label>
            <select id="property" name="property">
              <option value="">Select property</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">${isEdit ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachUnitTypeOtherToggle(modal);
    FormValidation.attachForm(modal.querySelector('#unit-form'), {
      'unit-number': { validate: (v) => (v && v.trim()) ? true : 'Enter a unit number.' },
      'unit-type': { validate: (v) => (v ? true : 'Select a unit type to continue.') },
      'unit-type-custom': {
        validate: (v, _input, formEl) => {
          const type = formEl.querySelector('#unit-type')?.value;
          if (UnitTypes.isOther(type) && !(v || '').trim()) {
            return 'Please specify the unit type when "Other" is selected.';
          }
          return true;
        },
      },
      'rent-amount': {
        validate: (v) => {
          if (v === '' || v === null) return "Enter a rent amount to continue — this can't be left blank.";
          return true;
        },
      },
      property: { validate: (v) => (v ? true : 'Select a property.') },
    });

    apiClient.getProperties().then(properties => {
      const select = modal.querySelector('#property');
      properties.forEach(prop => {
        const option = document.createElement('option');
        option.value = prop.id;
        option.textContent = prop.name;
        if (unit?.property == prop.id || (preselectedPropertyId && prop.id == preselectedPropertyId)) option.selected = true;
        select.appendChild(option);
      });
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Track unsaved changes
    const form = modal.querySelector('#unit-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        AppState.setUnsavedChanges(true);
      });
    });

    modal.querySelector('#unit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!FormValidation.validateForm(e.target)) return;
      const formData = new FormData(e.target);
      const data = {
        unit_number: formData.get('unit_number'),
        ...this.getUnitTypePayload(formData),
        rent_amount: parseFloat(formData.get('rent_amount')),
        property: formData.get('property')
      };

      try {
        if (isEdit) {
          await apiClient.updateUnit(unit.id, data);
        } else {
          await apiClient.createUnit(data);
        }
        AppState.setUnsavedChanges(false);
        modal.remove();

        // Reload appropriate page based on context
        const property = AppState.getPropertyContext();
        if (property) {
          PageLoaders.loadPage('property-units');
        } else {
          PageLoaders.loadPage('units');
        }
      } catch (error) {
        alert('Error saving unit: ' + error.message);
      }
    });
  },

  // Bulk Unit Creation Modal
  showBulkUnitModal(propertyId) {
    if (!(AppState.isManager() || AppState.isPropertyOfficer())) {
      alert('You do not have permission to create units.');
      return;
    }
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal bulk-unit-modal">
        <div class="modal-header">
          <h2>Bulk Create Units</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="bulk-unit-form">
          <div class="form-group">
            <label for="unit-prefix">Unit Prefix/Label</label>
            <input type="text" id="unit-prefix" name="prefix" placeholder="e.g. A, B, Room, Shop">
            <small class="form-hint">Units will be named: Prefix 1, Prefix 2, etc.</small>
          </div>
          <div class="form-group">
            <label for="start-number">Start numbering at</label>
            <input type="number" id="start-number" name="start_number" min="1" value="1">
          </div>
          <div class="form-group">
            <label for="unit-count">Number of Units</label>
            <input type="number" id="unit-count" name="count" min="1" max="100" value="10">
          </div>
          ${this.renderUnitTypeFields()}
          <div class="form-group">
            <label for="rent-amount">Rent Amount (per month)</label>
            <input type="number" id="rent-amount" name="rent_amount" min="0">
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">Create Units</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachUnitTypeOtherToggle(modal);
    this.attachBulkUnitValidation(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Function to update start number based on prefix
    const updateStartNumber = async () => {
      const prefixInput = modal.querySelector('#unit-prefix');
      const startNumberInput = modal.querySelector('#start-number');
      const prefix = prefixInput.value.trim();
      
      if (!prefix) {
        startNumberInput.value = 1;
        return;
      }

      try {
        const allUnits = await apiClient.getUnits();
        const propertyUnits = allUnits.filter(u => u.property == propertyId);
        
        // Find units matching the prefix pattern
        let maxNumber = 0;
        const prefixPattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)$`, 'i');
        
        propertyUnits.forEach(unit => {
          const match = unit.unit_number.match(prefixPattern);
          if (match) {
            const number = parseInt(match[1], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
          }
        });

        startNumberInput.value = maxNumber + 1;
      } catch (error) {
        console.error('Error fetching units for start number calculation:', error);
      }
    };

    // Attach event listener to prefix input
    modal.querySelector('#unit-prefix').addEventListener('input', updateStartNumber);
    
    // Initial call to set start number when modal opens
    updateStartNumber();

    modal.querySelector('#bulk-unit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!FormValidation.validateForm(e.target)) return;
      const formData = new FormData(e.target);
      const prefix = formData.get('prefix').trim();
      const count = parseInt(formData.get('count'));
      const startNumber = parseInt(formData.get('start_number'));
      const typePayload = this.getUnitTypePayload(formData);
      const rentAmount = parseFloat(formData.get('rent_amount'));

      // Generate unit numbers
      const unitsToCreate = [];
      for (let i = 0; i < count; i++) {
        unitsToCreate.push({
          unit_number: `${prefix} ${startNumber + i}`,
          ...typePayload,
          rent_amount: rentAmount,
          property: propertyId,
          status: 'vacant'
        });
      }

      try {
        // Create all units
        await apiClient.bulkCreateUnits(unitsToCreate);
        modal.remove();
        
        // Reload units page
        PageLoaders.loadPage('property-units');
      } catch (error) {
        let errorMessage = 'Error creating units. ';
        
        if (error.response && error.response.data) {
          const data = error.response.data;
          
          // Handle bulk create specific errors
          if (data.errors && Array.isArray(data.errors)) {
            const conflictUnits = data.errors
              .filter(err => err.errors && err.errors.non_field_errors)
              .map(err => err.unit_number);
            
            if (conflictUnits.length > 0) {
              errorMessage += `The following units already exist: ${conflictUnits.join(', ')}. `;
            } else {
              // Show all errors if not just conflicts
              const errorDetails = data.errors.map(err => 
                `${err.unit_number}: ${JSON.stringify(err.errors)}`
              ).join('; ');
              errorMessage += errorDetails;
            }
          } else if (data.error) {
            errorMessage += data.error;
          } else if (typeof data === 'object') {
            const errorDetails = [];
            for (const key in data) {
              if (Array.isArray(data[key])) {
                errorDetails.push(...data[key]);
              } else {
                errorDetails.push(data[key]);
              }
            }
            if (errorDetails.length > 0) {
              errorMessage += errorDetails.join(' ');
            } else if (data.detail) {
              errorMessage += data.detail;
            } else {
              errorMessage += JSON.stringify(data);
            }
          } else {
            errorMessage += data;
          }
        } else {
          errorMessage += error.message;
        }
        
        alert(errorMessage);
      }
    });
  },

  async showDeleteUnitsModal(propertyId) {
    if (!(AppState.isManager() || AppState.isPropertyOfficer())) {
      alert('You do not have permission to delete units.');
      return;
    }
    const extractUnitNumber = (unitNumber) => {
      if (!unitNumber) return 0;
      const matches = unitNumber.match(/\d+/g);
      if (!matches || matches.length === 0) return 0;
      return parseInt(matches[matches.length - 1], 10);
    };

    let vacantUnits = [];
    try {
      const [allUnits, allLeases] = await Promise.all([
        apiClient.getUnits(),
        apiClient.getLeases()
      ]);
      const occupiedUnitIds = new Set(
        allLeases.filter(l => l.status === 'active').map(l => l.unit)
      );
      vacantUnits = allUnits
        .filter(u => u.property == propertyId && u.status === 'vacant' && !occupiedUnitIds.has(u.id))
        .sort((a, b) => extractUnitNumber(a.unit_number) - extractUnitNumber(b.unit_number));
    } catch (error) {
      alert('Error loading units: ' + error.message);
      return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal bulk-unit-modal delete-units-modal">
        <div class="modal-header">
          <h2>Delete Units</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-form">
          <p class="form-hint">Select vacant units to delete. Click a tile to select or deselect.</p>
          <div class="unit-selector-grid" id="delete-units-grid">
            ${vacantUnits.map(unit => `
              <div class="unit-selector-tile"
                   data-unit-id="${unit.id}"
                   data-unit-number="${unit.unit_number}">
                ${unit.unit_number}
              </div>
            `).join('')}
          </div>
          ${vacantUnits.length === 0 ? '<p class="no-units-msg">No vacant units available to delete.</p>' : ''}
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="button" class="action-button danger-btn" id="confirm-delete-units-btn" disabled>
              Delete Selected (0)
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const deleteBtn = modal.querySelector('#confirm-delete-units-btn');
    const grid = modal.querySelector('#delete-units-grid');

    const updateDeleteButton = () => {
      const selectedCount = grid.querySelectorAll('.unit-selector-tile.selected-for-delete').length;
      deleteBtn.textContent = `Delete Selected (${selectedCount})`;
      deleteBtn.disabled = selectedCount === 0;
    };

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    grid.querySelectorAll('.unit-selector-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        tile.classList.toggle('selected-for-delete');
        updateDeleteButton();
      });
    });

    deleteBtn.addEventListener('click', async () => {
      const selectedTiles = [...grid.querySelectorAll('.unit-selector-tile.selected-for-delete')];
      const selectedCount = selectedTiles.length;
      if (selectedCount === 0) return;

      const unitLabels = selectedTiles.map(tile => tile.dataset.unitNumber).join(', ');
      const confirmed = confirm(
        `Are you sure you want to permanently delete ${selectedCount} unit${selectedCount === 1 ? '' : 's'}?\n\n${unitLabels}`
      );
      if (!confirmed) return;

      try {
        await Promise.all(
          selectedTiles.map(tile => apiClient.deleteUnit(tile.dataset.unitId))
        );
        modal.remove();
        PageLoaders.loadPage('property-units');
      } catch (error) {
        alert('Error deleting units: ' + error.message);
      }
    });
  },

  // Unit Edit Modal (for individual unit editing)
  async showUnitEditModal(unit, isOccupied = false) {
    if (!(AppState.isManager() || AppState.isPropertyOfficer())) {
      alert('You do not have permission to edit units.');
      return;
    }

    // Show different modal based on occupancy
    if (isOccupied) {
      await this.showOccupiedUnitModal(unit);
    } else {
      this.showVacantUnitModal(unit);
    }
  },

  // Vacant Unit Modal - Edit Unit without Status field
  showVacantUnitModal(unit) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal vacant-unit-modal">
        <div class="modal-header">
          <h2>Edit Unit</h2>
          <span class="status-pill status-pill-vacant">Vacant</span>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="unit-edit-form">
          <div class="form-group">
            <label for="unit-number">Unit Number</label>
            <input type="text" id="unit-number" name="unit_number" value="${unit?.unit_number || ''}">
          </div>
          ${this.renderUnitTypeFields(unit?.unit_type || '', unit?.unit_type_custom || '')}
          <div class="form-group">
            <label for="rent-amount">Rent Amount</label>
            <input type="number" id="rent-amount" name="rent_amount" value="${unit?.rent_amount || ''}">
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">Update</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachUnitTypeOtherToggle(modal);
    FormValidation.attachForm(modal.querySelector('#unit-edit-form'), {
      'unit-number': { validate: (v) => (v && v.trim()) ? true : 'Enter a unit number.' },
      'unit-type': { validate: (v) => (v ? true : 'Select a unit type to continue.') },
      'unit-type-custom': {
        validate: (v, _input, formEl) => {
          const type = formEl.querySelector('#unit-type')?.value;
          if (UnitTypes.isOther(type) && !(v || '').trim()) {
            return 'Please specify the unit type when "Other" is selected.';
          }
          return true;
        },
      },
      'rent-amount': {
        validate: (v) => {
          if (v === '' || v === null) return "Enter a rent amount to continue — this can't be left blank.";
          return true;
        },
      },
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#unit-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!FormValidation.validateForm(e.target)) return;
      const formData = new FormData(e.target);
      const data = {
        unit_number: formData.get('unit_number'),
        ...this.getUnitTypePayload(formData),
        rent_amount: parseFloat(formData.get('rent_amount'))
      };

      try {
        await apiClient.updateUnit(unit.id, data);
        modal.remove();
        PageLoaders.loadPage('property-units');
      } catch (error) {
        alert('Error updating unit: ' + error.message);
      }
    });
  },

  // Occupied Unit Modal - Read-only with tenant info
  async showOccupiedUnitModal(unit) {
    // Fetch tenant information for this unit
    let tenant = null;
    let tenantInitials = '??';
    let tenantColor = '#2f80ed';
    
    try {
      const [leases, tenants] = await Promise.all([
        apiClient.getLeases(),
        apiClient.getTenants()
      ]);
      
      const activeLease = leases.find(l => l.unit == unit.id && l.status === 'active');
      if (activeLease) {
        tenant = tenants.find(t => t.id == activeLease.tenant);
        if (tenant) {
          const tenantName = tenant.full_name || tenant.name || '';
          tenantInitials = tenantName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          // Simple hash for color
          let hash = 0;
          for (let i = 0; i < tenantName.length; i++) {
            hash = tenantName.charCodeAt(i) + ((hash << 5) - hash);
          }
          const colors = ['#2f80ed', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
          tenantColor = colors[Math.abs(hash) % colors.length];
        }
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error);
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal occupied-unit-modal">
        <div class="modal-header">
          <h2>Unit Occupied</h2>
          <span class="status-pill status-pill-occupied">Occupied</span>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${tenant ? `
            <div class="occupant-info">
              <div class="occupant-avatar" style="background-color: ${tenantColor}">
                ${tenantInitials}
              </div>
              <div class="occupant-details">
                <h3 class="occupant-name">${tenant.full_name || tenant.name || 'Unknown'}</h3>
                <p class="occupant-phone">${tenant.phone || 'N/A'}</p>
              </div>
            </div>
          ` : `
            <div class="occupant-info">
              <p class="no-occupant">Tenant information not available</p>
            </div>
          `}
          <div class="unit-details-readonly">
            <div class="readonly-field">
              <label>Unit Number</label>
              <div class="readonly-value">${unit?.unit_number || 'N/A'}</div>
            </div>
            <div class="readonly-field">
              <label>Unit Type</label>
              <div class="readonly-value">${UnitTypes.formatDisplay(unit?.unit_type, unit?.unit_type_custom) || 'N/A'}</div>
            </div>
            <div class="readonly-field">
              <label>Rent Amount</label>
              <div class="readonly-value">KES ${parseFloat(unit?.rent_amount || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          ${tenant ? `<button type="button" class="action-button primary-btn" id="view-tenant-btn">View Tenant</button>` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    const viewTenantBtn = modal.querySelector('#view-tenant-btn');
    if (viewTenantBtn && tenant) {
      viewTenantBtn.addEventListener('click', () => {
        modal.remove();
        // Open tenant details modal
        const property = AppState.getPropertyContext();
        TenantsPages.showTenantDetailModal(tenant, unit.unit_number, property, 'active');
      });
    }
  },

  // Landlord Modal
  showLandlordModal(landlord = null) {
    const isEdit = landlord !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Landlord' : 'Create Landlord'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="landlord-form">
          <div class="form-group">
            <label for="landlord-name">Name</label>
            <input type="text" id="landlord-name" name="name" value="${landlord?.name || ''}" required>
          </div>
          <div class="form-group">
            <label for="landlord-email">Email</label>
            <input type="email" id="landlord-email" name="email" value="${landlord?.email || ''}" required>
          </div>
          <div class="form-group">
            <label for="landlord-phone">Phone</label>
            <input type="tel" id="landlord-phone" name="phone" value="${landlord?.phone || ''}" required>
          </div>
          <div class="form-group">
            <label for="landlord-address">Address</label>
            <textarea id="landlord-address" name="address">${landlord?.address || ''}</textarea>
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">${isEdit ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    modal.querySelector('#landlord-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address')
      };

      try {
        if (isEdit) {
          await apiClient.updateLandlord(landlord.id, data);
        } else {
          await apiClient.createLandlord(data);
        }
        modal.remove();
        PageLoaders.loadPage('landlords');
      } catch (error) {
        alert('Error saving landlord: ' + error.message);
      }
    });
  },

  // Tenant Modal
  async showTenantModal(tenant = null, propertyId = null) {
    if (!AppState.isManager()) {
      alert('You do not have permission to manage tenants.');
      return;
    }

    const isEdit = tenant !== null;
    const property = propertyId ? { id: propertyId } : AppState.getPropertyContext();
    
    if (!property) {
      alert('Please select a property first');
      return;
    }

    // Fetch units for this property
    let units = [];
    try {
      const allUnits = await apiClient.getUnits();
      units = allUnits.filter(u => u.property == property.id);
      // Sort units numerically by the last number in the unit name
      units.sort((a, b) => {
        const extractNumber = (str) => {
          const matches = str.match(/\d+/g);
          if (!matches || matches.length === 0) return 0;
          return parseInt(matches[matches.length - 1], 10);
        };
        const numA = extractNumber(a.unit_number);
        const numB = extractNumber(b.unit_number);
        return numA - numB;
      });
    } catch (error) {
      console.error('Error fetching units:', error);
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal tenant-modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Tenant' : 'Register Tenant'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="tenant-form">
          <div class="form-section">
            <h3 class="form-section-title">Personal Information</h3>
            <div class="form-group">
              <label for="tenant-name">Full Name</label>
              <input type="text" id="tenant-name" name="full_name" value="${tenant?.full_name || tenant?.name || ''}">
            </div>
            <div class="form-group phone-input-wrapper">
              <label for="tenant-phone">Phone</label>
              <input type="tel" id="tenant-phone" name="phone" value="${tenant?.phone || ''}" placeholder="e.g. 0712 345 678">
            </div>
            <div class="form-group">
              <label for="tenant-email">Email</label>
              <input type="email" id="tenant-email" name="email" value="${tenant?.email || ''}">
            </div>
            <div class="form-group">
              <label for="tenant-national-id">National ID</label>
              <input type="text" id="tenant-national-id" name="national_id" value="${tenant?.national_id || ''}">
            </div>
            <div class="form-group">
              <label for="tenant-emergency-contact">Emergency Contact</label>
              <input type="text" id="tenant-emergency-contact" name="emergency_contact" value="${tenant?.emergency_contact || ''}">
            </div>
          </div>
          
          ${!isEdit ? `
          <div class="form-section">
            <h3 class="form-section-title">Assign Unit</h3>
            <div class="form-group">
              <label for="unit-search">Room Code</label>
              <input type="text" id="unit-search" name="unit_search" placeholder="Type unit code (e.g., A 1)">
              <small class="form-hint">Or select from the grid below</small>
            </div>
            <div class="unit-selector-grid" id="unit-selector-grid">
              ${units.map(unit => `
                <div class="unit-selector-tile ${unit.status === 'occupied' ? 'occupied' : ''}" 
                     data-unit-id="${unit.id}" 
                     data-unit-number="${unit.unit_number}">
                  ${unit.unit_number}
                </div>
              `).join('')}
            </div>
            <input type="hidden" id="selected-unit-id" name="unit_id">
            <div id="unit-error" class="form-error" style="display: none;">Please select a vacant unit</div>
          </div>
          ` : ''}
          
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">${isEdit ? 'Update' : 'Register'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachTenantFormValidation(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Track unsaved changes
    const form = modal.querySelector('#tenant-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        AppState.setUnsavedChanges(true);
      });
    });

    // Unit selector logic (only for new tenant registration)
    if (!isEdit) {
      const unitSearch = modal.querySelector('#unit-search');
      const unitSelectorGrid = modal.querySelector('#unit-selector-grid');
      const selectedUnitIdInput = modal.querySelector('#selected-unit-id');
      const unitError = modal.querySelector('#unit-error');
      let selectedUnitId = null;

      // Sync: typing in search highlights matching unit
      unitSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const matchingTile = unitSelectorGrid.querySelector(`[data-unit-number="${searchTerm}"]`);
        
        // Clear previous selection
        unitSelectorGrid.querySelectorAll('.unit-selector-tile').forEach(tile => {
          tile.classList.remove('selected');
        });
        
        if (matchingTile && !matchingTile.classList.contains('occupied')) {
          matchingTile.classList.add('selected');
          selectedUnitId = matchingTile.dataset.unitId;
          selectedUnitIdInput.value = selectedUnitId;
          unitError.style.display = 'none';
        } else if (searchTerm && !matchingTile) {
          // No match found
          selectedUnitId = null;
          selectedUnitIdInput.value = '';
        }
      });

      // Sync: clicking tile populates search input
      unitSelectorGrid.querySelectorAll('.unit-selector-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          if (tile.classList.contains('occupied')) {
            return; // Don't allow selecting occupied units
          }
          
          // Clear previous selection
          unitSelectorGrid.querySelectorAll('.unit-selector-tile').forEach(t => {
            t.classList.remove('selected');
          });
          
          // Select this tile
          tile.classList.add('selected');
          selectedUnitId = tile.dataset.unitId;
          selectedUnitIdInput.value = selectedUnitId;
          unitSearch.value = tile.dataset.unitNumber;
          unitError.style.display = 'none';
        });
      });

      // Form submission validation
      modal.querySelector('#tenant-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!FormValidation.validateForm(e.target)) return;
        
        // Validate unit selection for new tenants
        if (!isEdit && !selectedUnitId) {
          unitError.style.display = 'block';
          unitError.textContent = 'Please select a vacant unit';
          return;
        }

        const formData = new FormData(e.target);
        const data = {
          full_name: formData.get('full_name'),
          phone: formData.get('phone'),
          email: formData.get('email') || undefined, // Send undefined instead of empty string
          national_id: formData.get('national_id') || undefined,
          emergency_contact: formData.get('emergency_contact') || undefined,
          status: 'active'
        };

        try {
          if (isEdit) {
            await apiClient.updateTenant(tenant.id, data);
            modal.remove();
            
            // Reload appropriate page based on context
            const currentProperty = AppState.getPropertyContext();
            if (currentProperty) {
              PageLoaders.loadPage('property-tenants');
            } else {
              PageLoaders.loadPage('tenants');
            }
          } else {
            // Create tenant
            const createdTenant = await apiClient.createTenant(data);

            if (selectedUnitId) {
              // Get unit details for lease modal
              const allUnits = await apiClient.getUnits();
              const unit = allUnits.find(u => u.id == selectedUnitId);

              // Close tenant modal and open lease agreement modal
              modal.remove();
              this.showLeaseAgreementModal(
                createdTenant.id,
                createdTenant.full_name,
                selectedUnitId,
                unit.unit_number,
                unit.rent_amount
              );
            } else {
              AppState.setUnsavedChanges(false);
              modal.remove();
              const currentProperty = AppState.getPropertyContext();
              if (currentProperty) {
                PageLoaders.loadPage('property-tenants');
              } else {
                PageLoaders.loadPage('tenants');
              }
            }
          }
        } catch (error) {
          let errorMessage = 'Error saving tenant: ';
          
          if (error.response && error.response.data) {
            const data = error.response.data;
            if (typeof data === 'object') {
              const errorDetails = [];
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  errorDetails.push(...data[key]);
                } else {
                  errorDetails.push(data[key]);
                }
              }
              if (errorDetails.length > 0) {
                errorMessage += errorDetails.join(' ');
              } else if (data.detail) {
                errorMessage += data.detail;
              } else {
                errorMessage += JSON.stringify(data);
              }
            } else {
              errorMessage += data;
            }
          } else {
            errorMessage += error.message;
          }
          
          alert(errorMessage);
        }
      });
    } else {
      // Edit mode - no unit selection needed
      modal.querySelector('#tenant-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!FormValidation.validateForm(e.target)) return;
        const formData = new FormData(e.target);
        const data = {
          full_name: formData.get('full_name'),
          phone: formData.get('phone'),
          email: formData.get('email'),
          national_id: formData.get('national_id'),
          emergency_contact: formData.get('emergency_contact'),
          status: 'active'
        };

        try {
          await apiClient.updateTenant(tenant.id, data);
          AppState.setUnsavedChanges(false);
          modal.remove();

          // Reload appropriate page based on context
          const currentProperty = AppState.getPropertyContext();
          if (currentProperty) {
            PageLoaders.loadPage('property-tenants');
          } else {
            PageLoaders.loadPage('tenants');
          }
        } catch (error) {
          let errorMessage = 'Error saving tenant: ';
          
          if (error.response && error.response.data) {
            const data = error.response.data;
            if (typeof data === 'object') {
              const errorDetails = [];
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  errorDetails.push(...data[key]);
                } else {
                  errorDetails.push(data[key]);
                }
              }
              if (errorDetails.length > 0) {
                errorMessage += errorDetails.join(' ');
              } else if (data.detail) {
                errorMessage += data.detail;
              } else {
                errorMessage += JSON.stringify(data);
              }
            } else {
              errorMessage += data;
            }
          } else {
            errorMessage += error.message;
          }
          
          alert(errorMessage);
        }
      });
    }
  },

  // Lease Agreement Modal (for new tenant registration or re-leasing)
  showLeaseAgreementModal(tenantId, tenantName, unitId, unitNumber, unitRentAmount, isReLease = false) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Calculate end date as today + 30 days
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    modal.innerHTML = `
      <div class="modal lease-modal">
        <div class="modal-header">
          <h2>${isReLease ? 'Re-lease Agreement' : 'Lease Agreement'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="lease-form">
          <div class="lease-summary">
            <div class="lease-summary-item">
              <span class="lease-summary-label">Tenant:</span>
              <span class="lease-summary-value">${tenantName}</span>
            </div>
            <div class="lease-summary-item">
              <span class="lease-summary-label">Unit:</span>
              <span class="lease-summary-value">${unitNumber}</span>
            </div>
          </div>
          
          <div class="form-section">
            <h3 class="form-section-title">Lease Terms</h3>
            <div class="form-group">
              <label for="lease-start-date">Move-in Date / Lease Start</label>
              <input type="date" id="lease-start-date" name="start_date" value="${todayStr}" required>
            </div>
            <div class="form-group">
              <label for="lease-end-date">Lease End Date</label>
              <input type="date" id="lease-end-date" name="end_date" value="${endDateStr}" required>
              <small class="form-hint">Auto-calculated as 30 days from move-in date. Edit for custom lease length.</small>
            </div>
            <div class="form-group">
              <label for="lease-rent">Monthly Rent Amount</label>
              <input type="number" id="lease-rent" name="rent_amount" value="${unitRentAmount}" min="0" required>
            </div>
            <div class="form-group">
              <label for="lease-deposit">Deposit Amount</label>
              <input type="number" id="lease-deposit" name="deposit_amount" min="0" value="0" required>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">Confirm Lease</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Track whether user has manually edited end date
    let userEditedEndDate = false;

    const startDateInput = modal.querySelector('#lease-start-date');
    const endDateInput = modal.querySelector('#lease-end-date');

    // Function to calculate end date from start date
    const calculateEndDate = (startDate) => {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + 30);
      return end.toISOString().split('T')[0];
    };

    // When start date changes, auto-update end date if user hasn't manually edited it
    startDateInput.addEventListener('change', (e) => {
      if (!userEditedEndDate) {
        endDateInput.value = calculateEndDate(e.target.value);
      }
    });

    // When user manually edits end date, stop auto-updating
    endDateInput.addEventListener('change', () => {
      userEditedEndDate = true;
    });

    endDateInput.addEventListener('input', () => {
      userEditedEndDate = true;
    });

    modal.querySelector('.modal-close').addEventListener('click', () => {
      if (confirm('Warning: Closing this without confirming the lease means this tenant cannot be charged rent. You can create the lease later from the tenant\'s profile.')) {
        AppState.setUnsavedChanges(false);
        modal.remove();
        if (isReLease) {
          PageLoaders.loadPage('property-tenants');
        } else {
          PageLoaders.loadPage('property-tenants');
        }
      }
    });

    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      if (confirm('Warning: Closing this without confirming the lease means this tenant cannot be charged rent. You can create the lease later from the tenant\'s profile.')) {
        AppState.setUnsavedChanges(false);
        modal.remove();
        if (isReLease) {
          PageLoaders.loadPage('property-tenants');
        } else {
          PageLoaders.loadPage('property-tenants');
        }
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (confirm('Warning: Closing this without confirming the lease means this tenant cannot be charged rent. You can create the lease later from the tenant\'s profile.')) {
          AppState.setUnsavedChanges(false);
          modal.remove();
          if (isReLease) {
            PageLoaders.loadPage('property-tenants');
          } else {
            PageLoaders.loadPage('property-tenants');
          }
        }
      }
    });

    // Track unsaved changes
    const form = modal.querySelector('#lease-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        AppState.setUnsavedChanges(true);
      });
    });

    modal.querySelector('#lease-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const leaseData = {
        tenant: tenantId,
        unit: unitId,
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        rent_amount: parseFloat(formData.get('rent_amount')),
        deposit_amount: parseFloat(formData.get('deposit_amount')),
        status: 'active'
      };

      try {
        // Create lease
        const lease = await apiClient.createLease(leaseData);
        
        // Create deposit if amount > 0
        if (leaseData.deposit_amount > 0) {
          await apiClient.createDeposit({
            lease: lease.id,
            amount_paid: leaseData.deposit_amount,
            date_paid: todayStr,
            amount_refunded: 0
          });
        }

        // Link tenant to their new unit
        await apiClient.createTenantUnit({
          tenant: tenantId,
          unit: unitId,
          move_in_date: todayStr,
          is_active: true
        });

        // Mark the new unit as occupied
        await apiClient.updateUnit(unitId, { status: 'occupied' });

        // Ensure tenant is marked active again (relevant for re-leases)
        await apiClient.updateTenant(tenantId, { status: 'active' });

        AppState.setUnsavedChanges(false);
        modal.remove();
        PageLoaders.loadPage('property-tenants');
      } catch (error) {
        alert('Error creating lease: ' + error.message);
      }
    });
  },

  // Lease Modal
  showLeaseModal(lease = null, preselectedPropertyId = null) {
    const isEdit = lease !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Lease' : 'Create Lease'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="lease-form">
          <div class="form-group">
            <label for="lease-number">Lease Number</label>
            <input type="text" id="lease-number" name="lease_number" value="${lease?.lease_number || ''}" required>
          </div>
          <div class="form-group">
            <label for="lease-unit">Unit</label>
            <select id="lease-unit" name="unit" required>
              <option value="">Select unit</option>
            </select>
          </div>
          <div class="form-group">
            <label for="lease-tenant">Tenant</label>
            <select id="lease-tenant" name="tenant" required>
              <option value="">Select tenant</option>
            </select>
          </div>
          <div class="form-group">
            <label for="start-date">Start Date</label>
            <input type="date" id="start-date" name="start_date" value="${lease?.start_date || ''}" required>
          </div>
          <div class="form-group">
            <label for="end-date">End Date</label>
            <input type="date" id="end-date" name="end_date" value="${lease?.end_date || ''}" required>
          </div>
          <div class="form-group">
            <label for="rent-amount">Rent Amount</label>
            <input type="number" id="rent-amount" name="rent_amount" value="${lease?.rent_amount || ''}" required>
          </div>
          <div class="form-group">
            <label for="lease-status">Status</label>
            <select id="lease-status" name="status" required>
              <option value="active" ${lease?.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="pending" ${lease?.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="expired" ${lease?.status === 'expired' ? 'selected' : ''}>Expired</option>
              <option value="terminated" ${lease?.status === 'terminated' ? 'selected' : ''}>Terminated</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">${isEdit ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    Promise.all([apiClient.getUnits(), apiClient.getTenants()]).then(([units, tenants]) => {
      const unitSelect = modal.querySelector('#lease-unit');
      
      const filteredUnits = preselectedPropertyId 
        ? units.filter(u => u.property == preselectedPropertyId)
        : units;
      
      filteredUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = `${unit.unit_number} - ${UnitTypes.formatDisplay(unit.unit_type, unit.unit_type_custom) || unit.unit_type_display || unit.unit_type}`;
        if (lease?.unit == unit.id) option.selected = true;
        unitSelect.appendChild(option);
      });

      const tenantSelect = modal.querySelector('#lease-tenant');
      tenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant.id;
        option.textContent = tenant.name;
        if (lease?.tenant == tenant.id) option.selected = true;
        tenantSelect.appendChild(option);
      });
    });

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Track unsaved changes
    const form = modal.querySelector('#lease-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        AppState.setUnsavedChanges(true);
      });
    });

    modal.querySelector('#lease-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        lease_number: formData.get('lease_number'),
        unit: formData.get('unit'),
        tenant: formData.get('tenant'),
        start_date: formData.get('start_date'),
        end_date: formData.get('end_date'),
        rent_amount: parseFloat(formData.get('rent_amount')),
        status: formData.get('status')
      };

      try {
        if (isEdit) {
          await apiClient.updateLease(lease.id, data);
        } else {
          await apiClient.createLease(data);
        }
        AppState.setUnsavedChanges(false);
        modal.remove();
        PageLoaders.loadPage('leases');
      } catch (error) {
        alert('Error saving lease: ' + error.message);
      }
    });
  },

  showDeletePropertyModal(property, stats = {}, onSuccess) {
    const name = property.name || '';
    const esc = (t) => SharedComponents.escapeHtml(t);
    const { unitCount = 0, tenantCount = 0, activeTenants = 0 } = stats;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay delete-property-overlay';

    const closeModal = () => modal.remove();

    const renderWarningStep = () => {
      const activeWarning = activeTenants > 0
        ? `<p class="delete-active-warning">⚠ This property has ${activeTenants} active tenant${activeTenants !== 1 ? 's' : ''}. Their lease and payment records will also be deleted.</p>`
        : '';

      modal.innerHTML = `
        <div class="modal delete-property-modal">
          <div class="modal-header">
            <h2>Delete "${esc(name)}"</h2>
            <button type="button" class="modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="delete-modal-body">
            <div class="delete-modal-icon">🔒</div>
            <div class="delete-property-summary">
              <strong>${esc(name)}</strong>
              <span>${esc(property.property_type || 'N/A')} — ${esc(property.location || 'N/A')}</span>
              <span>${unitCount} unit${unitCount !== 1 ? 's' : ''} · ${tenantCount} tenant${tenantCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="delete-warning-box">
              <div class="delete-warning-title">⚠ Read this before continuing</div>
              <p>This will permanently delete the property "${esc(name)}" and all of its associated data including:</p>
              <ul>
                <li>All ${unitCount} unit${unitCount !== 1 ? 's' : ''}</li>
                <li>All tenant records</li>
                <li>All lease records</li>
                <li>All payment history</li>
              </ul>
              <p><strong>This action cannot be undone.</strong></p>
              ${activeWarning}
            </div>
            <button type="button" class="action-button delete-continue-btn">I understand, continue</button>
          </div>
        </div>
      `;

      modal.querySelector('.modal-close').addEventListener('click', closeModal);
      modal.querySelector('.delete-continue-btn').addEventListener('click', renderConfirmStep);
    };

    const renderConfirmStep = () => {
      modal.innerHTML = `
        <div class="modal delete-property-modal">
          <div class="modal-header">
            <h2>Delete "${esc(name)}"</h2>
            <button type="button" class="modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="delete-modal-body">
            <p class="delete-confirm-instructions">To confirm, type the property name exactly as shown below:</p>
            <div class="delete-confirm-name">${esc(name)}</div>
            <input type="text" class="delete-confirm-input" id="delete-confirm-input" autocomplete="off" spellcheck="false">
            <p class="delete-error-msg hidden" id="delete-error-msg">Something went wrong. Please try again.</p>
            <button type="button" class="action-button delete-confirm-btn" id="delete-confirm-btn" disabled>Delete this property</button>
          </div>
        </div>
      `;

      const input = modal.querySelector('#delete-confirm-input');
      const confirmBtn = modal.querySelector('#delete-confirm-btn');
      const errorMsg = modal.querySelector('#delete-error-msg');

      const updateButtonState = () => {
        const matches = input.value.trim().toLowerCase() === name.trim().toLowerCase();
        confirmBtn.disabled = !matches;
        confirmBtn.classList.toggle('active', matches);
      };

      input.addEventListener('input', updateButtonState);
      input.focus();

      modal.querySelector('.modal-close').addEventListener('click', closeModal);

      confirmBtn.addEventListener('click', async () => {
        if (confirmBtn.disabled) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
        errorMsg.classList.add('hidden');

        try {
          await apiClient.deleteProperty(property.id);
          closeModal();
          if (typeof onSuccess === 'function') {
            onSuccess(property);
          }
          SharedComponents.showToast(`${name} has been permanently deleted`);
        } catch (error) {
          errorMsg.classList.remove('hidden');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Delete this property';
          updateButtonState();
        }
      });
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.body.appendChild(modal);
    renderWarningStep();
  },

  showLogoutModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
        <div class="logout-modal-content">
          <h2 class="logout-modal-title" id="logout-modal-title">Log Out?</h2>
          <p class="logout-modal-message">You will be returned to the login screen.</p>
          <div class="logout-modal-actions">
            <button type="button" class="action-button secondary" id="logout-cancel-btn">Cancel</button>
            <button type="button" class="action-button" id="logout-confirm-btn">Log Out</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => {
      modal.remove();
    };

    modal.querySelector('#logout-cancel-btn').addEventListener('click', closeModal);
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', closeModal);
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#logout-confirm-btn').addEventListener('click', () => {
      closeModal();
      this.performLogout();
    });

    document.body.appendChild(modal);
  },

  showUnsavedChangesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal logout-modal unsaved-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-modal-title">
        <div class="logout-modal-content">
          <h2 class="logout-modal-title" id="unsaved-modal-title">Unsaved Changes</h2>
          <p class="logout-modal-message">You have unsaved changes that will be lost if you log out.</p>
          <div class="logout-modal-actions">
            <button type="button" class="action-button secondary" id="unsaved-stay-btn">Stay</button>
            <button type="button" class="logout-btn-danger" id="unsaved-logout-btn">Log Out Anyway</button>
          </div>
        </div>
      </div>
    `;

    const closeModal = () => modal.remove();

    modal.querySelector('#unsaved-stay-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#unsaved-logout-btn').addEventListener('click', () => {
      closeModal();
      this.performLogout();
    });

    document.body.appendChild(modal);
  },

  performLogout() {
    // Create white overlay
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay';
    document.body.appendChild(overlay);

    // Activate overlay
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    // Wait for fade animation
    setTimeout(() => {
      if (typeof apiClient !== 'undefined') {
        apiClient.token = null;
      }

      AppState.clearAll();

      // Check if we're in electron
      if (typeof ipcRenderer !== 'undefined') {
        ipcRenderer.send('logout');
      } else {
        // Fallback for web - use relative path to avoid file:// protocol issues
        window.location.href = 'login.html';
      }
    }, 300);
  },
};
