import { App, WorkspaceLeaf } from 'obsidian';
import { CanvasRenderer } from './canvas-renderer';
import { VolatilePenSettings } from './settings';

export class VolatileOverlay {
    private canvasEl!: HTMLCanvasElement;
    private renderer!: CanvasRenderer;
    private activeLeafChangeRef: any;
    
    private mouseDownTime = 0;
    private mouseDownPos = { x: 0, y: 0 };
    private DRAW_THRESHOLD_MS = 150;
    private DRAW_THRESHOLD_PX = 5;
    private isDrawingMode = false;

    constructor(private app: App, private settings: VolatilePenSettings, private win: Window) {}

    mount() {
        const doc = this.win.document;
        this.canvasEl = doc.createElement('canvas');
        this.canvasEl.addClass('volatile-pen-overlay');
        doc.body.appendChild(this.canvasEl);

        this.resize();
        this.win.addEventListener('resize', this.onResize);

        this.renderer = new CanvasRenderer(this.canvasEl, this.settings);
        this.renderer.start();

        // Mouse Events for Click vs Drag Logic
        this.canvasEl.addEventListener('mousedown', this.onMouseDown);
        this.canvasEl.addEventListener('mousemove', this.onMouseMove);
        this.canvasEl.addEventListener('mouseup', this.onMouseUp);
        
        // Wheel Event for Scroll Passthrough
        this.canvasEl.addEventListener('wheel', this.onWheel, { passive: false });

        // Slide Transitions
        this.activeLeafChangeRef = this.app.workspace.on('active-leaf-change', () => {
            this.renderer.clear();
        });
        doc.addEventListener('keydown', this.onKeydown);
    }

    private onResize = () => this.resize();

    private onMouseDown = (e: MouseEvent) => {
        this.mouseDownTime = Date.now();
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
        this.isDrawingMode = false;
    };

    private onMouseMove = (e: MouseEvent) => {
        if (e.buttons !== 1) return; // Only if left mouse button is held

        if (!this.isDrawingMode) {
            const dist = Math.hypot(
                e.clientX - this.mouseDownPos.x,
                e.clientY - this.mouseDownPos.y
            );
            if (dist > this.DRAW_THRESHOLD_PX) {
                this.isDrawingMode = true;
                this.renderer.startStroke(this.mouseDownPos.x, this.mouseDownPos.y);
            }
        }

        if (this.isDrawingMode) {
            this.renderer.continueStroke(e.clientX, e.clientY);
        }
    };

    private onMouseUp = (e: MouseEvent) => {
        const elapsed = Date.now() - this.mouseDownTime;
        const dist = Math.hypot(
            e.clientX - this.mouseDownPos.x,
            e.clientY - this.mouseDownPos.y
        );

        if (!this.isDrawingMode && elapsed < this.DRAW_THRESHOLD_MS && dist < this.DRAW_THRESHOLD_PX) {
            // Short click -> Passthrough
            this.passthroughEvent(e, 'click');
        }

        if (this.isDrawingMode) {
            this.renderer.endStroke();
        }
        this.isDrawingMode = false;
    };

    private onWheel = (e: WheelEvent) => {
        // Passthrough wheel event
        this.passthroughEvent(e, 'wheel');
    };

    private passthroughEvent(e: MouseEvent | WheelEvent, type: string) {
        this.canvasEl.style.pointerEvents = 'none';
        const doc = this.win.document;
        const el = doc.elementFromPoint(e.clientX, e.clientY);
        if (el) {
            let clonedEvent;
            if (e instanceof WheelEvent) {
                clonedEvent = new WheelEvent('wheel', {
                    deltaX: e.deltaX,
                    deltaY: e.deltaY,
                    deltaZ: e.deltaZ,
                    deltaMode: e.deltaMode,
                    clientX: e.clientX,
                    clientY: e.clientY,
                    bubbles: true,
                    cancelable: true
                });
            } else {
                clonedEvent = new MouseEvent(type, {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    button: e.button,
                    buttons: e.buttons,
                    bubbles: true,
                    cancelable: true
                });
            }
            el.dispatchEvent(clonedEvent);
        }
        this.canvasEl.style.pointerEvents = 'auto';
        if (e.cancelable) e.preventDefault();
    }

    private onKeydown = (e: KeyboardEvent) => {
        if (['ArrowRight', 'ArrowLeft', 'Space', 'PageDown', 'PageUp'].includes(e.key)) {
            setTimeout(() => this.renderer.clear(), 100);
        }
    };

    resize() {
        this.canvasEl.width = this.win.innerWidth;
        this.canvasEl.height = this.win.innerHeight;
    }

    clear() {
        this.renderer.clear();
    }

    destroy() {
        this.renderer.stop();
        this.canvasEl.remove();
        this.win.removeEventListener('resize', this.onResize);
        this.win.document.removeEventListener('keydown', this.onKeydown);
        this.app.workspace.offref(this.activeLeafChangeRef);
    }
}
