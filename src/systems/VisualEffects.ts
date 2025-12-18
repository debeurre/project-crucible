import { 
    Container, 
    DisplacementFilter, 
    BlurFilter, 
    NoiseFilter, 
    ColorMatrixFilter,
    Filter, 
    Texture, 
    Sprite
} from 'pixi.js';
import { CONFIG } from '../config';

export class VisualEffects {
    // Filters
    public blur: BlurFilter;
    public threshold: Filter; 
    public noise: NoiseFilter;
    public displacement: DisplacementFilter;
    private displacementSprite: Sprite;
    
        // State
    
        public blurEnabled = false; // Default OFF
    
        public thresholdEnabled = false; 
    
        public displacementEnabled = false; 
    
        public noiseEnabled = false;        
    
            // Default OFF
    
    private targetContainer: Container | null = null;

    constructor() {
        // 1. Blur
        this.blur = new BlurFilter();
        this.blur.strength = CONFIG.VISUALS.BLUR_STRENGTH;

        // 2. Threshold (Liquid Effect)
        // Using ColorMatrixFilter with a custom matrix to handle Pre-Multiplied Alpha.
        // We boost RGB and A equally so the color intensity is preserved when Alpha becomes 1.0.
        this.threshold = new ColorMatrixFilter();
        const m = 60; // Very steep curve to minimize the "dark halo" edge width
        const o = -30; // Threshold at 0.5
        (this.threshold as ColorMatrixFilter).matrix = [
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, m, o
        ];
        
        // 3. Noise
        this.noise = new NoiseFilter({
            noise: CONFIG.VISUALS.NOISE_STRENGTH
        });

        // 4. Displacement
        const noiseTexture = this.createNoiseTexture();
        if (noiseTexture.source.style) {
            noiseTexture.source.style.addressMode = 'repeat';
        }
        this.displacementSprite = new Sprite(noiseTexture);
        this.displacementSprite.scale.set(4);
        
        // v8 uses options object
        this.displacement = new DisplacementFilter({
             sprite: this.displacementSprite,
             scale: CONFIG.VISUALS.DISPLACEMENT_SCALE * CONFIG.VISUALS.WIGGLE_STRENGTH
        });
    }

    private createNoiseTexture(): Texture {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas 2D context not supported");
        
        const idata = ctx.createImageData(size, size);
        const buffer32 = new Uint32Array(idata.data.buffer);
        
        for (let i = 0; i < buffer32.length; i++) {
            const v = Math.floor(Math.random() * 255);
            buffer32[i] = 0xff000000 | (v << 16) | (v << 8) | v; 
        }
        
        ctx.putImageData(idata, 0, 0);
        return Texture.from(canvas);
    }

    public applyTo(container: Container) {
        this.targetContainer = container;
        this.rebuildFilters();
    }

    public toggleBlur() { this.blurEnabled = !this.blurEnabled; this.rebuildFilters(); }
    public toggleThreshold() { this.thresholdEnabled = !this.thresholdEnabled; this.rebuildFilters(); }
    public toggleDisplacement() { this.displacementEnabled = !this.displacementEnabled; this.rebuildFilters(); }
    public toggleNoise() { this.noiseEnabled = !this.noiseEnabled; this.rebuildFilters(); }

    private rebuildFilters() {
        if (!this.targetContainer) return;
        const filters = [];
        if (this.blurEnabled) filters.push(this.blur);
        if (this.thresholdEnabled) filters.push(this.threshold);
        if (this.displacementEnabled) filters.push(this.displacement);
        if (this.noiseEnabled) filters.push(this.noise);
        this.targetContainer.filters = filters;
    }
    
    public update(ticker: any) {
        if (!this.displacementEnabled) return;
        const speed = CONFIG.VISUALS.DISPLACEMENT_SPEED * ticker.deltaTime;
        this.displacementSprite.x += speed;
        this.displacementSprite.y += speed;
        
        if (this.displacementSprite.x > 256) this.displacementSprite.x -= 256;
        if (this.displacementSprite.y > 256) this.displacementSprite.y -= 256;
    }
}
