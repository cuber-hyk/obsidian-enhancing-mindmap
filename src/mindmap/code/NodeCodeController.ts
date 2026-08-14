import { App, Component, Modal, Notice, setIcon, setTooltip } from 'obsidian';
import { t } from '../../lang/helpers';
import NodeCodeEditorModal, { NodeCodeEditorValue } from './NodeCodeEditorModal';
import {
  createNodeCodeMarkdown,
  NodeCodeBlock,
  NodeCodeSize,
  normalizeNodeCodeSize,
} from './NodeCodeMarkdown';
import { normalizeNodeCodeFontSize } from './NodeCodeSettings';
import { createHighlightedCodePre } from './NodeCodeRenderer';

interface NodeCodeControllerOptions {
  app: App;
  component: Component;
  contentEl: HTMLElement;
  getSourcePath: () => string;
  getFontSize: () => number | undefined;
  getScale: () => number;
  onEditChange: () => void;
  onEditDelete: () => void;
  onSelectEditCode: () => void;
  onLayoutChange: () => void;
}

interface NodeCodeResizeState {
  pointerId: number;
  card: HTMLElement;
  handle: HTMLElement;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  initialSize?: NodeCodeSize;
  moved: boolean;
}

export default class NodeCodeController {
  private options: NodeCodeControllerOptions;
  private selectedEditEl: HTMLElement | null = null;
  private previewCards: HTMLElement[] = [];
  private resizeState: NodeCodeResizeState | null = null;
  private layoutFrame: number | null = null;
  private highlightVersions = new WeakMap<HTMLElement, number>();

  constructor(options: NodeCodeControllerOptions) {
    this.options = options;
    this.options.contentEl.addEventListener('pointerdown', this.handleContentPointerDown);
  }

  destroy(): void {
    this.finishResize(false);
    if (this.layoutFrame !== null) cancelAnimationFrame(this.layoutFrame);
    this.clearPreview();
    this.clearEditSelection();
    this.options.contentEl.removeEventListener('pointerdown', this.handleContentPointerDown);
  }

  attachPreview(blocks: NodeCodeBlock[]): void {
    this.clearPreview();
    const renderedBlocks = Array.from(this.options.contentEl.querySelectorAll('pre'));
    renderedBlocks.slice(0, blocks.length).forEach((pre, index) => {
      if (!(pre instanceof HTMLElement) || pre.closest('.mm-node-code-card')) return;
      pre.querySelectorAll('.copy-code-button').forEach((button) => button.remove());
      const card = this.options.contentEl.ownerDocument.createElement('div');
      card.classList.add('mm-node-code-card');
      pre.before(card);
      card.appendChild(pre);
      this.decorateCard(card, pre, blocks[index]);
      this.applyCardSize(card, blocks[index].size);
      this.previewCards.push(card);
    });
  }

  clearPreview(): void {
    this.previewCards.forEach((card) => {
      const pre = card.querySelector(':scope > pre');
      if (pre && card.parentElement) {
        card.before(pre);
        card.remove();
      }
    });
    this.previewCards = [];
  }

  createEditable(block: NodeCodeBlock): HTMLElement {
    const card = this.options.contentEl.ownerDocument.createElement('div');
    card.classList.add('mm-node-code-card', 'mm-node-code-attachment');
    card.setAttribute('contenteditable', 'false');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', t('Node code block'));
    this.writeEditableData(card, {language: block.language, code: block.code}, block.markdown);

    const pre = card.createEl('pre');
    const code = pre.createEl('code');
    this.renderEditableCode(code, block.language, block.code);
    this.decorateCard(card, pre, block, {
      onEdit: () => this.openEditAttachment(card),
    });
    this.applyCardSize(card, block.size);
    this.attachResizeHandle(card);
    card.addEventListener('click', (event) => {
      event.stopPropagation();
      this.selectEditCode(card);
    });
    card.addEventListener('dblclick', (event) => {
      if (event.target instanceof Element && event.target.closest('.mm-node-code-resize-handle')) return;
      event.preventDefault();
      event.stopPropagation();
      this.selectEditCode(card);
      this.openEditAttachment(card);
    });
    return card;
  }

  readEditable(card: HTMLElement): NodeCodeEditorValue | null {
    if (!card.classList.contains('mm-node-code-attachment')) return null;
    const code = card.dataset.codeValue;
    if (code === undefined) return null;
    return {
      language: card.dataset.codeLanguage || '',
      code,
    };
  }

  serializeEditable(card: HTMLElement): string | null {
    const value = this.readEditable(card);
    if (!value) return null;
    if (card.dataset.codeDirty !== 'true' && card.dataset.codeMarkdown !== undefined) {
      return card.dataset.codeMarkdown;
    }
    return createNodeCodeMarkdown(value.language, value.code, this.readCardSize(card));
  }

  clearEditSelection(): void {
    this.selectedEditEl?.classList.remove('is-selected');
    this.options.contentEl.classList.remove('mm-node-code-selected');
    this.selectedEditEl = null;
  }

  deleteEditCodeByKeyboard(): boolean {
    const card = this.selectedEditEl;
    if (!card || !this.options.contentEl.contains(card)) return false;
    this.deleteEditAttachment(card);
    return true;
  }

  refreshOverflowActions(): void {
    requestAnimationFrame(() => {
      if (!this.options.contentEl.isConnected) return;
      this.options.contentEl.querySelectorAll<HTMLElement>('.mm-node-code-card').forEach((card) => {
        this.updateExpandVisibility(card);
      });
    });
  }

  private handleContentPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (target instanceof Element && !target.closest('.mm-node-code-attachment')) {
      this.clearEditSelection();
    }
  };

  private attachResizeHandle(card: HTMLElement): void {
    const handle = card.ownerDocument.createElement('button');
    handle.type = 'button';
    handle.classList.add('mm-node-code-resize-handle');
    handle.setAttribute('aria-label', t('Resize code block'));
    setTooltip(handle, t('Resize code block hint'));
    handle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    handle.addEventListener('dblclick', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.resetCardSize(card);
    });
    handle.addEventListener('keydown', (event) => this.handleResizeKeydown(event, card));
    handle.addEventListener('pointerdown', (event) => this.startResize(event, card, handle));
    handle.addEventListener('pointermove', this.moveResize);
    handle.addEventListener('pointerup', this.commitResize);
    handle.addEventListener('pointercancel', this.cancelResize);
    card.appendChild(handle);
  }

  private startResize(event: PointerEvent, card: HTMLElement, handle: HTMLElement): void {
    if (event.button !== 0 || this.resizeState) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectEditCode(card);
    const pre = card.querySelector(':scope > pre');
    if (!(pre instanceof HTMLElement)) return;
    this.resizeState = {
      pointerId: event.pointerId,
      card,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: card.offsetWidth,
      startHeight: pre.offsetHeight,
      initialSize: this.readCardSize(card),
      moved: false,
    };
    card.classList.add('is-resizing');
    handle.setPointerCapture?.(event.pointerId);
  }

  private moveResize = (event: PointerEvent): void => {
    const state = this.resizeState;
    if (!state || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const scale = Math.max(0.01, this.options.getScale());
    const size = normalizeNodeCodeSize({
      width: state.startWidth + (event.clientX - state.startX) / scale,
      height: state.startHeight + (event.clientY - state.startY) / scale,
    });
    if (!size) return;
    const moved = Math.abs(event.clientX - state.startX) > 1
      || Math.abs(event.clientY - state.startY) > 1;
    if (!moved) return;
    state.moved = true;
    this.applyCardSize(state.card, size);
    this.requestLayout();
  };

  private commitResize = (event: PointerEvent): void => {
    if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.finishResize(true);
  };

  private cancelResize = (event: PointerEvent): void => {
    if (!this.resizeState || event.pointerId !== this.resizeState.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.finishResize(false);
  };

  private finishResize(commit: boolean): void {
    const state = this.resizeState;
    if (!state) return;
    this.resizeState = null;
    state.card.classList.remove('is-resizing');
    if (state.handle.hasPointerCapture?.(state.pointerId)) {
      state.handle.releasePointerCapture?.(state.pointerId);
    }
    if (!commit) {
      this.applyCardSize(state.card, state.initialSize);
    } else if (state.moved) {
      state.card.dataset.codeDirty = 'true';
      this.options.onEditChange();
    }
    this.requestLayout();
  }

  private handleResizeKeydown(event: KeyboardEvent, card: HTMLElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      this.resetCardSize(card);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const pre = card.querySelector(':scope > pre');
    if (!(pre instanceof HTMLElement)) return;
    const current = this.readCardSize(card) || {
      width: card.offsetWidth,
      height: pre.offsetHeight,
    };
    const step = event.shiftKey ? 5 : 20;
    const size = normalizeNodeCodeSize({
      width: current.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
      height: current.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0),
    });
    if (!size) return;
    this.applyCardSize(card, size);
    card.dataset.codeDirty = 'true';
    this.options.onEditChange();
  }

  private resetCardSize(card: HTMLElement): void {
    if (!this.readCardSize(card)) return;
    this.applyCardSize(card, undefined);
    card.dataset.codeDirty = 'true';
    this.options.onEditChange();
  }

  private readCardSize(card: HTMLElement): NodeCodeSize | undefined {
    return normalizeNodeCodeSize({
      width: Number(card.dataset.codeWidth),
      height: Number(card.dataset.codeHeight),
    });
  }

  private applyCardSize(card: HTMLElement, size?: NodeCodeSize): void {
    const normalized = normalizeNodeCodeSize(size);
    card.classList.toggle('has-custom-size', Boolean(normalized));
    if (!normalized) {
      delete card.dataset.codeWidth;
      delete card.dataset.codeHeight;
      card.style.removeProperty('--mm-code-card-width');
      card.style.removeProperty('--mm-code-card-height');
      return;
    }
    card.dataset.codeWidth = `${normalized.width}`;
    card.dataset.codeHeight = `${normalized.height}`;
    card.style.setProperty('--mm-code-card-width', `${normalized.width}px`);
    card.style.setProperty('--mm-code-card-height', `${normalized.height}px`);
  }

  private requestLayout(): void {
    if (this.layoutFrame !== null) return;
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = null;
      this.options.contentEl.querySelectorAll<HTMLElement>('.mm-node-code-card').forEach((card) => {
        this.updateExpandVisibility(card);
      });
      this.options.onLayoutChange();
    });
  }

  private decorateCard(
    card: HTMLElement,
    pre: HTMLElement,
    block: Pick<NodeCodeBlock, 'language' | 'code'>,
    actions?: {onEdit: () => void},
  ): void {
    const header = card.ownerDocument.createElement('div');
    header.classList.add('mm-node-code-header');
    const language = header.createEl('span', {
      cls: 'mm-node-code-language',
      text: block.language || t('Plain text'),
    });
    language.setAttribute('aria-hidden', 'true');
    const controls = header.createDiv({cls: 'mm-node-code-controls'});
    controls.setAttribute('role', 'toolbar');
    controls.setAttribute('aria-label', t('Code block controls'));
    const copy = this.createIconButton(controls, 'copy', t('Copy code'), () => {
      const value = this.readEditable(card) || block;
      void this.copyCode(value.code, copy);
    });
    const expand = this.createIconButton(controls, 'expand', t('Expand code'), () => {
      const value = this.readEditable(card) || block;
      new NodeCodeExpandedModal(
        this.options.app,
        value.language,
        value.code,
        this.options.getSourcePath(),
        this.options.getFontSize(),
      ).open();
    });
    expand.classList.add('mm-node-code-expand');
    expand.hidden = true;
    if (actions) {
      this.createIconButton(controls, 'pencil', t('Edit code block'), actions.onEdit);
    }
    card.prepend(header);

    requestAnimationFrame(() => {
      if (!card.isConnected) return;
      this.updateExpandVisibility(card);
      this.options.onLayoutChange();
    });
  }

  private updateExpandVisibility(card: HTMLElement): void {
    const pre = card.querySelector(':scope > pre');
    const expand = card.querySelector('.mm-node-code-expand');
    if (!(pre instanceof HTMLElement) || !(expand instanceof HTMLButtonElement)) return;
    expand.hidden = !(pre.scrollHeight > pre.clientHeight + 1 || pre.scrollWidth > pre.clientWidth + 1);
  }

  private createIconButton(
    parent: HTMLElement,
    icon: string,
    label: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = parent.ownerDocument.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    setIcon(button, icon);
    setTooltip(button, label);
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    parent.appendChild(button);
    return button;
  }

  private async copyCode(code: string, button: HTMLButtonElement): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setIcon(button, 'check');
      button.setAttribute('aria-label', t('Code copied'));
      setTimeout(() => {
        if (!button.isConnected) return;
        setIcon(button, 'copy');
        button.setAttribute('aria-label', t('Copy code'));
      }, 1200);
    } catch (error) {
      new Notice(t('Failed to copy code'));
    }
  }

  private openEditAttachment(card: HTMLElement): void {
    const value = this.readEditable(card);
    if (!value) return;
    new NodeCodeEditorModal(this.options.app, {
      value,
      fontSize: this.options.getFontSize(),
      sourcePath: this.options.getSourcePath(),
      onSubmit: (nextValue) => {
        if (!this.options.contentEl.contains(card)) return;
        this.writeEditableData(card, nextValue);
        card.dataset.codeDirty = 'true';
        const code = card.querySelector('code');
        if (code instanceof HTMLElement) {
          this.renderEditableCode(code, nextValue.language, nextValue.code);
        }
        const language = card.querySelector('.mm-node-code-language');
        if (language instanceof HTMLElement) language.innerText = nextValue.language || t('Plain text');
        this.options.onEditChange();
        this.refreshOverflowActions();
        this.selectEditCode(card);
      },
      onDelete: () => {
        if (this.options.contentEl.contains(card)) this.deleteEditAttachment(card);
      },
      onCancel: () => {
        if (card.isConnected) this.selectEditCode(card);
      },
    }).open();
  }

  private deleteEditAttachment(card: HTMLElement): void {
    if (this.selectedEditEl === card) this.clearEditSelection();
    card.remove();
    this.options.onEditDelete();
  }

  private selectEditCode(card: HTMLElement): void {
    this.clearEditSelection();
    this.options.onSelectEditCode();
    this.selectedEditEl = card;
    card.classList.add('is-selected');
    this.options.contentEl.classList.add('mm-node-code-selected');
    card.focus();
  }

  private writeEditableData(
    card: HTMLElement,
    value: NodeCodeEditorValue,
    originalMarkdown?: string,
  ): void {
    card.dataset.codeLanguage = value.language;
    card.dataset.codeValue = value.code;
    if (originalMarkdown !== undefined) card.dataset.codeMarkdown = originalMarkdown;
  }

  private renderEditableCode(codeEl: HTMLElement, language: string, code: string): void {
    codeEl.className = language ? `language-${language}` : '';
    codeEl.textContent = code;
    const version = (this.highlightVersions.get(codeEl) || 0) + 1;
    this.highlightVersions.set(codeEl, version);
    void createHighlightedCodePre(
      codeEl.ownerDocument,
      language,
      code,
      this.options.getSourcePath(),
      this.options.component,
    ).then((renderedPre) => {
      if (!codeEl.isConnected || this.highlightVersions.get(codeEl) !== version) return;
      const renderedCode = renderedPre.querySelector('code');
      if (!(renderedCode instanceof HTMLElement)) return;
      codeEl.className = renderedCode.className;
      codeEl.replaceChildren(...Array.from(renderedCode.childNodes));
      this.refreshOverflowActions();
      this.options.onLayoutChange();
    }).catch((error) => {
      console.error('Failed to highlight node code block', error);
    });
  }
}

class NodeCodeExpandedModal extends Modal {
  private language: string;
  private code: string;
  private sourcePath: string;
  private fontSize?: number;
  private renderComponent: Component | null = null;

  constructor(app: App, language: string, code: string, sourcePath: string, fontSize?: number) {
    super(app);
    this.shouldRestoreSelection = false;
    this.language = language;
    this.code = code;
    this.sourcePath = sourcePath;
    this.fontSize = fontSize;
  }

  async onOpen(): Promise<void> {
    this.setTitle(this.language ? `${t('Code preview')} · ${this.language}` : t('Code preview'));
    this.modalEl.classList.add('mm-node-code-expanded-modal');
    this.modalEl.style.setProperty(
      '--mm-code-font-size',
      `${normalizeNodeCodeFontSize(this.fontSize)}px`,
    );
    const component = new Component();
    component.load();
    this.renderComponent = component;
    try {
      const pre = await createHighlightedCodePre(
        this.contentEl.ownerDocument,
        this.language,
        this.code,
        this.sourcePath,
        component,
      );
      if (this.contentEl.isConnected && this.renderComponent === component) {
        this.contentEl.appendChild(pre);
      }
    } catch (error) {
      component.unload();
      if (this.renderComponent === component) this.renderComponent = null;
      console.error('Failed to render expanded node code block', error);
    }
  }

  onClose(): void {
    this.renderComponent?.unload();
    this.renderComponent = null;
    this.contentEl.empty();
  }
}
