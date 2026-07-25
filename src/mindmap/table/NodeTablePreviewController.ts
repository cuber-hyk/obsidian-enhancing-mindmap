import { App, Modal, setIcon, setTooltip } from 'obsidian';
import { t } from '../../lang/helpers';

interface NodeTablePreviewControllerOptions {
  app: App;
  contentEl: HTMLElement;
  onEdit: () => void;
  onLayoutChange: () => void;
}

export default class NodeTablePreviewController {
  private app: App;
  private contentEl: HTMLElement;
  private onEdit: () => void;
  private onLayoutChange: () => void;
  private viewportEl: HTMLElement | null = null;
  private controlsEl: HTMLElement | null = null;
  private tableEl: HTMLTableElement | null = null;
  private titleAnchorEl: HTMLElement | null = null;
  private scale = 1;

  constructor(options: NodeTablePreviewControllerOptions) {
    this.app = options.app;
    this.contentEl = options.contentEl;
    this.onEdit = options.onEdit;
    this.onLayoutChange = options.onLayoutChange;
  }

  attach(): boolean {
    const table = this.contentEl.querySelector('table');
    if (!(table instanceof HTMLTableElement)) return false;
    this.tableEl = table;
    this.contentEl.classList.add('mm-node-content-has-table');
    const previous = table.previousElementSibling;
    if (previous instanceof HTMLElement) {
      previous.classList.add('mm-node-table-title-anchor');
      this.titleAnchorEl = previous;
    }

    const viewport = this.contentEl.ownerDocument.createElement('div');
    viewport.classList.add('mm-node-table-viewport');
    table.before(viewport);
    viewport.appendChild(table);
    this.viewportEl = viewport;

    const controls = this.createControls();
    viewport.before(controls);
    this.controlsEl = controls;
    requestAnimationFrame(() => this.fit());
    return true;
  }

  destroy(): void {
    this.controlsEl?.remove();
    this.contentEl.classList.remove('mm-node-content-has-table');
    this.titleAnchorEl?.classList.remove('mm-node-table-title-anchor');
    if (this.viewportEl && this.tableEl && this.viewportEl.parentElement) {
      this.viewportEl.before(this.tableEl);
      this.viewportEl.remove();
    }
    this.controlsEl = null;
    this.viewportEl = null;
    this.tableEl = null;
    this.titleAnchorEl = null;
  }

  private createControls(): HTMLElement {
    const controls = this.contentEl.ownerDocument.createElement('div');
    controls.classList.add('mm-node-table-controls');
    controls.setAttribute('aria-label', t('Table controls'));
    controls.append(
      this.createButton('minus', t('Zoom out table'), () => this.setScale(this.scale - 0.1)),
      this.createButton('maximize-2', t('Fit table'), () => this.fit()),
      this.createButton('rotate-ccw', t('Reset table zoom'), () => this.setScale(1)),
      this.createButton('plus', t('Zoom in table'), () => this.setScale(this.scale + 0.1)),
      this.createButton('expand', t('Expand table'), () => this.openExpanded()),
      this.createButton('pencil', t('Edit table'), this.onEdit),
    );
    return controls;
  }

  private createButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const button = this.contentEl.ownerDocument.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    setIcon(button, icon);
    setTooltip(button, label);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private fit(): void {
    if (!this.viewportEl || !this.tableEl) return;
    this.tableEl.style.removeProperty('zoom');
    const availableWidth = this.viewportEl.clientWidth;
    const naturalWidth = this.tableEl.scrollWidth;
    const nextScale = naturalWidth > availableWidth
      ? Math.max(0.5, Math.min(1, availableWidth / naturalWidth))
      : 1;
    this.setScale(nextScale);
  }

  private setScale(nextScale: number): void {
    if (!this.tableEl) return;
    this.scale = Math.max(0.5, Math.min(1.5, Math.round(nextScale * 10) / 10));
    this.tableEl.style.setProperty('zoom', String(this.scale));
    this.onLayoutChange();
  }

  private openExpanded(): void {
    if (!this.tableEl) return;
    const table = this.tableEl.cloneNode(true) as HTMLTableElement;
    table.style.removeProperty('zoom');
    new NodeTableExpandedModal(this.app, table.outerHTML).open();
  }
}

class NodeTableExpandedModal extends Modal {
  private tableHtml: string;

  constructor(app: App, tableHtml: string) {
    super(app);
    this.shouldRestoreSelection = false;
    this.tableHtml = tableHtml;
  }

  onOpen(): void {
    this.setTitle(t('Table preview'));
    this.modalEl.classList.add('mm-node-table-expanded-modal');
    this.contentEl.innerHTML = this.tableHtml;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
