import { setIcon } from 'obsidian';
import { t } from '../../lang/helpers';
import { findShortcutConflict, formatMindMapShortcut, MINDMAP_SHORTCUT_DEFINITIONS, MindMapShortcutId, MindMapShortcuts, normalizeMindMapShortcuts, shortcutFromKeyboardEvent } from './MindMapShortcutCatalog';

type Options = {
  parentEl: HTMLElement;
  shortcuts: MindMapShortcuts;
  onChange: (shortcuts: MindMapShortcuts) => Promise<void> | void;
  onManageAll: () => void;
  onClose: () => void;
};

export default class MindMapShortcutInspector {
  private shortcuts: MindMapShortcuts;
  private inspectorEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private recordingId: MindMapShortcutId | null = null;
  private error: string | null = null;

  constructor(private options: Options) {
    this.shortcuts = normalizeMindMapShortcuts(options.shortcuts);
  }

  open(): void {
    if (this.inspectorEl) return;
    this.inspectorEl = this.options.parentEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector' });
    const header = this.inspectorEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-header' });
    header.createEl('h3', { text: t('Mindmap shortcuts') });
    const close = header.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': t('Close mindmap shortcut inspector') } });
    setIcon(close, 'x');
    close.addEventListener('click', this.options.onClose);
    this.inspectorEl.createEl('p', { text: t('Mindmap shortcuts description'), cls: 'setting-item-description' });
    const manage = this.inspectorEl.createEl('button', { text: t('Manage all shortcuts'), cls: 'mod-cta mm-shortcut-manage-all' });
    manage.addEventListener('click', this.options.onManageAll);
    this.contentEl = this.inspectorEl.createDiv({ cls: 'mm-mindmap-shortcut-inspector-content' });
    this.render();
  }

  setShortcuts(shortcuts: MindMapShortcuts): void {
    this.shortcuts = normalizeMindMapShortcuts(shortcuts);
    this.render();
  }

  destroy(): void {
    this.inspectorEl?.remove();
    this.inspectorEl = null;
    this.contentEl = null;
  }

  private render(): void {
    if (!this.contentEl) return;
    this.contentEl.empty();
    const definitions = MINDMAP_SHORTCUT_DEFINITIONS.filter((definition) => definition.highFrequency);
    [...new Set(definitions.map((definition) => definition.category))].forEach((category) => {
      const section = this.contentEl!.createDiv({ cls: 'mm-mindmap-shortcut-inspector-section' });
      section.createEl('h4', { text: t(category as any) });
      definitions.filter((definition) => definition.category === category).forEach((definition) => {
        const row = section.createDiv({ cls: 'mm-mindmap-shortcut-inspector-row' });
        row.createSpan({ text: t(definition.label as any), cls: 'mm-mindmap-shortcut-inspector-label' });
        const binding = row.createEl('button', {
          text: this.recordingId === definition.id ? t('Press a shortcut') : formatMindMapShortcut(this.shortcuts[definition.id]) || t('Shortcut not assigned'),
          cls: 'mm-mindmap-shortcut-inspector-binding',
          attr: { 'data-shortcut-id': definition.id },
        });
        binding.addEventListener('click', () => {
          this.recordingId = definition.id;
          this.error = null;
          this.render();
          this.contentEl?.querySelector<HTMLButtonElement>(`[data-shortcut-id="${definition.id}"]`)?.focus();
        });
        binding.addEventListener('keydown', (event) => void this.record(definition.id, event));
      });
    });
    if (this.error) this.contentEl.createDiv({ text: this.error, cls: 'mm-mindmap-shortcut-inspector-error' });
  }

  private async record(id: MindMapShortcutId, event: KeyboardEvent): Promise<void> {
    if (this.recordingId !== id) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      this.recordingId = null;
      this.render();
      return;
    }
    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) return;
    const conflict = findShortcutConflict(id, shortcut, this.shortcuts);
    if (conflict) {
      this.error = `${t('Shortcut is already assigned')}: ${t(conflict.label as any)}`;
      this.render();
      return;
    }
    this.shortcuts = { ...this.shortcuts, [id]: shortcut };
    this.recordingId = null;
    this.error = null;
    await this.options.onChange(this.shortcuts);
    this.render();
  }
}
