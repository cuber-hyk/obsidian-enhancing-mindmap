import { App, FuzzySuggestModal, TFile } from 'obsidian';

export default class VaultFileSuggestModal extends FuzzySuggestModal<TFile> {
  private files: TFile[];
  private chosen = false;
  private onChoose: (file: TFile) => void;
  private onCancel: () => void;

  constructor(
    app: App,
    title: string,
    files: TFile[],
    onChoose: (file: TFile) => void,
    onCancel: () => void,
  ) {
    super(app);
    this.shouldRestoreSelection = false;
    this.files = files;
    this.onChoose = onChoose;
    this.onCancel = onCancel;
    this.setPlaceholder(title);
    this.emptyStateText = title;
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.chosen = true;
    this.onChoose(file);
  }

  onClose(): void {
    super.onClose();
    if (!this.chosen) this.onCancel();
  }
}
