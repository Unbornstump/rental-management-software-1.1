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

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showRecoveryForm();
    });
  }

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

        if (data.requires_security_questions_setup) {
          showSecurityQuestionSetup();
          return;
        }

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
    <p class="setup-card-copy">Choose two security questions. These will be used to recover your account if you forget your password.</p>
    <form id="security-setup-form" class="setup-form-grid">
      <div class="setup-form-group">
        <label class="setup-label" for="setup-question-1">Question 1</label>
        <select id="setup-question-1" class="setup-input">
          ${RECOVERY_QUESTIONS.map((question) => `<option value="${question}">${question}</option>`).join('')}
        </select>
        <input type="text" id="setup-answer-1" class="setup-input" placeholder="Your answer">
        <span class="field-error" id="setup-answer-1-error"></span>
      </div>
      <div class="setup-form-group">
        <label class="setup-label" for="setup-question-2">Question 2</label>
        <select id="setup-question-2" class="setup-input">
          ${RECOVERY_QUESTIONS.map((question) => `<option value="${question}">${question}</option>`).join('')}
        </select>
        <input type="text" id="setup-answer-2" class="setup-input" placeholder="Your answer">
        <span class="field-error" id="setup-answer-2-error"></span>
      </div>
      <div class="setup-button-row">
        <button type="submit" class="login-button" id="setup-save-button">Save & Continue</button>
      </div>
    </form>
    <p class="setup-help-text">You can update these later in System Settings.</p>
  `;

  document.getElementById('security-setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const question1 = document.getElementById('setup-question-1').value;
    const answer1 = document.getElementById('setup-answer-1').value.trim();
    const question2 = document.getElementById('setup-question-2').value;
    const answer2 = document.getElementById('setup-answer-2').value.trim();

    document.getElementById('setup-answer-1-error').textContent = '';
    document.getElementById('setup-answer-2-error').textContent = '';

    if (!answer1) {
      document.getElementById('setup-answer-1-error').textContent = 'This field is required';
      return;
    }

    if (!answer2) {
      document.getElementById('setup-answer-2-error').textContent = 'This field is required';
      return;
    }

    if (question1 === question2) {
      document.getElementById('setup-answer-2-error').textContent = 'Choose two different questions';
      return;
    }

    const saveButton = document.getElementById('setup-save-button');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      await apiClient.saveSecurityQuestions(question1, answer1, question2, answer2);
      showSetupComplete();
    } catch (error) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save & Continue';
      document.getElementById('setup-answer-2-error').textContent = 'Unable to save security questions';
    }
  });
}

function showSetupComplete() {
  const container = document.getElementById('setup-flow');
  container.innerHTML = `
    <div class="setup-success-icon">✓</div>
    <h2 class="setup-card-title">You're all set!</h2>
    <p class="setup-card-copy">Your manager account has been created. You can now start adding your properties.</p>
    <div class="setup-button-row">
      <button type="button" class="login-button" id="setup-enter-button">Enter RMS</button>
    </div>
  `;

  document.getElementById('setup-enter-button').addEventListener('click', async () => {
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
      console.error('Automatic login after setup failed', error);
    }
  });
}

function showRecoveryForm() {
  const container = document.getElementById('recovery-form-container');
  container.hidden = false;
  container.innerHTML = `
    <div class="recovery-panel">
      <h3>Account Recovery</h3>
      <p>Answer your security questions to receive a temporary password.</p>
      <form id="recovery-form">
        <div class="form-group">
          <label for="recovery-answer-1">${RECOVERY_QUESTIONS[0]}</label>
          <input type="text" id="recovery-answer-1" class="login-input" required>
          <span class="field-error" id="recovery-answer-1-error"></span>
        </div>
        <div class="form-group">
          <label for="recovery-answer-2">${RECOVERY_QUESTIONS[1]}</label>
          <input type="text" id="recovery-answer-2" class="login-input" required>
          <span class="field-error" id="recovery-answer-2-error"></span>
        </div>
        <button type="submit" class="login-button">Verify Answers</button>
      </form>
      <button type="button" class="forgot-password" id="back-to-login">← Back to Login</button>
    </div>
  `;

  document.getElementById('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const answer1 = document.getElementById('recovery-answer-1').value.trim();
    const answer2 = document.getElementById('recovery-answer-2').value.trim();

    if (!answer1 || !answer2) {
      document.getElementById('recovery-answer-1-error').textContent = answer1 ? '' : 'This field is required';
      document.getElementById('recovery-answer-2-error').textContent = answer2 ? '' : 'This field is required';
      return;
    }

    try {
      const result = await apiClient.verifySecurityQuestions(answer1, answer2);
      container.innerHTML = `
        <div class="recovery-panel recovery-result">
          <h3>Identity verified</h3>
          <p>Your temporary password:</p>
          <div class="recovery-code">${result.recovery_code}</div>
          <button type="button" class="login-button" id="copy-recovery-code">Copy to Clipboard</button>
          <p class="helper-text">Use this to log in. You will be asked to set a new password immediately after.</p>
          <button type="button" class="forgot-password" id="go-to-login">Go to Login</button>
        </div>
      `;

      document.getElementById('copy-recovery-code').addEventListener('click', async () => {
        await navigator.clipboard.writeText(result.recovery_code);
        const copyBtn = document.getElementById('copy-recovery-code');
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 2000);
      });

      document.getElementById('go-to-login').addEventListener('click', () => {
        container.hidden = true;
        container.innerHTML = '';
      });
    } catch (error) {
      document.getElementById('recovery-answer-1-error').textContent = 'One or more answers are incorrect. Please try again.';
      document.getElementById('recovery-answer-2-error').textContent = '';
    }
  });

  document.getElementById('back-to-login').addEventListener('click', () => {
    container.hidden = true;
    container.innerHTML = '';
  });
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
