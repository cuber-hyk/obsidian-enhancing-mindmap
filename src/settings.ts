import {
    createDefaultNodeKeyboardShortcuts,
    NodeKeyboardShortcuts,
} from './mindmap/interaction/NodeKeyboardShortcuts';
import {
    DEFAULT_NODE_WIDTH_SETTINGS,
    NodeWidthSettings,
} from './mindmap/NodeWidthSettings';
import { DEFAULT_NODE_CODE_FONT_SIZE } from './mindmap/code/NodeCodeSettings';

export class MindMapSettings implements NodeWidthSettings {
    canvasSize:number = 8000;
    background:string = 'transparent';
    fontSize:number = 16;
    codeFontSize:number = DEFAULT_NODE_CODE_FONT_SIZE;
    headLevel:number = 2;
    layout:string="mindmap";
    layoutDirect:string = 'mindmap'
    defaultStyleTemplate:string = 'classic-blue';
    color?:string;
    exportMdModel?:string;
    focusOnMove:boolean;
    showLinkTitle:boolean = false;
    textNodeMinWidth:number = DEFAULT_NODE_WIDTH_SETTINGS.textNodeMinWidth;
    textNodeMaxWidth:number = DEFAULT_NODE_WIDTH_SETTINGS.textNodeMaxWidth;
    nodeImageMinWidth:number = DEFAULT_NODE_WIDTH_SETTINGS.nodeImageMinWidth;
    nodeImageMaxWidth:number = DEFAULT_NODE_WIDTH_SETTINGS.nodeImageMaxWidth;
    nodeKeyboardShortcuts: NodeKeyboardShortcuts = createDefaultNodeKeyboardShortcuts();
}
