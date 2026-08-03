import {
    App,
    Notice,
    PluginSettingTab,
    Setting,
} from 'obsidian';
import MindMap from './main';
import { t } from './lang/helpers'
import { MindMapView, mindmapViewType } from './MindMapView';
import MyNode from './mindmap/INode';
import { MINDMAP_STYLE_TEMPLATES, resolveMindMapStyleTemplate } from './mindmap/style/MindMapStyle';
import { getPluginShortcutCatalog } from './mindmap/interaction/PluginShortcutCatalog';
import {
    NodeWidthSettings,
    normalizeNodeWidthSettings,
} from './mindmap/NodeWidthSettings';

type NodeWidthSettingKey = keyof NodeWidthSettings;

export class MindMapSettingsTab extends PluginSettingTab {
    plugin: MindMap;
    constructor(app: App, plugin: MindMap) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName(`${t('Canvas size')}`)
            .setDesc(`${t('Canvas size desc')}`)
            .addDropdown(dropDown =>
                dropDown
                    .addOption('4000', '4000')
                    .addOption('6000', '6000')
                    .addOption('8000', '8000')
                    .addOption('10000', '10000')
                    .addOption('12000', '12000')
                    .addOption('16000', '16000')
                    .addOption('20000', '20000')
                    .addOption('30000', '30000')
                    .addOption('36000', '36000')
                    .setValue(this.plugin.settings.canvasSize.toString() || '8000')
                    .onChange((value: string) => {
                        var _v = Number.parseInt(value)
                        this.plugin.settings.canvasSize = _v;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.canvasSize = _v;
                            v.mindmap.setAppSetting();
                            var box = v.mindmap.root.getBox();
                            v.mindmap.root.setPosition(_v / 2 - box.width / 2, _v / 2 - box.height / 2);
                            v.mindmap.refresh();
                            v.mindmap.center();
                        });
                    }));

        new Setting(containerEl)
            .setName(`${t('Canvas background')}`)
            .setDesc(`${t('Canvas background desc')}`)
            .addText(text =>
                text
                    .setValue(this.plugin.settings.background || 'transparent')
                    .setPlaceholder('Example: black|white|#ccc')
                    .onChange((value: string) => {
                        this.plugin.settings.background = value;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.background = this.plugin.settings.background;
                            v.mindmap.setAppSetting();
                        });
                    }));

        new Setting(containerEl)
            .setName(`${t('Max level of node to markdown head')}`)
            .setDesc(`${t('Max level of node to markdown head desc')}`)
            .addDropdown(dropDown =>
                dropDown
                    .addOption('0', '0')
                    .addOption('1', '1')
                    .addOption('2', '2')
                    .addOption('3', '3')
                    .addOption('4', '4')
                    .addOption('5', '5')
                    .addOption('6', '6')
                    .setValue(this.plugin.settings.headLevel.toString() || '2')
                    .onChange((value: string) => {
                        this.plugin.settings.headLevel = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.headLevel = this.plugin.settings.headLevel;
                        });
                    }));



        new Setting(containerEl)
            .setName(`${t('Font size')}`)
            .setDesc(`${t('Font size desc')}`)
            .addText(text =>
                text
                    .setValue(this.plugin.settings.fontSize?.toString() || '16')
                    .setPlaceholder('Example: 16')
                    .onChange((value: string) => {
                        this.plugin.settings.fontSize = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.fontSize = this.plugin.settings.fontSize;
                            v.mindmap.setAppSetting();
                            v.mindmap.traverseBF((n: MyNode) => {
                                n.boundingRect = null;
                                n.refreshBox();
                            })
                            v.mindmap.refresh();
                        });
                    }));

        this.renderWidthSetting(
            containerEl,
            'Text node minimum width',
            'Text node minimum width desc',
            'textNodeMinWidth',
            'textNodeMinWidth',
            'textNodeMaxWidth',
        );
        this.renderWidthSetting(
            containerEl,
            'Text node maximum width',
            'Text node maximum width desc',
            'textNodeMaxWidth',
            'textNodeMinWidth',
            'textNodeMaxWidth',
        );
        this.renderWidthSetting(
            containerEl,
            'Node image minimum width',
            'Node image minimum width desc',
            'nodeImageMinWidth',
            'nodeImageMinWidth',
            'nodeImageMaxWidth',
        );
        this.renderWidthSetting(
            containerEl,
            'Node image maximum width',
            'Node image maximum width desc',
            'nodeImageMaxWidth',
            'nodeImageMinWidth',
            'nodeImageMaxWidth',
        );

        new Setting(containerEl)
            .setName(`${t('Default mindmap style')}`)
            .setDesc(`${t('Default mindmap style desc')}`)
            .addDropdown(dropDown => {
                MINDMAP_STYLE_TEMPLATES.forEach((styleTemplate) => {
                    dropDown.addOption(styleTemplate.id, t(styleTemplate.labelKey));
                });
                dropDown
                    .setValue(resolveMindMapStyleTemplate(this.plugin.settings.defaultStyleTemplate).id)
                    .onChange(async (value: string) => {
                        this.plugin.settings.defaultStyleTemplate = resolveMindMapStyleTemplate(value).id;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName(`${t('Mind map layout direct')}`)
            .setDesc(`${t('Mind map layout direct desc')}`)
            .addDropdown(dropDown =>
                dropDown
                    .addOption('mind map', t('Centered'))
                    .addOption('right', t('Right'))
                    .addOption('left', t('Left'))
                    .addOption('clockwise', t('Clockwise'))
                    .setValue(this.plugin.settings.layoutDirect.toString() || 'mind map')
                    .onChange((value: string) => {
                        this.plugin.settings.layoutDirect = value;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.layoutDirect = this.plugin.settings.layoutDirect;
                            v.mindmap.refresh();
                        });
                    }));

        new Setting(containerEl)
            .setName('Display moved on current node')
            .setDesc(
                'If enabled, the mindmap view is centered on the current node when moving it',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.focusOnMove).onChange((value) => {
                        this.plugin.settings.focusOnMove = value;
                        this.plugin.saveData(this.plugin.settings);

                }),
            );

        new Setting(containerEl)
            .setName(`${t('Show link title')}`)
            .setDesc(`${t('Show link title desc')}`)
            .addToggle((toggle) =>
                toggle
                    .setValue(Boolean(this.plugin.settings.showLinkTitle))
                    .onChange((value) => {
                        this.plugin.settings.showLinkTitle = value;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.showLinkTitle = value;
                            v.mindmap.traverseBF((n: MyNode) => {
                                n.renderLinkLayer(n.getDisplayedLinks());
                                n.clearCacheData();
                                n.refreshBox();
                            });
                            v.mindmap.refresh();
                        });
                    }),
            );

        this.renderShortcutCatalog(containerEl);
    }

    private renderWidthSetting(
        containerEl: HTMLElement,
        nameKey: Parameters<typeof t>[0],
        descKey: Parameters<typeof t>[0],
        field: NodeWidthSettingKey,
        minField: NodeWidthSettingKey,
        maxField: NodeWidthSettingKey,
    ): void {
        new Setting(containerEl)
            .setName(t(nameKey))
            .setDesc(t(descKey))
            .addText((text) => {
                text.setValue(`${this.plugin.settings[field]}`);
                text.inputEl.type = 'number';
                text.inputEl.min = '1';
                text.inputEl.step = '1';
                text.inputEl.addEventListener('change', () => {
                    void this.updateWidthSetting(text.inputEl, field, minField, maxField);
                });
            });
    }

    private async updateWidthSetting(
        inputEl: HTMLInputElement,
        field: NodeWidthSettingKey,
        minField: NodeWidthSettingKey,
        maxField: NodeWidthSettingKey,
    ): Promise<void> {
        const value = Number(inputEl.value);
        const min = field === minField ? value : this.plugin.settings[minField];
        const max = field === maxField ? value : this.plugin.settings[maxField];
        if (!Number.isSafeInteger(value) || value <= 0 || min > max) {
            inputEl.value = `${this.plugin.settings[field]}`;
            new Notice(t('Invalid node width range'));
            return;
        }

        this.plugin.settings[field] = value;
        await this.plugin.saveSettings();
        await this.refreshOpenMindmapWidths();
    }

    private async refreshOpenMindmapWidths(): Promise<void> {
        const widthSettings = normalizeNodeWidthSettings(this.plugin.settings);
        await Promise.all(this.app.workspace.getLeavesOfType(mindmapViewType).map(async (leaf) => {
            const view = leaf.view as MindMapView;
            if (!view.mindmap) return;

            Object.assign(view.mindmap.setting, widthSettings);
            view.mindmap.setAppSetting();
            const refreshes: Promise<void>[] = [];
            view.mindmap.traverseBF((node: MyNode) => {
                refreshes.push(node.refreshWidthSettings());
            });
            await Promise.all(refreshes);
            view.mindmap.refresh();
        }));
    }

    private renderShortcutCatalog(containerEl: HTMLElement): void {
        const detailsEl = containerEl.createEl('details', {
            cls: 'mm-settings-shortcut-catalog',
        });
        detailsEl.createEl('summary', { text: t('All plugin shortcuts') });

        new Setting(detailsEl)
            .setDesc(t('All plugin shortcuts desc'))
            .addButton((button) => button
                .setButtonText(t('Manage shortcuts'))
                .onClick(() => {
                    const setting = (this.app as any).setting;
                    setting?.open();
                    const hotkeyTab = setting?.openTabById?.('hotkeys');
                    hotkeyTab?.setQuery?.(this.plugin.manifest.id);
                }));

        const listEl = detailsEl.createDiv({ cls: 'mm-settings-shortcut-list' });
        getPluginShortcutCatalog(this.app, this.plugin.manifest.id).forEach((command) => {
            const setting = new Setting(listEl).setName(command.label);
            setting.controlEl.createSpan({
                text: command.shortcuts.length
                    ? command.shortcuts.join(' / ')
                    : t('Shortcut not assigned'),
                cls: 'mm-settings-shortcut-binding',
            });
        });
    }
}
