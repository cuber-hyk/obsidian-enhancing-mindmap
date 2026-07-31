import { Transformer } from '../../markmapLib/markmap-lib';
import { INodeData } from '../INode';
import { uuid } from '../NodeId';
import { isMindMapTableDivider } from '../table/NodeTableMarkdown';

const transformer = new Transformer();
const headingPattern = /^\s{0,3}#{1,6}\s+\S/;
const listItemPattern = /^\s*(?:[-+*]|\d+[.)])\s+\S/;
const horizontalRulePattern = /^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/;
const fencePattern = /^\s{0,3}(`{3,}|~{3,})/;
const blockquotePattern = /^\s{0,3}>\s?/;
const blockIdPattern = /\s+\^([a-z0-9-]+)$/i;

interface MarkmapNode {
  t?: string;
  v?: string;
  c?: MarkmapNode[];
  p?: {
    index?: number;
  };
}

interface ProtectedMarkdownBody {
  markdown: string;
  bodies: Map<string, string>;
}

export function parseMarkdownNodeForest(markdown: string): INodeData[] | null {
  const content = trimOuterBlankLines(markdown);
  if (!content) return null;

  const plainTextLines = getPlainTextLines(content);
  if (plainTextLines) {
    return plainTextLines.map((text) => createNodeData(text));
  }

  const protectedMarkdown = protectMarkdownBody(content);
  if (!protectedMarkdown) return null;

  const { root } = transformer.transform(protectedMarkdown.markdown);
  const pendingBodies = new Set(protectedMarkdown.bodies.keys());
  const forest = convertMarkmapNode(
    root as MarkmapNode,
    protectedMarkdown.bodies,
    pendingBodies,
  );
  return forest.length && !pendingBodies.size ? forest : null;
}

function trimOuterBlankLines(markdown: string): string {
  const lines = (markdown || '').split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join('\n');
}

function getPlainTextLines(markdown: string): string[] | null {
  const lines = markdown.split(/\r?\n/);
  const contentLines = lines.filter((line) => line.trim());
  if (
    !contentLines.length ||
    !contentLines.every((line) => (
      line === line.trimStart() &&
      !isStructuredLine(line) &&
      !isMarkdownBodySyntax(line)
    ))
  ) {
    return null;
  }
  return contentLines.map((line) => line.trim());
}

function protectMarkdownBody(markdown: string): ProtectedMarkdownBody | null {
  const lines = markdown.split(/\r?\n/);
  const bodies = new Map<string, string>();
  const outline: string[] = [];
  let ownerIndex: number | null = null;
  let index = skipFrontmatter(lines);
  if (index < 0) return null;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || horizontalRulePattern.test(line)) {
      index++;
      continue;
    }

    if (isStructuredLine(line)) {
      outline.push(normalizeInlineMath(line));
      ownerIndex = outline.length - 1;
      index++;
      continue;
    }

    const bodyBlock = readBodyBlock(lines, index);
    if (!bodyBlock) return null;

    const marker = createBodyMarker(bodies);
    bodies.set(marker, bodyBlock.text);
    if (ownerIndex === null) {
      outline.push(`- ${marker}`);
      ownerIndex = outline.length - 1;
    } else {
      outline[ownerIndex] = appendMarker(outline[ownerIndex], marker);
    }
    index = bodyBlock.end;
  }

  return outline.length
    ? {markdown: outline.join('\n'), bodies}
    : null;
}

function isStructuredLine(line: string): boolean {
  return headingPattern.test(line) || listItemPattern.test(line);
}

function isMarkdownBodySyntax(line: string): boolean {
  const value = line.trim();
  return Boolean(
    horizontalRulePattern.test(line) ||
    fencePattern.test(line) ||
    blockquotePattern.test(line) ||
    isMindMapTableDivider(line) ||
    value === '\\[' ||
    value === '\\]' ||
    value === '$$' ||
    hasConvertibleInlineMath(line)
  );
}

function skipFrontmatter(lines: string[]): number {
  if (lines[0]?.trim() !== '---') return 0;
  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trim() === '---') {
      return lines
        .slice(1, index)
        .some((line) => /^\s*[\w-]+\s*:/.test(line))
        ? index + 1
        : 0;
    }
  }
  return lines
    .slice(1)
    .some((line) => /^\s*[\w-]+\s*:/.test(line))
    ? -1
    : 0;
}

function readBodyBlock(
  lines: string[],
  start: number,
): {text: string; end: number} | null {
  const fence = lines[start].match(fencePattern)?.[1];
  if (fence) {
    const end = findClosingFence(lines, start + 1, fence);
    return end < 0
      ? null
      : {text: lines.slice(start, end + 1).join('\n'), end: end + 1};
  }

  if (lines[start].trim() === '\\[') {
    const end = findExactLine(lines, start + 1, '\\]');
    return end < 0
      ? null
      : {
        text: `$$\n${lines.slice(start + 1, end).join('\n')}\n$$`,
        end: end + 1,
      };
  }

  if (lines[start].trim() === '$$') {
    const end = findExactLine(lines, start + 1, '$$');
    return end < 0
      ? null
      : {text: lines.slice(start, end + 1).join('\n'), end: end + 1};
  }

  let end = start + 1;
  while (
    end < lines.length &&
    lines[end].trim() &&
    !horizontalRulePattern.test(lines[end]) &&
    !isStructuredLine(lines[end]) &&
    !fencePattern.test(lines[end]) &&
    lines[end].trim() !== '\\[' &&
    lines[end].trim() !== '$$'
  ) {
    end++;
  }
  return {
    text: normalizeInlineMath(lines.slice(start, end).join('\n').trim()),
    end,
  };
}

function normalizeInlineMath(text: string): string {
  let result = '';
  let index = 0;
  let codeDelimiterLength = 0;

  while (index < text.length) {
    if (text[index] === '`' && !isEscaped(text, index)) {
      let end = index + 1;
      while (text[end] === '`') end++;
      const delimiterLength = end - index;
      if (!codeDelimiterLength) {
        codeDelimiterLength = delimiterLength;
      } else if (delimiterLength === codeDelimiterLength) {
        codeDelimiterLength = 0;
      }
      result += text.slice(index, end);
      index = end;
      continue;
    }

    if (
      !codeDelimiterLength &&
      !isEscaped(text, index) &&
      text.startsWith('\\(', index)
    ) {
      const end = findUnescapedSequence(text, '\\)', index + 2);
      const lineEnd = text.indexOf('\n', index + 2);
      if (end >= 0 && (lineEnd < 0 || end < lineEnd)) {
        const formula = text.slice(index + 2, end).trim();
        result += formula ? `$${formula}$` : text.slice(index, end + 2);
        index = end + 2;
        continue;
      }
    }

    result += text[index];
    index++;
  }
  return result;
}

function hasConvertibleInlineMath(text: string): boolean {
  return normalizeInlineMath(text) !== text;
}

function findUnescapedSequence(text: string, value: string, start: number): number {
  let index = text.indexOf(value, start);
  while (index >= 0 && isEscaped(text, index)) {
    index = text.indexOf(value, index + value.length);
  }
  return index;
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
}

function findClosingFence(lines: string[], start: number, opening: string): number {
  const character = opening[0];
  const minimumLength = opening.length;
  const closingPattern = new RegExp(`^\\s{0,3}${character}{${minimumLength},}\\s*$`);
  for (let index = start; index < lines.length; index++) {
    if (closingPattern.test(lines[index])) return index;
  }
  return -1;
}

function findExactLine(lines: string[], start: number, value: string): number {
  for (let index = start; index < lines.length; index++) {
    if (lines[index].trim() === value) return index;
  }
  return -1;
}

function createBodyMarker(bodies: Map<string, string>): string {
  let marker = '';
  do {
    marker = `MMNODEBODY${uuid().replace(/-/g, '')}`;
  } while (bodies.has(marker));
  return marker;
}

function appendMarker(line: string, marker: string): string {
  const blockId = line.match(blockIdPattern)?.[0] || '';
  const content = blockId ? line.slice(0, -blockId.length) : line;
  return `${content} ${marker}${blockId}`;
}

function restoreMarkdownBody(
  text: string,
  bodies: Map<string, string>,
  pendingBodies: Set<string>,
): string {
  let restored = text;
  bodies.forEach((body, marker) => {
    restored = restored.replace(
      new RegExp(`[ \\t]*${marker}[ \\t]*`),
      () => {
        pendingBodies.delete(marker);
        return `\n\n${body}`;
      },
    );
  });
  return restored.trim();
}

function convertMarkmapNode(
  node: MarkmapNode,
  bodies: Map<string, string>,
  pendingBodies: Set<string>,
): INodeData[] {
  const children = (node.c || []).reduce<INodeData[]>((result, child) => {
    result.push(...convertMarkmapNode(child, bodies, pendingBodies));
    return result;
  }, []);
  let text = (node.v || '').trim().replace(blockIdPattern, '');
  if (node.t === 'list_item' && node.p?.index != null) {
    text = text.replace(/^\d+[.)]\s+/, '');
  }
  text = restoreMarkdownBody(text, bodies, pendingBodies);

  if (!text) return children;
  return [createNodeData(text, children)];
}

function createNodeData(text: string, children: INodeData[] = []): INodeData {
  return {
    id: uuid(),
    text,
    children,
    expanded: true,
  };
}
