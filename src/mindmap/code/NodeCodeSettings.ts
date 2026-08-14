export const DEFAULT_NODE_CODE_FONT_SIZE = 14;
export const MIN_NODE_CODE_FONT_SIZE = 10;
export const MAX_NODE_CODE_FONT_SIZE = 24;

export function normalizeNodeCodeFontSize(value: unknown): number {
  const fontSize = Number(value);
  if (
    !Number.isSafeInteger(fontSize)
    || fontSize < MIN_NODE_CODE_FONT_SIZE
    || fontSize > MAX_NODE_CODE_FONT_SIZE
  ) {
    return DEFAULT_NODE_CODE_FONT_SIZE;
  }
  return fontSize;
}
