# Electron packaging (future)

Paper Desk keeps business logic under `src/lib/` with no direct `window` access in domain code. The same JSON workspace tree used by `PAPER_DESK_DATA_DIR` should be read/written from the Electron **main** process.

## Suggested approach

1. Build Next.js with `output: "standalone"` or static export for UI-only surfaces.
2. Main process implements `FileIOAdapter` using Node `fs` (reuse logic from `src/lib/io/server-fs.ts`).
3. Expose IPC channels: `workspace:load`, `workspace:save`, `ai:query` (optional: run CLI from main for security).
4. Point renderer at `file://` or embedded `BrowserWindow` loading the Next server locally.

## Workspace path

Default user data: `app.getPath('userData')/workspace/` — same file names as documented in README.

No schema changes required when moving from dev server to Electron.
