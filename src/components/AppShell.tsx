"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import {
  shouldConfirmAskLeave,
  useAskNavigationGuard,
} from "@/lib/ask/useAskNavigationGuard";
import {
  useDirectionActiveCount,
  useTotalBacklogCount,
  useWorkspaceStore,
} from "@/lib/store/workspace-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirmLeave } = useAskNavigationGuard();
  const backlogTotal = useTotalBacklogCount();
  const inboundActive = useDirectionActiveCount("inbound");

  const nav = [
    { href: "/", label: "Dashboard" },
    { href: "/outbound", label: "Outbound" },
    { href: "/inbound", label: `Inbound (${inboundActive})` },
    { href: "/backlog", label: `Backlog (${backlogTotal})` },
    { href: "/delivered", label: "Delivered" },
    { href: "/notes", label: "Notes" },
    { href: "/schedule", label: "Schedule" },
    { href: "/ask", label: "Ask desk" },
    { href: "/settings", label: "Settings" },
  ];
  const ioMode = useWorkspaceStore((s) => s.ioMode);
  const serverRoot = useWorkspaceStore((s) => s.serverRoot);
  const linkedFolderName = useWorkspaceStore((s) => s.linkedFolderName);
  const message = useWorkspaceStore((s) => s.message);
  const clearMessage = useWorkspaceStore((s) => s.clearMessage);

  const storageLabel =
    ioMode === "server" && serverRoot
      ? `Local JSON · ${serverRoot.length > 36 ? `…${serverRoot.slice(-34)}` : serverRoot}`
      : ioMode === "fs-access" && linkedFolderName
        ? `Linked folder · ${linkedFolderName}`
        : ioMode === "server"
          ? "Local JSON (server)"
          : ioMode === "fs-access"
            ? "Linked folder"
            : "Not connected";

  return (
    <div className="flex min-h-screen paper-bg">
      <aside className="sticky top-0 self-start flex h-dvh w-52 shrink-0 flex-col border-r border-paper-line bg-card/80 p-4 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <AppIcon className="h-9 w-9 shrink-0 rounded-md shadow-sm" />
            <h1 className="font-serif text-xl text-ink">Paper Desk</h1>
          </div>
          <p className="text-xs text-ink-muted">Schedule · order · record</p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/ask" && pathname.startsWith("/ask"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  if (
                    shouldConfirmAskLeave(item.href, pathname) &&
                    !confirmLeave()
                  ) {
                    e.preventDefault();
                    return;
                  }
                  if (shouldConfirmAskLeave(item.href, pathname)) {
                    e.preventDefault();
                    router.push(item.href);
                  }
                }}
                className={`rounded px-3 py-2 text-sm ${
                  active
                    ? "bg-accent/15 font-medium text-ink"
                    : "text-ink-muted hover:bg-paper-line/50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="mt-auto pt-8 text-xs text-ink-muted break-all" title={serverRoot ?? undefined}>
          Storage: {storageLabel}
        </p>
      </aside>
      <main className="min-w-0 flex-1 p-6 md:p-8">
        {message && (
          <div
            className="mb-4 paper-card px-4 py-2 text-sm flex justify-between items-center"
            role="status"
          >
            <span>{message}</span>
            <button
              type="button"
              className="text-accent underline text-xs"
              onClick={clearMessage}
            >
              Dismiss
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
