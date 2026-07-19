export type NodeKeyboardShortcutId = 'addSiblingAfter' | 'addSiblingBefore';

export type NodeKeyboardShortcut = {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
};

export type NodeKeyboardShortcuts = Record<NodeKeyboardShortcutId, NodeKeyboardShortcut>;

export const DEFAULT_NODE_KEYBOARD_SHORTCUTS: NodeKeyboardShortcuts = {
  addSiblingAfter: {
    key: 'Enter',
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
  },
  addSiblingBefore: {
    key: 'Enter',
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
  },
};

const modifierKeys = new Set(['Alt', 'Control', 'Meta', 'Shift']);
const invalidKeys = new Set(['Dead', 'Process', 'Unidentified']);

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toLowerCase() : key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isShortcut(value: unknown): value is Partial<NodeKeyboardShortcut> {
  return isRecord(value);
}

function normalizeShortcut(
  value: unknown,
  fallback: NodeKeyboardShortcut,
): NodeKeyboardShortcut {
  if (!isShortcut(value) || typeof value.key !== 'string') return { ...fallback };

  const key = normalizeKey(value.key);
  if (!key || modifierKeys.has(key) || invalidKeys.has(key)) return { ...fallback };

  return {
    key,
    shiftKey: Boolean(value.shiftKey),
    ctrlKey: Boolean(value.ctrlKey),
    metaKey: Boolean(value.metaKey),
    altKey: Boolean(value.altKey),
  };
}

export function createDefaultNodeKeyboardShortcuts(): NodeKeyboardShortcuts {
  return {
    addSiblingAfter: { ...DEFAULT_NODE_KEYBOARD_SHORTCUTS.addSiblingAfter },
    addSiblingBefore: { ...DEFAULT_NODE_KEYBOARD_SHORTCUTS.addSiblingBefore },
  };
}

export function normalizeNodeKeyboardShortcuts(value: unknown): NodeKeyboardShortcuts {
  const shortcuts: Partial<NodeKeyboardShortcuts> = isRecord(value)
    ? value as Partial<NodeKeyboardShortcuts>
    : {};
  return {
    addSiblingAfter: normalizeShortcut(
      shortcuts.addSiblingAfter,
      DEFAULT_NODE_KEYBOARD_SHORTCUTS.addSiblingAfter,
    ),
    addSiblingBefore: normalizeShortcut(
      shortcuts.addSiblingBefore,
      DEFAULT_NODE_KEYBOARD_SHORTCUTS.addSiblingBefore,
    ),
  };
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): NodeKeyboardShortcut | null {
  const key = normalizeKey(event.key);
  if (!key || modifierKeys.has(key) || invalidKeys.has(key) || event.isComposing) return null;

  return {
    key,
    shiftKey: event.shiftKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
  };
}

export function matchesNodeKeyboardShortcut(
  shortcut: NodeKeyboardShortcut,
  event: KeyboardEvent,
): boolean {
  return shortcut.key === normalizeKey(event.key)
    && shortcut.shiftKey === event.shiftKey
    && shortcut.ctrlKey === event.ctrlKey
    && shortcut.metaKey === event.metaKey
    && shortcut.altKey === event.altKey;
}

export function formatNodeKeyboardShortcut(shortcut: NodeKeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');

  const keyNames: Record<string, string> = {
    Space: 'Space',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
  };
  parts.push(keyNames[shortcut.key] || (shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key));
  return parts.join(' + ');
}

function shortcutsEqual(left: NodeKeyboardShortcut, right: NodeKeyboardShortcut): boolean {
  return left.key === right.key
    && left.shiftKey === right.shiftKey
    && left.ctrlKey === right.ctrlKey
    && left.metaKey === right.metaKey
    && left.altKey === right.altKey;
}

function isFixedNodeKeyboardShortcut(shortcut: NodeKeyboardShortcut): boolean {
  if ((shortcut.ctrlKey || shortcut.metaKey) && !shortcut.shiftKey && !shortcut.altKey && shortcut.key === 'z') {
    return true;
  }

  if (shortcut.ctrlKey || shortcut.metaKey || shortcut.altKey) return false;

  if (!shortcut.shiftKey && ['Backspace', 'Space', 'Tab'].includes(shortcut.key)) {
    return true;
  }

  return false;
}

export type NodeKeyboardShortcutValidationError =
  | 'Shortcut must include a non-modifier key'
  | 'Shortcut conflicts with a fixed mindmap action'
  | 'Shortcut is already assigned';

export function validateNodeKeyboardShortcut(
  id: NodeKeyboardShortcutId,
  shortcut: NodeKeyboardShortcut | null,
  shortcuts: NodeKeyboardShortcuts,
): NodeKeyboardShortcutValidationError | null {
  if (!shortcut) return 'Shortcut must include a non-modifier key';
  if (isFixedNodeKeyboardShortcut(shortcut)) {
    return 'Shortcut conflicts with a fixed mindmap action';
  }

  const otherId: NodeKeyboardShortcutId = id === 'addSiblingAfter'
    ? 'addSiblingBefore'
    : 'addSiblingAfter';
  if (shortcutsEqual(shortcut, shortcuts[otherId])) return 'Shortcut is already assigned';
  return null;
}
