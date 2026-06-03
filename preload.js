const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Expose the version hook
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    
    // --- EXISTING DIRECTORY & DEPLOYMENT HANDLERS ---
    selectFolder: () =>
        ipcRenderer.invoke('select-folder'),

    readDirectory: (path) =>
        ipcRenderer.invoke('read-directory', path),

    startDeployment: (payload) =>
        ipcRenderer.invoke('start-deployment', payload),

    onLiveLog: (callback) => {
        ipcRenderer.on('live-log', (_, data) => callback(data));
    },

    // --- NEW MODERN AUTO-UPDATER BINDINGS ---
    // Listens for main process to say an update is available on GitHub
    onUpdateAvailable: (callback) => 
        ipcRenderer.on('update-available-ui', (event, version) => callback(version)),

    // Listens for main process to say the .exe download is complete
    onUpdateReady: (callback) => 
        ipcRenderer.on('update-ready-ui', () => callback()),

    // Optional: Listens for any background network or update errors
    onUpdateError: (callback) => 
        ipcRenderer.on('update-error-ui', (event, error) => callback(error)),

    // Sends a command to the main process to begin downloading the assets
    downloadUpdate: () => 
        ipcRenderer.send('start-download-update'),

    // Sends a command to close the app and execute the new installer
    quitAndInstall: () => 
        ipcRenderer.send('quit-and-install-update')
});