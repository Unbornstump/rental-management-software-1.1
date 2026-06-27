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
}

const apiClient = new ApiClient();
