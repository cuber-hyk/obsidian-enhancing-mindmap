import { App, Modal } from 'obsidian';
import { t } from '../../lang/helpers';
import {
  NodeLinkKind,
  normalizeExternalLinkTarget,
} from './NodeLinkMarkdown';

export interface EditNodeLinkValue {
  title: string;
  target: string;
}

export default class EditNodeLinkModal extends Modal {
  private kind: NodeLinkKind;
  private initialTitle: string;
  private initialTarget: string;
  private chooseVaultTarget: () => Promise<string | null>;
  private onSubmit: (value: EditNodeLinkValue) => void;
  private onCloseCallback: () => void;

  constructor(
    app: App,
    kind: NodeLinkKind,
    initialTitle: string,
    initialTarget: string,
    chooseVaultTarget: () => Promise<string | null>,
    onSubmit: (value: EditNodeLinkValue) => void,
    onClose: () => void,
  ) {
    super(app);
    this.shouldRestoreSelection = false;
    this.kind = kind;
    this.initialTitle = initialTitle;
    this.initialTarget = initialTarget;
    this.chooseVaultTarget = chooseVaultTarget;
    this.onSubmit = onSubmit;
    this.onCloseCallback = onClose;
  }

  onOpen(): void {
    this.setTitle(t('Edit link'));
    const form = this.contentEl.createEl('form', { cls: 'mm-insert-link-form' });
    const titleLabel = form.createEl('label', { text: t('Link title') });
    const titleInput = titleLabel.createEl('input', {
      type: 'text',
      value: this.initialTitle,
    });
    titleInput.maxLength = 500;

    const targetLabel = form.createEl('label', {
      text: this.kind === 'external' ? t('Link URL') : t('Link target'),
    });
    const targetRow = targetLabel.createDiv({ cls: 'mm-edit-link-target' });
    const targetInput = targetRow.createEl('input', {
      type: this.kind === 'external' ? 'url' : 'text',
      value: this.initialTarget,
    });
    targetInput.maxLength = 4096;

    if (this.kind === 'vault') {
      targetInput.readOnly = true;
      const chooseButton = targetRow.createEl('button', {
        text: t('Choose Vault file'),
        type: 'button',
      });
      chooseButton.addEventListener('click', async () => {
        const target = await this.chooseVaultTarget();
        if (target) targetInput.value = target;
        chooseButton.focus();
      });
    }

    const validationEl = form.createDiv({ cls: 'mm-insert-validation' });
    const actions = form.createDiv({ cls: 'mm-insert-actions' });
    const cancelButton = actions.createEl('button', {
      text: t('Cancel'),
      type: 'button',
    });
    const saveButton = actions.createEl('button', {
      text: t('Save'),
      type: 'submit',
      cls: 'mod-cta',
    });

    cancelButton.addEventListener('click', () => this.close());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const target = this.kind === 'external'
        ? normalizeExternalLinkTarget(targetInput.value)
        : targetInput.value.trim();
      if (!target) {
        validationEl.setText(
          this.kind === 'external' ? t('Invalid URL') : t('Choose Vault file'),
        );
        targetInput.focus();
        return;
      }

      this.onSubmit({
        title: titleInput.value.trim() || target,
        target,
      });
      this.close();
    });

    saveButton.setAttribute('aria-label', t('Save link'));
    setTimeout(() => titleInput.focus());
  }

  onClose(): void {
    this.contentEl.empty();
    this.onCloseCallback();
  }
}
