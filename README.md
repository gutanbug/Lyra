# Lyra

**A unified desktop application for managing development collaboration tools such as Jira, Confluence, GitHub, and GitLab in one place.**

View and manage issues, documents, and pull requests scattered across multiple services from a single window without switching tabs. Split View allows you to work with two services side by side.

## Key Features

- **Unified Workspace** - Manage Jira, Confluence, GitHub, GitLab, and more from a single app
- **Multi-Account** - Register multiple accounts per service and switch between them instantly
- **Split View** - Open two services side by side for simultaneous work
- **Tab System** - Open issues or pages in Chrome-like tabs with independent state, rename tabs, and switch freely
- **Jira Integration** - Dashboard with epic grouping, issue detail with hierarchical subtask view (parent → child → grandchild toggle), inline status transitions, comment images
- **Confluence Integration** - Space-grouped page list, page detail with comments/attachments, search field filter (title/body/all)
- **Keyboard Shortcuts** - Navigate menus, focus search, collapse/expand all, open settings, switch profiles — all from the keyboard
- **Settings Page** - Dedicated settings page with account management and shortcut reference
- **Cross-Platform** - Supports macOS, Windows, and Linux
- **Plugin Architecture** - Easily add new services using the adapter pattern

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + L` | Focus search input |
| `Cmd/Ctrl + -` | Collapse all groups |
| `Cmd/Ctrl + +` | Expand all groups |
| `Cmd/Ctrl + ,` | Open settings |
| `Cmd/Ctrl + ;` | Toggle profile switcher |
| `[` / `]` | Navigate between menus |

## Installation

Download the installer for your OS from the [Releases](../../releases) page.

| OS | File |
|---|---|
| macOS | `.dmg` |
| Windows | `.exe` (installer) |
| Linux | `.AppImage`, `.deb` |

### Resolving macOS Security Warning

![img.png](img.png)

Since the app is not code-signed, macOS may display a security warning when launching. You can resolve this by running:

```bash
sudo xattr -r -d com.apple.quarantine /Applications/Lyra.app
```

### Resolving Windows Smart App Control Warning

Since the app is not signed, Windows Smart App Control may block the installation. To resolve this:

1. Open **Windows Security**
2. Go to **App & browser control**
3. Click **Smart App Control settings**
4. Set Smart App Control to **Off**

> After installing Lyra, you can re-enable Smart App Control if desired.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm

### Running

```bash
pnpm install             # Install dependencies

pnpm start               # React dev server (localhost:3000)
pnpm test                # Jest tests
pnpm electron:dev        # Electron dev mode (React HMR + Electron)
pnpm electron:build      # Build distributable packages (release/ folder)
```

## Tech Stack

- **Frontend** - React 17, TypeScript, styled-components
- **Desktop** - Electron 40, electron-builder
- **State Management** - Context API + useReducer + Immer
- **Routing** - React Router v5 (HashRouter)
- **Package Manager** - pnpm

## Project Structure

```
src/
├── pages/              # Route pages (JiraPage, ConfluencePage, AccountSettings, etc.)
├── containers/         # Smart components (Context-connected, stateful)
│   ├── jira/           # Jira dashboard, issue detail
│   └── confluence/     # Confluence dashboard, page detail
├── components/         # Presentational components (pure UI)
├── modules/            # State management (Context + useReducer + Immer)
├── controllers/        # API fetch wrappers
├── lib/                # Hooks, style utilities, icons
└── types/              # Type definitions

electron/
├── main.ts             # Electron main process
├── preload.ts          # Context Isolation preload
├── integrations/       # Service adapters (Jira, Confluence, GitHub/GitLab planned)
├── ipc/                # IPC handlers
├── account/            # Account management
└── settings/           # App settings (electron-store)
```
