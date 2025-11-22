import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { StorageHelper, MigrationConfig } from "./storageHelpers";
import { MigrationWebviewProvider } from "../views/migrationWebviewProvider";

export interface MigrationResult {
  success: boolean;
  migratedFiles: number;
  errors: string[];
  oldPathsScanned: string[];
}

export class MigrationService {
  private static readonly MIGRATION_COMMAND =
    "myscratchpad.showMigrationDialog";
  private static readonly CLEANUP_COMMAND = "myscratchpad.cleanupOldFiles";
  private static migrationWebviewProvider: MigrationWebviewProvider | undefined;

  /**
   * Initialize migration check on extension activation
   */
  static async initializeMigrationCheck(
    context: vscode.ExtensionContext
  ): Promise<void> {
    // Check if migration has already been completed
    if (StorageHelper.isMigrationCompleted()) {
      console.log("Migration already completed, skipping migration check");
      return;
    }

    // Check if we have access to home directory
    if (!StorageHelper.checkHomeDirectoryAccess()) {
      vscode.window.showErrorMessage(
        "MyScratchPad: Cannot access home directory for unified storage. " +
          "Please check permissions or contact support."
      );
      return;
    }

    // Initialize webview provider
    this.migrationWebviewProvider = new MigrationWebviewProvider(
      context.extensionUri
    );

    // Scan for existing files in old storage paths
    const { globalFiles, workspaceFiles } = StorageHelper.scanOldStoragePaths();
    const totalFiles =
      globalFiles.length + Object.values(workspaceFiles).flat().length;

    if (totalFiles === 0) {
      // No files found, mark migration as completed
      StorageHelper.markMigrationCompleted([]);
      console.log("No old files found, migration marked as completed");
      return;
    }

    // Show migration dialog
    await this.showMigrationDialog(globalFiles, workspaceFiles);
  }

  /**
   * Show migration dialog with detailed information
   */
  private static async showMigrationDialog(
    globalFiles: string[],
    workspaceFiles: { [workspaceName: string]: string[] }
  ): Promise<void> {
    if (!this.migrationWebviewProvider) {
      console.error("Migration webview provider not initialized");
      return;
    }

    try {
      const action = await this.migrationWebviewProvider.showMigrationDialog(
        globalFiles,
        workspaceFiles
      );

      switch (action) {
        case "migrate":
          await this.performMigration(globalFiles, workspaceFiles);
          break;
        case "skip":
          await this.skipMigration();
          break;
        case "cancelled":
          // User closed dialog, don't mark as completed
          break;
      }
    } catch (error) {
      console.error("Error showing migration dialog:", error);
      // Fallback to simple notification
      const action = await vscode.window.showInformationMessage(
        "MyScratchPad: Files found in old storage locations. Would you like to migrate them?",
        "Migrate Now",
        "Skip"
      );

      if (action === "Migrate Now") {
        await this.performMigration(globalFiles, workspaceFiles);
      } else if (action === "Skip") {
        await this.skipMigration();
      }
    }
  }

  /**
   * Perform the actual migration
   */
  private static async performMigration(
    globalFiles: string[],
    workspaceFiles: { [workspaceName: string]: string[] }
  ): Promise<void> {
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: "Migrating MyScratchPad files...",
      cancellable: false,
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
      const result = await this.migrateFiles(
        globalFiles,
        workspaceFiles,
        progress
      );

      if (result.success) {
        // Mark migration as completed
        const oldPaths = StorageHelper.getOldStoragePaths();
        StorageHelper.markMigrationCompleted(oldPaths);

        // Show success message with cleanup option
        await this.showMigrationSuccessDialog(result);
      } else {
        // Show error message
        await this.showMigrationErrorDialog(result);
      }
    });
  }

  /**
   * Migrate files to new structure
   */
  private static async migrateFiles(
    globalFiles: string[],
    workspaceFiles: { [workspaceName: string]: string[] },
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedFiles: 0,
      errors: [],
      oldPathsScanned: StorageHelper.getOldStoragePaths(),
    };

    try {
      // Ensure new directories exist
      StorageHelper.ensureDirectoriesExist();

      const totalFiles =
        globalFiles.length + Object.values(workspaceFiles).flat().length;
      let processedFiles = 0;

      // Migrate global files
      progress.report({ message: "Migrating global files..." });
      for (const filePath of globalFiles) {
        try {
          const fileName = path.basename(filePath);
          const newPath = path.join(
            StorageHelper.getUnifiedStoragePaths().globalScratchFiles,
            fileName
          );

          // Handle filename conflicts
          const uniqueFileName = StorageHelper.generateUniqueFilename(
            StorageHelper.getUnifiedStoragePaths().globalScratchFiles,
            fileName
          );
          const finalPath = path.join(
            StorageHelper.getUnifiedStoragePaths().globalScratchFiles,
            uniqueFileName
          );

          StorageHelper.copyFile(filePath, finalPath);
          result.migratedFiles++;
        } catch (error) {
          result.errors.push(`Failed to migrate ${filePath}: ${error}`);
        }

        processedFiles++;
        progress.report({
          message: `Migrating global files... (${processedFiles}/${totalFiles})`,
          increment: (1 / totalFiles) * 100,
        });
      }

      // Migrate workspace files
      for (const [workspaceName, files] of Object.entries(workspaceFiles)) {
        progress.report({
          message: `Migrating workspace files for ${workspaceName}...`,
        });

        for (const filePath of files) {
          try {
            const fileName = path.basename(filePath);
            const workspaceDir =
              StorageHelper.getWorkspaceScratchFilesPath(workspaceName);

            // Ensure workspace directory exists
            StorageHelper.ensureDirectoriesExist();

            // Handle filename conflicts
            const uniqueFileName = StorageHelper.generateUniqueFilename(
              workspaceDir,
              fileName
            );
            const finalPath = path.join(workspaceDir, uniqueFileName);

            StorageHelper.copyFile(filePath, finalPath);
            result.migratedFiles++;
          } catch (error) {
            result.errors.push(`Failed to migrate ${filePath}: ${error}`);
          }

          processedFiles++;
          progress.report({
            message: `Migrating workspace files... (${processedFiles}/${totalFiles})`,
            increment: (1 / totalFiles) * 100,
          });
        }
      }

      if (result.errors.length > 0) {
        result.success = false;
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration failed: ${error}`);
    }

    return result;
  }

  /**
   * Show migration success dialog
   */
  private static async showMigrationSuccessDialog(
    result: MigrationResult
  ): Promise<void> {
    if (!this.migrationWebviewProvider) {
      console.error("Migration webview provider not initialized");
      return;
    }

    try {
      const action =
        await this.migrationWebviewProvider.showMigrationSuccessDialog(result);

      switch (action) {
        case "cleanup":
          await this.showCleanupDialog();
          break;
        case "keep":
          // User chose to keep old files, no action needed
          break;
        case "cancelled":
          // User closed dialog, no action needed
          break;
      }
    } catch (error) {
      console.error("Error showing migration success dialog:", error);
      // Fallback to simple notification
      const action = await vscode.window.showInformationMessage(
        `Migration completed! ${result.migratedFiles} files migrated.`,
        "Clean Up Old Files",
        "Keep Old Files"
      );

      if (action === "Clean Up Old Files") {
        await this.showCleanupDialog();
      }
    }
  }

  /**
   * Show migration error dialog
   */
  private static async showMigrationErrorDialog(
    result: MigrationResult
  ): Promise<void> {
    const errorMessage = `❌ Migration Completed with Errors

${result.migratedFiles} files were migrated successfully, but ${
      result.errors.length
    } error${result.errors.length === 1 ? "" : "s"} occurred.

Errors:
${result.errors.slice(0, 5).join("\n")}
${
  result.errors.length > 5
    ? `\n... and ${result.errors.length - 5} more errors`
    : ""
}

Your files are partially migrated. You can try the migration again or contact support.`;

    await vscode.window.showErrorMessage(
      errorMessage,
      "Retry Migration",
      "View Errors"
    );
  }

  /**
   * Show cleanup dialog
   */
  private static async showCleanupDialog(): Promise<void> {
    const message = `🗑️ Clean Up Old Files

Would you like to delete the old scratch files to free up disk space?

This will permanently remove files from the old IDE-specific storage locations:
• VS Code globalStorage
• Cursor globalStorage  
• Windsurf globalStorage
• Code - Insiders globalStorage

⚠️ This action cannot be undone!`;

    const action = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      "Delete Old Files",
      "Keep Old Files"
    );

    if (action === "Delete Old Files") {
      await this.performCleanup();
    }
  }

  /**
   * Perform cleanup of old files
   */
  private static async performCleanup(): Promise<void> {
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: "Cleaning up old files...",
      cancellable: false,
    };

    await vscode.window.withProgress(progressOptions, async (progress) => {
      const oldPaths = StorageHelper.getOldStoragePaths();
      let cleanedPaths = 0;

      for (const oldPath of oldPaths) {
        try {
          if (fs.existsSync(oldPath)) {
            StorageHelper.deletePath(oldPath);
            cleanedPaths++;
          }
        } catch (error) {
          console.error(`Error cleaning up ${oldPath}:`, error);
        }

        progress.report({
          message: `Cleaning up old files... (${cleanedPaths}/${oldPaths.length})`,
          increment: (1 / oldPaths.length) * 100,
        });
      }

      vscode.window.showInformationMessage(
        `✅ Cleanup completed! Removed ${cleanedPaths} old storage location${
          cleanedPaths === 1 ? "" : "s"
        }.`
      );
    });
  }

  /**
   * Open new storage location in file explorer
   */
  private static async openNewStorageLocation(): Promise<void> {
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

  /**
   * Skip migration
   */
  private static async skipMigration(): Promise<void> {
    const action = await vscode.window.showWarningMessage(
      "Migration Skipped",
      "You can migrate later using the command palette (Ctrl+Shift+P → 'MyScratchPad: Migrate Storage')",
      "Migrate Now",
      "Don't Show Again"
    );

    if (action === "Migrate Now") {
      const { globalFiles, workspaceFiles } =
        StorageHelper.scanOldStoragePaths();
      await this.showMigrationDialog(globalFiles, workspaceFiles);
    } else if (action === "Don't Show Again") {
      // Mark as completed to prevent future prompts
      StorageHelper.markMigrationCompleted([]);
    }
  }

  /**
   * Register migration commands
   */
  static registerCommands(context: vscode.ExtensionContext): void {
    // Manual migration command
    const migrateCommand = vscode.commands.registerCommand(
      "myscratchpad.migrateStorage",
      async () => {
        // Initialize webview provider if not already done
        if (!this.migrationWebviewProvider) {
          const extension = vscode.extensions.getExtension(
            "jccoder.myscratchpad"
          );
          if (extension) {
            this.migrationWebviewProvider = new MigrationWebviewProvider(
              extension.extensionUri
            );
          } else {
            vscode.window.showErrorMessage("Extension not found");
            return;
          }
        }

        const { globalFiles, workspaceFiles } =
          StorageHelper.scanOldStoragePaths();
        const totalFiles =
          globalFiles.length + Object.values(workspaceFiles).flat().length;

        if (totalFiles === 0) {
          vscode.window.showInformationMessage("No files found to migrate.");
          return;
        }

        await this.showMigrationDialog(globalFiles, workspaceFiles);
      }
    );

    // Cleanup command
    const cleanupCommand = vscode.commands.registerCommand(
      "myscratchpad.cleanupOldFiles",
      async () => {
        await this.showCleanupDialog();
      }
    );

    context.subscriptions.push(migrateCommand, cleanupCommand);
  }
}
