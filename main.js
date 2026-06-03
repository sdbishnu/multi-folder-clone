const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { autoUpdater } = require('electron-updater'); // 1. Import the auto-updater engine
const { deployToRepositories } = require('./services/gitCopyService');

// Configure autoUpdater settings
autoUpdater.autoDownload = false; // Don't download automatically; ask the user first via a pop-up

function createWindow() {
    const win = new BrowserWindow({
        width: 1900,
        height: 1050,
        icon: path.join(__dirname, 'assets/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    // Open DevTools with Ctrl+Shift+C
    // win.webContents.on('before-input-event', (event, input) => {
    //     const isCtrlShiftC =
    //         input.control &&
    //         input.shift &&
    //         input.key.toLowerCase() === 'c';
    
    //     if (isCtrlShiftC) {
    //         event.preventDefault();
    
    //         // Open DevTools if not already open
    //         if (!win.webContents.isDevToolsOpened()) {
    //             win.webContents.openDevTools({ mode: 'bottom' });
    //         }
    
    //         // Optional: focus DevTools
    //         win.webContents.devToolsWebContents?.focus();
    //     }
    // });

    // 2. Trigger the check for newer GitHub updates once the window is initialized
    win.webContents.once('did-finish-load', () => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
            console.error("Failed to check for updates:", err);
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    // IPC Handlers
    ipcMain.handle('select-folder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        if (result.canceled) return null;

        return result.filePaths[0];
    });

    ipcMain.handle('read-directory', async (_, folderPath) => {
        const items = await fs.readdir(folderPath);
        const result = [];

        for (const item of items) {
            if (
                item === '.git' ||
                item === 'node_modules' ||
                item === 'vendor'
            ) continue;

            const fullPath = path.join(folderPath, item);
            const stat = await fs.stat(fullPath);

            result.push({
                name: item,
                path: fullPath,
                type: stat.isDirectory() ? 'directory' : 'file'
            });
        }

        return result;
    });

    ipcMain.handle('start-deployment', async (event, payload) => {
        return await deployToRepositories(payload, (log) => {
            event.sender.send('live-log', log);
        });
    });
});

// --- 3. AUTO-UPDATER LIFECYCLE EVENT HANDLERS ---

// A new release was detected on your GitHub Releases dashboard
autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) of Git Copy Tool is available. Would you like to download it now?`,
        buttons: ['Yes, Download', 'Later'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.downloadUpdate(); // Triggers background download
        }
    });
});

// The update installation file completed downloading silently in the background
autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready to Install',
        message: 'The update has been downloaded successfully. The application needs to restart to complete the installation.',
        buttons: ['Restart & Update Now'],
        defaultId: 0
    }).then(() => {
        setImmediate(() => autoUpdater.quitAndInstall()); // Closes the app and boots the installer .exe
    });
});

// Handle error exceptions gracefully to avoid app crashing
autoUpdater.on('error', (err) => {
    console.error("Auto updater threw an error: ", err);
});