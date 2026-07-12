// Admin Pages - Staff Management, Audit Log, System Settings, Roles & Permissions

const AdminPages = {
  roleDescriptions: {
    accountant: 'Financials access only',
    property_officer: 'Units access only',
    caretaker: 'View only'
  },

  async loadAdminHub() {
    const html = `
      <div class="admin-page">
        ${SharedComponents.renderPageHeaderWithBack('Admin', 'Control room for people, roles, and system settings', 'properties')}

        <div class="admin-hub-list">
          <button class="admin-hub-item" id="admin-staff-card">
            <div class="admin-hub-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="admin-hub-item-text">
              <div class="admin-hub-item-title">Staff Management</div>
              <div class="admin-hub-item-subtitle">Add, edit, and manage staff accounts</div>
            </div>
            <svg class="admin-hub-item-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="admin-hub-item" id="admin-roles-card">
            <div class="admin-hub-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="admin-hub-item-text">
              <div class="admin-hub-item-title">Roles & Permissions</div>
              <div class="admin-hub-item-subtitle">View access levels for each role</div>
            </div>
            <svg class="admin-hub-item-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="admin-hub-item" id="admin-audit-card">
            <div class="admin-hub-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="admin-hub-item-text">
              <div class="admin-hub-item-title">Audit Log</div>
              <div class="admin-hub-item-subtitle">Track system actions and changes</div>
            </div>
            <svg class="admin-hub-item-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <button class="admin-hub-item" id="admin-settings-card">
            <div class="admin-hub-item-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51v-.09a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="admin-hub-item-text">
              <div class="admin-hub-item-title">System Settings</div>
              <div class="admin-hub-item-subtitle">Configure company profile and defaults</div>
            </div>
            <svg class="admin-hub-item-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.getElementById('page-content').innerHTML = html;
    SharedComponents.attachPageHeaderWithBackHandler(document.getElementById('page-content'));

    document.getElementById('admin-staff-card').addEventListener('click', () => {
      PageLoaders.navigate('admin-staff');
    });

    document.getElementById('admin-roles-card').addEventListener('click', () => {
      PageLoaders.navigate('admin-roles');
    });

    document.getElementById('admin-audit-card').addEventListener('click', () => {
      PageLoaders.navigate('admin-audit');
    });

    document.getElementById('admin-settings-card').addEventListener('click', () => {
      PageLoaders.navigate('admin-settings');
    });
  },

  formatDate(value) {
    if (!value) return 'Never';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(value));
  },

  formatReadableDetails(log) {
    if (log?.readable_details) return log.readable_details;
    if (log?.details && typeof log.details === 'string') return log.details;
    return log?.action || 'System action';
  },

  getRoleHelpText(role) {
    return this.roleDescriptions[role] || 'Select a role to see the access level.';
  },

  async loadStaffManagement() {
    const actionsHtml = `
      <button id="add-staff-btn" class="action-button">+ Add Staff Member</button>
    `;
    const html = `
      <div class="admin-page">
        ${SharedComponents.renderPageHeaderWithBack('Staff Management', null, 'admin-hub', actionsHtml)}

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
    SharedComponents.attachPageHeaderWithBackHandler(document.getElementById('page-content'));

    try {
      const [staff, currentUser] = await Promise.all([apiClient.getStaff(), apiClient.getMe().catch(() => null)]);
      this.populateStaffTable(staff, currentUser);
      document.getElementById('add-staff-btn').addEventListener('click', () => this.showAddStaffDialog());
    } catch (error) {
      console.error('Failed to load staff:', error);
      document.getElementById('staff-tbody').innerHTML = '<tr><td colspan="5" class="error">Failed to load staff members</td></tr>';
    }
  },

  populateStaffTable(staff, currentUser = null) {
    const tbody = document.getElementById('staff-tbody');
    tbody.innerHTML = '';

    const visibleStaff = (staff || []).filter(member => member.role !== 'manager' || member.id === currentUser?.id);

    if (visibleStaff.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">
            <div class="empty-state">
              <strong>No staff members yet.</strong>
              <span>Add a staff member to get started.</span>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    visibleStaff.forEach(member => {
      const row = document.createElement('tr');
      const fullName = `${member.first_name} ${member.last_name}`.trim() || member.username;
      const status = member.is_active ? 'Active' : 'Inactive';
      const lastActive = member.last_login ? this.formatDate(member.last_login) : 'Never';
      const isManagerAccount = currentUser && member.id === currentUser.id;

      row.innerHTML = `
        <td>${fullName}</td>
        <td><span class="role-badge role-${member.role}">${member.role_display || member.role}</span></td>
        <td>${status}</td>
        <td>${lastActive}</td>
        <td class="action-cell">
          ${isManagerAccount ? '<span class="account-self-label">Your account</span>' : `
            <button class="table-action-btn" onclick="AdminPages.editStaff(${member.id}, '${member.role}')">Edit</button>
            <button class="table-action-btn" onclick="AdminPages.resetPassword(${member.id}, '${member.username}')">Reset Pwd</button>
            <button class="table-action-btn danger" onclick="AdminPages.deactivateStaff(${member.id}, '${member.username}')">Deactivate</button>
            <button class="table-action-btn danger" onclick="AdminPages.showDeleteStaffModal(${member.id}, '${member.username}')">Delete</button>
          `}
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
              <div id="staff-name-error" class="field-error"></div>
            </div>
            <div class="form-group">
              <label for="staff-username">Username</label>
              <input type="text" id="staff-username" required placeholder="Enter username">
              <div id="staff-username-error" class="field-error"></div>
            </div>
            <div class="form-group">
              <label for="staff-role">Role</label>
              <select id="staff-role" required onchange="AdminPages.updateRoleHelp(this.value)">
                <option value="">Select role</option>
                <option value="accountant">Accountant</option>
                <option value="property_officer">Property Officer</option>
                <option value="caretaker">Caretaker</option>
              </select>
              <div id="staff-role-help" class="role-help-text">Select a role to see the access level.</div>
              <div id="staff-role-error" class="field-error"></div>
            </div>
            <div class="form-group">
              <label for="staff-password">Password</label>
              <div class="password-input-row">
                <input type="text" id="staff-password" value="" autocomplete="off">
                <button type="button" id="staff-password-toggle" class="icon-btn" title="Hide password">👁</button>
                <button type="button" id="staff-password-refresh" class="icon-btn" title="Generate password">🔄</button>
              </div>
              <div class="field-hint">Auto-generated. You can edit this if you prefer a custom password.</div>
              <div id="staff-password-error" class="field-error"></div>
            </div>
            <div class="form-actions">
              <button type="button" class="cancel-btn" onclick="document.getElementById('staff-modal').remove()">Cancel</button>
              <button type="submit" id="create-staff-submit" class="action-button" disabled>Create Staff Member</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    this.updateRoleHelp('');
    this.generatePasswordField();
    this.attachStaffFormValidation();
  },

  generatePasswordField() {
    const input = document.getElementById('staff-password');
    if (!input) return;
    const password = this.generateStrongPassword();
    input.value = password;
    input.type = 'text';
    const toggle = document.getElementById('staff-password-toggle');
    const refresh = document.getElementById('staff-password-refresh');
    if (toggle) {
      toggle.addEventListener('click', () => {
        if (input.type === 'password') {
          input.type = 'text';
          toggle.textContent = '👁';
          toggle.title = 'Hide password';
        } else {
          input.type = 'password';
          toggle.textContent = '🙈';
          toggle.title = 'Show password';
        }
      });
    }
    if (refresh) {
      refresh.addEventListener('click', () => {
        input.value = this.generateStrongPassword();
      });
    }
  },

  generateStrongPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let password = '';
    while (password.length < 12) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  },

  attachStaffFormValidation() {
    const form = document.getElementById('add-staff-form');
    if (!form) return;

    const inputs = [
      document.getElementById('staff-name'),
      document.getElementById('staff-username'),
      document.getElementById('staff-role'),
      document.getElementById('staff-password')
    ];

    const validate = async () => {
      const fullName = document.getElementById('staff-name').value.trim();
      const username = document.getElementById('staff-username').value.trim();
      const role = document.getElementById('staff-role').value;
      const password = document.getElementById('staff-password').value;
      let hasError = false;

      document.getElementById('staff-name-error').textContent = '';
      document.getElementById('staff-username-error').textContent = '';
      document.getElementById('staff-role-error').textContent = '';
      document.getElementById('staff-password-error').textContent = '';

      if (!fullName) {
        document.getElementById('staff-name-error').textContent = 'Full name is required';
        hasError = true;
      }
      if (!username) {
        document.getElementById('staff-username-error').textContent = 'Username is required';
        hasError = true;
      } else if (username.includes(' ')) {
        document.getElementById('staff-username-error').textContent = 'Username cannot contain spaces';
        hasError = true;
      } else {
        try {
          const result = await apiClient.checkUsernameAvailability(username);
          if (!result.available) {
            document.getElementById('staff-username-error').textContent = 'This username is already in use';
            hasError = true;
          }
        } catch (error) {
          console.error('Username availability check failed', error);
        }
      }
      if (!role) {
        document.getElementById('staff-role-error').textContent = 'Please select a role';
        hasError = true;
      }
      if (!password || password.length < 8) {
        document.getElementById('staff-password-error').textContent = 'Password must be at least 8 characters';
        hasError = true;
      }

      document.getElementById('create-staff-submit').disabled = hasError;
    };

    inputs.forEach(input => input.addEventListener('input', () => validate()));
    document.getElementById('staff-username').addEventListener('blur', () => validate());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await validate();
      const submitButton = document.getElementById('create-staff-submit');
      if (submitButton.disabled) return;

      const fullName = document.getElementById('staff-name').value.trim();
      const username = document.getElementById('staff-username').value.trim();
      const role = document.getElementById('staff-role').value;
      const password = document.getElementById('staff-password').value;

      try {
        const result = await apiClient.createStaff(username, fullName, role, password);
        document.getElementById('staff-modal').remove();
        this.showStaffCreatedModal(username, result.temporary_password || result.temp_password || result.password || password, fullName);
        this.loadStaffManagement();
      } catch (error) {
        const formError = document.getElementById('staff-form-error') || document.createElement('div');
        formError.id = 'staff-form-error';
        formError.className = 'field-error';
        formError.textContent = 'Something went wrong. Please try again.';
        form.appendChild(formError);
      }
    });
  },

  showStaffCreatedModal(username, password, fullName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card">
        <h2>Staff Member Created</h2>
        <p>${fullName} has been added successfully.</p>
        <div class="staff-created-details">
          <div><strong>Username:</strong> ${username}</div>
          <div><strong>Password:</strong></div>
          <div class="password-box">${password}</div>
          <button type="button" id="copy-created-password" class="action-button">Copy to Clipboard</button>
          <p class="helper-text">Share these credentials with ${fullName}. They can change their password after logging in.</p>
        </div>
        <div class="form-actions">
          <button type="button" id="close-created-staff-modal" class="action-button">Done</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('copy-created-password').addEventListener('click', async () => {
      await navigator.clipboard.writeText(`Username: ${username} | Password: ${password}`);
      const button = document.getElementById('copy-created-password');
      button.textContent = 'Copied ✓';
      setTimeout(() => { button.textContent = 'Copy to Clipboard'; }, 2000);
    });
    document.getElementById('close-created-staff-modal').addEventListener('click', () => modal.remove());
  },

  updateRoleHelp(role) {
    const help = document.getElementById('staff-role-help');
    if (help) help.textContent = this.getRoleHelpText(role);
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
    const modalHtml = `
      <div id="staff-reset-modal" class="modal-overlay">
        <div class="modal-card">
          <h2>Reset Password</h2>
          <p>Reset password for ${username}?</p>
          <p class="password-reset-subtitle">A temporary password will be generated. Share it with the staff member and they will be required to change it on their next login.</p>
          <div class="form-actions">
            <button type="button" class="cancel-btn" onclick="document.getElementById('staff-reset-modal').remove()">Cancel</button>
            <button type="button" class="action-button" id="generate-reset-password-btn">Generate Password</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('generate-reset-password-btn').addEventListener('click', async () => {
      try {
        const result = await apiClient.resetStaffPassword(staffId);
        document.getElementById('staff-reset-modal').innerHTML = `
          <div class="modal-card">
            <h2>Password Reset — ${username}</h2>
            <p class="password-reset-subtitle">Temporary password:</p>
            <div class="recovery-code">${result.temp_password}</div>
            <button type="button" class="action-button" id="copy-staff-password-btn">Copy to Clipboard</button>
            <p class="helper-text">Share this with ${username}. It expires after first use.</p>
            <div class="form-actions">
              <button type="button" class="action-button" id="close-staff-reset-btn">Done</button>
            </div>
          </div>
        `;

        document.getElementById('copy-staff-password-btn').addEventListener('click', async () => {
          await navigator.clipboard.writeText(result.temp_password);
          const copyButton = document.getElementById('copy-staff-password-btn');
          copyButton.textContent = 'Copied ✓';
          setTimeout(() => { copyButton.textContent = 'Copy to Clipboard'; }, 2000);
        });

        document.getElementById('close-staff-reset-btn').addEventListener('click', () => {
          document.getElementById('staff-reset-modal').remove();
          this.loadStaffManagement();
        });
      } catch (error) {
        alert('Failed to reset password: ' + (error.response?.data?.error || error.message));
      }
    });
  },

  showDeactivateStaffModal(staffId, username) {
    const html = `
      <div id="deactivate-staff-modal" class="modal-overlay">
        <div class="modal-card confirm-card">
          <h2>Deactivate Account</h2>
          <p class="confirm-title">Deactivate ${username}?</p>
          <p class="confirm-copy">They will be logged out immediately and unable to log in until reactivated.</p>
          <div class="form-actions">
            <button type="button" class="cancel-btn" id="deactivate-cancel-btn">Cancel</button>
            <button type="button" class="action-button danger" id="deactivate-confirm-btn">Deactivate</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('deactivate-cancel-btn').addEventListener('click', () => document.getElementById('deactivate-staff-modal').remove());
    document.getElementById('deactivate-confirm-btn').addEventListener('click', async () => {
      try {
        await apiClient.deactivateStaff(staffId);
        document.getElementById('deactivate-staff-modal').remove();
        SharedComponents.showToast(`${username} has been deactivated`);
        this.loadStaffManagement();
      } catch (error) {
        SharedComponents.showToast('Failed to deactivate staff');
      }
    });
  },

  async deactivateStaff(staffId, username) {
    this.showDeactivateStaffModal(staffId, username);
  },

  showDeleteStaffModal(staffId, username) {
    const html = `
      <div id="delete-staff-modal" class="modal-overlay">
        <div class="modal-card confirm-card">
          <h2>Delete Staff Member</h2>
          <p class="confirm-title">⚠ This will permanently delete ${username}'s account.</p>
          <p class="confirm-copy">Their audit log history will also be removed. This cannot be undone.</p>
          <div class="form-actions">
            <button type="button" class="cancel-btn" id="delete-staff-cancel-btn">Cancel</button>
            <button type="button" class="action-button danger" id="delete-staff-continue-btn">Continue</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('delete-staff-cancel-btn').addEventListener('click', () => document.getElementById('delete-staff-modal').remove());
    document.getElementById('delete-staff-continue-btn').addEventListener('click', () => this.showDeleteStaffConfirmStep(staffId, username));
  },

  showDeleteStaffConfirmStep(staffId, username) {
    const modal = document.getElementById('delete-staff-modal');
    if (!modal) return;
    modal.innerHTML = `
      <div class="modal-card confirm-card">
        <h2>Delete Staff Member</h2>
        <p class="confirm-copy">Type the username to confirm:</p>
        <div class="delete-confirm-name">${username}</div>
        <input type="text" id="delete-staff-confirm-input" class="delete-confirm-input" autocomplete="off" spellcheck="false">
        <div class="form-actions">
          <button type="button" class="cancel-btn" id="delete-staff-cancel-btn">Cancel</button>
          <button type="button" class="action-button delete-confirm-btn" id="delete-staff-final-btn" disabled>Delete Permanently</button>
        </div>
      </div>
    `;

    const input = document.getElementById('delete-staff-confirm-input');
    const button = document.getElementById('delete-staff-final-btn');
    const cancel = document.getElementById('delete-staff-cancel-btn');

    cancel.addEventListener('click', () => modal.remove());

    input.addEventListener('input', () => {
      const matched = input.value === username;
      button.disabled = !matched;
      button.classList.toggle('active', matched);
    });

    button.addEventListener('click', async () => {
      try {
        await apiClient.deleteStaff(staffId);
        modal.remove();
        SharedComponents.showToast(`${username} has been permanently deleted`);
        this.loadStaffManagement();
      } catch (error) {
        SharedComponents.showToast('Failed to delete staff');
      }
    });
  },

  async loadRolesPermissions() {
    const html = `
      <div class="admin-page">
        ${SharedComponents.renderPageHeaderWithBack('Roles & Permissions', 'This is a read-only reference showing what each role can access.', 'admin-hub')}

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
              <tr><td>View Dashboard</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>Manage Properties</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>Add / Edit Units</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-yes">✓</td><td class="permission-no">✗</td></tr>
              <tr><td>View Units</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-yes">✓</td><td class="permission-yes">✓</td></tr>
              <tr><td>Add / Edit Tenants</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>View Tenants</td><td class="permission-yes">✓</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-yes">✓</td></tr>
              <tr><td>Record Payments</td><td class="permission-yes">✓</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>View Financials</td><td class="permission-yes">✓</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>Print Receipts</td><td class="permission-yes">✓</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>View Audit Log</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>Manage Staff</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
              <tr><td>System Settings</td><td class="permission-yes">✓</td><td class="permission-no">✗</td><td class="permission-no">✗</td><td class="permission-no">✗</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('page-content').innerHTML = html;
    SharedComponents.attachPageHeaderWithBackHandler(document.getElementById('page-content'));
  },

  async loadAuditLog() {
    const actionsHtml = `
      <button id="export-audit-btn" class="action-button secondary">Export to CSV</button>
    `;
    const html = `
      <div class="admin-page">
        ${SharedComponents.renderPageHeaderWithBack('Audit Log', null, 'admin-hub', actionsHtml)}

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
            <option value="Failed login attempt">Failed login attempt</option>
            <option value="Reset staff password">Reset staff password</option>
            <option value="Added staff">Added staff</option>
            <option value="Deactivated staff">Deactivated staff</option>
          </select>
          <button id="apply-filters-btn" class="action-button">Apply Filters</button>
        </div>

        <div id="audit-table-container" class="table-container">
          <table id="audit-table" class="data-table audit-table">
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
    SharedComponents.attachPageHeaderWithBackHandler(document.getElementById('page-content'));
    this.loadAuditLogData();
    document.getElementById('apply-filters-btn').addEventListener('click', () => this.loadAuditLogData());
    document.getElementById('export-audit-btn').addEventListener('click', () => this.exportAuditLog());
  },

  async loadAuditLogData() {
    try {
      const filters = {
        user: document.getElementById('filter-user')?.value || '',
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
      const timestamp = this.formatDate(log.timestamp);
      const target = log.target_display || (log.target_id ? `${log.target_model}:${log.target_id}` : log.target_model || 'System');
      const details = this.formatReadableDetails(log);
      const isFailedLogin = (log.action || '').toLowerCase() === 'failed login attempt';

      row.className = isFailedLogin ? 'audit-failed' : '';
      row.innerHTML = `
        <td>${timestamp}</td>
        <td>${log.username || 'System'}</td>
        <td>${log.user_role || '-'}</td>
        <td>${log.action}</td>
        <td>${target}</td>
        <td>${details}</td>
      `;
      tbody.appendChild(row);
    });
  },

  async exportAuditLog() {
    try {
      const filters = {
        user: document.getElementById('filter-user')?.value || '',
        role: document.getElementById('filter-role')?.value || '',
        action: document.getElementById('filter-action')?.value || ''
      };

      const logs = await apiClient.getAuditLog(filters);
      const headers = ['Timestamp', 'User', 'Role', 'Action', 'Target', 'Details'];
      const rows = logs.map(log => [
        this.formatDate(log.timestamp),
        log.username || 'System',
        log.user_role || '',
        log.action,
        log.target_display || `${log.target_model}${log.target_id ? ':' + log.target_id : ''}`,
        this.formatReadableDetails(log)
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

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
      const currentUser = await apiClient.getMe().catch(() => null);

      const html = `
        <div class="admin-page">
          ${SharedComponents.renderPageHeaderWithBack('System Settings', null, 'admin-hub')}

          <form id="settings-form" class="settings-form">
            <section class="settings-section">
              <div class="settings-section-heading">Company Profile</div>
              <div class="form-group">
                <label for="company-name">Company Name</label>
                <input type="text" id="company-name" value="${settings.company_name || ''}" placeholder="Enter company name" required>
                <div class="field-error" id="company-name-error"></div>
              </div>
              <div class="form-group">
                <label for="contact-phone">Contact Phone</label>
                <input type="tel" id="contact-phone" value="${settings.contact_phone || ''}" placeholder="e.g. +254 700 000 000">
                <div class="field-error" id="contact-phone-error"></div>
              </div>
              <div class="form-group">
                <label for="address">Physical Address</label>
                <textarea id="address" rows="3" placeholder="Enter address">${settings.address || ''}</textarea>
              </div>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">Rent Settings</div>
              <div class="form-group">
                <label for="rent-due-day">Default Rent Due Day (of month)</label>
                <input type="number" id="rent-due-day" min="1" max="28" value="${settings.rent_due_day || 1}" required>
                <div class="field-error" id="rent-due-day-error"></div>
              </div>
              <div class="form-group">
                <label for="grace-period">Grace Period (days)</label>
                <input type="number" id="grace-period" min="1" max="30" value="${settings.grace_period_days || 5}" required>
                <div class="field-error" id="grace-period-error"></div>
              </div>
              <div class="form-group">
                <label for="currency">Currency</label>
                <input type="text" id="currency" value="${settings.currency || 'KES'}" maxlength="10" required>
              </div>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">Account Settings</div>
              <div class="form-group">
                <label for="display-name">Display Name</label>
                <input type="text" id="display-name" value="${(currentUser?.first_name || '') + (currentUser?.last_name ? ' ' + currentUser.last_name : '')}" placeholder="Enter display name">
              </div>
              <div class="form-group">
                <label for="account-username">Username</label>
                <input type="text" id="account-username" value="${currentUser?.username || ''}" placeholder="Enter username">
              </div>
              <div class="form-group">
                <label for="current-password">Current Password</label>
                <input type="password" id="current-password" placeholder="Required to change password">
              </div>
              <div class="form-group">
                <label for="new-password">New Password</label>
                <input type="password" id="new-password" placeholder="Leave blank to keep current password">
              </div>
              <div class="form-group">
                <label>Security Questions</label>
                <button type="button" class="secondary-link" id="security-questions-btn">View / Update Security Questions</button>
              </div>
            </section>

            <div class="settings-footer">
              <button type="submit" class="action-button">Save Settings</button>
            </div>
          </form>
        </div>
      `;

      document.getElementById('page-content').innerHTML = html;
      SharedComponents.attachPageHeaderWithBackHandler(document.getElementById('page-content'));

      document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const errors = this.validateSystemSettings();
        if (Object.keys(errors).length) {
          Object.entries(errors).forEach(([field, message]) => {
            const errorEl = document.getElementById(`${field}-error`);
            if (errorEl) errorEl.textContent = message;
          });
          return;
        }

        const updatedSettings = {
          company_name: document.getElementById('company-name').value.trim(),
          contact_phone: document.getElementById('contact-phone').value.trim(),
          address: document.getElementById('address').value.trim(),
          rent_due_day: parseInt(document.getElementById('rent-due-day').value, 10),
          grace_period_days: parseInt(document.getElementById('grace-period').value, 10),
          currency: document.getElementById('currency').value.trim()
        };

        try {
          await apiClient.updateSystemSettings(updatedSettings);
          const profileData = {
            username: document.getElementById('account-username').value.trim(),
            first_name: document.getElementById('display-name').value.trim().split(' ')[0] || '',
            last_name: document.getElementById('display-name').value.trim().split(' ').slice(1).join(' ') || ''
          };
          if (profileData.username) {
            await apiClient.updateMe(profileData);
          }
          const newPassword = document.getElementById('new-password').value;
          const currentPassword = document.getElementById('current-password').value;
          if (newPassword) {
            await apiClient.changePassword(newPassword, currentPassword || null);
          }
          alert('Settings saved successfully');
        } catch (error) {
          alert('Failed to save settings: ' + (error.response?.data?.error || error.message));
        }
      });

      document.getElementById('security-questions-btn').addEventListener('click', () => {
        alert('Security question setup is available from the recovery flow. Use the password recovery option to update it.');
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      document.getElementById('page-content').innerHTML = '<div class="error">Failed to load system settings</div>';
    }
  },

  validateSystemSettings() {
    const errors = {};
    const companyName = document.getElementById('company-name').value.trim();
    const contactPhone = document.getElementById('contact-phone').value.trim();
    const rentDueDay = parseInt(document.getElementById('rent-due-day').value, 10);
    const gracePeriod = parseInt(document.getElementById('grace-period').value, 10);

    document.querySelectorAll('.field-error').forEach(errorEl => {
      errorEl.textContent = '';
    });

    if (!companyName) errors.company_name = 'Company name is required.';
    if (contactPhone && !/^\+?[0-9\s()-]{7,15}$/.test(contactPhone)) errors.contact_phone = 'Enter a valid phone number.';
    if (!Number.isInteger(rentDueDay) || rentDueDay < 1 || rentDueDay > 28) errors['rent-due-day'] = 'Rent due day must be between 1 and 28.';
    if (!Number.isInteger(gracePeriod) || gracePeriod <= 0) errors['grace-period'] = 'Grace period must be a positive number.';

    return errors;
  }
};

window.AdminPages = AdminPages;
