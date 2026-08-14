import { Component, MarkdownRenderer } from 'obsidian';
import { createNodeCodeMarkdown } from './NodeCodeMarkdown';

export async function createHighlightedCodePre(
  ownerDocument: Document,
  language: string,
  code: string,
  sourcePath: string,
  component: Component,
): Promise<HTMLElement> {
  const staged = ownerDocument.createElement('div');
  await MarkdownRenderer.renderMarkdown(
    createNodeCodeMarkdown(language, code),
    staged,
    sourcePath,
    component,
  );
  const pre = staged.querySelector('pre');
  if (!(pre instanceof HTMLElement)) {
    throw new Error('Obsidian did not render the node code block');
  }
  pre.querySelectorAll('.copy-code-button').forEach((button) => button.remove());
  return pre;
}
