export interface NodeCodeBlock {
  markdown: string;
  language: string;
  code: string;
  fenceCharacter: '`' | '~';
  fenceLength: number;
  start: number;
  end: number;
  size?: NodeCodeSize;
}

export interface NodeCodeSize {
  width: number;
  height: number;
}

export interface ProtectedMindMapCodeBlocks {
  markdown: string;
  blocks: Map<string, string>;
}

interface MarkdownLine {
  text: string;
  start: number;
  end: number;
  fullEnd: number;
}

interface ParsedFence extends NodeCodeBlock {
  startLine: number;
  endLine: number;
}

const CODE_MARKER_PREFIX = '__MM_NODE_CODE_';
const CODE_MARKER_SUFFIX = '__';
const COLLAPSED_NODE_ID = /\s\^[a-z0-9-]+$/i;
const CODE_SIZE_PATTERN = /^[ \t]*<!--\s*mm-code-size:\s*(\d+)x(\d+)\s*-->[ \t]*$/i;
export const MIN_NODE_CODE_WIDTH = 280;
export const MAX_NODE_CODE_WIDTH = 900;
export const MIN_NODE_CODE_HEIGHT = 120;
export const MAX_NODE_CODE_HEIGHT = 600;
export const NODE_CODE_ANCHOR = '&#8203;';

export function parseNodeCodeBlocks(markdown: string): NodeCodeBlock[] {
  return parseFences(markdown).map(({startLine, endLine, ...block}) => block);
}

export function isNodeCodeFenceOpening(line: string): boolean {
  return Boolean(readOpeningFence(line) || readNodeCodeSize(line));
}

export function readFencedCodeBlock(
  lines: string[],
  start: number,
): {text: string; end: number} | null {
  if (!isNodeCodeFenceOpening(lines[start] || '')) return null;
  const source = lines.slice(start).join('\n');
  const block = parseFences(source)[0];
  if (!block || block.start !== 0) return null;
  return {
    text: block.markdown,
    end: start + block.endLine + 1,
  };
}

export function createNodeCodeMarkdown(
  language: string,
  code: string,
  size?: NodeCodeSize,
): string {
  const normalizedLanguage = normalizeNodeCodeLanguage(language);
  const normalizedCode = normalizeCode(code);
  const fenceLength = Math.max(3, longestRun(normalizedCode, '`') + 1);
  const fence = '`'.repeat(fenceLength);
  const body = normalizedCode.endsWith('\n') || !normalizedCode
    ? normalizedCode
    : `${normalizedCode}\n`;
  const codeMarkdown = `${fence}${normalizedLanguage}\n${body}${fence}`;
  const normalizedSize = normalizeNodeCodeSize(size);
  return normalizedSize
    ? `<!-- mm-code-size: ${normalizedSize.width}x${normalizedSize.height} -->\n${codeMarkdown}`
    : codeMarkdown;
}

export function normalizeNodeCodeSize(size?: Partial<NodeCodeSize>): NodeCodeSize | undefined {
  if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height)) return undefined;
  return {
    width: Math.round(Math.max(MIN_NODE_CODE_WIDTH, Math.min(MAX_NODE_CODE_WIDTH, size.width!))),
    height: Math.round(Math.max(MIN_NODE_CODE_HEIGHT, Math.min(MAX_NODE_CODE_HEIGHT, size.height!))),
  };
}

export function serializeMindMapNodeWithCode(
  markdown: string,
  ownerPrefix: string,
  continuationIndent: string,
  ending = '',
): string | null {
  const content = markdown.trim();
  const firstCode = parseNodeCodeBlocks(content)[0];
  if (!firstCode) return null;

  const leadingText = content.slice(0, firstCode.start).trim();
  const ownerText = leadingText
    ? leadingText.replace(/(?:\r?\n)+/g, '<br>')
    : NODE_CODE_ANCHOR;
  const body = content.slice(firstCode.start).replace(/\r\n/g, '\n');
  const bodyLines = body.split('\n').map((line) => `${continuationIndent}${line}`);
  return `${ownerPrefix}${ownerText}${ending}\n${bodyLines.join('\n')}\n`;
}

export function normalizeNodeCodeLanguage(language: string): string {
  return language.trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9_+#.\-]/g, '') || '';
}

export function protectMindMapCodeBlocks(markdown: string): ProtectedMindMapCodeBlocks {
  const lines = markdown.split(/\r?\n/);
  const source = lines.join('\n');
  const fences = parseFences(source);
  const blocks = new Map<string, string>();
  if (!fences.length) return {markdown, blocks};

  const fenceLines = new Set<number>();
  fences.forEach((fence) => {
    for (let index = fence.startLine; index <= fence.endLine; index++) fenceLines.add(index);
  });
  const nodeLines = lines
    .map((line, index) => ({line, index}))
    .filter(({line, index}) => !fenceLines.has(index) && isNodeLine(line))
    .map(({index}) => index);
  const sections = nodeLines.map((ownerIndex, index) => ({
    ownerIndex,
    end: nodeLines[index + 1] ?? lines.length,
  })).filter(({ownerIndex, end}) => (
    fences.some((fence) => fence.startLine > ownerIndex && fence.startLine < end)
  ));

  sections.reverse().forEach(({ownerIndex, end}) => {
    const bodyLines = trimOuterBlankLines(lines.slice(ownerIndex + 1, end));
    if (!bodyLines.length) return;
    const marker = createMarker(blocks, markdown);
    blocks.set(marker, removeSharedIndent(bodyLines).join('\n'));
    lines[ownerIndex] = appendMarker(lines[ownerIndex], marker);
    lines.splice(ownerIndex + 1, end - ownerIndex - 1);
  });

  return {markdown: lines.join('\n'), blocks};
}

export function restoreProtectedMindMapCodeBlocks(
  text: string,
  blocks: Map<string, string>,
): string {
  let restored = text;
  blocks.forEach((body, marker) => {
    restored = restored.replace(
      new RegExp(`[ \\t]*${escapeRegExp(marker)}[ \\t]*`),
      `\n\n${body}`,
    );
  });
  return restored.replace(NODE_CODE_ANCHOR, '').trim();
}

function parseFences(markdown: string): ParsedFence[] {
  const lines = splitMarkdownLines(markdown);
  const blocks: ParsedFence[] = [];
  let index = 0;

  while (index < lines.length) {
    const opening = readOpeningFence(lines[index].text);
    if (!opening) {
      index++;
      continue;
    }

    const closingIndex = findClosingFence(lines, index + 1, opening.character, opening.length);
    if (closingIndex < 0) {
      break;
    }

    const closing = lines[closingIndex];
    const size = index > 0 ? readNodeCodeSize(lines[index - 1].text) : undefined;
    const startLine = size ? index - 1 : index;
    const contentStart = lines[index].fullEnd;
    const contentEnd = closing.start;
    const rawCode = markdown.slice(contentStart, contentEnd).replace(/\r\n/g, '\n');
    const code = rawCode.endsWith('\n') ? rawCode.slice(0, -1) : rawCode;
    blocks.push({
      markdown: markdown.slice(lines[startLine].start, closing.end),
      language: normalizeNodeCodeLanguage(opening.info),
      code,
      fenceCharacter: opening.character,
      fenceLength: opening.length,
      start: lines[startLine].start,
      end: closing.end,
      size,
      startLine,
      endLine: closingIndex,
    });
    index = closingIndex + 1;
  }

  return blocks;
}

function readNodeCodeSize(line: string): NodeCodeSize | undefined {
  const match = line.match(CODE_SIZE_PATTERN);
  if (!match) return undefined;
  return normalizeNodeCodeSize({width: Number(match[1]), height: Number(match[2])});
}

function splitMarkdownLines(markdown: string): MarkdownLine[] {
  const lines: MarkdownLine[] = [];
  const pattern = /.*?(?:\r\n|\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) && match[0]) {
    const full = match[0];
    const text = full.replace(/\r?\n$/, '');
    lines.push({
      text,
      start: match.index,
      end: match.index + text.length,
      fullEnd: match.index + full.length,
    });
  }
  return lines;
}

function readOpeningFence(line: string): {
  character: '`' | '~';
  length: number;
  info: string;
} | null {
  const match = line.match(/^[ \t]*(`{3,}|~{3,})([^\r\n]*)$/);
  if (!match) return null;
  if (match[1][0] === '`' && match[2].includes('`')) return null;
  return {
    character: match[1][0] as '`' | '~',
    length: match[1].length,
    info: match[2].trim(),
  };
}

function findClosingFence(
  lines: MarkdownLine[],
  start: number,
  character: '`' | '~',
  minimumLength: number,
): number {
  const pattern = new RegExp(`^[ \\t]*${escapeRegExp(character)}{${minimumLength},}[ \\t]*$`);
  for (let index = start; index < lines.length; index++) {
    if (pattern.test(lines[index].text)) return index;
  }
  return -1;
}

function normalizeCode(code: string): string {
  return code.replace(/\r\n?/g, '\n');
}

function longestRun(value: string, character: string): number {
  const matches: string[] = value.match(new RegExp(`${escapeRegExp(character)}+`, 'g')) || [];
  return matches.reduce<number>((longest, match) => Math.max(longest, match.length), 0);
}

function isNodeLine(line: string): boolean {
  return /^\s{0,3}#{1,6}\s+/.test(line) || /^\s*(?:[-+*]|\d+[.)])(?:\s+|$)/.test(line);
}

function appendMarker(line: string, marker: string): string {
  const collapsedId = line.match(COLLAPSED_NODE_ID)?.[0] || '';
  const content = collapsedId ? line.slice(0, -collapsedId.length) : line;
  return `${content} ${marker}${collapsedId}`;
}

function createMarker(blocks: Map<string, string>, markdown: string): string {
  let index = blocks.size;
  let marker = '';
  do {
    marker = `${CODE_MARKER_PREFIX}${index++}${CODE_MARKER_SUFFIX}`;
  } while (blocks.has(marker) || markdown.includes(marker));
  return marker;
}

function trimOuterBlankLines(lines: string[]): string[] {
  const trimmed = [...lines];
  while (trimmed.length && !trimmed[0].trim()) trimmed.shift();
  while (trimmed.length && !trimmed[trimmed.length - 1].trim()) trimmed.pop();
  return trimmed;
}

function removeSharedIndent(lines: string[]): string[] {
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^[ \t]*/)?.[0].length || 0);
  const indent = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(indent));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
