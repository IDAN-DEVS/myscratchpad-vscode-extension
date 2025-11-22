# Change Log

All notable changes to the "MyScratchPad" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.22] - 2025-09-22

### Added

- **Unified storage root**: All extension data is now stored under `~/.myscratchpad-extension/` with `scratchfiles/global` and `scratchfiles/workspaces/` to enable cross-IDE syncing.
- **Migration system**: `MigrationService` and `MigrationWebviewProvider` that scan existing IDE-specific storage paths, migrate files into the unified location, show progress, and offer post-migration cleanup.
- **Storage helpers**: `StorageHelper` utilities for path management, scanning old IDE paths, copying files, generating unique filenames, and persisting migration config.
- **Commands**: Added manual commands `myscratchpad.migrateStorage` and `myscratchpad.cleanupOldFiles` to trigger migration and cleanup from the Command Palette.

## [0.0.18] - 2025-08-01

### Changed

- **UI Architecture**: Migrated from VS Code Explorer tree view to dedicated webview interface for better user experience and enhanced functionality
- **Tree View Behavior**: Scratchpad sections now remain collapsed by default when extension loads, providing a cleaner initial view while still loading all files
- **Interface Design**: Improved visual layout and interaction patterns with the new webview-based approach

### Added

- **Dedicated Webview Panel**: Custom webview interface replacing the previous Explorer tree integration
- **Enhanced File Management**: Better file organization and display within the dedicated interface

## [0.0.17] - 2025-06-11

### Added

- **Simplified Creation Flow**: Single-step file creation - just enter filename with extension (e.g., `script.py`)
- **Clipboard Integration**: New scratchpad files automatically start with clipboard content as initial content
- **Context Menu Creation**: Create scratchpads directly from selected text via right-click context menu
- **File Explorer Integration**: Create scratchpads from any file in the explorer via right-click
- **Smart Naming System**: Intelligent file naming when creating scratchpads from existing files (e.g., `hello.txt` → `hello_scratch.txt`)

### Changed

- **Streamlined Workflow**: Removed the old two-step creation process in favor of direct filename entry
- **Enhanced User Experience**: Multiple intuitive ways to create scratchpad files

## [0.0.16] - 2025-05-28

### Added

- **Cross-Editor Persistence**: Full compatibility between VS Code, Cursor, and Windsurf editors

## [0.0.1] - 2025-05-25

### Added

- Initial extension release
- Dual scratchpad system (global and workspace-specific)
- Basic file creation and management
- Support for JavaScript, TypeScript, HTML, CSS, JSON, Markdown, SQL, and Plain Text
- Cross-platform compatibility
- File persistence across VS Code sessions
