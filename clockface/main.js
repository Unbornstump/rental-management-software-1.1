const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}

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
    title: 'Rental Management System'
  });

  homepageWindow.maximize();
  homepageWindow.loadFile('homepage.html');
  
  homepageWindow.on('closed', () => {
    homepageWindow = null;
  });
}

function createLoginWindow() {
  const LOGIN_WIDTH = 500;
  const LOGIN_HEIGHT = 740;

  // Standalone window — parent/modal child windows on Windows ignore
  // BrowserWindow width/height and size to native dialog defaults instead.
  loginWindow = new BrowserWindow({
    width: LOGIN_WIDTH,
    height: LOGIN_HEIGHT,
    minWidth: LOGIN_WIDTH,
    minHeight: LOGIN_HEIGHT,
    maxWidth: LOGIN_WIDTH,
    maxHeight: LOGIN_HEIGHT,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    resizable: false,
    center: true,
    show: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    title: 'Login'
  });

  loginWindow.maximize();
  loginWindow.setMenuBarVisibility(false);
  loginWindow.loadFile('login.html');

  loginWindow.once('ready-to-show', () => {
    loginWindow.show();
    if (homepageWindow) {
      homepageWindow.setEnabled(false);
    }
  });

  loginWindow.on('closed', () => {
    loginWindow = null;
    if (homepageWindow) {
      homepageWindow.setEnabled(true);
    }
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

  mainWindow.maximize();
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
  if (loginWindow) {
    loginWindow.close();
  }
  createLoginWindow();
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
