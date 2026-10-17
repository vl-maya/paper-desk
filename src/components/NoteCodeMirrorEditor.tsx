"use client";

import { useCallback, useMemo, useRef, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { vim } from "@replit/codemirror-vim";
import { tags } from "@lezer/highlight";
import { Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import {
  maxEditorHeightPx,
  NOTE_EDITOR_MIN_HEIGHT_PX,
  syncCodeMirrorViewHeight,
  syncCodeMirrorViewToContainer,
} from "@/hooks/useAutoResizeTextarea";

function noteEditorAutoGrow(
  getExpanded: () => boolean,
  getFillAvailable: () => boolean,
): Extension {
  return EditorView.updateListener.of((update) => {
    if (getFillAvailable()) return;
    if (!update.docChanged && !update.geometryChanged) return;
    syncCodeMirrorViewHeight(update.view, getExpanded());
  });
}

const selectionBg =
  "color-mix(in srgb, var(--accent) 32%, var(--paper-line))";
const selectionBgFocused =
  "color-mix(in srgb, var(--accent) 38%, var(--paper-line))";

const paperTheme = EditorView.theme(
  {
    "&": {
      fontSize: "0.875rem",
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      lineHeight: "1.625",
      backgroundColor: "var(--card)",
      color: "var(--ink)",
    },
    ".cm-content": {
      padding: "0.5rem",
      minHeight: `${NOTE_EDITOR_MIN_HEIGHT_PX}px`,
      caretColor: "var(--accent)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--accent)",
    },
    ".cm-selectionBackground": {
      backgroundColor: selectionBg,
    },
    "&.cm-focused .cm-selectionBackground": {
      backgroundColor: selectionBgFocused,
    },
    ".cm-selectionMatch": {
      backgroundColor: "color-mix(in srgb, var(--accent) 22%, var(--paper))",
    },
    ".cm-searchMatch": {
      backgroundColor: "color-mix(in srgb, var(--accent) 40%, var(--paper))",
      outline: "1px solid var(--accent)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "color-mix(in srgb, var(--accent) 55%, var(--paper-line))",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-gutters": {
      display: "none",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-placeholder": {
      color: "var(--ink-muted)",
    },
    ".cm-vim-panel": {
      backgroundColor: "var(--paper)",
      color: "var(--ink)",
      borderTop: "1px solid var(--paper-line)",
    },
    ".cm-vim-panel input": {
      color: "var(--ink)",
    },
  },
  { dark: false },
);

/** `&light` overrides must use baseTheme (not EditorView.theme). */
const paperBaseTheme = EditorView.baseTheme({
  "&light .cm-selectionBackground": {
    backgroundColor: `${selectionBg} !important`,
  },
  "&light.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground":
    {
      backgroundColor: `${selectionBgFocused} !important`,
    },
  "&light .cm-cursor, &light .cm-dropCursor": {
    borderLeftColor: "var(--accent) !important",
  },
});

/** Override Vim’s default pink block cursor and other high-priority themes. */
const paperThemeHighest = Prec.highest(
  EditorView.theme({
    ".cm-fat-cursor": {
      background: "var(--accent) !important",
      color: "var(--card) !important",
    },
    "&:not(.cm-focused) .cm-fat-cursor": {
      background: "none !important",
      outline: "1px solid var(--accent) !important",
      color: "transparent !important",
    },
    ".cm-cursor-primary.cm-fat-cursor": {
      background: "var(--accent) !important",
    },
    ".cm-cursor-secondary.cm-fat-cursor": {
      background: "color-mix(in srgb, var(--accent) 65%, var(--ink)) !important",
    },
  }),
);

const paperHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "var(--ink)", fontWeight: "600" },
  { tag: tags.strong, color: "var(--ink)", fontWeight: "600" },
  { tag: tags.emphasis, color: "var(--ink)", fontStyle: "italic" },
  { tag: tags.link, color: "var(--accent)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--accent)" },
  { tag: tags.monospace, color: "var(--ink)" },
  { tag: tags.quote, color: "var(--ink-muted)", fontStyle: "italic" },
  { tag: tags.list, color: "var(--ink)" },
  { tag: tags.meta, color: "var(--ink-muted)" },
  { tag: tags.processingInstruction, color: "var(--ink-muted)" },
  { tag: tags.comment, color: "var(--ink-muted)" },
  { tag: tags.keyword, color: "var(--ink)" },
  { tag: tags.string, color: "var(--ink)" },
  { tag: tags.number, color: "var(--ink)" },
  { tag: tags.operator, color: "var(--ink-muted)" },
  { tag: tags.punctuation, color: "var(--ink-muted)" },
  { tag: tags.content, color: "var(--ink)" },
]);

type NoteCodeMirrorEditorProps = {
  value: string;
  onChange: (value: string) => void;
  resetKey: string;
  placeholder?: string;
  expanded?: boolean;
  /** Fill parent flex height instead of growing with content. */
  fillAvailable?: boolean;
};

export function NoteCodeMirrorEditor({
  value,
  onChange,
  resetKey,
  placeholder,
  expanded = false,
  fillAvailable = false,
}: NoteCodeMirrorEditorProps) {
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const fillAvailableRef = useRef(fillAvailable);
  fillAvailableRef.current = fillAvailable;
  const viewRef = useRef<EditorView | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const syncToContainer = useCallback(() => {
    const view = viewRef.current;
    const container = containerRef.current;
    if (!view || !container) return;
    syncCodeMirrorViewToContainer(view, container.clientHeight);
  }, []);

  useEffect(() => {
    if (!fillAvailable || !viewRef.current) return;
    syncToContainer();
  }, [fillAvailable, value, resetKey, syncToContainer]);

  useEffect(() => {
    if (!fillAvailable) {
      if (viewRef.current) {
        syncCodeMirrorViewHeight(viewRef.current, expanded);
      }
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => syncToContainer());
    ro.observe(container);
    return () => ro.disconnect();
  }, [fillAvailable, expanded, syncToContainer]);

  const extensions = useMemo(
    () => [
      markdown(),
      vim(),
      paperTheme,
      paperBaseTheme,
      paperThemeHighest,
      syntaxHighlighting(paperHighlight, { fallback: true }),
      EditorView.lineWrapping,
      noteEditorAutoGrow(
        () => expandedRef.current,
        () => fillAvailableRef.current,
      ),
    ],
    [],
  );

  return (
    <div
      ref={containerRef}
      className={`note-codemirror-editor w-full rounded border border-paper-line bg-card text-sm overflow-hidden ${
        fillAvailable ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <CodeMirror
        key={resetKey}
        value={value}
        theme="none"
        minHeight={`${NOTE_EDITOR_MIN_HEIGHT_PX}px`}
        maxHeight={
          fillAvailable
            ? "100%"
            : `${maxEditorHeightPx(expanded)}px`
        }
        placeholder={placeholder}
        extensions={extensions}
        onChange={onChange}
        onUpdate={(update) => {
          if (fillAvailableRef.current) {
            syncToContainer();
            return;
          }
          if (update.docChanged || update.geometryChanged) {
            syncCodeMirrorViewHeight(update.view, expandedRef.current);
          }
        }}
        onCreateEditor={(view) => {
          viewRef.current = view;
          if (fillAvailableRef.current) {
            syncToContainer();
            requestAnimationFrame(() => syncToContainer());
            return;
          }
          syncCodeMirrorViewHeight(view, expandedRef.current);
          requestAnimationFrame(() =>
            syncCodeMirrorViewHeight(view, expandedRef.current),
          );
        }}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          syntaxHighlighting: false,
          highlightSelectionMatches: false,
        }}
      />
    </div>
  );
}
