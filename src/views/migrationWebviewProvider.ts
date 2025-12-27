import * as vscode from "vscode";
import * as path from "path";
import { StorageHelper } from "../services/storageHelpers";

export interface MigrationData {
  globalFiles: string[];
  workspaceFiles: { [workspaceName: string]: string[] };
  totalFiles: number;
}

export interface MigrationResult {
  success: boolean;
  migratedFiles: number;
  errors: string[];
}

export class MigrationWebviewProvider {
  public static readonly viewType = "myscratchpad.migrationView";
  private _panel: vscode.WebviewPanel | undefined;
  private _extensionUri: vscode.Uri;
  private _migrationData: MigrationData | undefined;
  private _migrationResult: MigrationResult | undefined;
  private _resolveMigration: ((action: string) => void) | undefined;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public async showMigrationDialog(
    globalFiles: string[],
    workspaceFiles: { [workspaceName: string]: string[] }
  ): Promise<string> {
    const totalFiles =
      globalFiles.length + Object.values(workspaceFiles).flat().length;
    this._migrationData = {
      globalFiles,
      workspaceFiles,
      totalFiles,
    };

    return new Promise((resolve) => {
      this._resolveMigration = resolve;
      this.createWebviewPanel();
    });
  }

  public async showMigrationSuccessDialog(
    result: MigrationResult
  ): Promise<string> {
    this._migrationResult = result;

    return new Promise((resolve) => {
      this._resolveMigration = resolve;
      this.createWebviewPanel();
    });
  }

  private createWebviewPanel() {
    if (this._panel) {
      this._panel.reveal(vscode.ViewColumn.One);
      return;
    }

    this._panel = vscode.window.createWebviewPanel(
      MigrationWebviewProvider.viewType,
      "MyScratchPad Migration",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true,
      }
    );

    this._panel.webview.html = this.getWebviewContent();

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "migrate":
            this._resolveMigration?.("migrate");
            this.dispose();
            break;
          case "skip":
            this._resolveMigration?.("skip");
            this.dispose();
            break;
          case "learnMore":
            this.showLearnMoreDialog();
            break;
          case "viewNewLocation":
            this.openNewStorageLocation();
            break;
          case "cleanupOldFiles":
            this._resolveMigration?.("cleanup");
            this.dispose();
            break;
          case "keepOldFiles":
            this._resolveMigration?.("keep");
            this.dispose();
            break;
          case "viewNewLocationSuccess":
            this.openNewStorageLocation();
            break;
        }
      },
      undefined,
      []
    );

    this._panel.onDidDispose(
      () => {
        this._panel = undefined;
        if (this._resolveMigration) {
          this._resolveMigration("cancelled");
        }
      },
      undefined,
      []
    );
  }

  private async showLearnMoreDialog() {
    const learnMoreHtml = this.getLearnMoreContent();

    if (this._panel) {
      this._panel.webview.html = learnMoreHtml;
    }
  }

  private async openNewStorageLocation() {
    const paths = StorageHelper.getUnifiedStoragePaths();
    const uri = vscode.Uri.file(paths.unifiedRoot);

    try {
      await vscode.commands.executeCommand("revealFileInOS", uri);
    } catch (error) {
      vscode.window.showInformationMessage(
        `New storage location: ${paths.unifiedRoot}`
      );
    }
  }

  private getWebviewContent(): string {
    // Show success dialog if we have migration result
    if (this._migrationResult) {
      return this.getSuccessContent();
    }

    // Show migration dialog if we have migration data
    if (!this._migrationData) {
      return this.getErrorContent();
    }

    const { globalFiles, workspaceFiles, totalFiles } = this._migrationData;

    const globalFilesHtml = this.generateFilesList(
      globalFiles,
      "Global Files",
      3
    );
    const workspaceFilesHtml = this.generateWorkspaceFilesList(
      workspaceFiles,
      3
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyScratchPad Migration</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        
        .icon {
            font-size: 24px;
            margin-right: 12px;
        }
        
        .title {
            font-size: 20px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .content {
            margin-bottom: 25px;
        }
        
        .description {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .file-count {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 15px;
        }
        
        .benefits {
            margin: 15px 0;
        }
        
        .benefits ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .benefits li {
            margin: 8px 0;
        }
        
        .files-section {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 25px;
        }
        
        .files-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
        }
        
        .file-list {
            margin: 10px 0;
        }
        
        .file-item {
            padding: 4px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
        }
        
        .file-count-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
        }
        
        .workspace-group {
            margin: 15px 0;
        }
        
        .workspace-name {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 8px;
        }
        
        .more-files {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-top: 8px;
        }
        
        .actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-link {
            background: none;
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }
        
        .btn-link:hover {
            color: var(--vscode-textLink-activeForeground);
        }
        
        .warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            color: var(--vscode-inputValidation-warningForeground);
            padding: 12px;
            border-radius: 4px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🔄</div>
            <div class="title">MyScratchPad Storage Migration Required</div>
        </div>
        
        <div class="content">
            <div class="file-count">
                We found ${totalFiles} scratch file${
      totalFiles === 1 ? "" : "s"
    } in your old storage location${totalFiles === 1 ? "" : "s"}.
            </div>
            
            <div class="description">
                <p>To ensure your scratch files are synced across all IDEs (VS Code, Cursor, Windsurf, etc.), we need to move them to a unified location in your home directory.</p>
                
                <div class="benefits">
                    <p><strong>This is a one-time migration that will:</strong></p>
                    <ul>
                        <li>Move all files to <code>~/.myscratchpad-extension/</code></li>
                        <li>Enable cross-IDE file synchronization</li>
                        <li>Preserve all your existing files and folder structure</li>
                    </ul>
                </div>
                
                <div class="warning">
                    <strong>Note:</strong> Your original files will be copied (not moved) during migration. You can choose to delete them after successful migration.
                </div>
            </div>
            
            <div class="files-section">
                <div class="files-title">Files to be migrated:</div>
                ${globalFilesHtml}
                ${workspaceFilesHtml}
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-link" onclick="learnMore()">Learn More</button>
            <button class="btn btn-secondary" onclick="skip()">Skip Migration</button>
            <button class="btn btn-primary" onclick="migrate()">Migrate Now</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function migrate() {
            vscode.postMessage({ command: 'migrate' });
        }
        
        function skip() {
            vscode.postMessage({ command: 'skip' });
        }
        
        function learnMore() {
            vscode.postMessage({ command: 'learnMore' });
        }
    </script>
</body>
</html>`;
  }

  private getLearnMoreContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration Information</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        
        .icon {
            font-size: 24px;
            margin-right: 12px;
        }
        
        .title {
            font-size: 20px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .content {
            margin-bottom: 25px;
        }
        
        .section {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .section h3 {
            margin-top: 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .code-block {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            margin: 10px 0;
            overflow-x: auto;
        }
        
        .actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">📚</div>
            <div class="title">Migration Information</div>
        </div>
        
        <div class="content">
            <div class="section">
                <h3>Why migrate?</h3>
                <p>Your scratch files are currently stored in IDE-specific locations, which prevents files from syncing across different IDEs. The new unified storage ensures all your files are accessible everywhere.</p>
            </div>
            
            <div class="section">
                <h3>What happens during migration?</h3>
                <ul>
                    <li>Files are copied to <code>~/.myscratchpad-extension/</code></li>
                    <li>Your original files remain untouched until you choose to clean them up</li>
                    <li>The new structure organizes files by type (global vs workspace)</li>
                </ul>
            </div>
            
            <div class="section">
                <h3>New storage structure</h3>
                <pre class="code-block"><code>
~/.myscratchpad-extension/
├── scratchfiles/
│   ├── global/          # Your global scratch files
│   └── workspaces/      # Your workspace-specific files
│       ├── project-1/
│       └── project-2/
</code></pre>
            </div>
            
            <div class="section">
                <h3>After migration</h3>
                <p>You can choose to delete the old files to free up space, or keep them as a backup. The migration preserves all file permissions and timestamps.</p>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-secondary" onclick="goBack()">Go Back</button>
            <button class="btn btn-primary" onclick="startMigration()">Start Migration</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function startMigration() {
            vscode.postMessage({ command: 'migrate' });
        }
        
        function goBack() {
            // Reload the original migration dialog
            window.location.reload();
        }
    </script>
</body>
</html>`;
  }

  private getSuccessContent(): string {
    if (!this._migrationResult) {
      return this.getErrorContent();
    }

    const { success, migratedFiles, errors } = this._migrationResult;

    if (!success) {
      return this.getErrorContent();
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration Success</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        
        .icon {
            font-size: 24px;
            margin-right: 12px;
        }
        
        .title {
            font-size: 20px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .content {
            margin-bottom: 25px;
        }
        
        .success-message {
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .file-count {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 15px;
        }
        
        .description {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-block;
            text-align: center;
        }
        
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-link {
            background: none;
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
        }
        
        .btn-link:hover {
            color: var(--vscode-textLink-activeForeground);
        }
        
        .warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            color: var(--vscode-inputValidation-warningForeground);
            padding: 12px;
            border-radius: 4px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">✅</div>
            <div class="title">Migration Completed Successfully!</div>
        </div>
        
        <div class="content">
            <div class="success-message">
                <div class="file-count">
                    ${migratedFiles} file${
      migratedFiles === 1 ? "" : "s"
    } migrated to the new unified storage location.
                </div>
                <p>Your scratch files are now synced across all IDEs!</p>
            </div>
            
            <div class="description">
                <p><strong>What's next?</strong></p>
                <p>You can now choose to clean up the old files to free up disk space, or keep them as a backup. The old files are located in your IDE-specific storage directories.</p>
                
                <div class="warning">
                    <strong>Note:</strong> Deleting old files will permanently remove them from the old storage locations. This action cannot be undone.
                </div>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-link" onclick="viewNewLocation()">View New Location</button>
            <button class="btn btn-secondary" onclick="keepOldFiles()">Keep Old Files</button>
            <button class="btn btn-primary" onclick="cleanupOldFiles()">Clean Up Old Files</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function cleanupOldFiles() {
            vscode.postMessage({ command: 'cleanupOldFiles' });
        }
        
        function keepOldFiles() {
            vscode.postMessage({ command: 'keepOldFiles' });
        }
        
        function viewNewLocation() {
            vscode.postMessage({ command: 'viewNewLocationSuccess' });
        }
    </script>
</body>
</html>`;
  }

  private getErrorContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <h2>❌ Migration Error</h2>
    <p>An error occurred while preparing the migration dialog.</p>
</body>
</html>`;
  }

  private generateFilesList(
    files: string[],
    title: string,
    maxFiles: number
  ): string {
    if (files.length === 0) {
      return "";
    }

    const displayFiles = files.slice(0, maxFiles);
    const remainingCount = files.length - maxFiles;

    let html = `
      <div class="file-list">
        <div class="files-title">📁 ${title} (${files.length})</div>
    `;

    displayFiles.forEach((file) => {
      const fileName = path.basename(file);
      html += `<div class="file-item">• ${fileName}</div>`;
    });

    if (remainingCount > 0) {
      html += `<div class="more-files">... and ${remainingCount} more</div>`;
    }

    html += `</div>`;
    return html;
  }

  private generateWorkspaceFilesList(
    workspaceFiles: { [workspaceName: string]: string[] },
    maxWorkspaces: number
  ): string {
    const workspaceEntries = Object.entries(workspaceFiles);
    if (workspaceEntries.length === 0) {
      return "";
    }

    const displayWorkspaces = workspaceEntries.slice(0, maxWorkspaces);
    const remainingWorkspaces = workspaceEntries.slice(maxWorkspaces);
    const totalRemainingFiles = remainingWorkspaces.reduce(
      (sum, [, files]) => sum + files.length,
      0
    );

    let html = `
      <div class="file-list">
        <div class="files-title">📁 Workspace Files</div>
    `;

    displayWorkspaces.forEach(([workspaceName, files]) => {
      html += `
        <div class="workspace-group">
          <div class="workspace-name">${workspaceName} <span class="file-count-badge">${files.length}</span></div>
      `;

      files.slice(0, 2).forEach((file) => {
        const fileName = path.basename(file);
        html += `<div class="file-item">• ${fileName}</div>`;
      });

      if (files.length > 2) {
        html += `<div class="more-files">... and ${
          files.length - 2
        } more</div>`;
      }

      html += `</div>`;
    });

    if (remainingWorkspaces.length > 0) {
      html += `
        <div class="more-files">
          ... and ${remainingWorkspaces.length} more workspaces (${totalRemainingFiles} files)
        </div>
      `;
    }

    html += `</div>`;
    return html;
  }

  public dispose() {
    if (this._panel) {
      this._panel.dispose();
      this._panel = undefined;
    }
  }
}
