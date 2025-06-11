# MyScratchPad VS Code Extension

A powerful scratchpad extension for Visual Studio Code that provides both global and workspace-specific scratch files. Create, manage, and organize temporary files with support for multiple file types and custom extensions. **Works seamlessly across VS Code, Cursor, and Windsurf editors** - files created in one editor are instantly available in the others!

<br/>
<video src="https://pub-db4f9d2ca78f4d78a89b8e54dca08c9f.r2.dev/installation%20and%20usage%20myscratchpad%20demo%20v1.mp4" autoplay loop muted playsinline></video>

## Fork notes

- Added nested tree structure
- Added right click actions

### Installation notes:
1. Download the latest release from [here](https://github.com/lirancr/myscratchpad-vscode-extension/tree/main/releases)
2. run in terminal (you can swap in `code` for `cursor`)
   ```shell
   code --install-extension {fileName}.vsix
   ```

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

1. **Choose Your Scratchpad**:

   - Use **Global Scratchpad** for notes, snippets, and files you want across all projects
   - Use **Workspace Scratchpad** for project-specific temporary files

2. **Create a New File**:
   - Click the "+" icon in either scratchpad view
   - Select from predefined file types (JS, TS, HTML, CSS, JSON, MD, SQL, TXT)
   - **OR** choose "Custom File" to specify any extension (py, go, java, rb, etc.)
   - Provide a name or use the auto-generated timestamped name
   - The file opens automatically with a basic template

### 🔧 Managing Files

- **Open**: Click any file to open it in the editor
- **Rename**: Right-click → Rename, or hover and click the edit icon
- **Delete**: Right-click → Delete, or hover and click the trash icon
- **Refresh**: Click the refresh icon to update the file listing

### 🎯 Custom File Extensions

When selecting "Custom File", you can:

- Enter any extension (without the dot): `py`, `go`, `java`, `rb`, `cpp`, etc.
- The extension automatically detects the appropriate comment style
- Files get relevant icons based on the extension

## Supported File Types

### 🎯 Predefined Types

- **JavaScript** (.js) - Console.log template
- **TypeScript** (.ts) - Interface and function templates
- **HTML** (.html) - Full HTML5 boilerplate
- **CSS** (.css) - Basic styling template
- **JSON** (.json) - Structured data template
- **Markdown** (.md) - Documentation template
- **SQL** (.sql) - Query template
- **Plain Text** (.txt) - Simple text file

### 🌟 Custom Extensions (Examples)

- **Python** (.py), **Go** (.go), **Java** (.java)
- **Ruby** (.rb), **C++** (.cpp), **C#** (.cs)
- **PHP** (.php), **Swift** (.swift), **Kotlin** (.kt)
- **Rust** (.rs), **Dart** (.dart), **Lua** (.lua)
- **Shell Scripts** (.sh), **PowerShell** (.ps1)
- **Config Files** (.yaml, .toml, .ini, .cfg)
- **And many more!**

Each file type includes appropriate templates with timestamps and comment styles.

## 💡 Use Cases

### Global Scratchpad Perfect For:

- Code snippets and templates you reuse across projects
- Personal notes and reminders
- Learning experiments and practice code
- Documentation drafts
- Configuration examples

### Workspace Scratchpad Perfect For:

- Project-specific temporary files
- Quick prototypes and experiments
- Meeting notes for the current project
- Temporary data files and mock content
- Project-specific snippets

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

### 0.0.15 - Latest

🚀 **Cross-Editor Compatibility Update**:

- **🔄 Cross-Editor Persistence**: Full compatibility between VS Code, Cursor, and Windsurf
- **🎯 Custom File Extensions**: Support for any file extension with intelligent comment detection
- **🎨 Enhanced Icons**: Smart file type detection with appropriate VS Code theme icons
- **📝 Improved Templates**: Language-specific templates for 40+ file types
- **🛠️ Better Workspace Detection**: Improved cross-platform workspace handling
- **💼 Dual Scratchpad System**: Global and workspace-specific file management
- **🖥️ Cross-Platform**: Works on Windows, macOS, and Linux
- **⚡ Intuitive UI**: Easy file operations through Explorer sidebar

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
