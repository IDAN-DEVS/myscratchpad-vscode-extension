// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { ScratchpadProvider } from "./models/scratchpadProvider";
import { ScratchpadService } from "./services/scratchpadService";
import { IScratchFile } from "./models/scratchFile";

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
    showCollapseAll: false,
  });

  const workspaceTreeView = vscode.window.createTreeView(
    "workspaceScratchpadExplorer",
    {
      treeDataProvider: workspaceScratchpadProvider,
      showCollapseAll: false,
    }
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "myscratchpad.createScratchFile",
      async () => {
        await globalScratchpadService.createScratchFile();
        globalScratchpadProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.createWorkspaceScratchFile",
      async () => {
        await workspaceScratchpadService.createScratchFile();
        workspaceScratchpadProvider.refresh();
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
            provider.refresh();
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

    globalTreeView,
    workspaceTreeView
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
