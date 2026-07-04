export const DEFAULT_NODE_IMAGE_WIDTH = 320;
export const MIN_NODE_IMAGE_WIDTH = 80;
export const MAX_NODE_IMAGE_WIDTH = 960;

export type NodeImageKind = 'vault' | 'markdown';

export interface NodeImageData {
  markdown: string;
  target: string;
  alt: string;
  width: number;
  kind: NodeImageKind;
  start: number;
  end: number;
}

export function parseNodeImages(markdown: string): NodeImageData[] {
  const images: NodeImageData[] = [];
  let index = 0;

  while (index < markdown.length) {
    const image = readImage(markdown, index);
    if (image) {
      images.push(image);
      index = image.end;
    } else {
      index++;
    }
  }

  return images;
}

export function removeNodeImages(markdown: string): string {
  const images = parseNodeImages(markdown);
  let text = '';
  let textStart = 0;

  images.forEach((image) => {
    text += markdown.slice(textStart, image.start);
    textStart = image.end;
  });
  text += markdown.slice(textStart);

  return text;
}

export function createVaultImageMarkdown(target: string, width = DEFAULT_NODE_IMAGE_WIDTH): string {
  const safeTarget = target.replace(/\|/g, '\\|');
  return `![[${safeTarget}|${clampNodeImageWidth(width)}]]`;
}

export function createNodeImageMarkdown(image: NodeImageData): string {
  const width = clampNodeImageWidth(image.width || DEFAULT_NODE_IMAGE_WIDTH);
  if (image.kind === 'vault') {
    const safeTarget = image.target.replace(/\|/g, '\\|');
    return `![[${safeTarget}|${width}]]`;
  }

  return `![${escapeMarkdownLabel(image.alt)}|${width}](${image.target})`;
}

export function clampNodeImageWidth(width: number): number {
  const value = Number.isFinite(width) ? Math.round(width) : DEFAULT_NODE_IMAGE_WIDTH;
  return Math.max(MIN_NODE_IMAGE_WIDTH, Math.min(MAX_NODE_IMAGE_WIDTH, value));
}

function readImage(markdown: string, start: number): NodeImageData | null {
  if (markdown[start] !== '!') return null;
  if (markdown[start + 1] !== '[') return null;
  if (markdown[start + 2] === '[') return readVaultImage(markdown, start);
  return readMarkdownImage(markdown, start);
}

function readVaultImage(markdown: string, start: number): NodeImageData | null {
  const close = markdown.indexOf(']]', start + 3);
  if (close < 0) return null;

  const value = markdown.slice(start + 3, close);
  const parts = splitUnescaped(value, '|');
  const target = unescapeValue(parts[0] || '').trim();
  if (!target) return null;

  const width = readWidth(parts[parts.length - 1]);
  return {
    markdown: markdown.slice(start, close + 2),
    target,
    alt: getFileName(target),
    width: width || DEFAULT_NODE_IMAGE_WIDTH,
    kind: 'vault',
    start,
    end: close + 2,
  };
}

function readMarkdownImage(markdown: string, start: number): NodeImageData | null {
  const labelEnd = findUnescaped(markdown, ']', start + 2);
  if (labelEnd < 0 || markdown[labelEnd + 1] !== '(') return null;

  const targetStart = labelEnd + 2;
  const targetEnd = findMarkdownTargetEnd(markdown, targetStart);
  if (targetEnd < 0) return null;

  const label = unescapeValue(markdown.slice(start + 2, labelEnd)).trim();
  const labelParts = splitUnescaped(label, '|');
  const width = readWidth(labelParts[labelParts.length - 1]);
  const alt = width && labelParts.length > 1
    ? labelParts.slice(0, -1).join('|').trim()
    : label;
  const target = stripAngleBrackets(markdown.slice(targetStart, targetEnd).trim());
  if (!target) return null;

  return {
    markdown: markdown.slice(start, targetEnd + 1),
    target,
    alt,
    width: width || DEFAULT_NODE_IMAGE_WIDTH,
    kind: 'markdown',
    start,
    end: targetEnd + 1,
  };
}

function findMarkdownTargetEnd(markdown: string, start: number): number {
  if (markdown[start] === '<') {
    const angleEnd = findUnescaped(markdown, '>', start + 1);
    return angleEnd >= 0 && markdown[angleEnd + 1] === ')' ? angleEnd + 1 : -1;
  }

  let depth = 0;
  for (let index = start; index < markdown.length; index++) {
    if (markdown[index] === '\\') {
      index++;
      continue;
    }
    if (markdown[index] === '(') {
      depth++;
    } else if (markdown[index] === ')') {
      if (depth === 0) return index;
      depth--;
    }
  }
  return -1;
}

function findUnescaped(value: string, character: string, start = 0): number {
  for (let index = start; index < value.length; index++) {
    if (value[index] === '\\') {
      index++;
      continue;
    }
    if (value[index] === character) return index;
  }
  return -1;
}

function splitUnescaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = '';
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '\\' && index + 1 < value.length) {
      current += value[index + 1];
      index++;
      continue;
    }
    if (value[index] === separator) {
      parts.push(current);
      current = '';
      continue;
    }
    current += value[index];
  }
  parts.push(current);
  return parts;
}

function readWidth(value?: string): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2,4})(?:px)?$/i);
  return match ? clampNodeImageWidth(Number(match[1])) : null;
}

function stripAngleBrackets(value: string): string {
  if (value.startsWith('<') && value.endsWith('>')) {
    return value.slice(1, -1);
  }
  return value;
}

function getFileName(target: string): string {
  const path = target.split('#')[0];
  return path.split('/').pop() || target;
}

function escapeMarkdownLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function unescapeValue(value: string): string {
  return value.replace(/\\([\\[\]|])/g, '$1');
}
