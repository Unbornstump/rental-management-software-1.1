// Admin Pages - Staff Management, Audit Log, System Settings, Roles & Permissions

const AdminPages = {
  async loadStaffManagement() {
    const html = `
      <div class="admin-page">
        <div class="page-header">
          <h1>Staff Management</h1>
          <button id="add-staff-btn" class="action-button">+ Add Staff Member</button>
        </div>
        
        <div id="staff-table-container" class="table-container">
          <table id="staff-table" class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="staff-tbody">
              <tr class="loading">
                <td colspan="5">Loading staff...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.getElementById('page-content').innerHTML = html;
    
    // Load staff data
    try {
      const staff = await apiClient.getStaff();
      this.populateStaffTable(staff);
      
      // Attach add staff button handler
      document.getElementById('add-staff-btn').addEventListener('click', () => this.showAddStaffDialog());
    } catch (error) {
      console.error('Failed to load staff:', error);
      document.getElementById('staff-tbody').innerHTML = '<tr><td colspan="5" class="error">Failed to load staff members</td></tr>';
    }
  },
  
  populateStaffTable(staff) {
    const tbody = document.getElementById('staff-tbody');
    tbody.innerHTML = '';
    
    if (staff.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No staff members</td></tr>';
      return;
    }
    
    staff.forEach(member => {
      const row = document.createElement('tr');
      const fullName = `${member.first_name} ${member.last_name}`.trim() || member.username;
      const status = member.is_active ? 'Active' : 'Inactive';
      const lastActive = member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never';
      
      row.innerHTML = `
        <td>${fullName}</td>
        <td><span class="role-badge role-${member.role}">${member.role_display || member.role}</span></td>
        <td>${status}</td>
        <td>${lastActive}</td>
        <td class="actions">
          <button class="action-link" onclick="AdminPages.editStaff(${member.id}, '${member.role}')">Edit</button>
          <button class="action-link" onclick="AdminPages.resetPassword(${member.id}, '${member.username}')">Reset Pwd</button>
          <button class="action-link danger" onclick="AdminPages.deactivateStaff(${member.id}, '${member.username}')">Deactivate</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  },
  
  showAddStaffDialog() {
    const html = `
      <div id="staff-modal" class="modal-overlay">
        <div class="modal-card">
          <h2>Add Staff Member</h2>
          <form id="add-staff-form">
            <div class="form-group">
              <label for="staff-name">Full Name</label>
              <input type="text" id="staff-name" required placeholder="Enter full name">
            </div>
            <div class="form-group">
              <label for="staff-username">Username</label>
              <input type="text" id="staff-username" required placeholder="Enter username">
            </div>
            <div class="form-group">
              <label for="staff-role">Role</label>
              <select id="staff-role" required>
                <option value="">Select role</option>
                <option value="accountant">Accountant</option>
                <option value="property_officer">Property Officer</option>
                <option value="caretaker">Caretaker</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="cancel-btn" onclick="document.getElementById('staff-modal').remove()">Cancel</button>
              <button type="submit" class="action-button">Create Staff Member</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.getElementById('add-staff-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fullName = document.getElementById('staff-name').value;
      const username = document.getElementById('staff-username').value;
      const role = document.getElementById('staff-role').value;
      
      try {
        const result = await apiClient.createStaff(username, fullName, role);
        alert(`Staff member created.\nUsername: ${username}\nTemporary Password: ${result.temp_password}\n\nShare this password with them.`);
        document.getElementById('staff-modal').remove();
        this.loadStaffManagement();
      } catch (error) {
        alert('Failed to create staff: ' + (error.response?.data?.error || error.message));
      }
    });
  },
  
  editStaff(staffId, currentRole) {
    const html = `
      <div id="edit-staff-modal" class="modal-overlay">
        <div class="modal-card">
          <h2>Change Staff Role</h2>
          <form id="edit-staff-form">
            <div class="form-group">
              <label for="new-role">Select New Role</label>
              <select id="new-role" required>
                <option value="">Select role</option>
                <option value="accountant" ${currentRole === 'accountant' ? 'selected' : ''}>Accountant</option>
                <option value="property_officer" ${currentRole === 'property_officer' ? 'selected' : ''}>Property Officer</option>
                <option value="caretaker" ${currentRole === 'caretaker' ? 'selected' : ''}>Caretaker</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="cancel-btn" onclick="document.getElementById('edit-staff-modal').remove()">Cancel</button>
              <button type="submit" class="action-button">Change Role</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.getElementById('edit-staff-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newRole = document.getElementById('new-role').value;
      
      try {
        await apiClient.updateStaffRole(staffId, newRole);
        alert('Staff role updated successfully');
        document.getElementById('edit-staff-modal').remove();
        this.loadStaffManagement();
      } catch (error) {
        alert('Failed to update role: ' + (error.response?.data?.error || error.message));
      }
    });
  },
  
  async resetPassword(staffId, username) {
    if (!confirm(`Reset password for ${username}?`)) return;
    
    try {
      const result = await apiClient.resetStaffPassword(staffId);
      alert(`Password reset for ${username}.\nTemporary Password: ${result.temp_password}`);
      this.loadStaffManagement();
    } catch (error) {
      alert('Failed to reset password: ' + (error.response?.data?.error || error.message));
    }
  },
  
  async deactivateStaff(staffId, username) {
    if (!confirm(`Deactivate ${username}? They will be logged out.`)) return;
    
    try {
      await apiClient.deactivateStaff(staffId);
      alert(`${username} has been deactivated`);
      this.loadStaffManagement();
    } catch (error) {
      alert('Failed to deactivate: ' + (error.response?.data?.error || error.message));
    }
  },
  
  async loadRolesPermissions() {
    const html = `
      <div class="admin-page">
        <div class="page-header">
          <h1>Roles & Permissions</h1>
          <p class="subtitle">This is a read-only reference showing what each role can access.</p>
        </div>
        
        <div class="table-container">
          <table class="data-table permissions-table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Manager</th>
                <th>Accountant</th>
                <th>Property Officer</th>
                <th>Caretaker</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>View Dashboard</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>Manage Properties</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>Add/Edit Units</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td class="check">✓</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>View Units</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td class="check">✓</td>
                <td class="check">✓</td>
              </tr>
              <tr>
                <td>Add/Edit Tenants</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>View Tenants</td>
                <td class="check">✓</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td class="check">✓</td>
              </tr>
              <tr>
                <td>Record Payments</td>
                <td class="check">✓</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>View Financials</td>
                <td class="check">✓</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>Print Receipts</td>
                <td class="check">✓</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>View Audit Log</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>Manage Staff</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>System Settings</td>
                <td class="check">✓</td>
                <td>✗</td>
                <td>✗</td>
                <td>✗</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.getElementById('page-content').innerHTML = html;
  },
  
  async loadAuditLog() {
    const html = `
      <div class="admin-page">
        <div class="page-header">
          <h1>Audit Log</h1>
          <button id="export-audit-btn" class="action-button secondary">Export to CSV</button>
        </div>
        
        <div class="filter-bar">
          <input type="text" id="filter-user" placeholder="Filter by user" class="filter-input">
          <select id="filter-role" class="filter-input">
            <option value="">All Roles</option>
            <option value="manager">Manager</option>
            <option value="accountant">Accountant</option>
            <option value="property_officer">Property Officer</option>
            <option value="caretaker">Caretaker</option>
          </select>
          <select id="filter-action" class="filter-input">
            <option value="">All Actions</option>
            <option value="Login">Login</option>
            <option value="Created staff">Created staff</option>
            <option value="Reset staff password">Reset staff password</option>
            <option value="Changed password">Changed password</option>
          </select>
          <button id="apply-filters-btn" class="action-button">Apply Filters</button>
        </div>
        
        <div id="audit-table-container" class="table-container">
          <table id="audit-table" class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody id="audit-tbody">
              <tr class="loading">
                <td colspan="6">Loading audit log...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.getElementById('page-content').innerHTML = html;
    
    // Load audit log data
    this.loadAuditLogData();
    
    // Attach event listeners
    document.getElementById('apply-filters-btn').addEventListener('click', () => this.loadAuditLogData());
    document.getElementById('export-audit-btn').addEventListener('click', () => this.exportAuditLog());
  },
  
  async loadAuditLogData() {
    try {
      const filters = {
        user_id: document.getElementById('filter-user')?.value || '',
        role: document.getElementById('filter-role')?.value || '',
        action: document.getElementById('filter-action')?.value || ''
      };
      
      const logs = await apiClient.getAuditLog(filters);
      this.populateAuditTable(logs);
    } catch (error) {
      console.error('Failed to load audit log:', error);
      document.getElementById('audit-tbody').innerHTML = '<tr><td colspan="6" class="error">Failed to load audit log</td></tr>';
    }
  },
  
  populateAuditTable(logs) {
    const tbody = document.getElementById('audit-tbody');
    tbody.innerHTML = '';
    
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No audit log entries</td></tr>';
      return;
    }
    
    logs.forEach(log => {
      const row = document.createElement('tr');
      const timestamp = new Date(log.timestamp).toLocaleString();
      const target = log.target_id ? `${log.target_model}:${log.target_id}` : log.target_model;
      const details = JSON.stringify(log.details).substring(0, 50) + '...';
      
      row.innerHTML = `
        <td>${timestamp}</td>
        <td>${log.username || 'System'}</td>
        <td>${log.user_role || '-'}</td>
        <td>${log.action}</td>
        <td>${target}</td>
        <td title="${JSON.stringify(log.details)}">${details}</td>
      `;
      tbody.appendChild(row);
    });
  },
  
  async exportAuditLog() {
    try {
      const filters = {
        user_id: document.getElementById('filter-user')?.value || '',
        role: document.getElementById('filter-role')?.value || '',
        action: document.getElementById('filter-action')?.value || ''
      };
      
      // Get audit log data
      const logs = await apiClient.getAuditLog(filters);
      
      // Convert to CSV
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Target', 'IP Address'];
      const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.user_username || 'System',
        log.user_role || '',
        log.action,
        `${log.target_model}${log.target_id ? ':' + log.target_id : ''}`,
        log.ip_address || '-'
      ]);
      
      // Build CSV string
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // Download CSV
      const link = document.createElement('a');
      link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } catch (error) {
      alert('Failed to export audit log: ' + error.message);
    }
  },
  
  async loadSystemSettings() {
    try {
      const settings = await apiClient.getSystemSettings();
      
      const html = `
        <div class="admin-page">
          <div class="page-header">
            <h1>System Settings</h1>
          </div>
          
          <form id="settings-form" class="settings-form">
            <fieldset>
              <legend>Company Profile</legend>
              <div class="form-group">
                <label for="company-name">Company Name</label>
                <input type="text" id="company-name" value="${settings.company_name || ''}" required>
              </div>
              <div class="form-group">
                <label for="contact-phone">Contact Phone</label>
                <input type="tel" id="contact-phone" value="${settings.contact_phone || ''}">
              </div>
              <div class="form-group">
                <label for="address">Physical Address</label>
                <textarea id="address" rows="3">${settings.address || ''}</textarea>
              </div>
            </fieldset>
            
            <fieldset>
              <legend>Rent Settings</legend>
              <div class="form-group">
                <label for="rent-due-day">Default Rent Due Day (of month)</label>
                <input type="number" id="rent-due-day" min="1" max="31" value="${settings.rent_due_day || 1}" required>
              </div>
              <div class="form-group">
                <label for="grace-period">Grace Period (days)</label>
                <input type="number" id="grace-period" min="0" max="30" value="${settings.grace_period_days || 5}" required>
              </div>
              <div class="form-group">
                <label for="currency">Currency</label>
                <input type="text" id="currency" value="${settings.currency || 'KES'}" maxlength="10" required>
              </div>
            </fieldset>
            
            <div class="form-actions">
              <button type="submit" class="action-button">Save Settings</button>
            </div>
          </form>
        </div>
      `;
      
      document.getElementById('page-content').innerHTML = html;
      
      document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedSettings = {
          company_name: document.getElementById('company-name').value,
          contact_phone: document.getElementById('contact-phone').value,
          address: document.getElementById('address').value,
          rent_due_day: parseInt(document.getElementById('rent-due-day').value),
          grace_period_days: parseInt(document.getElementById('grace-period').value),
          currency: document.getElementById('currency').value
        };
        
        try {
          await apiClient.updateSystemSettings(updatedSettings);
          alert('Settings saved successfully');
        } catch (error) {
          alert('Failed to save settings: ' + (error.response?.data?.error || error.message));
        }
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      document.getElementById('page-content').innerHTML = '<div class="error">Failed to load system settings</div>';
    }
  }
};
