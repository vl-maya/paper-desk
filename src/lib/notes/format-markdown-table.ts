import {
  isTableRowLine,
  normalizeMarkdownLinks,
} from "@/lib/ask/normalizeMarkdown";

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes("-")) return false;
  const cells = t.split("|").map((c) => c.trim());
  return cells.some((c) => /^:?-{3,}:?$/.test(c));
}

function parseTableCells(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

function normalizeTableRow(line: string, separator: boolean): string {
  let t = line.trim();
  if (separator) {
    if (!t.startsWith("|")) t = `|${t}`;
    if (!t.endsWith("|")) t = `${t}|`;
    return t;
  }
  if (!t.startsWith("|")) t = `| ${t}`;
  if (!t.endsWith("|")) t = `${t} |`;
  return t.replace(/\|\s*\|/g, "| |");
}

export type MarkdownTableBlock = {
  /** 1-based first line of the table in the document */
  startLine: number;
  /** 1-based last line of the table in the document */
  endLine: number;
};

/** Contiguous GFM-style table blocks (pipe rows). */
export function findMarkdownTableBlocks(text: string): MarkdownTableBlock[] {
  const lines = text.split("\n");
  const blocks: MarkdownTableBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!isTableRowLine(line)) {
      i++;
      continue;
    }

    const start = i;
    const blockLines: string[] = [];
    while (i < lines.length) {
      const current = lines[i]!;
      if (current.trim() === "") {
        if (i + 1 < lines.length && isTableRowLine(lines[i + 1]!)) {
          i++;
          continue;
        }
        break;
      }
      if (!isTableRowLine(current)) break;
      blockLines.push(current);
      i++;
    }

    if (blockLines.length >= 1) {
      blocks.push({
        startLine: start + 1,
        endLine: start + blockLines.length,
      });
    }
  }

  return blocks;
}

/** Align columns and normalize pipes for one markdown table block. */
export function formatMarkdownTableLines(lines: string[]): string[] {
  if (lines.length === 0) return lines;

  const rows = lines.map((line) => {
    const trimmed = line.trim();
    const separator = isTableSeparator(trimmed);
    const normalized = normalizeTableRow(trimmed, separator);
    return {
      separator,
      cells: parseTableCells(normalized),
    };
  });

  const colCount = Math.max(1, ...rows.map((r) => r.cells.length));
  const widths = Array.from({ length: colCount }, () => 3);

  for (const row of rows) {
    if (row.separator) continue;
    row.cells.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 3, cell.length, 3);
    });
  }

  const formatted = rows.map((row) => {
    const cells = Array.from({ length: colCount }, (_, index) => {
      if (row.separator) {
        const w = Math.max(3, widths[index] ?? 3);
        return "-".repeat(w);
      }
      return (row.cells[index] ?? "").padEnd(widths[index] ?? 3);
    });
    return `| ${cells.join(" | ")} |`;
  });

  return normalizeMarkdownLinks(formatted.join("\n")).split("\n");
}

export function formatMarkdownTableBlockInText(
  text: string,
  block: MarkdownTableBlock,
): string {
  const lines = text.split("\n");
  const slice = lines.slice(block.startLine - 1, block.endLine);
  const formatted = formatMarkdownTableLines(slice);
  const out = [...lines];
  out.splice(block.startLine - 1, slice.length, ...formatted);
  return out.join("\n");
}
