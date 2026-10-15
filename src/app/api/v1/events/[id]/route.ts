import { ScheduleEventSchema } from "@/lib/types/schemas";
import {
  ApiError,
  EventPatchSchema,
  applyPatch,
  handle,
  mutateWorkspace,
  parseBody,
  readWorkspace,
} from "@/lib/api/v1";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const event = (await readWorkspace()).scheduleEvents.find((e) => e.id === id);
    if (!event) throw new ApiError(404, `Event ${id} not found`);
    return { event };
  });
}

export function PATCH(request: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseBody(request, EventPatchSchema);
    return mutateWorkspace((ws) => {
      const i = ws.scheduleEvents.findIndex((e) => e.id === id);
      if (i < 0) throw new ApiError(404, `Event ${id} not found`);
      const event = ScheduleEventSchema.parse({ ...applyPatch(ws.scheduleEvents[i], patch), id });
      ws.scheduleEvents[i] = event;
      return { result: { event }, audit: { action: "event", id, patch } };
    });
  });
}

export function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const { id } = await params;
    return mutateWorkspace((ws) => {
      const i = ws.scheduleEvents.findIndex((e) => e.id === id);
      if (i < 0) throw new ApiError(404, `Event ${id} not found`);
      ws.scheduleEvents.splice(i, 1);
      return { result: { ok: true, id }, audit: { action: "deleteEvent", id } };
    });
  });
}
