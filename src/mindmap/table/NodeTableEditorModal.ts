import { App, Modal } from 'obsidian';
import { t } from '../../lang/helpers';
import { NodeTableDocument, serializeNodeTableDocument } from './NodeTableMarkdown';

export default class NodeTableEditorModal extends Modal {
  private table: NodeTableDocument;
  private onSubmit: (markdown: string) => void;
  private onSource: () => void;

  constructor(app: App, table: NodeTableDocument, onSubmit: (markdown: string) => void, onSource: () => void) {
    super(app);
    this.shouldRestoreSelection = false;
    this.table = {
      title: table.title,
      headers: [...table.headers],
      alignments: [...table.alignments],
      rows: table.rows.map((row) => [...row]),
    };
    this.onSubmit = onSubmit;
    this.onSource = onSource;
  }

  onOpen(): void {
    this.setTitle(t('Edit table'));
    this.modalEl.classList.add('mm-node-table-editor-modal');
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    this.contentEl.empty();
    const grid = this.contentEl.createEl('table', { cls: 'mm-node-table-editor-grid' });
    this.renderRow(grid, this.table.headers, -1, true);
    this.table.rows.forEach((row, rowIndex) => this.renderRow(grid, row, rowIndex, false));

    const controls = this.contentEl.createDiv({ cls: 'mm-node-table-editor-controls' });
    this.createButton(controls, t('Add row'), () => {
      this.table.rows.push(Array(this.table.headers.length).fill(''));
      this.render();
    });
    this.createButton(controls, t('Remove row'), () => {
      if (this.table.rows.length > 1) this.table.rows.pop();
      this.render();
    });
    this.createButton(controls, t('Add column'), () => {
      this.table.headers.push('');
      this.table.alignments.push(null);
      this.table.rows.forEach((row) => row.push(''));
      this.render();
    });
    this.createButton(controls, t('Remove column'), () => {
      if (this.table.headers.length > 1) {
        this.table.headers.pop();
        this.table.alignments.pop();
        this.table.rows.forEach((row) => row.pop());
      }
      this.render();
    });

    const actions = this.contentEl.createDiv({ cls: 'mm-insert-actions' });
    this.createButton(actions, t('Edit source'), () => {
      this.onSource();
      this.close();
    });
    this.createButton(actions, t('Cancel'), () => this.close());
    const save = this.createButton(actions, t('Save'), () => {
      this.onSubmit(serializeNodeTableDocument(this.table));
      this.close();
    });
    save.classList.add('mod-cta');
  }

  private renderRow(grid: HTMLTableElement, values: string[], row: number, header: boolean): void {
    const tr = grid.createEl('tr');
    values.forEach((value, column) => {
      const cell = tr.createEl(header ? 'th' : 'td');
      const input = cell.createEl('input', { type: 'text', value });
      input.setAttribute('aria-label', header ? t('Table header') : t('Table cell'));
      input.addEventListener('input', () => {
        if (header) this.table.headers[column] = input.value;
        else this.table.rows[row][column] = input.value;
      });
      input.addEventListener('paste', (event) => this.pasteTsv(event, row, column));
    });
  }

  private pasteTsv(event: ClipboardEvent, startRow: number, startColumn: number): void {
    const text = event.clipboardData?.getData('text/plain');
    if (!text || !text.includes('\t')) return;
    event.preventDefault();
    const values = text.replace(/\r/g, '').split('\n').filter((line) => line.length > 0).map((line) => line.split('\t'));
    const requiredColumns = startColumn + Math.max(...values.map((row) => row.length));
    while (this.table.headers.length < requiredColumns) {
      this.table.headers.push('');
      this.table.alignments.push(null);
      this.table.rows.forEach((row) => row.push(''));
    }
    if (startRow < 0) {
      values.shift()?.forEach((value, columnOffset) => {
        this.table.headers[startColumn + columnOffset] = value;
      });
    }
    const firstRow = startRow < 0 ? 0 : startRow;
    while (this.table.rows.length < firstRow + values.length) {
      this.table.rows.push(Array(this.table.headers.length).fill(''));
    }
    values.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
      this.table.rows[firstRow + rowOffset][startColumn + columnOffset] = value;
    }));
    this.render();
  }

  private createButton(parent: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
    const button = parent.createEl('button', { text, type: 'button' });
    button.addEventListener('click', onClick);
    return button;
  }
}
