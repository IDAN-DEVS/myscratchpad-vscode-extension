import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { IScratchFile } from "../models/scratchFile";
import { ScratchpadService } from "../services/scratchpadService";

export class ScratchpadWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "myscratchpad.scratchpadView";

  private _view?: vscode.WebviewView;
  private _globalService: ScratchpadService;
  private _workspaceService: ScratchpadService;
  private _globalDir: string;
  private _workspaceDir: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    globalDir: string,
    workspaceDir: string,
    globalService: ScratchpadService,
    workspaceService: ScratchpadService
  ) {
    this._globalDir = globalDir;
    this._workspaceDir = workspaceDir;
    this._globalService = globalService;
    this._workspaceService = workspaceService;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "ready":
          this.refresh();
          break;

        case "createGlobalScratch":
          await this._globalService.createScratchFile();
          this.refresh();
          break;

        case "createWorkspaceScratch":
          await this._workspaceService.createScratchFile();
          this.refresh();
          break;

        case "openFile": {
          const providedPath = data.path;

          // Prepare candidate variations to handle different encodings and separators
          const candidates: string[] = [];
          if (typeof providedPath === "string") {
            candidates.push(providedPath);
            candidates.push(path.normalize(providedPath));
            candidates.push(providedPath.replace(/\\/g, "/"));
            candidates.push(providedPath.replace(/\//g, "\\"));
            try {
              const decoded = decodeURIComponent(providedPath);
              if (decoded !== providedPath) {
                candidates.push(decoded);
              }
            } catch (e) {
              // ignore decode errors
            }
          }

          const uniqueCandidates = Array.from(new Set(candidates));

          let existingPath: string | undefined;
          for (const candidate of uniqueCandidates) {
            try {
              if (fs.existsSync(candidate)) {
                existingPath = candidate;
                break;
              }
            } catch (e) {
              console.warn("existsSync check failed for", candidate, e);
            }
          }

          if (!existingPath) {
            try {
              const resolved = path.resolve(providedPath);
              if (fs.existsSync(resolved)) {
                existingPath = resolved;
              }
            } catch (e) {
              // ignore
            }
          }

          try {
            if (existingPath) {
              const fileUri = vscode.Uri.file(existingPath);
              const document = await vscode.workspace.openTextDocument(fileUri);
              await vscode.window.showTextDocument(document);
              if (this._view) {
                this._view.webview.postMessage({
                  type: "openResult",
                  success: true,
                  path: existingPath,
                });
              }
            } else {
              console.warn(
                "No existing file found for candidates, attempting vscode.Uri.parse"
              );
              const parsed = vscode.Uri.parse(providedPath);
              const document = await vscode.workspace.openTextDocument(parsed);
              await vscode.window.showTextDocument(document);
              if (this._view) {
                this._view.webview.postMessage({
                  type: "openResult",
                  success: true,
                  path: providedPath,
                });
              }
            }
          } catch (err) {
            console.error(
              "Failed to open file from webview after trying candidates:",
              err,
              providedPath
            );
            vscode.window.showErrorMessage(`Failed to open file: ${err}`);
            if (this._view) {
              this._view.webview.postMessage({
                type: "openResult",
                success: false,
                error: String(err),
                candidates: uniqueCandidates,
              });
            }
          }

          break;
        }

        case "deleteFile":
          await this._deleteFile(data.file);
          break;

        case "renameFile":
          await this._renameFile(data.file);
          break;

        case "refresh":
          this.refresh();
          break;

        case "search":
          this._handleSearch(data.query);
          break;
      }
    });

    // Also listen for document save events to ensure UI updates
    const disposable = vscode.workspace.onDidSaveTextDocument((document) => {
      const filePath = document.uri.fsPath;
      // Check if the saved file is in one of our scratchpad directories
      if (
        filePath.includes(this._globalDir) ||
        filePath.includes(this._workspaceDir)
      ) {
        // Small delay to ensure file system has updated
        setTimeout(() => this.refresh(), 50);
      }
    });

    // Store the disposable for cleanup when webview is disposed
    webviewView.onDidDispose(() => {
      disposable.dispose();
    });
  }

  private async _deleteFile(file: IScratchFile): Promise<void> {
    const isWorkspaceFile = file.path.includes("workspaceScratchFiles");
    const service = isWorkspaceFile
      ? this._workspaceService
      : this._globalService;

    const success = await service.deleteScratchFile(file);
    if (success) {
      this.refresh();
    }
  }

  private async _renameFile(file: IScratchFile): Promise<void> {
    const isWorkspaceFile = file.path.includes("workspaceScratchFiles");
    const service = isWorkspaceFile
      ? this._workspaceService
      : this._globalService;

    const success = await service.renameScratchFile(file);
    if (success) {
      this.refresh();
    }
  }

  private _handleSearch(query: string): void {
    if (this._view) {
      const { globalFiles, workspaceFiles } = this._getAllFiles();
      const filteredGlobal = this._filterFiles(globalFiles, query);
      const filteredWorkspace = this._filterFiles(workspaceFiles, query);

      this._view.webview.postMessage({
        type: "searchResults",
        globalFiles: filteredGlobal,
        workspaceFiles: filteredWorkspace,
        query,
      });
    }
  }

  private _filterFiles(files: IScratchFile[], query: string): IScratchFile[] {
    if (!query.trim()) {
      return files;
    }

    const lowercaseQuery = query.toLowerCase();
    return files.filter(
      (file) =>
        file.name.toLowerCase().includes(lowercaseQuery) ||
        file.extension.toLowerCase().includes(lowercaseQuery)
    );
  }

  public refresh(): void {
    if (this._view) {
      const { globalFiles, workspaceFiles } = this._getAllFiles();
      this._view.webview.postMessage({
        type: "refresh",
        globalFiles,
        workspaceFiles,
      });
    }
  }

  private _getAllFiles(): {
    globalFiles: IScratchFile[];
    workspaceFiles: IScratchFile[];
  } {
    const globalFiles = this._getScratchFiles(this._globalDir);
    const workspaceFiles = this._getScratchFiles(this._workspaceDir);
    return { globalFiles, workspaceFiles };
  }

  private _getScratchFiles(scratchpadDir: string): IScratchFile[] {
    try {
      const ideNames = ["Code", "Code - Insiders", "Cursor", "Windsurf"];

      // Cross-platform path handling
      const normalizedPath = path.normalize(scratchpadDir);

      // Find the User directory in the path (could be "User" on macOS/Linux or "Users" on Windows)
      let userDirIndex = -1;
      const pathParts = normalizedPath.split(path.sep);

      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === "User" || pathParts[i] === "Users") {
          userDirIndex = i;
          break;
        }
      }

      if (userDirIndex === -1) {
        console.warn(
          "Could not find User/Users directory in path:",
          normalizedPath
        );
        // Fallback to current directory only
        return this._getDirectoryScratchFiles(scratchpadDir);
      }

      // Get the base path up to the IDE name (one level before User/Users)
      const basePath = pathParts.slice(0, userDirIndex - 1).join(path.sep);
      const relativePath = pathParts.slice(userDirIndex + 1).join(path.sep);

      // Construct the path for each IDE
      const idePaths = ideNames.map((ideName) => {
        // On Windows, we might need to handle the drive letter properly
        if (process.platform === "win32" && basePath.includes(":")) {
          return path.join(
            basePath,
            ideName,
            pathParts[userDirIndex],
            relativePath
          );
        } else {
          return path.join(
            basePath,
            ideName,
            pathParts[userDirIndex],
            relativePath
          );
        }
      });

      // Get all files from all IDE paths
      const allFiles: string[] = [];
      const uniqueFileNames = new Set<string>();

      // Always include the current directory first
      if (fs.existsSync(scratchpadDir)) {
        const currentDirFiles = this._getDirectoryScratchFiles(scratchpadDir);
        return currentDirFiles;
      }

      idePaths.forEach((idePath) => {
        if (fs.existsSync(idePath)) {
          try {
            const ideFiles = fs
              .readdirSync(idePath)
              .map((file) => path.join(idePath, file))
              .filter((filePath) => {
                try {
                  return !fs.statSync(filePath).isDirectory();
                } catch (error) {
                  console.warn("Error checking file stats:", filePath, error);
                  return false;
                }
              });

            // Add files, filtering by unique file names
            ideFiles.forEach((filePath) => {
              const fileName = path.basename(filePath);
              if (!uniqueFileNames.has(fileName)) {
                uniqueFileNames.add(fileName);
                allFiles.push(filePath);
              }
            });
          } catch (error) {
            console.warn("Error reading directory:", idePath, error);
          }
        }
      });

      // Process all found files
      return this._processFileList(allFiles);
    } catch (error) {
      console.error("Error reading scratchpad directory:", error);
      return [];
    }
  }

  private _getDirectoryScratchFiles(dirPath: string): IScratchFile[] {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const files = fs
        .readdirSync(dirPath)
        .map((file) => path.join(dirPath, file))
        .filter((filePath) => {
          try {
            return !fs.statSync(filePath).isDirectory();
          } catch (error) {
            console.warn("Error checking file stats:", filePath, error);
            return false;
          }
        });

      return this._processFileList(files);
    } catch (error) {
      console.error("Error reading directory:", dirPath, error);
      return [];
    }
  }

  private _processFileList(files: string[]): IScratchFile[] {
    return files
      .map((filePath) => {
        try {
          const stats = fs.statSync(filePath);
          const fileName = path.basename(filePath);
          const extension = path.extname(fileName).slice(1);
          const name = fileName;

          const scratchFile: IScratchFile = {
            name,
            extension,
            path: filePath,
            created: stats.birthtime.getTime(),
            lastModified: stats.mtime.getTime(),
          };

          return scratchFile;
        } catch (error) {
          console.error("Error processing file:", filePath, error);
          return null;
        }
      })
      .filter((file): file is IScratchFile => file !== null)
      .sort((a, b) => b.lastModified - a.lastModified);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyScratchPad</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
        }
        
        .container {
            padding: 10px;
        }
        
        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
        }
        
        .header h2 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
            flex: 1;
        }
        
        .header-actions {
            display: flex;
            gap: 4px;
        }
        
        .action-button {
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            border-radius: 2px;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 13px;
            font-family: inherit;
            font-weight: bold;
        }
        
        .action-button:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .search-container {
            margin-bottom: 12px;
        }
        
        .search-input {
            width: 100%;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-family: inherit;
            font-size: 12px;
            outline: none;
        }
        
        .search-input:focus {
            border-color: var(--vscode-focusBorder);
        }
        
        .section {
            margin-bottom: 16px;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
            padding: 4px 0;
            cursor: pointer;
            user-select: none;
        }
        
        .section-header:hover {
            background: var(--vscode-list-hoverBackground);
            border-radius: 2px;
        }
        
        .section-toggle {
            font-size: 12px;
            margin-right: 6px;
            transition: transform 0.1s;
        }
        
        .section-toggle.collapsed {
            transform: rotate(-90deg);
        }
        
        .section-content {
            transition: all 0.2s ease;
            overflow: hidden;
        }
        
        .section-content.collapsed {
            max-height: 0;
            opacity: 0;
        }
        
        .section-content.expanded {
            max-height: 1000px;
            opacity: 1;
        }
        
        .section-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .section-count {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 1px 6px;
            border-radius: 8px;
            min-width: 16px;
            text-align: center;
        }
        
        .file-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .file-item {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            transition: background-color 0.1s;
            position: relative;
            margin-bottom: 1px;
        }
        
        .file-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .file-icon {
            width: 16px;
            height: 16px;
            margin-right: 8px;
            flex-shrink: 0;
        }
        
        .file-info {
            flex: 1;
            min-width: 0;
        }
        
        .file-name {
            font-size: 12px;
            color: var(--vscode-foreground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .file-meta {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-top: 1px;
        }
        
        .file-actions {
            display: none;
            gap: 2px;
        }
        
        .file-item:hover .file-actions {
            display: flex;
        }
        
        .file-action {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 2px;
            border-radius: 2px;
            font-size: 11px;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .file-action:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            padding: 20px;
        }
        
        .loading {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            padding: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>MyScratchPad</h2>
            <div class="header-actions">
                <button class="action-button" onclick="refresh()" title="Refresh">🔄</button>
            </div>
        </div>
        
        <div class="search-container">
            <input type="text" class="search-input" placeholder="Search scratch files..." oninput="handleSearch(this.value)">
        </div>
        
        <div class="section">
            <div class="section-header" onclick="toggleSection('global')">
                <div style="display: flex; align-items: center;">
                    <span class="section-toggle collapsed" id="global-toggle">▶</span>
                    <span class="section-title">All Scratchpads</span>
                </div>
                <span class="section-count" id="global-count">0</span>
            </div>
            <div class="section-content collapsed" id="global-content">
                <div style="margin-bottom: 8px;">
                    <button class="action-button" onclick="createGlobalScratch()" title="Create New Global Scratch File">+ Global</button>
                </div>
                <ul class="file-list" id="global-files">
                    <li class="loading">Loading...</li>
                </ul>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header" onclick="toggleSection('workspace')">
                <div style="display: flex; align-items: center;">
                    <span class="section-toggle collapsed" id="workspace-toggle">▶</span>
                    <span class="section-title">Workspace Scratchpads</span>
                </div>
                <span class="section-count" id="workspace-count">0</span>
            </div>
            <div class="section-content collapsed" id="workspace-content">
                <div style="margin-bottom: 8px;">
                    <button class="action-button" onclick="createWorkspaceScratch()" title="Create New Workspace Scratch File">+ Workspace</button>
                </div>
                <ul class="file-list" id="workspace-files">
                    <li class="loading">Loading...</li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // State for section collapse/expand
        let sectionStates = {
            global: false,  // Start collapsed
            workspace: false  // Start collapsed
        };
        
        function createGlobalScratch() {
            vscode.postMessage({ type: 'createGlobalScratch' });
        }
        
        function createWorkspaceScratch() {
            vscode.postMessage({ type: 'createWorkspaceScratch' });
        }
        
        function openFile(path) {
            vscode.postMessage({ type: 'openFile', path: path });
        }
        
        function deleteFile(file) {
            vscode.postMessage({ type: 'deleteFile', file });
        }
        
        function renameFile(file) {
            vscode.postMessage({ type: 'renameFile', file });
        }
        
        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }
        
        function handleSearch(query) {
            vscode.postMessage({ type: 'search', query });
        }
        
        function toggleSection(sectionId) {
            const content = document.getElementById(sectionId + '-content');
            const toggle = document.getElementById(sectionId + '-toggle');
            
            sectionStates[sectionId] = !sectionStates[sectionId];
            
            if (sectionStates[sectionId]) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                toggle.classList.remove('collapsed');
                toggle.textContent = '▼';
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                toggle.classList.add('collapsed');
                toggle.textContent = '▶';
            }
        }
        
        function formatDate(timestamp) {
            return new Date(timestamp).toLocaleDateString() + ' ' + 
                   new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
        function getFileIcon(extension) {
            const icons = {
                'js': '📄',
                'ts': '📘',
                'html': '🌐',
                'css': '🎨',
                'json': '📋',
                'md': '📝',
                'txt': '📄',
                'py': '🐍',
                'java': '☕',
                'cpp': '⚙️',
                'c': '⚙️',
                'go': '🐹',
                'rs': '🦀',
                'php': '🐘',
                'rb': '💎',
                'swift': '🦉',
                'kt': '🎯',
                'dart': '🎯',
                'vue': '💚',
                'jsx': '⚛️',
                'tsx': '⚛️'
            };
            return icons[extension] || '📄';
        }
        
        function renderFileList(files, containerId) {
            const container = document.getElementById(containerId);
            const countElement = document.getElementById(containerId.replace('-files', '-count'));

            countElement.textContent = files.length;

            // Clear container
            container.innerHTML = '';

            if (files.length === 0) {
                container.innerHTML = '<li class="empty-state">No files found</li>';
                return;
            }

            // Build DOM nodes to avoid string-escaping issues on Windows paths
            files.forEach((file) => {
                const li = document.createElement('li');
                li.className = 'file-item';

                li.addEventListener('click', () => {
                    openFile(file.path);
                });

                const iconSpan = document.createElement('span');
                iconSpan.className = 'file-icon';
                iconSpan.textContent = getFileIcon(file.extension);

                const infoDiv = document.createElement('div');
                infoDiv.className = 'file-info';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'file-name';
                nameDiv.title = file.name;
                nameDiv.textContent = file.name;

                const metaDiv = document.createElement('div');
                metaDiv.className = 'file-meta';
                metaDiv.textContent = 'Modified: ' + formatDate(file.lastModified);

                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(metaDiv);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'file-actions';

                const renameBtn = document.createElement('button');
                renameBtn.className = 'file-action';
                renameBtn.title = 'Rename';
                renameBtn.textContent = '✏️';
                renameBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    renameFile(file);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'file-action';
                deleteBtn.title = 'Delete';
                deleteBtn.textContent = '🗑️';
                deleteBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    deleteFile(file);
                });

                actionsDiv.appendChild(renameBtn);
                actionsDiv.appendChild(deleteBtn);

                li.appendChild(iconSpan);
                li.appendChild(infoDiv);
                li.appendChild(actionsDiv);

                container.appendChild(li);
            });
        }
        
        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'refresh':
                    renderFileList(message.globalFiles, 'global-files');
                    renderFileList(message.workspaceFiles, 'workspace-files');
                    break;
                case 'searchResults':
                    renderFileList(message.globalFiles, 'global-files');
                    renderFileList(message.workspaceFiles, 'workspace-files');
                    break;
            }
        });
        
        // Send ready message when page is fully loaded
        window.addEventListener('DOMContentLoaded', () => {
            vscode.postMessage({ type: 'ready' });
        });
        
        // Fallback in case DOMContentLoaded already fired
        if (document.readyState === 'loading') {
            // Still loading, wait for DOMContentLoaded
        } else {
            // Already loaded
            vscode.postMessage({ type: 'ready' });
        }
    </script>
</body>
</html>`;
  }
}
