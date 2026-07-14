import INode from './INode'
import MindMap  from './mindmap';

export abstract class Command {
    name:string;
    mind?:any;
    constructor(name:string) {
        this.name = name;
    }
    execute(): boolean {return false}
    undo() {}
    redo() {
        this.execute();
    }
    refresh(mind?:any){
            var m = mind||this.mind;
            if(m){
                m.emit('renderEditNode',{});
                m.emit('mindMapChange',{});
            }
    }
}

export class AddNode extends Command {
    node:INode;
    parent:INode = null;
    mind:MindMap =null;
    index:number = -1;
    constructor(node:INode, parent:INode, mind?:MindMap) {
        super('addNode');
        this.node = node;
        this.parent = parent;
        this.mind = mind||this.node.mindmap;
    }
    execute():boolean {
        if (this.index > -1) {
            this.mind.addNode(this.node, this.parent, this.index);   //add node to position of parent children
        } else {
            this.mind.addNode(this.node, this.parent);
        }
        this.node.refreshBox();
        this.refresh();
        this.mind.clearSelectNode();
        setTimeout(()=>{
            this.node.select();
            this.node.edit();
        },0);
        return true; //exit with no error
    }

    undo() {
        var p = this.node.parent;
        this.index = this.mind.removeNode(this.node);
        this.mind.clearSelectNode();
        setTimeout(()=>{
            this.refresh();
            p&&p.select();
        },0)
    }
}


export class RemoveNode extends Command {
    node:INode;
    parent:INode = null;
    mind:MindMap =null;
    index:number = -1;
    constructor(node:INode, mind?:MindMap) {
        super('removeNode');
        this.node = node;
        this.parent = this.node.parent||null;
        this.mind = mind||this.node.mindmap;
    }
    execute():boolean {
        if(this.node.data.isRoot == true){
            return false;
        }
        const nextSelectNode = this.parent?.children[this.node.getIndex() + 1] ||
            this.parent?.children[this.node.getIndex() - 1] ||
            this.parent;
        this.node.clearCacheData();
        this.mind.clearSelectNode();
        this.index = this.mind.removeNode(this.node);
        this.refresh();
        nextSelectNode && nextSelectNode.select();
        return true; //exit with no error
    }

    undo() {
        this.mind.addNode(this.node, this.parent, this.index);
        this.node.clearCacheData();
        this.node.refreshBox();
        this.mind.clearSelectNode();
        this.refresh();
        setTimeout(()=>{
            this.node.select();
        },0)
    }
}


interface RemoveNodesData {
    nodes:INode[];
    primary?:INode;
}

interface RemovedNodeLocation {
    node:INode;
    parent:INode;
    index:number;
    order:number;
}

export class RemoveNodes extends Command {
    nodes:INode[];
    primary?:INode;
    mind:MindMap;
    locations:RemovedNodeLocation[];
    fallback?:INode;

    constructor(data:RemoveNodesData) {
        super('removeNodes');
        const uniqueNodes = [...new Set(data.nodes)];
        const selectedNodes = new Set(uniqueNodes);
        this.nodes = uniqueNodes.filter((node) => {
            if (node.data.isRoot) return false;
            var parent = node.parent;
            while (parent) {
                if (selectedNodes.has(parent)) return false;
                parent = parent.parent;
            }
            return true;
        });
        this.primary = data.primary;
        this.mind = this.nodes[0]?.mindmap;
        this.locations = this.nodes.map((node, order) => ({
            node,
            parent: node.parent,
            index: node.getIndex(),
            order,
        }));
        this.fallback = this.findFallback(this.primary || this.nodes[0]);
    }

    execute():boolean {
        if (
            !this.mind ||
            !this.locations.length ||
            this.locations.some(({node, parent}) => node.parent !== parent || !parent.children.includes(node))
        ) {
            return false;
        }

        this.mind.clearSelectNode();
        this.locations
            .slice()
            .sort((a, b) => a.parent === b.parent ? b.index - a.index : b.order - a.order)
            .forEach(({node}) => {
                node.clearCacheData();
                this.mind.removeNode(node);
            });
        this.refreshAffectedTree();
        this.fallback?.select();
        return true;
    }

    undo() {
        this.mind.clearSelectNode();
        this.locations
            .slice()
            .sort((a, b) => a.parent === b.parent ? a.index - b.index : a.order - b.order)
            .forEach(({node, parent, index}) => {
                this.mind.addNode(node, parent, index);
                node.clearCacheData();
                node.refreshBox();
            });
        this.refreshAffectedTree();
        (this.primary || this.nodes[0])?.select();
    }

    private findFallback(primary?:INode):INode {
        var current = primary;
        while (current?.parent) {
            const parent = current.parent;
            const index = parent.children.indexOf(current);
            const nextSibling = parent.children
                .slice(index + 1)
                .find((node) => !this.isRemoved(node));
            const previousSibling = parent.children
                .slice(0, index)
                .reverse()
                .find((node) => !this.isRemoved(node));
            const candidates = [
                nextSibling,
                previousSibling,
                parent,
            ];
            const fallback = candidates.find((node) => node && !this.isRemoved(node));
            if (fallback) return fallback;
            current = parent;
        }
        return this.mind?.root;
    }

    private isRemoved(node:INode):boolean {
        var current:INode = node;
        while (current) {
            if (this.nodes.includes(current)) return true;
            current = current.parent;
        }
        return false;
    }

    private refreshAffectedTree() {
        new Set(this.locations.map(({parent}) => parent)).forEach((parent) => parent.clearCacheData());
        this.nodes.forEach((node) => {
            this.mind.traverseBF((child:INode) => {
                child.boundingRect = null;
                child.stroke = '';
            }, node);
            node.clearCacheData();
        });
        this.refresh(this.mind);
    }
}


export class ChangeNodeText extends Command {
    node:INode;
    oldText:string;
    text:string;
    isFirst:boolean;
    constructor(node:INode, oldText:string, text:string) {
        super('changeNodeText');
        this.node = node;
        this.oldText = oldText;
        this.text = text;
        this.isFirst = true;
    }
    execute():boolean {
        //if(!this.isFirst){
            this.node.setText(this.text).then(() => {
                this.node.refreshBox();
                this.node.clearCacheData();
                this.refresh(this.node.mindmap);
            });
        //}
        return true; //exit with no error
    }
    undo() {
        this.node.setText(this.oldText).then(() => {
            this.node.clearCacheData();
            this.node.refreshBox();
            this.refresh(this.node.mindmap);
        });
        this.isFirst =false;
    }
}

export class MoveNode extends Command {
    data:any={};
    node:INode;
    oldParent:INode;
    parent:INode;
    newParent?:INode;
    dropNode?:INode;
    type?:string;
    index:number = -1;
    constructor(data:any) {
        super('moveNode');
        this.data = data;
        if (this.data.type.indexOf('child') > -1) {
            this.node = this.data.node;
            this.oldParent = this.data.oldParent;
            this.parent = this.data.parent;
        } else {
            this.node = this.data.node;
            this.oldParent = this.node.parent;
            this.dropNode = this.data.dropNode;
            this.newParent = this.dropNode.parent;
            this.type = this.data.direct;
        }
    }

    execute():boolean {
        this.node.mindmap.clearSelectNode();
        if (this.data.type.indexOf('child') > -1) {
            if (this.oldParent) {
                this.index = this.oldParent.removeChild(this.node)
            }
            this.parent.addChild(this.node);
            this.node.mindmap.traverseBF((n:INode) => {
                n.boundingRect = null;
                n.stroke = ''
            }, this.node);

            this.node.clearCacheData();
            this.oldParent.clearCacheData();
            this.refresh(this.node.mindmap);
            this.node.select();
        } else {

            if (this.oldParent) {
                this.index = this.oldParent.removeChild(this.node);
            }
            this.node.mindmap.traverseBF((n:INode) => {
                n.boundingRect = null;
                n.stroke = ''
            }, this.node);

            this.oldParent.clearCacheData();
            var dropNodeIndex = this.newParent.children.indexOf(this.dropNode);

            if (this.type == 'top' || this.type == 'left') {
                this.newParent.addChild(this.node, dropNodeIndex)
            }
            else {
                this.newParent.addChild(this.node, dropNodeIndex + 1);
            }

            this.node.clearCacheData();
            this.refresh(this.node.mindmap);
            this.node.select();
        }
        return true; //exit with no error
    }

    undo() {
        this.node.mindmap.clearSelectNode();
        if (this.data.type.indexOf('child') > -1) {
            this.parent.removeChild(this.node);
            if (this.oldParent) {
                this.oldParent.addChild(this.node, this.index);
            }

            this.node.mindmap.traverseBF((n:INode) => {
                n.boundingRect = null;
                n.stroke = ''
            }, this.node);

            this.parent.clearCacheData();
            this.node.clearCacheData();
            this.refresh(this.node.mindmap);
            this.node.select();
        }
        else {
            this.newParent.removeChild(this.node);
            this.dropNode.clearCacheData();
            this.oldParent.addChild(this.node, this.index);
            this.node.clearCacheData();
            this.refresh(this.node.mindmap);
            this.node.select();
        }
    }
}

interface MoveNodesData {
    type:string;
    nodes:INode[];
    dropNode:INode;
    direct:string;
}

interface NodeLocation {
    node:INode;
    parent:INode;
    index:number;
    order:number;
}

export class MoveNodes extends Command {
    data:MoveNodesData;
    nodes:INode[];
    dropNode:INode;
    mind:MindMap;
    locations:NodeLocation[];

    constructor(data:MoveNodesData) {
        super('moveNodes');
        this.data = data;
        this.nodes = [...data.nodes];
        this.dropNode = data.dropNode;
        this.mind = data.dropNode.mindmap;
        this.locations = this.nodes.map((node, order) => ({
            node,
            parent: node.parent,
            index: node.getIndex(),
            order,
        }));
    }

    execute():boolean {
        const destinationParent = this.getDestinationParent();
        if (!destinationParent || !this.nodes.length || this.hasInvalidTarget()) return false;

        this.removeNodes();
        let insertionIndex = this.getInsertionIndex(destinationParent);
        this.nodes.forEach((node) => {
            destinationParent.addChild(node, insertionIndex);
            insertionIndex++;
        });
        this.refreshAffectedTree(destinationParent);
        return true;
    }

    undo() {
        const destinationParent = this.getDestinationParent();
        this.removeNodes();
        this.locations
            .slice()
            .sort((a, b) => a.parent === b.parent ? a.index - b.index : a.order - b.order)
            .forEach(({node, parent, index}) => {
                parent.addChild(node, index);
            });
        this.refreshAffectedTree(destinationParent);
    }

    private getDestinationParent():INode {
        return this.data.type === 'child' ? this.dropNode : this.dropNode.parent;
    }

    private getInsertionIndex(destinationParent:INode):number {
        if (this.data.type === 'child') return destinationParent.children.length;

        const dropIndex = destinationParent.children.indexOf(this.dropNode);
        return this.data.direct === 'top' || this.data.direct === 'left'
            ? dropIndex
            : dropIndex + 1;
    }

    private removeNodes() {
        this.nodes.forEach((node) => {
            node.parent?.removeChild(node);
        });
    }

    private hasInvalidTarget():boolean {
        return this.nodes.some((node) => {
            if (node.data.isRoot) return true;
            var current = this.dropNode;
            while (current) {
                if (current === node) return true;
                current = current.parent;
            }
            return false;
        });
    }

    private refreshAffectedTree(destinationParent?:INode) {
        const parents = new Set<INode>([
            destinationParent,
            ...this.locations.map((location) => location.parent),
        ]);
        parents.forEach((parent) => parent?.clearCacheData());
        this.nodes.forEach((node) => {
            this.mind.traverseBF((child:INode) => {
                child.boundingRect = null;
                child.stroke = '';
            }, node);
            node.clearCacheData();
        });
        this.refresh(this.mind);
    }
}


export class MovePos extends Command {
    node:INode;
    oldPos:any;
    newPos:any;
    constructor(node:INode, oldPos:any, newPos:any) {
        super('movePos');
        this.node = node;
        this.oldPos = oldPos;
        this.newPos = newPos;
    }

    execute():boolean {
        this.node.setPosition(this.newPos.x, this.newPos.y);
        this.refresh(this.node.mindmap);
        return true; //exit with no error
    }

    undo() {
        this.node.setPosition(this.oldPos.x, this.oldPos.y);
        this.refresh(this.node.mindmap);
    }
}

export class CollapseNode extends Command{
   node:INode;
   constructor(node:INode){
       super('collapseNOde')
       this.node = node;
       this.node.mindmap.clearSelectNode();

       this.node.refreshBox();
   }
   execute(){
       this.node.clearCacheData();
       this.node.collapse();
       this.refresh(this.node.mindmap);
       this.node.select();
       return true; //exit with no error
   }
   undo(){
    this.node.clearCacheData();
    this.node.expand();
    this.refresh(this.node.mindmap);
    this.node.select();
   }
}

export class ExpandNode extends Command{
    node:INode;
    constructor(node:INode){
        super('collapseNOde')
        this.node = node;
        this.node.mindmap.clearSelectNode();
        this.node.refreshBox();
    }
    execute(){
        this.node.clearCacheData();
        this.node.expand();
        this.refresh(this.node.mindmap);
        this.node.select();
        return true; //exit with no error
    }
    undo(){
     this.node.clearCacheData();
     this.node.collapse();
     this.refresh(this.node.mindmap);
     this.node.select();
    }
 }


 export class PasteNode extends Command {
    node:INode
    data:any
    waitCollapse:any[]=[]
    firstNode:INode
    constructor(node:any, data:any) {
        super('copyNode');
        this.node = node;
        this.data = data;
        this.mind= this.node.mindmap;
        this.waitCollapse = [];
    }

    execute():boolean {
        this.paste();
        return true; //exit with no error
    }

    undo() {
        if (this.firstNode) {
            this.mind.removeNode(this.firstNode);
            this.node.clearCacheData();
           // this.updateItems(this.node);
            this.refresh(this.node.mindmap);
        }
    }

    paste() {
        this.data.forEach((d:any, i:number) => {

            var n = new INode(d, this.mind);

            n.mindmap = this.mind;
            if (!d.isExpand) {
                this.waitCollapse.push(n);
            }
            if (i == 0) {
                n.data.pid = this.node.getId();
                this.mind.addNode(n, this.node);
                this.firstNode = n;
                n.setPosition(0,0);
                n.refreshBox();

            }
            else {
                var parent = this.mind.getNodeById(d.pid);
                if (parent) {
                   this.mind.addNode(n, parent);
                   n.setPosition(0,0);
                   n.refreshBox();

                }
            }

            if (i == this.data.length - 1) {
                n.clearCacheData();
                this.refresh(this.mind);
            }
        });
    }
}
