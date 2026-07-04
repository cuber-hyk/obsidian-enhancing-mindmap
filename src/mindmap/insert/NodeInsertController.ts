import { App, Menu, Notice, setIcon, TFile } from 'obsidian';
import { t } from '../../lang/helpers';
import type INode from '../INode';
import { importLocalImage, isVaultImage } from './AttachmentImporter';
import ExternalLinkModal, {
  ExternalLinkValue,
} from './ExternalLinkModal';
import { createVaultImageMarkdown } from '../image/NodeImageMarkdown';
import { createExternalMarkdownLink } from '../link/NodeLinkMarkdown';
import NodeMarkdownInsertion from './NodeMarkdownInsertion';
import VaultFileSuggestModal from './VaultFileSuggestModal';

interface Closeable {
  close(): void;
}

export default class NodeInsertController {
  private app: App;
  private activeNode: INode | null = null;
  private insertion: NodeMarkdownInsertion | null = null;
  private toolbarEl: HTMLElement | null = null;
  private activeCloseable: Closeable | null = null;

  constructor(app: App) {
    this.app = app;
  }

  beginEdit(node: INode): void {
    if (this.activeNode && this.activeNode !== node) this.endEdit();

    this.activeNode = node;
    this.insertion = new NodeMarkdownInsertion(node.contentEl);
    this.insertion.capture();
    const toolbar = this.ensureToolbar(node.contentEl.ownerDocument);
    node.containEl.appendChild(toolbar);
  }

  endEdit(node?: INode): void {
    if (node && this.activeNode !== node) return;

    this.activeNode = null;
    this.insertion = null;
    const closeable = this.activeCloseable;
    this.activeCloseable = null;
    closeable?.close();
    this.toolbarEl?.remove();
  }

  destroy(): void {
    this.endEdit();
    this.toolbarEl = null;
  }

  private ensureToolbar(doc: Document): HTMLElement {
    if (this.toolbarEl?.ownerDocument === doc) return this.toolbarEl;

    this.toolbarEl?.remove();
    const toolbar = doc.createElement('div');
    toolbar.classList.add('mm-node-insert-toolbar');
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', t('Node insert toolbar'));
    toolbar.addEventListener('mousedown', (event) => {
      this.insertion?.capture();
      event.preventDefault();
      event.stopPropagation();
    });
    toolbar.addEventListener('click', (event) => event.stopPropagation());
    toolbar.addEventListener('dblclick', (event) => event.stopPropagation());

    toolbar.appendChild(this.createButton(
      doc,
      'link',
      t('Insert external link'),
      () => this.openExternalLink(),
    ));
    toolbar.appendChild(this.createButton(
      doc,
      'file',
      t('Insert Vault file'),
      () => this.openVaultFile(),
    ));
    toolbar.appendChild(this.createButton(
      doc,
      'image',
      t('Insert image'),
      (event) => this.openImageMenu(event),
      true,
    ));

    this.toolbarEl = toolbar;
    return toolbar;
  }

  private createButton(
    doc: Document,
    icon: string,
    label: string,
    onClick: (event: MouseEvent) => void,
    hasMenu = false,
  ): HTMLButtonElement {
    const button = doc.createElement('button');
    button.type = 'button';
    button.classList.add('clickable-icon');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    if (hasMenu) button.setAttribute('aria-haspopup', 'menu');
    setIcon(button, icon);
    button.addEventListener('click', onClick);
    return button;
  }

  private openExternalLink(): void {
    const session = this.getSession();
    if (!session) return;

    const modal = new ExternalLinkModal(
      this.app,
      session.insertion.getSelectedText(),
      (value) => {
        this.activeCloseable = null;
        this.insertExternalLink(session.node, session.insertion, value);
      },
      () => {
        this.activeCloseable = null;
        this.restoreSession(session.node, session.insertion);
      },
    );
    this.activeCloseable = modal;
    modal.open();
  }

  private openVaultFile(): void {
    const session = this.getSession();
    if (!session) return;

    const files = this.app.vault.getFiles().filter((file) => !isVaultImage(file));
    this.openFileModal(t('Choose Vault file'), files, session.node, session.insertion, false);
  }

  private openImageMenu(event: MouseEvent): void {
    const session = this.getSession();
    if (!session) return;

    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute('aria-expanded', 'true');
    let actionChosen = false;
    const menu = new Menu();
    menu.addItem((item) => item
      .setTitle(t('Choose Vault image'))
      .setIcon('image')
      .onClick(() => {
        actionChosen = true;
        this.activeCloseable = null;
        const files = this.app.vault.getFiles().filter(isVaultImage);
        this.openFileModal(t('Choose Vault image'), files, session.node, session.insertion, true);
      }));
    menu.addItem((item) => item
      .setTitle(t('Import local image'))
      .setIcon('upload')
      .onClick(() => {
        actionChosen = true;
        this.activeCloseable = null;
        void this.importImage(session.node, session.insertion);
      }));
    menu.onHide(() => {
      button.setAttribute('aria-expanded', 'false');
      if (!actionChosen) this.restoreSession(session.node, session.insertion);
      if (this.activeCloseable === menu) this.activeCloseable = null;
    });
    this.activeCloseable = menu;
    const rect = button.getBoundingClientRect();
    menu.showAtPosition({
      x: rect.left,
      y: rect.bottom,
      width: rect.width,
    }, button.ownerDocument);
  }

  private openFileModal(
    title: string,
    files: TFile[],
    node: INode,
    insertion: NodeMarkdownInsertion,
    embed: boolean,
  ): void {
    const modal = new VaultFileSuggestModal(
      this.app,
      title,
      files,
      (file) => {
        this.activeCloseable = null;
        this.insertVaultFile(node, insertion, file, embed);
      },
      () => {
        this.activeCloseable = null;
        this.restoreSession(node, insertion);
      },
    );
    this.activeCloseable = modal;
    modal.open();
  }

  private insertExternalLink(
    node: INode,
    insertion: NodeMarkdownInsertion,
    value: ExternalLinkValue,
  ): void {
    if (!this.isActiveSession(node, insertion)) return;
    insertion.append(createExternalMarkdownLink(value.title, value.url));
    this.refreshNode(node);
  }

  private insertVaultFile(
    node: INode,
    insertion: NodeMarkdownInsertion,
    file: TFile,
    embed: boolean,
  ): void {
    if (!this.isActiveSession(node, insertion)) return;

    const alias = embed ? '' : insertion.getSelectedText().trim();
    const link = this.app.fileManager.generateMarkdownLink(
      file,
      this.getSourcePath(node),
      '',
      alias,
    );
    const markdown = embed ? createVaultImageMarkdown(file.path) : link;
    if (embed) {
      insertion.insert(markdown);
    } else {
      insertion.append(markdown);
    }
    this.refreshNode(node);
  }

  private async importImage(node: INode, insertion: NodeMarkdownInsertion): Promise<void> {
    const file = await this.chooseLocalImage(node.contentEl.ownerDocument);
    if (!file) {
      this.restoreSession(node, insertion);
      return;
    }
    if (!this.isActiveSession(node, insertion)) return;

    try {
      const attachment = await importLocalImage(this.app, this.getSourcePath(node), file);
      if (!this.isActiveSession(node, insertion)) {
        new Notice(`${t('Image insertion failed')}: ${attachment.path}`);
        return;
      }
      this.insertVaultFile(node, insertion, attachment, true);
    } catch (error) {
      const message = error instanceof Error && error.message === 'unsupported-image-type'
        ? t('Unsupported image type')
        : t('Image import failed');
      new Notice(message);
      this.restoreSession(node, insertion);
    }
  }

  private chooseLocalImage(doc: Document): Promise<File | null> {
    return new Promise((resolve) => {
      const input = doc.createElement('input');
      input.type = 'file';
      input.accept = '.avif,.bmp,.gif,.jpeg,.jpg,.png,.webp';
      input.hidden = true;
      doc.body.appendChild(input);

      const win = doc.defaultView;
      let settled = false;
      const finish = (file: File | null) => {
        if (settled) return;
        settled = true;
        win?.removeEventListener('focus', onFocus);
        input.remove();
        resolve(file);
      };
      const onFocus = () => {
        setTimeout(() => finish(input.files?.[0] || null), 200);
      };

      input.addEventListener('change', () => finish(input.files?.[0] || null), { once: true });
      input.addEventListener('cancel', () => finish(null), { once: true });
      win?.addEventListener('focus', onFocus, { once: true });
      input.click();
    });
  }

  private getSession(): { node: INode; insertion: NodeMarkdownInsertion } | null {
    if (!this.activeNode || !this.insertion) return null;
    this.insertion.capture();
    return { node: this.activeNode, insertion: this.insertion };
  }

  private restoreSession(node: INode, insertion: NodeMarkdownInsertion): void {
    if (this.isActiveSession(node, insertion)) insertion.restore();
  }

  private isActiveSession(node: INode, insertion: NodeMarkdownInsertion): boolean {
    return this.activeNode === node && this.insertion === insertion && node.data.isEdit;
  }

  private getSourcePath(node: INode): string {
    return node.mindmap.path || node.mindmap.view?.file?.path || '';
  }

  private refreshNode(node: INode): void {
    node.refreshEditText();
    node.clearCacheData();
    node.refreshBox();
    node.mindmap.refresh();
    node.containEl.classList.add('mm-edit-node', 'mm-node-select');
  }
}
