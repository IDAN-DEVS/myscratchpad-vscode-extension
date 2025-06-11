import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { IScratchFile, getFileTypeIcon } from "./scratchFile";

export interface IScratchFolder {
  name: string;
  path: string;
  created: number;
  lastModified: number;
}

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

export class ScratchpadFolderItem extends vscode.TreeItem {
  constructor(
    public readonly scratchFolder: IScratchFolder,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(scratchFolder.name, collapsibleState);

    // Set folder icon
    this.iconPath = vscode.ThemeIcon.Folder;

    // Contextual data for commands
    this.contextValue = "scratchFolder";

    // Set tooltip
    const created = new Date(scratchFolder.created).toLocaleString();
    const modified = new Date(scratchFolder.lastModified).toLocaleString();
    this.tooltip = `${scratchFolder.name}\nFolder\nCreated: ${created}\nLast Modified: ${modified}`;
  }
}

export type ScratchpadItem = ScratchpadTreeItem | ScratchpadFolderItem;

export class ScratchpadProvider
  implements vscode.TreeDataProvider<ScratchpadItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ScratchpadItem | undefined | null | void
  > = new vscode.EventEmitter<ScratchpadItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ScratchpadItem | undefined | null | void
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

  getTreeItem(element: ScratchpadItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ScratchpadItem): Promise<ScratchpadItem[]> {
    if (!element) {
      // Root level - get all scratch items from all IDE directories
      return this.getScratchItems();
    } else if (element instanceof ScratchpadFolderItem) {
      // Get children of a folder
      return this.getScratchItemsFromDirectory(element.scratchFolder.path);
    } else {
      // Files have no children
      return [];
    }
  }

  private getScratchItems(): ScratchpadItem[] {
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

      // Get all items from all IDE paths
      const allItems: ScratchpadItem[] = [];
      const uniqueItemNames = new Set<string>();

      idePaths.forEach((idePath) => {
        if (fs.existsSync(idePath)) {
          const ideItems = this.getItemsFromDirectory(idePath);

          // Add items, filtering by unique item names
          ideItems.forEach((item) => {
            const itemName = item instanceof ScratchpadTreeItem 
              ? item.scratchFile.name 
              : item.scratchFolder.name;
            
            if (!uniqueItemNames.has(itemName)) {
              uniqueItemNames.add(itemName);
              allItems.push(item);
            }
          });
        }
      });

      return this.sortItems(allItems);
    } catch (error) {
      console.error("Error reading scratchpad directory:", error);
      return [];
    }
  }

  private getScratchItemsFromDirectory(dirPath: string): ScratchpadItem[] {
    try {
      const items = this.getItemsFromDirectory(dirPath);
      return this.sortItems(items);
    } catch (error) {
      console.error("Error reading directory:", error);
      return [];
    }
  }

  private getItemsFromDirectory(dirPath: string): ScratchpadItem[] {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    const items: ScratchpadItem[] = [];
    const dirEntries = fs.readdirSync(dirPath);

    dirEntries.forEach((entry) => {
      const fullPath = path.join(dirPath, entry);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Create folder item
        const scratchFolder: IScratchFolder = {
          name: entry,
          path: fullPath,
          created: stats.birthtime.getTime(),
          lastModified: stats.mtime.getTime(),
        };

        items.push(
          new ScratchpadFolderItem(
            scratchFolder,
            vscode.TreeItemCollapsibleState.Collapsed
          )
        );
      } else {
        // Create file item
        const extension = path.extname(entry).slice(1); // Remove the dot
        const scratchFile: IScratchFile = {
          name: entry,
          extension,
          path: fullPath,
          created: stats.birthtime.getTime(),
          lastModified: stats.mtime.getTime(),
        };

        items.push(
          new ScratchpadTreeItem(
            scratchFile,
            vscode.TreeItemCollapsibleState.None
          )
        );
      }
    });

    return items;
  }

  private sortItems(items: ScratchpadItem[]): ScratchpadItem[] {
    return items.sort((a, b) => {
      const aIsFolder = a instanceof ScratchpadFolderItem;
      const bIsFolder = b instanceof ScratchpadFolderItem;

      // Sort folders first, then files
      if (aIsFolder && !bIsFolder) {
        return -1;
      }
      if (!aIsFolder && bIsFolder) {
        return 1;
      }

      if (aIsFolder) {
        // both folders - sort alphabetically
        return (a.label as string).localeCompare(b.label as string)
      } else {
        // both files
        return (b as ScratchpadTreeItem).scratchFile.lastModified - (a as ScratchpadTreeItem).scratchFile.lastModified
      }
    });
  }
}
