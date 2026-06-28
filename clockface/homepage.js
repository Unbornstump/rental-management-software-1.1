const { ipcRenderer } = require('electron');

// Load saved settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});

// Enter Property Management button
document.getElementById('enter-property-management').addEventListener('click', () => {
  ipcRenderer.send('open-login-window');
});

// Save settings button
document.getElementById('save-settings').addEventListener('click', () => {
  saveSettings();
});

// Load settings from localStorage
function loadSettings() {
  const backendUrl = localStorage.getItem('backend-url');
  const theme = localStorage.getItem('theme');

  if (backendUrl) {
    document.getElementById('backend-url').value = backendUrl;
  }
  if (theme) {
    document.getElementById('theme').value = theme;
  }
}

// Save settings to localStorage
function saveSettings() {
  const backendUrl = document.getElementById('backend-url').value;
  const theme = document.getElementById('theme').value;

  localStorage.setItem('backend-url', backendUrl);
  localStorage.setItem('theme', theme);

  // Show confirmation
  const btn = document.getElementById('save-settings');
  const originalText = btn.textContent;
  btn.textContent = 'Settings Saved!';
  btn.disabled = true;

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
  }, 2000);
}
