import { Platform, setIcon } from 'obsidian';
import { t } from '../../lang/helpers';
import {
  createDefaultNodeKeyboardShortcuts,
  formatNodeKeyboardShortcut,
  NodeKeyboardShortcut,
  NodeKeyboardShortcutId,
  NodeKeyboardShortcuts,
  normalizeNodeKeyboardShortcuts,
  shortcutFromKeyboardEvent,
  validateNodeKeyboardShortcut,
} from './NodeKeyboardShortcuts';
import type { PluginShortcut } from './PluginShortcutCatalog';

type MindMapShortcutInspectorOptions = {
  parentEl: HTMLElement;
  shortcuts: NodeKeyboardShortcuts;
  pluginShortcuts: () => PluginShortcut[];
  onChange: (shortcuts: NodeKeyboardShortcuts) => Promise<void> | void;
  onClose: () => void;
};

type FixedShortcut = {
  label: keyof typeof import('../../lang/locale/en').default;
  shortcut: NodeKeyboardShortcut;
};

const fixedShortcuts: FixedShortcut[] = [
  {
    label: 'Enter edit mode',
    shortcut: { key: 'Space', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false },
  },
  {
    label: 'Add child node',
    shortcut: { key: 'Tab', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false },
  },
  {
    label: 'Delete selected node',
    shortcut: { key: 'Backspace', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false },
  },
  {
    label: 'Finish editing',
    shortcut: { key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false },
  },
  {
    label: 'Insert line break',
    shortcut: { key: 'Enter', shiftKey: true, ctrlKey: false, metaKey: false, altKey: false },
  },
];

const clipboardAndHistoryShortcuts: FixedShortcut[] = [
  {
    label: 'Copy selected node',
    shortcut: { key: 'c', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false },
  },
  {
    label: 'Cut selected node',
    shortcut: { key: 'x', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false },
  },
  {
    label: 'Paste as child node',
    shortcut: { key: 'v', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false },
  },
];

const markdownFormattingShortcuts: FixedShortcut[] = [
  {
    label: 'Bold selected text',
    shortcut: { key: 'b', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false },
  },
  {
    label: 'Italicize selected text',
    shortcut: { key: 'i', shiftKey: false, ctrlKey: true, metaKey: false, altKey: false },
  },
  {
    label: 'Strike through selected text',
    shortcut: { key: 's', shiftKey: true, ctrlKey: true, metaKey: false, altKey: false },
  },
];

export default class MindMapShortcutInspector {
  private parentEl: HTMLElement;
  private shortcuts: NodeKeyboardShortcuts;
  private pluginShortcuts: () => PluginShortcut[];
  private onChange: (shortcuts: NodeKeyboardShortcuts) => Promise<void> | void;
  private onClose: () => void;
  private inspectorEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private recordingShortcutId: NodeKeyboardShortcutId | null = null;
  private validationError: string | null = null;
  private isSaving = false;

  constructor(options: MindMapShortcutInspectorOptions) {
    this.parentEl = options.parentEl;
    this.shortcuts = normalizeNodeKeyboardShortcuts(options.shortcuts);
    this.pluginShortcuts = options.pluginShortcuts;
    this.onChange = options.onChange;
    this.onClose = options.onClose;
  }

  open(): void {
    if (this.inspectorEl) return;

    const inspectorEl = this.parentEl.createDiv({
      cls: 'mm-mindmap-shortcut-inspector',
      attr: {
        role: 'complementary',
        'aria-label': t('Mindmap shortcuts'),
      },
    });
    this.inspectorEl = inspectorEl;

    const header = inspectorEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-header' });
    header.createEl('h3', { text: t('Mindmap shortcuts') });
    const closeButton = header.createEl('button', {
      cls: 'clickable-icon mm-mindmap-shortcut-inspector-close',
      attr: {
        type: 'button',
        'aria-label': t('Close mindmap shortcut inspector'),
      },
    });
    setIcon(closeButton, 'x');
    closeButton.addEventListener('click', () => this.onClose());

    inspectorEl.createEl('p', {
      text: t('Mindmap shortcuts description'),
      cls: 'setting-item-description mm-mindmap-shortcut-inspector-description',
    });
    this.contentEl = inspectorEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-content' });
    this.renderContent();
  }

  destroy(): void {
    this.inspectorEl?.remove();
    this.inspectorEl = null;
    this.contentEl = null;
    this.recordingShortcutId = null;
  }

  private renderContent(): void {
    const contentEl = this.contentEl;
    if (!contentEl) return;
    contentEl.empty();

    const customSection = contentEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-section' });
    const customHeader = customSection.createDiv({ cls: 'mm-mindmap-shortcut-inspector-section-header' });
    customHeader.createEl('h4', { text: t('Custom shortcuts') });
    const resetButton = customHeader.createEl('button', {
      text: t('Reset shortcut defaults'),
      cls: 'mm-mindmap-shortcut-inspector-reset',
      attr: { type: 'button' },
    });
    resetButton.disabled = this.isSaving;
    resetButton.addEventListener('click', () => {
      void this.saveShortcuts(createDefaultNodeKeyboardShortcuts());
    });
    this.createEditableShortcutCard(customSection, 'addSiblingAfter', t('Add sibling below'));
    this.createEditableShortcutCard(customSection, 'addSiblingBefore', t('Add sibling above'));

    if (this.validationError) {
      customSection.createDiv({
        text: t(this.validationError as keyof typeof import('../../lang/locale/en').default),
        cls: 'mm-mindmap-shortcut-inspector-error',
        attr: { role: 'alert' },
      });
    }

    this.createSection(contentEl, t('Other node shortcuts'), (section) => {
      fixedShortcuts.forEach(({ label, shortcut }) => {
        this.createFixedShortcutRow(section, t(label), formatPlatformShortcut(shortcut));
      });
      const numberChildNodes = this.pluginShortcuts()
        .find((shortcut) => shortcut.id === 'Number child nodes');
      this.createFixedShortcutRow(
        section,
        t('Number child nodes'),
        numberChildNodes?.shortcuts.length
          ? numberChildNodes.shortcuts.join(' / ')
          : t('Shortcut not assigned'),
      );
    });

    this.createSection(contentEl, t('Clipboard and history'), (section) => {
      clipboardAndHistoryShortcuts.forEach(({ label, shortcut }) => {
        this.createFixedShortcutRow(section, t(label), formatPlatformShortcut(shortcut));
      });
      const historyShortcuts = this.pluginShortcuts();
      ['Undo', 'Redo'].forEach((id) => {
        const command = historyShortcuts.find((shortcut) => shortcut.id === id);
        if (!command) return;
        this.createFixedShortcutRow(
          section,
          t(id as 'Undo' | 'Redo'),
          command.shortcuts.length ? command.shortcuts.join(' / ') : t('Shortcut not assigned'),
        );
      });
    });

    this.createSection(contentEl, t('Markdown formatting'), (section) => {
      markdownFormattingShortcuts.forEach(({ label, shortcut }) => {
        this.createFixedShortcutRow(section, t(label), formatPlatformShortcut(shortcut));
      });
    });

    if (this.recordingShortcutId) {
      const button = contentEl.querySelector<HTMLButtonElement>(
        `[data-shortcut-id="${this.recordingShortcutId}"]`,
      );
      button?.focus();
    }
  }

  private createSection(
    parentEl: HTMLElement,
    title: string,
    content: (section: HTMLElement) => void,
  ): void {
    const section = parentEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-section' });
    section.createEl('h4', { text: title });
    content(section);
  }

  private createEditableShortcutCard(
    parentEl: HTMLElement,
    id: NodeKeyboardShortcutId,
    label: string,
  ): void {
    const card = parentEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-card' });
    card.createDiv({ text: label, cls: 'mm-mindmap-shortcut-inspector-card-label' });
    const isRecording = this.recordingShortcutId === id;
    const button = card.createEl('button', {
      text: isRecording ? t('Press a shortcut') : formatNodeKeyboardShortcut(this.shortcuts[id]),
      cls: 'mm-mindmap-shortcut-inspector-binding mm-mindmap-shortcut-inspector-card-binding',
      attr: {
        type: 'button',
        'data-shortcut-id': id,
        'aria-label': isRecording ? t('Press a shortcut') : `${label}: ${formatNodeKeyboardShortcut(this.shortcuts[id])}`,
      },
    });
    button.classList.toggle('is-recording', isRecording);
    button.disabled = this.isSaving;
    button.addEventListener('click', () => this.startRecording(id));
    button.addEventListener('keydown', (event) => {
      if (this.recordingShortcutId !== id) return;
      void this.recordShortcut(id, event);
    });
  }

  private createFixedShortcutRow(parentEl: HTMLElement, label: string, shortcut: string): void {
    const row = parentEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-row is-fixed' });
    row.createSpan({ text: label, cls: 'mm-mindmap-shortcut-inspector-label' });
    row.createSpan({ text: shortcut, cls: 'mm-mindmap-shortcut-inspector-fixed-binding' });
  }

  private startRecording(id: NodeKeyboardShortcutId): void {
    if (this.isSaving) return;
    this.recordingShortcutId = id;
    this.validationError = null;
    this.renderContent();
  }

  private async recordShortcut(id: NodeKeyboardShortcutId, event: KeyboardEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      this.recordingShortcutId = null;
      this.validationError = null;
      this.renderContent();
      return;
    }

    const shortcut = shortcutFromKeyboardEvent(event);
    const validationError = validateNodeKeyboardShortcut(id, shortcut, this.shortcuts);
    if (validationError || !shortcut) {
      this.validationError = validationError || 'Shortcut must include a non-modifier key';
      this.renderContent();
      return;
    }

    await this.saveShortcuts({
      ...this.shortcuts,
      [id]: shortcut,
    });
  }

  private async saveShortcuts(shortcuts: NodeKeyboardShortcuts): Promise<void> {
    if (this.isSaving) return;
    this.isSaving = true;
    this.validationError = null;
    this.renderContent();

    try {
      const normalizedShortcuts = normalizeNodeKeyboardShortcuts(shortcuts);
      await this.onChange(normalizedShortcuts);
      this.shortcuts = normalizedShortcuts;
      this.recordingShortcutId = null;
    } catch (error) {
      console.error('Unable to save mindmap shortcuts', error);
      this.validationError = 'Shortcut settings could not be saved';
    } finally {
      this.isSaving = false;
      this.renderContent();
    }
  }
}

function formatPlatformShortcut(shortcut: NodeKeyboardShortcut): string {
  const platformShortcut: NodeKeyboardShortcut = {
    ...shortcut,
    ctrlKey: Platform.isMacOS ? false : shortcut.ctrlKey,
    metaKey: Platform.isMacOS ? shortcut.ctrlKey : shortcut.metaKey,
  };
  return formatNodeKeyboardShortcut(platformShortcut);
}
