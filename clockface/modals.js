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
          <h2>${isEdit ? 'Edit Unit' : 'Create Unit'}</h2>
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
              <option value="studio" ${unit?.unit_type === 'studio' ? 'selected' : ''}>Studio</option>
              <option value="1-bedroom" ${unit?.unit_type === '1-bedroom' ? 'selected' : ''}>1 Bedroom</option>
              <option value="2-bedroom" ${unit?.unit_type === '2-bedroom' ? 'selected' : ''}>2 Bedroom</option>
              <option value="3-bedroom" ${unit?.unit_type === '3-bedroom' ? 'selected' : ''}>3 Bedroom</option>
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
            <button type="submit" class="action-button">${isEdit ? 'Update' : 'Create'}</button>
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
        PageLoaders.loadPage('units');
      } catch (error) {
        alert('Error saving unit: ' + error.message);
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
  showTenantModal(tenant = null) {
    const isEdit = tenant !== null;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Tenant' : 'Create Tenant'}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <form class="modal-form" id="tenant-form">
          <div class="form-group">
            <label for="tenant-name">Name</label>
            <input type="text" id="tenant-name" name="name" value="${tenant?.name || ''}" required>
          </div>
          <div class="form-group">
            <label for="tenant-email">Email</label>
            <input type="email" id="tenant-email" name="email" value="${tenant?.email || ''}" required>
          </div>
          <div class="form-group">
            <label for="tenant-phone">Phone</label>
            <input type="tel" id="tenant-phone" name="phone" value="${tenant?.phone || ''}" required>
          </div>
          <div class="form-group">
            <label for="tenant-id-number">ID Number</label>
            <input type="text" id="tenant-id-number" name="id_number" value="${tenant?.id_number || ''}">
          </div>
          <div class="form-group">
            <label for="tenant-address">Address</label>
            <textarea id="tenant-address" name="address">${tenant?.address || ''}</textarea>
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

    modal.querySelector('#tenant-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        id_number: formData.get('id_number'),
        address: formData.get('address')
      };

      try {
        if (isEdit) {
          await apiClient.updateTenant(tenant.id, data);
        } else {
          await apiClient.createTenant(data);
        }
        modal.remove();
        PageLoaders.loadPage('tenants');
      } catch (error) {
        alert('Error saving tenant: ' + error.message);
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
