import { Plugin } from 'obsidian';
import { VolatileOverlay } from './overlay';
import { VolatilePenSettings, DEFAULT_SETTINGS, SettingsTab } from './settings';

export default class VolatilePenPlugin extends Plugin {
    settings: VolatilePenSettings = DEFAULT_SETTINGS;
    overlays: Map<Window, VolatileOverlay> = new Map();
    huds: Map<Window, HTMLElement> = new Map();
    isEnabled = false;

    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'toggle-volatile-pen',
            name: 'Toggle Volatile Pen',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'D' }],
            callback: () => this.toggleOverlay(),
        });

        this.addCommand({
            id: 'clear-volatile-pen',
            name: 'Clear Drawings',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'X' }],
            callback: () => this.clearAll(),
        });

        this.addSettingTab(new SettingsTab(this.app, this));

        // Handle existing windows and new windows
        this.app.workspace.onLayoutReady(() => {
            this.setupWindow(window);
            this.registerEvent(this.app.workspace.on('window-open', (winInfo, win) => {
                this.setupWindow(win);
            }));
        });
    }

    setupWindow(win: Window) {
        this.createHUD(win);
        // If already enabled globally, mount overlay in the new window
        if (this.isEnabled) {
            this.createOverlayInWindow(win);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    toggleOverlay() {
        this.isEnabled = !this.isEnabled;
        if (this.isEnabled) {
            this.createAllOverlays();
        } else {
            this.destroyAllOverlays();
        }
    }

    createAllOverlays() {
        this.iterateWindows((win) => {
            this.createOverlayInWindow(win);
        });
    }

    createOverlayInWindow(win: Window) {
        if (this.overlays.has(win)) return;
        const overlay = new VolatileOverlay(this.app, this.settings, win);
        overlay.mount();
        this.overlays.set(win, overlay);
        this.updateHUD(win);
    }

    destroyAllOverlays() {
        this.overlays.forEach((overlay) => overlay.destroy());
        this.overlays.clear();
        this.iterateWindows((win) => this.updateHUD(win));
    }

    clearAll() {
        this.overlays.forEach((overlay) => overlay.clear());
    }

    createHUD(win: Window) {
        if (this.huds.has(win)) return;
        const hudEl = win.document.body.createEl('div', { cls: 'volatile-pen-hud is-off' });
        hudEl.setText('✏️ Volatile Pen (OFF)');
        hudEl.addEventListener('click', () => this.toggleOverlay());
        this.huds.set(win, hudEl);
        this.updateHUD(win);
    }

    updateHUD(win: Window) {
        const hudEl = this.huds.get(win);
        if (!hudEl) return;
        if (this.overlays.has(win)) {
            hudEl.removeClass('is-off');
            hudEl.setText('✏️ Volatile Pen (ON)');
        } else {
            hudEl.addClass('is-off');
            hudEl.setText('✏️ Volatile Pen (OFF)');
        }
    }

    iterateWindows(callback: (win: Window) => void) {
        callback(window); // Main window
        this.app.workspace.iterateAllLeaves((leaf) => {
            const win = leaf.view.containerEl.win;
            if (win && win !== window) {
                callback(win);
            }
        });
    }

    onunload() {
        this.destroyAllOverlays();
        this.huds.forEach((hudEl) => hudEl.remove());
        this.huds.clear();
    }
}
