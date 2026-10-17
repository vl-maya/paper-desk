"use client";

import { forwardRef } from "react";
import { NOTES_SIDEBAR_PANEL_ID } from "@/lib/notes/sidebar-preference";

export type NotesSidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export const NotesSidebarToggle = forwardRef<
  HTMLButtonElement,
  NotesSidebarToggleProps
>(function NotesSidebarToggle({ collapsed, onToggle }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="group -ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 font-serif text-2xl text-ink transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-labelledby="notes-page-heading"
      aria-describedby="notes-sidebar-toggle-hint"
      aria-expanded={!collapsed}
      aria-controls={NOTES_SIDEBAR_PANEL_ID}
      onClick={onToggle}
    >
      <span aria-hidden>Notes</span>
      <span
        aria-hidden
        className={`flex size-7 items-center justify-center rounded-full border border-current/30 font-sans text-lg leading-none transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:border-current/60 ${
          collapsed ? "rotate-0" : "rotate-180"
        }`}
      >
        ›
      </span>
      <span id="notes-sidebar-toggle-hint" className="sr-only">
        {collapsed ? "Show notes list" : "Hide notes list"}
      </span>
    </button>
  );
});
