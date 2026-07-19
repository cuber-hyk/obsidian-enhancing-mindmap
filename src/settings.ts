import {
    createDefaultNodeKeyboardShortcuts,
    NodeKeyboardShortcuts,
} from './mindmap/interaction/NodeKeyboardShortcuts';

export class MindMapSettings {
    canvasSize:number = 8000;
    background:string = 'transparent';
    fontSize:number = 16;
    headLevel:number = 2;
    layout:string="mindmap";
    layoutDirect:string = 'mindmap'
    defaultStyleTemplate:string = 'classic-blue';
    color?:string;
    exportMdModel?:string;
    focusOnMove:boolean;
    showLinkTitle:boolean = false;
    nodeKeyboardShortcuts: NodeKeyboardShortcuts = createDefaultNodeKeyboardShortcuts();
}
