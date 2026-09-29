function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes("-")) return false;
  const cells = t.split("|").map((c) => c.trim());
  return cells.some((c) => /^:?-{3,}:?$/.test(c));
}

function pipeCount(line: string): number {
  return (line.match(/\|/g) ?? []).length;
}

/** Line looks like a GFM table row (header, separator, or body). */
export function isTableRowLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (isTableSeparator(t)) return true;
  if (pipeCount(t) < 2) return false;
  return true;
}

/** GFM lists require `-`; macOS often inserts en-dash or bullet when typing. */
function normalizeBulletMarker(line: string): string {
  return line.replace(/^(\s*)[–—•]\s+/, "$1- ");
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

/**
 * Fixes common CLI markdown table mistakes so remark-gfm can parse them.
 */
export function normalizeAskMarkdown(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    if (!isTableRowLine(line)) {
      out.push(normalizeBulletMarker(line));
      i++;
      continue;
    }

    if (out.length > 0 && out[out.length - 1]!.trim() !== "") {
      out.push("");
    }

    const block: string[] = [];
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
      block.push(current);
      i++;
    }

    for (const row of block) {
      out.push(
        normalizeTableRow(row, isTableSeparator(row)),
      );
    }

    if (out.length > 0 && out[out.length - 1]!.trim() !== "") {
      out.push("");
    }
  }

  return out.join("\n").trimEnd();
}
