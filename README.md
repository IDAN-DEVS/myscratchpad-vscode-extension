# MyScratchPad — Fast, portable scratch files for modern editors

Create, store, and access quick notes and code snippets across IDEs. MyScratchPad gives you lightweight, persistent scratch files organized into global and workspace scopes — fast to create, easy to manage, and designed for everyday developer flow.

Why you'll love it:

- Instant scratch file creation (single-step)
- Cross-editor access — use the same files in VS Code, Cursor, Windsurf (where supported)
- Clean webview UI for browsing, creating, and managing scratch files
- Lightweight and unobtrusive — built for speed, not bloat

---

## Quick Highlights

- **Global + Workspace scopes**: Keep notes that travel with you or stay with a project.
- **Single-step creation**: Enter a filename and go — files open immediately with clipboard content as a starting point.
- **Multiple create paths**: Create from selection, from existing files, or via the `+` button.
- **Quick search**: Filter and find scratch files instantly using the built-in search box in the webview.
- **Flexible file types**: Works with any extension; provides smart templates and icons for common types.

---

## Why MyScratchPad?

- **Speed**: Stop fighting with temporary files — create and access them in seconds.
- **Convenience**: Clipboard-aware creation and contextual commands make it feel native.
- **Simplicity**: Focused features that solve a single problem well — temporary notes and snippets.

---

## Features

- Global and workspace-scoped scratch files
- One-step creation with extension-aware templates
- Clipboard-aware initial content for new files
- Create from selection or from an existing file via context menus
- Rename, delete, and refresh with a simple, consistent UI
- Rich webview interface for browsing and quick actions

---

## How to Use

1. Install the extension from the VS Code Marketplace and reload.
2. Open the Explorer sidebar (Ctrl/Cmd+Shift+E) and locate the **MyScratchPad** view.
3. Use the top `+` button to create a new file — include an extension (e.g., `note.md`).
4. Right-click a text selection and choose to create a scratch from selection, or right-click a file to create a scratch from that file.
5. Rename, delete, and refresh through the context menu or UI buttons.

Pro tips:

- To create from clipboard quickly, hit `+` and paste a filename — clipboard contents will be used as the file body.
- Use workspace scratchpads for project-specific experiments and global scratchpads for cross-project snippets.

---

## Commands

- `MyScratchPad: Create New Scratch File` — Create a global scratch file
- `MyScratchPad: Create New Workspace Scratch File` — Create a workspace scratch file
- `MyScratchPad: Create Scratch File from Selection` — Create file from selected text
- `MyScratchPad: Create Scratch File from File` — Create from an existing file in Explorer
- `MyScratchPad: Clean Up Old Files` — (advanced) remove legacy storage files if present
- `MyScratchPad: Migrate Old Scratch Files to Unified Storage` — (advanced) migrate legacy storage files to the unified storage (For users who have used the extension before the migration)

---

## Supported File Types

MyScratchPad treats files almost universally — any extension is supported. Common examples include:

- Programming languages: `.js`, `.ts`, `.py`, `.go`, `.java`, `.rb`, `.cpp`, `.cs` etc.
- Web: `.html`, `.css`, `.jsx`, `.tsx`, `.vue`
- Data & config: `.json`, `.yaml`, `.env`, `.toml`
- Docs and plain text: `.md`, `.txt`

Files open with sensible templates for common extensions while allowing full flexibility for any custom extension.

---

## Troubleshooting

- If new files fail to create, confirm the extension has filesystem access for your environment.
- If files disappear from the UI, hit Refresh in the view or restart VS Code. The files are plain files on disk and can be opened from the file system.
- Report bugs or request features at: `https://github.com/IDAN-DEVS/myscratchpad-vscode-extension/issues`

---

## Developer Notes

- Core services live in `src/services/` and UI providers in `src/views/`.
- Providers accept storage paths computed at activation time (`extension.ts`) so concerns are separated.

Build & dev:

```bash
npm install
npm run watch   # dev
npm run compile # build
```

---

## Contributing

Contributions are welcome. Please open issues and PRs on GitHub and follow project conventions.

---
