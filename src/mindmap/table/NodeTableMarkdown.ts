export interface ProtectedMindMapTables {
  markdown: string;
  tables: Map<string, string>;
}

export interface NodeTableMarkdown {
  title: string;
  markdown: string;
}

const TABLE_MARKER_PREFIX = '__MM_NODE_TABLE_';
const TABLE_MARKER_SUFFIX = '__';
const COLLAPSED_NODE_ID = /\s\^[a-z0-9-]+$/i;

export function protectMindMapTables(markdown: string): ProtectedMindMapTables {
  const lines = markdown.split(/\r?\n/);
  const tables = new Map<string, string>();
  let inFence = false;

  for (let index = 0; index < lines.length; index++) {
    if (/^\s*```/.test(lines[index])) {
      inFence = !inFence;
      continue;
    }
    if (inFence || !isTableStart(lines, index)) continue;

    const ownerIndex = findTableOwner(lines, index);
    if (ownerIndex === null) continue;

    const end = findTableEnd(lines, index);
    const marker = `${TABLE_MARKER_PREFIX}${tables.size}${TABLE_MARKER_SUFFIX}`;
    tables.set(marker, removeSharedIndent(lines.slice(index, end)).join('\n').trim());
    lines[ownerIndex] = appendMarker(lines[ownerIndex], marker);
    lines.splice(index, end - index);
    index--;
  }

  return { markdown: lines.join('\n'), tables };
}

export function restoreProtectedMindMapTables(text: string, tables: Map<string, string>): string {
  let restored = text;
  tables.forEach((table, marker) => {
    restored = restored.replace(
      new RegExp(`[ \\t]*${escapeRegExp(marker)}[ \\t]*`),
      `\n\n${table}`,
    );
  });
  return restored.trim();
}

export function getNodeTableMarkdown(markdown: string): NodeTableMarkdown | null {
  const lines = markdown.trim().split(/\r?\n/);
  for (let index = 0; index < lines.length; index++) {
    if (!isTableStart(lines, index)) continue;

    const end = findTableEnd(lines, index);
    const title = lines.slice(0, index).join('\n').trim();
    const trailing = lines.slice(end).join('\n').trim();
    if (!title || trailing) return null;

    return {
      title,
      markdown: removeSharedIndent(lines.slice(index, end)).join('\n').trim(),
    };
  }
  return null;
}

function isTableStart(lines: string[], index: number): boolean {
  return Boolean(
    lines[index]?.includes('|') &&
    lines[index + 1] &&
    isTableDivider(lines[index + 1]),
  );
}

function isTableDivider(line: string): boolean {
  const cells = trimTableEdges(line.trim()).split('|').map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function findTableEnd(lines: string[], start: number): number {
  let end = start + 2;
  while (end < lines.length && lines[end].trim() && lines[end].includes('|')) {
    end++;
  }
  return end;
}

function findTableOwner(lines: string[], tableStart: number): number | null {
  for (let index = tableStart - 1; index >= 0; index--) {
    if (!lines[index].trim()) continue;
    return isNodeLine(lines[index]) ? index : null;
  }
  return null;
}

function isNodeLine(line: string): boolean {
  return /^\s{0,3}#{1,6}\s+/.test(line) || /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
}

function appendMarker(line: string, marker: string): string {
  const collapsedId = line.match(COLLAPSED_NODE_ID)?.[0] || '';
  const content = collapsedId ? line.slice(0, -collapsedId.length) : line;
  return `${content} ${marker}${collapsedId}`;
}

function removeSharedIndent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^\s*/)?.[0].length || 0);
  const indent = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(indent));
}

function trimTableEdges(value: string): string {
  return value.replace(/^\|/, '').replace(/\|$/, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
