// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { ScratchpadProvider } from "./models/scratchpadProvider";
import { ScratchpadService } from "./services/scratchpadService";
import { IScratchFile } from "./models/scratchFile";
import { ScratchpadWebviewProvider } from "./views/scratchpadWebviewProvider";
import { StorageHelper } from "./services/storageHelpers";
import { MigrationService } from "./services/migrationService";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "MyScratchPad" is now active!');

  // Initialize migration check first
  MigrationService.initializeMigrationCheck(context);

  // Get unified storage paths
  const storagePaths = StorageHelper.getUnifiedStoragePaths();

  // Get workspace folder name for unique directory naming
  const workspaceFolderPath = vscode.workspace.workspaceFolders
    ? path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath)
    : "default";

  // Create workspace-specific scratchpad directory path
  const workspaceScratchpadDir =
    StorageHelper.getWorkspaceScratchFilesPath(workspaceFolderPath);

  // Ensure all directories exist
  StorageHelper.ensureDirectoriesExist();

  // Initialize providers and services for both views
  const globalScratchpadProvider = new ScratchpadProvider(
    storagePaths.globalScratchFiles,
    "global"
  );
  const globalScratchpadService = new ScratchpadService(
    storagePaths.globalScratchFiles,
    "global"
  );

  const workspaceScratchpadProvider = new ScratchpadProvider(
    workspaceScratchpadDir,
    "workspace"
  );
  const workspaceScratchpadService = new ScratchpadService(
    workspaceScratchpadDir,
    "workspace"
  );

  // Register webview provider instead of tree views
  const webviewProvider = new ScratchpadWebviewProvider(
    context.extensionUri,
    storagePaths.globalScratchFiles,
    workspaceScratchpadDir,
    globalScratchpadService,
    workspaceScratchpadService
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ScratchpadWebviewProvider.viewType,
      webviewProvider
    )
  );

  // Set up file watchers for automatic refresh when files change
  const setupFileWatchers = () => {
    try {
      // Watch global scratchpad directory
      const globalWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(storagePaths.globalScratchFiles, "**/*")
      );

      // Watch workspace scratchpad directory
      const workspaceWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceScratchpadDir, "**/*")
      );

      // Refresh on file changes with a small debounce to prevent excessive refreshes
      let refreshTimeout: NodeJS.Timeout | undefined;
      const refreshHandler = () => {
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(() => {
          webviewProvider.refresh();
        }, 100);
      };

      globalWatcher.onDidChange(refreshHandler);
      globalWatcher.onDidCreate(refreshHandler);
      globalWatcher.onDidDelete(refreshHandler);

      workspaceWatcher.onDidChange(refreshHandler);
      workspaceWatcher.onDidCreate(refreshHandler);
      workspaceWatcher.onDidDelete(refreshHandler);

      // Also listen to document save events to catch file saves that might not trigger file system events immediately
      const documentSaveHandler = vscode.workspace.onDidSaveTextDocument(
        (document) => {
          const filePath = document.uri.fsPath;
          // Check if the saved file is in one of our scratchpad directories
          if (
            filePath.includes(storagePaths.globalScratchFiles) ||
            filePath.includes(workspaceScratchpadDir)
          ) {
            refreshHandler();
          }
        }
      );

      context.subscriptions.push(
        globalWatcher,
        workspaceWatcher,
        documentSaveHandler
      );
    } catch (error) {
      console.error("Error setting up file watchers:", error);
    }
  };

  // Set up file watchers after a short delay to ensure directories exist
  setTimeout(setupFileWatchers, 1000);

  // Register migration commands
  MigrationService.registerCommands(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "myscratchpad.createScratchFile",
      async () => {
        await globalScratchpadService.createScratchFile();
        webviewProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFile",
      async () => {
        await workspaceScratchpadService.createScratchFile();
        webviewProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.deleteScratchFile",
      async (item: ScratchpadProvider) => {
        const treeItem = item as any;
        if (treeItem?.scratchFile) {
          // Determine which service to use based on file path
          const isWorkspaceFile = treeItem.scratchFile.path.includes(
            "workspaceScratchFiles"
          );
          const { service, provider } = isWorkspaceFile
            ? {
                service: workspaceScratchpadService,
                provider: workspaceScratchpadProvider,
              }
            : {
                service: globalScratchpadService,
                provider: globalScratchpadProvider,
              };

          const success = await service.deleteScratchFile(
            treeItem.scratchFile as IScratchFile
          );
          if (success) {
            webviewProvider.refresh();
          }
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.renameScratchFile",
      async (item: ScratchpadProvider) => {
        const treeItem = item as any;
        if (treeItem?.scratchFile) {
          // Determine which service to use based on file path
          const isWorkspaceFile = treeItem.scratchFile.path.includes(
            "workspaceScratchFiles"
          );
          const { service, provider } = isWorkspaceFile
            ? {
                service: workspaceScratchpadService,
                provider: workspaceScratchpadProvider,
              }
            : {
                service: globalScratchpadService,
                provider: globalScratchpadProvider,
              };

          const success = await service.renameScratchFile(
            treeItem.scratchFile as IScratchFile
          );
          if (success) {
            webviewProvider.refresh();
          }
        }
      }
    ),

    vscode.commands.registerCommand("myscratchpad.refreshScratchpad", () => {
      webviewProvider.refresh();
    }),

    vscode.commands.registerCommand(
      "myscratchpad.refreshWorkspaceScratchpad",
      () => {
        webviewProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createScratchFileFromSelection",
      async () => {
        await globalScratchpadService.createScratchFileFromSelection();
        webviewProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFileFromSelection",
      async () => {
        await workspaceScratchpadService.createScratchFileFromSelection();
        webviewProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createScratchFileFromFile",
      async (fileUri: vscode.Uri) => {
        await globalScratchpadService.createScratchFileFromFile(fileUri);
        webviewProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFileFromFile",
      async (fileUri: vscode.Uri) => {
        await workspaceScratchpadService.createScratchFileFromFile(fileUri);
        webviewProvider.refresh();
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
