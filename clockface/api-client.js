const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnv();

const BASE_URL = process.env.RMS_BACKEND_URL || 'http://127.0.0.1:8000';

class ApiClient {
  constructor() {
    this.baseURL = BASE_URL;
    this.token = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
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

  async login(username, password) {
    const response = await axios.post(`${this.baseURL}/api/auth/login/`, {
      username,
      password
    });
    this.token = response.data.access;
    this.user = response.data.user;
    return response.data;
  }

  async getSetupStatus() {
    const response = await axios.get(`${this.baseURL}/api/auth/setup-status/`);
    return response.data;
  }

  async registerManager(fullName, username, password) {
    const response = await axios.post(`${this.baseURL}/api/auth/register/`, {
      full_name: fullName,
      username,
      password
    });
    this.user = response.data;
    return response.data;
  }

  async refreshToken(refreshToken) {
    const response = await axios.post(`${this.baseURL}/api/auth/refresh/`, {
      refresh: refreshToken
    });
    this.token = response.data.access;
    return response.data;
  }

  async get(path) {
    const response = await axios.get(`${this.baseURL}${path}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async post(path, data) {
    const response = await axios.post(`${this.baseURL}${path}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async put(path, data) {
    const response = await axios.put(`${this.baseURL}${path}`, data, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async delete(path) {
    const response = await axios.delete(`${this.baseURL}${path}`, {
      headers: this.getHeaders()
    });
    return response.data;
  }

  async patch(path, data) {
    const response = await axios.patch(`${this.baseURL}${path}`, data, {
        headers: this.getHeaders()
    });
    return response.data;
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

  // Staff management endpoints (manager only) - via thegate
  async getStaff() {
    return this.get('/api/admin/staff/');
  }

  async createStaff(username, fullName, role) {
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return this.post('/api/admin/staff/', {
      username,
      first_name: firstName,
      last_name: lastName,
      role
    });
  }

  async updateStaffRole(staffId, role) {
    return this.patch(`/api/admin/staff/${staffId}/`, { role });
  }

  async resetStaffPassword(staffId) {
    return this.post(`/api/admin/staff/${staffId}/reset-password/`, {});
  }

  async deactivateStaff(staffId) {
    return this.delete(`/api/admin/staff/${staffId}/`);
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

  async getTenants() {
    return this.get('/api/tenants/');
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
    // Create multiple units in parallel
    const promises = unitsArray.map(unit => 
      this.post('/api/units/', unit)
    );
    return Promise.all(promises);
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

  // CRUD methods for Deposits
  async createDeposit(data) {
    return this.post('/api/deposits/', data);
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
