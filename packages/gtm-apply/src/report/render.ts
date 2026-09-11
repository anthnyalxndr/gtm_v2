import type { ChangeKind, ChangeReport, EntityChange, FieldDiff } from "./change-report.js";

const KIND_ORDER: Record<string, number> = {
  customTemplate: 0,
  builtInVariable: 1,
  folder: 2,
  variable: 3,
  client: 4,
  transformation: 5,
  trigger: 6,
  tag: 7,
};
const KIND_LABEL: Record<string, string> = {
  customTemplate: "Custom templates",
  builtInVariable: "Built-in variables",
  folder: "Folders",
  variable: "Variables",
  client: "Clients",
  transformation: "Transformations",
  trigger: "Triggers",
  tag: "Tags",
};
const MARK: Record<ChangeKind, string> = { added: "+", removed: "-", changed: "~", unchanged: "=" };

const short = (v: unknown): string => {
  if (v === undefined) return "∅";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 120 ? s.slice(0, 117) + "…" : s;
};

/** Group changes by recipe (an entity appears under each recipe it belongs to), then by kind. */
function groups(report: ChangeReport): { title: string; changes: EntityChange[] }[] {
  const recipeNames = [...new Set(report.changes.flatMap((c) => c.recipes ?? []))].sort();
  const out: { title: string; changes: EntityChange[] }[] = [];
  for (const recipe of recipeNames) {
    out.push({ title: recipe, changes: report.changes.filter((c) => c.recipes?.includes(recipe)) });
  }
  const orphans = report.changes.filter((c) => !c.recipes?.length);
  if (orphans.length)
    out.push({ title: recipeNames.length ? "Other changes" : "Changes", changes: orphans });
  return out;
}

const byKind = (changes: readonly EntityChange[]): EntityChange[] =>
  [...changes].sort(
    (a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) || a.name.localeCompare(b.name)
  );

const summary = (report: ChangeReport): string => {
  const c = report.counts;
  return `${c.added} added, ${c.changed} changed${c.removed ? `, ${c.removed} removed` : ""}, ${c.unchanged} unchanged`;
};

export function renderMarkdownReport(report: ChangeReport): string {
  const lines: string[] = [];
  const where = [report.container, report.workspace].filter(Boolean).join(" / ");
  lines.push(`# Change report${where ? `: ${where}` : ""}`, "", `**${summary(report)}**`, "");
  if (report.changes.length === 0) {
    lines.push("No changes.");
    return lines.join("\n") + "\n";
  }
  for (const group of groups(report)) {
    lines.push(`## ${group.title}`, "");
    let kind = "";
    for (const change of byKind(group.changes)) {
      if (change.kind !== kind) {
        kind = change.kind;
        lines.push("", `### ${KIND_LABEL[kind] ?? kind}`, "");
      }
      const value = change.value !== undefined ? ` = \`${short(change.value)}\`` : "";
      lines.push(`- \`${MARK[change.change]}\` **${change.name}** (${change.change})${value}`);
      for (const d of change.diffs ?? []) {
        lines.push(`  - \`${d.path}\`: ${short(d.before)} → ${short(d.after)}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

const esc = (v: unknown): string =>
  short(v).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
  );

function diffHtml(d: FieldDiff): string {
  return `<div class="field"><span class="path">${esc(d.path)}</span> <span class="before">${esc(d.before)}</span> <span class="arrow">→</span> <span class="after">${esc(d.after)}</span></div>`;
}

export function renderHtmlReport(report: ChangeReport): string {
  const where = [report.container, report.workspace].filter(Boolean).join(" / ");
  const sections = report.changes.length
    ? groups(report)
        .map((group) => {
          let kind = "";
          const rows: string[] = [];
          for (const change of byKind(group.changes)) {
            if (change.kind !== kind) {
              kind = change.kind;
              rows.push(`<h3>${esc(KIND_LABEL[kind] ?? kind)}</h3>`);
            }
            const value =
              change.value !== undefined
                ? ` <span class="value">= ${esc(change.value)}</span>`
                : "";
            const diffs = (change.diffs ?? []).map(diffHtml).join("");
            rows.push(
              `<div class="entity ${change.change}"><span class="mark">${MARK[change.change]}</span> <span class="name">${esc(change.name)}</span> <span class="tag">${esc(change.change)}</span>${value}${diffs ? `<div class="diffs">${diffs}</div>` : ""}</div>`
            );
          }
          return `<section><h2>${esc(group.title)}</h2>${rows.join("")}</section>`;
        })
        .join("")
    : `<p class="empty">No changes.</p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Change report${where ? `: ${esc(where)}` : ""}</title>
<style>
  :root { color-scheme: light dark; --add:#1a7f37; --rem:#cf222e; --chg:#9a6700; --bd:#d0d7de; --mut:#57606a; }
  body { font: 14px/1.5 -apple-system, system-ui, sans-serif; margin: 0; padding: 2rem; max-width: 60rem; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; } h2 { font-size: 1.1rem; border-bottom: 1px solid var(--bd); padding-bottom: .25rem; margin-top: 2rem; }
  h3 { font-size: .85rem; text-transform: uppercase; letter-spacing: .04em; color: var(--mut); margin: 1rem 0 .35rem; }
  .summary { color: var(--mut); margin-bottom: 1rem; }
  .entity { padding: .35rem .5rem; border-left: 3px solid var(--bd); margin: .2rem 0; }
  .entity.added { border-color: var(--add); } .entity.removed { border-color: var(--rem); } .entity.changed { border-color: var(--chg); }
  .mark { font-family: ui-monospace, monospace; font-weight: 700; } .name { font-weight: 600; }
  .tag { font-size: .75rem; color: var(--mut); } .value { font-family: ui-monospace, monospace; font-size: .85rem; }
  .diffs { margin: .35rem 0 .1rem 1.25rem; } .field { font-family: ui-monospace, monospace; font-size: .82rem; margin: .1rem 0; }
  .path { color: var(--mut); } .before { color: var(--rem); text-decoration: line-through; } .after { color: var(--add); } .arrow { color: var(--mut); }
  .empty { color: var(--mut); }
</style></head>
<body>
<h1>Change report${where ? `: ${esc(where)}` : ""}</h1>
<div class="summary">${esc(summary(report))}</div>
${sections}
</body></html>
`;
}

/** Render by file extension: .html/.htm to HTML, anything else to Markdown. */
export function renderReport(report: ChangeReport, path: string): string {
  return /\.html?$/i.test(path) ? renderHtmlReport(report) : renderMarkdownReport(report);
}
