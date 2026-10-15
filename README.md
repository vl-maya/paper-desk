# Paper Desk

Offline-first task, note, and schedule manager for managers. **Outbound** tasks are work you assign and deliver; **inbound** tasks are requests you receive. JSON files on disk are the source of truth; IndexedDB mirrors the workspace in the browser.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:8097](http://localhost:8097) (default port from [`.env.example`](.env.example) / `.env`). On first load the app initializes `data/workspace/` via the local API.

Optional: copy the sample workspace:

```bash
node scripts/seed-example.mjs
cp -R data/workspace.example data/workspace
```

Or use **Settings → Load example workspace**.

## Workspace layout

| Path | Contents |
|------|----------|
| `manifest.json` | Version and last modified |
| `settings.json` | WIP limit, sort defaults, AI defaults |
| `assignees.json` | Assignee list |
| `inbound/tasks.json` | Inbound tasks |
| `outbound/tasks.json` | Outbound tasks |
| `links.json` | Inbound → outbound links |
| `notes/index.json` + `notes/{id}.md` | Notes |
| `schedule/events.json` | Standalone events |
| `audit.log.jsonl` | Append-only audit trail |

Override the data directory:

```bash
PAPER_DESK_DATA_DIR=/path/to/workspace pnpm dev
```

## WIP and backlog

Configure **WIP limit** in Settings. Active tasks (`todo`, `in_progress`, not in backlog) count toward the limit. New or promoted tasks overflow into **backlog** automatically.

## Ask desk

Full reference: [docs/ask-desk.md](docs/ask-desk.md) (API, architecture, pages, capabilities, AI).

Use template chips for **mechanical** answers (no API tokens). Enable **Use AI** for free-form questions via local CLI:

- **Claude**: `claude -p "..." --model ...` (haiku, sonnet, opus, fable)
- **Cursor**: `agent -p "..." --model ...` (requires Cursor CLI on PATH)

AI routes only work when running `pnpm dev` or `pnpm start` locally.

## Browser folder mode

**Settings → Change save folder…** uses the File System Access API (Chromium). Same JSON layout as `data/workspace/`; writes go directly to the chosen folder.

- **Empty folder** (no `manifest.json`): your current workspace is copied there, then that folder becomes the save location.
- **Existing workspace** (`manifest.json` present): that workspace is loaded and becomes the save location.

Use **Export workspace JSON** in Settings for a one-time snapshot backup.

## Scripts

```bash
pnpm lint
pnpm build
node scripts/seed-example.mjs
```

## Electron (later)

See [docs/electron.md](docs/electron.md).

## REST API v1 (per-item)

Per-item endpoints for scripts, bots, and the MCP server. All writes are validated with the zod schemas in `src/lib/types/schemas.ts`, get server-generated UUID v4 ids and timestamps, are serialized by an in-process write lock with atomic (temp file + rename) writes, bump `manifest.lastModified`, and append a line to `audit.log.jsonl` (`"source":"api-v1"`). The legacy whole-snapshot `GET/PUT /api/workspace` and `POST /api/workspace/init` still work (and now share the same write lock).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/tasks` | Filters: `direction=inbound\|outbound`, `status=todo,blocked` (comma list), `backlog=true\|false`, `dueBefore`/`dueAfter=YYYY-MM-DD` (inclusive), `q` (title/description text) |
| POST | `/api/v1/tasks` | `{ direction, title, description?, status?=todo, urgency?=3, dueDate?, deliveryDate?, assigneeId?, backlog?=false, tags?, noteIds? }` → 201 `{ task }` |
| GET / PATCH / DELETE | `/api/v1/tasks/:id` | PATCH any field; `null` clears optional fields. Changing `direction` moves the task and drops its links. DELETE also removes links and unlinks events |
| GET | `/api/v1/events` | `from`/`to=YYYY-MM-DD` (overlapping, inclusive), sorted by start |
| POST | `/api/v1/events` | `{ title, start: "YYYY-MM-DDTHH:mm", end?, notes?, taskId? }` → 201 `{ event }` |
| GET / PATCH / DELETE | `/api/v1/events/:id` | PATCH: `null` clears `end`/`notes`/`taskId` |
| GET | `/api/v1/notes` | Metadata list; `q` searches title + body, `taskId` filter |
| POST | `/api/v1/notes` | `{ title, body?, taskId? }` (titles must be unique → 409) |
| GET / PUT / DELETE | `/api/v1/notes/:id` | GET returns `{ note, body }`; PUT `{ title?, body?, taskId? }` |
| GET | `/api/v1/agenda` | `from`/`to` (default today … +6 days), `includeDone=true`. Returns `items` (events + task due/delivery dates, sorted) and `overdue` (open tasks due before `from`) |
| GET | `/api/v1/manifest` | `{ manifest }` — cheap change detection |

Errors are JSON: `{ error, details? }` with 400 (validation), 404, 409, or 500.

```bash
curl -s localhost:8097/api/v1/agenda | jq
curl -s -X POST localhost:8097/api/v1/tasks -H 'Content-Type: application/json' \
  -d '{"direction":"outbound","title":"Q4 deployment","dueDate":"2026-10-20","urgency":4}'
```

### Browser sync

Open tabs check `/api/v1/manifest` on window focus / tab visible and every 15 s. If `lastModified` changed (e.g. an API or MCP write), the tab re-fetches the workspace — but never while a local save is pending, a modal is open, or a text field / note editor has focus, so in-progress edits aren't clobbered.

## MCP server

`mcp/paper-desk-mcp.mjs` is a stdio MCP server that wraps the v1 API over HTTP. The Paper Desk app must be running. Base URL from `PAPER_DESK_URL` (default `http://localhost:8097`).

Tools: `list_tasks`, `create_task`, `update_task`, `delete_task`, `list_events`, `create_event`, `update_event`, `delete_event`, `get_agenda`, `list_notes`, `read_note`, `write_note`.

```bash
pnpm mcp            # or: node mcp/paper-desk-mcp.mjs
```

Client config (Claude Desktop / Cursor style):

```json
{
  "mcpServers": {
    "paper-desk": {
      "command": "node",
      "args": ["/absolute/path/to/paper-desk/mcp/paper-desk-mcp.mjs"],
      "env": { "PAPER_DESK_URL": "http://localhost:8097" }
    }
  }
}
```

### Building without touching a running server

`NEXT_DIST_DIR` overrides Next's `distDir`, e.g. `NEXT_DIST_DIR=.next-test pnpm build` then `PAPER_DESK_DATA_DIR=/tmp/ws NEXT_DIST_DIR=.next-test npx next start -p 8098`. (`/.next-*/` is git-ignored.) Note: Next may add `.next-test/types` entries to `tsconfig.json` during such a build; revert them.
