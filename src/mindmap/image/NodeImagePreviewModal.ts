import { App, Modal } from 'obsidian';
import { t } from '../../lang/helpers';

export default class NodeImagePreviewModal extends Modal {
  private imageSrc: string;
  private imageAlt: string;
  private onCloseCallback: () => void;

  constructor(app: App, imageSrc: string, imageAlt: string, onClose: () => void) {
    super(app);
    this.shouldRestoreSelection = false;
    this.imageSrc = imageSrc;
    this.imageAlt = imageAlt;
    this.onCloseCallback = onClose;
  }

  onOpen(): void {
    this.setTitle(t('Image preview'));
    this.modalEl.classList.add('mm-node-image-preview-modal');
    this.contentEl.createEl('img', {
      cls: 'mm-node-image-preview',
      attr: {
        src: this.imageSrc,
        alt: this.imageAlt,
      },
    });
  }

  onClose(): void {
    this.contentEl.empty();
    this.onCloseCallback();
  }
}
