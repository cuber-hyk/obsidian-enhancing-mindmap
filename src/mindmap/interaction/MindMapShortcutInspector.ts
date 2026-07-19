import { setIcon } from 'obsidian';
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

type MindMapShortcutInspectorOptions = {
  parentEl: HTMLElement;
  shortcuts: NodeKeyboardShortcuts;
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

export default class MindMapShortcutInspector {
  private parentEl: HTMLElement;
  private shortcuts: NodeKeyboardShortcuts;
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
        this.createFixedShortcutRow(section, t(label), formatNodeKeyboardShortcut(shortcut));
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
