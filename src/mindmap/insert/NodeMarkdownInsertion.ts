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

  insert(markdown: string): void {
    const range = this.getUsableRange();
    range.deleteContents();

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
