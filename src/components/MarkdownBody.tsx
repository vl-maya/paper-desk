"use client";

import Link from "next/link";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { normalizeAskMarkdown } from "@/lib/ask/normalizeMarkdown";
import {
  isExternalHttpHref,
  resolveAppLink,
} from "@/lib/markdown/resolveAppLink";

const components: Components = {
  a: ({ href, children, ...props }) => {
    const appHref = href ? resolveAppLink(href) : null;
    if (appHref) {
      return (
        <Link href={appHref} className="ask-markdown-link">
          {children}
        </Link>
      );
    }
    if (href && isExternalHttpHref(href)) {
      return (
        <a
          href={href}
          className="ask-markdown-link"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} className="ask-markdown-link" {...props}>
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="ask-markdown-table-wrap my-3 overflow-x-auto rounded border border-paper-line">
      <table className="ask-markdown-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="ask-markdown-thead">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="ask-markdown-tr">{children}</tr>,
  th: ({ children }) => <th scope="col">{children}</th>,
  td: ({ children }) => <td>{children}</td>,
};

export function MarkdownBody({
  content,
  className = "",
  compact = false,
}: {
  content: string;
  className?: string;
  /** Tighter spacing for task cards and inline previews */
  compact?: boolean;
}) {
  const normalized = useMemo(() => normalizeAskMarkdown(content), [content]);
  const rootClass = [
    "ask-markdown text-sm",
    compact ? "task-markdown" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
