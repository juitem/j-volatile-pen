import { VolatilePenSettings } from './settings';

interface Stroke {
    points: { x: number; y: number }[];
    color: string;
    width: number;
    opacity: number;
    createdAt: number;
}

export class CanvasRenderer {
    private ctx: CanvasRenderingContext2D;
    private strokes: Stroke[] = [];
    private currentStroke: Stroke | null = null;
    private isDrawing = false;
    private animFrameId: number = 0;

    constructor(private canvas: HTMLCanvasElement, private settings: VolatilePenSettings) {
        this.ctx = canvas.getContext('2d')!;
    }

    start() {
        this.loop();
    }

    stop() {
        cancelAnimationFrame(this.animFrameId);
    }

    // These will be called manually from overlay.ts to handle the "Short Click vs Drag" logic
    public startStroke(x: number, y: number) {
        this.isDrawing = true;
        this.currentStroke = {
            points: [{ x, y }],
            color: this.settings.penColor,
            width: this.settings.penWidth,
            opacity: 1.0,
            createdAt: Date.now(),
        };
        this.strokes.push(this.currentStroke);
    }

    public continueStroke(x: number, y: number) {
        if (!this.isDrawing || !this.currentStroke) return;
        this.currentStroke.points.push({ x, y });
        this.currentStroke.createdAt = Date.now();
    }

    public endStroke() {
        this.isDrawing = false;
        if (this.currentStroke) {
            this.currentStroke.createdAt = Date.now();
            this.currentStroke = null;
        }
    }

    private loop = () => {
        this.animFrameId = requestAnimationFrame(this.loop);
        this.render();
    };

    private render() {
        const now = Date.now();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.strokes = this.strokes.filter(stroke => {
            const age = now - stroke.createdAt;

            if (stroke === this.currentStroke) {
                stroke.opacity = 1.0;
            } else if (age > this.settings.fadeDelay) {
                const fadeProgress = (age - this.settings.fadeDelay) / this.settings.fadeDuration;
                stroke.opacity = Math.max(0, 1.0 - fadeProgress);
            }

            if (stroke.opacity <= 0) return false;

            this.drawStroke(stroke);
            return true;
        });
    }

    private drawStroke(stroke: Stroke) {
        if (stroke.points.length < 2) return;

        this.ctx.save();
        this.ctx.globalAlpha = stroke.opacity;
        this.ctx.strokeStyle = stroke.color;
        this.ctx.lineWidth = stroke.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    clear() {
        this.strokes = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
