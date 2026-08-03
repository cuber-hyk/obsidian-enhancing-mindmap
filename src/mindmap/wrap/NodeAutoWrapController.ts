import {
  canAutoWrapNodeMarkdown,
} from './NodeAutoWrapMarkdown';
import {
  clampWidth,
  NodeWidthLimits,
} from '../NodeWidthSettings';

type NodeAutoWrapControllerOptions = {
  containEl: HTMLElement;
  contentEl: HTMLElement;
  getMarkdown: () => string;
  getWidth: () => number | undefined;
  getLimits: () => NodeWidthLimits;
  getScale: () => number;
  onCommit: (width: number) => void;
  onLayoutChange: () => void;
};

type DragState = {
  pointerId: number;
  startX: number;
  startWidth: number;
  width: number;
};

export default class NodeAutoWrapController {
  private containEl: HTMLElement;
  private contentEl: HTMLElement;
  private getMarkdown: () => string;
  private getWidth: () => number | undefined;
  private getLimits: () => NodeWidthLimits;
  private getScale: () => number;
  private onCommit: (width: number) => void;
  private onLayoutChange: () => void;
  private handleEl: HTMLElement;
  private drag: DragState | null = null;

  constructor(options: NodeAutoWrapControllerOptions) {
    this.containEl = options.containEl;
    this.contentEl = options.contentEl;
    this.getMarkdown = options.getMarkdown;
    this.getWidth = options.getWidth;
    this.getLimits = options.getLimits;
    this.getScale = options.getScale;
    this.onCommit = options.onCommit;
    this.onLayoutChange = options.onLayoutChange;

    this.handleEl = this.containEl.ownerDocument.createElement('span');
    this.handleEl.classList.add('mm-node-auto-wrap-handle');
    this.handleEl.setAttribute('aria-label', 'Resize node text');
    this.handleEl.setAttribute('role', 'presentation');
    this.handleEl.addEventListener('pointerdown', this.onPointerDown);
    this.handleEl.addEventListener('pointermove', this.onPointerMove);
    this.handleEl.addEventListener('pointerup', this.onPointerUp);
    this.handleEl.addEventListener('pointercancel', this.onPointerCancel);
    this.containEl.appendChild(this.handleEl);
    this.refresh();
  }

  refresh(): void {
    const supported = canAutoWrapNodeMarkdown(this.getMarkdown());
    this.containEl.classList.toggle('mm-node-auto-wrap-supported', supported);
    this.applyWidth(supported ? this.getWidth() : undefined);
  }

  cancel(): void {
    this.finishDrag(false);
  }

  destroy(): void {
    this.cancel();
    this.handleEl.removeEventListener('pointerdown', this.onPointerDown);
    this.handleEl.removeEventListener('pointermove', this.onPointerMove);
    this.handleEl.removeEventListener('pointerup', this.onPointerUp);
    this.handleEl.removeEventListener('pointercancel', this.onPointerCancel);
    this.handleEl.remove();
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.containEl.classList.contains('mm-node-auto-wrap-supported')) return;
    event.preventDefault();
    event.stopPropagation();

    const scale = this.getScale();
    const startWidth = this.contentEl.getBoundingClientRect().width / scale;
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth,
      width: startWidth,
    };
    this.containEl.classList.add('is-auto-wrapping');
    this.handleEl.setPointerCapture?.(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const delta = (event.clientX - this.drag.startX) / this.getScale();
    const width = clampWidth(
      this.drag.startWidth + delta,
      this.getLimits(),
      this.drag.startWidth,
    );
    this.drag.width = width;
    this.applyWidth(width);
    this.onLayoutChange();
  };

  private onPointerUp = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.finishDrag(true);
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.finishDrag(false);
  };

  private finishDrag(commit: boolean): void {
    const drag = this.drag;
    if (!drag) return;

    this.drag = null;
    this.containEl.classList.remove('is-auto-wrapping');

    if (!commit) {
      this.applyWidth(this.getWidth());
      this.onLayoutChange();
      return;
    }

    const width = Math.round(drag.width);
    if (width !== this.getWidth()) {
      this.onCommit(width);
    } else {
      this.onLayoutChange();
    }
  }

  private applyWidth(width: number | undefined): void {
    if (!width) {
      this.contentEl.style.removeProperty('width');
      this.contentEl.style.removeProperty('min-width');
      this.contentEl.style.removeProperty('max-width');
      return;
    }

    const clampedWidth = clampWidth(width, this.getLimits(), width);
    this.contentEl.style.width = `${clampedWidth}px`;
    this.contentEl.style.minWidth = `${clampedWidth}px`;
    this.contentEl.style.maxWidth = `${clampedWidth}px`;
  }

}
