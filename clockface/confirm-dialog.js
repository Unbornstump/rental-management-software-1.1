// Reusable in-app confirm dialog (replaces native window.confirm)

const ConfirmDialog = {
  show({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-dialog-overlay';
      overlay.setAttribute('role', 'presentation');

      const confirmClass = confirmVariant === 'danger' ? 'action-button danger-btn' : 'action-button primary-btn';

      overlay.innerHTML = `
        <div class="confirm-dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <h3 class="confirm-dialog-title" id="confirm-dialog-title">${SharedComponents.escapeHtml(title)}</h3>
          <p class="confirm-dialog-message">${SharedComponents.escapeHtml(message)}</p>
          <div class="confirm-dialog-actions">
            <button type="button" class="action-button secondary-btn" data-action="cancel">${SharedComponents.escapeHtml(cancelText)}</button>
            <button type="button" class="${confirmClass}" data-action="confirm">${SharedComponents.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      const close = (result) => {
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 200);
        document.removeEventListener('keydown', onKeyDown);
        resolve(result);
      };

      const onKeyDown = (e) => {
        if (e.key === 'Escape') close(false);
      };

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));

      document.body.appendChild(overlay);
      document.addEventListener('keydown', onKeyDown);
      requestAnimationFrame(() => overlay.classList.add('visible'));
      overlay.querySelector('[data-action="confirm"]').focus();
    });
  },
};
