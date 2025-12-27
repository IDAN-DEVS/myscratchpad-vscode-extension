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
  private _isDisposed = false;

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

    // Store the disposable for cleanup when webview is disposed
    webviewView.onDidDispose(() => {
      this._isDisposed = true;
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
    if (this._view && !this._isDisposed) {
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
        :root {
            --sidebar-spacing: 12px;
            --section-spacing: 16px;
            --item-spacing: 4px;
            --border-radius: 4px;
            --border-radius-sm: 2px;
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
            --transition-fast: 0.15s ease;
            --transition-normal: 0.2s ease;
            --transition-slow: 0.3s ease;
        }

        * {
            box-sizing: border-box;
        }

        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            line-height: 1.4;
            overflow-x: hidden;
        }

        .container {
            padding: var(--sidebar-spacing);
            padding-top: 8px;
            min-height: 100vh;
        }

        /* Header Section */
        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: var(--sidebar-spacing);
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-sideBar-border);
            position: sticky;
            top: 0;
            background: var(--vscode-sideBar-background);
            z-index: 10;
            backdrop-filter: blur(4px);
        }

        .header h2 {
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            flex: 1;
            color: var(--vscode-foreground);
            letter-spacing: -0.02em;
        }

        .header-actions {
            display: flex;
            gap: 4px;
        }

        .action-button {
            background: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-button-border, transparent);
            border-radius: var(--border-radius-sm);
            padding: 6px 12px;
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
            font-weight: 500;
            transition: all var(--transition-fast);
            position: relative;
            overflow: hidden;
        }

        .action-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            transition: left var(--transition-normal);
        }

        .action-button:hover::before {
            left: 100%;
        }

        .action-button:hover {
            background: var(--vscode-toolbar-hoverBackground);
            border-color: var(--vscode-focusBorder);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
        }

        .action-button:active {
            transform: translateY(0);
        }

        /* Search Section */
        .search-container {
            margin-bottom: var(--sidebar-spacing);
            position: relative;
        }

        .search-wrapper {
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 8px 12px 8px 36px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: var(--border-radius);
            font-family: inherit;
            font-size: 13px;
            outline: none;
            transition: all var(--transition-fast);
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .search-input:focus {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .search-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
            opacity: 0.7;
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--vscode-input-placeholderForeground);
            font-size: 14px;
            pointer-events: none;
            opacity: 0.6;
        }

        .search-input:focus + .search-icon {
            opacity: 1;
            color: var(--vscode-focusBorder);
        }

        /* Section Styles */
        .section {
            margin-bottom: var(--section-spacing);
            background: var(--vscode-sideBar-background);
            border-radius: var(--border-radius);
            border: 1px solid transparent;
            transition: all var(--transition-fast);
        }

        .section:hover {
            border-color: var(--vscode-list-hoverBackground);
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 0;
            padding: 10px 12px;
            cursor: pointer;
            user-select: none;
            border-radius: var(--border-radius);
            transition: all var(--transition-fast);
        }

        .section-header:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .section-header:active {
            background: var(--vscode-list-activeSelectionBackground);
        }

        .section-toggle {
            font-size: 12px;
            margin-right: 8px;
            transition: transform var(--transition-normal);
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
        }

        .section-toggle.collapsed {
            transform: rotate(-90deg);
        }

        .section-content {
            transition: all var(--transition-normal);
            overflow: hidden;
            background: var(--vscode-sideBar-background);
            border-radius: 0 0 var(--border-radius) var(--border-radius);
        }

        .section-content.collapsed {
            max-height: 0;
            opacity: 0;
            transform: scaleY(0);
            transform-origin: top;
        }

        .section-content.expanded {
            max-height: 2000px;
            opacity: 1;
            transform: scaleY(1);
        }

        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-foreground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            flex: 1;
        }

        .section-count {
            font-size: 11px;
            font-weight: 500;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            min-width: 20px;
            text-align: center;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            transition: all var(--transition-fast);
        }

        .section-count.empty {
            background: var(--vscode-descriptionForeground);
            opacity: 0.5;
        }

        /* File List Styles */
        .file-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .file-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: var(--border-radius-sm);
            cursor: pointer;
            transition: all var(--transition-fast);
            position: relative;
            margin: 2px 4px;
            border: 1px solid transparent;
        }

        .file-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-list-hoverBackground);
            transform: translateX(2px);
            box-shadow: var(--shadow-sm);
        }

        .file-item:active {
            background: var(--vscode-list-activeSelectionBackground);
            transform: translateX(1px);
        }

        .file-item:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: -2px;
        }

        .file-icon {
            width: 18px;
            height: 18px;
            margin-right: 10px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            border-radius: var(--border-radius-sm);
            transition: all var(--transition-fast);
        }

        .file-item:hover .file-icon {
            transform: scale(1.1);
        }

        .file-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .file-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-foreground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.3;
            transition: color var(--transition-fast);
        }

        .file-item:hover .file-name {
            color: var(--vscode-textLink-foreground);
        }

        .file-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.2;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .file-meta::before {
            content: '📅';
            font-size: 10px;
            opacity: 0.7;
        }

        .file-actions {
            display: none;
            gap: 4px;
            opacity: 0;
            transform: translateX(10px);
            transition: all var(--transition-fast);
        }

        .file-item:hover .file-actions {
            display: flex;
            opacity: 1;
            transform: translateX(0);
        }

        .file-action {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: var(--border-radius-sm);
            font-size: 12px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all var(--transition-fast);
            position: relative;
        }

        .file-action:hover {
            background: var(--vscode-toolbar-hoverBackground);
            transform: scale(1.1);
        }

        .file-action:active {
            transform: scale(0.95);
        }

        .file-action.danger:hover {
            background: rgba(255, 59, 59, 0.1);
            color: #ff3b3b;
        }

        /* Empty and Loading States */
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            padding: 32px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .empty-state-icon {
            font-size: 24px;
            opacity: 0.5;
        }

        .empty-state-text {
            line-height: 1.4;
        }

        .empty-state-hint {
            font-size: 11px;
            opacity: 0.7;
        }

        .loading {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--vscode-progressBar-background);
            border-top: 2px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .file-item {
            animation: slideIn 0.2s ease-out;
        }

        .section {
            animation: fadeIn 0.3s ease-out;
        }

        /* Responsive adjustments */
        @media (max-width: 300px) {
            .container {
                padding: 8px;
            }

            .file-item {
                padding: 6px 8px;
            }

            .file-meta {
                font-size: 10px;
            }
        }

        /* Focus and accessibility */
        .action-button:focus,
        .search-input:focus,
        .file-item:focus,
        .section-header:focus {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 1px;
        }

        /* Dark mode optimizations */
        @media (prefers-color-scheme: dark) {
            :root {
                --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
            }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
            .file-item:hover {
                border-color: var(--vscode-focusBorder);
            }

            .section:hover {
                border-color: var(--vscode-focusBorder);
            }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>MyScratchPad</h2>
            <div class="header-actions">
                <button class="action-button" onclick="refresh()" title="Refresh all scratch files" aria-label="Refresh">
                    <span>🔄</span>
                </button>
            </div>
        </div>

        <div class="search-container">
            <div class="search-wrapper">
                <input type="text" class="search-input" placeholder="Search scratch files..." oninput="handleSearch(this.value)" aria-label="Search files">
                <span class="search-icon">🔍</span>
            </div>
        </div>

        <div class="section">
            <div class="section-header" onclick="toggleSection('global')" role="button" tabindex="0" aria-expanded="false" aria-controls="global-content">
                <div style="display: flex; align-items: center;">
                    <span class="section-toggle collapsed" id="global-toggle" aria-hidden="true">▶</span>
                    <span class="section-title">Global Scratchpads</span>
                </div>
                <span class="section-count empty" id="global-count" aria-label="Global files count">0</span>
            </div>
            <div class="section-content collapsed" id="global-content" role="region" aria-labelledby="global-toggle">
                <div style="padding: 12px;">
                    <button class="action-button" onclick="createGlobalScratch()" title="Create New Global Scratch File" aria-label="Create new global scratch file">
                        <span>➕</span> New Global File
                    </button>
                </div>
                <ul class="file-list" id="global-files" role="list" aria-label="Global scratch files">
                    <li class="loading" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span>Loading global files...</span>
                    </li>
                </ul>
            </div>
        </div>

        <div class="section">
            <div class="section-header" onclick="toggleSection('workspace')" role="button" tabindex="0" aria-expanded="false" aria-controls="workspace-content">
                <div style="display: flex; align-items: center;">
                    <span class="section-toggle collapsed" id="workspace-toggle" aria-hidden="true">▶</span>
                    <span class="section-title">Workspace Scratchpads</span>
                </div>
                <span class="section-count empty" id="workspace-count" aria-label="Workspace files count">0</span>
            </div>
            <div class="section-content collapsed" id="workspace-content" role="region" aria-labelledby="workspace-toggle">
                <div style="padding: 12px;">
                    <button class="action-button" onclick="createWorkspaceScratch()" title="Create New Workspace Scratch File" aria-label="Create new workspace scratch file">
                        <span>➕</span> New Workspace File
                    </button>
                </div>
                <ul class="file-list" id="workspace-files" role="list" aria-label="Workspace scratch files">
                    <li class="loading" role="status" aria-live="polite">
                        <div class="loading-spinner" aria-hidden="true"></div>
                        <span>Loading workspace files...</span>
                    </li>
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

        // Focus management
        let lastFocusedElement = null;

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                const focused = document.activeElement;
                if (focused && focused.classList.contains('section-header')) {
                    e.preventDefault();
                    toggleSection(focused.getAttribute('data-section'));
                }
            }
        });

        // Save focus before operations
        function saveFocus() {
            lastFocusedElement = document.activeElement;
        }

        // Restore focus after operations
        function restoreFocus() {
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
        }

        function createGlobalScratch() {
            saveFocus();
            vscode.postMessage({ type: 'createGlobalScratch' });
        }

        function createWorkspaceScratch() {
            saveFocus();
            vscode.postMessage({ type: 'createWorkspaceScratch' });
        }

        function openFile(path) {
            saveFocus();
            vscode.postMessage({ type: 'openFile', path: path });
        }

        function deleteFile(file) {
            saveFocus();
            vscode.postMessage({ type: 'deleteFile', file });
        }

        function renameFile(file) {
            saveFocus();
            vscode.postMessage({ type: 'renameFile', file });
        }

        function refresh() {
            saveFocus();
            vscode.postMessage({ type: 'refresh' });
        }

        function handleSearch(query) {
            vscode.postMessage({ type: 'search', query });
        }

        function toggleSection(sectionId) {
            const content = document.getElementById(sectionId + '-content');
            const toggle = document.getElementById(sectionId + '-toggle');
            const header = content.previousElementSibling;

            sectionStates[sectionId] = !sectionStates[sectionId];

            // Update ARIA attributes
            header.setAttribute('aria-expanded', sectionStates[sectionId]);

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
            const date = new Date(timestamp);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (diffDays <= 7) {
                return date.toLocaleDateString([], {weekday: 'short'}) + ' ' +
                       date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                return date.toLocaleDateString() + ' ' +
                       date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        }

        function getFileIcon(extension) {
            const icons = {
                // Programming Languages
                'js': '🟨', 'javascript': '🟨',
                'ts': '🔷', 'typescript': '🔷',
                'py': '🐍', 'python': '🐍',
                'java': '☕',
                'cpp': '⚙️', 'cxx': '⚙️', 'cc': '⚙️', 'c++': '⚙️',
                'c': '⚙️',
                'cs': '💎', 'csharp': '💎',
                'go': '🐹', 'golang': '🐹',
                'rs': '🦀', 'rust': '🦀',
                'swift': '🦉',
                'kt': '🎯', 'kotlin': '🎯',
                'dart': '🎯',
                'scala': '⚡',
                'php': '🐘',
                'rb': '💎', 'ruby': '💎',
                'lua': '🌙',
                'r': '📊',
                'sh': '⚡', 'bash': '⚡',
                'ps1': '⚡', 'powershell': '⚡',

                // Web Technologies
                'html': '🌐', 'htm': '🌐',
                'css': '🎨', 'scss': '🎨', 'sass': '🎨', 'less': '🎨',
                'jsx': '⚛️', 'tsx': '⚛️',
                'vue': '💚',
                'svelte': '🧡',
                'astro': '🚀',

                // Data & Config
                'json': '📋',
                'xml': '📄',
                'yaml': '📄', 'yml': '📄',
                'toml': '📄',
                'ini': '📄', 'cfg': '📄', 'conf': '📄',
                'env': '🔐',
                'md': '📝', 'markdown': '📝',
                'txt': '📄',
                'log': '📜',
                'sql': '🗄️',

                // Documents
                'pdf': '📕',
                'doc': '📄', 'docx': '📄',
                'xls': '📊', 'xlsx': '📊',
                'ppt': '📊', 'pptx': '📊',

                // Images & Media
                'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️',
                'svg': '🖼️', 'webp': '🖼️',
                'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
                'mp3': '🎵', 'wav': '🎵',

                // Archives
                'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',

                // Special files
                'gitignore': '🚫',
                'readme': '📖', 'license': '📋',
                'dockerfile': '🐳',
                'makefile': '⚙️'
            };

            const normalizedExt = extension.toLowerCase();
            return icons[normalizedExt] || '📄';
        }
        
        function renderFileList(files, containerId) {
            const container = document.getElementById(containerId);
            const countElement = document.getElementById(containerId.replace('-files', '-count'));

            // Update count with animation
            const currentCount = parseInt(countElement.textContent) || 0;
            const newCount = files.length;

            countElement.textContent = newCount;
            countElement.classList.toggle('empty', newCount === 0);

            // Clear container
            container.innerHTML = '';

            if (files.length === 0) {
                const emptyState = document.createElement('li');
                emptyState.className = 'empty-state';

                const iconDiv = document.createElement('div');
                iconDiv.className = 'empty-state-icon';
                iconDiv.textContent = '📝';

                const textDiv = document.createElement('div');
                textDiv.className = 'empty-state-text';
                textDiv.textContent = 'No files found';

                const hintDiv = document.createElement('div');
                hintDiv.className = 'empty-state-hint';
                hintDiv.textContent = 'Create your first scratch file to get started!';

                emptyState.appendChild(iconDiv);
                emptyState.appendChild(textDiv);
                emptyState.appendChild(hintDiv);

                container.appendChild(emptyState);
                return;
            }

            // Sort files by modification date (newest first)
            const sortedFiles = [...files].sort((a, b) => b.lastModified - a.lastModified);

            // Build DOM nodes with improved accessibility
            sortedFiles.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.role = 'listitem';
                li.tabIndex = 0;
                li.setAttribute('aria-label', 'File: ' + file.name + ', extension: ' + file.extension + ', modified: ' + formatDate(file.lastModified));
                li.setAttribute('data-file-index', index);

                // Keyboard navigation
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openFile(file.path);
                    }
                });

                li.addEventListener('click', () => {
                    openFile(file.path);
                });

                const iconSpan = document.createElement('span');
                iconSpan.className = 'file-icon';
                iconSpan.textContent = getFileIcon(file.extension);
                iconSpan.setAttribute('aria-hidden', 'true');

                const infoDiv = document.createElement('div');
                infoDiv.className = 'file-info';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'file-name';
                nameDiv.title = file.name;
                nameDiv.textContent = file.name;

                const metaDiv = document.createElement('div');
                metaDiv.className = 'file-meta';
                metaDiv.textContent = formatDate(file.lastModified);

                infoDiv.appendChild(nameDiv);
                infoDiv.appendChild(metaDiv);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'file-actions';

                const renameBtn = document.createElement('button');
                renameBtn.className = 'file-action';
                renameBtn.title = 'Rename file';
                renameBtn.setAttribute('aria-label', 'Rename ' + file.name);
                renameBtn.innerHTML = '✏️';
                renameBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    renameFile(file);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'file-action danger';
                deleteBtn.title = 'Delete file';
                deleteBtn.setAttribute('aria-label', 'Delete ' + file.name);
                deleteBtn.innerHTML = '🗑️';
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
                    restoreFocus();
                    break;
                case 'searchResults':
                    renderFileList(message.globalFiles, 'global-files');
                    renderFileList(message.workspaceFiles, 'workspace-files');
                    break;
                case 'openResult':
                    if (message.success) {
                        restoreFocus();
                    }
                    break;
            }
        });

        // Initialize section headers with data attributes
        function initializeSections() {
            const globalHeader = document.querySelector('.section-header[onclick*="global"]');
            const workspaceHeader = document.querySelector('.section-header[onclick*="workspace"]');

            if (globalHeader) globalHeader.setAttribute('data-section', 'global');
            if (workspaceHeader) workspaceHeader.setAttribute('data-section', 'workspace');
        }

        // Send ready message when page is fully loaded
        window.addEventListener('DOMContentLoaded', () => {
            initializeSections();
            vscode.postMessage({ type: 'ready' });
        });

        // Fallback in case DOMContentLoaded already fired
        if (document.readyState === 'loading') {
            // Still loading, wait for DOMContentLoaded
        } else {
            // Already loaded
            initializeSections();
            vscode.postMessage({ type: 'ready' });
        }

        // Add keyboard navigation for sections
        document.addEventListener('keydown', function(e) {
            if (e.target.closest('.section-header')) {
                const header = e.target.closest('.section-header');
                const sectionId = header.getAttribute('data-section');

                if ((e.key === 'Enter' || e.key === ' ') && sectionId) {
                    e.preventDefault();
                    toggleSection(sectionId);
                }
            }
        });

        // Auto-focus search input when typing starts (if no input is focused)
        document.addEventListener('keydown', function(e) {
            const searchInput = document.querySelector('.search-input');
            const activeElement = document.activeElement;

            // If typing letters/numbers and not in an input/textarea/button
            if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) &&
                !['INPUT', 'TEXTAREA', 'BUTTON'].includes(activeElement.tagName) &&
                activeElement !== searchInput) {
                searchInput.focus();
                searchInput.value = e.key;
                e.preventDefault();
            }
        });
    </script>
</body>
</html>`;
  }
}
