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

let recoveryState = {
    username: '',
    selectedMethod: null,
    selectedQuestion: '',
    verificationToken: null,
    attemptCount: 0
};

let debounceTimer = null;

function initializeRecoveryPage() {
  const backLink = document.getElementById('back-to-login');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof ipcRenderer !== 'undefined') {
        ipcRenderer.send('open-homepage-window');
        window.close();
      } else {
        // In browser environment, redirect to landing page
        window.location.href = 'homepage.html';
      }
    });
  }

  showMethodSelection();
}

function showMethodSelection() {
  const methodsContainer = document.getElementById('recovery-methods');
  const formContainer = document.getElementById('recovery-form');

  recoveryState.selectedMethod = null;
  recoveryState.verificationToken = null;

  formContainer.classList.remove('visible');
  formContainer.innerHTML = '';

  methodsContainer.innerHTML = `
    <div class="recovery-method" id="method-code" data-method="code">
      <div class="recovery-method-number">1</div>
      <div class="recovery-method-content">
        <div class="recovery-method-title">Recovery Code</div>
        <p class="recovery-method-description">Enter your saved recovery code</p>
      </div>
    </div>
    <div class="recovery-method" id="method-email" data-method="email">
      <div class="recovery-method-number">2</div>
      <div class="recovery-method-content">
        <div class="recovery-method-title">Email Reset</div>
        <p class="recovery-method-description">Send a reset link to your email</p>
      </div>
    </div>
    <div class="recovery-method" id="method-question" data-method="question">
      <div class="recovery-method-number">3</div>
      <div class="recovery-method-content">
        <div class="recovery-method-title">Security Question</div>
        <p class="recovery-method-description">Answer your security question</p>
      </div>
    </div>
  `;

  // Add click handlers to method selection
  document.querySelectorAll('.recovery-method').forEach(method => {
    method.addEventListener('click', () => selectRecoveryMethod(method.dataset.method));
  });
}

function selectRecoveryMethod(method) {
  recoveryState.selectedMethod = method;

  document.querySelectorAll('.recovery-method').forEach((methodEl) => {
    const isActive = methodEl.dataset.method === method;
    methodEl.classList.toggle('active', isActive);
    methodEl.classList.toggle('inactive', !isActive);
  });

  showRecoveryForm(method);
}

function showRecoveryForm(method) {
  const formContainer = document.getElementById('recovery-form');
  formContainer.hidden = false;

  if (method === 'code') {
    showCodeRecoveryForm();
  } else if (method === 'email') {
    showEmailRecoveryForm();
  } else if (method === 'question') {
    showQuestionRecoveryForm();
  }

  setTimeout(() => {
    formContainer.classList.add('visible');
  }, 10);
}

function showCodeRecoveryForm() {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <div class="form-group">
      <label class="recovery-label" for="recovery-code">Recovery Code</label>
      <input 
        type="text" 
        id="recovery-code" 
        class="recovery-input monospace" 
        placeholder="Enter your recovery code"
        style="text-transform: uppercase;"
      />
      <span class="field-error" id="recovery-code-error"></span>
    </div>
    <button type="button" class="recovery-button" id="verify-code-button">Verify Code</button>
  `;

  document.getElementById('verify-code-button').addEventListener('click', verifyRecoveryCode);
  bindFieldErrorClearing(formContainer);
}

async function verifyRecoveryCode() {
  const code = document.getElementById('recovery-code').value.trim().toUpperCase();

  clearRecoveryErrors();

  if (!code) {
    showRecoveryFieldError('recovery-code', 'Recovery code is required');
    return;
  }

  const button = document.getElementById('verify-code-button');
  button.disabled = true;
  button.textContent = 'Verifying...';

  try {
    const response = await apiClient.recoverVerifyCode('', code);
    recoveryState.username = response.username || '';
    recoveryState.verificationToken = response.verification_token;
    showSetPasswordForm('code');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Verify Code';
    showRecoveryError(error.response?.data?.error || 'Invalid recovery code');
  }
}

function showEmailRecoveryForm() {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <div class="form-group">
      <label class="recovery-label" for="email-address">Email</label>
      <input 
        type="email" 
        id="email-address" 
        class="recovery-input" 
        placeholder="Enter your email address"
      />
      <span class="field-error" id="email-address-error"></span>
    </div>
    <button type="button" class="recovery-button" id="send-email-button">Send Reset Link</button>
  `;

  document.getElementById('send-email-button').addEventListener('click', sendEmailReset);
  bindFieldErrorClearing(formContainer);
}

async function sendEmailReset() {
  const email = document.getElementById('email-address').value.trim();

  clearRecoveryErrors();

  if (!email) {
    showRecoveryFieldError('email-address', 'Email is required');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showRecoveryFieldError('email-address', 'Please enter a valid email address');
    return;
  }

  const button = document.getElementById('send-email-button');
  button.disabled = true;
  button.textContent = 'Sending...';

  try {
    await apiClient.recoverSendEmail(email);
    recoveryState.username = email;
    showEmailSentConfirmation();
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Send Reset Link';
    showRecoveryError(error.response?.data?.error || 'Failed to send email');
  }
}

function showEmailSentConfirmation() {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <div style="text-align: center; padding: 12px 0;">
      <div class="success-checkmark">✓</div>
      <h3 class="success-title">Email Sent</h3>
      <p class="success-message">
        Check your email for a password reset link. The link expires in 30 minutes.
      </p>
      <button type="button" class="recovery-button secondary" id="back-methods-button">Choose Another Method</button>
    </div>
  `;

  document.getElementById('back-methods-button').addEventListener('click', showMethodSelection);
}

function showQuestionRecoveryForm() {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <div class="form-group">
      <label class="recovery-label" for="recovery-username">Username</label>
      <input 
        type="text" 
        id="recovery-username" 
        class="recovery-input" 
        placeholder="Enter your username"
      />
      <span class="field-error" id="recovery-username-error"></span>
    </div>
    <div class="form-group">
      <label class="recovery-label" for="question-select">Security Question</label>
      <select id="question-select" class="recovery-input">
        <option value="">Loading available questions...</option>
      </select>
      <span class="field-error" id="question-select-error"></span>
    </div>
    <div id="question-answer-section"></div>
  `;

  recoveryState.selectedQuestion = '';
  loadSecurityQuestions();

  // Reload security questions when username changes with debounce
  const usernameInput = document.getElementById('recovery-username');
  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        loadSecurityQuestions();
      }, 500);
    });
  }
}

async function loadSecurityQuestions() {
  const questionSelect = document.getElementById('question-select');
  const answerSection = document.getElementById('question-answer-section');
  const usernameInput = document.getElementById('recovery-username');

  if (!questionSelect || !answerSection) {
    return;
  }

  try {
    const username = usernameInput?.value.trim() || '';
    const response = await apiClient.getRecoveryQuestionText(username);
    const questions = Array.isArray(response.questions) ? response.questions : [];

    if (!questions.length) {
      questionSelect.innerHTML = '<option value="">No security questions available</option>';
      questionSelect.disabled = true;
      answerSection.innerHTML = '';
      return;
    }

    questionSelect.innerHTML = `
      <option value="">Select a question...</option>
      ${questions.map((question) => `<option value="${question}">${question}</option>`).join('')}
    `;
    questionSelect.disabled = false;
    questionSelect.onchange = () => {
      recoveryState.selectedQuestion = questionSelect.value;
      renderQuestionAnswerSection(questionSelect.value);
    };
    renderQuestionAnswerSection('');
  } catch (error) {
    questionSelect.innerHTML = '<option value="">Unable to load questions</option>';
    questionSelect.disabled = true;
    answerSection.innerHTML = `
      <div class="recovery-text error">Failed to load available security questions.</div>
    `;
  }
}

function renderQuestionAnswerSection(question) {
  const answerSection = document.getElementById('question-answer-section');
  if (!answerSection) {
    return;
  }

  if (!question) {
    answerSection.innerHTML = '';
    return;
  }

  answerSection.innerHTML = `
    <div class="form-group">
      <label class="recovery-label" for="security-answer">Your Answer</label>
      <input 
        type="text" 
        id="security-answer" 
        class="recovery-input" 
        placeholder="Enter your answer"
      />
      <span class="field-error" id="security-answer-error"></span>
    </div>
    <button type="button" class="recovery-button" id="verify-question-button">Submit Answer</button>
  `;

  document.getElementById('verify-question-button').addEventListener('click', verifySecurityQuestion);
  bindFieldErrorClearing(document.getElementById('recovery-form'));
}

async function verifySecurityQuestion() {
  const username = document.getElementById('recovery-username')?.value.trim();
  const question = document.getElementById('question-select')?.value.trim();
  const answer = document.getElementById('security-answer')?.value.trim();

  clearRecoveryErrors();

  if (!username) {
    showRecoveryFieldError('recovery-username', 'Username is required');
    return;
  }

  if (!question) {
    showRecoveryFieldError('question-select', 'Please select a security question');
    return;
  }

  if (!answer) {
    showRecoveryFieldError('security-answer', 'Answer is required');
    return;
  }

  const button = document.getElementById('verify-question-button');
  button.disabled = true;
  button.textContent = 'Submitting...';

  try {
    const response = await apiClient.recoverVerifyQuestion(username, question, answer);
    recoveryState.username = response.username || username;
    recoveryState.selectedQuestion = question;
    recoveryState.verificationToken = response.verification_token;
    showSetPasswordForm('question');
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Submit Answer';
    showRecoveryFieldError('security-answer', error.response?.data?.error || 'Incorrect answer');
  }
}

function showSetPasswordForm(method) {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <h3 style="margin-top: 0; font-size: 18px; font-weight: 600;">Set New Password</h3>
    <p style="font-size: 14px; color: #666666; margin: 0 0 20px; line-height: 1.5;">Enter a new password to regain access to your account.</p>
    <div class="recovery-text info">
      <strong>Password requirements:</strong><br />
      • At least 8 characters<br />
      • At least one number
    </div>
    <div class="form-group">
      <label class="recovery-label" for="new-password">New Password</label>
      <input 
        type="password" 
        id="new-password" 
        class="recovery-input" 
        placeholder="Enter new password"
      />
      <span class="field-error" id="new-password-error"></span>
    </div>
    <div class="form-group">
      <label class="recovery-label" for="confirm-password">Confirm Password</label>
      <input 
        type="password" 
        id="confirm-password" 
        class="recovery-input" 
        placeholder="Confirm new password"
      />
      <span class="field-error" id="confirm-password-error"></span>
    </div>
    <button type="button" class="recovery-button" id="set-password-button">Set New Password</button>
  `;

  document.getElementById('set-password-button').addEventListener('click', () => setNewPassword(method));
  bindFieldErrorClearing(formContainer);
  attachRecoveryPasswordToggles(formContainer);
}

async function setNewPassword(method) {
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  clearRecoveryErrors();

  if (!newPassword) {
    showRecoveryFieldError('new-password', 'Password is required');
    return;
  }

  if (newPassword.length < 8) {
    showRecoveryFieldError('new-password', 'Password must be at least 8 characters');
    return;
  }

  if (!/\d/.test(newPassword)) {
    showRecoveryFieldError('new-password', 'Password must include at least one number');
    return;
  }

  if (newPassword !== confirmPassword) {
    showRecoveryFieldError('confirm-password', 'Passwords do not match');
    return;
  }

  const button = document.getElementById('set-password-button');
  button.disabled = true;
  button.textContent = 'Setting Password...';

  try {
    const response = await apiClient.recoverSetPassword(recoveryState.username, newPassword, method, recoveryState.verificationToken);
    AppState.setAuthToken(response.access);
    apiClient.token = response.access;
    AppState.setUserRole(response.user.role);
    AppState.setUsername(response.user.username);

    // Check if user has security question set
    try {
      const recoverySettings = await apiClient.getRecoverySettings();
      if (!recoverySettings.has_security_question) {
        showPostResetSecurityQuestionPrompt(response.recovery_code);
        return;
      }
    } catch (e) {
      // If we can't check, proceed
    }

    if (response.recovery_code) {
      showRecoveryCodeAfterReset(response.recovery_code);
    } else {
      redirectToApp();
    }
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Set New Password';
    showRecoveryError(error.response?.data?.error || 'Failed to set password');
  }
}

function showPostResetSecurityQuestionPrompt(recoveryCode) {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <h3 style="margin-top: 0; font-size: 18px; font-weight: 600;">Set a Security Question</h3>
    <p style="font-size: 14px; color: #9ca3af; margin: 0 0 20px; line-height: 1.5;">
      We recommend setting a security question for account recovery in the future. This is optional but recommended.
    </p>
    <div class="form-group">
      <label class="recovery-label" for="post-reset-question">Security Question</label>
      <select id="post-reset-question" class="recovery-input" required>
        <option value="">Select a question...</option>
        ${RECOVERY_QUESTIONS.map(q => `<option value="${q}">${q}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="recovery-label" for="post-reset-answer">Your Answer</label>
      <input type="text" id="post-reset-answer" class="recovery-input" placeholder="Your answer" required>
    </div>
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button type="button" class="recovery-button secondary" id="skip-security-question-btn">Skip for now</button>
      <button type="button" class="recovery-button" id="save-security-question-btn">Save & Continue</button>
    </div>
  `;

  document.getElementById('skip-security-question-btn').addEventListener('click', () => {
    if (recoveryCode) {
      showRecoveryCodeAfterReset(recoveryCode);
    } else {
      redirectToApp();
    }
  });

  document.getElementById('save-security-question-btn').addEventListener('click', async () => {
    const question = document.getElementById('post-reset-question').value;
    const answer = document.getElementById('post-reset-answer').value.trim();
    const saveBtn = document.getElementById('save-security-question-btn');

    if (!question) {
      alert('Please select a security question');
      return;
    }

    if (!answer) {
      alert('Please provide an answer');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      await apiClient.updateRecoverySettings(null, question, answer);
      if (recoveryCode) {
        showRecoveryCodeAfterReset(recoveryCode);
      } else {
        redirectToApp();
      }
    } catch (error) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Continue';
      alert('Failed to save security question: ' + (error.response?.data?.error || error.message));
    }
  });
}

function showRecoveryCodeAfterReset(code) {
  const formContainer = document.getElementById('recovery-form');
  formContainer.innerHTML = `
    <div style="text-align: center; padding: 12px 0;">
      <div class="success-checkmark">✓</div>
      <h3 class="success-title">Password Reset Successfully</h3>
      <p class="success-message">
        A new recovery code has been generated.
      </p>
      <div class="recovery-code-display">
        <span class="recovery-code-label">New Recovery Code</span>
        <div class="recovery-code-value" id="recovery-code-display">${code}</div>
        <button type="button" class="copy-button" id="copy-code-button">Copy</button>
      </div>
      <p style="font-size: 13px; color: #666666; margin: 20px 0; line-height: 1.5;">
        Save this code somewhere safe. It can only be used once.
      </p>
      <div class="confirmation-checkbox">
        <input type="checkbox" id="saved-code-checkbox" />
        <label for="saved-code-checkbox">I have saved my recovery code</label>
      </div>
      <button type="button" class="recovery-button" id="proceed-button" disabled>Proceed to RMS</button>
    </div>
  `;

  document.getElementById('copy-code-button').addEventListener('click', () => {
    const code = document.getElementById('recovery-code-display').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('copy-code-button');
      btn.textContent = 'Copied ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  });

  document.getElementById('saved-code-checkbox').addEventListener('change', (e) => {
    document.getElementById('proceed-button').disabled = !e.target.checked;
  });

  document.getElementById('proceed-button').addEventListener('click', redirectToApp);
  formContainer.hidden = false;
  setTimeout(() => {
    formContainer.classList.add('visible');
  }, 10);
}

function createPasswordToggleForInput(input) {
  if (!input || input.dataset.passwordToggleAttached === 'true') {
    return;
  }

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

  toggle.addEventListener('click', () => {
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
  });

  input.dataset.passwordToggleAttached = 'true';
}

function attachRecoveryPasswordToggles(container) {
  if (!container) return;
  container.querySelectorAll('input[type="password"]').forEach(createPasswordToggleForInput);
}

function redirectToApp() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('recovery-success', {
      token: AppState.getAuthToken(),
      role: AppState.getUserRole(),
      username: AppState.getUsername()
    });
  } else {
    // In browser environment, navigate to main app page using relative path
    window.location.href = 'main.html';
  }
}

function bindRecoveryInput(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  input.addEventListener('input', () => {
    input.classList.remove('error');
    const errorSpan = document.getElementById(`${fieldId}-error`);
    if (errorSpan) {
      errorSpan.textContent = '';
    }
  });
}

function showRecoveryFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorSpan = document.getElementById(`${fieldId}-error`);

  if (input && errorSpan) {
    input.classList.add('error');
    errorSpan.textContent = message;
  }
}

function bindFieldErrorClearing(container) {
  container.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('error');
      const errorSpan = document.getElementById(`${input.id}-error`);
      if (errorSpan) {
        errorSpan.textContent = '';
      }
      document.querySelectorAll('.recovery-inline-error').forEach((errorEl) => errorEl.remove());
    });
  });
}

function showRecoveryError(message) {
  const formContainer = document.getElementById('recovery-form');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'recovery-inline-error';
  errorDiv.textContent = message;
  formContainer.prepend(errorDiv);
}

function clearRecoveryErrors() {
  document.querySelectorAll('.recovery-input').forEach(input => {
    input.classList.remove('error');
  });

  document.querySelectorAll('.field-error').forEach(error => {
    error.textContent = '';
  });

  document.querySelectorAll('.recovery-inline-error').forEach(error => {
    error.remove();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeRecoveryPage);
} else {
  initializeRecoveryPage();
}
