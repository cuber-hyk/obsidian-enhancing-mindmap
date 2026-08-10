import type INode from './INode';
import type MindMap from './mindmap';

export const CANVAS_SAFE_MARGIN = 60;

export interface CanvasNodeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExpandedCanvasBounds {
  width: number;
  height: number;
  shiftX: number;
  shiftY: number;
}

function normalizeCanvasSize(size: number | undefined): number {
  return Number.isFinite(size) && size > 0 ? Math.ceil(size) : 1;
}

export function calculateExpandedCanvasBounds(
  rects: CanvasNodeRect[],
  minimumSize: number,
  currentWidth: number,
  currentHeight: number,
  margin = CANVAS_SAFE_MARGIN,
): ExpandedCanvasBounds {
  const safeMinimum = normalizeCanvasSize(minimumSize);
  const safeMargin = Number.isFinite(margin) && margin >= 0 ? margin : CANVAS_SAFE_MARGIN;
  const width = Math.max(safeMinimum, normalizeCanvasSize(currentWidth));
  const height = Math.max(safeMinimum, normalizeCanvasSize(currentHeight));
  const validRects = rects.filter((rect) => (
    Number.isFinite(rect.x)
    && Number.isFinite(rect.y)
    && Number.isFinite(rect.width)
    && Number.isFinite(rect.height)
    && rect.width > 0
    && rect.height > 0
  ));

  if (!validRects.length) {
    return { width, height, shiftX: 0, shiftY: 0 };
  }

  const left = Math.min(...validRects.map((rect) => rect.x));
  const top = Math.min(...validRects.map((rect) => rect.y));
  const right = Math.max(...validRects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...validRects.map((rect) => rect.y + rect.height));
  const shiftX = Math.max(0, safeMargin - left);
  const shiftY = Math.max(0, safeMargin - top);

  return {
    width: Math.max(width, Math.ceil(right + shiftX + safeMargin)),
    height: Math.max(height, Math.ceil(bottom + shiftY + safeMargin)),
    shiftX,
    shiftY,
  };
}

export default class CanvasBoundsController {
  private minimumSize: number;
  private width: number;
  private height: number;

  constructor(private mindmap: MindMap, minimumSize: number | undefined) {
    this.minimumSize = normalizeCanvasSize(minimumSize);
    this.width = this.minimumSize;
    this.height = this.minimumSize;
    this.applyCurrentDimensions();
  }

  setMinimumSize(minimumSize: number | undefined): void {
    const nextMinimumSize = normalizeCanvasSize(minimumSize);
    if (nextMinimumSize !== this.minimumSize) {
      this.minimumSize = nextMinimumSize;
      this.width = nextMinimumSize;
      this.height = nextMinimumSize;
    }
    this.applyCurrentDimensions();
  }

  ensureVisibleNodes(
    nodes: INode[],
    allowShift = true,
  ): { shifted: boolean; resized: boolean } {
    const bounds = calculateExpandedCanvasBounds(
      nodes.map((node) => node.getBox()),
      this.minimumSize,
      this.width,
      this.height,
    );
    const resized = bounds.width !== this.width || bounds.height !== this.height;

    this.width = bounds.width;
    this.height = bounds.height;
    if (resized) this.applyCurrentDimensions();

    const shifted = allowShift && (bounds.shiftX > 0 || bounds.shiftY > 0);
    if (shifted && this.mindmap.root) {
      const rootPosition = this.mindmap.root.getPosition();
      this.mindmap.root.setPosition(
        rootPosition.x + bounds.shiftX,
        rootPosition.y + bounds.shiftY,
      );
      const scale = this.mindmap.mindScale / 100;
      const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
      this.mindmap.containerEL.scrollLeft += bounds.shiftX * safeScale;
      this.mindmap.containerEL.scrollTop += bounds.shiftY * safeScale;
    }

    return { shifted, resized };
  }

  applyCurrentDimensions(): void {
    this.mindmap.appEl.style.width = `${this.width}px`;
    this.mindmap.appEl.style.height = `${this.height}px`;
    this.mindmap.contentEL.style.width = '100%';
    this.mindmap.contentEL.style.height = '100%';
  }
}
