const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

    selectFolder: () =>
        ipcRenderer.invoke('select-folder'),

    readDirectory: (path) =>
        ipcRenderer.invoke('read-directory', path),

    startDeployment: (payload) =>
        ipcRenderer.invoke('start-deployment', payload),

    onLiveLog: (callback) => {
        ipcRenderer.on('live-log', (_, data) => callback(data));
    }
});