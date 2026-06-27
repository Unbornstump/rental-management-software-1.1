import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv('RMS_BACKEND_URL', 'http://127.0.0.1:8000')

class ApiClient:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or BASE_URL
        self.token = None

    def _headers(self):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        return headers

    def login(self, username: str, password: str):
        url = f'{self.base_url}/api/auth/login/'
        response = requests.post(url, json={'username': username, 'password': password})
        response.raise_for_status()
        data = response.json()
        self.token = data.get('access')
        return data

    def refresh_token(self, refresh_token: str):
        url = f'{self.base_url}/api/auth/refresh/'
        response = requests.post(url, json={'refresh': refresh_token})
        response.raise_for_status()
        data = response.json()
        self.token = data.get('access')
        return data

    def get(self, path: str):
        url = f'{self.base_url}{path}'
        response = requests.get(url, headers=self._headers())
        response.raise_for_status()
        return response.json()

    def get_properties(self):
        return self.get('/api/properties/')

    def get_units(self):
        return self.get('/api/units/')

    def get_landlords(self):
        return self.get('/api/landlords/')

    def get_landlord_properties(self):
        return self.get('/api/landlord-properties/')

    def get_tenants(self):
        return self.get('/api/tenants/')

    def get_tenant_units(self):
        return self.get('/api/tenant-units/')

    def get_leases(self):
        return self.get('/api/leases/')

    def get_invoices(self):
        return self.get('/api/invoices/')

    def get_payments(self):
        return self.get('/api/payments/')

    def get_expenses(self):
        return self.get('/api/expenses/')

    def get_maintenance_requests(self):
        return self.get('/api/maintenance-requests/')
