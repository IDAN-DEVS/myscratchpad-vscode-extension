// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { ScratchpadProvider, IScratchFolder } from "./models/scratchpadProvider";
import { ScratchpadService } from "./services/scratchpadService";
import { IScratchFile } from "./models/scratchFile";
import { codyService } from "./services/thirdParties/codyService";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "MyScratchPad" is now active!');

  // Create the global scratchpad directory
  const globalScratchpadDir = path.join(
    context.globalStorageUri.fsPath,
    "scratchFiles"
  );

  // Get workspace folder name for unique directory naming
  let workspaceFolderPath = vscode.workspace.workspaceFolders
    ? path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath)
    : "default";

  // Create workspace-specific scratchpad directory
  const workspaceScratchpadDir = vscode.workspace.workspaceFolders
    ? path.join(
        context.globalStorageUri.fsPath,
        "workspaceScratchFiles",
        workspaceFolderPath
      )
    : path.join(context.globalStorageUri.fsPath, "workspaceScratchFiles");

  // Initialize providers and services for both views
  const globalScratchpadProvider = new ScratchpadProvider(
    globalScratchpadDir,
    "global"
  );
  const globalScratchpadService = new ScratchpadService(
    globalScratchpadDir,
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

  // Register tree data providers
  const globalTreeView = vscode.window.createTreeView("scratchpadExplorer", {
    treeDataProvider: globalScratchpadProvider,
    showCollapseAll: true,
    canSelectMany: true,
    dragAndDropController: globalScratchpadProvider,
  });

  const workspaceTreeView = vscode.window.createTreeView(
    "workspaceScratchpadExplorer",
    {
      treeDataProvider: workspaceScratchpadProvider,
      showCollapseAll: true,
      canSelectMany: true,
      dragAndDropController: workspaceScratchpadProvider,
    }
  );

  // Track current selections
  let currentGlobalSelection: any = undefined;
  let currentWorkspaceSelection: any = undefined;

  // Helper function to get base path from selected item
  function getBasePath(selectedItem: any): string | undefined {
    if (!selectedItem) return undefined;
    
    // If it's a folder, use its path
    if (selectedItem.scratchFolder) {
      return selectedItem.scratchFolder.path;
    }
    
    // If it's a file, use its parent directory
    if (selectedItem.scratchFile) {
      return path.dirname(selectedItem.scratchFile.path);
    }
    
    return undefined;
  }

  // Listen for selection changes in global tree view
  globalTreeView.onDidChangeSelection(e => {
    currentGlobalSelection = e.selection[0]
  });

  // Listen for selection changes in workspace tree view
  workspaceTreeView.onDidChangeSelection(e => {
    currentWorkspaceSelection = e.selection[0]
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "myscratchpad.createScratchFile",
      async (item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        
        await globalScratchpadService.createScratchFile(undefined, undefined, parentFolderPath);
        globalScratchpadProvider.refresh();
        
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
          await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFile",
      async (item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection;
        const parentFolderPath = getBasePath(targetItem);
        
        await workspaceScratchpadService.createScratchFile(undefined, undefined, parentFolderPath);
        workspaceScratchpadProvider.refresh();
        
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
          await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.deleteScratchFile",
      async (item: ScratchpadProvider) => {
        const treeItem = item as any;
        
        // Handle file deletion
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
            provider.refresh();
          }
        }
        // Handle folder deletion
        else if (treeItem?.scratchFolder) {
          // Determine which service to use based on folder path
          const isWorkspaceFolder = treeItem.scratchFolder.path.includes(
            "workspaceScratchFiles"
          );
          const { service, provider } = isWorkspaceFolder
            ? {
                service: workspaceScratchpadService,
                provider: workspaceScratchpadProvider,
              }
            : {
                service: globalScratchpadService,
                provider: globalScratchpadProvider,
              };

          const success = await service.deleteScratchFolder(
            treeItem.scratchFolder.path,
            treeItem.scratchFolder.name
          );
          if (success) {
            provider.refresh();
          }
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.renameScratchFile",
      async (item: ScratchpadProvider) => {
        const treeItem = item as any;
        
        // Handle file renaming
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
            provider.refresh();
          }
        }
        // Handle folder renaming
        else if (treeItem?.scratchFolder) {
          // Determine which service to use based on folder path
          const isWorkspaceFolder = treeItem.scratchFolder.path.includes(
            "workspaceScratchFiles"
          );
          const { service, provider } = isWorkspaceFolder
            ? {
                service: workspaceScratchpadService,
                provider: workspaceScratchpadProvider,
              }
            : {
                service: globalScratchpadService,
                provider: globalScratchpadProvider,
              };

          const success = await service.renameScratchFolder(
            treeItem.scratchFolder.path,
            treeItem.scratchFolder.name
          );
          if (success) {
            provider.refresh();
          }
        }
      }
    ),

    vscode.commands.registerCommand("myscratchpad.refreshScratchpad", () => {
      globalScratchpadProvider.refresh();
    }),

    vscode.commands.registerCommand(
      "myscratchpad.refreshWorkspaceScratchpad",
      () => {
        workspaceScratchpadProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createScratchFileFromSelection",
      async (item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        
        await globalScratchpadService.createScratchFileFromSelection(parentFolderPath);
        globalScratchpadProvider.refresh();
        
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
          await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFileFromSelection",
      async (item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection;
        const parentFolderPath = getBasePath(targetItem);
        
        await workspaceScratchpadService.createScratchFileFromSelection(parentFolderPath);
        workspaceScratchpadProvider.refresh();
        
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
          await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createScratchFileFromFile",
      async (fileUri: vscode.Uri, item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        
        await globalScratchpadService.createScratchFileFromFile(fileUri, parentFolderPath);
        globalScratchpadProvider.refresh();
        
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
          await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFileFromFile",
      async (fileUri: vscode.Uri, item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        
        await workspaceScratchpadService.createScratchFileFromFile(fileUri, parentFolderPath);
        workspaceScratchpadProvider.refresh();
        
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
          await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.addFileToCodyAi",
      async (fileUri: vscode.Uri) => {
        await codyService.executeMentionFileCommand(fileUri);
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createScratchFolder",
      async (item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        
        await globalScratchpadService.createScratchFolder(parentFolderPath);
        globalScratchpadProvider.refresh();
        
        // If folder was created in a subfolder, expand that parent folder
        if (parentFolderPath) {
          await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFolder", 
      async (item?: any) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        
        await workspaceScratchpadService.createScratchFolder(parentFolderPath);
        workspaceScratchpadProvider.refresh();
        
        // If folder was created in a subfolder, expand that parent folder
        if (parentFolderPath) {
          await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
      }
    ),

    globalTreeView,
    workspaceTreeView
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
