const { ipcRenderer } = require('electron');

const RECOVERY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What was your mother\'s maiden name?',
  'What was the name of your primary school?',
  'What was the make of your first car?',
  'What is your oldest sibling\'s middle name?',
  'What street did you grow up on?',
  'What was your childhood nickname?'
];

let currentSetupStep = 1;
let setupState = {
  fullName: '',
  username: '',
  password: '',
  confirmPassword: ''
};

function showInactivityMessage() {
  const authView = document.getElementById('auth-view');
  if (!authView) return;

  // Check if we have a message to show
  if (localStorage.getItem('loggedOutDueToInactivity') === 'true') {
    // Clear the flag
    localStorage.removeItem('loggedOutDueToInactivity');

    // Create message element
    const message = document.createElement('div');
    message.style.cssText = `
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      color: #78350f;
      font-size: 14px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;
    message.textContent = 'You were logged out due to inactivity';

    // Insert after the login title
    const loginTitle = authView.querySelector('h2');
    if (loginTitle && loginTitle.nextSibling) {
      authView.insertBefore(message, loginTitle.nextSibling);
    } else {
      authView.insertBefore(message, authView.firstChild);
    }

    // Remove after 4 seconds
    setTimeout(() => {
      message.style.opacity = '0';
      message.style.transition = 'opacity 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 4000);
  }
}

function togglePasswordVisibility(input, toggle) {
  if (!input) return;
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;

  if (input.type === 'password') {
    input.type = 'text';
    toggle.classList.add('visible');
  } else {
    input.type = 'password';
    toggle.classList.remove('visible');
  }

  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
    input.setSelectionRange(selectionStart, selectionEnd);
  }
}

function createPasswordFieldToggle(input) {
  if (!input || input.dataset.passwordToggleAttached === 'true') return;
  if (input.parentElement && input.parentElement.classList.contains('password-input-wrapper')) {
    input.dataset.passwordToggleAttached = 'true';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'password-input-wrapper';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.setAttribute('aria-label', 'Toggle password visibility');
  toggle.innerHTML = `
    <svg class="eye-icon eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
    <svg class="eye-icon eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  `;
  wrapper.appendChild(toggle);

  toggle.addEventListener('click', () => togglePasswordVisibility(input, toggle));

  input.dataset.passwordToggleAttached = 'true';
}

function attachPasswordToggles(container) {
  if (!container) return;
  container.querySelectorAll('input[type="password"]').forEach(createPasswordFieldToggle);
}

function initializeLoginPage() {
  showInactivityMessage();

  const passwordToggle = document.getElementById('password-toggle');
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
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
  }

  attachPasswordToggles(document.body);

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showRecoveryForm();
    });
  }

  attachPasswordToggles(document.body);

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const loginButton = document.querySelector('.login-button');

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

      loginButton.disabled = true;
      loginButton.textContent = 'Logging in...';

      try {
        const data = await apiClient.login(username, password);

        AppState.setUserRole(data.user.role);
        AppState.setUsername(username);
        AppState.setMustChangePassword(data.user.must_change_password);
        AppState.setAuthToken(data.access);

        if (data.user.must_change_password) {
          showPasswordChangeDialog();
        } else {
          ipcRenderer.send('login-success', {
            token: data.access,
            role: data.user.role,
            username,
            mustChangePassword: false,
            user: data.user
          });
        }
      } catch (error) {
        loginButton.disabled = false;
        loginButton.textContent = 'Log In';
        showLoginError('Invalid username or password');
        shakeCard();
      }
    });
  }

  checkSetupStatus();
}

async function checkSetupStatus() {
  try {
    const status = await apiClient.getSetupStatus();
    if (status.setup_required) {
      showSetupWelcome();
      const authView = document.getElementById('auth-view');
      if (authView) {
        authView.hidden = true;
      }
    }
  } catch (error) {
    console.error('Failed to check setup status', error);
  }
}

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
  void loginCard.offsetWidth;
  loginCard.classList.add('shake');
}

function showSetupWelcome() {
  currentSetupStep = 1;
  const container = document.getElementById('setup-flow');
  container.hidden = false;
  container.innerHTML = `
    <div class="setup-progress">
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot"></span>
      <span class="setup-progress-dot"></span>
      <span class="setup-progress-label">Step 1 of 3</span>
    </div>
    <h2 class="setup-card-title">RMS</h2>
    <p class="setup-card-copy">Welcome. Let's get you set up.</p>
    <p class="setup-card-copy">You are setting up RMS for the first time. Start by creating your manager account.</p>
    <div class="setup-button-row">
      <button type="button" class="login-button" id="setup-start-button">Get Started</button>
    </div>
  `;

  document.getElementById('setup-start-button').addEventListener('click', () => {
    showCreateManagerAccount();
  });
}

function showCreateManagerAccount() {
  currentSetupStep = 2;
  const container = document.getElementById('setup-flow');
  container.innerHTML = `
    <div class="setup-progress">
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot"></span>
      <span class="setup-progress-label">Step 2 of 3</span>
    </div>
    <h2 class="setup-card-title">Create Manager Account</h2>
    <p class="setup-card-copy">Create the account that will manage this RMS installation.</p>
    <form id="setup-manager-form" class="setup-form-grid">
      <div class="setup-form-group">
        <label class="setup-label" for="setup-full-name">Full Name</label>
        <input type="text" id="setup-full-name" class="setup-input" value="${setupState.fullName || ''}">
        <span class="field-error" id="setup-full-name-error"></span>
      </div>
      <div class="setup-form-group">
        <label class="setup-label" for="setup-username">Username</label>
        <input type="text" id="setup-username" class="setup-input" value="${setupState.username || ''}">
        <span class="field-error" id="setup-username-error"></span>
      </div>
      <div class="setup-form-group">
        <label class="setup-label" for="setup-password">Password</label>
        <input type="password" id="setup-password" class="setup-input" value="${setupState.password || ''}">
        <span class="field-error" id="setup-password-error"></span>
      </div>
      <div class="setup-form-group">
        <label class="setup-label" for="setup-confirm-password">Confirm Password</label>
        <input type="password" id="setup-confirm-password" class="setup-input" value="${setupState.confirmPassword || ''}">
        <span class="field-error" id="setup-confirm-password-error"></span>
      </div>
      <div class="setup-button-row">
        <button type="submit" class="login-button" id="setup-create-button">Create Account</button>
      </div>
    </form>
  `;

  attachPasswordToggles(container);
  bindManagerFormValidation();
}

function bindManagerFormValidation() {
  const fullNameInput = document.getElementById('setup-full-name');
  const usernameInput = document.getElementById('setup-username');
  const passwordInput = document.getElementById('setup-password');
  const confirmPasswordInput = document.getElementById('setup-confirm-password');
  const form = document.getElementById('setup-manager-form');
  const submitButton = document.getElementById('setup-create-button');

  const validate = () => {
    const fullName = fullNameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    let valid = true;

    document.getElementById('setup-full-name-error').textContent = '';
    document.getElementById('setup-username-error').textContent = '';
    document.getElementById('setup-password-error').textContent = '';
    document.getElementById('setup-confirm-password-error').textContent = '';

    if (!fullName) {
      document.getElementById('setup-full-name-error').textContent = 'This field is required';
      valid = false;
    } else if (!/^[A-Za-z ]+$/.test(fullName)) {
      document.getElementById('setup-full-name-error').textContent = 'Full name can only contain letters and spaces';
      valid = false;
    }

    if (!username) {
      document.getElementById('setup-username-error').textContent = 'This field is required';
      valid = false;
    } else if (username.includes(' ')) {
      document.getElementById('setup-username-error').textContent = 'Username cannot contain spaces';
      valid = false;
    } else if (username.length < 4) {
      document.getElementById('setup-username-error').textContent = 'Username must be at least 4 characters';
      valid = false;
    }

    if (!password) {
      document.getElementById('setup-password-error').textContent = 'This field is required';
      valid = false;
    } else if (password.length < 8) {
      document.getElementById('setup-password-error').textContent = 'Password must be at least 8 characters';
      valid = false;
    } else if (!/\d/.test(password)) {
      document.getElementById('setup-password-error').textContent = 'Password must include at least one number';
      valid = false;
    }

    if (!confirmPassword) {
      document.getElementById('setup-confirm-password-error').textContent = 'This field is required';
      valid = false;
    } else if (password !== confirmPassword) {
      document.getElementById('setup-confirm-password-error').textContent = 'Passwords do not match';
      valid = false;
    }

    submitButton.disabled = !valid;
    setupState = { fullName, username, password, confirmPassword };
    return valid;
  };

  [fullNameInput, usernameInput, passwordInput, confirmPasswordInput].forEach((input) => {
    input.addEventListener('input', validate);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const createButton = document.getElementById('setup-create-button');
    createButton.disabled = true;
    createButton.textContent = 'Creating...';

    try {
      await apiClient.registerManager(setupState.fullName, setupState.username, setupState.password);
      const authResponse = await apiClient.login(setupState.username, setupState.password);
      AppState.setUserRole(authResponse.user.role);
      AppState.setUsername(authResponse.user.username);
      AppState.setAuthToken(authResponse.access);
      AppState.setMustChangePassword(authResponse.user.must_change_password);
      showSecurityQuestionSetup();
    } catch (error) {
      const message = error?.response?.data?.error || 'Unable to create manager account';
      document.getElementById('setup-username-error').textContent = message;
      createButton.disabled = false;
      createButton.textContent = 'Create Account';
    }
  });

  validate();
}

function showSecurityQuestionSetup() {
  currentSetupStep = 3;
  const container = document.getElementById('setup-flow');
  container.innerHTML = `
    <div class="setup-progress">
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-label">Step 3 of 3</span>
    </div>
    <h2 class="setup-card-title">Set Up Account Recovery</h2>
    <p class="setup-card-copy">Configure your recovery email and security question for account recovery.</p>
    <form id="security-setup-form" class="setup-form-grid">
      <div class="setup-form-group">
        <label class="setup-label" for="setup-recovery-email">Recovery Email</label>
        <input type="email" id="setup-recovery-email" class="setup-input" placeholder="Enter recovery email address" required>
        <span class="field-error" id="setup-recovery-email-error"></span>
      </div>
      <div class="setup-form-group">
        <label class="setup-label" for="setup-security-question">Security Question</label>
        <select id="setup-security-question" class="setup-input" required>
          <option value="">Select a question...</option>
          ${RECOVERY_QUESTIONS.map((question) => `<option value="${question}">${question}</option>`).join('')}
        </select>
        <span class="field-error" id="setup-security-question-error"></span>
      </div>
      <div class="setup-form-group">
        <label class="setup-label" for="setup-security-answer">Your Answer</label>
        <input type="text" id="setup-security-answer" class="setup-input" placeholder="Your answer" required>
        <span class="field-error" id="setup-security-answer-error"></span>
      </div>
      <div class="setup-button-row">
        <button type="submit" class="login-button" id="setup-save-button">Save & Continue</button>
      </div>
    </form>
    <p class="setup-help-text">You can update these later in System Settings.</p>
  `;

  document.getElementById('security-setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('setup-recovery-email').value.trim();
    const question = document.getElementById('setup-security-question').value;
    const answer = document.getElementById('setup-security-answer').value.trim();

    document.getElementById('setup-recovery-email-error').textContent = '';
    document.getElementById('setup-security-question-error').textContent = '';
    document.getElementById('setup-security-answer-error').textContent = '';

    if (!email) {
      document.getElementById('setup-recovery-email-error').textContent = 'Recovery email is required';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('setup-recovery-email-error').textContent = 'Please enter a valid email address';
      return;
    }

    if (!question) {
      document.getElementById('setup-security-question-error').textContent = 'Please select a security question';
      return;
    }

    if (!answer) {
      document.getElementById('setup-security-answer-error').textContent = 'Please provide an answer';
      return;
    }

    const saveButton = document.getElementById('setup-save-button');
    saveButton.disabled = true;
    saveButton.textContent = 'Setting up...';

    try {
      // Save recovery settings
      await apiClient.updateRecoverySettings(email, question, answer);
      // Generate initial recovery code
      const codeResult = await apiClient.recoverGenerateCode();
      setupState.recoveryCode = codeResult.recovery_code;
      showRecoveryCodeDisplay();
    } catch (error) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save & Continue';
      const errorMsg = error?.response?.data?.error || 'Unable to save recovery settings';
      document.getElementById('setup-security-answer-error').textContent = errorMsg;
    }
  });
}

function showRecoveryCodeDisplay() {
  const container = document.getElementById('setup-flow');
  container.innerHTML = `
    <div class="setup-progress">
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-dot active"></span>
      <span class="setup-progress-label">Step 3 of 3</span>
    </div>
    <h2 class="setup-card-title">Save Your Recovery Code</h2>
    <p class="setup-card-copy">Write down or save this code somewhere safe. You'll need it if you forget your password.</p>
    <div class="setup-recovery-code-display" style="background: var(--background-tertiary, #0f1115); border: 1px solid var(--background-tertiary-hover, #1a1d23); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; font-family: 'Courier New', monospace;">
      <div style="font-size: 14px; color: #9ca3af; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Recovery Code</div>
      <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #fff; word-break: break-all;">${setupState.recoveryCode}</div>
    </div>
    <div class="setup-button-row" style="margin-bottom: 16px;">
      <button type="button" class="login-button" id="copy-recovery-code-btn" style="background: var(--background-tertiary, #1a1d23); color: #7c8aff; border: 1px solid #7c8aff;">Copy to Clipboard</button>
    </div>
    <div style="margin: 20px 0; padding: 16px; background: rgba(124, 138, 255, 0.1); border-left: 3px solid #7c8aff; border-radius: 4px;">
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
        <input type="checkbox" id="setup-code-saved-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
        <span style="color: #d1d5db; font-size: 14px;">I have saved my recovery code</span>
      </label>
    </div>
    <div class="setup-button-row">
      <button type="button" class="login-button" id="setup-complete-button" disabled>Enter RMS</button>
    </div>
  `;

  const copyBtn = document.getElementById('copy-recovery-code-btn');
  const checkbox = document.getElementById('setup-code-saved-checkbox');
  const completeBtn = document.getElementById('setup-complete-button');

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(setupState.recoveryCode);
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => {
        copyBtn.textContent = 'Copy to Clipboard';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  });

  checkbox.addEventListener('change', () => {
    completeBtn.disabled = !checkbox.checked;
  });

  completeBtn.addEventListener('click', async () => {
    completeBtn.disabled = true;
    completeBtn.textContent = 'Entering RMS...';
    try {
      const result = await apiClient.login(setupState.username, setupState.password);
      AppState.setUserRole(result.user.role);
      AppState.setUsername(setupState.username);
      AppState.setMustChangePassword(result.user.must_change_password);
      AppState.setAuthToken(result.access);
      ipcRenderer.send('login-success', {
        token: result.access,
        role: result.user.role,
        username: setupState.username,
        mustChangePassword: false,
        user: result.user
      });
    } catch (error) {
      console.error('Login failed after setup:', error);
      completeBtn.disabled = false;
      completeBtn.textContent = 'Enter RMS';
    }
  });
}

function showSetupComplete() {
  // This is now handled by showRecoveryCodeDisplay()
  // Kept for backwards compatibility if needed
}

function showRecoveryForm() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('open-recovery-window');
    window.close();
  }
}

function showPasswordChangeDialog() {
  const loginContainer = document.querySelector('.login-container');
  const passwordChangeScreen = document.getElementById('password-change-screen');
  const welcomeMessage = document.getElementById('password-change-welcome');
  const passwordChangeForm = document.getElementById('password-change-form');

  if (loginContainer) {
    loginContainer.style.display = 'none';
  }

  if (passwordChangeScreen) {
    passwordChangeScreen.hidden = false;
    passwordChangeScreen.classList.add('is-visible');
  }

  document.body.classList.add('password-change-active');

  if (welcomeMessage) {
    welcomeMessage.textContent = `Welcome, ${AppState.getUsername()}`;
  }

  if (passwordChangeForm) {
    attachPasswordToggles(passwordChangeForm);
    
    // Wire up the static password toggles in the HTML
    const newPasswordToggle = document.getElementById('new-password-toggle');
    const newPasswordInput = document.getElementById('new-password');
    if (newPasswordToggle && newPasswordInput) {
      newPasswordToggle.addEventListener('click', () => togglePasswordVisibility(newPasswordInput, newPasswordToggle));
    }
    
    const confirmPasswordToggle = document.getElementById('confirm-password-toggle');
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (confirmPasswordToggle && confirmPasswordInput) {
      confirmPasswordToggle.addEventListener('click', () => togglePasswordVisibility(confirmPasswordInput, confirmPasswordToggle));
    }
    
    passwordChangeForm.onsubmit = async (e) => {
      e.preventDefault();

      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

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
        await apiClient.changePassword(newPassword);
        document.body.classList.remove('password-change-active');

        if (passwordChangeScreen) {
          passwordChangeScreen.classList.remove('is-visible');
          passwordChangeScreen.hidden = true;
        }

        if (loginContainer) {
          loginContainer.style.display = '';
        }

        ipcRenderer.send('login-success', {
          token: AppState.getAuthToken(),
          role: AppState.getUserRole(),
          username: AppState.getUsername(),
          mustChangePassword: false
        });
      } catch (error) {
        showPasswordChangeFieldError('new-password', 'Failed to set password. Try again.');
      }
    };
  }
}

function showPasswordChangeFieldError(fieldId, message) {
  const errorSpan = document.getElementById(`${fieldId}-error`);
  if (errorSpan) {
    errorSpan.textContent = message;
  }
}

initializeLoginPage();
