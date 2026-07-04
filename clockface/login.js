const { ipcRenderer } = require('electron');

// Password toggle functionality
document.getElementById('password-toggle').addEventListener('click', () => {
  const passwordInput = document.getElementById('password');
  const toggle = document.getElementById('password-toggle');

  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggle.classList.add('visible');
  } else {
    passwordInput.type = 'password';
    toggle.classList.remove('visible');
  }
});

// Form submission with validation
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear previous errors
  clearErrors();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const loginCard = document.querySelector('.login-card');
  const loginButton = document.querySelector('.login-button');
  
  // Field validation
  let hasError = false;
  
  if (!username) {
    showFieldError('username', 'This field is required');
    hasError = true;
  }
  
  if (!password) {
    showFieldError('password', 'This field is required');
    hasError = true;
  }
  
  if (hasError) {
    shakeCard();
    return;
  }
  
  // Disable button during login
  loginButton.disabled = true;
  loginButton.textContent = 'Logging in...';
  
  try {
    const data = await apiClient.login(username, password);
    ipcRenderer.send('login-success', data.access);
  } catch (error) {
    // Re-enable button
    loginButton.disabled = false;
    loginButton.textContent = 'Log In';
    
    // Show error
    showLoginError('Invalid username or password');
    shakeCard();
  }
});

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorSpan = document.getElementById(`${fieldId}-error`);
  
  input.classList.add('error');
  errorSpan.textContent = message;
}

function showLoginError(message) {
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = message;
}

function clearErrors() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const usernameError = document.getElementById('username-error');
  const passwordError = document.getElementById('password-error');
  const loginError = document.getElementById('login-error');
  
  usernameInput.classList.remove('error');
  passwordInput.classList.remove('error');
  usernameError.textContent = '';
  passwordError.textContent = '';
  loginError.textContent = '';
}

function shakeCard() {
  const loginCard = document.querySelector('.login-card');
  loginCard.classList.remove('shake');
  
  // Trigger reflow to restart animation
  void loginCard.offsetWidth;
  
  loginCard.classList.add('shake');
}
