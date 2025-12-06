import {
    Container,
    DisplacementFilter,
    BlurFilter,
    NoiseFilter,
    Filter,
    GlProgram,
    Texture,
    Sprite
} from 'pixi.js';
import { CONFIG } from '../config';

const vertexShader = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    uniform mat3 projectionMatrix;
    varying vec2 vTextureCoord;
    void main(void) {
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
    }
`;

const fragmentShader = `
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    
    void main(void) {
        vec4 color = texture2D(uSampler, vTextureCoord);
        // Threshold at 0.5 alpha
        if (color.a > 0.5) {
            // Un-premultiply to recover original color brightness, then force full alpha
            // Check for 0 alpha to avoid divide by zero (though > 0.5 implies != 0)
            gl_FragColor = vec4(color.rgb / color.a, 1.0);
        } else {
            gl_FragColor = vec4(0.0);
        }
    }
`;

export class VisualEffects {
    // Filters
    public blur: BlurFilter;
    public threshold: Filter; // Renamed from contrast
    public noise: NoiseFilter;
    public displacement: DisplacementFilter;
    private displacementSprite: Sprite;
    
    // State
    public blurEnabled = true;
    public thresholdEnabled = false; // Renamed from contrastEnabled
    public displacementEnabled = false; // Default OFF
    public noiseEnabled = false;        // Default OFF
    
    private container: Container | null = null;

    constructor() {
        // 1. Blur
        this.blur = new BlurFilter();
        this.blur.strength = CONFIG.VISUALS.BLUR_STRENGTH;

        // 2. Threshold (Custom Shader for Liquid Effect)
        this.threshold = new Filter({
            glProgram: new GlProgram({
                vertex: vertexShader,
                fragment: fragmentShader
            })
        });
        
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
    public toggleThreshold() { this.thresholdEnabled = !this.thresholdEnabled; this.rebuildFilters(); }
    public toggleDisplacement() { this.displacementEnabled = !this.displacementEnabled; this.rebuildFilters(); }
    public toggleNoise() { this.noiseEnabled = !this.noiseEnabled; this.rebuildFilters(); }

    private rebuildFilters() {
        if (!this.container) return;
        const filters = [];
        if (this.blurEnabled) filters.push(this.blur);
        if (this.thresholdEnabled) filters.push(this.threshold);
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
