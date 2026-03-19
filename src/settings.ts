import { App, PluginSettingTab, Setting } from 'obsidian';
import type VolatilePenPlugin from './main';

export interface VolatilePenSettings {
    penColor: string;
    penWidth: number;
    fadeDelay: number;
    fadeDuration: number;
}

export const DEFAULT_SETTINGS: VolatilePenSettings = {
    penColor: '#ff0000',
    penWidth: 4,
    fadeDelay: 2000,
    fadeDuration: 1500,
};

export class SettingsTab extends PluginSettingTab {
    plugin: VolatilePenPlugin;

    constructor(app: App, plugin: VolatilePenPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Volatile Pen Settings' });

        new Setting(containerEl)
            .setName('Pen Color')
            .setDesc('Color of the volatile pen.')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.penColor)
                .onChange(async (value) => {
                    this.plugin.settings.penColor = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Pen Width')
            .setDesc('Width of the volatile pen.')
            .addSlider(slider => slider
                .setLimits(1, 20, 1)
                .setValue(this.plugin.settings.penWidth)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.penWidth = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Fade Delay')
            .setDesc('Time (ms) before the stroke starts to fade.')
            .addText(text => text
                .setValue(String(this.plugin.settings.fadeDelay))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                        this.plugin.settings.fadeDelay = numValue;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Fade Duration')
            .setDesc('Time (ms) it takes for the stroke to disappear.')
            .addText(text => text
                .setValue(String(this.plugin.settings.fadeDuration))
                .onChange(async (value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                        this.plugin.settings.fadeDuration = numValue;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
