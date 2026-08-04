import INode, { INodeData } from './INode'
import MindMap  from './mindmap';
import {
    captureOrderedSiblingGroups,
    findOrderedSiblingGroup,
    getNumberedChildTextUpdates,
    getOrderedSiblingNumbering,
    getOrderedSiblingTextUpdates,
    OrderedSiblingGroupSnapshot,
} from './interaction/OrderedSiblingNumbering';

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
            this.node.edit({ selectAll: true });
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

interface NodeTextChange {
    node:INode;
    oldText:string;
    text:string;
}

interface ParentNumberingSnapshot {
    parent:INode;
    groups:OrderedSiblingGroupSnapshot<INode>[];
}

function captureParentNumbering(parent:INode):ParentNumberingSnapshot {
    return {
        parent,
        groups: captureOrderedSiblingGroups(
            parent.children.map((node) => ({item: node, text: node.data.text}))
        ),
    };
}

function getNumberingTextChanges(
    snapshot:ParentNumberingSnapshot,
    options: {
        additionalGroups?:OrderedSiblingGroupSnapshot<INode>[];
        preferredGroup?:OrderedSiblingGroupSnapshot<INode>;
        adoptNodes?:INode[];
    } = {},
):NodeTextChange[] {
    const groups = [...snapshot.groups, ...(options.additionalGroups || [])];
    return getOrderedSiblingTextUpdates(
        snapshot.parent.children.map((node) => ({item: node, text: node.data.text})),
        groups,
        {
            preferredGroup: options.preferredGroup,
            adoptItems: options.adoptNodes,
        },
    ).map(({item, text}) => ({
        node: item,
        oldText: item.data.text,
        text,
    }));
}

function mergeNumberingTextChanges(changes:NodeTextChange[]):NodeTextChange[] {
    const merged = new Map<INode, NodeTextChange>();
    changes.forEach((change) => {
        const current = merged.get(change.node);
        merged.set(change.node, current
            ? {...change, oldText: current.oldText}
            : change
        );
    });
    return [...merged.values()].filter(({oldText, text}) => oldText !== text);
}

function applyNumberingTextChanges(changes:NodeTextChange[], useNewText:boolean):void {
    changes.forEach(({node, oldText, text}) => {
        node.setText(useNewText ? text : oldText);
        node.clearCacheData();
        node.refreshBox();
    });
}

export class NumberChildNodes extends Command {
    parent:INode;
    mind:MindMap;
    textChanges:NodeTextChange[];

    constructor(parent:INode) {
        super('numberChildNodes');
        this.parent = parent;
        this.mind = parent.mindmap;
        this.textChanges = getNumberedChildTextUpdates(
            parent.children.map((node) => ({item: node, text: node.data.text}))
        ).map(({item, text}) => ({
            node: item,
            oldText: item.data.text,
            text,
        }));
    }

    execute():boolean {
        if (
            !this.hasChanges() ||
            this.textChanges.some(({node}) => node.parent !== this.parent)
        ) {
            return false;
        }
        this.applyTextChanges(true);
        return true;
    }

    undo() {
        this.applyTextChanges(false);
    }

    hasChanges():boolean {
        return this.textChanges.length > 0;
    }

    private applyTextChanges(useNewText:boolean) {
        const expectedTexts = new Map<INode, string>();
        const renders = this.textChanges.map(({node, oldText, text}) => {
            const expectedText = useNewText ? text : oldText;
            expectedTexts.set(node, expectedText);
            return node.setText(expectedText);
        });
        void Promise.all(renders).then(() => {
            this.parent.clearCacheData();
            this.textChanges.forEach(({node}) => {
                if (node.data.text !== expectedTexts.get(node)) return;
                node.clearCacheData();
                node.refreshBox();
            });
            this.refresh(this.mind);
        });
    }
}

function getMovedOrderedGroups(
    snapshots:ParentNumberingSnapshot[],
    movedNodes:INode[],
):OrderedSiblingGroupSnapshot<INode>[] {
    const movedGroups:OrderedSiblingGroupSnapshot<INode>[] = [];
    snapshots.forEach(({groups}) => {
        groups.forEach((group) => {
            if (group.items.some((item) => movedNodes.includes(item))) movedGroups.push(group);
        });
    });
    return movedGroups;
}

function getDestinationOrderedGroup(
    snapshot:ParentNumberingSnapshot,
    movedNodes:INode[],
):OrderedSiblingGroupSnapshot<INode> | undefined {
    const indices = movedNodes
        .map((node) => snapshot.parent.children.indexOf(node))
        .filter((index) => index >= 0);
    if (!indices.length) return undefined;

    const firstIndex = Math.min(...indices);
    const lastIndex = Math.max(...indices);
    const leftNode = snapshot.parent.children[firstIndex - 1];
    const rightNode = snapshot.parent.children[lastIndex + 1];
    return findOrderedSiblingGroup(snapshot.groups, leftNode) ||
        findOrderedSiblingGroup(snapshot.groups, rightNode);
}

export class AddSiblingNode extends Command {
    node:INode;
    reference:INode;
    parent:INode;
    mind:MindMap;
    index:number;
    textChanges:NodeTextChange[] = [];
    selectionOffset:number = 0;
    initialized:boolean = false;

    constructor(node:INode, reference:INode, direct:'top'|'down') {
        super('addSiblingNode');
        this.node = node;
        this.reference = reference;
        this.parent = reference.parent;
        this.mind = reference.mindmap;
        this.index = reference.getIndex() + (direct === 'top' ? 0 : 1);
    }

    execute():boolean {
        if (!this.parent || !this.parent.children.includes(this.reference)) return false;
        if (!this.initialized) this.initializeTextChanges();

        this.textChanges.forEach(({node, text}) => node.setText(text));
        this.mind.addNode(this.node, this.parent, this.index);
        this.refreshNodes();
        this.mind.clearSelectNode();
        setTimeout(() => {
            this.node.select();
            if (this.selectionOffset > 0) {
                this.node.edit({ selectFrom: this.selectionOffset });
            } else {
                this.node.edit({ selectAll: true });
            }
        }, 0);
        return true;
    }

    undo() {
        this.mind.removeNode(this.node);
        this.textChanges.forEach(({node, oldText}) => {
            if (node !== this.node) node.setText(oldText);
        });
        this.refreshNodes();
        this.mind.clearSelectNode();
        this.reference.select();
    }

    private initializeTextChanges() {
        this.initialized = true;
        const numbering = getOrderedSiblingNumbering(
            this.parent.children.map((node) => node.data.text),
            this.reference.getIndex(),
            this.index,
            this.node.data.text,
        );
        if (!numbering) return;

        const group = this.parent.children.slice(
            numbering.startIndex,
            numbering.startIndex + numbering.texts.length - 1,
        );
        group.splice(this.index - numbering.startIndex, 0, this.node);
        group.forEach((node, offset) => {
            this.textChanges.push({
                node,
                oldText: node.data.text,
                text: numbering.texts[offset],
            });
        });
        this.selectionOffset = numbering.selectionOffset;
    }

    private refreshNodes() {
        this.parent.clearCacheData();
        this.textChanges.forEach(({node}) => {
            node.clearCacheData();
            node.refreshBox();
        });
        this.refresh(this.mind);
    }
}


export class RemoveNode extends Command {
    node:INode;
    parent:INode = null;
    mind:MindMap =null;
    index:number = -1;
    numberingSnapshot?:ParentNumberingSnapshot;
    textChanges:NodeTextChange[] = [];
    numberingInitialized:boolean = false;
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
        if (!this.numberingSnapshot) this.numberingSnapshot = captureParentNumbering(this.parent);
        this.node.clearCacheData();
        this.mind.clearSelectNode();
        this.index = this.mind.removeNode(this.node);
        if (!this.numberingInitialized) {
            this.textChanges = getNumberingTextChanges(this.numberingSnapshot);
            this.numberingInitialized = true;
        }
        applyNumberingTextChanges(this.textChanges, true);
        this.refresh();
        nextSelectNode && nextSelectNode.select();
        return true; //exit with no error
    }

    undo() {
        this.mind.addNode(this.node, this.parent, this.index);
        applyNumberingTextChanges(this.textChanges, false);
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
    numberingSnapshots:ParentNumberingSnapshot[] = [];
    textChanges:NodeTextChange[] = [];
    numberingInitialized:boolean = false;

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

        if (!this.numberingSnapshots.length) {
            this.numberingSnapshots = [...new Set(this.locations.map(({parent}) => parent))]
                .map(captureParentNumbering);
        }
        this.mind.clearSelectNode();
        this.locations
            .slice()
            .sort((a, b) => a.parent === b.parent ? b.index - a.index : b.order - a.order)
            .forEach(({node}) => {
                node.clearCacheData();
                this.mind.removeNode(node);
            });
        if (!this.numberingInitialized) {
            const changes:NodeTextChange[] = [];
            this.numberingSnapshots.forEach((snapshot) => {
                changes.push(...getNumberingTextChanges(snapshot));
            });
            this.textChanges = mergeNumberingTextChanges(changes);
            this.numberingInitialized = true;
        }
        applyNumberingTextChanges(this.textChanges, true);
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
        applyNumberingTextChanges(this.textChanges, false);
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
    numberingSnapshots:ParentNumberingSnapshot[] = [];
    movedGroups:OrderedSiblingGroupSnapshot<INode>[] = [];
    textChanges:NodeTextChange[] = [];
    numberingInitialized:boolean = false;
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
        if (!this.numberingSnapshots.length) this.captureNumbering();
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
            this.initializeNumbering();
            applyNumberingTextChanges(this.textChanges, true);
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
            this.initializeNumbering();
            applyNumberingTextChanges(this.textChanges, true);
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
            applyNumberingTextChanges(this.textChanges, false);

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
            applyNumberingTextChanges(this.textChanges, false);
            this.node.clearCacheData();
            this.refresh(this.node.mindmap);
            this.node.select();
        }
    }

    private getDestinationParent():INode {
        return this.data.type.indexOf('child') > -1 ? this.parent : this.newParent;
    }

    private captureNumbering():void {
        const parents = [this.oldParent, this.getDestinationParent()]
            .filter((parent, index, values) => parent && values.indexOf(parent) === index);
        this.numberingSnapshots = parents.map(captureParentNumbering);
        this.movedGroups = getMovedOrderedGroups(this.numberingSnapshots, [this.node]);
    }

    private initializeNumbering():void {
        if (this.numberingInitialized) return;
        const destinationParent = this.getDestinationParent();
        const destinationSnapshot = this.numberingSnapshots.find(({parent}) => parent === destinationParent);
        const preferredGroup = destinationSnapshot
            ? getDestinationOrderedGroup(destinationSnapshot, [this.node])
            : undefined;
        const changes:NodeTextChange[] = [];
        this.numberingSnapshots.forEach((snapshot) => {
            changes.push(...getNumberingTextChanges(
                snapshot,
                snapshot === destinationSnapshot ? {
                    additionalGroups: this.movedGroups.filter((group) => !snapshot.groups.includes(group)),
                    preferredGroup,
                    adoptNodes: preferredGroup ? [this.node] : [],
                } : {},
            ));
        });
        this.textChanges = mergeNumberingTextChanges(changes);
        this.numberingInitialized = true;
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
    numberingSnapshots:ParentNumberingSnapshot[] = [];
    movedGroups:OrderedSiblingGroupSnapshot<INode>[] = [];
    textChanges:NodeTextChange[] = [];
    numberingInitialized:boolean = false;

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

        if (!this.numberingSnapshots.length) this.captureNumbering(destinationParent);
        this.removeNodes();
        let insertionIndex = this.getInsertionIndex(destinationParent);
        this.nodes.forEach((node) => {
            destinationParent.addChild(node, insertionIndex);
            insertionIndex++;
        });
        this.initializeNumbering(destinationParent);
        applyNumberingTextChanges(this.textChanges, true);
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
        applyNumberingTextChanges(this.textChanges, false);
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

    private captureNumbering(destinationParent:INode):void {
        const parents = [
            destinationParent,
            ...this.locations.map(({parent}) => parent),
        ].filter((parent, index, values) => parent && values.indexOf(parent) === index);
        this.numberingSnapshots = parents.map(captureParentNumbering);
        this.movedGroups = getMovedOrderedGroups(this.numberingSnapshots, this.nodes);
    }

    private initializeNumbering(destinationParent:INode):void {
        if (this.numberingInitialized) return;
        const destinationSnapshot = this.numberingSnapshots.find(({parent}) => parent === destinationParent);
        const preferredGroup = destinationSnapshot
            ? getDestinationOrderedGroup(destinationSnapshot, this.nodes)
            : undefined;
        const changes:NodeTextChange[] = [];
        this.numberingSnapshots.forEach((snapshot) => {
            changes.push(...getNumberingTextChanges(
                snapshot,
                snapshot === destinationSnapshot ? {
                    additionalGroups: this.movedGroups.filter((group) => !snapshot.groups.includes(group)),
                    preferredGroup,
                    adoptNodes: preferredGroup ? this.nodes : [],
                } : {},
            ));
        });
        this.textChanges = mergeNumberingTextChanges(changes);
        this.numberingInitialized = true;
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

interface PasteNodeForestData extends INodeData {
    children?:PasteNodeForestData[];
}

export class PasteNodeForest extends Command {
    node:INode;
    data:PasteNodeForestData[];
    roots:INode[]=[];
    insertionIndex:number;
    wasExpanded:boolean;
    mind:MindMap;

    constructor(node:INode, data:PasteNodeForestData[]) {
        super('pasteNodeForest');
        this.node = node;
        this.data = data;
        this.mind = node.mindmap;
        this.insertionIndex = node.children.length;
        this.wasExpanded = node.isExpand;
    }

    execute():boolean {
        if (!this.data.length) return false;
        if (!this.roots.length) {
            this.roots = this.data.map((data) => this.createNodeTree(data));
        }

        this.node.expand();
        this.roots.forEach((root, index) => {
            this.mind.addNode(root, this.node, this.insertionIndex + index);
            this.refreshNodeTree(root);
        });
        this.selectTargetAndRefresh();
        return true;
    }

    undo() {
        this.roots.forEach((root) => this.mind.removeNode(root));
        if (this.wasExpanded) this.node.expand();
        else this.node.collapse();
        this.selectTargetAndRefresh();
    }

    private createNodeTree(data:PasteNodeForestData):INode {
        const node = new INode({
            ...data,
            children: [],
        }, this.mind);
        (data.children || []).forEach((childData) => {
            node.addChild(this.createNodeTree(childData));
        });
        return node;
    }

    private refreshNodeTree(root:INode) {
        this.mind.traverseBF((node:INode) => {
            node.setPosition(0, 0);
            node.refreshBox();
            node.boundingRect = null;
            node.stroke = '';
        }, root);
    }

    private selectTargetAndRefresh() {
        this.node.clearCacheData();
        this.mind.clearSelectNode();
        this.refresh(this.mind);
        this.node.select();
    }
}
