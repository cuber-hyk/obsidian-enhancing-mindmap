import { Transformer } from '../../markmapLib/markmap-lib';
import { INodeData } from '../INode';
import { uuid } from '../NodeId';

const transformer = new Transformer();
const headingPattern = /^\s{0,3}#{1,6}\s+\S/;
const listItemPattern = /^\s*(?:[-+*]|\d+[.)])\s+\S/;
const blockIdPattern = /\s+\^([a-z0-9-]+)$/i;

interface MarkmapNode {
  t?: string;
  v?: string;
  c?: MarkmapNode[];
  p?: {
    index?: number;
  };
}

export function parseMarkdownNodeForest(markdown: string): INodeData[] | null {
  const content = trimOuterBlankLines(markdown);
  if (!content) return null;

  const plainTextLines = getPlainTextLines(content);
  if (plainTextLines) {
    return plainTextLines.map((text) => createNodeData(text));
  }
  if (!isSupportedStructuredMarkdown(content)) return null;

  const { root } = transformer.transform(content);
  const forest = convertMarkmapNode(root as MarkmapNode);
  return forest.length ? forest : null;
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
      !isStructuredLine(line)
    ))
  ) {
    return null;
  }
  return contentLines.map((line) => line.trim());
}

function isSupportedStructuredMarkdown(markdown: string): boolean {
  const lines = markdown.split(/\r?\n/);
  return lines
    .filter((line) => line.trim())
    .every((line) => isStructuredLine(line));
}

function isStructuredLine(line: string): boolean {
  return headingPattern.test(line) || listItemPattern.test(line);
}

function convertMarkmapNode(node: MarkmapNode): INodeData[] {
  const children = (node.c || []).reduce<INodeData[]>((result, child) => {
    result.push(...convertMarkmapNode(child));
    return result;
  }, []);
  let text = (node.v || '').trim().replace(blockIdPattern, '');
  if (node.t === 'list_item' && node.p?.index != null) {
    text = text.replace(/^\d+[.)]\s+/, '');
  }

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
