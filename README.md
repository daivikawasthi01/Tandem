# Tandem

A real-time collaborative code editor for pair programming, with an AI assistant planned for a later milestone. Two (or more) people join a room and edit the same code together; the editing layer merges concurrent changes with CRDTs instead of locking.

**Status: early-stage scaffold.** The backend currently runs a bare Hocuspocus (Yjs) realtime server, and the frontend is a fresh Vite + React + TypeScript app with the collaborative-editing libraries installed but not yet wired up. See `DESIGN.md` for the full target architecture and `TECH_STACK.md` for the reasoning behind each technology choice. Most of what's described there is still being built.

## Features

Currently implemented:
- **Realtime CRDT server** (`backend/index.ts`): a [Hocuspocus](https://tiptap.dev/hocuspocus) WebSocket server built on [Yjs](https://yjs.dev), which merges concurrent edits from multiple clients without conflicts.
- **Frontend scaffold** (`frontend/`): Vite + React 19 + TypeScript, with Monaco Editor, Yjs, `y-monaco`, and the Hocuspocus client already added as dependencies, ready to be connected to the backend.

Planned (per `DESIGN.md`), not yet implemented:
- Auth, rooms, and invite links
- Live shared editing with cursors/presence in the Monaco editor
- In-room chat
- Sandboxed code execution shared with everyone in the room
- Persistence of room/document state
- An AI pair-programming assistant

## Tech Stack

- **Language**: TypeScript (strict), Node.js (pinned via `.nvmrc`)
- **Package manager**: pnpm
- **Frontend**: React 19 + Vite, Monaco Editor (`@monaco-editor/react`)
- **Realtime collaboration**: Yjs + `y-monaco`, Hocuspocus server/provider
- **Linting**: ESLint
- Planned per `TECH_STACK.md`: Express 5, Zod, PostgreSQL + Prisma, Redis + BullMQ, Judge0 sandboxed execution, Argon2 + JWT auth, pino/Prometheus/Sentry observability, Vitest/Supertest/Playwright/k6 testing, Docker, GitHub Actions, Vercel + Fly.io hosting.

## Getting Started

### Prerequisites
- Node.js (see `.nvmrc`, currently pinned to the version listed there)
- pnpm

### Backend (realtime server)

```bash
cd backend
pnpm install
pnpm dev   # tsx watch src/index.ts -> Hocuspocus server on port 1234
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev   # Vite dev server
```

The frontend and backend are not yet wired together. Connecting the Monaco editor to the Hocuspocus provider for live shared editing is the next piece of work.

## Documentation

- [`DESIGN.md`](DESIGN.md): scope, requirements, capacity estimates, and target architecture.
- [`TECH_STACK.md`](TECH_STACK.md): the reasoning behind each technology choice, including alternatives considered.

## License

MIT (see [`LICENSE`](LICENSE)).
