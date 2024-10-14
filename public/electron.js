const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, dialog, nativeImage, screen } = require('electron');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const log = require('electron-log');
const fs = require('fs');
const activeWin = require('active-win');

console.log('Starting Electron application...');

let mainWindow;
let tray;
let isQuitting = false;

// Store questions and answers
let qaList = [];

// Store settings
let settings = {
  backgroundColor: 'rgba(128, 128, 128, 0.5)', // Default gray with 50% opacity
  lastUsedApp: '',
  font: 'Arial',
  fontSize: '16px',
  fontColor: '#ffffff',
  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
  shortcuts: {
    toggleApp: 'CommandOrControl+Shift+Space',
    newQuestion: 'CommandOrControl+Shift+N',
    exportData: 'CommandOrControl+Shift+E',
    importData: 'CommandOrControl+Shift+I',
    deleteQuestion: 'CommandOrControl+Shift+D'
  }
};

// File paths for persistent storage
const dataFilePath = path.join(app.getPath('userData'), 'qa-data.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

console.log('Data file path:', dataFilePath);
console.log('Settings file path:', settingsFilePath);

// Load data from file
function loadData() {
  console.log('Loading data...');
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      qaList = JSON.parse(data);
      console.log('Data loaded successfully');
    } else {
      console.log('No existing data file found');
    }
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8');
      settings = { ...settings, ...JSON.parse(data) };
      console.log('Settings loaded successfully');
    } else {
      console.log('No existing settings file found');
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to file
function saveData() {
  console.log('Saving data...');
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(qaList), 'utf-8');
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings), 'utf-8');
    console.log('Data and settings saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

function createWindow() {
  console.log('Creating window...');
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow = new BrowserWindow({
      width: width,
      height: height,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      show: false,
      frame: false,
      transparent: true,
      icon: path.join(__dirname, 'app-icon.png')
    });

    const startUrl = url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    });

    console.log('Loading URL:', startUrl);
    mainWindow.loadURL(startUrl)
      .then(() => {
        console.log('URL loaded successfully');
      })
      .catch(error => {
        console.error('Failed to load URL:', error);
        dialog.showErrorBox('Application Error', `Failed to load the application. Error: ${error.message}`);
      });

    if (isDev) {
      console.log('Opening DevTools');
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow.show();
    });

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        console.log('Preventing window close');
        event.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.on('closed', () => {
      console.log('Window closed');
      mainWindow = null;
    });

    console.log('Window created successfully');
    return mainWindow;
  } catch (error) {
    console.error('Error creating window:', error);
    dialog.showErrorBox('Application Error', `Failed to create the application window. Error: ${error.message}`);
    app.quit();
  }
}

function createTray() {
  console.log('Creating tray...');
  tray = new Tray(path.join(__dirname, 'tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('QA Panel');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
  console.log('Tray created successfully');
}

function setupGlobalShortcuts() {
  console.log('Setting up global shortcuts...');
  Object.entries(settings.shortcuts).forEach(([action, shortcut]) => {
    globalShortcut.register(shortcut, () => {
      switch (action) {
        case 'toggleApp':
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            updateLastUsedApp();
            mainWindow.show();
          }
          break;
        case 'newQuestion':
          mainWindow.webContents.send('focus-new-question');
          break;
        case 'exportData':
          mainWindow.webContents.send('export-data');
          break;
        case 'importData':
          mainWindow.webContents.send('import-data');
          break;
        case 'deleteQuestion':
          mainWindow.webContents.send('delete-question');
          break;
      }
    });
  });
  console.log('Global shortcuts set up successfully');
}

async function updateLastUsedApp() {
  try {
    const activeWindow = await activeWin();
    if (activeWindow && activeWindow.owner.name !== app.getName()) {
      settings.lastUsedApp = activeWindow.owner.name;
      saveData();
      mainWindow.webContents.send('update-last-used-app', settings.lastUsedApp);
    }
  } catch (error) {
    console.error('Error getting active window:', error);
  }
}

app.on('ready', async () => {
  console.log('App is ready');
  try {
    loadData();
    mainWindow = createWindow();
    createTray();
    setupGlobalShortcuts();
    updateLastUsedApp();
    setupIpcHandlers();
  } catch (error) {
    console.error('Error in app ready handler:', error);
    dialog.showErrorBox('Application Error', 'Failed to initialize the application. Please restart.');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

function setupIpcHandlers() {
  // IPC handlers
  ipcMain.handle('add-question', async (event, question, answer) => {
    console.log('Adding question:', question);
    qaList.push({ id: Date.now(), question, answer, app: settings.lastUsedApp });
    saveData();
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
  });

  ipcMain.handle('get-questions', () => {
    console.log('Getting questions');
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
  });

  ipcMain.handle('update-question', (event, id, question, answer) => {
    console.log('Updating question:', id);
    const index = qaList.findIndex(qa => qa.id === id);
    if (index !== -1) {
      qaList[index] = { ...qaList[index], question, answer };
      saveData();
    }
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
  });

  ipcMain.handle('delete-question', (event, id) => {
    console.log('Deleting question:', id);
    qaList = qaList.filter(qa => qa.id !== id);
    saveData();
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
  });

  ipcMain.handle('get-settings', () => {
    console.log('Getting settings');
    return settings;
  });

  ipcMain.handle('update-settings', (event, newSettings) => {
    console.log('Updating settings:', newSettings);
    settings = { ...settings, ...newSettings };
    saveData();
    setupGlobalShortcuts(); // Refresh shortcuts when settings are updated
    return settings;
  });

  ipcMain.handle('get-last-used-app', () => {
    return settings.lastUsedApp;
  });

  ipcMain.handle('export-data', async (event) => {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export QA Data',
      defaultPath: path.join(app.getPath('documents'), 'qa-data-export.json'),
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePath) {
      try {
        const exportData = { qaList, settings };
        fs.writeFileSync(filePath, JSON.stringify(exportData), 'utf-8');
        return { success: true, message: 'Data exported successfully' };
      } catch (error) {
        console.error('Error exporting data:', error);
        return { success: false, message: 'Failed to export data' };
      }
    }
    return { success: false, message: 'Export cancelled' };
  });

  ipcMain.handle('import-data', async (event) => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import QA Data',
      properties: ['openFile'],
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (filePaths && filePaths.length > 0) {
      try {
        const data = fs.readFileSync(filePaths[0], 'utf-8');
        const importedData = JSON.parse(data);
        qaList = importedData.qaList || [];
        settings = { ...settings, ...importedData.settings };
        saveData();
        setupGlobalShortcuts(); // Refresh shortcuts after import
        return { success: true, message: 'Data imported successfully' };
      } catch (error) {
        console.error('Error importing data:', error);
        return { success: false, message: 'Failed to import data' };
      }
    }
    return { success: false, message: 'Import cancelled' };
  });
}

console.log('Electron script loaded successfully');
