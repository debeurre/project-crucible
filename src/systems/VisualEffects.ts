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
    private displacementSprite: Sprite;
    private displacementFilter: DisplacementFilter;
    
    constructor() {
        // 1. Generate Noise Texture for Displacement
        const noiseTexture = this.createNoiseTexture();
        
        // Set Wrap Mode to Repeat so we can scroll it infinitely
        if (noiseTexture.source.style) {
            noiseTexture.source.style.addressMode = 'repeat';
        }

        this.displacementSprite = new Sprite(noiseTexture);
        this.displacementSprite.scale.set(4); // Chunky noise
        
        // The displacement filter uses the sprite's texture and transform
        this.displacementFilter = new DisplacementFilter(
             this.displacementSprite,
             CONFIG.VISUALS.DISPLACEMENT_SCALE * CONFIG.VISUALS.WIGGLE_STRENGTH
        );
        
        // We don't strictly need to add the sprite to the stage for the filter to work 
        // (it uses the texture), but keeping it logically updated is good.
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
            // Random grayscale noise
            const v = Math.floor(Math.random() * 255);
            buffer32[i] = 0xff000000 | (v << 16) | (v << 8) | v; 
        }
        
        ctx.putImageData(idata, 0, 0);
        return Texture.from(canvas);
    }

    public applyTo(container: Container) {
        // Stack: Blur -> Contrast -> Displacement -> Noise
        
        // 1. Blur (Softens everything)
        const blur = new BlurFilter();
        blur.strength = CONFIG.VISUALS.BLUR_STRENGTH;
        // Decrease quality for performance? default is fine.
        
        // 2. Contrast (Thresholding - creates "Liquid" blobs from blur)
        const colorMatrix = new ColorMatrixFilter();
        colorMatrix.contrast(CONFIG.VISUALS.CONTRAST_AMOUNT, false);
        
        // 3. Noise (Paper Grain texture)
        const noise = new NoiseFilter({
            noise: CONFIG.VISUALS.NOISE_STRENGTH
        });
        
        // Apply in specific order
        container.filters = [blur, colorMatrix, this.displacementFilter, noise];
    }
    
    public update(ticker: any) {
        // Animate displacement (The "Wiggle" or "Boiling" effect)
        const speed = CONFIG.VISUALS.DISPLACEMENT_SPEED * ticker.deltaTime;
        this.displacementSprite.x += speed;
        this.displacementSprite.y += speed;
        
        // Reset to prevent infinite growth
        if (this.displacementSprite.x > 256) this.displacementSprite.x -= 256;
        if (this.displacementSprite.y > 256) this.displacementSprite.y -= 256;
    }
}
