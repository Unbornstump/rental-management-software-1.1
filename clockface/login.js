const { ipcRenderer } = require('electron');

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    alert('Please enter both username and password.');
    return;
  }

  try {
    const data = await apiClient.login(username, password);
    ipcRenderer.send('login-success', data.access);
  } catch (error) {
    alert('Login Failed: ' + error.message);
  }
});
