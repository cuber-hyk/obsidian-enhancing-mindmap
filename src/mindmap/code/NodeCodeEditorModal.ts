import { App, Component, Modal, Notice } from 'obsidian';
import { t } from '../../lang/helpers';
import { normalizeNodeCodeLanguage } from './NodeCodeMarkdown';
import { normalizeNodeCodeFontSize } from './NodeCodeSettings';
import { createHighlightedCodePre } from './NodeCodeRenderer';

export interface NodeCodeEditorValue {
  language: string;
  code: string;
}

interface NodeCodeEditorModalOptions {
  value?: NodeCodeEditorValue;
  fontSize?: number;
  sourcePath?: string;
  onSubmit: (value: NodeCodeEditorValue) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

const COMMON_CODE_LANGUAGES = [
  'text',
  'python',
  'javascript',
  'typescript',
  'java',
  'c',
  'cpp',
  'csharp',
  'go',
  'rust',
  'shell',
  'powershell',
  'sql',
  'json',
  'yaml',
  'html',
  'css',
  'markdown',
];

export default class NodeCodeEditorModal extends Modal {
  private options: NodeCodeEditorModalOptions;
  private languageInput!: HTMLInputElement;
  private codeInput!: HTMLTextAreaElement;
  private previewEl!: HTMLElement;
  private previewTimer: number | null = null;
  private previewVersion = 0;
  private previewComponent: Component | null = null;
  private composing = false;
  private settled = false;

  constructor(app: App, options: NodeCodeEditorModalOptions) {
    super(app);
    this.shouldRestoreSelection = false;
    this.options = options;
  }

  onOpen(): void {
    this.setTitle(this.options.value ? t('Edit code block') : t('Insert code block'));
    this.modalEl.classList.add('mm-node-code-editor-modal');
    this.modalEl.style.setProperty(
      '--mm-code-font-size',
      `${normalizeNodeCodeFontSize(this.options.fontSize)}px`,
    );

    const languageField = this.contentEl.createDiv({cls: 'mm-node-code-editor-field'});
    languageField.createEl('label', {text: t('Code language')});
    this.languageInput = languageField.createEl('input', {
      type: 'text',
      value: this.options.value?.language || '',
      attr: {
        placeholder: t('Plain text'),
        autocomplete: 'off',
        list: 'mm-node-code-language-list',
      },
    });
    const languageList = languageField.createEl('datalist', {attr: {id: 'mm-node-code-language-list'}});
    COMMON_CODE_LANGUAGES.forEach((language) => languageList.createEl('option', {value: language}));

    const codeField = this.contentEl.createDiv({cls: 'mm-node-code-editor-field'});
    codeField.createEl('label', {text: t('Code')});
    const workspace = codeField.createDiv({cls: 'mm-node-code-editor-workspace'});
    this.previewEl = workspace.createDiv({cls: 'mm-node-code-editor-preview'});
    this.previewEl.setAttribute('aria-hidden', 'true');
    this.codeInput = workspace.createEl('textarea', {
      text: this.options.value?.code || '',
      attr: {
        rows: '16',
        spellcheck: 'false',
        'aria-label': t('Code'),
      },
    });
    this.codeInput.addEventListener('keydown', this.handleCodeKeydown);
    this.codeInput.addEventListener('input', this.handleCodeInput);
    this.codeInput.addEventListener('scroll', this.syncPreviewScroll);
    this.codeInput.addEventListener('compositionstart', this.handleCompositionStart);
    this.codeInput.addEventListener('compositionend', this.handleCompositionEnd);
    this.languageInput.addEventListener('input', this.handleLanguageInput);

    const actions = this.contentEl.createDiv({cls: 'mm-insert-actions mm-node-code-editor-actions'});
    if (this.options.onDelete) {
      const remove = actions.createEl('button', {text: t('Delete code block')});
      remove.classList.add('mod-warning', 'mm-node-code-delete');
      remove.addEventListener('click', () => {
        this.settled = true;
        this.options.onDelete?.();
        this.close();
      });
    }
    const spacer = actions.createDiv({cls: 'mm-node-code-action-spacer'});
    spacer.setAttribute('aria-hidden', 'true');
    const cancel = actions.createEl('button', {text: t('Cancel')});
    cancel.addEventListener('click', () => this.close());
    const save = actions.createEl('button', {
      text: this.options.value ? t('Save') : t('Insert'),
    });
    save.classList.add('mod-cta');
    save.addEventListener('click', () => this.submit());

    this.schedulePreview(0);
    requestAnimationFrame(() => this.codeInput.focus());
  }

  onClose(): void {
    this.codeInput?.removeEventListener('keydown', this.handleCodeKeydown);
    this.codeInput?.removeEventListener('input', this.handleCodeInput);
    this.codeInput?.removeEventListener('scroll', this.syncPreviewScroll);
    this.codeInput?.removeEventListener('compositionstart', this.handleCompositionStart);
    this.codeInput?.removeEventListener('compositionend', this.handleCompositionEnd);
    this.languageInput?.removeEventListener('input', this.handleLanguageInput);
    if (this.previewTimer !== null) window.clearTimeout(this.previewTimer);
    this.previewVersion++;
    this.previewComponent?.unload();
    this.previewComponent = null;
    this.contentEl.empty();
    if (!this.settled) this.options.onCancel?.();
  }

  private handleCodeKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const start = this.codeInput.selectionStart;
      const end = this.codeInput.selectionEnd;
      this.codeInput.setRangeText('  ', start, end, 'end');
      this.schedulePreview();
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.submit();
    }
  };

  private handleCodeInput = (): void => {
    if (!this.composing) this.schedulePreview();
  };

  private handleLanguageInput = (): void => this.schedulePreview();

  private handleCompositionStart = (): void => {
    this.composing = true;
    this.codeInput.parentElement?.classList.add('is-composing');
  };

  private handleCompositionEnd = (): void => {
    this.composing = false;
    this.codeInput.parentElement?.classList.remove('is-composing');
    this.schedulePreview(0);
  };

  private schedulePreview(delay = 24): void {
    if (this.previewTimer !== null) window.clearTimeout(this.previewTimer);
    this.previewTimer = window.setTimeout(() => {
      this.previewTimer = null;
      void this.renderPreview();
    }, delay);
  }

  private async renderPreview(): Promise<void> {
    const version = ++this.previewVersion;
    const component = new Component();
    component.load();
    try {
      const pre = await createHighlightedCodePre(
        this.previewEl.ownerDocument,
        normalizeNodeCodeLanguage(this.languageInput.value),
        this.codeInput.value,
        this.options.sourcePath || '',
        component,
      );
      if (!this.previewEl.isConnected || version !== this.previewVersion) {
        component.unload();
        return;
      }
      this.previewComponent?.unload();
      this.previewComponent = component;
      this.previewEl.replaceChildren(pre);
      this.codeInput.parentElement?.classList.remove('has-render-error');
      this.syncPreviewScroll();
    } catch (error) {
      component.unload();
      if (this.previewEl.isConnected && version === this.previewVersion) {
        this.codeInput.parentElement?.classList.add('has-render-error');
      }
      console.error('Failed to render node code preview', error);
    }
  }

  private syncPreviewScroll = (): void => {
    if (!this.previewEl) return;
    this.previewEl.scrollTop = this.codeInput.scrollTop;
    this.previewEl.scrollLeft = this.codeInput.scrollLeft;
  };

  private submit(): void {
    if (!this.codeInput.value.trim()) {
      new Notice(t('Code cannot be empty'));
      this.codeInput.focus();
      return;
    }
    this.settled = true;
    this.options.onSubmit({
      language: normalizeNodeCodeLanguage(this.languageInput.value),
      code: this.codeInput.value,
    });
    this.close();
  }
}
