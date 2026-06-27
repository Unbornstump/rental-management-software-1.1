const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let loginWindow;
let mainWindow;

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 380,
    height: 220,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    title: 'RMS Login'
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
  createLoginWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLoginWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.on('login-success', (event, token) => {
  if (loginWindow) {
    loginWindow.close();
  }
  createMainWindow(token);
});

ipcMain.on('logout', () => {
  if (mainWindow) {
    mainWindow.close();
  }
  createLoginWindow();
});
