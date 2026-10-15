import type { CSSProperties } from "react";
import type { TaskTag } from "@/lib/types/schemas";

/** Relative luminance (sRGB) — pick readable pill text on custom tag colors. */
function luminance(hex: string): number {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return 0.5;
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function tagPillStyle(color: string): CSSProperties {
  const bg = color.startsWith("#") ? color : `#${color}`;
  const text = luminance(bg) > 0.55 ? "#1c1917" : "#fafaf9";
  return { backgroundColor: bg, color: text };
}

/** @deprecated Use tagPillStyle */
export const taskTagPillStyle = tagPillStyle;

export function getTaskTagId(tags: string[] | undefined): string | undefined {
  return tags?.[0];
}

export function taskTagFromId(
  tagId: string | undefined,
  catalog: TaskTag[],
): TaskTag | undefined {
  if (!tagId) return undefined;
  return catalog.find((t) => t.id === tagId);
}
