const { ipcRenderer } = require('electron');

// Loading stages configuration
const loadingStages = [
  { percentage: 20, label: 'Authenticated' },
  { percentage: 40, label: 'Setting up your workspace...' },
  { percentage: 70, label: 'Loading your properties...' },
  { percentage: 90, label: 'Almost there...' },
  { percentage: 100, label: 'Welcome' }
];

let currentStage = 0;
let isLoading = true;

// Start loading process when page loads
document.addEventListener('DOMContentLoaded', () => {
  startLoading();
});

// Setup error state buttons
document.getElementById('try-again-btn').addEventListener('click', () => {
  hideError();
  startLoading();
});

document.getElementById('log-out-btn').addEventListener('click', () => {
  ipcRenderer.send('logout-request');
});

async function startLoading() {
  isLoading = true;
  currentStage = 0;
  updateProgress(0, 'Initializing...');
  
  try {
    // Stage 1: Login accepted (20%)
    await simulateStage(1, 'Authenticated');
    
    // Stage 2: Session established (40%)
    await simulateStage(2, 'Setting up your workspace...');
    
    // Stage 3: Fetching properties (70%) - Real API call
    await simulateStage(3, 'Loading your properties...');
    await fetchProperties();
    
    // Stage 4: Data ready (90%)
    await simulateStage(4, 'Almost there...');
    
    // Stage 5: Render complete (100%)
    await simulateStage(5, 'Welcome');
    
    // Loading complete - wait 300ms then transition
    setTimeout(() => {
      completeLoading();
    }, 300);
    
  } catch (error) {
    showError();
  }
}

async function simulateStage(stageIndex, label) {
  const stage = loadingStages[stageIndex - 1];
  currentStage = stageIndex;
  updateProgress(stage.percentage, label);
  
  // Small delay to allow UI to update
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function fetchProperties() {
  // Real API call to fetch properties
  try {
    await apiClient.getProperties();
  } catch (error) {
    console.error('Error fetching properties:', error);
    // Don't throw here - let the loading continue even if fetch fails
    // The error will be handled when trying to load the actual app
  }
}

function updateProgress(percentage, label) {
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const progressStage = document.getElementById('progress-stage');
  
  progressBar.style.width = `${percentage}%`;
  progressPercentage.textContent = `${percentage}%`;
  progressStage.textContent = label;
}

function showError() {
  isLoading = false;
  const progressContainer = document.querySelector('.progress-container');
  const errorState = document.getElementById('error-state');
  
  progressContainer.style.display = 'none';
  errorState.style.display = 'flex';
}

function hideError() {
  const progressContainer = document.querySelector('.progress-container');
  const errorState = document.getElementById('error-state');
  
  progressContainer.style.display = 'block';
  errorState.style.display = 'none';
}

function completeLoading() {
  isLoading = false;
  const loadingContainer = document.querySelector('.loading-container');
  
  // Fade out loading screen
  loadingContainer.classList.add('fade-out');
  
  // Notify main process to show main app
  setTimeout(() => {
    ipcRenderer.send('loading-complete');
  }, 300);
}
