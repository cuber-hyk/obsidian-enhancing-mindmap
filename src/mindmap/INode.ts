import MindMap from './mindmap'
import {MarkdownRenderer,TFile,parseLinktext,resolveSubpath,setTooltip} from 'obsidian'
import {t} from '../lang/helpers'
import {
    composeNodeMarkdown,
    NodeLinkData,
    parseNodeMarkdown,
} from './link/NodeLinkMarkdown'
import {
    clampNodeImageWidth,
    createNodeImageMarkdown,
    DEFAULT_NODE_IMAGE_WIDTH,
    NodeImageData,
    parseNodeImages,
} from './image/NodeImageMarkdown'
import NodeImagePreviewModal from './image/NodeImagePreviewModal'


export function keepLastIndex(dom:HTMLElement) {
    if ( window.getSelection ) { //ie11 10 9 ff safari
        dom.focus();  //ff
        var range = window.getSelection();
        range.selectAllChildren(dom);
        range.collapseToEnd();
    }
    // else if ( document.selection ) { //ie10 9 8 7 6 5
    //     var range = document.selection.createRange();
    //     range.moveToElementText(dom);
    //     range.collapse(false);
    //     range.select();
    // }
};

interface INode {
    id: string;
    text: string;
    pid?:string;
    mdText?:string;
    isRoot?:Boolean;
    children?:INode[];
    isEdit?:boolean;

}

interface BOX {
    x: number;
    y: number;
    width:number;
    height:number;
    right?:number;
    bottom?:number;
}

export class INodeData implements INode{
    id:string;
    text:string;
    pid?:string;
    mdText?:string;
    isRoot?:Boolean;
    children?:INodeData[]
    expanded?:boolean;
    isEdit?:boolean;
}

export default class Node {
    containEl:HTMLElement;
    contentEl:HTMLElement;
    linkLayerEl:HTMLElement;
    box:BOX = {
        x:0,
        y:0,
        width:0,
        height:0
    };
    mindmap:MindMap;
    isExpand:boolean=true;
    isSelect:boolean = false;
    _oldText?:string;
    _editText?:string;
    _editLinks:NodeLinkData[]=[];
    _editStructureChanged:boolean=false;
    _selectedEditImageEl?:HTMLElement;
    _linkCount:number=0;
    parent?:Node;
    //isRoot?:boolean;
    children:Node[]=[];
    boundingRect:any;
    direct?:string;
    isHide:boolean=false;
    stroke?:string;
    //isEdit:boolean=false;
    _barDom:HTMLElement=null;
    data:any
    constructor( data:INode,mindMap?:MindMap){
       this.data = data;
       this.mindmap = mindMap;
       this.initDom();
    }

    getId(){
        return this.data.id;
    }

    initDom(){
        this.containEl = document.createElement('div');
        this.containEl.classList.add('mm-node');
        this.containEl.setAttribute('contentEditable','false');
        this.containEl.setAttribute('tabIndex','-1');
        this.containEl.setAttribute('data-id',this.data.id);
        this.containEl.setAttribute('draggable','false');

        this.contentEl = document.createElement('div');
        this.contentEl.classList.add('mm-node-content');
        this.containEl.appendChild(this.contentEl);

        this.linkLayerEl = document.createElement('div');
        this.linkLayerEl.classList.add('mm-node-link-layer');
        this.containEl.appendChild(this.linkLayerEl);
        //this.containEl.textContent = this.data.text;
        this.initNodeBar();

        if(this.data.isRoot){
            this.containEl.classList.add('mm-root');
            this.data.isRoot = true;
        }else{
            this.data.isRoot = false;
            this.containEl.classList.remove('mm-root');
        }
        this.parseText();
    }

    initNodeBar(){
        this._barDom = document.createElement('div')
        this._barDom.classList.add('mm-node-bar');
        this.containEl.appendChild(this._barDom);
    }

    parseText(): Promise<void>{
        if (this.data.text.length === 0){
            this.data.text = "Sub title";
        }
        return MarkdownRenderer.renderMarkdown( this.data.text ,this.contentEl,this.mindmap.path||"",this.mindmap.view).then(()=>{
            this.data.mdText = this.contentEl.innerHTML;
            this.refreshBox();
            this.mindmap&&this.mindmap.emit('initNode',{});
            this._delay();
        });

    }

    _delay(){
           this.linkLayerEl.innerHTML = '';
           this.setNodeLinkCount(0);
           const sourceLinks = parseNodeMarkdown(this.data.text).links;
           var linkIndex = 0;
           this.contentEl.querySelectorAll('a').forEach((link) => {
             if (this.decorateNodeLink(link, linkIndex, sourceLinks[linkIndex])) {
                linkIndex++;
             }
           });
           this.setNodeLinkCount(linkIndex);
           if (linkIndex > 0 && !this.data.isEdit) {
                requestAnimationFrame(() => {
                    this.clearTreeCacheData();
                    this.refreshBox();
                    this.mindmap&&this.mindmap.emit('renderEditNode',{node:this});
                });
           }

           //parse md
           this.contentEl.findAll(".internal-embed").forEach(async (el) => {
            const src = el.getAttribute("src");
            if(typeof src ==='string'){
                var pathObj=parseLinktext(src);
                var fileData ='';
               if(this.mindmap&&this.mindmap.view){
                    var f = this.mindmap.view.app.metadataCache.getFirstLinkpathDest(pathObj.path,this.mindmap.path);
                    if(f instanceof TFile&&f.extension ==='md'){
                         fileData = await this.mindmap.view.app.vault.adapter.read(f.path);
                         var markdownEmbed = document.createElement('div');
                         markdownEmbed.classList.add('markdown-embed');
                        //  var  markdownHead = document.createElement('div');
                        //  markdownHead.classList.add('markdown-embed-title');
                        //  markdownHead.innerText=f.basename;
                         markdownEmbed.setAttribute('data-name',f.path);
                         var markdownContent = document.createElement('div');
                         markdownContent.classList.add('markdown-embed-content');
                         var markdownPreview = document.createElement('div');
                         markdownPreview.classList.add('markdown-preview-view');
                         markdownContent.appendChild(markdownPreview);
                         var markdownLink = document.createElement('div');
                         markdownLink.classList.add('markdown-embed-link');
                         markdownLink.setAttribute('aria-label','Open link');
                         markdownLink.innerHTML = `<a data-href="${src}" href="${src}" class="internal-link" target="_blank" rel="noopener"><svg viewBox="0 0 100 100" class="link" width="20" height="20"><path fill="currentColor" stroke="currentColor" d="M74,8c-4.8,0-9.3,1.9-12.7,5.3l-10,10c-2.9,2.9-4.7,6.6-5.1,10.6C46,34.6,46,35.3,46,36c0,2.7,0.6,5.4,1.8,7.8l3.1-3.1 C50.3,39.2,50,37.6,50,36c0-3.7,1.5-7.3,4.1-9.9l10-10c2.6-2.6,6.2-4.1,9.9-4.1s7.3,1.5,9.9,4.1c2.6,2.6,4.1,6.2,4.1,9.9 s-1.5,7.3-4.1,9.9l-10,10C71.3,48.5,67.7,50,64,50c-1.6,0-3.2-0.3-4.7-0.8l-3.1,3.1c2.4,1.1,5,1.8,7.8,1.8c4.8,0,9.3-1.9,12.7-5.3 l10-10C90.1,35.3,92,30.8,92,26s-1.9-9.3-5.3-12.7C83.3,9.9,78.8,8,74,8L74,8z M62,36c-0.5,0-1,0.2-1.4,0.6l-24,24 c-0.5,0.5-0.7,1.2-0.6,1.9c0.2,0.7,0.7,1.2,1.4,1.4c0.7,0.2,1.4,0,1.9-0.6l24-24c0.6-0.6,0.8-1.5,0.4-2.2C63.5,36.4,62.8,36,62,36 z M36,46c-4.8,0-9.3,1.9-12.7,5.3l-10,10c-3.1,3.1-5,7.2-5.2,11.6c0,0.4,0,0.8,0,1.2c0,4.8,1.9,9.3,5.3,12.7 C16.7,90.1,21.2,92,26,92s9.3-1.9,12.7-5.3l10-10C52.1,73.3,54,68.8,54,64c0-2.7-0.6-5.4-1.8-7.8l-3.1,3.1 c0.5,1.5,0.8,3.1,0.8,4.7c0,3.7-1.5,7.3-4.1,9.9l-10,10C33.3,86.5,29.7,88,26,88s-7.3-1.5-9.9-4.1S12,77.7,12,74 c0-3.7,1.5-7.3,4.1-9.9l10-10c2.6-2.6,6.2-4.1,9.9-4.1c1.6,0,3.2,0.3,4.7,0.8l3.1-3.1C41.4,46.6,38.7,46,36,46L36,46z"></path></svg></a>`

                         el.appendChild(markdownEmbed);
                        //  markdownEmbed.appendChild(markdownHead);
                         markdownEmbed.appendChild(markdownContent);
                         markdownEmbed.appendChild(markdownLink);

                        if(pathObj.subpath){
                            var metacache = this.mindmap.view.app.metadataCache.getFileCache(f);
                            var t=resolveSubpath(metacache,pathObj.subpath);
                         //   console.log(t);
                            if(t&&t.start&&t.end){
                              var md =fileData.substring(t.start.offset,t.end.offset);
                             // console.log(md)
                            }else if(t&&t.start&&!t.end){
                                var md = fileData.substr(t.start.offset);
                            }else{
                                var md = fileData||'';
                            }
                        }else{
                            var md=fileData||'';
                        }

                        if(md){
                            MarkdownRenderer.renderMarkdown(md,markdownPreview,this.mindmap.path||"",this.mindmap.view).then(()=>{
                               // this.data.mdText = this.editDom.innerHTML;
                                this.refreshBox();
                                //this._delay();
                                this.mindmap&&this.mindmap.emit('renderEditNode',{node:this});
                            });
                        }

                    }
               }
            }
          });
         //parse image
         setTimeout(()=>{
             this.contentEl.findAll(".internal-embed").forEach((el) => {
                const src = el.getAttribute("src");
                const target =
                  typeof src === "string" &&
                  this.mindmap&&this.mindmap.view?.app.metadataCache.getFirstLinkpathDest(src, this.mindmap.path);
                if (target instanceof TFile && target.extension !== "md" && this.mindmap) {
                  el.innerText = "";
                  el.createEl(
                    "img",
                    { attr: { src: this.mindmap.view.app.vault.getResourcePath(target) } },
                    (img) => {
                      if (el.hasAttribute("width"))
                        img.setAttribute("width", el.getAttribute("width"));
                      else
                        img.setAttribute("width", `${DEFAULT_NODE_IMAGE_WIDTH}`);
                      if (el.hasAttribute("alt"))
                        img.setAttribute("alt", el.getAttribute("alt"));
                    }
                  );
                  el.addClasses(["image-embed", "is-loaded"]);
                }
              });

            //Possible causes of delay,code mathjax
            var dom =this.contentEl.querySelector('code')|| this.contentEl.querySelector('.MathJax');
            if(dom){
                setTimeout(()=>{
                    this.clearCacheData();
                    this.refreshBox();
                    this.mindmap&&this.mindmap.emit('renderEditNode',{});
                },100);
            }
            //image
            this.contentEl.querySelectorAll('img').forEach(element => {
                element.onload = () => {
                        this.clearCacheData();
                        this.refreshBox();
                        this.mindmap&&this.mindmap.emit('renderEditNode',{});
                }
                element.onerror = () => {
                        this.clearCacheData();
                        this.refreshBox();
                        this.mindmap&&this.mindmap.emit('renderEditNode',{});
                }

                element.setAttribute('draggble','false');
            });

         },100)
    }

    decorateNodeLink(link: HTMLAnchorElement, index: number, sourceLink?: NodeLinkData) {
        if (link.querySelector('img') || link.closest('.markdown-embed-link')) {
            return false;
        }

        const href = link.getAttribute('href') || link.getAttribute('data-href') || '';
        const label = sourceLink?.label || link.textContent.trim() || href;
        const visualLink = link.cloneNode(false) as HTMLAnchorElement;

        visualLink.classList.add('mm-node-link');
        visualLink.setAttribute('aria-label', label);
        setTooltip(visualLink, label, {placement: 'top'});
        visualLink.dataset.linkIndex = `${index}`;
        visualLink.style.setProperty('--mm-node-link-offset', `${index * 1.1}em`);
        this.decorateVisualNodeLink(visualLink, label);

        if (!visualLink.classList.contains('internal-link')) {
            visualLink.setAttribute('target', '_blank');
            visualLink.setAttribute('rel', 'noopener noreferrer');
        }

        this.linkLayerEl.appendChild(visualLink);
        link.remove();

        return true;
    }

    select(){
        this.isSelect = true;
        this.containEl.setAttribute('draggable','true');
        //if(this.mindmap.view.plugin.settings.focusOnMove) {
            this.containEl.focus(); // set the dom to be focused
        //}
        Object.assign(window,{
            myNode:this
        });
        if(!this.containEl.classList.contains('mm-node-select')){
            this.containEl.classList.add('mm-node-select')
        }
        this.mindmap.selectNode=this;
    }

    unSelect(){
        this.isSelect = false;
        this.containEl.setAttribute('draggable','false');
        if(this.containEl.classList.contains('mm-node-select')){
            this.containEl.classList.remove('mm-node-select')
        }
    }

    edit(){
        this.contentEl.innerText='';
        this._oldText = this.data.text;
        var editData = parseNodeMarkdown(this.data.text);
        this._editText = editData.text;
        this._editLinks = editData.links;
        this._editStructureChanged = false;
        //var _t =  this.data.text.replace(/\r\n/g,"<br/>")
       // _t = _t.replace(/\n/g,"<br/>");
      //  console.log(_t);
        this.renderEditableContent(this.data.text, editData.links);
        this.renderLinkLayer(editData.links);
        this.contentEl.setAttribute('contentEditable','true');
        this.contentEl.focus();
        this.mindmap.editNode = this;
        this.data.isEdit = true;
        keepLastIndex(this.contentEl);

        if (this.contentEl.innerText == t('Sub title')) {
            this.selectText();
        }

        if(!this.containEl.classList.contains('mm-edit-node')){
            this.containEl.classList.add('mm-edit-node')
        }
        this.mindmap.view?.insertController.beginEdit(this);
    }

    selectText() {
        var text = this.contentEl;
        // if (document.body.createTextRange) {
        //     var range = document.body.createTextRange();
        //     range.moveToElementText(text);
        //     range.select();
        // }
        if (window.getSelection) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(text);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }


    insertText(i_str_1: string) {
        // Replace regular spaces with non-breaking spaces
        const formattedText = i_str_1.replace(/ /g, '\u00A0');

        // Get selection and Create new text
        let l_selection = window.getSelection();
        let l_selectedText = l_selection.toString();

        l_selectedText = formattedText+l_selectedText;

        // Create a new selection range
        let range = l_selection.getRangeAt(0);
        range.deleteContents();
        let textNode = document.createTextNode(l_selectedText);
        range.insertNode(textNode);

        // Unselect modified text
        // l_selection.removeAllRanges();
        // Move the cursor to the end of the inserted text
        // range.setStartAfter(textNode);
        // range.setEndAfter(textNode);

        // Clear the selection and apply the cursor at the end
        l_selection.removeAllRanges();
        l_selection.addRange(range);
    }


    setSelectedText(i_str_1: string, i_str_2: string, i_check: boolean, i_set_as_suffix:boolean, i_select_str: boolean) {
        let l_str_len = i_str_1.length

        // Get selection and Create new text
        let l_selection = window.getSelection();
        let l_selectedText = l_selection.toString();

        // Remove leading space(s)
        let l_leadingSpace = false;
        while (l_selectedText.substring(0,1) == " ") {
            l_selectedText = l_selectedText.substring(1);
            l_leadingSpace = true;
        }

        // Remove trailing space(s)
        let l_trailingSpace = false;
        while (l_selectedText.substring(l_selectedText.length-1) == " ") {
            l_selectedText = l_selectedText.substring(0,l_selectedText.length-1);
            l_trailingSpace = true;
        }

        if(i_check)
        {// Check in case the pre-/suf-fix must be substracted
            if( (l_selectedText.substring(0,l_str_len) == i_str_1)  ||
                (l_selectedText.substring(0,l_str_len) == i_str_2)  )
            {// Prefix must be substracted, bold first
                l_selectedText = l_selectedText.substring(l_str_len); // Remove leading prefix

                if( (l_selectedText.substring(l_selectedText.length-l_str_len) == i_str_1)  ||
                    (l_selectedText.substring(l_selectedText.length-l_str_len) == i_str_2)  )
                {// Suffix must be substracted
                    l_selectedText = l_selectedText.substring(0,l_selectedText.length-l_str_len);
                }
                // else: no trailing prefix
            }
            else if(    (l_selectedText.substring(1,1+l_str_len) == i_str_1)    ||
                        (l_selectedText.substring(1,1+l_str_len) == i_str_2)    )
            {// Prefix must be substracted, italic (?) first
                l_selectedText = l_selectedText[0] + l_selectedText.substring(1+l_str_len); // Remove prefix

                if( (l_selectedText.slice(-l_str_len-1, -1) == i_str_1)   ||
                    (l_selectedText.slice(-l_str_len-1, -1) == i_str_2)   )
                {// Suffix must be substracted
                    l_selectedText = l_selectedText.substring(0,l_selectedText.length-1-l_str_len) +
                        l_selectedText.slice(-1);
                }
                // else: no trailing prefix
            }
            else if(    (l_selectedText.substring(2,2+l_str_len) == i_str_1)  ||
                        (l_selectedText.substring(2,2+l_str_len) == i_str_2)  )
            {// Prefix must be substracted, highlight (?) first
                l_selectedText = l_selectedText.substring(0,l_str_len) + l_selectedText.substring(4); // Remove prefix

                if( (l_selectedText.slice(-2, -2-l_str_len) == i_str_1) ||
                    (l_selectedText.slice(-2, -2-l_str_len) == i_str_2) )
                {// Suffix must be substracted
                    l_selectedText = l_selectedText.substring(0,l_selectedText.length-2-l_str_len) +
                    l_selectedText.slice(-2);
                }
                // else: no trailing prefix
            }
            else {// No pre-/suf-fix: add it
                l_selectedText = i_str_1+l_selectedText;
                if(i_set_as_suffix)
                {   l_selectedText = l_selectedText+i_str_1; }
            }
        }
        else {// No need to check: add the string
            l_selectedText = i_str_1+l_selectedText;
            if(i_set_as_suffix)
            {   l_selectedText = l_selectedText+i_str_1; }
        }

        // Add a leading/trailing space if needed
        if (l_leadingSpace) {
            l_selectedText = (" "+l_selectedText);
        }
        if (l_trailingSpace) {
            l_selectedText = (l_selectedText+" ");
        }


        // Create a new selection range
        let range = l_selection.getRangeAt(0);
        range.deleteContents();
        let textNode = document.createTextNode(l_selectedText);
        range.insertNode(textNode);

        if (!i_select_str) {
            // Unselect modified text
            // l_selection.removeAllRanges();
            // Move the cursor to the end of the inserted text
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);

            // Clear the selection and apply the cursor at the end
            l_selection.removeAllRanges();
            l_selection.addRange(range);
        }
    }


    setSelectedText_italic() {
        // Get selection and Create new text
        let l_selection = window.getSelection();
        let l_selectedText = l_selection.toString();

        // Remove leading space(s)
        let l_leadingSpace = false;
        while (l_selectedText.substring(0,1) == " ") {
            l_selectedText = l_selectedText.substring(1);
            l_leadingSpace = true;
        }

        // Remove trailing space(s)
        let l_trailingSpace = false;
        while (l_selectedText.substring(l_selectedText.length-1) == " ") {
            l_selectedText = l_selectedText.substring(0,l_selectedText.length-1);
            l_trailingSpace = true;
        }

        {// Check in case the pre-/suf-fix must be substracted
            if( (   (   (l_selectedText.substring(0,1)=="*")   ||
                        (l_selectedText.substring(0,1)=="_")    )   &&
                    (l_selectedText.substring(0,2)!="**")           &&
                    (l_selectedText.substring(0,2)!="__")           )   ||
                (l_selectedText.substring(0,3)=="***")                  ||
                (l_selectedText.substring(0,3)=="_**")                  ||
                (l_selectedText.substring(0,3)=="__*")                  ||
                (l_selectedText.substring(0,3)=="___")                  ||
                (l_selectedText.substring(0,3)=="**_")                  ||
                (l_selectedText.substring(0,3)=="*__")                  )
            {// Already italic
                if(l_selectedText.slice(0, 3).includes("_")) {
                    // Replace only the first "_" in the first 3 chars (that make the italic)
                    l_selectedText = l_selectedText.slice(0, 3).replace('_', '') + l_selectedText.slice(3);
                    // Replace only the first "_" in the LAST 3 chars (that make the italic)
                    l_selectedText = l_selectedText.slice(0, -3) + l_selectedText.slice(-3).replace('_', '');
                }
                else{// A "*" is making the italic
                    l_selectedText = l_selectedText.slice(0, 3).replace('*', '') + l_selectedText.slice(3);
                    l_selectedText = l_selectedText.slice(0, -3) + l_selectedText.slice(-3).replace('*', '');
                }
            }
            else {// No pre-/suf-fix: add it
                l_selectedText = "_"+l_selectedText+"_";
                // Used to use "*" to allow bold/italic change in whatever order
                // However "***" is not displayed as bold + italic, so use _ for italic and * for bold
            }
        }

        // Add a leading/trailing space if needed
        if (l_leadingSpace) {
            l_selectedText = (" "+l_selectedText);
        }
        if (l_trailingSpace) {
            l_selectedText = (l_selectedText+" ");
        }

        // Create a new selection range
        let range = l_selection.getRangeAt(0);
        range.deleteContents();
        let textNode = document.createTextNode(l_selectedText);
        range.insertNode(textNode);

        // Unselect modified text
        //selection.removeAllRanges();
    }


    cancelEdit(){
        console.log("CancelEdit");
        var text = this.getMarkdownFromEditedText();
        if(text.length == 0 && !this._editStructureChanged){
            text = this._oldText
        }else if(text.length == 0){
            text = t('Sub title')
        }

        this.contentEl.setAttribute('contentEditable','false');
        this.data.isEdit = false;
        this._editText = '';
        this._editLinks = [];
        this._editStructureChanged = false;
        this._selectedEditImageEl = undefined;

        if(this.containEl.classList.contains('mm-edit-node')){
            this.containEl.classList.remove('mm-edit-node')
        }
        this.mindmap.view?.insertController.endEdit(this);

        if(text != this._oldText){
            this.mindmap.execute('changeNodeText',{
                node:this,
                text,
                oldText:this._oldText
            });
        }else{
            this.setText(text);
        }

    }

    getMarkdownFromEditedText() {
        const text = this.getEditedContentMarkdown().trim();
        if (!this._editLinks.length) {
            return text;
        }

        const oldEditData = parseNodeMarkdown(this._oldText || '');
        const isOriginalEditState =
            text === oldEditData.text &&
            this._editLinks.length === oldEditData.links.length &&
            this._editLinks.every((link, index) => link.markdown === oldEditData.links[index].markdown);

        if (isOriginalEditState) {
            return this._oldText || text;
        }

        return composeNodeMarkdown(text, this._editLinks);
    }

    renderEditableContent(markdown: string, links: NodeLinkData[]) {
        this.contentEl.innerHTML = '';
        const images = parseNodeImages(markdown);
        const items = [
            ...links.map((link) => ({type: 'link' as const, start: link.start, end: link.end})),
            ...images.map((image) => ({type: 'image' as const, start: image.start, end: image.end, image})),
        ].sort((a, b) => a.start - b.start);

        let textStart = 0;
        items.forEach((item) => {
            if (item.start < textStart) return;
            this.appendEditableText(markdown.slice(textStart, item.start));
            if (item.type === 'image') {
                this.contentEl.appendChild(this.createEditableImage(item.image));
            }
            textStart = item.end;
        });
        this.appendEditableText(markdown.slice(textStart));
    }

    appendEditableText(text: string) {
        if (!text) return;
        this.contentEl.appendChild(this.contentEl.ownerDocument.createTextNode(text));
    }

    createEditableImage(image: NodeImageData): HTMLElement {
        const wrapper = this.contentEl.ownerDocument.createElement('span');
        wrapper.classList.add('mm-node-image-attachment');
        wrapper.setAttribute('contenteditable', 'false');
        wrapper.setAttribute('tabindex', '0');
        wrapper.dataset.imageKind = image.kind;
        wrapper.dataset.imageTarget = image.target;
        wrapper.dataset.imageAlt = image.alt;
        wrapper.dataset.imageWidth = `${clampNodeImageWidth(image.width || DEFAULT_NODE_IMAGE_WIDTH)}`;

        const img = this.contentEl.ownerDocument.createElement('img');
        img.draggable = false;
        img.alt = image.alt;
        img.width = Number(wrapper.dataset.imageWidth);
        img.src = this.resolveNodeImageSrc(image);
        wrapper.appendChild(img);

        const handle = this.contentEl.ownerDocument.createElement('span');
        handle.classList.add('mm-node-image-resize-handle');
        wrapper.appendChild(handle);

        wrapper.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.selectEditImage(wrapper);
        });
        wrapper.addEventListener('dblclick', (event) => {
            if ((event.target as HTMLElement).closest('.mm-node-image-resize-handle')) return;
            event.preventDefault();
            event.stopPropagation();
            this.selectEditImage(wrapper);

            const app = this.mindmap?.view?.app;
            if (!app) return;
            const modal = new NodeImagePreviewModal(
                app,
                img.currentSrc || img.src,
                img.alt,
                () => {
                    if (this.data.isEdit && this.contentEl.contains(wrapper)) {
                        this.selectEditImage(wrapper);
                    }
                },
            );
            modal.open();
        });
        handle.addEventListener('mousedown', (event) => {
            this.startImageResize(event, wrapper);
        });

        return wrapper;
    }

    resolveNodeImageSrc(image: NodeImageData): string {
        if (image.kind === 'vault' && this.mindmap?.view) {
            const target = this.mindmap.view.app.metadataCache.getFirstLinkpathDest(image.target, this.mindmap.path);
            if (target instanceof TFile) {
                return this.mindmap.view.app.vault.getResourcePath(target);
            }
        }
        return image.target;
    }

    selectEditImage(imageEl: HTMLElement) {
        this.clearSelectedEditImage();
        this._selectedEditImageEl = imageEl;
        imageEl.classList.add('is-selected');
        imageEl.focus();
    }

    clearSelectedEditImage() {
        if (!this._selectedEditImageEl) return;
        this._selectedEditImageEl.classList.remove('is-selected');
        this._selectedEditImageEl = undefined;
    }

    deleteEditImageByKeyboard(key: string): boolean {
        const imageEl = this.getImageForKeyboardDelete(key);
        if (!imageEl) {
            return false;
        }
        this.deleteEditImageElement(imageEl);
        return true;
    }

    getImageForKeyboardDelete(key: string): HTMLElement | null {
        if (this._selectedEditImageEl && this.contentEl.contains(this._selectedEditImageEl)) {
            return this._selectedEditImageEl;
        }

        const selection = this.contentEl.ownerDocument.defaultView?.getSelection();
        if (!selection || selection.rangeCount === 0) return null;
        const range = selection.getRangeAt(0);
        if (!this.contentEl.contains(range.commonAncestorContainer)) return null;

        const anchorEl = this.getElementFromSelectionNode(selection.anchorNode);
        const selectedImage = anchorEl?.closest('.mm-node-image-attachment');
        if (selectedImage instanceof HTMLElement && this.contentEl.contains(selectedImage)) {
            return selectedImage;
        }

        if (!range.collapsed) {
            const images = Array.from(this.contentEl.querySelectorAll('.mm-node-image-attachment'));
            return images.find((image) => range.intersectsNode(image)) as HTMLElement || null;
        }

        const adjacent = key === 'Backspace'
            ? this.getPreviousEditableNode(range.startContainer, range.startOffset)
            : this.getNextEditableNode(range.startContainer, range.startOffset);
        if (adjacent instanceof HTMLElement) {
            const adjacentImage = adjacent.closest('.mm-node-image-attachment');
            if (adjacentImage instanceof HTMLElement && this.contentEl.contains(adjacentImage)) {
                return adjacentImage;
            }
        }
        return null;
    }

    deleteEditImageElement(imageEl: HTMLElement) {
        imageEl.remove();
        this._selectedEditImageEl = undefined;
        this._editStructureChanged = true;
        this.normalizeEditContentAfterImageDelete();
        this.refreshEditingLayout();
    }

    normalizeEditContentAfterImageDelete() {
        const text = this.getEditedContentMarkdown().trim();
        const hasImage = Boolean(this.contentEl.querySelector('.mm-node-image-attachment'));
        if (!text && !hasImage) {
            this.contentEl.innerText = t('Sub title');
            this.selectText();
            return;
        }

        this.contentEl.focus();
        keepLastIndex(this.contentEl);
    }

    getElementFromSelectionNode(node: globalThis.Node | null): HTMLElement | null {
        if (node instanceof HTMLElement) return node;
        return node?.parentNode instanceof HTMLElement ? node.parentNode : null;
    }

    getPreviousEditableNode(container: globalThis.Node, offset: number): globalThis.Node | null {
        if (container === this.contentEl) {
            return this.contentEl.childNodes[offset - 1] || null;
        }
        if (container instanceof Text && offset > 0) return null;
        let node: globalThis.Node | null = container;
        while (node && node !== this.contentEl) {
            if (node.previousSibling) return this.getDeepLastNode(node.previousSibling);
            node = node.parentNode;
        }
        return null;
    }

    getNextEditableNode(container: globalThis.Node, offset: number): globalThis.Node | null {
        if (container === this.contentEl) {
            return this.contentEl.childNodes[offset] || null;
        }
        if (container instanceof Text && offset < container.length) return null;
        let node: globalThis.Node | null = container;
        while (node && node !== this.contentEl) {
            if (node.nextSibling) return this.getDeepFirstNode(node.nextSibling);
            node = node.parentNode;
        }
        return null;
    }

    getDeepLastNode(node: globalThis.Node): globalThis.Node {
        let current = node;
        while (current.lastChild) {
            current = current.lastChild;
        }
        return current;
    }

    getDeepFirstNode(node: globalThis.Node): globalThis.Node {
        let current = node;
        while (current.firstChild) {
            current = current.firstChild;
        }
        return current;
    }

    startImageResize(event: MouseEvent, imageEl: HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        this.selectEditImage(imageEl);

        const startX = event.clientX;
        const startWidth = Number(imageEl.dataset.imageWidth) || DEFAULT_NODE_IMAGE_WIDTH;
        const doc = imageEl.ownerDocument;

        const move = (moveEvent: MouseEvent) => {
            const width = clampNodeImageWidth(startWidth + moveEvent.clientX - startX);
            imageEl.dataset.imageWidth = `${width}`;
            const img = imageEl.querySelector('img');
            if (img instanceof HTMLImageElement) {
                img.width = width;
            }
            this._editStructureChanged = true;
        };
        const up = () => {
            doc.removeEventListener('mousemove', move);
            doc.removeEventListener('mouseup', up);
            this.refreshEditingLayout();
        };

        doc.addEventListener('mousemove', move);
        doc.addEventListener('mouseup', up);
    }

    getEditedContentMarkdown(): string {
        const parts: string[] = [];
        this.contentEl.childNodes.forEach((child) => {
            if (child instanceof Text) {
                parts.push(child.textContent || '');
                return;
            }
            if (!(child instanceof HTMLElement)) return;
            if (child.classList.contains('mm-node-image-attachment')) {
                const image = this.readEditedImage(child);
                if (image) parts.push(createNodeImageMarkdown(image));
                return;
            }
            parts.push(child.innerText || '');
        });
        return parts.join('');
    }

    readEditedImage(imageEl: HTMLElement): NodeImageData | null {
        const target = imageEl.dataset.imageTarget || '';
        if (!target) return null;
        const kind = imageEl.dataset.imageKind === 'markdown' ? 'markdown' : 'vault';
        const width = clampNodeImageWidth(Number(imageEl.dataset.imageWidth) || DEFAULT_NODE_IMAGE_WIDTH);
        return {
            markdown: '',
            target,
            alt: imageEl.dataset.imageAlt || '',
            width,
            kind,
            start: 0,
            end: 0,
        };
    }

    refreshEditingLayout() {
        this.clearTreeCacheData();
        this.refreshBox();
        this.mindmap&&this.mindmap.emit('renderEditNode',{node:this});
    }

    renderLinkLayer(links: NodeLinkData[]) {
        this.linkLayerEl.innerHTML = '';
        this.setNodeLinkCount(links.length);
        links.forEach((link, index) => {
            const visualLink = this.linkLayerEl.ownerDocument.createElement('a');
            visualLink.classList.add('mm-node-link');
            if (link.kind === 'vault') {
                visualLink.classList.add('internal-link');
                visualLink.setAttribute('href', link.href);
                visualLink.setAttribute('data-href', link.href);
            } else {
                visualLink.setAttribute('href', link.href);
                visualLink.setAttribute('target', '_blank');
                visualLink.setAttribute('rel', 'noopener noreferrer');
            }
            const label = link.label || link.href;
            visualLink.setAttribute('aria-label', label);
            setTooltip(visualLink, label, {placement: 'top'});
            visualLink.dataset.linkIndex = `${index}`;
            visualLink.style.setProperty('--mm-node-link-offset', `${index * 1.1}em`);
            this.decorateVisualNodeLink(visualLink, label);
            this.linkLayerEl.appendChild(visualLink);
        });
        requestAnimationFrame(() => {
            this.syncLinkLayerPosition();
        });
    }

    decorateVisualNodeLink(visualLink: HTMLAnchorElement, label: string) {
        visualLink.textContent = '';
        if (!this.shouldShowLinkTitle()) return;

        const titleEl = visualLink.ownerDocument.createElement('span');
        titleEl.classList.add('mm-node-link-title');
        titleEl.textContent = label;
        visualLink.appendChild(titleEl);
    }

    shouldShowLinkTitle(): boolean {
        return Boolean(this.mindmap?.setting?.showLinkTitle);
    }

    getDisplayedLinks(): NodeLinkData[] {
        const links = this.data.isEdit
            ? this._editLinks
            : parseNodeMarkdown(this.data.text).links;
        return links.map((link) => ({...link}));
    }

    setEditedLinks(links: NodeLinkData[]) {
        if (!this.data.isEdit) return;
        this._editLinks = links.map((link) => ({...link}));
        this.renderLinkLayer(this._editLinks);
    }

    setNodeLinkCount(count: number) {
        this._linkCount = count;
        if (count > 0) {
            this.containEl.classList.add('mm-node-has-link');
            this.containEl.classList.toggle('mm-node-show-link-title', this.shouldShowLinkTitle());
            this.containEl.style.setProperty('--mm-node-link-space', `${0.35 + count * 1.1}em`);
            requestAnimationFrame(() => {
                this.syncLinkLayerPosition();
            });
        } else {
            this.containEl.classList.remove('mm-node-has-link');
            this.containEl.classList.remove('mm-node-show-link-title');
            this.containEl.style.removeProperty('--mm-node-link-space');
            this.containEl.style.removeProperty('--mm-node-link-layer-left');
        }
    }

    syncLinkLayerPosition() {
        if (this._linkCount <= 0) {
            this.containEl.style.removeProperty('--mm-node-link-layer-left');
            return;
        }

        const fontSize = parseFloat(getComputedStyle(this.contentEl).fontSize) || 16;
        const iconGap = 0.35 * fontSize;
        const linkLayerWidth = this.linkLayerEl.scrollWidth || this.linkLayerEl.offsetWidth;
        const linkSpace = this.shouldShowLinkTitle()
            ? Math.ceil(linkLayerWidth + iconGap)
            : (0.35 + this._linkCount * 1.1) * fontSize;
        if (this.shouldShowLinkTitle()) {
            this.containEl.style.setProperty('--mm-node-link-space', `${linkSpace}px`);
        }
        const left = Math.max(0, this.contentEl.offsetWidth - linkSpace + iconGap);
        this.containEl.style.setProperty('--mm-node-link-layer-left', `${left}px`);
    }

    refreshEditText() {
        if (!this.data.isEdit) return;

        const rawMarkdown = this.getEditedContentMarkdown().trim() || '';
        const editData = parseNodeMarkdown(rawMarkdown);
        this._editText = editData.text;
        this._editLinks = [...this._editLinks, ...editData.links];
        this.renderEditableContent(rawMarkdown, editData.links);
        this.renderLinkLayer(this._editLinks);
        keepLastIndex(this.contentEl);
    }

    getLevel() {
        var level = 0, parent = this.parent;

        if(!this.data.isRoot){
            level++;
            while (parent && parent != this.mindmap.root) {
                level++;
                parent = parent.parent;
            }
        }
        return level;
    }


    getIndex() {
        var l_index = 0;
        if(!this.data.isRoot)
        { l_index = this.parent.children.indexOf(this); }
        return l_index;
    }


    getChildren(){
        return this.children;
    }

    setPosition(x:number,y:number){
        this.box.x=x;
        this.box.y=y;
        this.containEl.style.left = x + 'px';
        this.containEl.style.top = y + 'px';
    }

    getPosition(){
        return {
            x:this.box.x,
            y:this.box.y
        }
    }

    getDimensions(){
        return {
            x:this.box.width,
            y:this.box.height
        }
    }

    move(dx:number, dy:number) {
        var p = this.getPosition();
        this.setPosition(p.x + dx, p.y + dy);
    }

    getData(){
        return JSON.parse(JSON.stringify(this.data))
    }

    refreshBox(){
        this.syncLinkLayerPosition();
        this.box = this.getDomBox();
    }

    getBox(){
        return {...{},...this.box};
    }

    getCBox(){
        return {...{},...this.box};
    }

    getDomBox(){
        var t = parseInt(this.containEl.style.top);
        var l = parseInt(this.containEl.style.left);
        var w = Math.ceil(this.contentEl.offsetWidth);
        var h = Math.ceil(this.contentEl.offsetHeight);
        if (this.shouldShowLinkTitle() && this._linkCount > 0) {
            const linkLeft = parseFloat(this.containEl.style.getPropertyValue('--mm-node-link-layer-left')) || 0;
            const linkWidth = this.linkLayerEl.scrollWidth || this.linkLayerEl.offsetWidth;
            w = Math.max(w, Math.ceil(linkLeft + linkWidth));
        }

        return {
            x: l,
            y: t,
            width: w,
            height: h,
            th:0,
            bh:0
        }
    }

    getShowNodeList(){
        var list = [];
        (function getList(node:Node) {
            if (node.isShow()) {
                list.push(node);
            }
            node.children.forEach((n) => {
                getList(n);
            });
        })(this);

        return list;
    }

    getSiblings() {
        if (this.parent) {
            return this.parent.children.filter(item => item != this);
        } else {
            return [];
        }
    }


    getPreviousSibling() {
        var returnedNode = (this as Node);

        if (this.parent) {
            var searchedIdx = this.getIndex()-1;
            if(searchedIdx < 0)
            {// This is the first sibling -> return the last one.
                searchedIdx = this.parent.children.length-1;
            }
            // else: searchedIdx already set.

            // Search the sibling
            var sibs = this.getSiblings();
            sibs.forEach((sib) => {
                if (sib.getIndex() == searchedIdx) {
                    returnedNode = sib;
                }
                // else: not the previous sibling
            })
        }
        // else: no node to search

        return returnedNode;
    }

    getNextSibling() {
        var returnedNode = (this as Node);

        if (this.parent) {
            var searchedIdx = this.getIndex()+1;

            if(searchedIdx >= this.parent.children.length)
            {// This is the last sibling -> return the first one.
                searchedIdx = 0;
            }
            // else: searchedIdx already set.

            // Search the sibling
            var sibs = this.getSiblings();
            sibs.forEach((sib) => {
                if (sib.getIndex() == searchedIdx) {
                    returnedNode = sib;
                }
                // else: not the next sibling
            })
        }
        // else: no node to search

        return returnedNode;
    }

    getAllNextSiblings() {
        if (this.parent) {
            // Return all the next siblings
            return this.parent.children.filter(item => item.getIndex() > this.getIndex());
        } else {
            return [];
        }
    }


    getFirstSibling() {
        var returnedNode = (this as Node);
        var searchedIdx = 0;

        // Search the sibling
        var sibs = this.getSiblings();
        sibs.forEach((sib) => {
            if (sib.getIndex() == searchedIdx) {
                returnedNode = sib;
            }
            // else: not the next sibling
        })

        return returnedNode;
    }

    getLastSibling() {
        var returnedNode = (this as Node);
        var searchedIdx = this.parent.children.length-1;

        // Search the sibling
        var sibs = this.getSiblings();
        sibs.forEach((sib) => {
            if (sib.getIndex() == searchedIdx) {
                returnedNode = sib;
            }
            // else: not the next sibling
        })

        return returnedNode;
    }


    isLeaf() {
        return !this.children.length
    }


    isShow() {
        return !this.isHide;
    }

    show(){
        this.containEl.style.display="block";
        this.isHide=false
    }

    hide(){
        this.containEl.style.display="none";
        this.isHide=true
    }

    clearCacheData(){
        var anchor:Node = this;
        while(anchor){
            anchor.boundingRect=null;
            anchor = anchor.parent;
        }
    }

    clearTreeCacheData() {
        const root = this.mindmap?.root || this;
        (function clear(node: Node) {
            node.boundingRect = null;
            node.children.forEach((child) => clear(child));
        })(root);
    }

    addChild(node:Node, i?:number) {
        if (this.children.indexOf(node) == -1) {
            if (i > -1) {
                if (i > this.children.length) i = this.children.length;
                this.children.splice(i, 0, node);
            } else {
                this.children.push(node);
            }
            node.parent = this;
        }
    }

    removeChild(child:Node) {
        var index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
        return index;
    }

    setText(text:string): Promise<void> {
        this.data.text = text;
        this.contentEl.innerHTML='';
        return this.parseText();
    }

    removeLineBreak() {
        var l_newText = this.data.text.replace('<br>', ' ');
        this.mindmap.execute('changeNodeText',{
            node:this,
            text:l_newText,
            oldText:this.data.text
        });
    }

    expand(){
        this.isExpand =true;
        function show(node:Node) {
            node.show();
            node.refreshBox();
            node.boundingRect = null;
            if (node.isExpand) {
                node.children.forEach(c => {
                    show(c)
                });
            }
        };
        show(this);
        if(this.containEl.classList.contains('mm-node-collapse')){
            this.containEl.classList.remove('mm-node-collapse')
        }
    }

    collapse(){

        this.isExpand = false;
        function hide(node:Node) {
            node.hide();
            if (node.isExpand) {
                node.children.forEach(c => {
                    hide(c);
                });
            }
        };

        this.children.forEach((c:Node) => {
            hide(c);
        });

        if(!this.containEl.classList.contains('mm-node-collapse')){
            this.containEl.classList.add('mm-node-collapse')
        }
    }



}
