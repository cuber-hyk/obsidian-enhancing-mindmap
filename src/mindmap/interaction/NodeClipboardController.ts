import {Notice, type WorkspaceLeaf} from 'obsidian';
import type Node from '../INode';
import type MindMap from '../mindmap';
import {parseMarkdownNodeForest} from '../clipboard/NodeMarkdownPaste';
import {t} from '../../lang/helpers';

type ClipboardAction = 'copy' | 'cut' | 'paste';

interface ClipboardOperationContext {
  node: Node;
  leaf: WorkspaceLeaf;
}

export default class NodeClipboardController {
  private mindmap: MindMap;

  constructor(mindmap: MindMap) {
    this.mindmap = mindmap;
  }

  handleKeydown(event: KeyboardEvent): boolean {
    const action = this.getShortcutAction(event);
    if (!action || !this.isMindMapTarget(event)) return false;

    if (this.mindmap.nodeSelectionController.hasMultipleSelection()) {
      this.consume(event);
      new Notice(t('Clipboard actions require a single selected node'));
      return true;
    }

    if (!this.getOperableNode()) return false;

    this.consume(event);
    if (action === 'copy') void this.copySelectedNode();
    if (action === 'cut') void this.cutSelectedNode();
    if (action === 'paste') void this.pasteToSelectedNode();
    return true;
  }

  async copySelectedNode():Promise<boolean> {
    const context = this.getOperationContext();
    if (!context) return false;

    const text = this.mindmap.copyNode(context.node);
    if (!text) {
      new Notice(t('Failed to copy node'));
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy mindmap node', error);
      if (this.isOperationContextCurrent(context)) {
        new Notice(t('Failed to copy node'));
      }
      return false;
    }
  }

  async cutSelectedNode():Promise<boolean> {
    const context = this.getOperationContext();
    if (!context) return false;

    const text = this.mindmap.copyNode(context.node);
    if (!text) {
      new Notice(t('Failed to cut node'));
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to cut mindmap node', error);
      if (this.isOperationContextCurrent(context)) {
        new Notice(t('Failed to cut node'));
      }
      return false;
    }

    if (!context.node.data.isRoot && this.isOperationContextCurrent(context)) {
      context.node.mindmap.execute('deleteNodeAndChild', {node: context.node});
    }
    return true;
  }

  async pasteToSelectedNode():Promise<boolean> {
    const context = this.getOperationContext();
    if (!context) return false;

    try {
      const text = await navigator.clipboard.readText();
      if (!this.isOperationContextCurrent(context)) return false;
      if (this.mindmap.pasteNode(text)) return true;

      const forest = parseMarkdownNodeForest(text);
      if (!forest?.length) {
        new Notice(t('Unsupported node clipboard content'));
        return false;
      }
      this.mindmap.execute('pasteNodeForest', {
        node: context.node,
        data: forest,
      });
      return true;
    } catch (error) {
      console.error('Failed to paste mindmap node', error);
      if (this.isOperationContextCurrent(context)) {
        new Notice(t('Failed to paste node'));
      }
      return false;
    }
  }

  canOperateSelectedNode():boolean {
    return Boolean(this.getOperationContext());
  }

  private getOperableNode():Node | null {
    const node = this.mindmap.selectNode;
    if (
      !node ||
      node.data.isEdit ||
      this.mindmap.editNode?.data.isEdit ||
      this.mindmap.nodeSelectionController.hasMultipleSelection()
    ) {
      return null;
    }
    return node;
  }

  private getOperationContext():ClipboardOperationContext | null {
    const node = this.getOperableNode();
    const view = this.mindmap.view;
    if (
      !node ||
      !view ||
      view.mindmap !== this.mindmap ||
      view.app.workspace.activeLeaf !== view.leaf
    ) {
      return null;
    }
    return {node, leaf: view.leaf};
  }

  private isOperationContextCurrent(context:ClipboardOperationContext):boolean {
    const view = this.mindmap.view;
    return Boolean(
      view &&
      view.mindmap === this.mindmap &&
      view.leaf === context.leaf &&
      view.app.workspace.activeLeaf === context.leaf &&
      this.getOperableNode() === context.node
    );
  }

  private getShortcutAction(event: KeyboardEvent):ClipboardAction | null {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      this.mindmap.isComposing ||
      (!event.ctrlKey && !event.metaKey) ||
      event.altKey ||
      event.shiftKey
    ) {
      return null;
    }

    const key = event.key.toLowerCase();
    if (key === 'c') return 'copy';
    if (key === 'x') return 'cut';
    if (key === 'v') return 'paste';
    return null;
  }

  private isMindMapTarget(event: KeyboardEvent):boolean {
    const target = event.target;
    if (!(target instanceof Element) || !this.mindmap.appEl.contains(target)) return false;
    return !target.closest('input, textarea, select, button, a, [contenteditable="true"]');
  }

  private consume(event: KeyboardEvent):void {
    event.preventDefault();
    event.stopPropagation();
  }
}
