# Advanced Git Copy Tool 🚀

[![GitHub Release](https://img.shields.io/github/v/release/sdbishnu/multi-folder-clone?include_prereleases&style=flat-square)](https://github.com/sdbishnu/multi-folder-clone/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](#)

An **Enterprise Smart Git Deployment & Directory Synchronization Tool** built on Electron.js. This desktop utility allows you to instantly mirror and sync local project directories like standard copy-paste operations, while intelligently protecting your underlying `.git` tracking states and executing precise file-level diff computations.

---

## 💡 The Problem & The Solution

* **The Problem:** Manually copying files between separate working directories (e.g., syncing a clean production build workspace with an active experimental branch) often accidentally overrides hidden local repository metadata (`.git/`), breaks file permissions, or requires tedious manual tracking.
* **The Solution:** This utility isolates core repository logic, computes fast line-by-line file tree differences, and dynamically pushes updates to destination folders with automated reliability.

---

## ✨ Key Features

* **Smart Diff Synchronization:** Leverages efficient line-by-line delta verification (`diff`) to overwrite only modified files rather than performing full sector rewrites.
* **Metadata Protection:** Intelligently insulates native git tracking states (`.git/`, `.gitignore`, `.gitattributes`) during high-speed local tree migrations.
* **Automated CI/CD Workflows:** Configured with a cloud compiler pipeline via GitHub Actions to package production binaries seamlessly.
* **Lightweight Native Shell:** Built with Electron for reliable background system task management on desktop environments.

---

## 🛠️ Architecture & Tech Stack

* **Frontend/Shell:** Electron.js (^37.2.0)
* **File System Operations:** `fs-extra` (^11.3.0)
* **VCS Integration:** `simple-git` (^3.28.0)
* **Diffing Engine:** `diff` (^9.0.0)
* **Automation Pipeline:** GitHub Actions & `electron-builder`

---

## 📦 Installation & Usage

### Windows Setup (.exe)
1. Navigate to the [Latest Releases Dashboard](https://github.com/sdbishnu/multi-folder-clone/releases/latest).
2. Download `Git Copy Tool Setup [version].exe`.
3. Double-click the installer executable to launch the deployment wizard.
4. Launch the application from your desktop or start menu shortcut.

### Local Development Setup
To clone the repository and run the application locally from source:

```powershell
# 1. Clone the repository
git clone [https://github.com/sdbishnu/multi-folder-clone.git](https://github.com/sdbishnu/multi-folder-clone.git)
cd multi-folder-clone

# 2. Install native dependencies
npm install

# 3. Spin up the Electron runtime application environment
npm start
