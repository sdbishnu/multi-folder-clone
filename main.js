const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { autoUpdater } = require('electron-updater'); 
const { deployToRepositories } = require('./services/gitCopyService');

// Configure autoUpdater settings
autoUpdater.autoDownload = false; 
autoUpdater.forceDevUpdateConfig = true; // Force local dev testing with dev-app-update.yml

let win; // Make window reference global so autoUpdater events can access it

function createWindow() {
    win = new BrowserWindow({
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

    // MANUALLY OPEN DEVTOOLS WITH CTRL+SHIFT+C (ONLY IN DEVELOPMENT MODE)
    if (!app.isPackaged) {
        win.webContents.on('before-input-event', (event, input) => {
            const isCtrlShiftC =
                input.control &&
                input.shift &&
                input.key.toLowerCase() === 'c';
        
            if (isCtrlShiftC) {
                event.preventDefault();
        
                if (!win.webContents.isDevToolsOpened()) {
                    win.webContents.openDevTools({ mode: 'bottom' });
                } else {
                    win.webContents.closeDevTools();
                }
            }
        });
    }

    // Trigger the check for newer GitHub updates once the window is initialized
    win.webContents.once('did-finish-load', () => {
        autoUpdater.checkForUpdatesAndNotify().catch((err) => {
            console.error("Failed to check for updates:", err);
        });
    });
}

app.whenReady().then(() => {
    createWindow();

    // IPC Handlers for normal file operations
    ipcMain.handle('select-folder', async () => {
        const { dialog } = require('electron'); // Loaded dynamically safely
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
            if (item === '.git' || item === 'node_modules' || item === 'vendor') continue;
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

    // NEW FRONTEND-DRIVEN UPDATER CONTROLS
    ipcMain.on('start-download-update', () => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.on('quit-and-install-update', () => {
        setImmediate(() => autoUpdater.quitAndInstall());
    });
});

// --- MODERNIZED AUTO-UPDATER LIFECYCLE HANDLERS ---

// A new release was detected, tell the frontend UI cards to display the message
autoUpdater.on('update-available', (info) => {
    if (win) {
        win.webContents.send('update-available-ui', info.version);
    }
});

// The update installation file completed downloading silently in the background
autoUpdater.on('update-downloaded', () => {
    if (win) {
        win.webContents.send('update-ready-ui');
    }
});

// Handle error exceptions gracefully to avoid app crashing
autoUpdater.on('error', (err) => {
    console.error("Auto updater threw an error: ", err);
    if (win) {
        win.webContents.send('update-error-ui', err.message);
    }
});