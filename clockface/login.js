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
    
    // Store role and must_change_password flag
    AppState.setUserRole(data.user.role);
    AppState.setUsername(username);
    AppState.setMustChangePassword(data.user.must_change_password);
    AppState.setAuthToken(data.access);
    
    // If user must change password, show password change dialog
    if (data.user.must_change_password) {
      showPasswordChangeDialog();
    } else {
      // Otherwise proceed to main app
      ipcRenderer.send('login-success', {
        token: data.access,
        role: data.user.role,
        username: username,
        mustChangePassword: false,
        user: data.user
      });
    }
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

function showPasswordChangeDialog() {
  const dialogHtml = `
    <div id="password-change-overlay" class="modal-overlay">
      <div class="modal-card">
        <h2>Set New Password</h2>
        <p>Welcome, ${AppState.getUsername()}</p>
        <p class="password-change-subtitle">You must set a new password before continuing.</p>
        
        <form id="password-change-form">
          <div class="form-group">
            <label for="new-password">New Password</label>
            <input 
              type="password" 
              id="new-password" 
              class="modal-input" 
              placeholder="Enter new password" 
              required
            >
            <span class="field-error" id="new-password-error"></span>
          </div>
          
          <div class="form-group">
            <label for="confirm-password">Confirm Password</label>
            <input 
              type="password" 
              id="confirm-password" 
              class="modal-input" 
              placeholder="Confirm new password" 
              required
            >
            <span class="field-error" id="confirm-password-error"></span>
          </div>
          
          <button type="submit" class="modal-button">Set Password & Continue</button>
        </form>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', dialogHtml);
  
  document.getElementById('password-change-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validation
    let hasError = false;
    if (newPassword.length < 6) {
      showPasswordChangeFieldError('new-password', 'Password must be at least 6 characters');
      hasError = true;
    }
    
    if (newPassword !== confirmPassword) {
      showPasswordChangeFieldError('confirm-password', 'Passwords do not match');
      hasError = true;
    }
    
    if (hasError) return;
    
    try {
      // Change password without old password (first login)
      await apiClient.changePassword(newPassword);
      
      // Close dialog and proceed
      document.getElementById('password-change-overlay').remove();
      
      ipcRenderer.send('login-success', {
        token: AppState.getAuthToken(),
        role: AppState.getUserRole(),
        username: AppState.getUsername(),
        mustChangePassword: false
      });
    } catch (error) {
      showPasswordChangeFieldError('new-password', 'Failed to set password. Try again.');
    }
  });
}

function showPasswordChangeFieldError(fieldId, message) {
  const errorSpan = document.getElementById(`${fieldId}-error`);
  if (errorSpan) {
    errorSpan.textContent = message;
  }
}
