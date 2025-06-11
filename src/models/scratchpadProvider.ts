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
  implements vscode.TreeDataProvider<ScratchpadItem>, vscode.TreeDragAndDropController<ScratchpadItem>
{
  // Drag and drop mime types - will be set in constructor
  dropMimeTypes: string[];
  dragMimeTypes: string[];
  
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
    // Set drag and drop mime types based on scope
    this.dropMimeTypes = [`application/vnd.code.tree.scratchpad.${this.scope}`];
    this.dragMimeTypes = [`application/vnd.code.tree.scratchpad.${this.scope}`];
    
    // Ensure the scratchpad directory exists
    if (!fs.existsSync(scratchpadDir)) {
      fs.mkdirSync(scratchpadDir, { recursive: true });
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * Expand a folder by its path
   */
  async expandFolder(folderPath: string, treeView: vscode.TreeView<ScratchpadItem>): Promise<void> {
    // Find the folder item that matches the path
    const allItems = await this.getScratchItems();
    const folderItem = this.findFolderByPath(allItems, folderPath);
    
    if (folderItem) {
      // Reveal and expand the folder
      await treeView.reveal(folderItem, { expand: true, focus: false, select: false });
    }
  }

  private findFolderByPath(items: ScratchpadItem[], targetPath: string): ScratchpadFolderItem | undefined {
    for (const item of items) {
      if (item instanceof ScratchpadFolderItem) {
        if (item.scratchFolder.path === targetPath) {
          return item;
        }
        // Also check if this is a relative path match within our scratchpad directory
        const relativePath = path.relative(this.scratchpadDir, targetPath);
        const itemRelativePath = path.relative(this.scratchpadDir, item.scratchFolder.path);
        if (relativePath === itemRelativePath) {
          return item;
        }
      }
    }
    return undefined;
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

  getParent(element: ScratchpadItem): ScratchpadItem | undefined {
    if (element instanceof ScratchpadFolderItem) {
      // Check if this folder is at root level
      const parentPath = path.dirname(element.scratchFolder.path);
      if (parentPath === this.scratchpadDir || this.isAtRootLevel(element.scratchFolder.path)) {
        return undefined; // Root level folder
      }
      
      // Find parent folder
      return this.findParentFolder(element.scratchFolder.path);
    } else {
      // For files, find the parent folder
      const parentPath = path.dirname(element.scratchFile.path);
      if (parentPath === this.scratchpadDir || this.isAtRootLevel(element.scratchFile.path)) {
        return undefined; // Root level file
      }
      
      return this.findParentFolder(element.scratchFile.path);
    }
  }

  private isAtRootLevel(itemPath: string): boolean {
    // Check if the item is at the root level by comparing directory levels
    const relativePath = path.relative(this.scratchpadDir, itemPath);
    const pathSegments = relativePath.split(path.sep).filter(segment => segment !== '');
    
    // If there's only one segment (the item name), it's at root level
    return pathSegments.length <= 1;
  }

  private findParentFolder(itemPath: string): ScratchpadFolderItem | undefined {
    const parentPath = path.dirname(itemPath);
    
    // Try to find the parent folder in our current items
    // Note: This is a simplified approach. In a real implementation, you might need
    // to cache the tree structure or implement a more sophisticated lookup
    const parentName = path.basename(parentPath);
    
    // Create a mock parent folder item for the reveal functionality
    // This works because reveal only needs the path information
    if (fs.existsSync(parentPath) && fs.statSync(parentPath).isDirectory()) {
      const stats = fs.statSync(parentPath);
      const scratchFolder: IScratchFolder = {
        name: parentName,
        path: parentPath,
        created: stats.birthtime.getTime(),
        lastModified: stats.mtime.getTime(),
      };
      
      return new ScratchpadFolderItem(
        scratchFolder,
        vscode.TreeItemCollapsibleState.Collapsed
      );
    }
    
    return undefined;
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

  // Drag and drop implementation
  public async handleDrag(source: ScratchpadItem[], treeDataTransfer: vscode.DataTransfer): Promise<void> {
    // Store the dragged items in the data transfer
    const draggedItems = source.map(item => ({
      isFolder: item instanceof ScratchpadFolderItem,
      path: item instanceof ScratchpadFolderItem ? item.scratchFolder.path : item.scratchFile.path,
      name: item instanceof ScratchpadFolderItem ? item.scratchFolder.name : item.scratchFile.name
    }));
    
    treeDataTransfer.set(this.dragMimeTypes[0], new vscode.DataTransferItem(draggedItems));
  }

  public async handleDrop(target: ScratchpadItem | undefined, sources: vscode.DataTransfer): Promise<void> {
    const transferItem = sources.get(this.dropMimeTypes[0]);
    if (!transferItem) {
      return;
    }

    const draggedItems: Array<{isFolder: boolean, path: string, name: string}> = transferItem.value;
    
    // Determine target directory - always use the main scratchpad directory structure
    let targetDir: string;
    
    if (!target) {
      // Dropped on empty space - move to root
      targetDir = this.scratchpadDir;
    } else if (target instanceof ScratchpadFolderItem) {
      // Dropped on folder - need to find the corresponding folder in our scratchpad directory
      const folderName = target.scratchFolder.name;
      targetDir = path.join(this.scratchpadDir, folderName);
    } else {
      // Dropped on file - move to the same directory as the file would be in our scratchpad directory
      const fileDir = path.dirname(target.scratchFile.path);
      // Extract the relative path from the IDE-specific directory structure
      const relativePath = this.getRelativePathFromScratchpadDir(fileDir);
      targetDir = path.join(this.scratchpadDir, relativePath);
    }

    // Move each dragged item to the main scratchpad directory
    for (const draggedItem of draggedItems) {
      await this.moveItem(draggedItem.path, draggedItem.name, targetDir, draggedItem.isFolder);
    }

    // Refresh the tree view
    this.refresh();
  }

  private getRelativePathFromScratchpadDir(fullPath: string): string {
    // Extract the relative path by finding the common structure
    // This handles the cross-IDE directory aggregation
    const parts = fullPath.split(path.sep);
    const scratchpadDirParts = this.scratchpadDir.split(path.sep);
    
    // Find where the paths diverge and get the relative portion
    let relativeParts: string[] = [];
    let foundScratchFiles = false;
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === 'scratchFiles' || parts[i] === 'workspaceScratchFiles') {
        foundScratchFiles = true;
        // Skip the scratchFiles part and get everything after
        relativeParts = parts.slice(i + 1);
        break;
      }
    }
    
    return foundScratchFiles ? relativeParts.join(path.sep) : '';
  }

  private async moveItem(sourcePath: string, itemName: string, targetDir: string, isFolder: boolean): Promise<void> {
    try {
      const targetPath = path.join(targetDir, itemName);
      
      // Check if target already exists
      if (fs.existsSync(targetPath)) {
        vscode.window.showErrorMessage(`Cannot move ${itemName}: An item with this name already exists in the target location.`);
        return;
      }

      // Check if we're trying to move an item into itself or its subdirectory
      if (isFolder && targetPath.startsWith(sourcePath + path.sep)) {
        vscode.window.showErrorMessage(`Cannot move folder into itself or its subdirectory.`);
        return;
      }

      // Check if source and target are the same
      if (sourcePath === targetPath) {
        return; // No need to move
      }

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Move the item
      fs.renameSync(sourcePath, targetPath);
      
      const itemType = isFolder ? 'folder' : 'file';
      vscode.window.showInformationMessage(`Moved ${itemType} "${itemName}" successfully.`);
    } catch (error) {
      console.error(`Failed to move item:`, error);
      vscode.window.showErrorMessage(`Failed to move ${itemName}: ${error}`);
    }
  }
}
