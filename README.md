# MyScratchPad VS Code Extension

A simple scratchpad extension for Visual Studio Code that allows you to create and manage scratch files of various types, similar to the functionality provided by WebStorm.

## Features

- Create scratch files of different types (JavaScript, TypeScript, HTML, CSS, JSON, Markdown, SQL, Plain Text)
- Manage your scratch files through a dedicated view in the Explorer sidebar
- Rename and delete scratch files with ease
- Auto-generated file names with timestamps for quick creation
- Type-specific templates for new scratch files
- Files are saved in VS Code's global storage area for persistence

## How to Use

1. **Open the Scratchpad View**: The Scratchpad view is located in the Explorer sidebar.

2. **Create a New Scratch File**:

   - Click the "+" icon in the Scratchpad view title bar
   - Select a file type from the quick pick menu
   - Provide a name for your scratch file (or use the auto-generated name)
   - The new file will be created and opened automatically

3. **Manage Existing Scratch Files**:
   - **Open**: Click on any scratch file in the view to open it
   - **Rename**: Hover over a file and click the edit icon
   - **Delete**: Hover over a file and click the trash icon
   - **Refresh**: Click the refresh icon in the view title bar to update the list

## Supported File Types

- JavaScript (.js)
- TypeScript (.ts)
- HTML (.html)
- CSS (.css)
- JSON (.json)
- Markdown (.md)
- SQL (.sql)
- Plain Text (.txt)

Each file type comes with a basic template to help you get started quickly.

## Requirements

No additional requirements or dependencies.

## Extension Settings

This extension does not contribute any settings at this time.

## Known Issues

None at this time.

## Release Notes

### 0.0.1

Initial release of MyScratchPad:

- Create and manage scratch files of various types
- Dedicated view in the Explorer sidebar
- File operations (create, open, rename, delete)

---

## Development

### Building the Extension

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run watch` to compile in watch mode
4. Press F5 to launch the extension in a new VS Code window

**Enjoy!**
