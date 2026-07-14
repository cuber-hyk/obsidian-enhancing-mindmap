import type Node from '../INode';
import type MindMap from '../mindmap';

export default class NodeKeyboardController {
  private mindmap: MindMap;

  constructor(mindmap: MindMap) {
    this.mindmap = mindmap;
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (this.handleUndoShortcut(event)) return true;

    if (
      event.defaultPrevented ||
      event.isComposing ||
      this.mindmap.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return false;
    }

    const node = this.mindmap.selectNode;
    if (!node || !this.isNodeKeyboardTarget(event, node)) return false;

    if (
      node.data.isEdit &&
      (event.key === 'Backspace' || event.key === 'Delete') &&
      node.deleteEditImageByKeyboard(event.key)
    ) {
      this.consume(event);
      return true;
    }

    if (event.key === 'Backspace' && !node.data.isEdit && !node.data.isRoot) {
      this.consume(event);
      node.mindmap.execute('deleteNodeAndChild', { node });
      return true;
    }

    if (event.key === ' ' && !node.data.isEdit) {
      this.consume(event);
      node.edit();
      return true;
    }

    if (event.key === 'Tab' && !event.shiftKey) {
      this.consume(event);
      if (node.data.isEdit) this.finishEdit(node);
      this.addChild(node);
      return true;
    }

    if (event.key !== 'Enter') return false;
    if (event.shiftKey) {
      if (!node.data.isEdit) return false;
      this.consume(event);
      node.setSelectedText('<br>', '<br>', false, false, false);
      return true;
    }

    this.consume(event);
    if (node.data.isEdit) {
      this.finishEdit(node);
      return true;
    }

    if (node.data.isRoot || !node.parent) {
      this.addChild(node);
    } else {
      this.addSiblingAfter(node);
    }
    return true;
  }

  private handleUndoShortcut(event: KeyboardEvent): boolean {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      this.mindmap.isComposing ||
      (!event.ctrlKey && !event.metaKey) ||
      event.shiftKey ||
      event.altKey ||
      event.key.toLowerCase() !== 'z'
    ) {
      return false;
    }

    const node = this.mindmap.selectNode;
    if (!node || node.data.isEdit || !this.isNodeKeyboardTarget(event, node)) return false;

    this.consume(event);
    this.mindmap.undo();
    return true;
  }

  private isNodeKeyboardTarget(event: KeyboardEvent, node: Node): boolean {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;

    if (node.data.isEdit) {
      return target === node.contentEl || node.contentEl.contains(target);
    }

    if (target.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
      return false;
    }

    return target === node.containEl || node.containEl.contains(target);
  }

  private finishEdit(node: Node): void {
    node.cancelEdit();
    this.mindmap.editNode = null;
    requestAnimationFrame(() => {
      node.select();
    });
  }

  private addChild(node: Node): void {
    if (!node.isExpand) node.expand();
    node.mindmap.execute('addChildNode', { parent: node });
  }

  private addSiblingAfter(node: Node): void {
    const newNode = node.mindmap.execute('addSiblingNode', {
      parent: node.parent,
    }) as Node;
    if (newNode) node.mindmap.moveNode(newNode, node, 'down', false);
  }

  private consume(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
