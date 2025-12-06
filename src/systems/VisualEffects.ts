import { 
    Container, 
    DisplacementFilter, 
    BlurFilter, 
    NoiseFilter, 
    ColorMatrixFilter, 
    Texture, 
    Sprite
} from 'pixi.js';
import { CONFIG } from '../config';

export class VisualEffects {
    // Filters
    public blur: BlurFilter;
    public contrast: ColorMatrixFilter;
    public noise: NoiseFilter;
    public displacement: DisplacementFilter;
    private displacementSprite: Sprite;
    
    // State
    public blurEnabled = true;
    public contrastEnabled = true;
    public displacementEnabled = true;
    public noiseEnabled = true;
    
    private container: Container | null = null;

    constructor() {
        // 1. Blur
        this.blur = new BlurFilter();
        this.blur.strength = CONFIG.VISUALS.BLUR_STRENGTH;

        // 2. Contrast
        this.contrast = new ColorMatrixFilter();
        this.contrast.matrix = [
            1, 0, 0, 0, 0,
            0, 1, 0, 0, 0,
            0, 0, 1, 0, 0,
            0, 0, 0, 15, -6
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
        this.displacement = new DisplacementFilter(
             this.displacementSprite,
             CONFIG.VISUALS.DISPLACEMENT_SCALE * CONFIG.VISUALS.WIGGLE_STRENGTH
        );
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
        this.container = container;
        this.rebuildFilters();
    }

    public toggleBlur() { this.blurEnabled = !this.blurEnabled; this.rebuildFilters(); }
    public toggleContrast() { this.contrastEnabled = !this.contrastEnabled; this.rebuildFilters(); }
    public toggleDisplacement() { this.displacementEnabled = !this.displacementEnabled; this.rebuildFilters(); }
    public toggleNoise() { this.noiseEnabled = !this.noiseEnabled; this.rebuildFilters(); }

    private rebuildFilters() {
        if (!this.container) return;
        const filters = [];
        if (this.blurEnabled) filters.push(this.blur);
        if (this.contrastEnabled) filters.push(this.contrast);
        if (this.displacementEnabled) filters.push(this.displacement);
        if (this.noiseEnabled) filters.push(this.noise);
        this.container.filters = filters;
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
