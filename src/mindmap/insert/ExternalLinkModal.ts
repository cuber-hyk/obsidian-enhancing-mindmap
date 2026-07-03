import { App, Modal } from 'obsidian';
import { t } from '../../lang/helpers';

export interface ExternalLinkValue {
  title: string;
  url: string;
}

export default class ExternalLinkModal extends Modal {
  private initialTitle: string;
  private submitted = false;
  private onSubmit: (value: ExternalLinkValue) => void;
  private onCancel: () => void;

  constructor(
    app: App,
    initialTitle: string,
    onSubmit: (value: ExternalLinkValue) => void,
    onCancel: () => void,
  ) {
    super(app);
    this.shouldRestoreSelection = false;
    this.initialTitle = initialTitle;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
  }

  onOpen(): void {
    this.setTitle(t('Insert external link'));
    const form = this.contentEl.createEl('form', { cls: 'mm-insert-link-form' });
    const titleLabel = form.createEl('label', { text: t('Link title') });
    const titleInput = titleLabel.createEl('input', {
      type: 'text',
      value: this.initialTitle,
    });
    titleInput.maxLength = 500;

    const urlLabel = form.createEl('label', { text: t('Link URL') });
    const urlInput = urlLabel.createEl('input', {
      type: 'url',
      placeholder: 'https://example.com',
    });
    urlInput.maxLength = 4096;

    const validationEl = form.createDiv({ cls: 'mm-insert-validation' });
    const actions = form.createDiv({ cls: 'mm-insert-actions' });
    const cancelButton = actions.createEl('button', {
      text: t('Cancel'),
      type: 'button',
    });
    const insertButton = actions.createEl('button', {
      text: t('Insert'),
      type: 'submit',
      cls: 'mod-cta',
    });

    cancelButton.addEventListener('click', () => this.close());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const url = normalizeExternalUrl(urlInput.value);
      if (!url) {
        validationEl.setText(t('Invalid URL'));
        urlInput.focus();
        return;
      }

      const title = titleInput.value.trim() || url;
      this.submitted = true;
      this.onSubmit({ title, url });
      this.close();
    });

    insertButton.setAttribute('aria-label', t('Insert external link'));
    setTimeout(() => (this.initialTitle ? urlInput : titleInput).focus());
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.submitted) this.onCancel();
  }
}

export function normalizeExternalUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function createExternalMarkdownLink(title: string, url: string): string {
  const safeTitle = title.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
  const safeUrl = url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/</g, '%3C').replace(/>/g, '%3E');
  return `[${safeTitle}](<${safeUrl}>)`;
}
