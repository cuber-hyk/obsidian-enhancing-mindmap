import {
  addIcon,
  App,
  Component,
  removeIcon,
  setIcon,
  TFile,
} from 'obsidian';

import { frontMatterKey } from '../../constants';

export const MINDMAP_FILE_ICON = 'enhancing-mindmap-file';

const MINDMAP_FILE_ICON_SVG = `
  <path d="M62 8H28a8 8 0 0 0-8 8v68a8 8 0 0 0 8 8h44a8 8 0 0 0 8-8V26Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M62 8v18h18" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="38" cy="50" r="5" fill="none" stroke="currentColor" stroke-width="6"/>
  <circle cx="62" cy="40" r="4" fill="none" stroke="currentColor" stroke-width="6"/>
  <circle cx="62" cy="65" r="4" fill="none" stroke="currentColor" stroke-width="6"/>
  <path d="M43 50h5c8 0 6-10 10-10M48 50h2c8 0 6 15 8 15" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
`;

const FILE_EXPLORER_SELECTOR = '.nav-files-container';
const FILE_TITLE_SELECTOR = '.nav-file-title[data-path]';
const FILE_TITLE_CONTENT_SELECTOR = ':scope > .nav-file-title-content';
const FILE_TITLE_CLASS = 'mm-mindmap-file-title';
const FILE_ICON_CLASS = 'mm-mindmap-file-icon';
const FILE_ICON_INLINE_START_PROPERTY = '--mm-mindmap-file-icon-inline-start';

export default class MindMapFileIconController extends Component {
  private app: App;
  private explorerObservers: Map<HTMLElement, MutationObserver> = new Map();
  private refreshFrame: number | null = null;
  private disposed = false;
  private initialized = false;

  constructor(app: App) {
    super();
    this.app = app;
  }

  onload() {
    this.disposed = false;
    addIcon(MINDMAP_FILE_ICON, MINDMAP_FILE_ICON_SVG);

    this.app.workspace.onLayoutReady(() => {
      if (this.disposed) return;
      this.initialize();
    });
  }

  onunload() {
    this.disposed = true;
    this.initialized = false;
    removeIcon(MINDMAP_FILE_ICON);
    if (this.refreshFrame !== null) {
      window.cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
    }

    this.explorerObservers.forEach((observer) => observer.disconnect());
    this.explorerObservers.clear();
    this.cleanupDecorations(document);
  }

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;

    this.registerEvent(
      this.app.metadataCache.on('changed', () => this.scheduleRefresh())
    );
    this.registerEvent(
      this.app.metadataCache.on('deleted', () => this.scheduleRefresh())
    );
    this.registerEvent(
      this.app.vault.on('create', () => this.scheduleRefresh())
    );
    this.registerEvent(
      this.app.vault.on('delete', () => this.scheduleRefresh())
    );
    this.registerEvent(
      this.app.vault.on('rename', () => this.scheduleRefresh())
    );
    this.registerEvent(
      this.app.workspace.on('layout-change', () => this.syncExplorerRoots())
    );
    this.syncExplorerRoots();
  }

  private syncExplorerRoots() {
    if (this.disposed) return;

    const currentRoots = new Set(
      Array.from(document.querySelectorAll<HTMLElement>(FILE_EXPLORER_SELECTOR))
    );

    this.explorerObservers.forEach((observer, root) => {
      if (currentRoots.has(root) && root.isConnected) return;
      observer.disconnect();
      this.explorerObservers.delete(root);
    });

    currentRoots.forEach((root) => {
      if (this.explorerObservers.has(root)) return;

      const observer = new MutationObserver(() => this.scheduleRefresh());
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-path'],
      });
      this.explorerObservers.set(root, observer);
    });

    this.scheduleRefresh();
  }

  private scheduleRefresh() {
    if (this.disposed || this.refreshFrame !== null) return;

    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refreshVisibleFileIcons();
    });
  }

  private refreshVisibleFileIcons() {
    this.explorerObservers.forEach((_observer, root) => {
      root.querySelectorAll<HTMLElement>(FILE_TITLE_SELECTOR).forEach((titleEl) => {
        this.updateFileIcon(titleEl);
      });
    });
  }

  private updateFileIcon(titleEl: HTMLElement) {
    const path = titleEl.dataset.path;
    const abstractFile = path
      ? this.app.vault.getAbstractFileByPath(path)
      : null;
    const isMindMap = abstractFile instanceof TFile
      && abstractFile.extension.toLowerCase() === 'md'
      && this.app.metadataCache.getFileCache(abstractFile)?.frontmatter?.[frontMatterKey] === 'basic';

    if (!isMindMap) {
      this.removeDecoration(titleEl);
      return;
    }

    titleEl.classList.add(FILE_TITLE_CLASS);
    let iconEl = titleEl.querySelector<HTMLElement>(`:scope > .${FILE_ICON_CLASS}`);
    if (!iconEl) {
      const contentEl = titleEl.querySelector<HTMLElement>(FILE_TITLE_CONTENT_SELECTOR);
      if (!contentEl) {
        titleEl.classList.remove(FILE_TITLE_CLASS);
        return;
      }

      iconEl = document.createElement('span');
      iconEl.classList.add(FILE_ICON_CLASS);
      iconEl.setAttribute('aria-hidden', 'true');
      setIcon(iconEl, MINDMAP_FILE_ICON);
      titleEl.insertBefore(iconEl, contentEl);
    }

    this.alignIconWithIconicSlot(titleEl, iconEl);
  }

  private alignIconWithIconicSlot(titleEl: HTMLElement, iconEl: HTMLElement) {
    const iconicEl = titleEl.querySelector<HTMLElement>(
      `:scope > .iconic-icon:not(.${FILE_ICON_CLASS})`
    );
    if (!iconicEl) {
      iconEl.style.removeProperty(FILE_ICON_INLINE_START_PROPERTY);
      return;
    }

    const titleRect = titleEl.getBoundingClientRect();
    const iconicRect = iconicEl.getBoundingClientRect();
    if (iconicRect.width === 0 && iconicRect.height === 0) {
      iconEl.style.removeProperty(FILE_ICON_INLINE_START_PROPERTY);
      return;
    }

    const inlineStart = getComputedStyle(titleEl).direction === 'rtl'
      ? titleRect.right - iconicRect.right
      : iconicRect.left - titleRect.left;
    iconEl.style.setProperty(FILE_ICON_INLINE_START_PROPERTY, `${inlineStart}px`);
  }

  private cleanupDecorations(scope: ParentNode) {
    scope.querySelectorAll<HTMLElement>(`.${FILE_TITLE_CLASS}`).forEach((titleEl) => {
      this.removeDecoration(titleEl);
    });
  }

  private removeDecoration(titleEl: HTMLElement) {
    titleEl.classList.remove(FILE_TITLE_CLASS);
    titleEl.querySelectorAll<HTMLElement>(`:scope > .${FILE_ICON_CLASS}`).forEach((iconEl) => {
      iconEl.remove();
    });
  }
}
