"use client";

import { MarkdownBody } from "@/components/MarkdownBody";

type ScheduleEventNotesProps = {
  content: string;
  compact?: boolean;
  className?: string;
};

export function ScheduleEventNotes({
  content,
  compact = true,
  className = "",
}: ScheduleEventNotesProps) {
  const rootClass = ["text-ink", className].filter(Boolean).join(" ");

  return (
    <MarkdownBody content={content} compact={compact} className={rootClass} />
  );
}
