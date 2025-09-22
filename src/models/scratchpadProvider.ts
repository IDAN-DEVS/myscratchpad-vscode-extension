import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { IScratchFile, getFileTypeIcon } from "./scratchFile";

export class ScratchpadTreeItem extends vscode.TreeItem {
  constructor(
    public readonly scratchFile: IScratchFile,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(scratchFile.name, collapsibleState);

    // Set the appropriate icon
    this.iconPath = new vscode.ThemeIcon(
      getFileTypeIcon(scratchFile.extension)
    );

    // Command to execute when clicking on the tree item
    this.command = {
      command: "vscode.open",
      title: "Open Scratch File",
      arguments: [vscode.Uri.file(scratchFile.path)],
    };

    // Contextual data for commands
    this.contextValue = "scratchFile";

    // Set tooltip
    const created = new Date(scratchFile.created).toLocaleString();
    const modified = new Date(scratchFile.lastModified).toLocaleString();
    this.tooltip = `${scratchFile.name}\nCreated: ${created}\nLast Modified: ${modified}`;

    // Set description (file extension)
    this.description = scratchFile.extension;
  }
}

export class ScratchpadProvider
  implements vscode.TreeDataProvider<ScratchpadTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ScratchpadTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ScratchpadTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ScratchpadTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor(
    private scratchpadDir: string,
    public readonly scope: string = "global"
  ) {
    // Ensure the scratchpad directory exists
    if (!fs.existsSync(scratchpadDir)) {
      fs.mkdirSync(scratchpadDir, { recursive: true });
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ScratchpadTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: ScratchpadTreeItem
  ): Promise<ScratchpadTreeItem[]> {
    if (element) {
      return []; // No children for leaf nodes
    } else {
      return this.getScratchFiles();
    }
  }

  private getScratchFiles(): ScratchpadTreeItem[] {
    try {
      // Use the new unified storage approach
      return this.getDirectoryScratchFiles(this.scratchpadDir);
    } catch (error) {
      console.error("Error reading scratchpad directory:", error);
      return [];
    }
  }

  private getDirectoryScratchFiles(dirPath: string): ScratchpadTreeItem[] {
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

      return this.processFileList(files);
    } catch (error) {
      console.error("Error reading directory:", dirPath, error);
      return [];
    }
  }

  private processFileList(files: string[]): ScratchpadTreeItem[] {
    return files
      .map((filePath) => {
        try {
          // Use fresh stats to ensure we get the latest modification time
          const stats = fs.statSync(filePath);
          const fileName = path.basename(filePath);
          const extension = path.extname(fileName).slice(1); // Remove the dot
          const name = fileName;

          const scratchFile: IScratchFile = {
            name,
            extension,
            path: filePath,
            created: stats.birthtime.getTime(),
            lastModified: stats.mtime.getTime(),
          };

          return new ScratchpadTreeItem(
            scratchFile,
            vscode.TreeItemCollapsibleState.None
          );
        } catch (error) {
          console.error("Error processing file:", filePath, error);
          return null;
        }
      })
      .filter((item): item is ScratchpadTreeItem => item !== null)
      .sort((a, b) => b.scratchFile.lastModified - a.scratchFile.lastModified); // Sort by last modified (newest first)
  }
}
