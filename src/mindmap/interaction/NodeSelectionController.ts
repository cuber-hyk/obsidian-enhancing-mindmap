import type Node from '../INode';
import type MindMap from '../mindmap';

const BLOCKED_MULTI_SELECTION_KEYS = new Set([
  'Backspace',
  'Delete',
  ' ',
  'Enter',
  'Tab',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
]);
const BLANK_CLICK_MOVE_THRESHOLD = 4;

export default class NodeSelectionController {
  private mindmap: MindMap;
  private selectedNodes = new Set<Node>();
  private marqueeEl: HTMLElement | null = null;
  private marqueeStart: {x: number; y: number} | null = null;
  private marqueePointer: {x: number; y: number} | null = null;
  private marqueeSelecting = false;
  private groupDragging = false;
  private blankPointerStart: {x: number; y: number} | null = null;
  private blankPointerMoved = false;
  private suppressClickUntil = 0;

  constructor(mindmap: MindMap) {
    this.mindmap = mindmap;
    this.handleDocumentMouseMove = this.handleDocumentMouseMove.bind(this);
    this.handleDocumentMouseUp = this.handleDocumentMouseUp.bind(this);
  }

  destroy(): void {
    this.finishMarquee();
    this.clearSelection();
  }

  hasMultipleSelection(): boolean {
    return this.selectedNodes.size > 1;
  }

  isMarqueeActive(): boolean {
    return this.marqueeSelecting;
  }

  handleMouseDown(event: MouseEvent): boolean {
    const target = event.target;
    this.resetBlankPointerGesture();
    if (
      event.button !== 0 ||
      !(target instanceof Element) ||
      target.closest('.mm-node')
    ) {
      return false;
    }

    if (!event.ctrlKey && !event.metaKey) {
      if (this.selectedNodes.size > 0) {
        this.blankPointerStart = {x: event.clientX, y: event.clientY};
      }
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    this.mindmap.clearSelectNode();
    this.marqueeSelecting = true;
    this.marqueeStart = {x: event.clientX, y: event.clientY};
    this.marqueeEl = this.createMarquee();
    this.updateMarquee(event.clientX, event.clientY);

    const doc = this.mindmap.appEl.ownerDocument;
    doc.addEventListener('mousemove', this.handleDocumentMouseMove);
    doc.addEventListener('mouseup', this.handleDocumentMouseUp);
    return true;
  }

  handleMouseMove(event: MouseEvent): void {
    this.updateBlankPointerGesture(event);
  }

  handleMouseUp(event: MouseEvent): void {
    this.updateBlankPointerGesture(event);
    if (this.blankPointerMoved) this.suppressClick();
    this.resetBlankPointerGesture();
  }

  handleClick(event: MouseEvent): boolean {
    if (Date.now() <= this.suppressClickUntil) {
      this.suppressClickUntil = 0;
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement) || this.isInteractiveTarget(target)) return false;
    if (this.mindmap.editNode?.data.isEdit) return false;

    const nodeEl = target.closest('.mm-node');
    if (!(nodeEl instanceof HTMLElement)) return false;
    const node = this.mindmap.getNodeById(nodeEl.dataset.id || '');
    if (!node) return false;

    if ((event.ctrlKey || event.metaKey) && !node.data.isRoot) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleNode(node);
      return true;
    }

    if (this.hasMultipleSelection() && this.selectedNodes.has(node)) {
      event.preventDefault();
      event.stopPropagation();
      this.replaceSelection([node]);
      return true;
    }

    return false;
  }

  handleKeydown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape' && this.selectedNodes.size > 0) {
      event.preventDefault();
      event.stopPropagation();
      this.mindmap.clearSelectNode();
      return true;
    }

    return this.blockSingleNodeShortcut(event);
  }

  handleKeyup(event: KeyboardEvent): boolean {
    return this.blockSingleNodeShortcut(event);
  }

  handleWheel(event: WheelEvent): boolean {
    if (!this.marqueeSelecting || !this.marqueeStart || !this.marqueePointer) return false;

    event.preventDefault();
    event.stopPropagation();
    const deltaY = this.getWheelDeltaY(event);
    const oldScrollTop = this.mindmap.containerEL.scrollTop;
    this.mindmap.containerEL.scrollTop += deltaY;
    const scrollDelta = this.mindmap.containerEL.scrollTop - oldScrollTop;

    this.marqueeStart.y -= scrollDelta;
    this.updateMarquee(this.marqueePointer.x, this.marqueePointer.y);
    return true;
  }

  handleDragStart(event: MouseEvent, node: Node): boolean {
    if (!this.hasMultipleSelection() || !this.selectedNodes.has(node)) return false;

    this.suppressClick();
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }

    this.groupDragging = true;
    return false;
  }

  handleDrop(event: DragEvent, dropNode: Node, dragType: string): boolean {
    if (!this.groupDragging) return false;

    event.preventDefault();
    event.stopPropagation();
    const nodes = this.getMoveRoots();
    if (
      nodes.length === 0 ||
      event.ctrlKey ||
      event.metaKey ||
      !dragType ||
      this.isInvalidDropTarget(dropNode, nodes)
    ) {
      return true;
    }

    const siblingDrop = ['top', 'left', 'down', 'right'].includes(dragType);
    this.mindmap.execute('moveNodes', {
      type: siblingDrop ? 'siblings' : 'child',
      nodes,
      dropNode,
      direct: dragType,
    });
    return true;
  }

  isInvalidGroupDropTarget(dropNode: Node): boolean {
    return this.groupDragging && this.isInvalidDropTarget(dropNode, this.getMoveRoots());
  }

  finishDrag(): void {
    this.groupDragging = false;
  }

  clearSelection(): void {
    const oldNodes = [...this.selectedNodes];
    this.selectedNodes.clear();
    oldNodes.forEach((node) => this.syncNodeVisual(node));
  }

  private handleDocumentMouseMove(event: MouseEvent): void {
    if (!this.marqueeSelecting) return;
    event.preventDefault();
    this.updateMarquee(event.clientX, event.clientY);
  }

  private handleDocumentMouseUp(event: MouseEvent): void {
    if (!this.marqueeSelecting) return;
    event.preventDefault();
    this.updateMarquee(event.clientX, event.clientY);
    this.selectPrimaryNodeForSelection();
    this.suppressClick();
    this.finishMarquee();
  }

  private finishMarquee(): void {
    const doc = this.mindmap.appEl.ownerDocument;
    doc.removeEventListener('mousemove', this.handleDocumentMouseMove);
    doc.removeEventListener('mouseup', this.handleDocumentMouseUp);
    this.marqueeEl?.remove();
    this.marqueeEl = null;
    this.marqueeStart = null;
    this.marqueePointer = null;
    this.marqueeSelecting = false;
  }

  private createMarquee(): HTMLElement {
    const marquee = this.mindmap.appEl.ownerDocument.createElement('div');
    marquee.classList.add('mm-selection-marquee');
    this.mindmap.appEl.ownerDocument.body.appendChild(marquee);
    return marquee;
  }

  private updateMarquee(clientX: number, clientY: number): void {
    if (!this.marqueeStart || !this.marqueeEl) return;

    this.marqueePointer = {x: clientX, y: clientY};

    const rect = this.createRect(this.marqueeStart.x, this.marqueeStart.y, clientX, clientY);
    this.marqueeEl.style.left = `${rect.left}px`;
    this.marqueeEl.style.top = `${rect.top}px`;
    this.marqueeEl.style.width = `${rect.right - rect.left}px`;
    this.marqueeEl.style.height = `${rect.bottom - rect.top}px`;

    const nodes = this.mindmap.root
      .getShowNodeList()
      .filter((node: Node) => !node.data.isRoot && this.intersects(rect, node.containEl.getBoundingClientRect()));
    this.replaceSelection(nodes, false);
  }

  private replaceSelection(nodes: Node[], updatePrimary: boolean = true): void {
    const oldNodes = [...this.selectedNodes];
    this.selectedNodes = new Set(nodes);

    if (updatePrimary) this.selectPrimaryNodeForSelection();

    new Set([...oldNodes, ...nodes]).forEach((node) => this.syncNodeVisual(node));
  }

  private selectPrimaryNodeForSelection(): void {
    let primary = this.mindmap.selectNode;
    if (!primary || !this.selectedNodes.has(primary)) {
      primary = [...this.selectedNodes][0];
    }
    this.setPrimaryNode(primary);
  }

  private toggleNode(node: Node): void {
    if (this.selectedNodes.size === 0) {
      const activeNode = this.mindmap.selectNode;
      if (activeNode && !activeNode.data.isRoot) this.selectedNodes.add(activeNode);
    }

    if (this.selectedNodes.has(node)) {
      this.selectedNodes.delete(node);
    } else {
      this.selectedNodes.add(node);
    }

    const primary = this.selectedNodes.has(this.mindmap.selectNode)
      ? this.mindmap.selectNode
      : [...this.selectedNodes][0];
    this.setPrimaryNode(primary);
    this.syncNodeVisual(node);
    this.selectedNodes.forEach((selectedNode) => this.syncNodeVisual(selectedNode));
  }

  private setPrimaryNode(node?: Node): void {
    const current = this.mindmap.selectNode;
    if (current && current !== node) current.unSelect();

    if (node) {
      if (!node.isSelect) node.select();
      this.mindmap.selectNode = node;
    } else {
      this.mindmap.selectNode = null;
    }

    if (current) this.syncNodeVisual(current);
  }

  private syncNodeVisual(node: Node): void {
    const selected = this.selectedNodes.has(node);
    node.containEl.classList.toggle('mm-node-multi-select', selected);
    node.containEl.setAttribute('aria-selected', selected ? 'true' : 'false');
    node.containEl.setAttribute('draggable', selected || node.isSelect ? 'true' : 'false');
  }

  private getMoveRoots(): Node[] {
    return this.mindmap.root.getShowNodeList().filter((node: Node) => {
      if (!this.selectedNodes.has(node)) return false;
      let parent = node.parent;
      while (parent) {
        if (this.selectedNodes.has(parent)) return false;
        parent = parent.parent;
      }
      return true;
    });
  }

  private isInvalidDropTarget(dropNode: Node, nodes: Node[]): boolean {
    return nodes.some((node) => {
      let current: Node | undefined = dropNode;
      while (current) {
        if (current === node) return true;
        current = current.parent;
      }
      return false;
    });
  }

  private blockSingleNodeShortcut(event: KeyboardEvent): boolean {
    if (!this.hasMultipleSelection() || !BLOCKED_MULTI_SELECTION_KEYS.has(event.key)) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

  private suppressClick(): void {
    this.suppressClickUntil = Date.now() + 200;
  }

  private updateBlankPointerGesture(event: MouseEvent): void {
    if (!this.blankPointerStart || this.blankPointerMoved) return;
    const deltaX = event.clientX - this.blankPointerStart.x;
    const deltaY = event.clientY - this.blankPointerStart.y;
    this.blankPointerMoved =
      deltaX * deltaX + deltaY * deltaY > BLANK_CLICK_MOVE_THRESHOLD * BLANK_CLICK_MOVE_THRESHOLD;
  }

  private resetBlankPointerGesture(): void {
    this.blankPointerStart = null;
    this.blankPointerMoved = false;
  }

  private getWheelDeltaY(event: WheelEvent): number {
    let deltaY = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      deltaY *= 16;
    } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      deltaY *= this.mindmap.containerEL.clientHeight;
    }
    return deltaY;
  }

  private isInteractiveTarget(target: HTMLElement): boolean {
    return Boolean(target.closest(
      '.mm-node-bar, .mm-node-link, button, input, textarea, select, [contenteditable="true"]',
    ));
  }

  private createRect(x1: number, y1: number, x2: number, y2: number): DOMRect {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const right = Math.max(x1, x2);
    const bottom = Math.max(y1, y2);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  private intersects(selection: DOMRect, node: DOMRect): boolean {
    return !(
      node.right < selection.left ||
      node.left > selection.right ||
      node.bottom < selection.top ||
      node.top > selection.bottom
    );
  }
}
