import { App, Modal, setIcon } from 'obsidian';
import { t } from '../../lang/helpers';
import {
  createDefaultMindMapShortcuts,
  findShortcutConflict,
  formatMindMapShortcut,
  getMindMapShortcutDefinition,
  MINDMAP_SHORTCUT_DEFINITIONS,
  MindMapShortcutId,
  MindMapShortcuts,
  normalizeMindMapShortcuts,
  shortcutFromKeyboardEvent,
} from './MindMapShortcutCatalog';

export default class MindMapShortcutManagerModal extends Modal {
  private shortcuts: MindMapShortcuts;
  private query = '';
  private modifiedOnly = false;
  private recordingId: MindMapShortcutId | null = null;

  constructor(
    app: App,
    shortcuts: MindMapShortcuts,
    private onChange: (shortcuts: MindMapShortcuts) => Promise<void> | void,
  ) {
    super(app);
    this.shortcuts = normalizeMindMapShortcuts(shortcuts);
  }

  onOpen(): void {
    this.modalEl.addClass('mm-shortcut-manager-modal');
    this.render();
  }

  setShortcuts(shortcuts: MindMapShortcuts): void {
    this.shortcuts = normalizeMindMapShortcuts(shortcuts);
    if (this.contentEl.isConnected) this.render();
  }

  private render(): void {
    this.contentEl.empty();
    const header = this.contentEl.createDiv({ cls: 'mm-shortcut-manager-header' });
    header.createEl('h2', { text: t('Manage mindmap shortcuts') });
    header.createEl('p', {
      text: t('Mindmap shortcuts description'),
      cls: 'setting-item-description',
    });

    const toolbar = this.contentEl.createDiv({ cls: 'mm-shortcut-manager-toolbar' });
    const search = toolbar.createEl('input', {
      type: 'search',
      placeholder: t('Search shortcuts'),
      value: this.query,
    });
    search.addEventListener('input', () => {
      this.query = search.value;
      this.renderList();
    });
    const modifiedLabel = toolbar.createEl('label');
    const modifiedToggle = modifiedLabel.createEl('input', { type: 'checkbox' });
    modifiedToggle.checked = this.modifiedOnly;
    modifiedToggle.addEventListener('change', () => {
      this.modifiedOnly = modifiedToggle.checked;
      this.renderList();
    });
    modifiedLabel.appendText(t('Show modified shortcuts only'));
    const resetAll = toolbar.createEl('button', { text: t('Reset shortcut defaults') });
    resetAll.addEventListener('click', () => void this.save(createDefaultMindMapShortcuts()));
    this.contentEl.createDiv({ cls: 'mm-shortcut-manager-list' });
    this.renderList();
  }

  private renderList(): void {
    const list = this.contentEl.querySelector<HTMLElement>('.mm-shortcut-manager-list');
    if (!list) return;
    list.empty();
    const defaults = createDefaultMindMapShortcuts();
    const query = this.query.trim().toLocaleLowerCase();
    const definitions = MINDMAP_SHORTCUT_DEFINITIONS.filter((definition) => {
      const isModified = formatMindMapShortcut(this.shortcuts[definition.id])
        !== formatMindMapShortcut(defaults[definition.id]);
      if (this.modifiedOnly && !isModified) return false;
      return !query || `${t(definition.label as any)} ${t(definition.category as any)}`.toLocaleLowerCase().includes(query);
    });

    const categories = [...new Set(definitions.map((definition) => definition.category))];
    categories.forEach((category) => {
      const section = list.createDiv({ cls: 'mm-shortcut-manager-section' });
      const sectionHeader = section.createDiv({ cls: 'mm-shortcut-manager-section-header' });
      sectionHeader.createEl('h3', { text: t(category as any) });
      const reset = sectionHeader.createEl('button', { text: t('Reset shortcut defaults') });
      reset.addEventListener('click', () => {
        const next = { ...this.shortcuts };
        MINDMAP_SHORTCUT_DEFINITIONS.filter((definition) => definition.category === category)
          .forEach((definition) => next[definition.id] = defaults[definition.id]);
        void this.save(next);
      });
      definitions.filter((definition) => definition.category === category).forEach((definition) => {
        const row = section.createDiv({ cls: 'mm-shortcut-manager-row' });
        const text = row.createDiv();
        text.createDiv({ text: t(definition.label as any), cls: 'mm-shortcut-manager-label' });
        text.createDiv({ text: definition.contexts.map((context) => t(context as any)).join(' · '), cls: 'setting-item-description' });
        const controls = row.createDiv({ cls: 'mm-shortcut-manager-controls' });
        const binding = controls.createEl('button', {
          text: this.recordingId === definition.id
            ? t('Press a shortcut')
            : formatMindMapShortcut(this.shortcuts[definition.id]) || t('Shortcut not assigned'),
          attr: { 'data-shortcut-id': definition.id },
        });
        binding.toggleClass('is-recording', this.recordingId === definition.id);
        binding.addEventListener('click', () => {
          this.recordingId = definition.id;
          this.renderList();
          list.querySelector<HTMLButtonElement>(`[data-shortcut-id="${definition.id}"]`)?.focus();
        });
        binding.addEventListener('keydown', (event) => void this.record(definition.id, event));
        const clear = controls.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': t('Clear shortcut') } });
        setIcon(clear, 'x');
        clear.addEventListener('click', () => void this.save({ ...this.shortcuts, [definition.id]: null }));
        const resetOne = controls.createEl('button', { cls: 'clickable-icon', attr: { 'aria-label': t('Reset shortcut defaults') } });
        setIcon(resetOne, 'rotate-ccw');
        resetOne.addEventListener('click', () => void this.save({ ...this.shortcuts, [definition.id]: defaults[definition.id] }));
      });
    });

    if (!definitions.length) list.createDiv({ text: t('No matching shortcuts'), cls: 'setting-item-description' });
  }

  private async record(id: MindMapShortcutId, event: KeyboardEvent): Promise<void> {
    if (this.recordingId !== id) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      this.recordingId = null;
      this.renderList();
      return;
    }
    const shortcut = shortcutFromKeyboardEvent(event);
    if (!shortcut) return;
    const conflict = findShortcutConflict(id, shortcut, this.shortcuts);
    if (conflict) {
      const row = this.contentEl.querySelector(`[data-shortcut-id="${id}"]`)?.closest('.mm-shortcut-manager-row');
      row?.createDiv({
        text: `${t('Shortcut is already assigned')}: ${t(getMindMapShortcutDefinition(conflict.id).label as any)}`,
        cls: 'mm-shortcut-manager-error',
        attr: { role: 'alert' },
      });
      return;
    }
    await this.save({ ...this.shortcuts, [id]: shortcut });
  }

  private async save(shortcuts: MindMapShortcuts): Promise<void> {
    this.shortcuts = normalizeMindMapShortcuts(shortcuts);
    this.recordingId = null;
    await this.onChange(this.shortcuts);
    this.renderList();
  }
}
