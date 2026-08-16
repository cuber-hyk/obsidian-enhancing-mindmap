import type Node from '../INode';
import type MindMap from '../mindmap';
import {
  matchesMindMapShortcut,
  normalizeMindMapShortcuts,
} from './MindMapShortcutCatalog';

export default class NodeKeyboardController {
  private mindmap: MindMap;

  constructor(mindmap: MindMap) {
    this.mindmap = mindmap;
  }

  handleKeydown(event: KeyboardEvent): boolean {
    const node = this.mindmap.selectNode;
    if (!node || !this.isNodeKeyboardTarget(event, node)) return false;
    if (
      event.defaultPrevented ||
      event.isComposing ||
      this.mindmap.isComposing
    ) {
      return false;
    }

    const shortcuts = normalizeMindMapShortcuts(this.mindmap.setting.mindMapShortcuts);
    if (!node.data.isEdit && this.handleNavigationShortcut(event, node, shortcuts)) return true;
    if (!node.data.isEdit && this.handleSiblingShortcut(event, node, shortcuts)) return true;

    if (
      node.data.isEdit &&
      (event.key === 'Backspace' || event.key === 'Delete') &&
      node.deleteEditAttachmentByKeyboard(event.key)
    ) {
      this.consume(event);
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.deleteNode, event) && !node.data.isEdit && !node.data.isRoot) {
      this.consume(event);
      node.mindmap.execute('deleteNodeAndChild', { node });
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.editNode, event) && !node.data.isEdit) {
      this.consume(event);
      node.edit();
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.addChild, event)) {
      this.consume(event);
      if (node.data.isEdit) this.finishEdit(node);
      this.addChild(node);
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.insertLineBreak, event)) {
      if (!node.data.isEdit) return false;
      this.consume(event);
      node.insertLineBreak();
      return true;
    }
    if (matchesMindMapShortcut(shortcuts.finishEdit, event) && node.data.isEdit) {
      this.consume(event);
      this.finishEdit(node);
      return true;
    }
    return false;
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

  private handleNavigationShortcut(event: KeyboardEvent, node: Node, shortcuts: ReturnType<typeof normalizeMindMapShortcuts>): boolean {
    if (matchesMindMapShortcut(shortcuts.navigateRoot, event)) {
      this.consume(event);
      this.mindmap.clearSelectNode();
      this.mindmap.root.select();
      this.mindmap.center();
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.navigateUp, event) || matchesMindMapShortcut(shortcuts.navigateDown, event)) {
      this.consume(event);
      this.selectVerticalNode(node, matchesMindMapShortcut(shortcuts.navigateUp, event) ? 'up' : 'down');
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.navigateLeft, event) || matchesMindMapShortcut(shortcuts.navigateRight, event)) {
      this.consume(event);
      this.selectHorizontalNode(node, matchesMindMapShortcut(shortcuts.navigateLeft, event) ? 'left' : 'right');
      return true;
    }

    return false;
  }

  private selectVerticalNode(node: Node, direct: 'up' | 'down'): void {
    let candidate: Node | undefined = node;
    while (
      candidate &&
      this.mindmap.selectNode === node &&
      candidate !== this.mindmap.root
    ) {
      this.mindmap._selectNode(candidate, direct);
      candidate = candidate.parent;
    }
  }

  private selectHorizontalNode(node: Node, direct: 'left' | 'right'): void {
    const rootX = this.mindmap.root.getPosition().x;
    const nodeX = node.getPosition().x;
    const movesToParent = direct === 'right' ? rootX > nodeX : rootX < nodeX;

    if (movesToParent && node.parent) {
      this.mindmap.clearSelectNode();
      node.parent.select();
      return;
    }

    if (!node.isExpand && node.children.length > 0) {
      node.mindmap.execute('expandNode', { node });
    }
    this.mindmap._selectNode(node, direct);
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
    node.mindmap.execute('addSiblingNode', {
      node,
      direct: 'down',
    });
  }

  private addSiblingBefore(node: Node): void {
    node.mindmap.execute('addSiblingNode', {
      node,
      direct: 'top',
    });
  }

  private handleSiblingShortcut(event: KeyboardEvent, node: Node, shortcuts: ReturnType<typeof normalizeMindMapShortcuts>): boolean {
    if (matchesMindMapShortcut(shortcuts.addSiblingAfter, event)) {
      this.consume(event);
      if (node.data.isRoot || !node.parent) {
        this.addChild(node);
      } else {
        this.addSiblingAfter(node);
      }
      return true;
    }

    if (matchesMindMapShortcut(shortcuts.addSiblingBefore, event)) {
      this.consume(event);
      if (!node.data.isRoot && node.parent) this.addSiblingBefore(node);
      return true;
    }

    return false;
  }

  private consume(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
