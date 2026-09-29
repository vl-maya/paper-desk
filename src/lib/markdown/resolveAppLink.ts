const APP_PATH_PREFIXES = [
  "/",
  "/notes",
  "/schedule",
  "/inbound",
  "/outbound",
  "/backlog",
  "/delivered",
  "/settings",
  "/ask",
] as const;

function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
}

/** Map absolute same-app URLs (e.g. localhost) to a Next.js-friendly path. */
export function resolveAppLink(href: string): string | null {
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const { pathname, search, hash } = new URL(href);
    if (isAppPath(pathname)) {
      return `${pathname}${search}${hash}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function isExternalHttpHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
