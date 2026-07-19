import type MindMap from '../mindmap';
import type INode from '../INode';

export type MindMapStyleTemplateId =
  | 'classic-blue'
  | 'mint-fresh'
  | 'coral-energy'
  | 'violet-night'
  | 'mono-ink'
  | 'forest-notes';

export type MindMapStyleTemplateLabelKey =
  | 'Classic blue'
  | 'Mint fresh'
  | 'Coral energy'
  | 'Violet night'
  | 'Mono ink'
  | 'Forest notes';

interface MindMapStyleNodeAppearance {
  background: string;
  color: string;
  borderColor: string;
  borderRadius: string;
}

interface MindMapStyleCanvasAppearance {
  background: string;
  color: string;
}

interface MindMapStyleBranchAppearance {
  lineWidth: number;
}

export interface MindMapStyleTemplate {
  id: MindMapStyleTemplateId;
  labelKey: MindMapStyleTemplateLabelKey;
  branchPalette: string[];
  canvas: MindMapStyleCanvasAppearance;
  root: MindMapStyleNodeAppearance;
  primaryNode: MindMapStyleNodeAppearance;
  branch: MindMapStyleBranchAppearance;
}

export const DEFAULT_MINDMAP_STYLE_TEMPLATE_ID: MindMapStyleTemplateId = 'classic-blue';

export const MINDMAP_STYLE_TEMPLATES: MindMapStyleTemplate[] = [
  {
    id: 'classic-blue',
    labelKey: 'Classic blue',
    branchPalette: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
    canvas: { background: 'var(--background-primary)', color: 'var(--text-normal)' },
    root: { background: '#2563EB', color: '#FFFFFF', borderColor: '#2563EB', borderRadius: '0.25rem' },
    primaryNode: { background: '#EFF6FF', color: '#1E3A8A', borderColor: '#93C5FD', borderRadius: '0.25rem' },
    branch: { lineWidth: 2 },
  },
  {
    id: 'mint-fresh',
    labelKey: 'Mint fresh',
    branchPalette: ['#14B8A6', '#22C55E', '#38BDF8', '#A3E635', '#FACC15', '#FB7185'],
    canvas: { background: '#F7FEFC', color: '#134E4A' },
    root: { background: '#0F766E', color: '#FFFFFF', borderColor: '#0F766E', borderRadius: '0.5rem' },
    primaryNode: { background: '#ECFDF5', color: '#065F46', borderColor: '#99F6E4', borderRadius: '0.5rem' },
    branch: { lineWidth: 2 },
  },
  {
    id: 'coral-energy',
    labelKey: 'Coral energy',
    branchPalette: ['#F97316', '#FB7185', '#EAB308', '#EF4444', '#A855F7', '#0EA5E9'],
    canvas: { background: '#FFF9F5', color: '#431407' },
    root: { background: '#EA580C', color: '#FFFFFF', borderColor: '#EA580C', borderRadius: '0.5rem' },
    primaryNode: { background: '#FFF1E8', color: '#9A3412', borderColor: '#FDBA74', borderRadius: '0.5rem' },
    branch: { lineWidth: 3 },
  },
  {
    id: 'violet-night',
    labelKey: 'Violet night',
    branchPalette: ['#818CF8', '#22D3EE', '#34D399', '#FBBF24', '#F472B6', '#A78BFA'],
    canvas: { background: '#161B2E', color: '#F8FAFC' },
    root: { background: '#4F46E5', color: '#FFFFFF', borderColor: '#818CF8', borderRadius: '0.5rem' },
    primaryNode: { background: '#252B47', color: '#E0E7FF', borderColor: '#6366F1', borderRadius: '0.5rem' },
    branch: { lineWidth: 2 },
  },
  {
    id: 'mono-ink',
    labelKey: 'Mono ink',
    branchPalette: ['#2563EB'],
    canvas: { background: 'var(--background-primary)', color: 'var(--text-normal)' },
    root: { background: '#111827', color: '#FFFFFF', borderColor: '#111827', borderRadius: '0.25rem' },
    primaryNode: { background: 'var(--background-primary)', color: 'var(--text-normal)', borderColor: '#1F2937', borderRadius: '0.25rem' },
    branch: { lineWidth: 2 },
  },
  {
    id: 'forest-notes',
    labelKey: 'Forest notes',
    branchPalette: ['#15803D', '#65A30D', '#0F766E', '#CA8A04', '#B45309', '#047857'],
    canvas: { background: '#FAFDF7', color: '#1C2A1B' },
    root: { background: '#166534', color: '#FFFFFF', borderColor: '#166534', borderRadius: '0.375rem' },
    primaryNode: { background: '#F0FDF4', color: '#14532D', borderColor: '#86EFAC', borderRadius: '0.375rem' },
    branch: { lineWidth: 2 },
  },
];

export function isMindMapStyleTemplateId(value: unknown): value is MindMapStyleTemplateId {
  return typeof value === 'string' && MINDMAP_STYLE_TEMPLATES.some((template) => template.id === value);
}

export function resolveMindMapStyleTemplate(value?: string | null): MindMapStyleTemplate {
  const template = MINDMAP_STYLE_TEMPLATES.find((item) => item.id === value);
  return template || getDefaultMindMapStyleTemplate();
}

export function getDefaultMindMapStyleTemplate(): MindMapStyleTemplate {
  return MINDMAP_STYLE_TEMPLATES.find((template) => template.id === DEFAULT_MINDMAP_STYLE_TEMPLATE_ID)
    || MINDMAP_STYLE_TEMPLATES[0];
}

export function getMindMapStyleBranchPalette(template: MindMapStyleTemplate): string[] {
  return template.branchPalette.length > 0 ? [...template.branchPalette] : ['#2563EB'];
}

export function applyMindMapStyleTemplate(
  mindmap: MindMap,
  templateOrId: MindMapStyleTemplate | string | null | undefined,
): MindMapStyleTemplate {
  let template: MindMapStyleTemplate;
  if (typeof templateOrId === 'string' || templateOrId == null) {
    template = resolveMindMapStyleTemplate(templateOrId as string | null | undefined);
  } else {
    template = templateOrId;
  }

  applyTemplateCssVariables(mindmap, template);

  if (!mindmap.root) return template;

  const colors = getMindMapStyleBranchPalette(template);
  const needsInitialLayout = !mindmap.mmLayout;
  mindmap.colors = colors;

  if (mindmap.mmLayout) {
    mindmap.mmLayout.colors = colors;
    mindmap.mmLayout.lineWidth = template.branch.lineWidth;
  }

  clearNodeStrokes(mindmap);
  mindmap.root.children.forEach((node, index) => {
    setBranchStroke(node, colors[index % colors.length]);
  });
  mindmap.refresh();

  if (needsInitialLayout && mindmap.mmLayout) {
    mindmap.mmLayout.colors = colors;
    mindmap.mmLayout.lineWidth = template.branch.lineWidth;
    mindmap.refresh();
  }

  return template;
}

function applyTemplateCssVariables(mindmap: MindMap, template: MindMapStyleTemplate) {
  const style = mindmap.appEl.style;
  mindmap.appEl.setAttribute('data-mm-style-template', template.id);
  style.setProperty('--mm-style-canvas-background', template.canvas.background);
  style.setProperty('--mm-style-canvas-color', template.canvas.color);
  style.setProperty('--mm-style-root-background', template.root.background);
  style.setProperty('--mm-style-root-color', template.root.color);
  style.setProperty('--mm-style-root-border-color', template.root.borderColor);
  style.setProperty('--mm-style-root-border-radius', template.root.borderRadius);
  style.setProperty('--mm-style-primary-background', template.primaryNode.background);
  style.setProperty('--mm-style-primary-color', template.primaryNode.color);
  style.setProperty('--mm-style-primary-border-color', template.primaryNode.borderColor);
  style.setProperty('--mm-style-primary-border-radius', template.primaryNode.borderRadius);
  style.setProperty('--mm-style-branch-line-width', `${template.branch.lineWidth}px`);

  mindmap.appEl.style.color = 'var(--mm-style-canvas-color)';
  mindmap.contentEL.style.background = 'var(--mm-style-canvas-background)';
}

function clearNodeStrokes(mindmap: MindMap) {
  mindmap.traverseDF((node: INode) => {
    node.stroke = undefined;
    node._barDom.style.removeProperty('background-color');
    node._barDom.style.removeProperty('border-color');
    node.boundingRect = null;
    node.refreshBox();
  });
}

function setBranchStroke(node: INode, color: string) {
  node.stroke = color;
  node._barDom.style.backgroundColor = color;
  node._barDom.style.borderColor = color;
  node.children.forEach((child) => setBranchStroke(child, color));
}
