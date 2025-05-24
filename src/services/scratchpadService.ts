import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  FileTypeEnum,
  IScratchFile,
  fileTypeLabels,
} from "../models/scratchFile";

export class ScratchpadService {
  constructor(private scratchpadDir: string) {
    // Ensure the scratchpad directory exists
    if (!fs.existsSync(scratchpadDir)) {
      fs.mkdirSync(scratchpadDir, { recursive: true });
    }
  }

  /**
   * Create a new scratch file
   */
  async createScratchFile(): Promise<void> {
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

  private async askForFileType(): Promise<FileTypeEnum | undefined> {
    const items = Object.entries(fileTypeLabels).map(([ext, label]) => ({
      label,
      description: `.${ext}`,
      extension: ext as FileTypeEnum,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a file type for your scratch file",
    });

    return selected?.extension;
  }

  private generateDefaultName(fileType: FileTypeEnum): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .substring(0, 15);
    const prefix = this.getFileTypePrefix(fileType);
    return `${prefix}${timestamp}`;
  }

  private getFileTypePrefix(fileType: FileTypeEnum): string {
    switch (fileType) {
      case FileTypeEnum.JavaScript:
        return "js_";
      case FileTypeEnum.TypeScript:
        return "ts_";
      case FileTypeEnum.HTML:
        return "html_";
      case FileTypeEnum.CSS:
        return "css_";
      case FileTypeEnum.JSON:
        return "json_";
      case FileTypeEnum.Markdown:
        return "md_";
      case FileTypeEnum.SQL:
        return "sql_";
      default:
        return "scratch_";
    }
  }

  private getInitialContent(fileType: FileTypeEnum): string {
    const dateComment = `// Created on ${new Date().toLocaleString()}`;

    switch (fileType) {
      case FileTypeEnum.JavaScript:
        return `${dateComment}\n\n// JavaScript Scratch File\nconsole.log('Hello, World!');\n`;

      case FileTypeEnum.TypeScript:
        return `${dateComment}\n\n// TypeScript Scratch File\ninterface Person {\n  name: string;\n  age: number;\n}\n\nconst greeting = (person: Person): string => {\n  return \`Hello, \${person.name}!\`;\n};\n\nconsole.log(greeting({ name: 'World', age: 0 }));\n`;

      case FileTypeEnum.HTML:
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Scratch</title>\n  <style>\n    body {\n      font-family: Arial, sans-serif;\n      margin: 2rem;\n    }\n  </style>\n</head>\n<body>\n  <h1>HTML Scratch</h1>\n  <p>Created on ${new Date().toLocaleString()}</p>\n</body>\n</html>\n`;

      case FileTypeEnum.CSS:
        return `/* Created on ${new Date().toLocaleString()} */\n\n/* CSS Scratch File */\nbody {\n  font-family: Arial, sans-serif;\n  margin: 0;\n  padding: 20px;\n  color: #333;\n  background-color: #f5f5f5;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n}\n`;

      case FileTypeEnum.JSON:
        return `{\n  "created": "${new Date().toISOString()}",\n  "name": "JSON Scratch",\n  "items": [\n    {\n      "id": 1,\n      "value": "Example"\n    }\n  ]\n}\n`;

      case FileTypeEnum.Markdown:
        return `# Markdown Scratch\n\nCreated on ${new Date().toLocaleString()}\n\n## Heading\n\nSample text here.\n\n* List item 1\n* List item 2\n* List item 3\n\n## Code Example\n\n\`\`\`javascript\nconsole.log('Hello, World!');\n\`\`\`\n`;

      case FileTypeEnum.SQL:
        return `-- Created on ${new Date().toLocaleString()}\n\n-- SQL Scratch File\nSELECT *\nFROM users\nWHERE active = true\nORDER BY created_at DESC\nLIMIT 10;\n`;

      default:
        return `Created on ${new Date().toLocaleString()}\n\nScratch file for notes and temporary content.\n`;
    }
  }
}
