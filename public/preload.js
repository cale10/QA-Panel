const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Question management
    addQuestion: (question, answer) => ipcRenderer.invoke('add-question', question, answer),
    getQuestions: () => ipcRenderer.invoke('get-questions'),
    updateQuestion: (id, question, answer) => ipcRenderer.invoke('update-question', id, question, answer),
    deleteQuestion: (id) => ipcRenderer.invoke('delete-question', id),
    
    // Settings management
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (newSettings) => ipcRenderer.invoke('update-settings', newSettings),
    
    // Last used app
    getLastUsedApp: () => ipcRenderer.invoke('get-last-used-app'),
    onUpdateLastUsedApp: (callback) => ipcRenderer.on('update-last-used-app', callback),
    
    // Keyboard shortcuts
    onFocusNewQuestion: (callback) => ipcRenderer.on('focus-new-question', callback),
    onShowShortcutsOverlay: (callback) => ipcRenderer.on('show-shortcuts-overlay', callback),
    onExportData: (callback) => ipcRenderer.on('export-data', callback),
    onImportData: (callback) => ipcRenderer.on('import-data', callback),

    // Import/Export
    exportData: (filePath) => ipcRenderer.invoke('export-data', filePath),
    importData: (filePath) => ipcRenderer.invoke('import-data', filePath),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    
    // Event cleanup
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

    // Ollama
    ollamaListModels: () => ipcRenderer.invoke('ollama-list-models'),
    ollamaGenerate: (prompt, options) => ipcRenderer.invoke('ollama-generate', { prompt, options }),
    ollamaChat: (messages, options) => ipcRenderer.invoke('ollama-chat', { messages, options }),
});
