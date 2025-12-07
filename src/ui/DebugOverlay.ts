import { MapShape } from '../systems/MapSystem';

export class DebugOverlay {
    private container: HTMLDivElement;
    private modeElements: HTMLDivElement[] = [];
    private effectElements: HTMLDivElement[] = [];
    private scoreElement: HTMLDivElement;

    // Config data for UI
    private readonly modes = [
        { key: '1', label: 'FULL', mode: MapShape.FULL },
        { key: '2', label: 'RECT', mode: MapShape.RECT },
        { key: '3', label: 'SQUARE', mode: MapShape.SQUARE },
        { key: '4', label: 'CIRCLE', mode: MapShape.CIRCLE },
        { key: '5', label: 'PROCGEN', mode: MapShape.PROCGEN },
        { key: '6', label: 'MIRROR', mode: MapShape.MIRROR },
        { key: '7', label: 'RADIAL', mode: MapShape.RADIAL },
    ];

    private readonly effects = [
        { key: 'Q', label: 'BLUR', id: 'blur' },
        { key: 'W', label: 'LIQUID', id: 'threshold' },
        { key: 'E', label: 'WIGGLE', id: 'displacement' },
        { key: 'R', label: 'GRAIN', id: 'noise' },
    ];

    constructor() {
        this.container = document.createElement('div');
        this.applyContainerStyles();
        document.body.appendChild(this.container);
        
        this.scoreElement = document.createElement('div');
        this.scoreElement.textContent = 'SCORE: 0';
        
        this.initElements();
        this.container.appendChild(this.scoreElement);
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
        s.textShadow = '1px 1px 0 #000';
    }

    private initElements() {
        // Modes
        this.modes.forEach(m => {
            const line = document.createElement('div');
            line.textContent = `${m.key} - MODE: ${m.label}`;
            this.container.appendChild(line);
            this.modeElements.push(line);
        });

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.height = '10px';
        this.container.appendChild(spacer);

        // Effects
        this.effects.forEach(eff => {
            const line = document.createElement('div');
            line.textContent = `${eff.key} - FX: ${eff.label}`;
            this.container.appendChild(line);
            this.effectElements.push(line);
        });
    }

    public update(score: number, currentMode: MapShape, effectStates: { blur: boolean, threshold: boolean, displacement: boolean, noise: boolean }) {
        // Update Modes
        this.modes.forEach((m, i) => {
            const el = this.modeElements[i];
            if (currentMode === m.mode) {
                el.style.opacity = '1.0';
                el.style.color = '#fff';
                el.style.fontWeight = 'bold';
            } else {
                el.style.opacity = '0.5';
                el.style.color = '#aaa';
                el.style.fontWeight = 'normal';
            }
        });

        // Update Effects
        this.effects.forEach((eff, i) => {
            const el = this.effectElements[i];
            const isActive = effectStates[eff.id as keyof typeof effectStates];
            if (isActive) {
                el.style.opacity = '1.0';
                el.style.color = '#8f8';
                el.style.fontWeight = 'bold';
            } else {
                el.style.opacity = '0.5';
                el.style.color = '#aaa';
                el.style.fontWeight = 'normal';
            }
        });

        this.scoreElement.textContent = `SCORE: ${score}`;
    }
}
