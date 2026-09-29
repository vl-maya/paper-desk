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
