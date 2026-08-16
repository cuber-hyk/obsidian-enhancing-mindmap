import { Platform } from 'obsidian';

export type MindMapShortcutContext = 'canvas' | 'selected' | 'editing' | 'image' | 'multiple';

export type MindMapShortcut = {
  key: string;
  modKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
};

export type MindMapShortcutId =
  | 'addSiblingAfter' | 'addSiblingBefore' | 'addChild' | 'editNode' | 'deleteNode'
  | 'finishEdit' | 'insertLineBreak' | 'copyNode' | 'cutNode' | 'pasteNode'
  | 'undo' | 'redo' | 'toggleExpand' | 'numberChildNodes'
  | 'boldText' | 'italicText' | 'strikeText' | 'highlightText'
  | 'navigateUp' | 'navigateDown' | 'navigateLeft' | 'navigateRight' | 'navigateRoot'
  | 'moveImageUp' | 'moveImageDown' | 'moveImageLeft' | 'moveImageRight'
  | 'expandMaxLevel' | 'collapseMaxLevel'
  | 'moveNodeUp' | 'moveNodeDown' | 'moveNodeLeft' | 'moveNodeRight'
  | 'moveNextSiblings' | 'moveAllSiblings' | 'joinBelow' | 'joinCitation'
  | 'centerNode' | 'zoomIn' | 'zoomOut' | 'addTabulation' | 'removeLineBreaks';

export type MindMapShortcutDefinition = {
  id: MindMapShortcutId;
  label: string;
  category: 'Node' | 'Navigation' | 'Clipboard and history' | 'Markdown formatting' | 'Image' | 'Advanced';
  contexts: MindMapShortcutContext[];
  defaultShortcut: MindMapShortcut | null;
  highFrequency?: boolean;
  commandId?: string;
};

export type MindMapShortcuts = Record<MindMapShortcutId, MindMapShortcut | null>;

const key = (
  value: string,
  modifiers: Partial<Omit<MindMapShortcut, 'key'>> = {},
): MindMapShortcut => ({
  key: normalizeShortcutKey(value),
  modKey: false,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers,
});

export const MINDMAP_SHORTCUT_DEFINITIONS: MindMapShortcutDefinition[] = [
  { id: 'addSiblingAfter', label: 'Add sibling below', category: 'Node', contexts: ['selected'], defaultShortcut: key('Enter'), highFrequency: true },
  { id: 'addSiblingBefore', label: 'Add sibling above', category: 'Node', contexts: ['selected'], defaultShortcut: key('Enter', { shiftKey: true }), highFrequency: true },
  { id: 'addChild', label: 'Add child node', category: 'Node', contexts: ['selected', 'editing'], defaultShortcut: key('Tab'), highFrequency: true },
  { id: 'editNode', label: 'Enter edit mode', category: 'Node', contexts: ['selected'], defaultShortcut: key('Space'), highFrequency: true },
  { id: 'deleteNode', label: 'Delete selected node', category: 'Node', contexts: ['selected', 'multiple'], defaultShortcut: key('Backspace'), highFrequency: true },
  { id: 'finishEdit', label: 'Finish editing', category: 'Node', contexts: ['editing'], defaultShortcut: key('Enter'), highFrequency: true },
  { id: 'insertLineBreak', label: 'Insert line break', category: 'Node', contexts: ['editing'], defaultShortcut: key('Enter', { shiftKey: true }) },
  { id: 'copyNode', label: 'Copy selected node', category: 'Clipboard and history', contexts: ['selected'], defaultShortcut: key('c', { modKey: true }), highFrequency: true },
  { id: 'cutNode', label: 'Cut selected node', category: 'Clipboard and history', contexts: ['selected'], defaultShortcut: key('x', { modKey: true }), highFrequency: true },
  { id: 'pasteNode', label: 'Paste as child node', category: 'Clipboard and history', contexts: ['selected'], defaultShortcut: key('v', { modKey: true }), highFrequency: true },
  { id: 'undo', label: 'Undo', category: 'Clipboard and history', contexts: ['canvas', 'selected'], defaultShortcut: key('z', { modKey: true }), highFrequency: true, commandId: 'Undo' },
  { id: 'redo', label: 'Redo', category: 'Clipboard and history', contexts: ['canvas', 'selected'], defaultShortcut: Platform.isMacOS ? key('z', { modKey: true, shiftKey: true }) : key('y', { modKey: true }), highFrequency: true, commandId: 'Redo' },
  { id: 'toggleExpand', label: 'Toggle expand/collapse node', category: 'Node', contexts: ['selected'], defaultShortcut: key('Space', { modKey: true, shiftKey: true }), highFrequency: true, commandId: 'Toggle expand/collapse node' },
  { id: 'numberChildNodes', label: 'Number child nodes', category: 'Node', contexts: ['selected'], defaultShortcut: null, highFrequency: true, commandId: 'Number child nodes' },
  { id: 'boldText', label: 'Bold selected text', category: 'Markdown formatting', contexts: ['editing'], defaultShortcut: key('b', { modKey: true }), commandId: "Bold the node's text" },
  { id: 'italicText', label: 'Italicize selected text', category: 'Markdown formatting', contexts: ['editing'], defaultShortcut: key('i', { modKey: true }), commandId: "Italicize the node's text" },
  { id: 'strikeText', label: 'Strike through selected text', category: 'Markdown formatting', contexts: ['editing'], defaultShortcut: key('s', { modKey: true, shiftKey: true }) },
  { id: 'highlightText', label: "Highlight the node's text", category: 'Markdown formatting', contexts: ['selected', 'editing'], defaultShortcut: key('h', { altKey: true, shiftKey: true }), commandId: "Highlight the node's text" },
  { id: 'navigateUp', label: 'Select node above', category: 'Navigation', contexts: ['selected'], defaultShortcut: key('ArrowUp') },
  { id: 'navigateDown', label: 'Select node below', category: 'Navigation', contexts: ['selected'], defaultShortcut: key('ArrowDown') },
  { id: 'navigateLeft', label: 'Select node left', category: 'Navigation', contexts: ['selected'], defaultShortcut: key('ArrowLeft') },
  { id: 'navigateRight', label: 'Select node right', category: 'Navigation', contexts: ['selected'], defaultShortcut: key('ArrowRight') },
  { id: 'navigateRoot', label: 'Select root node', category: 'Navigation', contexts: ['selected'], defaultShortcut: key('Home') },
  { id: 'moveImageUp', label: 'Move focused node image up', category: 'Image', contexts: ['image'], defaultShortcut: key('ArrowUp', { altKey: true }), commandId: 'Move focused node image up' },
  { id: 'moveImageDown', label: 'Move focused node image down', category: 'Image', contexts: ['image'], defaultShortcut: key('ArrowDown', { altKey: true }), commandId: 'Move focused node image down' },
  { id: 'moveImageLeft', label: 'Move focused node image left', category: 'Image', contexts: ['image'], defaultShortcut: key('ArrowLeft', { altKey: true }), commandId: 'Move focused node image left' },
  { id: 'moveImageRight', label: 'Move focused node image right', category: 'Image', contexts: ['image'], defaultShortcut: key('ArrowRight', { altKey: true }), commandId: 'Move focused node image right' },
  { id: 'expandMaxLevel', label: 'Expand one level from the max. displayed level', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('PageDown', { altKey: true }), commandId: 'Expand one level from the max. displayed level' },
  { id: 'collapseMaxLevel', label: 'Collapse one level from the max. displayed level', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('PageUp', { altKey: true }), commandId: 'Collapse one level from the max. displayed level' },
  { id: 'moveNodeUp', label: 'Move the current node above', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('ArrowUp', { altKey: true, shiftKey: true }), commandId: 'Move the current node above' },
  { id: 'moveNodeDown', label: 'Move the current node below', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('ArrowDown', { altKey: true, shiftKey: true }), commandId: 'Move the current node below' },
  { id: 'moveNodeLeft', label: 'Move the current node left', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('ArrowLeft', { altKey: true, shiftKey: true }), commandId: 'Move the current node left' },
  { id: 'moveNodeRight', label: 'Move the current node right', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('ArrowRight', { altKey: true, shiftKey: true }), commandId: 'Move the current node right' },
  { id: 'moveNextSiblings', label: 'Move next siblings as children', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('d', { altKey: true, shiftKey: true }), commandId: 'Move next siblings as children' },
  { id: 'moveAllSiblings', label: 'Move all siblings as children', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('d', { altKey: true, modKey: true, shiftKey: true }), commandId: 'Move all siblings as children' },
  { id: 'joinBelow', label: 'Join with the node below', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('j', { altKey: true, shiftKey: true }), commandId: 'Join with the node below' },
  { id: 'joinCitation', label: 'Join as citation with the node below', category: 'Advanced', contexts: ['selected'], defaultShortcut: key('j', { altKey: true, modKey: true, shiftKey: true }), commandId: 'Join as citation with the node below' },
  { id: 'centerNode', label: 'Center mindmap view on the current node', category: 'Navigation', contexts: ['selected'], defaultShortcut: key('e', { altKey: true }), commandId: 'Center mindmap view on the current node' },
  { id: 'zoomIn', label: 'Zoom in', category: 'Navigation', contexts: ['canvas', 'selected'], defaultShortcut: key('=', { altKey: true }), commandId: 'Zoom in' },
  { id: 'zoomOut', label: 'Zoom out', category: 'Navigation', contexts: ['canvas', 'selected'], defaultShortcut: key('-', { altKey: true }), commandId: 'Zoom out' },
  { id: 'addTabulation', label: 'Add tabulation', category: 'Markdown formatting', contexts: ['editing'], defaultShortcut: key('t', { altKey: true, shiftKey: true }), commandId: 'Add tabulation' },
  { id: 'removeLineBreaks', label: 'Remove line breaks (<br>)', category: 'Markdown formatting', contexts: ['selected', 'editing'], defaultShortcut: key('l', { altKey: true, shiftKey: true }), commandId: 'Remove line breaks (<br>)' },
];

const definitionById = new Map(MINDMAP_SHORTCUT_DEFINITIONS.map((definition) => [definition.id, definition]));
const modifierKeys = new Set(['Alt', 'Control', 'Meta', 'Shift']);
const invalidKeys = new Set(['Dead', 'Process', 'Unidentified']);

export function createDefaultMindMapShortcuts(): MindMapShortcuts {
  return MINDMAP_SHORTCUT_DEFINITIONS.reduce((shortcuts, { id, defaultShortcut }) => {
    shortcuts[id] = defaultShortcut ? { ...defaultShortcut } : null;
    return shortcuts;
  }, {} as MindMapShortcuts);
}

export function normalizeMindMapShortcuts(value: unknown, legacy?: unknown): MindMapShortcuts {
  const stored = isRecord(value) ? value : {};
  const defaults = createDefaultMindMapShortcuts();
  const normalized = { ...defaults };
  MINDMAP_SHORTCUT_DEFINITIONS.forEach(({ id }) => {
    if (!(id in stored)) return;
    normalized[id] = stored[id] === null ? null : normalizeShortcut(stored[id], defaults[id]);
  });

  if (!isRecord(value) && isRecord(legacy)) {
    (['addSiblingAfter', 'addSiblingBefore'] as MindMapShortcutId[]).forEach((id) => {
      if (legacy[id]) normalized[id] = normalizeLegacyShortcut(legacy[id], defaults[id]);
    });
  }
  return normalized;
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): MindMapShortcut | null {
  const shortcutKey = normalizeShortcutKey(event.key);
  if (!shortcutKey || modifierKeys.has(shortcutKey) || invalidKeys.has(shortcutKey) || event.isComposing) return null;
  return {
    key: shortcutKey,
    modKey: Platform.isMacOS ? event.metaKey : event.ctrlKey,
    shiftKey: event.shiftKey,
    ctrlKey: Platform.isMacOS ? event.ctrlKey : false,
    metaKey: Platform.isMacOS ? false : event.metaKey,
    altKey: event.altKey,
  };
}

export function matchesMindMapShortcut(shortcut: MindMapShortcut | null, event: KeyboardEvent): boolean {
  if (!shortcut) return false;
  const actual = shortcutFromKeyboardEvent(event);
  return Boolean(actual && shortcutsEqual(shortcut, actual));
}

export function formatMindMapShortcut(shortcut: MindMapShortcut | null): string {
  if (!shortcut) return '';
  const parts: string[] = [];
  if (shortcut.modKey) parts.push(Platform.isMacOS ? 'Cmd' : 'Ctrl');
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  const names: Record<string, string> = { ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑' };
  parts.push(names[shortcut.key] || (shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key));
  return parts.join(' + ');
}

export function findShortcutConflict(
  id: MindMapShortcutId,
  shortcut: MindMapShortcut | null,
  shortcuts: MindMapShortcuts,
): MindMapShortcutDefinition | null {
  if (!shortcut) return null;
  const definition = definitionById.get(id)!;
  return MINDMAP_SHORTCUT_DEFINITIONS.find((candidate) => candidate.id !== id
    && Boolean(shortcuts[candidate.id])
    && shortcutsEqual(shortcut, shortcuts[candidate.id]!)
    && candidate.contexts.some((context) => definition.contexts.includes(context))) || null;
}

export function getMindMapShortcutDefinition(id: MindMapShortcutId): MindMapShortcutDefinition {
  return definitionById.get(id)!;
}

function normalizeShortcut(value: unknown, fallback: MindMapShortcut | null): MindMapShortcut | null {
  if (!isRecord(value) || typeof value.key !== 'string') return fallback ? { ...fallback } : null;
  const shortcutKey = normalizeShortcutKey(value.key);
  if (!shortcutKey || modifierKeys.has(shortcutKey) || invalidKeys.has(shortcutKey)) return fallback ? { ...fallback } : null;
  return key(shortcutKey, {
    modKey: Boolean(value.modKey), shiftKey: Boolean(value.shiftKey), ctrlKey: Boolean(value.ctrlKey),
    metaKey: Boolean(value.metaKey), altKey: Boolean(value.altKey),
  });
}

function normalizeLegacyShortcut(value: unknown, fallback: MindMapShortcut | null): MindMapShortcut | null {
  if (!isRecord(value)) return fallback;
  return normalizeShortcut({ ...value, modKey: false }, fallback);
}

function normalizeShortcutKey(value: string): string {
  if (value === ' ') return 'Space';
  return value.length === 1 ? value.toLowerCase() : value;
}

function shortcutsEqual(left: MindMapShortcut, right: MindMapShortcut): boolean {
  return left.key === right.key && left.modKey === right.modKey && left.shiftKey === right.shiftKey
    && left.ctrlKey === right.ctrlKey && left.metaKey === right.metaKey && left.altKey === right.altKey;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object';
}
