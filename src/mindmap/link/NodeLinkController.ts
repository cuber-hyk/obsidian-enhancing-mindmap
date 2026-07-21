import { Menu, Notice, parseLinktext, TFile } from 'obsidian';
import { t } from '../../lang/helpers';
import VaultFileSuggestModal from '../insert/VaultFileSuggestModal';
import type Node from '../INode';
import type MindMap from '../mindmap';
import EditNodeLinkModal, { EditNodeLinkValue } from './EditNodeLinkModal';
import {
  createExternalMarkdownLink,
  createVaultMarkdownLink,
  NodeLinkData,
  parseNodeMarkdown,
  removeNodeLink,
  replaceNodeLink,
} from './NodeLinkMarkdown';

interface NodeLinkContext {
  node: Node;
  index: number;
  link: NodeLinkData;
}

export default class NodeLinkController {
  private mindmap: MindMap;

  constructor(mindmap: MindMap) {
    this.mindmap = mindmap;
  }

  handleClick(event: MouseEvent): boolean {
    const context = this.getContext(event.target);
    if (!context) return false;

    event.stopPropagation();
    if (context.link.kind === 'vault') {
      event.preventDefault();
      this.mindmap.view.app.workspace.openLinkText(
        context.link.href,
        this.getSourcePath(),
        true,
      );
    }
    return true;
  }

  handleContextMenu(event: MouseEvent): boolean {
    const context = this.getContext(event.target);
    if (!context) return false;

    event.preventDefault();
    event.stopPropagation();
    let actionChosen = false;
    const menu = new Menu();
    menu.addItem((item) => item
      .setTitle(t('Copy link'))
      .setIcon('copy')
      .onClick(() => {
        actionChosen = true;
        void this.copyLink(context);
      }));
    menu.addItem((item) => item
      .setTitle(t('Edit link'))
      .setIcon('pencil')
      .onClick(() => {
        actionChosen = true;
        this.editLink(context);
      }));
    menu.addItem((item) => item
      .setTitle(t('Delete link'))
      .setIcon('trash')
      .onClick(() => {
        actionChosen = true;
        this.deleteLink(context);
      }));
    menu.onHide(() => {
      if (!actionChosen) {
        (
          context.node.data.isEdit
            ? context.node.contentEl
            : context.node.containEl
        ).focus();
      }
    });
    menu.showAtMouseEvent(event);
    return true;
  }

  private async copyLink(context: NodeLinkContext): Promise<void> {
    try {
      await navigator.clipboard.writeText(context.link.markdown);
      new Notice(t('Link copied'));
    } catch (error) {
      console.error('Failed to copy link', error);
      new Notice(t('Failed to copy link'));
    }
    (
      context.node.data.isEdit
        ? context.node.contentEl
        : context.node.containEl
    ).focus();
  }

  private editLink(context: NodeLinkContext): void {
    const modal = new EditNodeLinkModal(
      this.mindmap.view.app,
      context.link.kind,
      context.link.label,
      context.link.href,
      () => this.chooseVaultTarget(),
      (value) => this.applyEdit(context, value),
      () => (
        context.node.data.isEdit
          ? context.node.contentEl
          : context.node.containEl
      ).focus(),
    );
    modal.open();
  }

  private applyEdit(context: NodeLinkContext, value: EditNodeLinkValue): void {
    const replacement = context.link.kind === 'external'
      ? createExternalMarkdownLink(value.title, value.target)
      : this.createVaultLink(context.link, value);
    this.applyLinkChange(context.node, context.index, replacement);
  }

  private deleteLink(context: NodeLinkContext): void {
    this.applyLinkChange(context.node, context.index, null);
  }

  private applyLinkChange(node: Node, index: number, replacement: string | null): void {
    if (node.data.isEdit) {
      const links = node.getDisplayedLinks();
      if (!links[index]) return;
      if (replacement === null) {
        links.splice(index, 1);
      } else {
        const replacementLink = parseNodeMarkdown(replacement).links[0];
        if (!replacementLink) return;
        links[index] = replacementLink;
      }
      node.setEditedLinks(links);
      node.contentEl.focus();
      return;
    }

    const oldText = node.data.text as string;
    const text = replacement === null
      ? removeNodeLink(oldText, index)
      : replaceNodeLink(oldText, index, replacement);
    if (text === oldText) return;

    node.mindmap.execute('changeNodeText', {
      node,
      text,
      oldText,
    });
    node.containEl.focus();
  }

  private createVaultLink(link: NodeLinkData, value: EditNodeLinkValue): string {
    const sourcePath = this.getSourcePath();
    const linktext = parseLinktext(value.target);
    const file = this.mindmap.view.app.metadataCache.getFirstLinkpathDest(
      linktext.path,
      sourcePath,
    );
    if (file instanceof TFile) {
      return this.mindmap.view.app.fileManager.generateMarkdownLink(
        file,
        sourcePath,
        linktext.subpath || '',
        value.title,
      );
    }

    return createVaultMarkdownLink(
      value.title,
      value.target,
      link.markdown.startsWith('[['),
    );
  }

  private chooseVaultTarget(): Promise<string | null> {
    return new Promise((resolve) => {
      const files = this.mindmap.view.app.vault.getFiles();
      const modal = new VaultFileSuggestModal(
        this.mindmap.view.app,
        t('Choose Vault file'),
        files,
        (file) => resolve(file.path),
        () => resolve(null),
      );
      modal.open();
    });
  }

  private getContext(target: EventTarget | null): NodeLinkContext | null {
    if (!(target instanceof Element)) return null;
    const linkEl = target.closest('.mm-node-link') as HTMLAnchorElement | null;
    const nodeEl = linkEl?.closest('.mm-node') as HTMLElement | null;
    if (!linkEl || !nodeEl) return null;

    const index = Number(linkEl.dataset.linkIndex);
    const node = this.mindmap.getNodeById(nodeEl.dataset.id || '');
    const link = node?.getDisplayedLinks()[index];
    if (!node || !Number.isInteger(index) || !link) return null;

    return { node, index, link };
  }

  private getSourcePath(): string {
    return this.mindmap.path || this.mindmap.view?.file?.path || '';
  }
}
