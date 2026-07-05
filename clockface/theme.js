(function () {
  const storageKey = 'theme';
  let currentTheme = 'dark';
  let currentResolvedTheme = 'dark';
  let mediaQuery = null;

  function isValidTheme(theme) {
    return theme === 'light' || theme === 'dark' || theme === 'system';
  }

  function getStoredTheme() {
    try {
      const storedTheme = localStorage.getItem(storageKey);
      return isValidTheme(storedTheme) ? storedTheme : 'dark';
    } catch (error) {
      return 'dark';
    }
  }

  function resolveTheme(theme) {
    if (theme !== 'system') {
      return theme;
    }

    if (mediaQuery && typeof mediaQuery.matches === 'boolean') {
      return mediaQuery.matches ? 'dark' : 'light';
    }

    return 'dark';
  }

  function updateToggleButtons(theme) {
    document.querySelectorAll('.theme-toggle-btn').forEach((button) => {
      const isActive = button.dataset.theme === theme;
      button.classList.toggle('active', isActive);
    });
  }

  function applyTheme(theme, persist = true) {
    const normalizedTheme = isValidTheme(theme) ? theme : 'system';
    const resolvedTheme = resolveTheme(normalizedTheme);

    currentTheme = normalizedTheme;
    currentResolvedTheme = resolvedTheme;

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-theme-preference', normalizedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
    document.documentElement.style.backgroundColor = resolvedTheme === 'dark' ? '#0f1115' : '#fafafa';
    document.documentElement.style.color = resolvedTheme === 'dark' ? '#f5f7fa' : '#1a1a1a';
    document.documentElement.classList.toggle('theme-dark', resolvedTheme === 'dark');
    document.documentElement.classList.toggle('theme-light', resolvedTheme === 'light');

    if (document.body) {
      document.body.setAttribute('data-theme', resolvedTheme);
      document.body.style.backgroundColor = resolvedTheme === 'dark' ? '#0f1115' : '#fafafa';
      document.body.style.color = resolvedTheme === 'dark' ? '#f5f7fa' : '#1a1a1a';
      document.body.classList.toggle('theme-dark', resolvedTheme === 'dark');
      document.body.classList.toggle('theme-light', resolvedTheme === 'light');
    }

    if (persist) {
      try {
        localStorage.setItem(storageKey, normalizedTheme);
      } catch (error) {
        // Ignore storage failures.
      }
    }

    updateToggleButtons(normalizedTheme);
  }

  function handleSystemThemeChange() {
    if (currentTheme === 'system') {
      applyTheme('system', false);
    }
  }

  function initTheme() {
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }

    applyTheme(getStoredTheme(), false);
  }

  window.RMSTheme = {
    applyTheme,
    initTheme,
    getTheme: () => currentTheme,
    getResolvedTheme: () => currentResolvedTheme,
    setTheme: (theme) => applyTheme(theme, true)
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme, { once: true });
  } else {
    initTheme();
  }
})();
