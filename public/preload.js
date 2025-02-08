const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Question management
    addQuestion: (question, answer) => ipcRenderer.invoke('add-question', question, answer),
    getQuestions: () => ipcRenderer.invoke('get-questions'),
    updateQuestion: (id, question, answer, isAIGenerated = false) => 
        ipcRenderer.invoke('update-question', id, question, answer, isAIGenerated),
    deleteQuestion: (id) => ipcRenderer.invoke('delete-question', id),
    
    // Settings management
    getSettings: () => ipcRenderer.invoke('get-settings'),
    updateSettings: (newSettings) => ipcRenderer.invoke('update-settings', newSettings),
    
    // Last used app
    getLastUsedApp: () => ipcRenderer.invoke('get-last-used-app'),
    onUpdateLastUsedApp: (callback) => ipcRenderer.on('update-last-used-app', callback),
    
    // Keyboard shortcuts
    onFocusNewQuestion: (callback) => ipcRenderer.on('focus-new-question', callback),
    
    // Import/Export
    exportData: (filePath) => ipcRenderer.invoke('export-data', filePath),
    importData: (filePath) => ipcRenderer.invoke('import-data', filePath),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    
    // Event cleanup
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
