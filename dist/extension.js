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
        showCollapseAll: false,
    });
    const workspaceTreeView = vscode.window.createTreeView("workspaceScratchpadExplorer", {
        treeDataProvider: workspaceScratchpadProvider,
        showCollapseAll: false,
    });
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand("myscratchpad.createScratchFile", async () => {
        await globalScratchpadService.createScratchFile();
        globalScratchpadProvider.refresh();
    }), vscode.commands.registerCommand("myscratchpad.createWorkspaceScratchFile", async () => {
        await workspaceScratchpadService.createScratchFile();
        workspaceScratchpadProvider.refresh();
    }), vscode.commands.registerCommand("myscratchpad.deleteScratchFile", async (item) => {
        const treeItem = item;
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
    }), vscode.commands.registerCommand("myscratchpad.renameScratchFile", async (item) => {
        const treeItem = item;
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
    }), vscode.commands.registerCommand("myscratchpad.refreshScratchpad", () => {
        globalScratchpadProvider.refresh();
    }), vscode.commands.registerCommand("myscratchpad.refreshWorkspaceScratchpad", () => {
        workspaceScratchpadProvider.refresh();
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
exports.ScratchpadProvider = exports.ScratchpadTreeItem = void 0;
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
class ScratchpadProvider {
    scratchpadDir;
    scope;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(scratchpadDir, scope = "global") {
        this.scratchpadDir = scratchpadDir;
        this.scope = scope;
        // Ensure the scratchpad directory exists
        if (!fs.existsSync(scratchpadDir)) {
            fs.mkdirSync(scratchpadDir, { recursive: true });
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return []; // No children for leaf nodes
        }
        else {
            return this.getScratchFiles();
        }
    }
    getScratchFiles() {
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
            const allFiles = [];
            const uniqueFileNames = new Set();
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
                const stats = fs.statSync(filePath);
                const fileName = path.basename(filePath);
                const extension = path.extname(fileName).slice(1); // Remove the dot
                const name = fileName;
                const scratchFile = {
                    name,
                    extension,
                    path: filePath,
                    created: stats.birthtime.getTime(),
                    lastModified: stats.mtime.getTime(),
                };
                return new ScratchpadTreeItem(scratchFile, vscode.TreeItemCollapsibleState.None);
            })
                .sort((a, b) => b.scratchFile.lastModified - a.scratchFile.lastModified); // Sort by last modified (newest first)
        }
        catch (error) {
            console.error("Error reading scratchpad directory:", error);
            return [];
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
const scratchFile_1 = __webpack_require__(5);
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
     * Create a new scratch file
     */
    async createScratchFile() {
        // Ask the user for the file type
        const fileType = await this.askForFileType();
        if (!fileType) {
            return; // User cancelled
        }
        // Ask for a name
        const defaultName = this.generateDefaultName(fileType);
        const fileName = await vscode.window.showInputBox({
            prompt: "Enter a name for your scratch file",
            value: defaultName,
            validateInput: (value) => {
                if (!value) {
                    return "Name cannot be empty";
                }
                const fullPath = path.join(this.scratchpadDir, `${value}.${fileType}`);
                if (fs.existsSync(fullPath)) {
                    return "A file with this name already exists";
                }
                return null;
            },
        });
        if (!fileName) {
            return; // User cancelled
        }
        // Create the file
        const fullPath = path.join(this.scratchpadDir, `${fileName}.${fileType}`);
        const initialContent = this.getInitialContent(fileType);
        fs.writeFileSync(fullPath, initialContent);
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
    async askForFileType() {
        const items = Object.entries(scratchFile_1.fileTypeLabels).map(([ext, label]) => ({
            label,
            description: ext === "custom" ? "Enter your own extension" : `.${ext}`,
            extension: ext,
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Select a file type for your scratch file",
        });
        if (selected?.extension === scratchFile_1.FileTypeEnum.Custom) {
            const customExtension = await vscode.window.showInputBox({
                prompt: "Enter the file extension (without the dot)",
                placeHolder: "e.g., py, go, rb, java",
                validateInput: (value) => {
                    if (!value) {
                        return "Extension cannot be empty";
                    }
                    if (value.includes(".") ||
                        value.includes("/") ||
                        value.includes("\\")) {
                        return "Extension should not contain dots or slashes";
                    }
                    if (!/^[a-zA-Z0-9]+$/.test(value)) {
                        return "Extension should only contain letters and numbers";
                    }
                    return null;
                },
            });
            return customExtension;
        }
        return selected?.extension;
    }
    generateDefaultName(fileType) {
        const timestamp = new Date()
            .toISOString()
            .replace(/[-:]/g, "")
            .replace("T", "_")
            .substring(0, 15);
        const prefix = this.getFileTypePrefix(fileType);
        return `${prefix}${timestamp}`;
    }
    getFileTypePrefix(fileType) {
        switch (fileType) {
            case scratchFile_1.FileTypeEnum.JavaScript:
                return "js_";
            case scratchFile_1.FileTypeEnum.TypeScript:
                return "ts_";
            case scratchFile_1.FileTypeEnum.HTML:
                return "html_";
            case scratchFile_1.FileTypeEnum.CSS:
                return "css_";
            case scratchFile_1.FileTypeEnum.JSON:
                return "json_";
            case scratchFile_1.FileTypeEnum.Markdown:
                return "md_";
            case scratchFile_1.FileTypeEnum.SQL:
                return "sql_";
            default:
                // For custom extensions, use the extension as prefix
                if (typeof fileType === "string") {
                    return `${fileType}_`;
                }
                return "scratch_";
        }
    }
    getInitialContent(fileType) {
        const dateComment = `// Created on ${new Date().toLocaleString()}`;
        switch (fileType) {
            case scratchFile_1.FileTypeEnum.JavaScript:
                return `${dateComment}\n\n// JavaScript Scratch File\nconsole.log('Hello, World!');\n`;
            case scratchFile_1.FileTypeEnum.TypeScript:
                return `${dateComment}\n\n// TypeScript Scratch File\ninterface Person {\n  name: string;\n  age: number;\n}\n\nconst greeting = (person: Person): string => {\n  return \`Hello, \${person.name}!\`;\n};\n\nconsole.log(greeting({ name: 'World', age: 0 }));\n`;
            case scratchFile_1.FileTypeEnum.HTML:
                return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Scratch</title>\n  <style>\n    body {\n      font-family: Arial, sans-serif;\n      margin: 2rem;\n    }\n  </style>\n</head>\n<body>\n  <h1>HTML Scratch</h1>\n  <p>Created on ${new Date().toLocaleString()}</p>\n</body>\n</html>\n`;
            case scratchFile_1.FileTypeEnum.CSS:
                return `/* Created on ${new Date().toLocaleString()} */\n\n/* CSS Scratch File */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n  color: #333;\n  background-color: #f5f5f5;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n}\n`;
            case scratchFile_1.FileTypeEnum.JSON:
                return `{\n  "created": "${new Date().toISOString()}",\n  "name": "JSON Scratch",\n  "items": [\n    {\n      "id": 1,\n      "value": "Example"\n    }\n  ]\n}\n`;
            case scratchFile_1.FileTypeEnum.Markdown:
                return `# Markdown Scratch\n\nCreated on ${new Date().toLocaleString()}\n\n## Heading\n\nSample text here.\n\n* List item 1\n* List item 2\n* List item 3\n\n## Code Example\n\n\`\`\`javascript\nconsole.log('Hello, World!');\n\`\`\`\n`;
            case scratchFile_1.FileTypeEnum.SQL:
                return `-- Created on ${new Date().toLocaleString()}\n\n-- SQL Scratch File\nSELECT *\nFROM users\nWHERE active = true\nORDER BY created_at DESC\nLIMIT 10;\n`;
            default:
                // For custom file types, provide a generic template with appropriate comment style
                if (typeof fileType === "string") {
                    const commentChar = this.getCommentCharForExtension(fileType);
                    return `${commentChar} Created on ${new Date().toLocaleString()}\n\n${commentChar} ${fileType.toUpperCase()} Scratch File\n\n`;
                }
                return `Created on ${new Date().toLocaleString()}\n\nScratch file for notes and temporary content.\n`;
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
}
exports.ScratchpadService = ScratchpadService;


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