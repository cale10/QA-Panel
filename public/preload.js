const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getQuestions: () => ipcRenderer.invoke('get-questions'),
    addQuestion: (question, answer) => ipcRenderer.invoke('add-question', question, answer),
    updateQuestion: (id, question, answer, isAIGenerated) => ipcRenderer.invoke('update-question', id, question, answer, isAIGenerated),
    deleteQuestion: (id) => ipcRenderer.invoke('delete-question', id),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
    getLastUsedApp: () => ipcRenderer.invoke('get-last-used-app'),
    getContextualQuestions: (question) => ipcRenderer.invoke('get-contextual-questions', question),
    onUpdateLastUsedApp: (callback) => ipcRenderer.on('update-last-used-app', callback),
    onFocusNewQuestion: (callback) => ipcRenderer.on('focus-new-question', callback),
    onExportData: (callback) => ipcRenderer.on('export-data', callback),
    onImportData: (callback) => ipcRenderer.on('import-data', callback),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    exportData: (filePath) => ipcRenderer.invoke('export-data', filePath),
    importData: (filePath) => ipcRenderer.invoke('import-data', filePath),

    // Ollama API methods
    ollamaIsRunning: () => ipcRenderer.invoke('ollama-is-running'),
    ollamaListModels: () => ipcRenderer.invoke('ollama-list-models'),
    ollamaGenerateAnswer: (model, prompt, imageData) => ipcRenderer.invoke('ollama-generate-answer', model, prompt, imageData)
});
