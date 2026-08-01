import { App, Platform } from 'obsidian';

type PluginHotkey = {
  key?: string;
  modifiers?: string[];
};

export type PluginShortcut = {
  id: string;
  label: string;
  shortcuts: string[];
};

export function getPluginShortcutCatalog(app: App, pluginId: string): PluginShortcut[] {
  const internalApp = app as any;
  const commands = Object.values(internalApp.commands?.commands || {}) as Array<{
    id?: string;
    name?: string;
  }>;
  const hotkeyManager = internalApp.hotkeyManager as {
    getHotkeys?: (commandId: string) => PluginHotkey[] | null | undefined;
    getDefaultHotkeys?: (commandId: string) => PluginHotkey[] | null | undefined;
  } | undefined;
  if (!hotkeyManager?.getHotkeys || !hotkeyManager.getDefaultHotkeys) return [];

  const prefix = `${pluginId}:`;
  return commands
    .filter((command) => command.id?.startsWith(prefix))
    .map((command) => {
      const commandId = command.id!;
      const customHotkeys = hotkeyManager.getHotkeys!(commandId);
      const customized = customHotkeys !== null && customHotkeys !== undefined;
      const hotkeys = customized
        ? customHotkeys
        : hotkeyManager.getDefaultHotkeys!(commandId) || [];
      return {
        id: commandId.slice(prefix.length),
        label: command.name || commandId.slice(prefix.length),
        shortcuts: hotkeys.map(formatPluginHotkey),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function formatPluginHotkey(shortcut: PluginHotkey): string {
  const modifiers = (shortcut.modifiers || []).map((modifier) => {
    if (modifier === 'Mod') return Platform.isMacOS ? 'Cmd' : 'Ctrl';
    if (modifier === 'Meta') return 'Cmd';
    return modifier;
  });
  const key = shortcut.key || '';
  const parts = [...modifiers, key.length === 1 ? key.toUpperCase() : key];
  return parts.filter(Boolean).join(' + ');
}
