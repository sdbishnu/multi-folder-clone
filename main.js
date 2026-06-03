const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { deployToRepositories } = require('./services/gitCopyService');

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

    //open DevTools with Ctrl+Shift+C
    win.webContents.on('before-input-event', (event, input) => {
        const isCtrlShiftC =
            input.control &&
            input.shift &&
            input.key.toLowerCase() === 'c';
    
        if (isCtrlShiftC) {
            event.preventDefault();
    
            // Open DevTools if not already open
            if (!win.webContents.isDevToolsOpened()) {
                win.webContents.openDevTools({ mode: 'bottom' });
                // modes: 'right', 'bottom', 'undocked', 'detach'   
            }
    
            // Optional: focus DevTools
            win.webContents.devToolsWebContents?.focus();
        }
    });
}

app.whenReady().then(() => {

    createWindow();

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