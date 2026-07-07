import type MindMap from '../mindmap';

const MIN_SCALE = 20;
const MAX_SCALE = 300;
const SCALE_STEP = 10;
const DEFAULT_PANEL_WIDTH = 210;
const DEFAULT_OVERVIEW_HEIGHT = 116;
const MIN_PANEL_WIDTH = 170;
const MAX_PANEL_WIDTH = 360;
const MIN_OVERVIEW_HEIGHT = 90;
const MAX_OVERVIEW_HEIGHT = 260;

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export default class MindMapNavigatorController {
  private mindmap: MindMap;
  private rootEl: HTMLElement;
  private overviewEl: HTMLElement;
  private contentEl: HTMLElement;
  private viewportEl: HTMLElement;
  private zoomInput: HTMLInputElement;
  private zoomLabel: HTMLElement;
  private nodeCountEl: HTMLElement;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private panelWidth = DEFAULT_PANEL_WIDTH;
  private overviewHeight = DEFAULT_OVERVIEW_HEIGHT;
  private panelResize:
    | {
        corner: ResizeCorner;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
      }
    | null = null;
  private viewportDrag:
    | {
        startX: number;
        startY: number;
        startScrollLeft: number;
        startScrollTop: number;
        overviewRatio: number;
      }
    | null = null;

  constructor(mindmap: MindMap) {
    this.mindmap = mindmap;
    this.mindmap.containerEL.classList.add('mm-mindmap-container');
    this.rootEl = document.createElement('div');
    this.rootEl.classList.add('mm-navigator');

    const hideButton = this.createButton('×', 'Hide navigator');
    hideButton.classList.add('mm-navigator-hide-button');
    const restoreButton = this.createButton('▣', 'Show navigator');
    restoreButton.classList.add('mm-navigator-restore-button');

    this.overviewEl = document.createElement('div');
    this.overviewEl.classList.add('mm-navigator-overview');
    this.contentEl = document.createElement('div');
    this.contentEl.classList.add('mm-navigator-content');
    this.viewportEl = document.createElement('div');
    this.viewportEl.classList.add('mm-navigator-viewport');
    this.overviewEl.appendChild(this.contentEl);
    this.overviewEl.appendChild(this.viewportEl);
    this.createResizeHandles();

    const zoomEl = document.createElement('div');
    zoomEl.classList.add('mm-navigator-zoom');

    const zoomOutButton = this.createButton('-', 'Zoom out');
    const zoomInButton = this.createButton('+', 'Zoom in');
    this.zoomInput = document.createElement('input');
    this.zoomInput.type = 'range';
    this.zoomInput.min = `${MIN_SCALE}`;
    this.zoomInput.max = `${MAX_SCALE}`;
    this.zoomInput.step = '1';
    this.zoomInput.classList.add('mm-navigator-zoom-input');
    this.zoomInput.setAttribute('aria-label', 'Zoom');
    this.zoomLabel = document.createElement('span');
    this.zoomLabel.classList.add('mm-navigator-zoom-label');
    this.nodeCountEl = document.createElement('span');
    this.nodeCountEl.classList.add('mm-navigator-node-count');

    zoomEl.appendChild(zoomOutButton);
    zoomEl.appendChild(this.zoomInput);
    zoomEl.appendChild(zoomInButton);
    zoomEl.appendChild(this.zoomLabel);
    this.rootEl.appendChild(hideButton);
    this.rootEl.appendChild(restoreButton);
    this.rootEl.appendChild(this.overviewEl);
    this.rootEl.appendChild(zoomEl);
    this.rootEl.appendChild(this.nodeCountEl);

    this.mindmap.containerEL.appendChild(this.rootEl);

    zoomOutButton.addEventListener('click', this.onZoomOut);
    zoomInButton.addEventListener('click', this.onZoomIn);
    hideButton.addEventListener('click', this.onHide);
    restoreButton.addEventListener('click', this.onRestore);
    this.zoomInput.addEventListener('input', this.onZoomInput);
    this.overviewEl.addEventListener('pointerdown', this.onOverviewPointerDown);
    this.mindmap.containerEL.addEventListener('scroll', this.onScroll);
    this.resizeObserver = new ResizeObserver(() => this.scheduleUpdate());
    this.resizeObserver.observe(this.mindmap.containerEL);
    window.addEventListener('resize', this.onWindowResize);

    this.update();
  }

  destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.detachViewportDrag();
    this.detachPanelResize();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.onWindowResize);
    this.mindmap.containerEL.removeEventListener('scroll', this.onScroll);
    this.mindmap.containerEL.classList.remove('mm-mindmap-container');
    this.rootEl.remove();
  }

  scheduleUpdate() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  update() {
    this.updatePlacement();
    this.updateSize();
    this.updateZoom();
    this.updateNodeCount();
    this.renderOverview();
  }

  private updatePlacement() {
    const rect = this.mindmap.containerEL.getBoundingClientRect();
    this.rootEl.style.right = `${Math.max(16, window.innerWidth - rect.right + 16)}px`;
    this.rootEl.style.bottom = `${Math.max(16, window.innerHeight - rect.bottom + 16)}px`;
  }

  private createButton(label: string, ariaLabel: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('clickable-icon', 'mm-navigator-zoom-button');
    button.textContent = label;
    button.setAttribute('aria-label', ariaLabel);
    return button;
  }

  private createResizeHandles() {
    (['nw', 'ne', 'sw', 'se'] as ResizeCorner[]).forEach((corner) => {
      const handle = document.createElement('span');
      handle.classList.add('mm-navigator-resize-handle', `mm-navigator-resize-${corner}`);
      handle.dataset.corner = corner;
      handle.setAttribute('aria-hidden', 'true');
      handle.addEventListener('pointerdown', this.onPanelResizePointerDown);
      this.rootEl.appendChild(handle);
    });
  }

  private updateSize() {
    this.rootEl.style.width = `${this.panelWidth}px`;
    this.overviewEl.style.height = `${this.overviewHeight}px`;
  }

  private updateZoom() {
    const scale = Math.round(this.mindmap.mindScale);
    this.zoomInput.value = `${scale}`;
    this.zoomLabel.textContent = `${scale}%`;
  }

  private updateNodeCount() {
    const root = this.mindmap.root;
    const visibleCount = root?.getShowNodeList?.().length || 0;
    const totalCount = root ? this.countNodeTree(root) : 0;
    this.nodeCountEl.textContent = `${visibleCount} / ${totalCount} 节点`;
    this.nodeCountEl.setAttribute('aria-label', `Visible nodes ${visibleCount}, total nodes ${totalCount}`);
  }

  private countNodeTree(node: { children?: unknown[] }): number {
    const children = Array.isArray(node.children) ? node.children : [];
    return children.reduce(
      (count, child) => count + this.countNodeTree(child as { children?: unknown[] }),
      1,
    );
  }

  private renderOverview() {
    const nodes = this.mindmap.root?.getShowNodeList?.() || [];
    if (!nodes.length) {
      this.contentEl.innerHTML = '';
      this.viewportEl.style.display = 'none';
      return;
    }

    const bounds = this.getContentBounds(nodes.map((node) => node.getBox()));
    if (bounds.width <= 0 || bounds.height <= 0) {
      this.contentEl.innerHTML = '';
      this.viewportEl.style.display = 'none';
      return;
    }

    const metrics = this.getOverviewMetrics(bounds);

    this.contentEl.innerHTML = '';
    nodes.forEach((node) => {
      const box = node.getBox();
      const marker = document.createElement('span');
      marker.classList.add('mm-navigator-node');
      marker.style.left = `${metrics.offsetX + (box.x - bounds.x) * metrics.ratio}px`;
      marker.style.top = `${metrics.offsetY + (box.y - bounds.y) * metrics.ratio}px`;
      marker.style.width = `${Math.max(2, box.width * metrics.ratio)}px`;
      marker.style.height = `${Math.max(2, box.height * metrics.ratio)}px`;
      this.contentEl.appendChild(marker);
    });

    const viewport = this.getViewportRect();
    this.viewportEl.style.display = 'block';
    this.viewportEl.style.left = `${metrics.offsetX + (viewport.x - bounds.x) * metrics.ratio}px`;
    this.viewportEl.style.top = `${metrics.offsetY + (viewport.y - bounds.y) * metrics.ratio}px`;
    this.viewportEl.style.width = `${Math.max(8, viewport.width * metrics.ratio)}px`;
    this.viewportEl.style.height = `${Math.max(8, viewport.height * metrics.ratio)}px`;
  }

  private getContentBounds(rects: Rect[]): Rect {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    rects.forEach((rect) => {
      left = Math.min(left, rect.x);
      top = Math.min(top, rect.y);
      right = Math.max(right, rect.x + rect.width);
      bottom = Math.max(bottom, rect.y + rect.height);
    });
    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    };
  }

  private panToOverviewPoint(clientX: number, clientY: number) {
    const nodes = this.mindmap.root?.getShowNodeList?.() || [];
    if (!nodes.length) return;

    const bounds = this.getContentBounds(nodes.map((node) => node.getBox()));
    const metrics = this.getOverviewMetrics(bounds);
    const targetX = bounds.x + (clientX - metrics.rect.left - metrics.offsetX) / metrics.ratio;
    const targetY = bounds.y + (clientY - metrics.rect.top - metrics.offsetY) / metrics.ratio;
    this.centerCanvasPoint(targetX, targetY);
    this.scheduleUpdate();
  }

  private getScale() {
    const scale = this.mindmap.mindScale / 100;
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  private getViewportRect(): Rect {
    const scale = this.getScale();
    const containerRect = this.mindmap.containerEL.getBoundingClientRect();
    const appRect = this.mindmap.appEl.getBoundingClientRect();
    return {
      x: (containerRect.left - appRect.left) / scale,
      y: (containerRect.top - appRect.top) / scale,
      width: this.mindmap.containerEL.clientWidth / scale,
      height: this.mindmap.containerEL.clientHeight / scale,
    };
  }

  private centerCanvasPoint(x: number, y: number) {
    const scale = this.getScale();
    const viewport = this.getViewportRect();
    this.mindmap.containerEL.scrollLeft +=
      (x - (viewport.x + viewport.width / 2)) * scale;
    this.mindmap.containerEL.scrollTop +=
      (y - (viewport.y + viewport.height / 2)) * scale;
  }

  private getOverviewMetrics(bounds: Rect) {
    const rect = this.overviewEl.getBoundingClientRect();
    const width = rect.width || 180;
    const height = rect.height || 110;
    const padding = 8;
    const ratio = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
    );
    const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    return {
      rect,
      ratio: safeRatio,
      offsetX: padding + (width - padding * 2 - bounds.width * safeRatio) / 2,
      offsetY: padding + (height - padding * 2 - bounds.height * safeRatio) / 2,
    };
  }

  private onZoomOut = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.mindmap.scale(this.mindmap.mindScale - SCALE_STEP);
  };

  private onZoomIn = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.mindmap.scale(this.mindmap.mindScale + SCALE_STEP);
  };

  private onZoomInput = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    this.mindmap.scale(Number(this.zoomInput.value));
  };

  private onHide = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.rootEl.classList.add('is-hidden');
  };

  private onRestore = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.rootEl.classList.remove('is-hidden');
    this.scheduleUpdate();
  };

  private onPanelResizePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const corner = target.dataset.corner as ResizeCorner | undefined;
    if (!corner) return;

    this.panelResize = {
      corner,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: this.panelWidth,
      startHeight: this.overviewHeight,
    };
    this.rootEl.classList.add('is-resizing');
    target.setPointerCapture?.(event.pointerId);
    document.addEventListener('pointermove', this.onPanelResizePointerMove);
    document.addEventListener('pointerup', this.onPanelResizePointerUp);
  };

  private onOverviewPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const isViewportDrag = event.target === this.viewportEl;
    if (!isViewportDrag) {
      this.panToOverviewPoint(event.clientX, event.clientY);
      return;
    }
    const nodes = this.mindmap.root?.getShowNodeList?.() || [];
    if (!nodes.length) return;
    const bounds = this.getContentBounds(nodes.map((node) => node.getBox()));
    const metrics = this.getOverviewMetrics(bounds);
    this.viewportDrag = {
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: this.mindmap.containerEL.scrollLeft,
      startScrollTop: this.mindmap.containerEL.scrollTop,
      overviewRatio: metrics.ratio,
    };
    this.viewportEl.setPointerCapture?.(event.pointerId);
    document.addEventListener('pointermove', this.onViewportPointerMove);
    document.addEventListener('pointerup', this.onViewportPointerUp);
  };

  private onViewportPointerMove = (event: PointerEvent) => {
    if (!this.viewportDrag) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = this.getScale();
    this.mindmap.containerEL.scrollLeft =
      this.viewportDrag.startScrollLeft +
      ((event.clientX - this.viewportDrag.startX) / this.viewportDrag.overviewRatio) * scale;
    this.mindmap.containerEL.scrollTop =
      this.viewportDrag.startScrollTop +
      ((event.clientY - this.viewportDrag.startY) / this.viewportDrag.overviewRatio) * scale;
    this.scheduleUpdate();
  };

  private onViewportPointerUp = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.detachViewportDrag();
  };

  private detachViewportDrag() {
    this.viewportDrag = null;
    document.removeEventListener('pointermove', this.onViewportPointerMove);
    document.removeEventListener('pointerup', this.onViewportPointerUp);
  }

  private onPanelResizePointerMove = (event: PointerEvent) => {
    if (!this.panelResize) return;
    event.preventDefault();
    event.stopPropagation();
    const dx = event.clientX - this.panelResize.startX;
    const dy = event.clientY - this.panelResize.startY;
    const widthDelta = this.panelResize.corner.includes('w') ? -dx : dx;
    const heightDelta = this.panelResize.corner.includes('n') ? -dy : dy;
    this.panelWidth = this.clamp(
      this.panelResize.startWidth + widthDelta,
      MIN_PANEL_WIDTH,
      MAX_PANEL_WIDTH,
    );
    this.overviewHeight = this.clamp(
      this.panelResize.startHeight + heightDelta,
      MIN_OVERVIEW_HEIGHT,
      MAX_OVERVIEW_HEIGHT,
    );
    this.updateSize();
    this.scheduleUpdate();
  };

  private onPanelResizePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.detachPanelResize();
  };

  private detachPanelResize() {
    this.panelResize = null;
    this.rootEl.classList.remove('is-resizing');
    document.removeEventListener('pointermove', this.onPanelResizePointerMove);
    document.removeEventListener('pointerup', this.onPanelResizePointerUp);
  }

  private onScroll = () => {
    this.scheduleUpdate();
  };

  private onWindowResize = () => {
    this.scheduleUpdate();
  };

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }
}
