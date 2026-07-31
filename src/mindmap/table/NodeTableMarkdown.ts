export interface ProtectedMindMapTables {
  markdown: string;
  tables: Map<string, string>;
}

export interface NodeTableMarkdown {
  title: string;
  markdown: string;
}

export interface NodeTableDocument {
  title: string;
  headers: string[];
  alignments: Array<'left' | 'center' | 'right' | null>;
  rows: string[][];
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

export function getNodeTableDocument(markdown: string): NodeTableDocument | null {
  const nodeTable = getNodeTableMarkdown(markdown);
  if (!nodeTable) return null;

  const lines = nodeTable.markdown.split(/\r?\n/);
  const headers = parseTableRow(lines[0]);
  const alignments = parseTableRow(lines[1]).map((cell) => {
    const value = cell.trim();
    if (/^:-{3,}:$/.test(value)) return 'center';
    if (/^-{3,}:$/.test(value)) return 'right';
    if (/^:-{3,}$/.test(value)) return 'left';
    return null;
  });
  const width = headers.length;

  return {
    title: nodeTable.title,
    headers: normalizeRow(headers, width),
    alignments: normalizeRow(alignments, width),
    rows: lines.slice(2).map((line) => normalizeRow(parseTableRow(line), width)),
  };
}

export function serializeNodeTableDocument(table: NodeTableDocument): string {
  const width = Math.max(1, table.headers.length, ...table.rows.map((row) => row.length));
  const headers = normalizeRow(table.headers, width);
  const alignments = normalizeRow(table.alignments, width);
  const rows = table.rows.map((row) => normalizeRow(row, width));
  const markdown = [
    serializeTableRow(headers),
    serializeTableRow(alignments.map(serializeAlignment)),
    ...rows.map(serializeTableRow),
  ].join('\n');
  return `${table.title.trim()}\n\n${markdown}`.trim();
}

function isTableStart(lines: string[], index: number): boolean {
  return Boolean(
    lines[index]?.includes('|') &&
    lines[index + 1] &&
    isMindMapTableDivider(lines[index + 1]),
  );
}

export function isMindMapTableDivider(line: string): boolean {
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

function parseTableRow(line: string): string[] {
  const source = trimTableEdges(line.trim());
  const cells: string[] = [];
  let cell = '';
  let escaped = false;
  for (const character of source) {
    if (escaped) {
      cell += character;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function serializeTableRow(cells: Array<string | null>): string {
  return `| ${cells.map((cell) => escapeTableCell(cell || '')).join(' | ')} |`;
}

function escapeTableCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function serializeAlignment(alignment: NodeTableDocument['alignments'][number]): string {
  if (alignment === 'left') return ':---';
  if (alignment === 'center') return ':---:';
  if (alignment === 'right') return '---:';
  return '---';
}

function normalizeRow<T>(row: T[], width: number): T[] {
  return Array.from({ length: width }, (_, index) => row[index] ?? ('' as T));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
