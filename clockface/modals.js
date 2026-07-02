// Modal Functions for RMS
// Handles all modal dialogs for creating/editing entities

const Modals = {
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
            <input type="text" id="property-name" name="name" value="${property?.name || ''}" required>
          </div>
          <div class="form-group">
            <label for="property-type">Property Type</label>
            <select id="property-type" name="property_type" required>
              <option value="">Select type</option>
              <option value="apartment" ${property?.property_type === 'apartment' ? 'selected' : ''}>Apartment</option>
              <option value="house" ${property?.property_type === 'house' ? 'selected' : ''}>House</option>
              <option value="commercial" ${property?.property_type === 'commercial' ? 'selected' : ''}>Commercial</option>
              <option value="land" ${property?.property_type === 'land' ? 'selected' : ''}>Land</option>
            </select>
          </div>
          <div class="form-group">
            <label for="property-location">Location</label>
            <input type="text" id="property-location" name="location" value="${property?.location || ''}" required>
          </div>
          <div class="form-group">
            <label for="property-description">Description</label>
            <textarea id="property-description" name="description">${property?.description || ''}</textarea>
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

    modal.querySelector('#property-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        property_type: formData.get('property_type'),
        location: formData.get('location'),
        description: formData.get('description')
      };

      try {
        if (isEdit) {
          await apiClient.updateProperty(property.id, data);
        } else {
          await apiClient.createProperty(data);
        }
        modal.remove();
        PageLoaders.loadPage('properties');
      } catch (error) {
        alert('Error saving property: ' + error.message);
      }
    });
  },

  // Unit Modal
  showUnitModal(unit = null, preselectedPropertyId = null) {
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
            <input type="text" id="unit-number" name="unit_number" value="${unit?.unit_number || ''}" required>
          </div>
          <div class="form-group">
            <label for="unit-type">Unit Type</label>
            <select id="unit-type" name="unit_type" required>
              <option value="">Select type</option>
              <option value="bedsitter" ${unit?.unit_type === 'bedsitter' ? 'selected' : ''}>Bedsitter</option>
              <option value="1br" ${unit?.unit_type === '1br' ? 'selected' : ''}>1BR</option>
              <option value="2br" ${unit?.unit_type === '2br' ? 'selected' : ''}>2BR</option>
              <option value="shop" ${unit?.unit_type === 'shop' ? 'selected' : ''}>Shop</option>
            </select>
          </div>
          <div class="form-group">
            <label for="rent-amount">Rent Amount</label>
            <input type="number" id="rent-amount" name="rent_amount" value="${unit?.rent_amount || ''}" required>
          </div>
          <div class="form-group">
            <label for="property">Property</label>
            <select id="property" name="property" required>
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

    modal.querySelector('#unit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        unit_number: formData.get('unit_number'),
        unit_type: formData.get('unit_type'),
        rent_amount: parseFloat(formData.get('rent_amount')),
        property: formData.get('property')
      };

      try {
        if (isEdit) {
          await apiClient.updateUnit(unit.id, data);
        } else {
          await apiClient.createUnit(data);
        }
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
            <input type="text" id="unit-prefix" name="prefix" placeholder="e.g. A, B, Room, Shop" required>
            <small class="form-hint">Units will be named: Prefix 1, Prefix 2, etc.</small>
          </div>
          <div class="form-group">
            <label for="unit-count">Number of Units</label>
            <input type="number" id="unit-count" name="count" min="1" max="100" value="10" required>
          </div>
          <div class="form-group">
            <label for="unit-type">Unit Type</label>
            <select id="unit-type" name="unit_type" required>
              <option value="">Select type</option>
              <option value="bedsitter">Bedsitter</option>
              <option value="1br">1BR</option>
              <option value="2br">2BR</option>
              <option value="shop">Shop</option>
            </select>
          </div>
          <div class="form-group">
            <label for="rent-amount">Rent Amount (per month)</label>
            <input type="number" id="rent-amount" name="rent_amount" min="0" required>
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">Create Units</button>
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

    modal.querySelector('#bulk-unit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const prefix = formData.get('prefix').trim();
      const count = parseInt(formData.get('count'));
      const unitType = formData.get('unit_type');
      const rentAmount = parseFloat(formData.get('rent_amount'));

      // Generate unit numbers
      const unitsToCreate = [];
      for (let i = 1; i <= count; i++) {
        unitsToCreate.push({
          unit_number: `${prefix} ${i}`,
          unit_type: unitType,
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
        alert('Error creating units: ' + error.message);
      }
    });
  },

  // Unit Edit Modal (for individual unit editing)
  showUnitEditModal(unit) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Edit Unit</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="unit-edit-form">
          <div class="form-group">
            <label for="unit-number">Unit Number</label>
            <input type="text" id="unit-number" name="unit_number" value="${unit?.unit_number || ''}" required>
          </div>
          <div class="form-group">
            <label for="unit-type">Unit Type</label>
            <select id="unit-type" name="unit_type" required>
              <option value="">Select type</option>
              <option value="bedsitter" ${unit?.unit_type === 'bedsitter' ? 'selected' : ''}>Bedsitter</option>
              <option value="1br" ${unit?.unit_type === '1br' ? 'selected' : ''}>1BR</option>
              <option value="2br" ${unit?.unit_type === '2br' ? 'selected' : ''}>2BR</option>
              <option value="shop" ${unit?.unit_type === 'shop' ? 'selected' : ''}>Shop</option>
            </select>
          </div>
          <div class="form-group">
            <label for="rent-amount">Rent Amount</label>
            <input type="number" id="rent-amount" name="rent_amount" value="${unit?.rent_amount || ''}" required>
          </div>
          <div class="form-group">
            <label for="unit-status">Status</label>
            <select id="unit-status" name="status" required>
              <option value="vacant" ${unit?.status === 'vacant' ? 'selected' : ''}>Vacant</option>
              <option value="occupied" ${unit?.status === 'occupied' ? 'selected' : ''}>Occupied</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="action-button cancel-btn">Cancel</button>
            <button type="submit" class="action-button">Update</button>
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

    modal.querySelector('#unit-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        unit_number: formData.get('unit_number'),
        unit_type: formData.get('unit_type'),
        rent_amount: parseFloat(formData.get('rent_amount')),
        status: formData.get('status')
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
              <input type="text" id="tenant-name" name="full_name" value="${tenant?.full_name || tenant?.name || ''}" required>
            </div>
            <div class="form-group">
              <label for="tenant-phone">Phone</label>
              <input type="tel" id="tenant-phone" name="phone" value="${tenant?.phone || ''}" required>
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

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
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

        // Validate required fields
        if (!data.full_name || !data.full_name.trim()) {
          alert('Please enter a full name');
          return;
        }
        if (!data.phone || !data.phone.trim()) {
          alert('Please enter a phone number');
          return;
        }

        // Log the data being sent for debugging
        console.log('Creating tenant with data:', data);

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
          alert('Error saving tenant: ' + error.message);
        }
      });
    } else {
      // Edit mode - no unit selection needed
      modal.querySelector('#tenant-form').addEventListener('submit', async (e) => {
        e.preventDefault();
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
          modal.remove();
          
          // Reload appropriate page based on context
          const currentProperty = AppState.getPropertyContext();
          if (currentProperty) {
            PageLoaders.loadPage('property-tenants');
          } else {
            PageLoaders.loadPage('tenants');
          }
        } catch (error) {
          alert('Error saving tenant: ' + error.message);
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
          modal.remove();
          if (isReLease) {
            PageLoaders.loadPage('property-tenants');
          } else {
            PageLoaders.loadPage('property-tenants');
          }
        }
      }
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
        option.textContent = `${unit.unit_number} - ${unit.unit_type}`;
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
        modal.remove();
        PageLoaders.loadPage('leases');
      } catch (error) {
        alert('Error saving lease: ' + error.message);
      }
    });
  }
};
