import { parseNodeImages } from '../image/NodeImageMarkdown';
import { parseNodeMarkdown } from '../link/NodeLinkMarkdown';
import { getNodeTableDocument } from '../table/NodeTableMarkdown';

const WIDTH_COMMENTS_AT_END = /(?:[ \t]*<!--\s*enhancing-mindmap:width=(\d+)\s*-->)+[ \t]*$/i;

export function canAutoWrapNodeMarkdown(markdown: string): boolean {
  const content = getNodeAutoWrapContent(markdown);
  if (!content.trim()) return false;
  if (getNodeTableDocument(content)) return false;
  if (parseNodeImages(content).length > 0) return false;
  if (parseNodeMarkdown(content).links.length > 0) return false;
  if (/`/.test(content)) return false;
  if (/\r?\n/.test(content)) return false;
  return true;
}

export function getNodeAutoWrapWidth(markdown: string): number | undefined {
  const match = markdown.match(WIDTH_COMMENTS_AT_END);
  if (!match) return undefined;

  const width = Number(match[1]);
  return Number.isSafeInteger(width) && width > 0 ? width : undefined;
}

export function getNodeAutoWrapContent(markdown: string): string {
  const match = markdown.match(WIDTH_COMMENTS_AT_END);
  if (!match || match.index === undefined) return markdown;
  return markdown.slice(0, match.index);
}

export function setNodeAutoWrapWidth(markdown: string, width: number): string {
  return `${getNodeAutoWrapContent(markdown)}<!-- enhancing-mindmap:width=${Math.round(width)} -->`;
}
