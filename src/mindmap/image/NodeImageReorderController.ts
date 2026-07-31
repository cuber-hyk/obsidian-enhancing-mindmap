import { NodeImageBoundary } from './NodeImageMarkdown';

type NodeImageReorderControllerOptions = {
  containEl: HTMLElement;
  contentEl: HTMLElement;
  onMove: (imageEl: HTMLElement, boundary: NodeImageBoundary) => void;
};

type ReorderState = {
  pointerId: number;
  startX: number;
  startY: number;
  imageEl: HTMLElement;
  boundary: NodeImageBoundary | null;
  active: boolean;
};

const DRAG_THRESHOLD = 4;

export default class NodeImageReorderController {
  private containEl: HTMLElement;
  private contentEl: HTMLElement;
  private onMove: (imageEl: HTMLElement, boundary: NodeImageBoundary) => void;
  private indicatorEl: HTMLElement;
  private reorder: ReorderState | null = null;

  constructor(options: NodeImageReorderControllerOptions) {
    this.containEl = options.containEl;
    this.contentEl = options.contentEl;
    this.onMove = options.onMove;
    this.indicatorEl = this.containEl.ownerDocument.createElement('span');
    this.indicatorEl.classList.add('mm-node-image-reorder-indicator');
    this.indicatorEl.setAttribute('aria-hidden', 'true');
    this.indicatorEl.hidden = true;
    this.containEl.appendChild(this.indicatorEl);

    this.contentEl.addEventListener('pointerdown', this.onPointerDown);
    this.contentEl.addEventListener('pointermove', this.onPointerMove);
    this.contentEl.addEventListener('pointerup', this.onPointerUp);
    this.contentEl.addEventListener('pointercancel', this.onPointerCancel);
  }

  cancel(): void {
    this.finishReorder();
  }

  destroy(): void {
    this.cancel();
    this.contentEl.removeEventListener('pointerdown', this.onPointerDown);
    this.contentEl.removeEventListener('pointermove', this.onPointerMove);
    this.contentEl.removeEventListener('pointerup', this.onPointerUp);
    this.contentEl.removeEventListener('pointercancel', this.onPointerCancel);
    this.indicatorEl.remove();
  }

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('.mm-node-image-resize-handle')) return;
    const imageEl = target.closest('.mm-node-image-attachment');
    if (!(imageEl instanceof HTMLElement) || !imageEl.classList.contains('is-selected')) return;

    event.preventDefault();
    event.stopPropagation();
    this.reorder = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      imageEl,
      boundary: null,
      active: false,
    };
    imageEl.setPointerCapture?.(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    const reorder = this.reorder;
    if (!reorder || event.pointerId !== reorder.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    if (!reorder.active) {
      const distance = Math.hypot(event.clientX - reorder.startX, event.clientY - reorder.startY);
      if (distance < DRAG_THRESHOLD) return;
      reorder.active = true;
      reorder.imageEl.classList.add('is-reordering');
      reorder.imageEl.setAttribute('aria-grabbed', 'true');
      this.containEl.classList.add('is-reordering-image');
    }

    const rect = this.contentEl.getBoundingClientRect();
    const boundary: NodeImageBoundary = event.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    if (boundary !== reorder.boundary) {
      reorder.boundary = boundary;
      this.showIndicator(boundary);
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    const reorder = this.reorder;
    if (!reorder || event.pointerId !== reorder.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const shouldMove = reorder.active && reorder.boundary;
    const imageEl = reorder.imageEl;
    const boundary = reorder.boundary;
    this.finishReorder();
    if (shouldMove && boundary) this.onMove(imageEl, boundary);
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (!this.reorder || event.pointerId !== this.reorder.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.finishReorder();
  };

  private showIndicator(boundary: NodeImageBoundary): void {
    this.indicatorEl.hidden = false;
    this.indicatorEl.classList.toggle('is-top', boundary === 'top');
    this.indicatorEl.classList.toggle('is-bottom', boundary === 'bottom');
  }

  private finishReorder(): void {
    if (this.reorder) {
      this.reorder.imageEl.classList.remove('is-reordering');
      this.reorder.imageEl.setAttribute('aria-grabbed', 'false');
      if (this.reorder.imageEl.hasPointerCapture?.(this.reorder.pointerId)) {
        this.reorder.imageEl.releasePointerCapture?.(this.reorder.pointerId);
      }
    }
    this.reorder = null;
    this.indicatorEl.hidden = true;
    this.indicatorEl.classList.remove('is-top', 'is-bottom');
    this.containEl.classList.remove('is-reordering-image');
  }
}
