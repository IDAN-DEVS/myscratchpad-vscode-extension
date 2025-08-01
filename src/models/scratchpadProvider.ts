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
      const ideNames = ["Code", "Code - Insiders", "Cursor", "Windsurf"];

      const splitPart1 = this.scratchpadDir.split("/User/")[0];
      const splitPart2 = this.scratchpadDir.split("/User/")[1];

      // Construct the path for each IDE
      const idePaths = ideNames.map((ideName) => {
        // remove the "ide path" from part1
        const newPart1 = splitPart1.split("/").slice(0, -1).join("/");
        return path.join(newPart1, ideName, "User", splitPart2);
      });

      // Get all files from all IDE paths
      const allFiles: string[] = [];
      const uniqueFileNames = new Set<string>();

      idePaths.forEach((idePath) => {
        if (fs.existsSync(idePath)) {
          const ideFiles = fs
            .readdirSync(idePath)
            .map((file) => path.join(idePath, file))
            .filter((filePath) => !fs.statSync(filePath).isDirectory());

          // Add files, filtering by unique file names
          ideFiles.forEach((filePath) => {
            const fileName = path.basename(filePath);
            if (!uniqueFileNames.has(fileName)) {
              uniqueFileNames.add(fileName);
              allFiles.push(filePath);
            }
          });
        }
      });

      // Process all found files
      return allFiles
        .map((filePath) => {
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
