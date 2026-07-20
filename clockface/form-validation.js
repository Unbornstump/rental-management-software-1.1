// Custom in-app form validation (replaces native browser tooltips)

const FormValidation = {
  ensureErrorElement(formGroup) {
    let errorEl = formGroup.querySelector('.field-validation-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-validation-error';
      errorEl.setAttribute('role', 'alert');
      formGroup.appendChild(errorEl);
    }
    return errorEl;
  },

  showFieldError(input, message) {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;
    const errorEl = this.ensureErrorElement(formGroup);
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    input.classList.add('input-invalid');
    input.classList.remove('input-valid');
    input.setAttribute('aria-invalid', 'true');
  },

  clearFieldError(input) {
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;
    const errorEl = formGroup.querySelector('.field-validation-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    input.classList.remove('input-invalid');
    input.removeAttribute('aria-invalid');
  },

  markFieldValid(input) {
    this.clearFieldError(input);
    input.classList.add('input-valid');
  },

  attachForm(form, fieldRules = {}) {
    if (!form) return;
    form.setAttribute('novalidate', 'novalidate');

    Object.entries(fieldRules).forEach(([fieldId, rule]) => {
      const input = form.querySelector(`#${fieldId}`);
      if (!input) return;

      const validate = () => {
        const value = input.type === 'checkbox' ? input.checked : input.value;
        const result = rule.validate(value, input, form);
        if (result === true) {
          if (rule.markValidOnPass) this.markFieldValid(input);
          else this.clearFieldError(input);
          return true;
        }
        if (result === null) {
          this.clearFieldError(input);
          input.classList.remove('input-valid');
          return null;
        }
        this.showFieldError(input, result || rule.message);
        return false;
      };

      input.addEventListener('input', validate);
      input.addEventListener('change', validate);
      input.addEventListener('blur', validate);
      input._customValidate = validate;
    });

    form._validateAll = () => {
      let firstInvalid = null;
      let allValid = true;
      Object.keys(fieldRules).forEach(fieldId => {
        const input = form.querySelector(`#${fieldId}`);
        if (!input || !input._customValidate) return;
        const result = input._customValidate();
        if (result === false) {
          allValid = false;
          if (!firstInvalid) firstInvalid = input;
        }
      });
      if (firstInvalid) firstInvalid.focus();
      return allValid;
    };
  },

  validateForm(form) {
    if (form && typeof form._validateAll === 'function') {
      return form._validateAll();
    }
    return true;
  },
};

const PhoneValidation = {
  normalize(raw) {
    return String(raw || '').replace(/[\s\-().+]/g, '');
  },

  hasInvalidChars(raw) {
    return /[^\d\s\-().+]/.test(String(raw || ''));
  },

  isValidKenyanNumber(raw) {
    const digits = this.normalize(raw);
    if (!digits) return false;
    if (/^0[17]\d{8}$/.test(digits)) return true;
    if (/^254[17]\d{8}$/.test(digits)) return true;
    if (/^[17]\d{8}$/.test(digits)) return true;
    return false;
  },

  getState(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return 'empty';
    if (this.hasInvalidChars(trimmed)) return 'invalid';
    const digits = this.normalize(trimmed);
    if (this.isValidKenyanNumber(trimmed)) return 'valid';
    if (digits.length > 12) return 'invalid';
    return 'typing';
  },

  attachLiveValidation(input) {
    if (!input) return;

    const wrapper = input.closest('.form-group');
    const indicator = document.createElement('span');
    indicator.className = 'phone-valid-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.textContent = '✓';
    input.parentElement?.classList.add('phone-input-wrapper');
    if (input.parentElement && !input.parentElement.querySelector('.phone-valid-indicator')) {
      input.parentElement.appendChild(indicator);
    }

    const sync = () => {
      const state = this.getState(input.value);
      input.classList.remove('input-valid', 'input-warning', 'input-invalid');

      const errorEl = wrapper?.querySelector('.field-validation-error');
      if (errorEl) {
        errorEl.style.display = 'none';
        errorEl.textContent = '';
      }

      if (state === 'valid') {
        input.classList.add('input-valid');
        indicator.style.display = 'block';
      } else if (state === 'invalid') {
        input.classList.add('input-invalid');
        indicator.style.display = 'none';
        if (wrapper) {
          const el = FormValidation.ensureErrorElement(wrapper);
          el.textContent = "That doesn't look like a valid phone number.";
          el.style.display = 'block';
        }
      } else {
        indicator.style.display = 'none';
      }
    };

    input.addEventListener('input', sync);
    input.addEventListener('blur', sync);
    sync();
  },
};
