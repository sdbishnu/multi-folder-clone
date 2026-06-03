const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { dialog } = require('electron');

/* ---------------------------------------
    GET REAL MERGE CONFLICT FILES
--------------------------------------- */

function getMergeConflicts(repoPath) {

    try {

        const output =
            execSync(
                'git diff --name-only --diff-filter=U',
                {
                    cwd: repoPath,
                    encoding: 'utf8'
                }
            );

        return output
            .split('\n')
            .map(x => x.trim())
            .filter(Boolean);

    } catch {

        return [];
    }
}

/* ---------------------------------------
    CHECK FILE MODIFIED IN GIT
--------------------------------------- */

function isGitModified(
    repoPath,
    relativeFile
) {

    try {

        const output =
            execSync(
                `git status --porcelain "${relativeFile}"`,
                {
                    cwd: repoPath,
                    encoding: 'utf8'
                }
            );

        return output.trim().length > 0;

    } catch {

        return false;
    }
}

/* ---------------------------------------
    CHECK CONTENT DIFFERENT
--------------------------------------- */

async function isContentDifferent(
    sourceFile,
    destinationFile
) {

    try {

        const srcContent =
            await fs.readFile(
                sourceFile,
                'utf8'
            );

        const destContent =
            await fs.readFile(
                destinationFile,
                'utf8'
            );

        return srcContent !== destContent;

    } catch {

        try {

            const srcStat =
                await fs.stat(sourceFile);

            const destStat =
                await fs.stat(destinationFile);

            return (
                srcStat.size !== destStat.size
            );

        } catch {

            return false;
        }
    }
}

/* ---------------------------------------
    CONFIRM FILE CONFLICT
--------------------------------------- */

async function confirmOverwrite(
    repoName,
    file
) {

    const result =
        await dialog.showMessageBox({

            type: 'warning',

            buttons: [
                'Revert & Copy',
                'Skip File'
            ],

            defaultId: 0,

            cancelId: 1,

            title: 'Modified Destination File',

            message:
                `${repoName} contains modified file`,

            detail:
`
Conflict File:

${file}

Do you want to revert destination file and copy source file?
`
        });

    return result.response === 0;
}

/* ---------------------------------------
    CONFIRM MERGE CONFLICT
--------------------------------------- */

async function confirmMergeConflict(
    repoName,
    conflicts
) {

    const result =
        await dialog.showMessageBox({

            type: 'error',

            buttons: [
                'Revert Repository',
                'Revert & Copy Source',
                'Skip Repository'
            ],

            defaultId: 1,

            cancelId: 2,

            title: 'Git Merge Conflict',

            message:
                `${repoName} contains merge conflicts`,

            detail:
`
Conflict Files:

${conflicts.join('\n')}

Choose action:

• Revert Repository
    → Reset repository only

• Revert & Copy Source
    → Reset repository and continue source deployment

• Skip Repository
    → Skip this destination repository
`
        });

    return result.response;
}

/* ---------------------------------------
    HANDLE MERGE CONFLICT
--------------------------------------- */

async function handleMergeConflict(
    repoPath,
    repoName,
    sendLog,
    stats
) {

    const conflicts =
        getMergeConflicts(repoPath);

    if (!conflicts.length) {
        return false;
    }

    stats.conflict++;

    sendLog({
        repo: repoName,
        status: 'CONFLICT',
        message:
`
Merge conflicts detected:

${conflicts.join('\n')}
`
    });

    const action =
        await confirmMergeConflict(
            repoName,
            conflicts
        );

    /* SKIP */

    if (action === 2) {

        stats.skipped++;

        sendLog({
            repo: repoName,
            status: 'SKIPPED',
            message:
                'Repository skipped by user'
        });

        return 'SKIP';
    }

    /* REVERT */

    try {

        execSync(
            'git reset --hard',
            {
                cwd: repoPath
            }
        );

        execSync(
            'git clean -fd',
            {
                cwd: repoPath
            }
        );

        sendLog({
            repo: repoName,
            status: 'WARNING',
            message:
                'Repository reverted successfully'
        });

    } catch {

        sendLog({
            repo: repoName,
            status: 'FAILED',
            message:
                'Failed to revert repository'
        });

        return 'SKIP';
    }

    /* REVERT ONLY */

    if (action === 0) {

        sendLog({
            repo: repoName,
            status: 'WARNING',
            message:
                'Copy skipped because repository had conflicts'
        });

        return 'REVERT_ONLY';
    }

    /* REVERT + COPY */

    if (action === 1) {

        sendLog({
            repo: repoName,
            status: 'SUCCESS',
            message:
                'Repository reverted. Continuing deployment'
        });

        return 'REVERT_AND_COPY';
    }

    return false;
}

/* ---------------------------------------
    COPY FILE WITH CONFLICT CHECK
--------------------------------------- */

async function copyFileWithConflictCheck(
    sourceFile,
    destinationFile,
    repoPath,
    repoName,
    sendLog
) {

    const relative =
        path.relative(
            repoPath,
            destinationFile
        );

    const exists =
        await fs.pathExists(
            destinationFile
        );

    /* DESTINATION EXISTS */

    if (exists) {

        const gitModified =
            isGitModified(
                repoPath,
                relative
            );

        const contentDifferent =
            await isContentDifferent(
                sourceFile,
                destinationFile
            );

        /* REAL FILE CONFLICT */

        if (
            gitModified &&
            contentDifferent
        ) {

            sendLog({
                repo: repoName,
                status: 'CONFLICT',
                message:
                    `Conflict file detected:\n${relative}`
            });

            const allow =
                await confirmOverwrite(
                    repoName,
                    relative
                );

            /* SKIP FILE */

            if (!allow) {

                sendLog({
                    repo: repoName,
                    status: 'SKIPPED',
                    message:
                        `Skipped conflict file:\n${relative}`
                });

                return false;
            }

            /* REVERT FILE */

            try {

                execSync(
                    `git checkout -- "${relative}"`,
                    {
                        cwd: repoPath
                    }
                );

                sendLog({
                    repo: repoName,
                    status: 'WARNING',
                    message:
                        `Reverted conflict file:\n${relative}`
                });

            } catch {}
        }
    }

    /* COPY */

    await fs.copy(
        sourceFile,
        destinationFile,
        {
            overwrite: true
        }
    );

    sendLog({
        repo: repoName,
        status: 'SUCCESS',
        message:
            `Copied:\n${relative}`
    });

    return true;
}

/* ---------------------------------------
    DEPLOY
--------------------------------------- */

async function deployToRepositories(
    payload,
    sendLog
) {

    const {
        sourceRoot,
        selectedItems,
        repositories,
        gitOptions
    } = payload;

    const stats = {
        success: 0,
        failed: 0,
        skipped: 0,
        conflict: 0
    };

    for (const repoPath of repositories) {

        const repoName =
            path.basename(repoPath);

        try {

            sendLog({
                repo: repoName,
                status: 'INFO',
                message:
                    'Checking Git repository'
            });

            /* CHECK GIT */

            if (
                !await fs.pathExists(
                    path.join(
                        repoPath,
                        '.git'
                    )
                )
            ) {

                stats.skipped++;

                sendLog({
                    repo: repoName,
                    status: 'SKIPPED',
                    message:
                        'Not a Git repository'
                });

                continue;
            }

            /* =====================================
                CHECK EXISTING MERGE CONFLICT
            ===================================== */

            const existingConflict =
                await handleMergeConflict(
                    repoPath,
                    repoName,
                    sendLog,
                    stats
                );

            if (
                existingConflict === 'SKIP'
            ) {
                continue;
            }

            if (
                existingConflict === 'REVERT_ONLY'
            ) {
                continue;
            }

            const git =
                simpleGit(repoPath);

            /* =====================================
                GIT STASH
            ===================================== */

            if (gitOptions.stash) {

                sendLog({
                    repo: repoName,
                    status: 'INFO',
                    message:
                        'Git stash'
                });

                await git.stash();
            }

            /* =====================================
                GIT PULL
            ===================================== */

            if (gitOptions.pull) {

                sendLog({
                    repo: repoName,
                    status: 'INFO',
                    message:
                        'Git pull'
                });

                await git.pull();
            }

            /* =====================================
                GIT STASH POP
            ===================================== */

            if (gitOptions.pop) {

                sendLog({
                    repo: repoName,
                    status: 'INFO',
                    message:
                        'Git stash pop'
                });

                try {

                    await git.stash(['pop']);

                } catch {}

                /* =====================================
                    CHECK CONFLICT AFTER POP
                ===================================== */

                const popConflict =
                    await handleMergeConflict(
                        repoPath,
                        repoName,
                        sendLog,
                        stats
                    );

                /* SKIP */

                if (
                    popConflict === 'SKIP'
                ) {
                    continue;
                }

                /* REVERT ONLY */

                if (
                    popConflict === 'REVERT_ONLY'
                ) {
                    continue;
                }

                /* REVERT + COPY */

                if (
                    popConflict === 'REVERT_AND_COPY'
                ) {

                    sendLog({
                        repo: repoName,
                        status: 'INFO',
                        message:
                            'Continuing deployment after revert'
                    });
                }

                sendLog({
                    repo: repoName,
                    status: 'SUCCESS',
                    message:
                        'Git stash pop completed'
                });
            }

            /* =====================================
                START DEPLOYMENT
            ===================================== */

            sendLog({
                repo: repoName,
                status: 'PROGRESS',
                progress: 0,
                currentItem: '',
                message:
                    'Starting deployment'
            });

            let current = 0;

            const total =
                selectedItems.length;

            /* =====================================
                COPY LOOP
            ===================================== */

            for (const item of selectedItems) {

                current++;

                const percent =
                    Math.round(
                        (current / total) * 100
                    );

                const relative =
                    path.relative(
                        sourceRoot,
                        item.path
                    );

                const destination =
                    path.join(
                        repoPath,
                        relative
                    );

                sendLog({
                    repo: repoName,
                    status: 'PROGRESS',
                    progress: percent,
                    currentItem: relative,
                    message:
                        `${percent}% - Copying ${relative}`
                });

                try {

                    const stat =
                        await fs.stat(item.path);

                    /* DIRECTORY */

                    if (stat.isDirectory()) {

                        await fs.copy(
                            item.path,
                            destination,
                            {
                                overwrite: true
                            }
                        );

                        sendLog({
                            repo: repoName,
                            status: 'SUCCESS',
                            message:
                                `Copied folder:\n${relative}`
                        });

                    } else {

                        /* FILE */

                        await copyFileWithConflictCheck(
                            item.path,
                            destination,
                            repoPath,
                            repoName,
                            sendLog
                        );
                    }

                } catch (copyErr) {

                    stats.failed++;

                    sendLog({
                        repo: repoName,
                        status: 'FAILED',
                        message:
                            `Copy failed:\n${relative}`
                    });

                    console.log(copyErr);
                }
            }

            /* COMPLETE */

            stats.success++;

            sendLog({
                repo: repoName,
                status: 'COMPLETE',
                progress: 100,
                currentItem: '',
                message:
                    'Deployment completed successfully'
            });

        } catch (err) {

            stats.failed++;

            sendLog({
                repo: repoName,
                status: 'FAILED',
                message:
                    err.message
            });

            console.log(err);
        }
    }

    return stats;
}

module.exports = {
    deployToRepositories
};