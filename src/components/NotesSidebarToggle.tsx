"use client";

export type NotesSidebarToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function NotesSidebarToggle({
  collapsed,
  onToggle,
}: NotesSidebarToggleProps) {
  const action = collapsed ? "Show" : "Hide";

  return (
    <button
      type="button"
      className="group -ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 font-serif text-2xl text-ink transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={`${action} notes list`}
      aria-expanded={!collapsed}
      aria-controls="notes-sidebar"
      onClick={onToggle}
    >
      <span>Notes</span>
      <span
        aria-hidden
        className={`flex size-7 items-center justify-center rounded-full border border-current/30 font-sans text-lg leading-none transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:border-current/60 ${
          collapsed ? "rotate-0" : "rotate-180"
        }`}
      >
        ›
      </span>
    </button>
  );
}
