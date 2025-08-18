const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, dialog, screen, desktopCapturer, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const isDev = require('electron-is-dev');
const log = require('electron-log');
const fs = require('fs');
const activeWin = require('active-win');
const fetch = require('node-fetch');

log.transports.file.level = 'info';
log.transports.console.level = 'info';

const OLLAMA_API = 'http://127.0.0.1:11434/api';

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
    },
    ai: {
        // General provider and connection
        provider: 'ollama',
        baseUrl: 'http://127.0.0.1:11434',
        // Behavior and defaults
        enabled: false,
        autoAnswer: false,
        requireManual: true,
        temperature: 0.7,
        streamResponse: true,
        // Models
        model: 'llama2',
        visionModel: 'llava:latest',
        useVision: false,
        // Prompting and memory (existing fields preserved)
        promptTemplate: {
            mode: 'basic',
            templates: {
                simple: 'Question: {question}\n\nAnswer:',
                basic: `System: You are an expert in {app_name} and software applications.

{if context_enabled}Previous Interactions (Sorted by {sort_method}):
{previous_qa}{/if}

Current Context:
{if screenshot}[Visual analysis of current screen]{/if}

Question: {question}

Instructions:
- {if context_enabled}Consider the previous Q&As shown above
- Reference previous answers if they apply
- {/if}Provide a clear and concise answer
- Focus on practical solutions`,
                advanced: ''
            },
            customInstructions: [],
            systemPrompt: 'You are an expert in {app_name} and software applications.'
        },
        contextMemory: {
            enabled: true,
            limit: 5,
            sortByRelevance: false
        }
    }
};

const dataFilePath = path.join(app.getPath('userData'), 'qa-data.json');
const settingsFilePath = path.join(app.getPath('userData'), 'settings.json');

// Screen capture handler
async function captureLastUsedAppScreen() {
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: screen.getPrimaryDisplay().workAreaSize.width,
                height: screen.getPrimaryDisplay().workAreaSize.height
            }
        });

        const primaryDisplay = sources[0]; // Get the primary display
        if (!primaryDisplay) {
            log.warn('No display found for screen capture');
            return null;
        }

        // Convert the thumbnail to base64
        const thumbnail = primaryDisplay.thumbnail.toDataURL();
        return thumbnail.split(',')[1]; // Remove data URL prefix
    } catch (error) {
        log.error('Error capturing screen:', error);
        return null;
    }
}

// Consent dialog for screenshots
async function requestScreenshotConsent() {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Allow', 'Deny'],
        defaultId: 0,
        cancelId: 1,
        title: 'Allow screenshot capture?',
        message: 'Do you consent to capture a screenshot of your current screen to send as context to the vision model?',
        detail: 'The image will be processed locally and sent to your configured vision model (e.g., MiniCPM-V) via Ollama. Sensitive content may be visible in the capture.'
    });
    return result.response === 0;
}

function isVisionModel(modelName = '') {
    const n = String(modelName || '').toLowerCase();
    return n.includes('llava') || n.includes('bakllava') || n.includes('minicpm-v') || n.includes('vision');
}

// Preprocess image: resize/compress to max 1024x1024 and return base64 without prefix
function preprocessImageBase64(base64Str, maxSize = 1024, quality = 0.8) {
    try {
        const img = nativeImage.createFromDataURL(`data:image/png;base64,${base64Str}`);
        const size = img.getSize();
        const scale = Math.min(1, maxSize / Math.max(size.width, size.height));
        const resized = scale < 1 ? img.resize({ width: Math.round(size.width * scale), height: Math.round(size.height * scale), quality: 'best' }) : img;
        // compress to JPEG to reduce payload size
        const jpeg = resized.toJPEG(Math.round(quality * 100));
        return Buffer.from(jpeg).toString('base64');
    } catch (e) {
        log.error('Failed to preprocess image', e);
        return base64Str;
    }
}


// Ollama API handlers
async function ollamaIsRunning() {
    try {
        const response = await fetch(`${OLLAMA_API}/tags`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.ok;
    } catch (error) {
        log.error('Error checking Ollama status:', error);
        return false;
    }
}

async function ollamaListModels() {
    try {
        const response = await fetch(`${OLLAMA_API}/tags`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        log.error('Error listing models:', error);
        throw error;
    }
}

async function ollamaGenerateAnswer(model, prompt, imageData = null) {
    try {
        const body = {
            model: model,
            prompt: prompt,
            stream: settings.ai.streamResponse,
            options: {
                temperature: settings.ai.temperature
            }
        };

        if (imageData && isVisionModel(model)) {
            body.images = [imageData];
        }

        if (settings.ai.streamResponse) {
            const response = await fetch(`${OLLAMA_API}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const reader = response.body.getReader();
            let fullResponse = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n').filter(Boolean);

                    for (const line of lines) {
                        const data = JSON.parse(line);
                        fullResponse += data.response;
                        mainWindow.webContents.send('stream-response', data.response);
                    }
                }
            } finally {
                reader.releaseLock();
            }

            return fullResponse;
        } else {
            const response = await fetch(`${OLLAMA_API}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            return data.response;
        }
    } catch (error) {
        log.error('Error generating answer:', error);
        throw error;
    }
}

function loadData() {
    try {
        if (fs.existsSync(dataFilePath)) {
            qaList = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
            qaList = qaList.map(qa => ({
                ...qa,
                isAIGenerated: qa.isAIGenerated || false,
                referencesContext: qa.referencesContext || false
            }));
        }
        if (fs.existsSync(settingsFilePath)) {
            const loadedSettings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf-8'));
            settings = {
                ...settings,
                ...loadedSettings,
                ai: {
                    ...settings.ai,
                    ...(loadedSettings.ai || {}),
                    contextMemory: {
                        ...settings.ai.contextMemory,
                        ...(loadedSettings.ai?.contextMemory || {})
                    },
                    promptTemplate: {
                        ...settings.ai.promptTemplate,
                        ...(loadedSettings.ai?.promptTemplate || {})
                    }
                }
            };
        }
    } catch (error) {
        log.error('Error loading data:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(qaList, null, 2), 'utf-8');
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8');
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
        { label: 'Show QA Panel', click: () => mainWindow.show() },
        { label: 'Show Shortcuts', click: () => { mainWindow.show(); mainWindow.webContents.send('show-shortcuts-overlay'); } },
        { type: 'separator' },
        { label: 'Quit QA Panel', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('QA Panel');
    tray.setContextMenu(contextMenu);
}

function setupGlobalShortcuts() {
    log.info('Setting up global shortcuts...');
    try {
        globalShortcut.unregisterAll();

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
    globalShortcut.unregisterAll();
});

// IPC handlers
ipcMain.handle('get-questions', () => {
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
});

ipcMain.handle('add-question', (event, question, answer) => {
    qaList.push({
        id: Date.now(),
        question,
        answer,
        app: settings.lastUsedApp,
        isAIGenerated: answer && settings.ai?.enabled,
        referencesContext: false
    });
    saveData();
    return qaList.filter(qa => qa.app === settings.lastUsedApp);
});

ipcMain.handle('update-question', (event, id, question, answer, isAIGenerated = false) => {
    const index = qaList.findIndex(q => q.id === id);
    if (index !== -1) {
        qaList[index] = {
            ...qaList[index],
            question,
            answer,
            isAIGenerated,
            referencesContext: qaList[index].referencesContext
        };
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
    setupGlobalShortcuts();
    return settings;
});

ipcMain.handle('get-last-used-app', () => {
    return settings.lastUsedApp;
});


// Secure screenshot with consent and preprocessing
ipcMain.handle('capture-screen-with-consent', async () => {
    const allowed = await requestScreenshotConsent();
    if (!allowed) return { allowed: false, image: null };
    const raw = await captureLastUsedAppScreen();
    if (!raw) return { allowed: true, image: null };
    const processed = preprocessImageBase64(raw, 1024, 0.8);
    return { allowed: true, image: processed };
});

ipcMain.handle('get-contextual-questions', (event, currentQuestion) => {
    const appQuestions = qaList.filter(qa => qa.app === settings.lastUsedApp);

    if (!settings.ai?.contextMemory?.enabled || appQuestions.length === 0) {
        return [];
    }

    let questions = [...appQuestions];
    return questions
        .slice(0, 5)
        .map((qa, index) => `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`);
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
    setupGlobalShortcuts();
    return { qaList, settings };

// --- Ollama helpers and IPC ---
function getOllamaUrl() {
    return (settings.ai && settings.ai.baseUrl) ? settings.ai.baseUrl.replace(/\/$/, '') : 'http://127.0.0.1:11434';
}

async function ollamaRequest(pathname, body) {
    const urlStr = `${getOllamaUrl()}${pathname}`;
    log.info('Ollama request', urlStr);
    return new Promise((resolve, reject) => {
        try {
            const https = urlStr.startsWith('https:');
            const httpModule = require(https ? 'https' : 'http');
            const data = JSON.stringify(body || {});
            const urlObj = new URL(urlStr);
            const req = httpModule.request({
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            }, (res) => {
                let chunks = '';
                res.setEncoding('utf8');
                res.on('data', (d) => chunks += d);
                res.on('end', () => {
                    try { resolve(JSON.parse(chunks)); } catch (e) { resolve({ raw: chunks }); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        } catch (e) { reject(e); }
    });
}

ipcMain.handle('ollama-list-models', async () => {
    // GET /api/tags is typical, but we use POST helper; fallback to http(s)
    try {
        const base = getOllamaUrl();
        const https = base.startsWith('https:');
        const httpModule = require(https ? 'https' : 'http');
        const urlObj = new URL(base + '/api/tags');
        return await new Promise((resolve, reject) => {
            const req = httpModule.request({ hostname: urlObj.hostname, port: urlObj.port, path: urlObj.pathname, method: 'GET' }, (res) => {
                let body = '';
                res.on('data', (c) => body += c);
                res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); } });
            });
            req.on('error', reject);
            req.end();
        });
    } catch (e) {
        log.error('ollama-list-models error', e);
        throw e;
    }
});

ipcMain.handle('ollama-generate', async (event, { prompt, options }) => {
    if (settings.ai?.requireManual && !options?.manual) {
        return { skipped: true, reason: 'Manual generate required' };
    }
    const model = options?.model || settings.ai?.model;
    const temperature = options?.temperature ?? settings.ai?.temperature ?? 0.7;
    if (!model) return { error: 'No model selected' };
    try {
        const resp = await ollamaRequest('/api/generate', { model, prompt, options: { temperature } });
        return resp;
    } catch (e) {
        log.error('ollama-generate error', e);
        return { error: String(e) };
    }
});

ipcMain.handle('ollama-chat', async (event, { messages, options }) => {
    if (settings.ai?.requireManual && !options?.manual) {
        return { skipped: true, reason: 'Manual generate required' };
    }
    const model = options?.model || settings.ai?.model;
    const temperature = options?.temperature ?? settings.ai?.temperature ?? 0.7;
    if (!model) return { error: 'No model selected' };
    try {
        const resp = await ollamaRequest('/api/chat', { model, messages, options: { temperature } });
        return resp;
    } catch (e) {
        log.error('ollama-chat error', e);
        return { error: String(e) };
    }
});

});

ipcMain.handle('show-save-dialog', (event, options) => {
    return dialog.showSaveDialog(options);
});

ipcMain.handle('show-open-dialog', (event, options) => {
    return dialog.showOpenDialog(options);
});

// Screen capture handler
ipcMain.handle('capture-screen', async () => {
    return await captureLastUsedAppScreen();
});

// Window control handlers
ipcMain.handle('hide-window', () => {
    mainWindow.hide();
    return true;
});

ipcMain.handle('show-window', () => {
    mainWindow.show();
    return true;
});

// Ollama IPC handlers
ipcMain.handle('ollama-is-running', ollamaIsRunning);
ipcMain.handle('ollama-list-models', ollamaListModels);
ipcMain.handle('ollama-generate-answer', (event, model, prompt, imageData) =>
    ollamaGenerateAnswer(model, prompt, imageData));
