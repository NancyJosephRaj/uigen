# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run Vitest tests

# Database
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset SQLite database to clean state
```

To run a single test file: `npx vitest run src/path/to/__tests__/file.test.ts`

## Environment

Requires `ANTHROPIC_API_KEY` in `.env.local`. Without it, the app falls back to a `MockLanguageModel` in `src/lib/provider.ts` that generates static demo components.

## Architecture

UIGen is a Next.js 15 (App Router) application where users describe React components in chat and Claude generates them with live preview.

### Core Data Flow

1. User types in chat → `useChat()` (Vercel AI SDK) POSTs to `/api/chat`
2. `/api/chat/route.ts` calls `streamText()` with Claude + two tools
3. Claude uses tools to manipulate a **VirtualFileSystem** (in-memory, never written to disk)
4. Tool calls stream back to the client and are executed in `FileSystemContext`
5. `PreviewFrame` picks up file changes, transpiles JSX via Babel Standalone, and renders in an iframe using an esm.sh import map

### Key Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`) — In-memory file tree. All AI-generated files live here. Serialized to JSON for database persistence and sent as context to Claude on each request.

**AI Tools** — Claude has two tools:
- `str_replace_editor` (`src/lib/tools/str-replace.ts`) — view/create/edit files (str_replace, insert operations)
- `file_manager` (`src/lib/tools/file-manager.ts`) — rename/delete files

**PreviewFrame** (`src/components/preview/PreviewFrame.tsx`) — Finds the entry point (`App.jsx`/`App.tsx`), builds an ESM import map, transpiles all JSX with Babel, and injects everything into an iframe. Handles `@/` alias resolution to other virtual files.

**System Prompt** (`src/lib/prompts/generation.tsx`) — Instructs Claude to always create `/App.jsx` as the entry point, use Tailwind CSS, and reference other files with `@/` aliases.

### State Management

Two React contexts wrap the entire app:
- `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) — owns the VirtualFileSystem instance, executes tool calls from the AI stream, tracks the currently selected file
- `ChatContext` (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat()`, exposes messages and send handlers

### Authentication & Persistence

- JWT stored in an HTTP-only cookie (`src/lib/auth.ts`, jose library)
- Server Actions in `src/actions/index.ts` handle signUp/signIn/signOut/project CRUD
- Prisma + SQLite: `User` and `Project` models. Projects store messages as JSON and the serialized VirtualFileSystem in a `data` field
- Anonymous sessions track work-in-progress in `src/lib/anon-work-tracker.ts`

### Routing

- `/` — Home: shows main UI for anonymous users, redirects authenticated users to their first project
- `/[projectId]` — Project workspace (authenticated only)

### Path Aliases

`@/*` maps to `src/*` (tsconfig). shadcn/ui components are in `src/components/ui/`.
