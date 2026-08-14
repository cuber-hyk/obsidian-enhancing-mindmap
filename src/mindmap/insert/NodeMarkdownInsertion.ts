export default class NodeMarkdownInsertion {
  private editorEl: HTMLElement;
  private range: Range | null = null;

  constructor(editorEl: HTMLElement) {
    this.editorEl = editorEl;
  }

  capture(): void {
    const selection = this.editorEl.ownerDocument.defaultView?.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.editorEl.contains(range.commonAncestorContainer)) {
        this.range = range.cloneRange();
        return;
      }
    }

    this.range = this.createRangeAtEnd();
  }

  getSelectedText(): string {
    return this.range?.toString() || '';
  }

  restore(): void {
    const range = this.getUsableRange();
    const selection = this.editorEl.ownerDocument.defaultView?.getSelection();
    this.editorEl.focus();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(range);
  }

  hasUsableRange(): boolean {
    return Boolean(this.range && this.editorEl.contains(this.range.commonAncestorContainer));
  }

  insert(markdown: string): Text {
    const range = this.getUsableRange();
    range.deleteContents();

    const textNode = this.editorEl.ownerDocument.createTextNode(markdown);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    this.range = range.cloneRange();
    this.restore();
    return textNode;
  }

  insertNode(node: globalThis.Node): void {
    const range = this.getUsableRange();
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    this.range = range.cloneRange();
    this.restore();
  }

  insertBlockNode(node: globalThis.Node): void {
    const range = this.getUsableRange();
    range.deleteContents();
    const hasContentBefore = this.hasMeaningfulContentBefore(range);
    const fragment = this.editorEl.ownerDocument.createDocumentFragment();
    if (hasContentBefore) {
      fragment.appendChild(this.editorEl.ownerDocument.createTextNode('\n\n'));
    }
    fragment.appendChild(node);
    const trailing = this.editorEl.ownerDocument.createTextNode('\n\n');
    fragment.appendChild(trailing);
    range.insertNode(fragment);
    range.setStartAfter(trailing);
    range.collapse(true);
    this.range = range.cloneRange();
    this.restore();
  }

  private hasMeaningfulContentBefore(range: Range): boolean {
    const before = this.editorEl.ownerDocument.createRange();
    before.selectNodeContents(this.editorEl);
    before.setEnd(range.startContainer, range.startOffset);
    if (before.toString().trim()) return true;

    const fragment = before.cloneContents();
    return Boolean(fragment.querySelector(
      'br, .mm-node-image-attachment, .mm-node-code-attachment',
    ));
  }

  append(markdown: string): void {
    const range = this.createRangeAtEnd();
    const textNode = this.editorEl.ownerDocument.createTextNode(markdown);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    this.range = range.cloneRange();
    this.restore();
  }

  private getUsableRange(): Range {
    if (this.range && this.editorEl.contains(this.range.commonAncestorContainer)) {
      return this.range;
    }

    this.range = this.createRangeAtEnd();
    return this.range;
  }

  private createRangeAtEnd(): Range {
    const range = this.editorEl.ownerDocument.createRange();
    range.selectNodeContents(this.editorEl);
    range.collapse(false);
    return range;
  }
}
