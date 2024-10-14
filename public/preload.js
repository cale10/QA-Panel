const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  addQuestion: (question, answer) => ipcRenderer.invoke('add-question', question, answer),
  getQuestions: () => ipcRenderer.invoke('get-questions'),
  updateQuestion: (id, question, answer) => ipcRenderer.invoke('update-question', id, question, answer),
  deleteQuestion: (id) => ipcRenderer.invoke('delete-question', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (newSettings) => ipcRenderer.invoke('update-settings', newSettings),
  getLastUsedApp: () => ipcRenderer.invoke('get-last-used-app'),
  onUpdateLastUsedApp: (callback) => ipcRenderer.on('update-last-used-app', callback),
  onFocusNewQuestion: (callback) => ipcRenderer.on('focus-new-question', callback),
  onExportData: (callback) => ipcRenderer.on('export-data', callback),
  onImportData: (callback) => ipcRenderer.on('import-data', callback),
  onDeleteQuestion: (callback) => ipcRenderer.on('delete-question', callback),
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),
});
