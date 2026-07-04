const { ipcRenderer } = require('electron');

ipcRenderer.on('auth-token', (event, token) => {
  AppState.setAuthToken(token);
  apiClient.token = token;
  WorkspaceLoading.run();
});

document.querySelectorAll('.nav-button').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;

    if (action === 'back-to-properties') {
      PageLoaders.loadPage('back-to-properties');
      return;
    }

    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    const page = button.dataset.page;
    PageLoaders.loadPage(page);
  });
});
