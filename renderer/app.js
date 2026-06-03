const sourceTree = document.getElementById('sourceTree');
const destinationTree = document.getElementById('destinationTree');
const logs = document.getElementById('logs');

let sourceRoot = '';
let destinationRoot = '';

let selectedItems = [];
let selectedRepos = [];

let totalRepos = 0;
let completedRepos = 0;

/* SOURCE */

document.getElementById('pickSource').onclick = async () => {

    const folder =
        await window.electronAPI.selectFolder();

    if (!folder) return;

    sourceRoot = folder;

    /* SHOW SELECTED PATH */

    const sourceInput =
    document.getElementById('sourceSearch');

    sourceInput.placeholder = folder;

    /* FULL PATH ON HOVER */

    sourceInput.title = folder;

    sourceTree.innerHTML = '';

    await loadTree(folder, sourceTree, true);
};

/* DESTINATION */

document.getElementById('pickDestination').onclick = async () => {

    const folder =
        await window.electronAPI.selectFolder();

    if (!folder) return;

    destinationRoot = folder;

    /* SHOW SELECTED PATH */

    const destinationInput =
    document.getElementById('destinationSearch');

    destinationInput.placeholder = folder;

    /* FULL PATH ON HOVER */

    destinationInput.title = folder;

    destinationTree.innerHTML = '';

    await loadTree(folder, destinationTree, false);
};

/* TREE */

async function loadTree(folderPath, container, isSource) {

    const items =
        await window.electronAPI.readDirectory(folderPath);

    for (const item of items) {

        const wrapper = document.createElement('div');

        wrapper.dataset.name =
            item.name.toLowerCase();

        const row = document.createElement('div');

        row.className = 'row';

        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';

        checkbox.onchange = () => {

            if (checkbox.checked) {

                if (isSource)
                    selectedItems.push(item);
                else
                    selectedRepos.push(item.path);

            } else {

                if (isSource)
                    selectedItems =
                        selectedItems.filter(
                            x => x.path !== item.path
                        );
                else
                    selectedRepos =
                        selectedRepos.filter(
                            x => x !== item.path
                        );
            }
        };

        row.appendChild(checkbox);

        if (item.type === 'directory') {

            const toggle = document.createElement('span');

            toggle.className = 'folder-toggle';

            toggle.innerHTML = '▶';

            const label = document.createElement('span');

            label.className = 'folder-name';

            label.innerHTML = `📁 ${item.name}`;

            const child = document.createElement('div');

            child.className = 'tree';

            toggle.onclick = async () => {

                if (!child.dataset.loaded) {

                    await loadTree(
                        item.path,
                        child,
                        isSource
                    );

                    child.dataset.loaded = '1';
                }

                if (child.style.display === 'block') {

                    child.style.display = 'none';

                    toggle.innerHTML = '▶';

                } else {

                    child.style.display = 'block';

                    toggle.innerHTML = '▼';
                }
            };

            row.appendChild(toggle);

            row.appendChild(label);

            wrapper.appendChild(row);

            wrapper.appendChild(child);

        } else {

            const file =
                document.createElement('span');

            file.className = 'file-name';

            file.innerHTML = `📄 ${item.name}`;

            row.appendChild(file);

            wrapper.appendChild(row);
        }

        container.appendChild(wrapper);
    }
}

/* SEARCH */

function searchTree(inputId, treeId) {

    const keyword =
        document.getElementById(inputId)
        .value
        .toLowerCase();

    const tree =
        document.getElementById(treeId);

    const items =
        tree.querySelectorAll('[data-name]');

    items.forEach(item => {

        const match =
            item.dataset.name.includes(keyword);

        item.style.display =
            match ? '' : 'none';
    });
}

document.getElementById('sourceSearch')
.addEventListener('input', () => {

    searchTree('sourceSearch', 'sourceTree');
});

document.getElementById('destinationSearch')
.addEventListener('input', () => {

    searchTree(
        'destinationSearch',
        'destinationTree'
    );
});

/* CLEAR SEARCH */

document.getElementById('clearSourceSearch')
.onclick = () => {

    document.getElementById('sourceSearch').value = '';

    searchTree('sourceSearch', 'sourceTree');
};

document.getElementById('clearDestinationSearch')
.onclick = () => {

    document.getElementById('destinationSearch').value = '';

    searchTree(
        'destinationSearch',
        'destinationTree'
    );
};

/* PREVIEW */

async function openPreview(title, items, isSource = true) {

    document.getElementById('previewTitle')
    .innerText = title;

    const body =
        document.getElementById('previewBody');

    body.innerHTML = '';

    if (!items.length) {

        body.innerHTML = `
            <div class="empty-preview">
                No items selected
            </div>
        `;

        document.getElementById('previewModal')
        .style.display = 'flex';

        return;
    }

    for (const item of items) {

        const wrapper =
            document.createElement('div');

        wrapper.className = 'preview-folder-wrapper';

        const row =
            document.createElement('div');

        row.className = 'preview-folder-row';

        const toggle =
            document.createElement('span');

        toggle.className = 'preview-toggle';

        toggle.innerHTML =
            item.type === 'directory'
            ? '▶'
            : '';

        const icon =
            document.createElement('span');

        icon.className = 'preview-folder-icon';

        icon.innerHTML =
            item.type === 'directory'
            ? '📁'
            : '📄';

        const name =
            document.createElement('span');

        name.className = 'preview-folder-name';

        const relativePath =
            item.path.replace(
                isSource
                ? sourceRoot
                : destinationRoot,
                ''
            );

        name.innerText =
            relativePath || item.path;

        row.appendChild(toggle);
        row.appendChild(icon);
        row.appendChild(name);

        wrapper.appendChild(row);

        if (item.type === 'directory') {

            const child =
                document.createElement('div');

            child.className =
                'preview-children';

            child.style.display = 'none';

            row.onclick = async () => {

                if (!child.dataset.loaded) {

                    await loadPreviewChildren(
                        item.path,
                        child
                    );

                    child.dataset.loaded = '1';
                }

                if (
                    child.style.display === 'none'
                ) {

                    child.style.display = 'block';

                    toggle.innerHTML = '▼';

                } else {

                    child.style.display = 'none';

                    toggle.innerHTML = '▶';
                }
            };

            wrapper.appendChild(child);
        }

        body.appendChild(wrapper);
    }

    document.getElementById('previewModal')
    .style.display = 'flex';
}

/* LOAD CHILDREN */

async function loadPreviewChildren(path, container) {

    const items =
        await window.electronAPI.readDirectory(path);

    for (const item of items) {

        const wrapper =
            document.createElement('div');

        wrapper.className = 'preview-folder-wrapper';

        const row =
            document.createElement('div');

        row.className = 'preview-folder-row child';

        const toggle =
            document.createElement('span');

        toggle.className = 'preview-toggle';

        toggle.innerHTML =
            item.type === 'directory'
            ? '▶'
            : '';

        const icon =
            document.createElement('span');

        icon.className = 'preview-folder-icon';

        icon.innerHTML =
            item.type === 'directory'
            ? '📁'
            : '📄';

        const name =
            document.createElement('span');

        name.className = 'preview-folder-name';

        name.innerText = item.name;

        row.appendChild(toggle);
        row.appendChild(icon);
        row.appendChild(name);

        wrapper.appendChild(row);

        if (item.type === 'directory') {

            const child =
                document.createElement('div');

            child.className =
                'preview-children';

            child.style.display = 'none';

            row.onclick = async () => {

                if (!child.dataset.loaded) {

                    await loadPreviewChildren(
                        item.path,
                        child
                    );

                    child.dataset.loaded = '1';
                }

                if (
                    child.style.display === 'none'
                ) {

                    child.style.display = 'block';

                    toggle.innerHTML = '▼';

                } else {

                    child.style.display = 'none';

                    toggle.innerHTML = '▶';
                }
            };

            wrapper.appendChild(child);
        }

        container.appendChild(wrapper);
    }
}

document.getElementById('previewSource')
.onclick = () => {

    openPreview(
        'Selected Source Items',
        selectedItems,
        true
    );
};

document.getElementById('previewDestination')
.onclick = () => {

    const repoItems =
        selectedRepos.map(path => ({
            path,
            type: 'directory'
        }));

    openPreview(
        'Selected Destination Repositories',
        repoItems,
        false
    );
};

document.getElementById('closePreview')
.onclick = () => {

    document.getElementById('previewModal')
    .style.display = 'none';
};

/* DEPLOY */

document.getElementById('deployBtn')
.onclick = async () => {

    if (!selectedItems.length) {
        alert('Select source items');
        return;
    }

    if (!selectedRepos.length) {
        alert('Select destination repos');
        return;
    }

    logs.innerHTML = '';

    totalRepos = selectedRepos.length;

    completedRepos = 0;

    document.getElementById('runningCount')
    .innerText = totalRepos;

    const gitOptions = {

        stash:
            document.getElementById('stashCheck').checked,

        pull:
            document.getElementById('pullCheck').checked,

        pop:
            document.getElementById('popCheck').checked
    };

    const result =
        await window.electronAPI.startDeployment({

            sourceRoot,
            selectedItems,
            repositories: selectedRepos,
            gitOptions
        });

    document.getElementById('successCount')
    .innerText = result.success;

    document.getElementById('conflictCount')
    .innerText = result.conflict;

    document.getElementById('skippedCount')
    .innerText = result.skipped;

    document.getElementById('runningCount')
    .innerText = 0;
};

/* LIVE LOG */

window.electronAPI.onLiveLog((log) => {

    /*
        PROGRESS
    */

    if (log.status === 'PROGRESS') {

        document.getElementById(
            'progressFill'
        ).style.width =
            (log.progress || 0) + '%';

        document.getElementById(
            'globalPercent'
        ).innerText =
            (log.progress || 0) + '%';

        document.getElementById(
            'currentRepo'
        ).innerText =
            log.repo;

        const currentItem =
            document.getElementById(
                'currentItem'
            );

        if (currentItem) {

            currentItem.innerText =
                log.currentItem ||
                log.message ||
                '';
        }
    }

    /*
        COMPLETE
    */

    if (log.status === 'COMPLETE') {

        document.getElementById(
            'progressFill'
        ).style.width = '100%';

        document.getElementById(
            'globalPercent'
        ).innerText = '100%';

        document.getElementById(
            'currentRepo'
        ).innerText =
            log.repo;

        const currentItem =
            document.getElementById(
                'currentItem'
            );

        if (currentItem) {

            currentItem.innerText =
                'Deployment completed';
        }

        /*
            RESET
        */

        setTimeout(() => {

            document.getElementById(
                'progressFill'
            ).style.width = '0%';

            document.getElementById(
                'globalPercent'
            ).innerText = '0%';

            document.getElementById(
                'currentRepo'
            ).innerText = '-';

            if (currentItem) {

                currentItem.innerText =
                    'No active deployment';
            }

        }, 1500);
    }

    /*
        LOG UI
    */

    const div =
    document.createElement('div');

    div.className =
        `log ${log.status}`;

    div.innerHTML = `
    <div class="log-top">

        <span class="log-time">
            ${new Date().toLocaleTimeString()}
        </span>

        <span class="log-repo">
            ${log.repo}
        </span>

    </div>

    <div class="log-message">
        ${log.message}
    </div>
    `;

    logs.prepend(div);
});

/* CLEAR LOG */

document.getElementById('clearLogs')
.onclick = () => {

    logs.innerHTML = '';
};

/* CLEAR SOURCE SELECTION */

document.getElementById('clearSourceSelection')
.onclick = () => {

    selectedItems = [];

    const checkboxes =
        sourceTree.querySelectorAll(
            'input[type="checkbox"]'
        );

    checkboxes.forEach(cb => {
        cb.checked = false;
    });

    addLocalLog(
        'SYSTEM',
        'Source selections cleared'
    );
};

/* CLEAR DESTINATION SELECTION */

document.getElementById('clearDestinationSelection')
.onclick = () => {

    selectedRepos = [];

    const checkboxes =
        destinationTree.querySelectorAll(
            'input[type="checkbox"]'
        );

    checkboxes.forEach(cb => {
        cb.checked = false;
    });

    addLocalLog(
        'SYSTEM',
        'Destination selections cleared'
    );
};

/* LOCAL LOG */

function addLocalLog(status, message) {

    const div =
        document.createElement('div');

    div.className = `log ${status}`;

    div.innerHTML = `

        <div class="log-top">

            <span class="log-time">
                ${new Date().toLocaleTimeString()}
            </span>

            <span class="log-repo">
                SYSTEM
            </span>

        </div>

        <div class="log-message">
            ${message}
        </div>

    `;

    logs.prepend(div);
}

// ========================================================
// 🚀 AUTO-UPDATER INTERACTIVE UI CONTROLLER
// ========================================================

const updateModal = document.getElementById('update-modal');
const updateTitle = document.getElementById('update-title');
const updateText = document.getElementById('update-text');
const actionUpdateBtn = document.getElementById('action-update-btn');
const closeUpdateBtn = document.getElementById('close-update-btn');
const versionTag = document.getElementById('update-version-tag');

// 1. Listen for new update packages discovered on GitHub
window.electronAPI.onUpdateAvailable((version) => {
    addLocalLog('SYSTEM', `Updater detected an available software release: v${version}`);
    
    updateTitle.innerText = "Software Update Available";
    versionTag.innerText = `VERSION v${version} LATEST`;
    updateText.innerText = `An enterprise optimization upgrade (v${version}) is ready for download. Would you like to update your client now?`;
    
    // Reveal the backdrop-blurred modal container
    updateModal.style.display = 'flex';
    
    actionUpdateBtn.onclick = () => {
        window.electronAPI.downloadUpdate();
        
        // Render immediate downloading button micro-interactions
        actionUpdateBtn.innerText = "Downloading Files...";
        actionUpdateBtn.disabled = true;
        actionUpdateBtn.style.background = '#475569';
        actionUpdateBtn.style.boxShadow = 'none';
        actionUpdateBtn.style.cursor = 'default';
        closeUpdateBtn.style.display = 'none'; // Lock dialog dismissal during operations
    };
});

// 2. Listen for the complete assembly download lifecycle hook
window.electronAPI.onUpdateReady(() => {
    addLocalLog('SYSTEM', 'Update installer bundle downloaded successfully.');

    updateTitle.innerText = "Installation Blueprint Ready";
    versionTag.innerText = "DOWNLOAD COMPLETION SUCCESS";
    updateText.innerText = "The deployment bundles are staged on your device filesystem. Restart the application now to finalize updates.";
    
    actionUpdateBtn.innerText = "Restart & Install";
    actionUpdateBtn.disabled = false;
    actionUpdateBtn.style.background = '#10b981'; // Dynamic shift to green success indicator
    actionUpdateBtn.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.3)';
    actionUpdateBtn.style.cursor = 'pointer';

    actionUpdateBtn.onclick = () => {
        window.electronAPI.quitAndInstall();
    };
});

// 3. Catch update exceptions and stream them directly into your live console tracker
window.electronAPI.onUpdateError((errorMsg) => {
    addLocalLog('CONFLICT', `Auto-updater module issue: ${errorMsg}`);
});

// Handle window closing when opting out
closeUpdateBtn.onclick = () => {
    updateModal.style.display = 'none';
    addLocalLog('SYSTEM', 'Software update deferred by user.');
};
