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

// Standard Pixi v8 Filter Vertex Shader
const vertexShader = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.w;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

// Simple Alpha Threshold Shader (Liquid Effect)
// This clips any pixel with alpha < 0.5, and forces alpha = 1.0 for the rest.
// It preserves RGB values to prevent color shifting (White/Yellow land).
const liquidFragment = `
    in vec2 vTextureCoord;
    out vec4 finalColor;
    uniform sampler2D uTexture;

    void main(void) {
        vec4 color = texture(uTexture, vTextureCoord);
        if (color.a > 0.5) {
            finalColor = vec4(color.rgb, 1.0);
        } else {
            finalColor = vec4(0.0);
        }
    }
`;

export class VisualEffects {
    // Filters
    public blur: BlurFilter;
    public threshold: Filter; 
    public noise: NoiseFilter;
    public displacement: DisplacementFilter;
    private displacementSprite: Sprite;
    
    // State
    public blurEnabled = true;
    public thresholdEnabled = false; 
    public displacementEnabled = false; // Default OFF
    public noiseEnabled = false;        // Default OFF
    
    private container: Container | null = null;

    constructor() {
        // 1. Blur
        this.blur = new BlurFilter();
        this.blur.strength = CONFIG.VISUALS.BLUR_STRENGTH;

        // 2. Threshold (Liquid Effect)
        this.threshold = new Filter({
            glProgram: new GlProgram({
                vertex: vertexShader,
                fragment: liquidFragment,
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
