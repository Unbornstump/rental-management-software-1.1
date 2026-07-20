// Browser-compatible API client
// Uses fetch API instead of Node.js axios

const BASE_URL = window.RMS_BACKEND_URL || 'http://127.0.0.1:8000';

class ApiClient {
  constructor() {
    this.baseURL = BASE_URL;
    this.token = null;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.detail || data.error || 'Request failed');
      error.response = { data, status: response.status };
      throw error;
    }

    return data;
  }

  async login(username, password) {
    const data = await this.request(`${this.baseURL}/api/auth/login/`, {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.token = data.access;
    this.user = data.user;
    return data;
  }

  async getSetupStatus() {
    return this.request(`${this.baseURL}/api/auth/setup-status/`);
  }

  async registerManager(fullName, username, password) {
    const data = await this.request(`${this.baseURL}/api/auth/register/`, {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, username, password })
    });
    this.user = data;
    return data;
  }

  async refreshToken(refreshToken) {
    const data = await this.request(`${this.baseURL}/api/auth/refresh/`, {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken })
    });
    this.token = data.access;
    return data;
  }

  async get(path, params = {}) {
    const url = new URL(`${this.baseURL}${path}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    return this.request(url.toString());
  }

  async post(path, data) {
    return this.request(`${this.baseURL}${path}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(path, data) {
    return this.request(`${this.baseURL}${path}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(path) {
    return this.request(`${this.baseURL}${path}`, {
      method: 'DELETE'
    });
  }

  async patch(path, data) {
    return this.request(`${this.baseURL}${path}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // User & Auth endpoints
  async changePassword(newPassword, oldPassword = null) {
    const payload = { new_password: newPassword };
    if (oldPassword) payload.current_password = oldPassword;
    return this.post('/api/auth/change-password/', payload);
  }

  async getMe() {
    return this.get('/api/auth/me/');
  }

  async updateMe(data) {
    return this.patch('/api/auth/me/', data);
  }

  async saveSecurityQuestions(question1, answer1, question2, answer2) {
    return this.post('/api/auth/security-questions/', {
      question_1: question1,
      answer_1: answer1,
      question_2: question2,
      answer_2: answer2
    });
  }

  async verifySecurityQuestions(answer1, answer2) {
    return this.post('/api/auth/verify-security-questions/', {
      answer_1: answer1,
      answer_2: answer2
    });
  }

  // Password Recovery - New Endpoints
  async recoverSendEmail(email) {
    return this.post('/api/auth/recover/send-email/', { email });
  }

  async recoverVerifyCode(username, code) {
    return this.post('/api/auth/recover/verify-code/', { username, recovery_code: code });
  }

  async recoverVerifyQuestion(username, question, answer) {
    return this.post('/api/auth/recover/verify-question/', { username, question, answer });
  }

  async recoverSetPassword(username, newPassword, method = 'code', verificationToken = '') {
    return this.post('/api/auth/recover/set-password/', {
      username,
      new_password: newPassword,
      method,
      verification_token: verificationToken
    });
  }

  async recoverGenerateCode() {
    return this.post('/api/auth/recover/generate-code/', {});
  }

  async getRecoverySettings() {
    return this.get('/api/auth/recover/settings/');
  }

  async updateRecoverySettings(recoveryEmail = null, securityQuestion = null, securityAnswer = null) {
    const payload = {};
    if (recoveryEmail !== null) payload.recovery_email = recoveryEmail;
    if (securityQuestion !== null) payload.security_question = securityQuestion;
    if (securityAnswer !== null) payload.security_answer = securityAnswer;
    return this.patch('/api/auth/recover/settings/update/', payload);
  }

  async getRecoveryQuestionText(username) {
    return this.get(`/api/auth/recover/question-text/?username=${encodeURIComponent(username)}`);
  }

  // Staff management endpoints (manager only) - via thegate
  async getStaff() {
    return this.get('/api/admin/staff/');
  }

  async createStaff(username, fullName, role, password = '') {
    const nameParts = (fullName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return this.post('/api/admin/staff/', {
      username,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role,
      password
    });
  }

  async updateStaffRole(staffId, role) {
    return this.patch(`/api/admin/staff/${staffId}/`, { role });
  }

  async resetStaffPassword(staffId) {
    return this.post(`/api/admin/staff/${staffId}/reset-password/`, {});
  }

  async deactivateStaff(staffId) {
    return this.post(`/api/admin/staff/${staffId}/deactivate/`, {});
  }

  async deleteStaff(staffId) {
    return this.delete(`/api/admin/staff/${staffId}/`);
  }

  async checkUsernameAvailability(username) {
    return this.get(`/api/admin/check-username/?username=${encodeURIComponent(username)}`);
  }

  // Audit log endpoints (manager only) - via thegate
  async getAuditLog(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const path = params ? `/api/admin/audit-log/?${params}` : '/api/admin/audit-log/';
    return this.get(path);
  }

  // System settings endpoints (manager only) - via thegate
  async getSystemSettings() {
    return this.get('/api/admin/settings/');
  }

  async updateSystemSettings(settings) {
    return this.patch('/api/admin/settings/', settings);
  }

  // Original endpoints
  async getProperties() {
    return this.get('/api/properties/');
  }

  async getUnits() {
    return this.get('/api/units/');
  }

  async getLandlords() {
    return this.get('/api/landlords/');
  }

  async getLandlordProperties() {
    return this.get('/api/landlord-properties/');
  }

  async getTenants(params = {}) {
    return this.get('/api/tenants/', params);
  }

  async getTenantUnits() {
    return this.get('/api/tenant-units/');
  }

  async createTenantUnit(data) {
    return this.post('/api/tenant-units/', data);
  }

  async updateTenantUnit(id, data) {
    return this.patch(`/api/tenant-units/${id}/`, data);
  }

  async getLeases() {
    return this.get('/api/leases/');
  }

  async getInvoices() {
    return this.get('/api/invoices/');
  }

  async getPayments() {
    return this.get('/api/payments/');
  }

  async getExpenses() {
    return this.get('/api/expenses/');
  }

  async getMaintenanceRequests() {
    return this.get('/api/maintenance-requests/');
  }

  // CRUD methods for Properties
  async createProperty(data) {
    return this.post('/api/properties/', data);
  }

  async updateProperty(id, data) {
    return this.put(`/api/properties/${id}/`, data);
  }

  async deleteProperty(id) {
    return this.delete(`/api/properties/${id}/`);
  }

  // CRUD methods for Units
  async createUnit(data) {
    return this.post('/api/units/', data);
  }

  async bulkCreateUnits(unitsArray) {
    // Use the backend bulk create endpoint
    return this.post('/api/units/bulk-create/', unitsArray);
  }

  async updateUnit(id, data) {
    return this.patch(`/api/units/${id}/`, data);
  }

  async deleteUnit(id) {
    return this.delete(`/api/units/${id}/`);
  }

  // CRUD methods for Landlords
  async createLandlord(data) {
    return this.post('/api/landlords/', data);
  }

  async updateLandlord(id, data) {
    return this.put(`/api/landlords/${id}/`, data);
  }

  async deleteLandlord(id) {
    return this.delete(`/api/landlords/${id}/`);
  }

  // CRUD methods for Tenants
  async createTenant(data) {
    return this.post('/api/tenants/', data);
  }

  async updateTenant(id, data) {
    return this.patch(`/api/tenants/${id}/`, data);
  }

  async deleteTenant(id) {
    return this.delete(`/api/tenants/${id}/`);
  }

  // CRUD methods for Leases
  async createLease(data) {
    return this.post('/api/leases/', data);
  }

  async updateLease(id, data) {
    return this.patch(`/api/leases/${id}/`, data);
  }

  async deleteLease(id) {
    return this.delete(`/api/leases/${id}/`);
  }

  // Financials - Rent Payments
  async getRentPayments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/financials/rent-payments/?${queryString}`);
  }

  async getRentPayment(id) {
    return this.get(`/api/financials/rent-payments/${id}/`);
  }

  async createRentPayment(data) {
    return this.post('/api/financials/rent-payments/', data);
  }

  async updateRentPayment(id, data) {
    return this.patch(`/api/financials/rent-payments/${id}/`, data);
  }

  async deleteRentPayment(id) {
    return this.delete(`/api/financials/rent-payments/${id}/`);
  }

  async recordRentPayment(id, data) {
    return this.post(`/api/financials/rent-payments/${id}/record_payment/`, data);
  }

  async recordForTenant(data) {
    return this.post('/api/financials/rent-payments/record_for_tenant/', data);
  }

  async getTenantDashboard(tenantId, params = {}) {
    const queryParams = new URLSearchParams({ tenant_id: tenantId, ...params }).toString();
    return this.get(`/api/financials/rent-payments/tenant_dashboard/?${queryParams}`);
  }

  async getPaymentGrid(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/financials/rent-payments/payment_grid/?${queryString}`);
  }

  async getRentSummary(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/financials/rent-payments/summary/?${queryString}`);
  }

  async getTenantPaymentHistory(tenantId, params = {}) {
    const queryParams = new URLSearchParams({ tenant_id: tenantId, ...params }).toString();
    return this.get(`/api/financials/rent-payments/tenant_history/?${queryParams}`);
  }

  async getBulkRentDashboard(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/financials/rent-payments/bulk_dashboard/?${queryString}`);
  }

  async getGlobalFinancialsSummary(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/financials/rent-payments/global_summary/?${queryString}`);
  }

  async generateBillingCycle(data) {
    return this.post('/api/financials/rent-payments/generate_billing_cycle/', data);
  }

  // Dashboard
  async getDashboardSummary(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/dashboard/summary/?${queryString}`);
  }

  async getDashboardPaymentStatus(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/dashboard/payment-status/?${queryString}`);
  }

  async getDashboardAlerts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/dashboard/alerts/?${queryString}`);
  }

  async getDashboardActivity(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/dashboard/activity/?${queryString}`);
  }

  async getDashboardSnapshot(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/dashboard/snapshot/?${queryString}`);
  }

  // Control Center Stats
  async getAdministrationStats() {
    return this.get('/api/admin/administration-stats/');
  }

  async getFinancialHubStats(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/dashboard/financial-hub-stats/?${queryString}`);
  }

  // Financials - Credit Ledgers
  async getCreditLedgers() {
    return this.get('/api/financials/credit-ledgers/');
  }

  async createCreditLedger(data) {
    return this.post('/api/financials/credit-ledgers/', data);
  }

  async updateCreditLedger(id, data) {
    return this.patch(`/api/financials/credit-ledgers/${id}/`, data);
  }

  // Financials - Arrears Records
  async getArrearsRecords() {
    return this.get('/api/financials/arrears-records/');
  }

  async createArrearsRecord(data) {
    return this.post('/api/financials/arrears-records/', data);
  }

  async updateArrearsRecord(id, data) {
    return this.patch(`/api/financials/arrears-records/${id}/`, data);
  }

  // Financials - Payment Audit Logs
  async getAuditLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/api/financials/audit-logs/?${queryString}`);
  }

  // Financials - Payment Streaks
  async getPaymentStreaks() {
    return this.get('/api/financials/payment-streaks/');
  }

  async updatePaymentStreak(id, data) {
    return this.patch(`/api/financials/payment-streaks/${id}/`, data);
  }
}

const apiClient = new ApiClient();
