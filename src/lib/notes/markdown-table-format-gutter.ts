import { RangeSet, StateField, type Extension } from "@codemirror/state";
import {
  EditorView,
  GutterMarker,
  gutter,
  gutters,
} from "@codemirror/view";
import {
  findMarkdownTableBlocks,
  formatMarkdownTableLines,
  type MarkdownTableBlock,
} from "@/lib/notes/format-markdown-table";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Align-columns icon (table format). */
function createFormatTableIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("class", "cm-table-format-icon");
  svg.setAttribute("aria-hidden", "true");

  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round" as const,
  };

  for (const d of ["M4 7h16", "M4 12h11", "M4 17h14"]) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", stroke.fill);
    path.setAttribute("stroke", stroke.stroke);
    path.setAttribute("stroke-width", stroke.strokeWidth);
    path.setAttribute("stroke-linecap", stroke.strokeLinecap);
    svg.appendChild(path);
  }

  return svg;
}

const FORMAT_TABLE_TOOLTIP = "Format Table";

function attachFormatTableTooltip(btn: HTMLButtonElement): void {
  let tip: HTMLDivElement | null = null;

  const position = () => {
    if (!tip) return;
    const rect = btn.getBoundingClientRect();
    tip.style.left = `${rect.right + 6}px`;
    tip.style.top = `${rect.top + rect.height / 2}px`;
  };

  const hide = () => {
    tip?.remove();
    tip = null;
  };

  const show = () => {
    hide();
    tip = document.createElement("div");
    tip.className = "cm-table-format-tooltip";
    tip.textContent = FORMAT_TABLE_TOOLTIP;
    tip.setAttribute("role", "tooltip");
    document.body.appendChild(tip);
    position();
  };

  btn.addEventListener("mouseenter", show);
  btn.addEventListener("mouseleave", hide);
  btn.addEventListener("focus", show);
  btn.addEventListener("blur", hide);
}

class TableFormatSpacer extends GutterMarker {
  eq(other: GutterMarker): boolean {
    return other instanceof TableFormatSpacer;
  }

  toDOM(): Node {
    const span = document.createElement("span");
    span.className = "cm-table-format-spacer";
    span.appendChild(createFormatTableIcon());
    return span;
  }
}

class TableFormatButton extends GutterMarker {
  constructor(readonly block: MarkdownTableBlock) {
    super();
  }

  eq(other: GutterMarker): boolean {
    return (
      other instanceof TableFormatButton &&
      other.block.startLine === this.block.startLine &&
      other.block.endLine === this.block.endLine
    );
  }

  toDOM(view: EditorView): Node {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cm-table-format-btn";
    btn.setAttribute("aria-label", FORMAT_TABLE_TOOLTIP);
    btn.appendChild(createFormatTableIcon());
    attachFormatTableTooltip(btn);

    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const { doc } = view.state;
      const from = doc.line(this.block.startLine).from;
      const to = doc.line(this.block.endLine).to;
      const lines = doc.sliceString(from, to).split("\n");
      const formatted = formatMarkdownTableLines(lines);
      view.dispatch({
        changes: { from, to, insert: formatted.join("\n") },
      });
      view.focus();
    });

    return btn;
  }
}

function tableFormatMarkers(doc: EditorView["state"]["doc"]): RangeSet<GutterMarker> {
  const blocks = findMarkdownTableBlocks(doc.toString());
  if (blocks.length === 0) return RangeSet.empty;

  const ranges = blocks.map((block) => {
    const line = doc.line(block.startLine);
    return {
      from: line.from,
      to: line.from,
      value: new TableFormatButton(block),
    };
  });

  return RangeSet.of(ranges, true);
}

const tableFormatMarkerField = StateField.define<RangeSet<GutterMarker>>({
  create(state) {
    return tableFormatMarkers(state.doc);
  },
  update(markers, tr) {
    if (!tr.docChanged) return markers;
    return tableFormatMarkers(tr.newDoc);
  },
});

const tableFormatGutterTheme = EditorView.theme({
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "none",
    color: "var(--ink-muted)",
  },
  ".cm-gutter": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  ".cm-table-format-gutter": {
    minWidth: "1.125rem",
  },
  ".cm-table-format-gutter .cm-gutterElement": {
    padding: "0 0.125rem",
    backgroundColor: "transparent",
  },
  ".cm-table-format-btn": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1.125rem",
    height: "1.125rem",
    margin: "0",
    padding: "0",
    border: "none",
    borderRadius: "2px",
    background: "transparent",
    color: "var(--accent)",
    cursor: "pointer",
    lineHeight: "0",
  },
  ".cm-table-format-btn:hover": {
    background: "transparent",
    color: "var(--ink)",
  },
  ".cm-table-format-btn:focus-visible": {
    outline: "2px solid var(--accent)",
    outlineOffset: "1px",
  },
  ".cm-table-format-spacer": {
    display: "inline-flex",
    width: "1.125rem",
    height: "1.125rem",
    visibility: "hidden",
  },
  ".cm-table-format-icon": {
    display: "block",
    flexShrink: "0",
  },
});

/** Left gutter with a Format control on the first line of each markdown table. */
export function markdownTableFormatGutter(): Extension {
  return [
    tableFormatGutterTheme,
    gutters({ fixed: true }),
    gutter({
      class: "cm-table-format-gutter",
      markers: (view) => view.state.field(tableFormatMarkerField),
      initialSpacer: () => new TableFormatSpacer(),
    }),
    tableFormatMarkerField,
  ];
}
