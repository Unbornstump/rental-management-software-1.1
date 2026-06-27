const { ipcRenderer } = require('electron');

let authToken = null;

// Listen for auth token from main process
ipcRenderer.on('auth-token', (event, token) => {
  authToken = token;
  apiClient.token = token;
  loadPage('dashboard');
});

// Navigation handling
document.querySelectorAll('.nav-button').forEach(button => {
  button.addEventListener('click', () => {
    // Update active state
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Load page
    const page = button.dataset.page;
    loadPage(page);
  });
});

async function loadPage(pageName) {
  const contentDiv = document.getElementById('page-content');
  contentDiv.innerHTML = '<p>Loading...</p>';
  
  try {
    switch (pageName) {
      case 'dashboard':
        await loadDashboard(contentDiv);
        break;
      case 'properties':
        await loadProperties(contentDiv);
        break;
      case 'units':
        await loadUnits(contentDiv);
        break;
      case 'landlords':
        await loadLandlords(contentDiv);
        break;
      case 'tenants':
        await loadTenants(contentDiv);
        break;
      case 'leases':
        await loadLeases(contentDiv);
        break;
      case 'financials':
        await loadFinancials(contentDiv);
        break;
      case 'maintenance':
        await loadMaintenance(contentDiv);
        break;
      case 'reports':
        await loadReports(contentDiv);
        break;
      default:
        contentDiv.innerHTML = '<p>Page not found</p>';
    }
  } catch (error) {
    contentDiv.innerHTML = `<p>Error loading page: ${error.message}</p>`;
  }
}

async function loadDashboard(container) {
  container.innerHTML = `
    <h1 class="page-title">Dashboard</h1>
    <ul class="stats-list" id="dashboard-stats"></ul>
  `;
  
  const statsList = document.getElementById('dashboard-stats');
  
  try {
    const properties = await apiClient.getProperties();
    const units = await apiClient.getUnits();
    const tenants = await apiClient.getTenants();
    const leases = await apiClient.getLeases();
    
    statsList.innerHTML = `
      <li>Total properties: ${properties.length}</li>
      <li>Total units: ${units.length}</li>
      <li>Total tenants: ${tenants.length}</li>
      <li>Total leases: ${leases.length}</li>
    `;
  } catch (error) {
    statsList.innerHTML = `<li>Error loading dashboard: ${error.message}</li>`;
  }
}

async function loadProperties(container) {
  container.innerHTML = `
    <h1 class="page-title">Properties</h1>
    <ul class="data-list" id="properties-list"></ul>
  `;
  
  const list = document.getElementById('properties-list');
  
  try {
    const properties = await apiClient.getProperties();
    if (!properties || properties.length === 0) {
      list.innerHTML = '<li>No properties found.</li>';
      return;
    }
    
    list.innerHTML = properties.map(prop => 
      `<li>${prop.name || 'N/A'} — ${prop.property_type || 'N/A'} — ${prop.location || 'N/A'}</li>`
    ).join('');
  } catch (error) {
    list.innerHTML = `<li>Error loading properties: ${error.message}</li>`;
  }
}

async function loadUnits(container) {
  container.innerHTML = `
    <h1 class="page-title">Units</h1>
    <ul class="data-list" id="units-list"></ul>
  `;
  
  const list = document.getElementById('units-list');
  
  try {
    const units = await apiClient.getUnits();
    if (!units || units.length === 0) {
      list.innerHTML = '<li>No units found.</li>';
      return;
    }
    
    list.innerHTML = units.map(unit => 
      `<li>${unit.unit_number || 'N/A'} — ${unit.unit_type || 'N/A'} — ${unit.rent_amount || 'N/A'}</li>`
    ).join('');
  } catch (error) {
    list.innerHTML = `<li>Error loading units: ${error.message}</li>`;
  }
}

async function loadLandlords(container) {
  container.innerHTML = `
    <h1 class="page-title">Landlords</h1>
    <ul class="data-list" id="landlords-list"></ul>
  `;
  
  const list = document.getElementById('landlords-list');
  
  try {
    const landlords = await apiClient.getLandlords();
    if (!landlords || landlords.length === 0) {
      list.innerHTML = '<li>No landlords found.</li>';
      return;
    }
    
    list.innerHTML = landlords.map(landlord => 
      `<li>${landlord.name || 'N/A'} — ${landlord.email || 'N/A'} — ${landlord.phone || 'N/A'}</li>`
    ).join('');
  } catch (error) {
    list.innerHTML = `<li>Error loading landlords: ${error.message}</li>`;
  }
}

async function loadTenants(container) {
  container.innerHTML = `
    <h1 class="page-title">Tenants</h1>
    <ul class="data-list" id="tenants-list"></ul>
  `;
  
  const list = document.getElementById('tenants-list');
  
  try {
    const tenants = await apiClient.getTenants();
    if (!tenants || tenants.length === 0) {
      list.innerHTML = '<li>No tenants found.</li>';
      return;
    }
    
    list.innerHTML = tenants.map(tenant => 
      `<li>${tenant.name || 'N/A'} — ${tenant.email || 'N/A'} — ${tenant.phone || 'N/A'}</li>`
    ).join('');
  } catch (error) {
    list.innerHTML = `<li>Error loading tenants: ${error.message}</li>`;
  }
}

async function loadLeases(container) {
  container.innerHTML = `
    <h1 class="page-title">Leases</h1>
    <ul class="data-list" id="leases-list"></ul>
  `;
  
  const list = document.getElementById('leases-list');
  
  try {
    const leases = await apiClient.getLeases();
    if (!leases || leases.length === 0) {
      list.innerHTML = '<li>No leases found.</li>';
      return;
    }
    
    list.innerHTML = leases.map(lease => 
      `<li>${lease.lease_number || 'N/A'} — ${lease.start_date || 'N/A'} — ${lease.end_date || 'N/A'}</li>`
    ).join('');
  } catch (error) {
    list.innerHTML = `<li>Error loading leases: ${error.message}</li>`;
  }
}

async function loadFinancials(container) {
  container.innerHTML = `
    <h1 class="page-title">Financials</h1>
    <p class="placeholder-text">Financials page - Coming soon</p>
  `;
}

async function loadMaintenance(container) {
  container.innerHTML = `
    <h1 class="page-title">Maintenance</h1>
    <p class="placeholder-text">Maintenance page - Coming soon</p>
  `;
}

async function loadReports(container) {
  container.innerHTML = `
    <h1 class="page-title">Reports</h1>
    <p class="placeholder-text">Reports page - Coming soon</p>
  `;
}
