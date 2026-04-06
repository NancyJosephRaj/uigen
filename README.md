# UIGen

AI-powered React component generator with live preview. Describe a component in plain English, and Claude generates it instantly — with syntax highlighting, a virtual file system, and a sandboxed iframe preview.

## Features

- **AI component generation** — Claude writes JSX/TSX based on your description
- **Live preview** — Babel transpiles generated code in-browser; no build step
- **Virtual file system** — All AI files live in memory, never written to disk
- **Multi-file support** — Claude can create multiple files with `@/` alias imports
- **Code editor** — Monaco editor with syntax highlighting
- **Auth & persistence** — Sign up to save and revisit projects
- **Anonymous mode** — Try without an account; work is preserved until sign-up
- **Email verification** — Account activation via Resend

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| AI | Anthropic Claude via Vercel AI SDK |
| Preview | Babel Standalone + esm.sh import map |
| Editor | Monaco Editor |
| Auth | JWT (HTTP-only cookie, jose) |
| Database | Prisma + PostgreSQL |
| Email | Resend |
| Testing | Vitest + Testing Library |

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))
- Anthropic API key (optional — falls back to static mock components)
- Resend API key (optional — required for email verification)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/NancyJosephRaj/uigen.git
cd uigen
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Required: PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/uigen"

# Optional: Anthropic API key
# Without this, the app uses a MockLanguageModel that returns static demo components
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Resend API key for email verification
RESEND_API_KEY=your_resend_api_key

# Public app URL (used for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# JWT secret for signing auth cookies
JWT_SECRET=your_jwt_secret_min_32_chars
```

### 3. Initialize the database

```bash
npx prisma generate
npx prisma migrate dev
```

Or use the convenience script (installs deps + generates + migrates):

```bash
npm run setup
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Open the app — anonymous users can start immediately
2. Describe the React component you want in the chat (e.g. _"a dark-themed pricing table with three tiers"_)
3. Claude generates the component and streams it to the preview in real time
4. Switch between **Preview** and **Code** tabs to inspect the generated files
5. Continue the conversation to refine, extend, or fix the component
6. Sign up to save your project and revisit it later

## Scripts

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Production build (generates Prisma client + runs migrations)
npm run lint       # ESLint
npm test           # Run Vitest tests
npm run setup      # Install deps + generate Prisma client + run migrations
npm run db:reset   # Reset database to clean state
```

To run a single test file:

```bash
npx vitest run src/path/to/__tests__/file.test.ts
```

## Architecture

### Core Data Flow

```
User types prompt
  → useChat() POSTs to /api/chat
  → streamText() calls Claude with two tools
  → Claude calls str_replace_editor / file_manager
  → Tool calls stream to client → FileSystemContext executes them
  → PreviewFrame transpiles JSX via Babel → renders in sandboxed iframe
```

### Key Abstractions

**`VirtualFileSystem`** ([src/lib/file-system.ts](src/lib/file-system.ts))
In-memory file tree. All AI-generated files live here. Serialized to JSON for database persistence and sent as context to Claude on each request.

**AI Tools**
- `str_replace_editor` ([src/lib/tools/str-replace.ts](src/lib/tools/str-replace.ts)) — view/create/edit files
- `file_manager` ([src/lib/tools/file-manager.ts](src/lib/tools/file-manager.ts)) — rename/delete files

**`PreviewFrame`** ([src/components/preview/PreviewFrame.tsx](src/components/preview/PreviewFrame.tsx))
Finds `App.jsx`/`App.tsx` as entry point, builds an ESM import map pointing to esm.sh, transpiles all JSX with Babel Standalone, and injects everything into an iframe. Handles `@/` alias resolution to other virtual files.

**System Prompt** ([src/lib/prompts/generation.tsx](src/lib/prompts/generation.tsx))
Instructs Claude to always create `/App.jsx` as the entry point, use Tailwind CSS, and reference other files with `@/` aliases.

### State Management

Two React contexts wrap the entire app:

- **`FileSystemContext`** ([src/lib/contexts/file-system-context.tsx](src/lib/contexts/file-system-context.tsx)) — owns the VirtualFileSystem, executes tool calls from the AI stream, tracks the selected file
- **`ChatContext`** ([src/lib/contexts/chat-context.tsx](src/lib/contexts/chat-context.tsx)) — wraps Vercel AI SDK's `useChat()`, exposes messages and send handlers

### Routing

| Route | Description |
|---|---|
| `/` | Home — anonymous UI or redirect to first project |
| `/[projectId]` | Project workspace (authenticated only) |

### Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String    // bcrypt hashed
  emailVerified Boolean   @default(false)
  projects      Project[]
}

model Project {
  id       String @id @default(cuid())
  name     String
  userId   String?
  messages String @default("[]")   // JSON: chat history
  data     String @default("{}")   // JSON: serialized VirtualFileSystem
}
```

## Project Structure

```
src/
├── actions/          # Server Actions (auth, project CRUD)
├── app/
│   ├── api/chat/     # Streaming AI endpoint
│   ├── [projectId]/  # Project workspace route
│   └── page.tsx      # Home page
├── components/
│   ├── preview/      # PreviewFrame (iframe renderer)
│   ├── editor/       # Monaco code editor
│   ├── chat/         # Chat UI
│   └── ui/           # shadcn/ui primitives
├── lib/
│   ├── auth.ts             # JWT helpers
│   ├── file-system.ts      # VirtualFileSystem
│   ├── provider.ts         # AI model + MockLanguageModel
│   ├── anon-work-tracker.ts
│   ├── contexts/           # FileSystemContext, ChatContext
│   ├── prompts/            # Claude system prompt
│   └── tools/              # str_replace_editor, file_manager
prisma/
└── schema.prisma
```

## Deployment

The app is configured for Vercel. Set all environment variables in your Vercel project settings.

The `build` script automatically runs `prisma generate && prisma migrate deploy` before `next build`, so migrations are applied on each deploy.

## License

MIT
