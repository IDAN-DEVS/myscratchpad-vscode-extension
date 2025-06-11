import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  FileTypeEnum,
  IScratchFile,
  fileTypeLabels,
} from "../models/scratchFile";

export class ScratchpadService {
  constructor(
    private scratchpadDir: string,
    public readonly scope: string = "global"
  ) {
    // Ensure the scratchpad directory exists
    if (!fs.existsSync(scratchpadDir)) {
      fs.mkdirSync(scratchpadDir, { recursive: true });
    }
  }

  /**
   * Create a new scratch file from selected text
   */
  async createScratchFileFromSelection(): Promise<void> {
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
    let suggestedName: string | undefined;
    if (editor.document.fileName) {
      const originalFileName = path.basename(editor.document.fileName);
      const extension = path.extname(originalFileName);
      const nameWithoutExt = path.basename(originalFileName, extension);
      suggestedName = `${nameWithoutExt}_scratch${extension}`;
    }

    await this.createScratchFile(selectedText, suggestedName);
  }

  /**
   * Create a new scratch file from an existing file
   */
  async createScratchFileFromFile(fileUri: vscode.Uri): Promise<void> {
    try {
      // Read the file content
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const content = Buffer.from(fileContent).toString('utf8');
      
      // Generate suggested filename based on original file
      const originalFileName = path.basename(fileUri.fsPath);
      const extension = path.extname(originalFileName);
      const nameWithoutExt = path.basename(originalFileName, extension);
      const suggestedName = `${nameWithoutExt}_scratch${extension}`;
      
      await this.createScratchFile(content, suggestedName);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read file: ${error}`);
    }
  }

  /**
   * Create a new scratch file
   */
  async createScratchFile(initialContent?: string, suggestedName?: string): Promise<void> {
    // Ask for a name with extension
    const defaultName = suggestedName || this.generateDefaultName();
    const fileName = await vscode.window.showInputBox({
      prompt:
        "Enter a name for your scratch file (include extension, e.g., note.txt, script.js, data.json)",
      value: defaultName,
      validateInput: (value) => {
        if (!value) {
          return "Name cannot be empty";
        }
        if (!value.includes(".")) {
          return "Please include a file extension (e.g., .txt, .js, .md)";
        }
        const fullPath = path.join(this.scratchpadDir, value);
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
    const fullPath = path.join(this.scratchpadDir, fileName);
    let content: string;

    if (initialContent !== undefined) {
      content = initialContent;
    } else {
      // Try to get clipboard content, fallback to default content
      try {
        const clipboardText = await vscode.env.clipboard.readText();
        content = clipboardText.trim() || this.getInitialContent(extension);
      } catch (error) {
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
  async deleteScratchFile(scratchFile: IScratchFile): Promise<boolean> {
    const confirmation = await vscode.window.showWarningMessage(
      `Are you sure you want to delete '${scratchFile.name}'?`,
      { modal: true },
      "Delete"
    );

    if (confirmation === "Delete") {
      try {
        fs.unlinkSync(scratchFile.path);
        return true;
      } catch (error) {
        console.error("Failed to delete scratch file:", error);
        vscode.window.showErrorMessage(
          `Failed to delete scratch file: ${error}`
        );
        return false;
      }
    }

    return false;
  }

  /**
   * Rename a scratch file
   */
  async renameScratchFile(scratchFile: IScratchFile): Promise<boolean> {
    const nameWithoutExt = path.basename(
      scratchFile.name,
      `.${scratchFile.extension}`
    );

    const newName = await vscode.window.showInputBox({
      prompt: "Enter a new name for your scratch file",
      value: nameWithoutExt,
      validateInput: (value) => {
        if (!value) {
          return "Name cannot be empty";
        }
        const fullPath = path.join(
          this.scratchpadDir,
          `${value}.${scratchFile.extension}`
        );
        if (fs.existsSync(fullPath) && fullPath !== scratchFile.path) {
          return "A file with this name already exists";
        }
        return null;
      },
    });

    if (!newName) {
      return false; // User cancelled
    }

    const newPath = path.join(
      this.scratchpadDir,
      `${newName}.${scratchFile.extension}`
    );

    try {
      fs.renameSync(scratchFile.path, newPath);
      return true;
    } catch (error) {
      console.error("Failed to rename scratch file:", error);
      vscode.window.showErrorMessage(`Failed to rename scratch file: ${error}`);
      return false;
    }
  }

  private generateDefaultName(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .substring(0, 15);
    return `scratch_${timestamp}.txt`;
  }

  private getInitialContent(extension: string): string {
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

  private getCommentCharForExtension(extension: string): string {
    // Common comment patterns for different file types
    const commentMap: { [key: string]: string } = {
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

  async createScratchFolder(): Promise<void> {
    const folderName = await vscode.window.showInputBox({
      prompt: "Enter a name for your new folder",
      validateInput: (value) => {
        if (!value) {
          return "Folder name cannot be empty";
        }
        if (value.includes('.')) {
          return "Folder names should not contain dots";
        }
        const fullPath = path.join(this.scratchpadDir, value);
        if (fs.existsSync(fullPath)) {
          return "A folder with this name already exists";
        }
        return null;
      },
    });

    if (!folderName) {
      return; // User cancelled
    }

    const fullPath = path.join(this.scratchpadDir, folderName);
    fs.mkdirSync(fullPath, { recursive: true });
  }
}
