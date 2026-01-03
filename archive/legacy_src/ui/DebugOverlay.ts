export class DebugOverlay {
    private container: HTMLDivElement;
    private scoreElement: HTMLDivElement;
    private sprigCountElement: HTMLDivElement;
    private fpsElement: HTMLDivElement;
    private isVisible: boolean = true;

    constructor() {
        this.container = document.createElement('div');
        this.applyContainerStyles();
        document.body.appendChild(this.container);
        
        this.scoreElement = document.createElement('div');
        this.scoreElement.textContent = 'SCORE: 0';

        this.sprigCountElement = document.createElement('div');
        this.sprigCountElement.textContent = 'SPRIGS: 0';

        this.fpsElement = document.createElement('div');
        this.fpsElement.textContent = 'FPS: 0';
        
        this.container.appendChild(this.scoreElement);
        this.container.appendChild(this.sprigCountElement);
        this.container.appendChild(this.fpsElement);
    }

    private applyContainerStyles() {
        const s = this.container.style;
        s.position = 'absolute';
        s.bottom = '20px';
        s.left = '20px';
        s.color = 'white';
        s.fontFamily = 'monospace';
        s.fontSize = '14px';
        s.pointerEvents = 'none';
        s.display = 'flex';
        s.flexDirection = 'column';
        s.gap = '4px';
        // Add background
        s.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        s.padding = '10px';
        s.borderRadius = '8px';
    }

    // Removed initElements() as it populated the deleted lists

    public update(score: number, sprigCount: number, fps: number) {
        this.scoreElement.textContent = `SCORE: ${score}`;
        this.sprigCountElement.textContent = `SPRIGS: ${sprigCount}`;
        this.fpsElement.textContent = `FPS: ${Math.round(fps)}`;
    }

    public toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
    }
}
