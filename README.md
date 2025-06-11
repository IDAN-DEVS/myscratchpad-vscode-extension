# MyScratchPad VS Code Extension

A powerful scratchpad extension for Visual Studio Code that provides both global and workspace-specific scratch files. Create, manage, and organize temporary files with support for multiple file types and custom extensions. **Works seamlessly across VS Code, Cursor, and Windsurf editors** - files created in one editor are instantly available in the others!

<br/>
<video src="https://pub-db4f9d2ca78f4d78a89b8e54dca08c9f.r2.dev/installation%20and%20usage%20myscratchpad%20demo%20v1.mp4" autoplay loop muted playsinline></video>

## Features

### 🌍 Dual Scratchpad System

- **Global Scratchpad**: Files that persist across all workspaces and projects
- **Workspace Scratchpad**: Files that are specific to the current workspace/project

### 📁 File Type Support

- **Predefined Types**: JavaScript, TypeScript, HTML, CSS, JSON, Markdown, SQL, Plain Text
- **Custom Extensions**: Add any file extension (Python, Go, Java, Ruby, etc.) with smart comment detection
- **Smart Icons**: Automatic file type detection with appropriate VS Code theme icons

### 🛠️ File Management

- Create files with auto-generated timestamped names
- Rename and delete files with intuitive context menus
- Type-specific templates for quick starts
- Refresh views to sync file listings

### 💾 Intelligent Storage

- Global files stored in VS Code's global storage (persist across all projects)
- Workspace files organized by workspace folder name
- Cross-platform path handling for Windows, macOS, and Linux
- **Cross-Editor Compatibility**: Files sync between VS Code, Cursor, and Windsurf

## How to Use

### 📋 Accessing Scratchpads

You'll find **two scratchpad views** in the Explorer sidebar:

- **Scratchpad**: For global files (available across all projects)
- **Workspace Scratchpad**: For project-specific files

### ✨ Creating Files

**Multiple ways to create scratchpad files:**

1. **Direct Creation**:
   - Click the "+" icon in either scratchpad view
   - Enter the filename with extension (e.g., `notes.txt`, `script.py`)
   - The file opens automatically with clipboard content as initial content

2. **From Selected Text**:
   - Select any text or code in VS Code
   - Right-click and choose "Create workspace/global scratchpad"
   - Creates a scratchpad with the selected content

3. **From File Explorer**:
   - Right-click on any file in the Explorer
   - Choose "Create scratchpad from file"
   - Creates a new scratchpad with smart naming (e.g., `hello.txt` → `hello_scratch.txt`)

4. **Add to Cody AI**:
   - Right-click any scratchpad file
   - Select "Add to Cody AI as context" to use the file with AI assistance

### 🔧 Managing Files

- **Open**: Click any file to open it in the editor
- **Rename**: Right-click → Rename, or hover and click the edit icon
- **Delete**: Right-click → Delete, or hover and click the trash icon
- **Refresh**: Click the refresh icon to update the file listing

### 🎯 Smart File Handling

The extension now provides streamlined file creation:

- **Simple naming**: Just enter the filename with extension (e.g., `script.py`, `notes.md`)
- **Clipboard integration**: New files automatically start with your clipboard content
- **Smart naming**: Files created from existing files get intelligent naming
- **Cross-editor sync**: Files sync seamlessly between VS Code, Cursor, and Windsurf

## Supported File Types

### 🌟 Universal File Support

MyScratchPad supports any file extension you need:

- **Programming Languages**: `.js`, `.ts`, `.py`, `.go`, `.java`, `.rb`, `.cpp`, `.cs`, `.php`, `.swift`, `.kt`, `.rs`, `.dart`, `.lua`
- **Web Technologies**: `.html`, `.css`, `.scss`, `.jsx`, `.tsx`, `.vue`, `.svelte`
- **Data & Config**: `.json`, `.yaml`, `.toml`, `.xml`, `.ini`, `.cfg`, `.env`
- **Documentation**: `.md`, `.txt`, `.rst`, `.adoc`
- **Scripts**: `.sh`, `.ps1`, `.bat`, `.cmd`
- **Database**: `.sql`, `.nosql`
- **And any other extension you need!**

Files automatically start with your clipboard content and get appropriate icons based on their extension.

## 💡 Use Cases

### Global Scratchpad Perfect For:

- Code snippets and templates you reuse across projects
- Personal notes and reminders
- Learning experiments and practice code
- Documentation drafts
- Configuration examples
- Content from your clipboard for quick access

### Workspace Scratchpad Perfect For:

- Project-specific temporary files
- Quick prototypes and experiments  
- Meeting notes for the current project
- Temporary data files and mock content
- Project-specific snippets
- Files derived from current project files

## 🔄 Cross-Editor Compatibility

**MyScratchPad works seamlessly across multiple editors!**

- **VS Code**: Full native support
- **Cursor**: Complete compatibility - all files sync automatically
- **Windsurf**: Perfect integration - create files in one, access in all

### How It Works

MyScratchPad uses a shared storage system that all three editors can access. This means:

- Files created in VS Code appear instantly in Cursor and Windsurf
- Work on a file in Cursor, continue editing in VS Code
- Perfect for teams using different editors
- No manual file transfers or exports needed

## Requirements

- Visual Studio Code 1.95.0 or higher (also works with Cursor and Windsurf)
- No additional dependencies required

## Extension Settings

This extension does not contribute any VS Code settings. All configuration is handled through the intuitive UI.

## Known Issues

None at this time. If you encounter any issues, please [report them on GitHub](https://github.com/IDAN-DEVS/myscratchpad-vscode-extension/issues).

## Release Notes

### Latest Release

🚀 **Major Workflow Enhancement Update**:

- **⚡ Simplified Creation**: Single-step file creation - just enter name with extension
- **📋 Clipboard Integration**: New files automatically start with clipboard content
- **🎯 Context Menu Creation**: Create scratchpads from selected text or existing files
- **🧠 Smart Naming**: Intelligent file naming when creating from existing files
- **🤖 Cody AI Integration**: Add scratchpad files directly to Cody AI as context
- **🔄 Cross-Editor Persistence**: Full compatibility between VS Code, Cursor, and Windsurf
- **🌟 Universal File Support**: Support for any file extension with appropriate icons
- **💼 Dual Scratchpad System**: Global and workspace-specific file management

---

## 🚀 Getting Started

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jccoder.myscratchpad).
2. **Check the [releases folder](/releases)** for all versions of the extension.
3. **Reload** VS Code if prompted
4. **Open** the Explorer sidebar (Ctrl/Cmd + Shift + E)
5. **Find** the "Scratchpad" and "Workspace Scratchpad" views
6. **Click** the "+" icon to create your first scratch file!

## 🛠️ Development

### Building the Extension

```bash
# Clone the repository
git clone https://github.com/IDAN-DEVS/myscratchpad-vscode-extension

# Install dependencies
npm install

# Compile in watch mode
npm run watch

# Launch extension in new VS Code window
# Press F5 in VS Code
```

### Contributing

We welcome contributions! Please feel free to submit issues and pull requests on [GitHub](https://github.com/IDAN-DEVS/myscratchpad-vscode-extension).

---

**Enjoy using MyScratchPad! 🎉**

_Make your VS Code workflow more efficient with organized, persistent scratch files._
