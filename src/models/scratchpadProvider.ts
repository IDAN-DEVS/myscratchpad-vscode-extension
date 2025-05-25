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

  constructor(private scratchpadDir: string, public readonly scope: string = "global") {
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
      const files = fs.readdirSync(this.scratchpadDir);

      return files
        .filter(
          (file) =>
            !fs.statSync(path.join(this.scratchpadDir, file)).isDirectory()
        )
        .map((file) => {
          const filePath = path.join(this.scratchpadDir, file);
          const stats = fs.statSync(filePath);
          const extension = path.extname(file).slice(1); // Remove the dot
          const name = path.basename(file);

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
        })
        .sort(
          (a, b) => b.scratchFile.lastModified - a.scratchFile.lastModified
        ); // Sort by last modified (newest first)
    } catch (error) {
      console.error("Error reading scratchpad directory:", error);
      return [];
    }
  }
}
