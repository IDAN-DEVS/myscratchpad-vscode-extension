/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(2));
const scratchpadProvider_1 = __webpack_require__(3);
const scratchpadService_1 = __webpack_require__(6);
const codyService_1 = __webpack_require__(7);
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    console.log('Congratulations, your extension "MyScratchPad" is now active!');
    // Create the global scratchpad directory
    const globalScratchpadDir = path.join(context.globalStorageUri.fsPath, "scratchFiles");
    // Get workspace folder name for unique directory naming
    let workspaceFolderPath = vscode.workspace.workspaceFolders
        ? path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath)
        : "default";
    // Create workspace-specific scratchpad directory
    const workspaceScratchpadDir = vscode.workspace.workspaceFolders
        ? path.join(context.globalStorageUri.fsPath, "workspaceScratchFiles", workspaceFolderPath)
        : path.join(context.globalStorageUri.fsPath, "workspaceScratchFiles");
    // Initialize providers and services for both views
    const globalScratchpadProvider = new scratchpadProvider_1.ScratchpadProvider(globalScratchpadDir, "global");
    const globalScratchpadService = new scratchpadService_1.ScratchpadService(globalScratchpadDir, "global");
    const workspaceScratchpadProvider = new scratchpadProvider_1.ScratchpadProvider(workspaceScratchpadDir, "workspace");
    const workspaceScratchpadService = new scratchpadService_1.ScratchpadService(workspaceScratchpadDir, "workspace");
    // Register tree data providers
    const globalTreeView = vscode.window.createTreeView("scratchpadExplorer", {
        treeDataProvider: globalScratchpadProvider,
        showCollapseAll: true,
        canSelectMany: true,
        dragAndDropController: globalScratchpadProvider,
    });
    const workspaceTreeView = vscode.window.createTreeView("workspaceScratchpadExplorer", {
        treeDataProvider: workspaceScratchpadProvider,
        showCollapseAll: true,
        canSelectMany: true,
        dragAndDropController: workspaceScratchpadProvider,
    });
    // Track current selections
    let currentGlobalSelection = undefined;
    let currentWorkspaceSelection = undefined;
    // Helper function to get base path from selected item
    function getBasePath(selectedItem) {
        if (!selectedItem)
            return undefined;
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
        currentGlobalSelection = e.selection[0];
    });
    // Listen for selection changes in workspace tree view
    workspaceTreeView.onDidChangeSelection(e => {
        currentWorkspaceSelection = e.selection[0];
    });
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand("myscratchpad.createScratchFile", async (item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        await globalScratchpadService.createScratchFile(undefined, undefined, parentFolderPath);
        globalScratchpadProvider.refresh();
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
            await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.createWorkspaceScratchFile", async (item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection;
        const parentFolderPath = getBasePath(targetItem);
        await workspaceScratchpadService.createScratchFile(undefined, undefined, parentFolderPath);
        workspaceScratchpadProvider.refresh();
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
            await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.deleteScratchFile", async (item) => {
        const treeItem = item;
        // Handle file deletion
        if (treeItem?.scratchFile) {
            // Determine which service to use based on file path
            const isWorkspaceFile = treeItem.scratchFile.path.includes("workspaceScratchFiles");
            const { service, provider } = isWorkspaceFile
                ? {
                    service: workspaceScratchpadService,
                    provider: workspaceScratchpadProvider,
                }
                : {
                    service: globalScratchpadService,
                    provider: globalScratchpadProvider,
                };
            const success = await service.deleteScratchFile(treeItem.scratchFile);
            if (success) {
                provider.refresh();
            }
        }
        // Handle folder deletion
        else if (treeItem?.scratchFolder) {
            // Determine which service to use based on folder path
            const isWorkspaceFolder = treeItem.scratchFolder.path.includes("workspaceScratchFiles");
            const { service, provider } = isWorkspaceFolder
                ? {
                    service: workspaceScratchpadService,
                    provider: workspaceScratchpadProvider,
                }
                : {
                    service: globalScratchpadService,
                    provider: globalScratchpadProvider,
                };
            const success = await service.deleteScratchFolder(treeItem.scratchFolder.path, treeItem.scratchFolder.name);
            if (success) {
                provider.refresh();
            }
        }
    }), vscode.commands.registerCommand("myscratchpad.renameScratchFile", async (item) => {
        const treeItem = item;
        // Handle file renaming
        if (treeItem?.scratchFile) {
            // Determine which service to use based on file path
            const isWorkspaceFile = treeItem.scratchFile.path.includes("workspaceScratchFiles");
            const { service, provider } = isWorkspaceFile
                ? {
                    service: workspaceScratchpadService,
                    provider: workspaceScratchpadProvider,
                }
                : {
                    service: globalScratchpadService,
                    provider: globalScratchpadProvider,
                };
            const success = await service.renameScratchFile(treeItem.scratchFile);
            if (success) {
                provider.refresh();
            }
        }
        // Handle folder renaming
        else if (treeItem?.scratchFolder) {
            // Determine which service to use based on folder path
            const isWorkspaceFolder = treeItem.scratchFolder.path.includes("workspaceScratchFiles");
            const { service, provider } = isWorkspaceFolder
                ? {
                    service: workspaceScratchpadService,
                    provider: workspaceScratchpadProvider,
                }
                : {
                    service: globalScratchpadService,
                    provider: globalScratchpadProvider,
                };
            const success = await service.renameScratchFolder(treeItem.scratchFolder.path, treeItem.scratchFolder.name);
            if (success) {
                provider.refresh();
            }
        }
    }), vscode.commands.registerCommand("myscratchpad.refreshScratchpad", () => {
        globalScratchpadProvider.refresh();
    }), vscode.commands.registerCommand("myscratchpad.refreshWorkspaceScratchpad", () => {
        workspaceScratchpadProvider.refresh();
    }), vscode.commands.registerCommand("myscratchpad.createScratchFileFromSelection", async (item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        await globalScratchpadService.createScratchFileFromSelection(parentFolderPath);
        globalScratchpadProvider.refresh();
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
            await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.createWorkspaceScratchFileFromSelection", async (item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection;
        const parentFolderPath = getBasePath(targetItem);
        await workspaceScratchpadService.createScratchFileFromSelection(parentFolderPath);
        workspaceScratchpadProvider.refresh();
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
            await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.createScratchFileFromFile", async (fileUri, item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        await globalScratchpadService.createScratchFileFromFile(fileUri, parentFolderPath);
        globalScratchpadProvider.refresh();
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
            await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.createWorkspaceScratchFileFromFile", async (fileUri, item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        await workspaceScratchpadService.createScratchFileFromFile(fileUri, parentFolderPath);
        workspaceScratchpadProvider.refresh();
        // If file was created in a subfolder, expand that folder
        if (parentFolderPath) {
            await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.addFileToCodyAi", async (fileUri) => {
        await codyService_1.codyService.executeMentionFileCommand(fileUri);
    }), vscode.commands.registerCommand("myscratchpad.createScratchFolder", async (item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentGlobalSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        await globalScratchpadService.createScratchFolder(parentFolderPath);
        globalScratchpadProvider.refresh();
        // If folder was created in a subfolder, expand that parent folder
        if (parentFolderPath) {
            await globalScratchpadProvider.expandFolder(parentFolderPath, globalTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.createWorkspaceScratchFolder", async (item) => {
        // Use provided item, current selection, or fallback to undefined
        const targetItem = currentWorkspaceSelection || item;
        const parentFolderPath = getBasePath(targetItem);
        await workspaceScratchpadService.createScratchFolder(parentFolderPath);
        workspaceScratchpadProvider.refresh();
        // If folder was created in a subfolder, expand that parent folder
        if (parentFolderPath) {
            await workspaceScratchpadProvider.expandFolder(parentFolderPath, workspaceTreeView);
        }
    }), vscode.commands.registerCommand("myscratchpad.revealInFinder", async (item) => {
        if (!item)
            return;
        let targetPath;
        // Get the path based on item type
        if (item.scratchFile) {
            targetPath = item.scratchFile.path;
        }
        else if (item.scratchFolder) {
            targetPath = item.scratchFolder.path;
        }
        if (targetPath) {
            // Use VS Code's built-in command to reveal in file explorer
            await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
        }
    }), vscode.commands.registerCommand("myscratchpad.openInTerminal", async (item) => {
        if (!item)
            return;
        let targetPath;
        // Get the directory path based on item type
        if (item.scratchFile) {
            // For files, open terminal in the parent directory
            targetPath = path.dirname(item.scratchFile.path);
        }
        else if (item.scratchFolder) {
            // For folders, open terminal in the folder itself
            targetPath = item.scratchFolder.path;
        }
        if (targetPath) {
            // Create a new terminal and change to the target directory
            const terminal = vscode.window.createTerminal({
                name: 'Scratchpad Terminal',
                cwd: targetPath
            });
            terminal.show();
        }
    }), globalTreeView, workspaceTreeView);
}
// This method is called when your extension is deactivated
function deactivate() { }


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScratchpadProvider = exports.ScratchpadFolderItem = exports.ScratchpadTreeItem = void 0;
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(2));
const fs = __importStar(__webpack_require__(4));
const scratchFile_1 = __webpack_require__(5);
class ScratchpadTreeItem extends vscode.TreeItem {
    scratchFile;
    collapsibleState;
    constructor(scratchFile, collapsibleState) {
        super(scratchFile.name, collapsibleState);
        this.scratchFile = scratchFile;
        this.collapsibleState = collapsibleState;
        // Set the appropriate icon
        this.iconPath = new vscode.ThemeIcon((0, scratchFile_1.getFileTypeIcon)(scratchFile.extension));
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
exports.ScratchpadTreeItem = ScratchpadTreeItem;
class ScratchpadFolderItem extends vscode.TreeItem {
    scratchFolder;
    collapsibleState;
    constructor(scratchFolder, collapsibleState) {
        super(scratchFolder.name, collapsibleState);
        this.scratchFolder = scratchFolder;
        this.collapsibleState = collapsibleState;
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
exports.ScratchpadFolderItem = ScratchpadFolderItem;
class ScratchpadProvider {
    scratchpadDir;
    scope;
    // Drag and drop mime types - will be set in constructor
    dropMimeTypes;
    dragMimeTypes;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(scratchpadDir, scope = "global") {
        this.scratchpadDir = scratchpadDir;
        this.scope = scope;
        // Set drag and drop mime types based on scope
        this.dropMimeTypes = [`application/vnd.code.tree.scratchpad.${this.scope}`];
        this.dragMimeTypes = [`application/vnd.code.tree.scratchpad.${this.scope}`];
        // Ensure the scratchpad directory exists
        if (!fs.existsSync(scratchpadDir)) {
            fs.mkdirSync(scratchpadDir, { recursive: true });
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    /**
     * Expand a folder by its path
     */
    async expandFolder(folderPath, treeView) {
        // Find the folder item that matches the path
        const allItems = await this.getScratchItems();
        const folderItem = this.findFolderByPath(allItems, folderPath);
        if (folderItem) {
            // Reveal and expand the folder
            await treeView.reveal(folderItem, { expand: true, focus: false, select: false });
        }
    }
    findFolderByPath(items, targetPath) {
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
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - get all scratch items from all IDE directories
            return this.getScratchItems();
        }
        else if (element instanceof ScratchpadFolderItem) {
            // Get children of a folder
            return this.getScratchItemsFromDirectory(element.scratchFolder.path);
        }
        else {
            // Files have no children
            return [];
        }
    }
    getParent(element) {
        if (element instanceof ScratchpadFolderItem) {
            // Check if this folder is at root level
            const parentPath = path.dirname(element.scratchFolder.path);
            if (parentPath === this.scratchpadDir || this.isAtRootLevel(element.scratchFolder.path)) {
                return undefined; // Root level folder
            }
            // Find parent folder
            return this.findParentFolder(element.scratchFolder.path);
        }
        else {
            // For files, find the parent folder
            const parentPath = path.dirname(element.scratchFile.path);
            if (parentPath === this.scratchpadDir || this.isAtRootLevel(element.scratchFile.path)) {
                return undefined; // Root level file
            }
            return this.findParentFolder(element.scratchFile.path);
        }
    }
    isAtRootLevel(itemPath) {
        // Check if the item is at the root level by comparing directory levels
        const relativePath = path.relative(this.scratchpadDir, itemPath);
        const pathSegments = relativePath.split(path.sep).filter(segment => segment !== '');
        // If there's only one segment (the item name), it's at root level
        return pathSegments.length <= 1;
    }
    findParentFolder(itemPath) {
        const parentPath = path.dirname(itemPath);
        // Try to find the parent folder in our current items
        // Note: This is a simplified approach. In a real implementation, you might need
        // to cache the tree structure or implement a more sophisticated lookup
        const parentName = path.basename(parentPath);
        // Create a mock parent folder item for the reveal functionality
        // This works because reveal only needs the path information
        if (fs.existsSync(parentPath) && fs.statSync(parentPath).isDirectory()) {
            const stats = fs.statSync(parentPath);
            const scratchFolder = {
                name: parentName,
                path: parentPath,
                created: stats.birthtime.getTime(),
                lastModified: stats.mtime.getTime(),
            };
            return new ScratchpadFolderItem(scratchFolder, vscode.TreeItemCollapsibleState.Collapsed);
        }
        return undefined;
    }
    getScratchItems() {
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
            const allItems = [];
            const uniqueItemNames = new Set();
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
        }
        catch (error) {
            console.error("Error reading scratchpad directory:", error);
            return [];
        }
    }
    getScratchItemsFromDirectory(dirPath) {
        try {
            const items = this.getItemsFromDirectory(dirPath);
            return this.sortItems(items);
        }
        catch (error) {
            console.error("Error reading directory:", error);
            return [];
        }
    }
    getItemsFromDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            return [];
        }
        const items = [];
        const dirEntries = fs.readdirSync(dirPath);
        dirEntries.forEach((entry) => {
            const fullPath = path.join(dirPath, entry);
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                // Create folder item
                const scratchFolder = {
                    name: entry,
                    path: fullPath,
                    created: stats.birthtime.getTime(),
                    lastModified: stats.mtime.getTime(),
                };
                items.push(new ScratchpadFolderItem(scratchFolder, vscode.TreeItemCollapsibleState.Collapsed));
            }
            else {
                // Create file item
                const extension = path.extname(entry).slice(1); // Remove the dot
                const scratchFile = {
                    name: entry,
                    extension,
                    path: fullPath,
                    created: stats.birthtime.getTime(),
                    lastModified: stats.mtime.getTime(),
                };
                items.push(new ScratchpadTreeItem(scratchFile, vscode.TreeItemCollapsibleState.None));
            }
        });
        return items;
    }
    sortItems(items) {
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
                return a.label.localeCompare(b.label);
            }
            else {
                // both files
                return b.scratchFile.lastModified - a.scratchFile.lastModified;
            }
        });
    }
    // Drag and drop implementation
    async handleDrag(source, treeDataTransfer) {
        // Store the dragged items in the data transfer
        const draggedItems = source.map(item => ({
            isFolder: item instanceof ScratchpadFolderItem,
            path: item instanceof ScratchpadFolderItem ? item.scratchFolder.path : item.scratchFile.path,
            name: item instanceof ScratchpadFolderItem ? item.scratchFolder.name : item.scratchFile.name
        }));
        treeDataTransfer.set(this.dragMimeTypes[0], new vscode.DataTransferItem(draggedItems));
    }
    async handleDrop(target, sources) {
        const transferItem = sources.get(this.dropMimeTypes[0]);
        if (!transferItem) {
            return;
        }
        const draggedItems = transferItem.value;
        // Determine target directory - always use the main scratchpad directory structure
        let targetDir;
        if (!target) {
            // Dropped on empty space - move to root
            targetDir = this.scratchpadDir;
        }
        else if (target instanceof ScratchpadFolderItem) {
            // Dropped on folder - need to find the corresponding folder in our scratchpad directory
            const folderName = target.scratchFolder.name;
            targetDir = path.join(this.scratchpadDir, folderName);
        }
        else {
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
    getRelativePathFromScratchpadDir(fullPath) {
        // Extract the relative path by finding the common structure
        // This handles the cross-IDE directory aggregation
        const parts = fullPath.split(path.sep);
        const scratchpadDirParts = this.scratchpadDir.split(path.sep);
        // Find where the paths diverge and get the relative portion
        let relativeParts = [];
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
    async moveItem(sourcePath, itemName, targetDir, isFolder) {
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
        }
        catch (error) {
            console.error(`Failed to move item:`, error);
            vscode.window.showErrorMessage(`Failed to move ${itemName}: ${error}`);
        }
    }
}
exports.ScratchpadProvider = ScratchpadProvider;


/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getCustomFileIcon = exports.getFileTypeIcon = exports.fileTypeLabels = exports.FileTypeEnum = void 0;
var FileTypeEnum;
(function (FileTypeEnum) {
    FileTypeEnum["JavaScript"] = "js";
    FileTypeEnum["TypeScript"] = "ts";
    FileTypeEnum["HTML"] = "html";
    FileTypeEnum["CSS"] = "css";
    FileTypeEnum["JSON"] = "json";
    FileTypeEnum["Markdown"] = "md";
    FileTypeEnum["Text"] = "txt";
    FileTypeEnum["SQL"] = "sql";
    FileTypeEnum["Custom"] = "custom";
})(FileTypeEnum || (exports.FileTypeEnum = FileTypeEnum = {}));
exports.fileTypeLabels = {
    [FileTypeEnum.JavaScript]: "JavaScript",
    [FileTypeEnum.TypeScript]: "TypeScript",
    [FileTypeEnum.HTML]: "HTML",
    [FileTypeEnum.CSS]: "CSS",
    [FileTypeEnum.JSON]: "JSON",
    [FileTypeEnum.Markdown]: "Markdown",
    [FileTypeEnum.Text]: "Plain Text",
    [FileTypeEnum.SQL]: "SQL",
    [FileTypeEnum.Custom]: "Custom File",
};
const getFileTypeIcon = (extension) => {
    switch (extension) {
        case FileTypeEnum.JavaScript:
            return "symbol-method";
        case FileTypeEnum.TypeScript:
            return "symbol-interface";
        case FileTypeEnum.HTML:
            return "browser";
        case FileTypeEnum.CSS:
            return "symbol-color";
        case FileTypeEnum.JSON:
            return "symbol-object";
        case FileTypeEnum.Markdown:
            return "markdown";
        case FileTypeEnum.SQL:
            return "database";
        case FileTypeEnum.Text:
            return "file-text";
        default:
            // For custom extensions, return extension-specific icons where available
            return (0, exports.getCustomFileIcon)(extension);
    }
};
exports.getFileTypeIcon = getFileTypeIcon;
const getCustomFileIcon = (extension) => {
    const iconMap = {
        py: "symbol-method",
        rb: "ruby",
        go: "go",
        java: "coffee",
        c: "symbol-method",
        cpp: "symbol-method",
        cs: "symbol-class",
        php: "symbol-method",
        swift: "symbol-method",
        kt: "symbol-class",
        rs: "symbol-method",
        dart: "symbol-method",
        lua: "symbol-method",
        r: "graph",
        sh: "terminal",
        bash: "terminal",
        ps1: "terminal",
        bat: "terminal",
        yaml: "symbol-object",
        yml: "symbol-object",
        toml: "symbol-object",
        ini: "gear",
        cfg: "gear",
        xml: "symbol-object",
        vue: "symbol-color",
        svelte: "symbol-color",
        jsx: "symbol-method",
        tsx: "symbol-interface",
        scss: "symbol-color",
        sass: "symbol-color",
        less: "symbol-color",
        styl: "symbol-color",
        coffee: "coffee",
        elm: "symbol-method",
        hs: "symbol-method",
        clj: "symbol-method",
        ex: "symbol-method",
        erl: "symbol-method",
        vim: "gear",
        dockerfile: "package",
        tf: "symbol-object",
        hcl: "symbol-object",
        cody: "robot",
        ["*"]: "file-code",
    };
    return iconMap[extension.toLowerCase()] || "file-code";
};
exports.getCustomFileIcon = getCustomFileIcon;


/***/ }),
/* 6 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ScratchpadService = void 0;
const vscode = __importStar(__webpack_require__(1));
const fs = __importStar(__webpack_require__(4));
const path = __importStar(__webpack_require__(2));
class ScratchpadService {
    scratchpadDir;
    scope;
    constructor(scratchpadDir, scope = "global") {
        this.scratchpadDir = scratchpadDir;
        this.scope = scope;
        // Ensure the scratchpad directory exists
        if (!fs.existsSync(scratchpadDir)) {
            fs.mkdirSync(scratchpadDir, { recursive: true });
        }
    }
    /**
     * Create a new scratch file from selected text
     */
    async createScratchFileFromSelection(parentFolderPath) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found");
            return;
        }
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        if (!selectedText.trim()) {
            vscode.window.showErrorMessage("No text selected");
            return;
        }
        // Generate suggested filename based on current file
        let suggestedName;
        if (editor.document.fileName) {
            const originalFileName = path.basename(editor.document.fileName);
            const extension = path.extname(originalFileName);
            const nameWithoutExt = path.basename(originalFileName, extension);
            suggestedName = `${nameWithoutExt}_scratch${extension}`;
        }
        await this.createScratchFile(selectedText, suggestedName, parentFolderPath);
    }
    /**
     * Create a new scratch file from an existing file
     */
    async createScratchFileFromFile(fileUri, parentFolderPath) {
        try {
            // Read the file content
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileContent).toString('utf8');
            // Generate suggested filename based on original file
            const originalFileName = path.basename(fileUri.fsPath);
            const extension = path.extname(originalFileName);
            const nameWithoutExt = path.basename(originalFileName, extension);
            const suggestedName = `${nameWithoutExt}_scratch${extension}`;
            await this.createScratchFile(content, suggestedName, parentFolderPath);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to read file: ${error}`);
        }
    }
    /**
     * Create a new scratch file
     */
    async createScratchFile(initialContent, suggestedName, parentFolderPath) {
        // Determine the target directory
        const targetDir = parentFolderPath || this.scratchpadDir;
        // Ask for a name with extension
        const defaultName = suggestedName || this.generateDefaultName();
        const fileName = await vscode.window.showInputBox({
            prompt: "Enter a name for your scratch file (include extension, e.g., note.txt, script.js, data.json)",
            value: defaultName,
            validateInput: (value) => {
                if (!value) {
                    return "Name cannot be empty";
                }
                if (!value.includes(".")) {
                    return "Please include a file extension (e.g., .txt, .js, .md)";
                }
                const fullPath = path.join(targetDir, value);
                if (fs.existsSync(fullPath)) {
                    return "A file with this name already exists";
                }
                return null;
            },
        });
        if (!fileName) {
            return; // User cancelled
        }
        // Extract extension from filename
        const extension = path.extname(fileName).slice(1); // Remove the dot
        // Create the file
        const fullPath = path.join(targetDir, fileName);
        let content;
        if (initialContent !== undefined) {
            content = initialContent;
        }
        else {
            // Try to get clipboard content, fallback to default content
            try {
                const clipboardText = await vscode.env.clipboard.readText();
                content = clipboardText.trim() || this.getInitialContent(extension);
            }
            catch (error) {
                content = this.getInitialContent(extension);
            }
        }
        fs.writeFileSync(fullPath, content);
        // Open the file
        const document = await vscode.workspace.openTextDocument(fullPath);
        await vscode.window.showTextDocument(document);
    }
    /**
     * Delete a scratch file
     */
    async deleteScratchFile(scratchFile) {
        const confirmation = await vscode.window.showWarningMessage(`Are you sure you want to delete '${scratchFile.name}'?`, { modal: true }, "Delete");
        if (confirmation === "Delete") {
            try {
                fs.unlinkSync(scratchFile.path);
                return true;
            }
            catch (error) {
                console.error("Failed to delete scratch file:", error);
                vscode.window.showErrorMessage(`Failed to delete scratch file: ${error}`);
                return false;
            }
        }
        return false;
    }
    /**
     * Rename a scratch file
     */
    async renameScratchFile(scratchFile) {
        const nameWithoutExt = path.basename(scratchFile.name, `.${scratchFile.extension}`);
        const newName = await vscode.window.showInputBox({
            prompt: "Enter a new name for your scratch file",
            value: nameWithoutExt,
            validateInput: (value) => {
                if (!value) {
                    return "Name cannot be empty";
                }
                const fullPath = path.join(this.scratchpadDir, `${value}.${scratchFile.extension}`);
                if (fs.existsSync(fullPath) && fullPath !== scratchFile.path) {
                    return "A file with this name already exists";
                }
                return null;
            },
        });
        if (!newName) {
            return false; // User cancelled
        }
        const newPath = path.join(this.scratchpadDir, `${newName}.${scratchFile.extension}`);
        try {
            fs.renameSync(scratchFile.path, newPath);
            return true;
        }
        catch (error) {
            console.error("Failed to rename scratch file:", error);
            vscode.window.showErrorMessage(`Failed to rename scratch file: ${error}`);
            return false;
        }
    }
    generateDefaultName() {
        const timestamp = new Date()
            .toISOString()
            .replace(/[-:]/g, "")
            .replace("T", "_")
            .substring(0, 15);
        return `scratch_${timestamp}.txt`;
    }
    getInitialContent(extension) {
        const dateComment = `// Created on ${new Date().toLocaleString()}`;
        switch (extension.toLowerCase()) {
            case "js":
                return `${dateComment}\n\n// JavaScript Scratch File\nconsole.log('Hello, World!');\n`;
            case "ts":
                return `${dateComment}\n\n// TypeScript Scratch File\ninterface Person {\n  name: string;\n  age: number;\n}\n\nconst greeting = (person: Person): string => {\n  return \`Hello, \${person.name}!\`;\n};\n\nconsole.log(greeting({ name: 'World', age: 0 }));\n`;
            case "html":
                return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Scratch</title>\n  <style>\n    body {\n      font-family: Arial, sans-serif;\n      margin: 2rem;\n    }\n  </style>\n</head>\n<body>\n  <h1>HTML Scratch</h1>\n  <p>Created on ${new Date().toLocaleString()}</p>\n</body>\n</html>\n`;
            case "css":
                return `/* Created on ${new Date().toLocaleString()} */\n\n/* CSS Scratch File */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n  color: #333;\n  background-color: #f5f5f5;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n}\n`;
            case "json":
                return `{\n  "created": "${new Date().toISOString()}",\n  "name": "JSON Scratch",\n  "items": [\n    {\n      "id": 1,\n      "value": "Example"\n    }\n  ]\n}\n`;
            case "md":
            case "markdown":
                return `# Markdown Scratch\n\nCreated on ${new Date().toLocaleString()}\n\n## Heading\n\nSample text here.\n\n* List item 1\n* List item 2\n* List item 3\n\n## Code Example\n\n\`\`\`javascript\nconsole.log('Hello, World!');\n\`\`\`\n`;
            case "sql":
                return `-- Created on ${new Date().toLocaleString()}\n\n-- SQL Scratch File\nSELECT *\nFROM users\nWHERE active = true\nORDER BY created_at DESC\nLIMIT 10;\n`;
            default:
                // For custom file types, provide a generic template with appropriate comment style
                const commentChar = this.getCommentCharForExtension(extension);
                return `${commentChar} Created on ${new Date().toLocaleString()}\n\n${commentChar} ${extension.toUpperCase()} Scratch File\n\n`;
        }
    }
    getCommentCharForExtension(extension) {
        // Common comment patterns for different file types
        const commentMap = {
            py: "#",
            rb: "#",
            sh: "#",
            bash: "#",
            r: "#",
            pl: "#",
            php: "//",
            go: "//",
            java: "//",
            c: "//",
            cpp: "//",
            cs: "//",
            swift: "//",
            kt: "//",
            scala: "//",
            rust: "//",
            rs: "//",
            dart: "//",
            lua: "--",
            hs: "--",
            elm: "--",
            ex: "#",
            exs: "#",
            erl: "%",
            clj: ";",
            lisp: ";",
            vim: '"',
            ini: ";",
            cfg: "#",
            yaml: "#",
            yml: "#",
            toml: "#",
            bat: "REM",
            ps1: "#",
        };
        return commentMap[extension.toLowerCase()] || "//";
    }
    async createScratchFolder(parentFolderPath) {
        // Determine the target directory
        const targetDir = parentFolderPath || this.scratchpadDir;
        const folderName = await vscode.window.showInputBox({
            prompt: "Enter a name for your new folder",
            validateInput: (value) => {
                if (!value) {
                    return "Folder name cannot be empty";
                }
                if (value.includes('.')) {
                    return "Folder names should not contain dots";
                }
                const fullPath = path.join(targetDir, value);
                if (fs.existsSync(fullPath)) {
                    return "A folder with this name already exists";
                }
                return null;
            },
        });
        if (!folderName) {
            return; // User cancelled
        }
        const fullPath = path.join(targetDir, folderName);
        fs.mkdirSync(fullPath, { recursive: true });
    }
    /**
     * Delete a scratch folder and all its contents
     */
    async deleteScratchFolder(folderPath, folderName) {
        const confirmation = await vscode.window.showWarningMessage(`Are you sure you want to delete folder '${folderName}' and all its contents?`, { modal: true }, "Delete");
        if (confirmation === "Delete") {
            try {
                // Recursively delete the folder and all its contents
                fs.rmSync(folderPath, { recursive: true, force: true });
                return true;
            }
            catch (error) {
                console.error("Failed to delete scratch folder:", error);
                vscode.window.showErrorMessage(`Failed to delete scratch folder: ${error}`);
                return false;
            }
        }
        return false;
    }
    /**
     * Rename a scratch folder
     */
    async renameScratchFolder(folderPath, folderName) {
        const newName = await vscode.window.showInputBox({
            prompt: "Enter a new name for your folder",
            value: folderName,
            validateInput: (value) => {
                if (!value) {
                    return "Folder name cannot be empty";
                }
                if (value.includes('.')) {
                    return "Folder names should not contain dots";
                }
                const newPath = path.join(path.dirname(folderPath), value);
                if (fs.existsSync(newPath) && newPath !== folderPath) {
                    return "A folder with this name already exists";
                }
                return null;
            },
        });
        if (!newName) {
            return false; // User cancelled
        }
        const newPath = path.join(path.dirname(folderPath), newName);
        try {
            fs.renameSync(folderPath, newPath);
            return true;
        }
        catch (error) {
            console.error("Failed to rename scratch folder:", error);
            vscode.window.showErrorMessage(`Failed to rename scratch folder: ${error}`);
            return false;
        }
    }
}
exports.ScratchpadService = ScratchpadService;


/***/ }),
/* 7 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.codyService = void 0;
const vscode = __importStar(__webpack_require__(1));
const extensionName = "Cody Ai";
const extensionIdentifier = "sourcegraph.cody-ai";
const CODY_COMMAND = {
    MENTION: {
        FILE: "cody.mention.file",
    },
    COMMAND: {
        CUSTOM: "cody.command.custom",
    },
};
function checkCodyIsInstalledAndReady() {
    try {
        const codyExtension = vscode.extensions.getExtension(extensionIdentifier);
        if (!codyExtension) {
            vscode.window.showErrorMessage(`${extensionName} extension is not installed or is disabled.`);
            return false;
        }
        if (!codyExtension.isActive) {
            vscode.window.showErrorMessage(`${extensionName} extension is not active.`);
            return false;
        }
        vscode.window.showInformationMessage(`${extensionName} extension is ready.`);
        return true;
    }
    catch (error) {
        console.error("Error checking for cody extension", error);
        vscode.window.showErrorMessage(`Failed to check ${extensionName} extension status.`);
        return false;
    }
}
async function executeMentionFileCommand(uri) {
    try {
        const isReady = checkCodyIsInstalledAndReady();
        if (!isReady) {
            return;
        }
        await vscode.commands.executeCommand(CODY_COMMAND.MENTION.FILE, uri);
        vscode.window.showInformationMessage(`File added as context in ${extensionName}.`);
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to trigger ${extensionName} to mention file: ${error.message}`);
    }
}
exports.codyService = {
    executeMentionFileCommand,
};


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map