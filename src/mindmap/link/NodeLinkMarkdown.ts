export type NodeLinkKind = 'external' | 'vault';

export interface NodeLinkData {
  markdown: string;
  href: string;
  label: string;
  kind: NodeLinkKind;
  start: number;
  end: number;
}

export interface NodeMarkdownData {
  text: string;
  links: NodeLinkData[];
}

export function parseNodeMarkdown(markdown: string): NodeMarkdownData {
  const links: NodeLinkData[] = [];
  let index = 0;

  while (index < markdown.length) {
    const link = readLink(markdown, index);
    if (link) {
      links.push(link);
      index = link.end;
    } else {
      index++;
    }
  }

  let text = '';
  let textStart = 0;
  links.forEach((link) => {
    text += markdown.slice(textStart, link.start);
    textStart = link.end;
  });
  text += markdown.slice(textStart);

  return {
    text: text.trim(),
    links,
  };
}

export function composeNodeMarkdown(text: string, links: NodeLinkData[]): string {
  return `${text}${links.map((link) => link.markdown).join('')}`;
}

export function replaceNodeLink(markdown: string, index: number, replacement: string): string {
  const link = parseNodeMarkdown(markdown).links[index];
  if (!link) return markdown;
  return `${markdown.slice(0, link.start)}${replacement}${markdown.slice(link.end)}`;
}

export function removeNodeLink(markdown: string, index: number): string {
  return replaceNodeLink(markdown, index, '');
}

export function createExternalMarkdownLink(title: string, url: string): string {
  const safeTitle = escapeMarkdownLabel(title);
  const safeUrl = url
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
  return `[${safeTitle}](<${safeUrl}>)`;
}

export function createVaultMarkdownLink(
  title: string,
  target: string,
  wikiLink: boolean,
): string {
  if (wikiLink) {
    const safeTarget = target.replace(/\|/g, '\\|');
    const safeTitle = title.replace(/\|/g, '\\|');
    return `[[${safeTarget}${safeTitle ? `|${safeTitle}` : ''}]]`;
  }

  return `[${escapeMarkdownLabel(title || target)}](${target})`;
}

export function normalizeExternalLinkTarget(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function readLink(markdown: string, start: number): NodeLinkData | null {
  if (markdown[start] !== '[' || markdown[start - 1] === '!') return null;
  if (markdown[start + 1] === '[') return readWikiLink(markdown, start);
  return readMarkdownLink(markdown, start);
}

function readWikiLink(markdown: string, start: number): NodeLinkData | null {
  const close = markdown.indexOf(']]', start + 2);
  if (close < 0) return null;

  const value = markdown.slice(start + 2, close);
  const separator = findUnescaped(value, '|');
  const href = unescapeValue(separator < 0 ? value : value.slice(0, separator)).trim();
  if (!href) return null;

  const alias = separator < 0 ? '' : unescapeValue(value.slice(separator + 1)).trim();
  return {
    markdown: markdown.slice(start, close + 2),
    href,
    label: alias || getVaultFallbackLabel(href),
    kind: 'vault',
    start,
    end: close + 2,
  };
}

function readMarkdownLink(markdown: string, start: number): NodeLinkData | null {
  const labelEnd = findUnescaped(markdown, ']', start + 1);
  if (labelEnd < 0 || markdown[labelEnd + 1] !== '(') return null;

  const targetStart = labelEnd + 2;
  const targetEnd = findMarkdownTargetEnd(markdown, targetStart);
  if (targetEnd < 0) return null;

  const rawTarget = markdown.slice(targetStart, targetEnd).trim();
  const href = stripAngleBrackets(rawTarget);
  if (!href) return null;

  const label = unescapeValue(markdown.slice(start + 1, labelEnd)).trim();
  return {
    markdown: markdown.slice(start, targetEnd + 1),
    href,
    label: label || (isExternalTarget(href) ? href : getVaultFallbackLabel(href)),
    kind: isExternalTarget(href) ? 'external' : 'vault',
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

function stripAngleBrackets(value: string): string {
  if (value.startsWith('<') && value.endsWith('>')) {
    return value.slice(1, -1);
  }
  return value;
}

function isExternalTarget(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function getVaultFallbackLabel(target: string): string {
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
