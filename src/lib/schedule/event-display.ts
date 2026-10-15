import type { TaskTag } from "@/lib/types/schemas";

/** Pill label for standalone calendar events in schedule day cells. */
export const SCHEDULE_EVENT_TAG: TaskTag = {
  id: "__schedule_event__",
  name: "Event",
  color: "#8fad8f",
};
