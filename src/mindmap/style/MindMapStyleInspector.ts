import { setIcon } from 'obsidian';
import { t } from '../../lang/helpers';
import {
  MindMapStyleTemplate,
  MINDMAP_STYLE_TEMPLATES,
} from './MindMapStyle';

type MindMapStyleTemplateSelectHandler = (
  template: MindMapStyleTemplate,
) => Promise<void> | void;

type MindMapStyleInspectorOptions = {
  parentEl: HTMLElement;
  currentTemplateId: string;
  onPreviewTemplate: (template: MindMapStyleTemplate) => void;
  onRestorePreview: () => void;
  onSelectTemplate: MindMapStyleTemplateSelectHandler;
  onClose: () => void;
};

export default class MindMapStyleInspector {
  private parentEl: HTMLElement;
  private savedTemplateId: string;
  private previewTemplateId: string | null = null;
  private onPreviewTemplate: (template: MindMapStyleTemplate) => void;
  private onRestorePreview: () => void;
  private onSelectTemplate: MindMapStyleTemplateSelectHandler;
  private onClose: () => void;
  private inspectorEl: HTMLElement | null = null;
  private cards = new Map<string, HTMLButtonElement>();
  private isSelecting = false;

  constructor(options: MindMapStyleInspectorOptions) {
    this.parentEl = options.parentEl;
    this.savedTemplateId = options.currentTemplateId;
    this.onPreviewTemplate = options.onPreviewTemplate;
    this.onRestorePreview = options.onRestorePreview;
    this.onSelectTemplate = options.onSelectTemplate;
    this.onClose = options.onClose;
  }

  open(): void {
    if (this.inspectorEl) return;

    const inspectorEl = this.parentEl.createDiv({
      cls: 'mm-mindmap-style-inspector',
      attr: {
        role: 'complementary',
        'aria-label': t('Mindmap styles'),
      },
    });
    this.inspectorEl = inspectorEl;

    const header = inspectorEl.createDiv({ cls: 'mm-mindmap-style-inspector-header' });
    header.createEl('h3', { text: t('Mindmap styles') });
    const closeButton = header.createEl('button', {
      cls: 'clickable-icon mm-mindmap-style-inspector-close',
      attr: {
        type: 'button',
        'aria-label': t('Close mindmap style inspector'),
      },
    });
    setIcon(closeButton, 'x');
    closeButton.addEventListener('click', () => this.onClose());

    inspectorEl.createEl('p', {
      text: t('Choose mindmap style'),
      cls: 'setting-item-description mm-mindmap-style-inspector-description',
    });

    const cardsEl = inspectorEl.createDiv({ cls: 'mm-mindmap-style-inspector-cards' });
    MINDMAP_STYLE_TEMPLATES.forEach((template) => {
      const card = this.createTemplateCard(cardsEl, template);
      this.cards.set(template.id, card);
    });
    cardsEl.addEventListener('pointerleave', () => this.restorePreview());
    cardsEl.addEventListener('focusout', (event) => {
      if (!cardsEl.contains(event.relatedTarget as Node)) this.restorePreview();
    });
    this.refreshSelection();
  }

  destroy(): void {
    this.restorePreview();
    this.inspectorEl?.remove();
    this.inspectorEl = null;
    this.cards.clear();
  }

  private createTemplateCard(
    parent: HTMLElement,
    template: MindMapStyleTemplate,
  ): HTMLButtonElement {
    const label = t(template.labelKey);
    const card = parent.createEl('button', {
      cls: 'mm-mindmap-style-inspector-card',
      attr: {
        type: 'button',
        'aria-label': label,
      },
    });

    const preview = card.createDiv({ cls: 'mm-mindmap-style-inspector-preview' });
    preview.setAttribute('aria-hidden', 'true');
    preview.style.background = template.canvas.background;

    const root = preview.createDiv({ cls: 'mm-mindmap-style-inspector-root' });
    root.style.background = template.root.background;
    root.style.borderColor = template.root.borderColor;
    root.style.borderRadius = template.root.borderRadius;

    const branches = preview.createDiv({ cls: 'mm-mindmap-style-inspector-branches' });
    template.branchPalette.slice(0, 3).forEach((color) => {
      const branch = branches.createDiv({ cls: 'mm-mindmap-style-inspector-branch' });
      const line = branch.createDiv({ cls: 'mm-mindmap-style-inspector-branch-line' });
      line.style.background = color;
      line.style.height = `${template.branch.lineWidth}px`;

      const node = branch.createDiv({ cls: 'mm-mindmap-style-inspector-node' });
      node.style.background = template.primaryNode.background;
      node.style.borderColor = template.primaryNode.borderColor;
      node.style.borderRadius = template.primaryNode.borderRadius;
    });

    const palette = preview.createDiv({ cls: 'mm-mindmap-style-inspector-palette' });
    template.branchPalette.forEach((color) => {
      const swatch = palette.createDiv({ cls: 'mm-mindmap-style-inspector-swatch' });
      swatch.style.background = color;
    });

    card.createDiv({
      text: label,
      cls: 'mm-mindmap-style-inspector-label',
    });
    card.addEventListener('click', () => {
      void this.selectTemplate(template);
    });
    card.addEventListener('pointerenter', () => this.previewTemplate(template));
    card.addEventListener('focus', () => this.previewTemplate(template));

    return card;
  }

  private refreshSelection(): void {
    this.cards.forEach((card, templateId) => {
      const isSelected = templateId === this.savedTemplateId;
      card.classList.toggle('is-selected', isSelected);
      card.classList.toggle('is-previewing', templateId === this.previewTemplateId);
      card.setAttribute('aria-pressed', String(isSelected));
    });
  }

  private previewTemplate(template: MindMapStyleTemplate): void {
    if (this.isSelecting || template.id === this.previewTemplateId) return;

    this.previewTemplateId = template.id;
    this.onPreviewTemplate(template);
    this.refreshSelection();
  }

  private restorePreview(): void {
    if (this.previewTemplateId == null) return;

    this.previewTemplateId = null;
    this.onRestorePreview();
    this.refreshSelection();
  }

  private async selectTemplate(template: MindMapStyleTemplate): Promise<void> {
    if (this.isSelecting) return;

    this.isSelecting = true;
    this.cards.forEach((card) => {
      card.disabled = true;
    });

    try {
      await this.onSelectTemplate(template);
      this.savedTemplateId = template.id;
      this.previewTemplateId = null;
      this.refreshSelection();
    } catch (error) {
      console.error('Unable to apply mind map style template', error);
    } finally {
      this.isSelecting = false;
      this.cards.forEach((card) => {
        card.disabled = false;
      });
    }
  }
}
