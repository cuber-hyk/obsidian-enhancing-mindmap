import {
  HoverParent,
  HoverPopover,
  Menu,
  TextFileView,
  WorkspaceLeaf,
  TFile,
  Notice,
  Platform,
  Scope
} from "obsidian";

import MindMapPlugin from './main'
import { FRONT_MATTER_REGEX } from './constants'
import MindMap from "./mindmap/mindmap";
import INode, { INodeData } from './mindmap/INode'
import { Transformer } from './markmapLib/markmap-lib';
import { t } from './lang/helpers'
import NodeInsertController from './mindmap/insert/NodeInsertController';
import { mindmapStyleTemplateFrontMatterKey } from './constants';
import {
  applyMindMapStyleTemplate,
  DEFAULT_MINDMAP_STYLE_TEMPLATE_ID,
  isMindMapStyleTemplateId,
  resolveMindMapStyleTemplate,
} from './mindmap/style/MindMapStyle';
import MindMapStyleInspector from './mindmap/style/MindMapStyleInspector';
import MindMapShortcutInspector from './mindmap/interaction/MindMapShortcutInspector';
import { NodeKeyboardShortcuts } from './mindmap/interaction/NodeKeyboardShortcuts';
import { getPluginShortcutCatalog } from './mindmap/interaction/PluginShortcutCatalog';
import {
  protectMindMapTables,
  restoreProtectedMindMapTables,
} from './mindmap/table/NodeTableMarkdown';
import { uuid } from './mindmap/NodeId';
import { restoreLeadingOrderedNodeMarker } from './mindmap/interaction/OrderedSiblingNumbering';

// import domtoimage from './domtoimage.js'
import domtoimage from './dom-to-image-more.js'

const transformer = new Transformer();

interface MindMapViewState {
  selectedNodeId?: string;
  selectedNodeText?: string;
  selectedNodePath?: number[];
  hadCanvasFocus: boolean;
  scale: number;
  scalePointer: number[];
  scrollLeft: number;
  scrollTop: number;
}


export const mindmapViewType = "mindmapView";
export const mindmapIcon = "blocks";

export class MindMapView extends TextFileView implements HoverParent {
  plugin: MindMapPlugin;
  insertController: NodeInsertController;
  hoverPopover: HoverPopover | null;
  id: string = (this.leaf as any).id;
  mindmap: MindMap | null;
  stagingMindmap: MindMap | null = null;
  stagingMindmapContainerEl: HTMLElement | null = null;
  currentStyleTemplateId: string = DEFAULT_MINDMAP_STYLE_TEMPLATE_ID;
  styleInspector: MindMapStyleInspector | null = null;
  isStyleInspectorOpen: boolean = false;
  shortcutInspector: MindMapShortcutInspector | null = null;
  isShortcutInspectorOpen: boolean = false;
  isApplyingStyleTemplate: boolean = false;
  pendingViewState?: MindMapViewState;
  timeOut: any = null;
  fileCache: any;
  yamlString:string=''

  getViewType() {
    return mindmapViewType;
  }
  getIcon() {
    return mindmapIcon;
  }

  getDisplayText() {
    return this.file?.basename || "mindmap";
  }

  exportToSvg(){
    if(!this.mindmap){
      return;
    }

   // this.mindmap.contentEL.style.visibility='hidden';
    var nodes:any[] = [];
    this.mindmap.traverseDF((n:any)=>{
       if(n.isShow()){
         nodes.push(n)
       }
    });



    var oldScrollLeft = this.mindmap.containerEL.scrollLeft;
    var oldScrollTop = this.mindmap.containerEL.scrollTop;

    var box  = this.mindmap.getBoundingRect(nodes);
    var rootBox = this.mindmap.root.getPosition();

    var disX =0,disY=0;
    if(box.x>60){
      disX = box.x - 60;
    }

    if(box.y>60){
       disY = box.y - 60;
    }

    this.mindmap.root.setPosition(rootBox.x-disX,rootBox.y-disY);
    this.mindmap.refresh();

    var w = box.width + 120;
    var h = box.height + 120;

    this.mindmap.contentEL.style.width=w+'px';
    this.mindmap.contentEL.style.height=h+'px';

    setTimeout(()=>{
      domtoimage.toPng(this.mindmap.contentEL,{}).then(dataUrl=>{
        var img = new Image()
        img.src = dataUrl;
        var str = img.outerHTML;

         var p= this.mindmap.path.substr(0,this.mindmap.path.length-2);
        try{
          new Notice(p+'html');
          this.app.vault.adapter.write(p+'html', str);
          this.restoreMindmap(rootBox,oldScrollLeft,oldScrollTop)
        }catch(err){
          this.restoreMindmap(rootBox,oldScrollLeft,oldScrollTop)
          new Notice(err);
        }

      }).catch(err=>{
        this.restoreMindmap(rootBox,oldScrollLeft,oldScrollTop)
        new Notice(err);
      })
    },200);

  }

  exportToPng(i_scale: number) {
    if (!this.mindmap) {
      return;
    }

    const { rootBox, oldScrollLeft, oldScrollTop } = this.prepareForExport();

    setTimeout(() => {
      domtoimage.toPng(this.mindmap.contentEL, { scale: i_scale }).then(async (dataUrl: string) => {
        var img = new Image();
        img.src = dataUrl;

        const fileName = this.mindmap.path.replace(/\.md$/, '.png');
        const arrayBuffer = await this.dataURLtoBlob(dataUrl).arrayBuffer();
        this.app.vault.adapter.writeBinary(fileName, arrayBuffer)
          .then(() => {
            new Notice(`Mindmap exported as PNG: ${fileName}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          })
          .catch(err => {
            console.error('Failed to save PNG file:', err);
            new Notice(`Failed to export mindmap as PNG: ${err}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          });

      }).catch(err => {
        this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
        new Notice(`Failed to export mindmap as PNG: ${err}`);
      });
    }, 200);
  }

  exportToJpeg(i_scale: number) {
    if (!this.mindmap) {
      return;
    }

    const { rootBox, oldScrollLeft, oldScrollTop } = this.prepareForExport();

    setTimeout(() => {
      domtoimage.toJpeg(this.mindmap.contentEL, { quality: 1.0, scale: i_scale }).then(async (dataUrl: string) => {
        var img = new Image();
        img.src = dataUrl;

        const fileName = this.mindmap.path.replace(/\.md$/, '.jpeg');
        const arrayBuffer = await this.dataURLtoBlob(dataUrl).arrayBuffer();
        this.app.vault.adapter.writeBinary(fileName, arrayBuffer)
          .then(() => {
            new Notice(`Mindmap exported as JPEG: ${fileName}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          })
          .catch(err => {
            console.error('Failed to save JPEG file:', err);
            new Notice(`Failed to export mindmap as JPEG: ${err}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          });

      }).catch(err => {
        this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
        new Notice(`Failed to export mindmap as JPEG: ${err}`);
      });
    }, 200);
  }

  prepareForExport() {
    if (!this.mindmap) {
      return { rootBox: null, oldScrollLeft: 0, oldScrollTop: 0 };
    }

    var nodes: any[] = [];
    this.mindmap.traverseDF((n: any) => {
      if (n.isShow()) {
        nodes.push(n);
      }
    });

    var oldScrollLeft = this.mindmap.containerEL.scrollLeft;
    var oldScrollTop = this.mindmap.containerEL.scrollTop;

    var box = this.mindmap.getBoundingRect(nodes);
    var rootBox = this.mindmap.root.getPosition();

    var disX = 0, disY = 0;
    if (box.x > 60) {
      disX = box.x - 60;
    }

    if (box.y > 60) {
      disY = box.y - 60;
    }

    this.mindmap.root.setPosition(rootBox.x - disX, rootBox.y - disY);
    this.mindmap.refresh();

    var w = box.width + 120;
    var h = box.height + 120;

    this.mindmap.contentEL.style.width = w + 'px';
    this.mindmap.contentEL.style.height = h + 'px';

    return { rootBox, oldScrollLeft, oldScrollTop };
  }

  restoreMindmap(rootBox: any, left: number, top: number) {
    if (!this.mindmap) {
      return;
    }

    this.mindmap.restoreRuntimeCanvasBounds();
    this.mindmap.root.setPosition(rootBox.x, rootBox.y);
    this.mindmap.refresh();
    this.mindmap.containerEL.scrollTop = top;
    this.mindmap.containerEL.scrollLeft = left;
  }

  dataURLtoBlob(dataUrl: string) {
    var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  mindMapChange() {
    if (this.mindmap) {
      var md = this.mindmap.getMarkdown();
    //  var matchArray: string[] = []
      // var collapsedIds: string[] = []
      // const idRegexMultiline = /.+ \^([a-z0-9\-]+)$/gim
      // while ((matchArray = idRegexMultiline.exec(md)) != null) {
      //   collapsedIds = [...collapsedIds, ...matchArray.slice(1, 2)];
      // }
      // this.fileCache.frontmatter.collapsedIds='';
      // if (collapsedIds.length > 0) {
      //   this.fileCache.frontmatter.collapsedIds = collapsedIds;
      // }
      //var frontMatter = this.getFrontMatter();
      this.data = this.yamlString + md;
      // console.log(this.mindmap.path);
     // this.app.vault.adapter.write(this.mindmap.path, this.data);
       try{
        this.requestSave();
        //new Notice(`${t("Save success")}`);
       }catch(err){
        console.log(err);
        new Notice(`${t("Save fail")}`)
      }
    }
  }

  constructor(leaf: WorkspaceLeaf, plugin: MindMapPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.insertController = new NodeInsertController(this.app);

    this.fileCache = {
      'frontmatter': {
        'mindmap-plugin': 'basic'
      }
    }

  }


  async onClose() {
    // Remove draggables from render, as the DOM has already detached
    //this.plugin.removeView(this);
    this.insertController.destroy();
    this.isStyleInspectorOpen = false;
    this.destroyStyleInspector();
    this.isShortcutInspectorOpen = false;
    this.destroyShortcutInspector();
    this.clearStagingMindmap();
    if (this.mindmap) {
      this.mindmap.clear();
      this.contentEl.innerHTML = '';
      this.mindmap = null;
    }


  }

  clear() {

  }

  getViewData() {
    return this.data;
  }

  setViewData(data: string, clear: boolean) {

    const viewState = this.pendingViewState;
    this.pendingViewState = undefined;
    const oldMindmap = viewState ? this.mindmap : null;

    this.insertController.endEdit();
    this.clearStagingMindmap();
    if (!oldMindmap) {
      this.destroyStyleInspector();
      this.destroyShortcutInspector();
      if (this.mindmap) {
        this.mindmap.clear();
      }
      this.contentEl.innerHTML = '';
    }

    this.data = data;
    this.yamlString = this.getFrontMatterFromData(data);
    this.fileCache = this.file
      ? this.app.metadataCache.getFileCache(this.file)
      : null;

    var mdText = this.getMdText(this.data);
    var mindData = this.mdToData(mdText);
    mindData.isRoot = true;

    // const frontmatterContentRegExResult = /^---$(.+?)^---$.+?/mis.exec(data)

    // if (frontmatterContentRegExResult != null && frontmatterContentRegExResult[1]) {
    //   frontmatterContentRegExResult[1].split('\n').forEach((frontmatterLine) => {
    //     const keyValue = frontmatterLine.split(': ')
    //     if (keyValue.length === 2) {
    //       const value = /^[{\[].+[}\]]$/.test(keyValue[1]) ? JSON.parse(keyValue[1]) : keyValue[1]
    //       this.fileCache.frontmatter[keyValue[0]] = value
    //     }
    //   });
    // }

    this.contentEl.addClass('mm-mindmap-view');
    const mindmapContainerEl = this.contentEl.createDiv({ cls: 'mm-mindmap-canvas' });
    if (oldMindmap) {
      this.prepareStagingMindmapContainer(mindmapContainerEl, oldMindmap.containerEL);
    }
    const mindmap = new MindMap(mindData, mindmapContainerEl, this.plugin.settings);
    if (oldMindmap) {
      this.stagingMindmap = mindmap;
      this.stagingMindmapContainerEl = mindmapContainerEl;
    } else {
      this.mindmap = mindmap;
    }
    mindmap.path = this.file?.path || '';
    mindmap.view = this;
    const styleTemplate = this.prepareMindmapStyle(mindmap);
    if (viewState) {
      mindmap.focusInitialRoot = viewState.hadCanvasFocus;
      const restoreViewState = () => {
        mindmap.off('initialLayoutReady', restoreViewState);
        if (this.stagingMindmap !== mindmap || !oldMindmap) return;
        this.restoreMindMapViewState(mindmap, viewState);
        this.swapStagingMindmap(mindmap, mindmapContainerEl, oldMindmap);
        if (viewState.hadCanvasFocus) {
          if (mindmap.selectNode) {
            mindmap.selectNode.select();
          } else {
            mindmap.appEl.focus({preventScroll: true});
          }
        }
      };
      mindmap.on('initialLayoutReady', restoreViewState);
    }
    mindmap.init();
    applyMindMapStyleTemplate(mindmap, styleTemplate);
    if (!oldMindmap) {
      this.restoreStyleInspector();
      this.restoreShortcutInspector();
    }
  }

  private prepareStagingMindmapContainer(
    containerEl: HTMLElement,
    visibleContainerEl: HTMLElement,
  ): void {
    containerEl.style.position = 'absolute';
    containerEl.style.left = `${visibleContainerEl.offsetLeft}px`;
    containerEl.style.top = `${visibleContainerEl.offsetTop}px`;
    containerEl.style.width = `${visibleContainerEl.clientWidth}px`;
    containerEl.style.height = `${visibleContainerEl.clientHeight}px`;
    containerEl.style.visibility = 'hidden';
    containerEl.style.pointerEvents = 'none';
  }

  private swapStagingMindmap(
    mindmap: MindMap,
    containerEl: HTMLElement,
    oldMindmap: MindMap,
  ): void {
    if (this.stagingMindmap !== mindmap || this.stagingMindmapContainerEl !== containerEl) return;

    this.destroyStyleInspector();
    this.destroyShortcutInspector();
    this.mindmap = mindmap;
    this.stagingMindmap = null;
    this.stagingMindmapContainerEl = null;

    containerEl.style.removeProperty('position');
    containerEl.style.removeProperty('left');
    containerEl.style.removeProperty('top');
    containerEl.style.removeProperty('width');
    containerEl.style.removeProperty('height');
    containerEl.style.removeProperty('visibility');
    containerEl.style.removeProperty('pointer-events');

    oldMindmap.clear();
    oldMindmap.containerEL.remove();
    this.restoreStyleInspector();
    this.restoreShortcutInspector();
  }

  private clearStagingMindmap(): void {
    this.stagingMindmap?.clear();
    this.stagingMindmapContainerEl?.remove();
    this.stagingMindmap = null;
    this.stagingMindmapContainerEl = null;
  }

  onunload() {
    this.app.workspace.offref("quick-preview");
    this.app.workspace.offref("resize");
    this.insertController.destroy();
    this.isStyleInspectorOpen = false;
    this.destroyStyleInspector();
    this.isShortcutInspectorOpen = false;
    this.destroyShortcutInspector();
    this.clearStagingMindmap();

    if (this.mindmap) {
      this.mindmap.clear();
      this.contentEl.innerHTML = '';
      this.mindmap = null;
    }

    this.plugin.setMarkdownView(this.leaf);


  }

  onload() {
    super.onload();
    this.scope = new Scope(this.app.scope);
    this.scope.register(['Mod'], 'b', () => this.formatEditingNode('**', '__'));
    this.scope.register(['Mod'], 'i', () => this.formatEditingNode('_', '*'));
    this.scope.register(['Mod', 'Shift'], 's', () => this.formatEditingNode('~~'));
    this.addAction('palette', t('Choose mindmap style'), () => this.toggleStyleInspector());
    this.addAction('keyboard', t('Manage mindmap shortcuts'), () => this.toggleShortcutInspector());
    this.registerEvent(
      this.app.workspace.on("quick-preview", (file, data) => this.onQuickPreview(file, data), this)
    );
//    this.registerEvent(
//      this.app.workspace.on('resize', () => this.updateMindMap(), this)
//    );
  }

  private prepareMindmapStyle(mindmap: MindMap | null = this.mindmap) {
    const template = resolveMindMapStyleTemplate(this.getCurrentStyleTemplateId());
    this.currentStyleTemplateId = template.id;
    if (mindmap) {
      mindmap.colors = template.branchPalette;
    }
    return template;
  }

  private getCurrentStyleTemplateId(): string {
    const storedStyleTemplate = this.getStyleTemplateIdFromData(this.data)
      || this.fileCache?.frontmatter?.[mindmapStyleTemplateFrontMatterKey];
    if (isMindMapStyleTemplateId(storedStyleTemplate)) return storedStyleTemplate;
    return resolveMindMapStyleTemplate(this.plugin.settings.defaultStyleTemplate).id;
  }

  private getStyleTemplateIdFromData(data: string): string | undefined {
    const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(data)?.[1];
    if (!frontMatter) return undefined;

    const match = /^mindmap-style-template:\s*(?:["']([^"']+)["']|([^\s#]+))\s*$/m.exec(frontMatter);
    return match?.[1] || match?.[2];
  }

  private toggleStyleInspector() {
    if (!this.mindmap) return;
    if (this.styleInspector) {
      this.isStyleInspectorOpen = false;
      this.destroyStyleInspector();
      return;
    }

    this.isShortcutInspectorOpen = false;
    this.destroyShortcutInspector();
    this.isStyleInspectorOpen = true;
    this.restoreStyleInspector();
  }

  private restoreStyleInspector() {
    if (!this.isStyleInspectorOpen || !this.mindmap || this.styleInspector) return;

    this.styleInspector = new MindMapStyleInspector({
      parentEl: this.contentEl,
      currentTemplateId: this.currentStyleTemplateId,
      onPreviewTemplate: (styleTemplate) => this.previewStyleTemplate(styleTemplate.id),
      onRestorePreview: () => this.previewStyleTemplate(this.currentStyleTemplateId),
      onSelectTemplate: (styleTemplate) => this.applyStyleTemplate(styleTemplate.id),
      onClose: () => {
        this.isStyleInspectorOpen = false;
        this.destroyStyleInspector();
      },
    });
    this.styleInspector.open();
  }

  private destroyStyleInspector() {
    this.styleInspector?.destroy();
    this.styleInspector = null;
  }

  private toggleShortcutInspector() {
    if (!this.mindmap) return;
    if (this.shortcutInspector) {
      this.isShortcutInspectorOpen = false;
      this.destroyShortcutInspector();
      return;
    }

    this.isStyleInspectorOpen = false;
    this.destroyStyleInspector();
    this.isShortcutInspectorOpen = true;
    this.restoreShortcutInspector();
  }

  private restoreShortcutInspector() {
    if (!this.isShortcutInspectorOpen || !this.mindmap || this.shortcutInspector) return;

    this.shortcutInspector = new MindMapShortcutInspector({
      parentEl: this.contentEl,
      shortcuts: this.plugin.settings.nodeKeyboardShortcuts,
      pluginShortcuts: () => this.getPluginShortcuts(),
      onChange: (shortcuts) => this.updateNodeKeyboardShortcuts(shortcuts),
      onClose: () => {
        this.isShortcutInspectorOpen = false;
        this.destroyShortcutInspector();
      },
    });
    this.shortcutInspector.open();
  }

  private destroyShortcutInspector() {
    this.shortcutInspector?.destroy();
    this.shortcutInspector = null;
  }

  private async updateNodeKeyboardShortcuts(shortcuts: NodeKeyboardShortcuts) {
    await this.plugin.updateNodeKeyboardShortcuts(shortcuts);
  }

  private formatEditingNode(primaryMarker: string, alternateMarker?: string): false | void {
    const node = this.mindmap?.editNode;
    if (!node?.data.isEdit) return;
    return node.toggleMarkdownFormatting(primaryMarker, alternateMarker) ? false : undefined;
  }

  private getPluginShortcuts() {
    return getPluginShortcutCatalog(this.app, this.plugin.manifest.id);
  }

  private previewStyleTemplate(styleTemplateId: string) {
    if (!this.mindmap) return;
    applyMindMapStyleTemplate(this.mindmap, styleTemplateId);
  }

  private async applyStyleTemplate(styleTemplateId: string) {
    const mindmap = this.mindmap;
    if (!mindmap) return;
    const previousStyleTemplateId = this.currentStyleTemplateId;
    const styleTemplate = applyMindMapStyleTemplate(mindmap, styleTemplateId);

    const file = this.file;
    if (!file) {
      applyMindMapStyleTemplate(mindmap, previousStyleTemplateId);
      throw new Error('Mindmap file is unavailable');
    }
    this.isApplyingStyleTemplate = true;
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter[mindmapStyleTemplateFrontMatterKey] = styleTemplate.id;
      });

      if (this.file !== file) return;
      this.currentStyleTemplateId = styleTemplate.id;
      this.fileCache = this.app.metadataCache.getFileCache(file);
      this.data = await this.app.vault.read(file);
      this.yamlString = this.getFrontMatterFromData(this.data);
    } catch (error) {
      if (this.mindmap === mindmap) {
        applyMindMapStyleTemplate(mindmap, previousStyleTemplateId);
      }
      throw error;
    } finally {
      this.isApplyingStyleTemplate = false;
    }
  }

  private getFrontMatterFromData(data: string): string {
    const frontMatter = /^---\r?\n[\s\S]*?\r?\n---/.exec(data)?.[0];
    return frontMatter ? `${frontMatter}\n\n` : '';
  }

  onQuickPreview(file: TFile, data: string) {
    if (file === this.file && this.isApplyingStyleTemplate) return;
    if (file === this.file && data !== this.data) {
      this.pendingViewState = this.captureMindMapViewState();
      this.fileCache = this.app.metadataCache.getFileCache(file);
      this.setViewData(data, false);
    }
  }

  private captureMindMapViewState(): MindMapViewState | undefined {
    const mindmap = this.mindmap;
    if (!mindmap) return undefined;

    const selectedNode = mindmap.selectNode;
    return {
      selectedNodeId: selectedNode?.getId(),
      selectedNodeText: selectedNode?.data.text,
      selectedNodePath: selectedNode ? this.getNodePath(selectedNode) : undefined,
      hadCanvasFocus: mindmap.appEl.contains(document.activeElement),
      scale: mindmap.mindScale,
      scalePointer: [...mindmap.scalePointer],
      scrollLeft: mindmap.containerEL.scrollLeft,
      scrollTop: mindmap.containerEL.scrollTop,
    };
  }

  private restoreMindMapViewState(mindmap: MindMap, state: MindMapViewState): void {
    mindmap.scalePointer = [...state.scalePointer];
    mindmap.scale(state.scale);
    mindmap.containerEL.scrollLeft = state.scrollLeft;
    mindmap.containerEL.scrollTop = state.scrollTop;

    const selectedNode = this.findRestoredSelectedNode(mindmap, state);
    if (!selectedNode) {
      mindmap.root?.unSelect();
      mindmap.selectNode = null;
      return;
    }

    if (mindmap.selectNode && mindmap.selectNode !== selectedNode) {
      mindmap.selectNode.unSelect();
    }
    selectedNode.select(false);
  }

  private findRestoredSelectedNode(mindmap: MindMap, state: MindMapViewState): INode | undefined {
    if (!state.selectedNodePath) return undefined;

    if (state.selectedNodeId) {
      const idMatch = mindmap.getNodeById(state.selectedNodeId);
      if (idMatch) return idMatch;
    }

    const pathMatch = this.getNodeAtPath(mindmap.root, state.selectedNodePath);
    if (pathMatch?.data.text === state.selectedNodeText) return pathMatch;

    const textMatches: INode[] = [];
    mindmap.traverseDF((node: INode) => {
      if (node.data.text === state.selectedNodeText) textMatches.push(node);
    });
    return textMatches.length === 1 ? textMatches[0] : undefined;
  }

  private getNodePath(node: INode): number[] {
    const path: number[] = [];
    let current = node;
    while (current.parent) {
      path.unshift(current.parent.children.indexOf(current));
      current = current.parent;
    }
    return path;
  }

  private getNodeAtPath(root: INode, path: number[]): INode | undefined {
    let current: INode | undefined = root;
    for (const index of path) {
      current = current?.children[index];
      if (!current) return undefined;
    }
    return current;
  }

  updateMindMap() {
    if (this.mindmap) {
      if(Platform.isDesktopApp){
        this.mindmap.center();
      }
    }
  }

  async onFileMetadataChange(file: TFile) {
    var path = file.path;
    let md = await this.app.vault.adapter.read(path);
    this.onQuickPreview(file, md);
  }

  getMdText(str: string) {
    var md = str.trim().replace(FRONT_MATTER_REGEX, '');
    return md.trim();
  }

  mdToData(str: string) {
    const protectedTables = protectMindMapTables(str);
    function restoreLegacyFormulaBlankLines(text: string) {
      if (!text.includes('$$')) return text;
      const lines = text.split('\n');
      return lines.map((line, index) => {
        if (line.trim() !== 'void') return line;
        const previous = lines[index - 1]?.trim();
        const next = lines[index + 1]?.trim();
        return previous === '$$' || next === '$$' ? '<br>' : line;
      }).join('\n');
    }

    function appendTransformedChildren(target: INodeData[], children: any[]) {
      children.forEach((data: any) => {
        if (
          data.t === 'list_item' &&
          (!data.v?.trim() || data.v.trim() === 'Sub title') &&
          data.c?.length === 1
        ) {
          appendTransformedChildren(target, data.c);
          return;
        }
        target.push(transformData(data));
      });
    }

    function transformData(mapData: any) {
      var flag = true;
      if (mapData.t == 'blockquote') {
        mapData = mapData.c[0];
        flag = false;
        mapData.v = '> ' + mapData.v;
      }
      const regexResult = /^.+ \^([a-z0-9\-]+)$/gim.exec(mapData.v);
      const id = regexResult != null ? regexResult[1] : null

     // console.log(id);

      const rawText = id ? mapData.v.replace(` ^${id}`, '') : mapData.v;
      const text = restoreLeadingOrderedNodeMarker(
        restoreLegacyFormulaBlankLines(rawText),
      );
      var map: INodeData = {
        id: id || uuid(),
        text: restoreProtectedMindMapTables(text, protectedTables.tables),
        children: [],
        expanded: id ? false:true
      };

      if (flag && mapData.c && mapData.c.length) {
        appendTransformedChildren(map.children, mapData.c);
      }

      return map;
    }

    if (str) {
      const { root } = transformer.transform(protectedTables.markdown);
      const data = transformData(root);
      return data;

    } else {
      return {
        id: uuid(),
        text: this.app.workspace.getActiveFile()?.basename || `${t('Untitled mindmap')}`
      }
    }
  }


  onMoreOptionsMenu(menu: Menu) {
    // Add a menu item to force the board to markdown view
    menu
      .addItem((item) => {
        item
          .setTitle(`${t("Open as markdown")}`)
          .setIcon("document")
          .onClick(() => {
            this.plugin.mindmapFileModes[this.id || this.file.path] = "markdown";
            this.plugin.setMarkdownView(this.leaf);
          });
      });

    // .addItem((item)=>{
    //    item
    //    .setTitle(`${t("Export to opml")}`)
    //    .setIcon('image-file')
    //    .onClick(()=>{
    //       const targetFolder = this.plugin.app.fileManager.getNewFileParent(
    //        this.plugin.app.workspace.getActiveFile()?.path || ""
    //       );
    //       if(targetFolder){
    //         console.log(targetFolder,this.plugin.app.fileManager);

    //       }
    //    })

    // })

    super.onPaneMenu(menu,'more-options');
  }

}
