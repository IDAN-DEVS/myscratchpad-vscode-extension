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
  console.log('Congratulations, your extension "myscratchpad" is now active!');

  // Create the scratchpad directory in the global storage path
  const scratchpadDir = path.join(
    context.globalStorageUri.fsPath,
    "scratchFiles"
  );

  // Initialize the provider and service
  const scratchpadProvider = new ScratchpadProvider(scratchpadDir);
  const scratchpadService = new ScratchpadService(scratchpadDir);

  // Register the tree data provider
  const treeView = vscode.window.createTreeView("scratchpadExplorer", {
    treeDataProvider: scratchpadProvider,
    showCollapseAll: false,
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "myscratchpad.createScratchFile",
      async () => {
        await scratchpadService.createScratchFile();
        scratchpadProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.deleteScratchFile",
      async (item: ScratchpadProvider) => {
        const treeItem = item as any;
        if (treeItem?.scratchFile) {
          const success = await scratchpadService.deleteScratchFile(
            treeItem.scratchFile as IScratchFile
          );
          if (success) {
            scratchpadProvider.refresh();
          }
        }
      }
    ),

    vscode.commands.registerCommand(
      "myscratchpad.renameScratchFile",
      async (item: ScratchpadProvider) => {
        const treeItem = item as any;
        if (treeItem?.scratchFile) {
          const success = await scratchpadService.renameScratchFile(
            treeItem.scratchFile as IScratchFile
          );
          if (success) {
            scratchpadProvider.refresh();
          }
        }
      }
    ),

    vscode.commands.registerCommand("myscratchpad.refreshScratchpad", () => {
      scratchpadProvider.refresh();
    }),

    treeView
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
