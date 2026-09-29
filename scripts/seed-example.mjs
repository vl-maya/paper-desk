import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "data", "workspace.example");

async function atomicWrite(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, content, "utf8");
  await fs.rename(tmp, filePath);
}

const now = new Date().toISOString();
const assigneeId = "a0000000-0000-4000-8000-000000000001";
const outboundId = "b0000000-0000-4000-8000-000000000001";
const inboundId = "c0000000-0000-4000-8000-000000000001";
const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const delivery = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const dueIn = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

await atomicWrite(
  path.join(root, "manifest.json"),
  JSON.stringify({ version: 1, lastModified: now }, null, 2),
);
await atomicWrite(
  path.join(root, "settings.json"),
  JSON.stringify(
    {
      wipLimit: 5,
      wipActiveStatuses: ["todo", "in_progress"],
      defaultSortInbound: "urgency_desc",
      defaultSortOutbound: "urgency_desc",
      aiProvider: "claude",
      aiModel: "sonnet",
    },
    null,
    2,
  ),
);
await atomicWrite(
  path.join(root, "assignees.json"),
  JSON.stringify(
    { assignees: [{ id: assigneeId, name: "You", color: "#8b7355" }] },
    null,
    2,
  ),
);
await atomicWrite(
  path.join(root, "outbound/tasks.json"),
  JSON.stringify(
    {
      tasks: [
        {
          id: outboundId,
          direction: "outbound",
          title: "Ship Q3 report",
          status: "in_progress",
          urgency: 4,
          dueDate: due,
          deliveryDate: delivery,
          assigneeId,
          backlog: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
    null,
    2,
  ),
);
await atomicWrite(
  path.join(root, "inbound/tasks.json"),
  JSON.stringify(
    {
      tasks: [
        {
          id: inboundId,
          direction: "inbound",
          title: "Request: budget approval",
          status: "todo",
          urgency: 3,
          dueDate: dueIn,
          backlog: false,
          createdAt: now,
          updatedAt: now,
        },
      ],
    },
    null,
    2,
  ),
);
await atomicWrite(
  path.join(root, "links.json"),
  JSON.stringify(
    { links: [{ inboundTaskId: inboundId, outboundTaskId: outboundId }] },
    null,
    2,
  ),
);
await atomicWrite(
  path.join(root, "notes/index.json"),
  JSON.stringify({ notes: [] }, null, 2),
);
await atomicWrite(
  path.join(root, "schedule/events.json"),
  JSON.stringify({ events: [] }, null, 2),
);

console.log("Seeded", root);
