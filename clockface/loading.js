const { ipcRenderer } = require('electron');

const loadingStages = [
  { percentage: 20, label: 'Authenticated' },
  { percentage: 40, label: 'Setting up your workspace...' },
  { percentage: 70, label: 'Loading your properties...' },
  { percentage: 90, label: 'Almost there...' },
  { percentage: 100, label: 'Welcome' },
];

let failedStage = 0;
let isRunning = false;
let authToken = null;

ipcRenderer.on('auth-token', (event, token) => {
  authToken = token;
  apiClient.token = token;
  startLoading();
});

document.getElementById('loading-retry-btn').addEventListener('click', () => {
  hideError();
  startLoading();
});

document.getElementById('loading-logout-btn').addEventListener('click', () => {
  ipcRenderer.send('logout');
});

function waitForPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

async function startLoading() {
  if (isRunning) return;
  isRunning = true;
  hideError();
  updateProgress(0, 'Initializing...');

  const startFrom = failedStage > 0 ? failedStage : 1;

  try {
    if (startFrom <= 1) {
      await runStage(1, async () => {
        await waitForPaint();
      });
    }

    if (startFrom <= 2) {
      await runStage(2, async () => {
        await waitForPaint();
      });
    }

    if (startFrom <= 3) {
      await runStage(3, async () => {
        await apiClient.getProperties();
      });
    }

    if (startFrom <= 4) {
      await runStage(4, async () => {
        await waitForPaint();
      });
    }

    if (startFrom <= 5) {
      await runStage(5, async () => {
        await waitForPaint();
      });
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    completeLoading();
  } catch (error) {
    console.error('Loading failed:', error);
    showError();
  } finally {
    isRunning = false;
  }
}

async function runStage(stageIndex, fn) {
  const stage = loadingStages[stageIndex - 1];
  failedStage = stageIndex;
  updateProgress(stage.percentage, stage.label);
  await fn();
}

function updateProgress(percentage, label) {
  document.getElementById('progress-bar').style.width = `${percentage}%`;
  document.getElementById('progress-percentage').textContent = `${percentage}%`;
  document.getElementById('progress-stage').textContent = label;
}

function showError() {
  document.querySelector('.loading-content').style.display = 'none';
  document.getElementById('error-state').style.display = 'flex';
}

function hideError() {
  document.querySelector('.loading-content').style.display = 'flex';
  document.getElementById('error-state').style.display = 'none';
}

function completeLoading() {
  const loadingContainer = document.querySelector('.loading-container');
  loadingContainer.classList.add('fade-out');
  setTimeout(() => {
    ipcRenderer.send('loading-complete', authToken);
  }, 300);
}
