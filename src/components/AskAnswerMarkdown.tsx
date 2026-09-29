"use client";

import { MarkdownBody } from "./MarkdownBody";

export function AskAnswerMarkdown({ content }: { content: string }) {
  return <MarkdownBody content={content} />;
}
