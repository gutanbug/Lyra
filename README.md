# Lyra

**A unified desktop application for managing development collaboration tools such as Jira, Confluence, GitHub, and GitLab in one place.**

View and manage issues, documents, and pull requests scattered across multiple services from a single window without switching tabs. Split View allows you to work with two services side by side.

## Key Features

- **Unified Workspace** - Manage Jira, Confluence, GitHub, GitLab, and more from a single app
- **Multi-Account** - Register multiple accounts per service and switch between them instantly
- **Split View** - Open two services side by side for simultaneous work
- **Cross-Platform** - Supports macOS, Windows, and Linux
- **Plugin Architecture** - Easily add new services using the adapter pattern

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
├── pages/              # Route pages (JiraPage, AccountSettings, etc.)
├── containers/         # Smart components (Context-connected, stateful)
├── components/         # Presentational components (pure UI)
├── modules/            # State management (Context + useReducer + Immer)
├── controllers/        # API fetch wrappers
├── lib/                # Hooks, style utilities, icons
└── types/              # Type definitions

electron/
├── main.ts             # Electron main process
├── preload.ts          # Context Isolation preload
├── integrations/       # Service adapters (Jira, GitHub/GitLab planned)
├── ipc/                # IPC handlers
├── account/            # Account management
└── settings/           # App settings (electron-store)
```
