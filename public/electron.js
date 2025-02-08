const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, dialog, screen } = require('electron');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const log = require('electron-log');
const fs = require('fs');
const activeWin = require('active-win');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

let mainWindow;
let tray;
let isQuitting = false;

let qaList = [];
let settings = {
    backgroundColor: 'rgba(128, 128, 128, 0.5)',
    lastUsedApp: '',
    font: 'Arial',
    fontSize: '16px',
    fontColor: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    shortcuts: {
        toggleApp: 'Shift+Space',
        newQuestion: 'Shift+N',
        exportData: 'Ctrl+Shift+E',
        importData: 'Ctrl+Shift+I'
    }
};

const dataFilePath = path.join(app.getPath('userData'), 'qa-data.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            qaList = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
        }
        if (fs.existsSync(settingsFilePath)) {
            settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8')) };
        }
    } catch (error) {
        log.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(qaList), 'utf-8');
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings), 'utf-8');
    } catch (error) {
        log.error('Error saving data:', error);
    }
}

function createWindow() {
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
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

function createTray() {
    tray = new Tray(path.join(__dirname, 'tray-icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('QA Panel');
    tray.setContextMenu(contextMenu);
}

function unregisterAllShortcuts() {
    globalShortcut.unregisterAll();
}

function setupGlobalShortcuts() {
    log.info('Setting up global shortcuts...');
    try {
        // First unregister all existing shortcuts
        unregisterAllShortcuts();

        // Register new shortcuts
        globalShortcut.register(settings.shortcuts.toggleApp, () => {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                updateLastUsedApp();
                mainWindow.show();
            }
        });

        globalShortcut.register(settings.shortcuts.newQuestion, () => {
            mainWindow.show();
            mainWindow.webContents.send('focus-new-question');
        });

        globalShortcut.register(settings.shortcuts.exportData, () => {
            mainWindow.webContents.send('export-data');
        });

        globalShortcut.register(settings.shortcuts.importData, () => {
            mainWindow.webContents.send('import-data');
        });

        log.info('Global shortcuts set up successfully');
    } catch (error) {
        log.error('Error setting up global shortcuts:', error);
    }
}

async function updateLastUsedApp() {
    try {
        const activeWindow = await activeWin();
        if (activeWindow && activeWindow.owner.name !== app.getName() && activeWindow.owner.name !== 'Electron') {
            if (settings.lastUsedApp !== activeWindow.owner.name) {
                settings.lastUsedApp = activeWindow.owner.name;
                mainWindow.webContents.send('update-last-used-app', settings.lastUsedApp);
                saveData();
            }
        }
    } catch (error) {
        log.error('Error getting active window:', error);
    }
}

app.on('ready', () => {
    loadData();
    createWindow();
    createTray();
    setupGlobalShortcuts();
    setInterval(updateLastUsedApp, 1000);
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

app.on('will-quit', () => {
    unregisterAllShortcuts();
});

ipcMain.handle('get-questions', () => {
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
});

ipcMain.handle('add-question', (event, question, answer) => {
    qaList.push({ id: Date.now(), question, answer, app: settings.lastUsedApp });
    saveData();
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
});

ipcMain.handle('update-question', (event, id, question, answer) => {
    const index = qaList.findIndex(q => q.id === id);
    if (index !== -1) {
        qaList[index] = { ...qaList[index], question, answer };
        saveData();
    }
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
});

ipcMain.handle('delete-question', (event, id) => {
    qaList = qaList.filter(q => q.id !== id);
    saveData();
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
});

ipcMain.handle('get-settings', () => {
    return settings;
});

ipcMain.handle('update-settings', (event, newSettings) => {
    settings = { ...settings, ...newSettings };
    saveData();
    setupGlobalShortcuts(); // Re-register shortcuts with new values
    return settings;
});

ipcMain.handle('get-last-used-app', () => {
    return settings.lastUsedApp;
});

ipcMain.handle('export-data', (event, filePath) => {
    const data = JSON.stringify({ qaList, settings }, null, 2);
    fs.writeFileSync(filePath, data, 'utf-8');
});

ipcMain.handle('import-data', (event, filePath) => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    qaList = data.qaList || [];
    settings = { ...settings, ...data.settings };
    saveData();
    setupGlobalShortcuts(); // Re-register shortcuts after import
    return { qaList, settings };
});

ipcMain.handle('show-save-dialog', (event, options) => {
    return dialog.showSaveDialog(options);
});

ipcMain.handle('show-open-dialog', (event, options) => {
    return dialog.showOpenDialog(options);
});
