export interface NodeWidthSettings {
  textNodeMinWidth: number;
  textNodeMaxWidth: number;
  nodeImageMinWidth: number;
  nodeImageMaxWidth: number;
}

export interface NodeWidthLimits {
  min: number;
  max: number;
}

export const DEFAULT_TEXT_NODE_WIDTH_LIMITS: NodeWidthLimits = {
  min: 32,
  max: 1600,
};

export const DEFAULT_NODE_IMAGE_WIDTH_LIMITS: NodeWidthLimits = {
  min: 80,
  max: 960,
};

export const DEFAULT_NODE_WIDTH_SETTINGS: NodeWidthSettings = {
  textNodeMinWidth: DEFAULT_TEXT_NODE_WIDTH_LIMITS.min,
  textNodeMaxWidth: DEFAULT_TEXT_NODE_WIDTH_LIMITS.max,
  nodeImageMinWidth: DEFAULT_NODE_IMAGE_WIDTH_LIMITS.min,
  nodeImageMaxWidth: DEFAULT_NODE_IMAGE_WIDTH_LIMITS.max,
};

export function normalizeNodeWidthSettings(
  settings: Partial<NodeWidthSettings>,
): NodeWidthSettings {
  const textLimits = normalizeWidthLimits(
    settings.textNodeMinWidth,
    settings.textNodeMaxWidth,
    DEFAULT_TEXT_NODE_WIDTH_LIMITS,
  );
  const imageLimits = normalizeWidthLimits(
    settings.nodeImageMinWidth,
    settings.nodeImageMaxWidth,
    DEFAULT_NODE_IMAGE_WIDTH_LIMITS,
  );
  return {
    textNodeMinWidth: textLimits.min,
    textNodeMaxWidth: textLimits.max,
    nodeImageMinWidth: imageLimits.min,
    nodeImageMaxWidth: imageLimits.max,
  };
}

export function getTextNodeWidthLimits(
  settings?: Partial<NodeWidthSettings>,
): NodeWidthLimits {
  return normalizeWidthLimits(
    settings?.textNodeMinWidth,
    settings?.textNodeMaxWidth,
    DEFAULT_TEXT_NODE_WIDTH_LIMITS,
  );
}

export function getNodeImageWidthLimits(
  settings?: Partial<NodeWidthSettings>,
): NodeWidthLimits {
  return normalizeWidthLimits(
    settings?.nodeImageMinWidth,
    settings?.nodeImageMaxWidth,
    DEFAULT_NODE_IMAGE_WIDTH_LIMITS,
  );
}

export function normalizeWidthLimits(
  min: unknown,
  max: unknown,
  defaults: NodeWidthLimits,
): NodeWidthLimits {
  const normalizedMin = toPositiveInteger(min);
  const normalizedMax = toPositiveInteger(max);
  if (normalizedMin === null || normalizedMax === null || normalizedMin > normalizedMax) {
    return {...defaults};
  }
  return {min: normalizedMin, max: normalizedMax};
}

export function clampWidth(width: number, limits: NodeWidthLimits, fallback: number): number {
  const value = Number.isFinite(width) ? Math.round(width) : fallback;
  return Math.max(limits.min, Math.min(limits.max, value));
}

function toPositiveInteger(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) return null;
  return number;
}
