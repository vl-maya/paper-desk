import { ScheduleEventSchema } from "@/lib/types/schemas";
import {
  ApiError,
  DateOnly,
  EventCreateSchema,
  handle,
  mutateWorkspace,
  parseBody,
  readWorkspace,
  uuidv4,
} from "@/lib/api/v1";
import { eventIsArchived } from "@/lib/schedule/filter-events";

export const dynamic = "force-dynamic";

/** GET /api/v1/events?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive; overlapping events) */
export function GET(request: Request) {
  return handle(async () => {
    const sp = new URL(request.url).searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    for (const [k, v] of [["from", from], ["to", to]] as const)
      if (v && !DateOnly.safeParse(v).success) throw new ApiError(400, `${k} must be YYYY-MM-DD`);
    const archivedParam = sp.get("archived");
    const ws = await readWorkspace();
    const events = ws.scheduleEvents
      .filter((e) => {
        const archived = eventIsArchived(e);
        if (archivedParam === "true" && !archived) return false;
        if (archivedParam === "false" && archived) return false;
        if (archivedParam === null && archived) return false;
        const d = e.start.slice(0, 10);
        const endD = (e.end ?? e.start).slice(0, 10);
        if (from && endD < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => a.start.localeCompare(b.start));
    return { events, count: events.length };
  });
}

export function POST(request: Request) {
  return handle(async () => {
    const input = await parseBody(request, EventCreateSchema);
    const event = ScheduleEventSchema.parse({ ...input, id: uuidv4() });
    return mutateWorkspace((ws) => {
      ws.scheduleEvents.push(event);
      return { result: { event }, audit: { action: "event", id: event.id } };
    });
  }, 201);
}
