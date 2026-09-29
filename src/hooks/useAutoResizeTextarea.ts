"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import type { EditorView } from "@codemirror/view";

export const NOTE_EDITOR_MIN_HEIGHT_PX = 200;

export function maxEditorHeightPx(expanded = false): number {
  if (typeof window === "undefined") return 600;
  return Math.floor(window.innerHeight * (expanded ? 0.92 : 0.7));
}

export function clampEditorContentHeight(
  contentHeightPx: number,
  expanded = false,
): number {
  const maxPx = maxEditorHeightPx(expanded);
  return Math.min(
    Math.max(contentHeightPx, NOTE_EDITOR_MIN_HEIGHT_PX),
    maxPx,
  );
}

export function syncCodeMirrorViewHeight(
  view: EditorView,
  expanded = false,
): void {
  const maxPx = maxEditorHeightPx(expanded);
  const contentH = view.contentHeight + 16;
  const next = clampEditorContentHeight(contentH, expanded);
  view.dom.style.height = `${next}px`;
  view.dom.style.minHeight = `${NOTE_EDITOR_MIN_HEIGHT_PX}px`;
  view.dom.style.maxHeight = `${maxPx}px`;
  view.scrollDOM.style.overflowY = contentH > maxPx ? "auto" : "auto";
}

/** Sync textarea height between min and max viewport fraction; scroll when capped. */
export function useAutoResizeTextarea(
  value: string,
  resetKey: string,
  expanded = false,
): {
  ref: RefObject<HTMLTextAreaElement | null>;
  syncHeight: () => void;
} {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const maxPx = maxEditorHeightPx(expanded);
    el.style.maxHeight = `${maxPx}px`;
    el.style.height = "0px";
    const scroll = el.scrollHeight;
    const next = clampEditorContentHeight(scroll, expanded);
    el.style.height = `${next}px`;
    el.style.overflowY = scroll > maxPx ? "auto" : "hidden";
  }, [expanded]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, resetKey, syncHeight]);

  useEffect(() => {
    const onResize = () => syncHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncHeight]);

  return { ref, syncHeight };
}
