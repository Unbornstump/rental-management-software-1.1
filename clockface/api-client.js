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
}

const apiClient = new ApiClient();
