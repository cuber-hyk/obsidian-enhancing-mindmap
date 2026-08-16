import type MindMap from '../mindmap';
import {
  MINDMAP_SHORTCUT_DEFINITIONS,
  matchesMindMapShortcut,
  normalizeMindMapShortcuts,
} from './MindMapShortcutCatalog';

const CONTROLLER_SHORTCUTS = new Set([
  'addSiblingAfter', 'addSiblingBefore', 'addChild', 'editNode', 'deleteNode',
  'finishEdit', 'insertLineBreak', 'copyNode', 'cutNode', 'pasteNode',
  'navigateUp', 'navigateDown', 'navigateLeft', 'navigateRight', 'navigateRoot',
]);

export default class MindMapShortcutRouter {
  constructor(private mindmap: MindMap) {}

  handleKeydown(event: KeyboardEvent): boolean {
    if (!this.isLocalEvent(event)) return false;
    if (this.mindmap.nodeSelectionController.handleKeydown(event)) return true;
    if (this.mindmap.nodeClipboardController.handleKeydown(event)) return true;
    if (this.mindmap.nodeKeyboardController.handleKeydown(event)) return true;

    const shortcuts = normalizeMindMapShortcuts(this.mindmap.setting.mindMapShortcuts);
    const context = this.getContext();
    const definition = MINDMAP_SHORTCUT_DEFINITIONS.find((candidate) =>
      !CONTROLLER_SHORTCUTS.has(candidate.id)
      && candidate.contexts.includes(context)
      && matchesMindMapShortcut(shortcuts[candidate.id], event));
    if (!definition) return false;

    if (definition.id === 'strikeText') {
      const node = this.mindmap.editNode;
      if (!node?.data.isEdit || !node.toggleMarkdownFormatting('~~')) return false;
      return this.consume(event);
    }

    if (!definition.commandId) return false;
    const commandId = `${this.mindmap.view.plugin.manifest.id}:${definition.commandId}`;
    const executed = Boolean((this.mindmap.view.app as any).commands?.executeCommandById?.(commandId));
    return executed ? this.consume(event) : false;
  }

  private getContext(): 'canvas' | 'selected' | 'editing' | 'image' | 'multiple' {
    if (this.mindmap.nodeSelectionController.hasMultipleSelection()) return 'multiple';
    if (this.mindmap.editNode?.data.isEdit) {
      const activeEl = this.mindmap.editNode.contentEl.ownerDocument.activeElement;
      if (activeEl instanceof Element && activeEl.closest('.mm-node-image-attachment')) return 'image';
      return 'editing';
    }
    return this.mindmap.selectNode ? 'selected' : 'canvas';
  }

  private isLocalEvent(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing || this.mindmap.isComposing) return false;
    const view = this.mindmap.view;
    if (!view || view.mindmap !== this.mindmap || view.app.workspace.activeLeaf !== view.leaf) return false;
    const target = event.target;
    if (!(target instanceof Element) || !this.mindmap.appEl.contains(target)) return false;
    if (this.mindmap.editNode?.data.isEdit) {
      return target === this.mindmap.editNode.contentEl
        || this.mindmap.editNode.contentEl.contains(target);
    }
    return !target.closest('input, textarea, select, button, a, [contenteditable="true"]');
  }

  private consume(event: KeyboardEvent): true {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
}
