const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let homepageWindow;
let loginWindow;
let mainWindow;

function createHomepageWindow() {
  homepageWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'RMS - Rental Management System'
  });

  homepageWindow.loadFile('homepage.html');
  
  homepageWindow.on('closed', () => {
    homepageWindow = null;
  });
}

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 380,
    height: 220,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    title: 'RMS Login',
    parent: homepageWindow,
    modal: true
  });

  loginWindow.loadFile('login.html');
  
  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

function createMainWindow(token) {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 660,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'RMS Dashboard'
  });

  mainWindow.loadFile('main.html');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (loginWindow) {
      loginWindow.close();
    }
  });

  // Send token to main window
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('auth-token', token);
  });
}

app.whenReady().then(() => {
  createHomepageWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createHomepageWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.on('open-login-window', () => {
  if (!loginWindow) {
    createLoginWindow();
  }
});

ipcMain.on('login-success', (event, token) => {
  if (loginWindow) {
    loginWindow.close();
  }
  if (homepageWindow) {
    homepageWindow.close();
  }
  createMainWindow(token);
});

ipcMain.on('logout', () => {
  if (mainWindow) {
    mainWindow.close();
  }
  if (!homepageWindow) {
    createHomepageWindow();
  }
});
