import { Texture, Renderer } from 'pixi.js';
import rough from 'roughjs';
import { CONFIG } from '../config';

export class TextureFactory {
    // Cache for generated textures
    private static sprigTextures: Texture[] = [];
    private static cargoTexture: Texture | null = null;
    private static resourceNodeTexture: Texture | null = null;
    private static castleTexture: Texture | null = null;

    /**
     * Generates a set of wiggly sprig textures (frames for animation).
     */
    public static getSprigTextures(_renderer: Renderer): Texture[] {
        if (this.sprigTextures.length > 0) return this.sprigTextures;

        const count = CONFIG.ROUGHJS.WIGGLE_FRAMES; 
        const r = CONFIG.SPRIG_RADIUS;
        const d = r * 2;
        const padding = 4; // Extra space for roughness
        const size = d + padding * 2;
        
        for (let i = 0; i < count; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            
            const rc = rough.canvas(canvas);
            
            // Draw filled circle with rough style
            rc.circle(size / 2, size / 2, d, {
                fill: '#ffffff', // White for tinting
                stroke: '#000000ff',
                ...CONFIG.ROUGHJS.SPRIG,
            });

            // Convert canvas to Texture
            const texture = Texture.from(canvas);
            this.sprigTextures.push(texture);
        }

        return this.sprigTextures;
    }

    /**
     * Generates a cargo texture.
     */
    public static getCargoTexture(_renderer: Renderer): Texture {
        if (this.cargoTexture) return this.cargoTexture;

        const s = CONFIG.SPRIG_RADIUS * 2;
        const padding = 4;
        const size = s + padding * 2;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const rc = rough.canvas(canvas);
        
        // Draw rough square
        rc.rectangle(padding, padding, s, s, {
            fill: '#ffffff',
            stroke: '#ffffff',
            ...CONFIG.ROUGHJS.CARGO,
        });

        this.cargoTexture = Texture.from(canvas);
        return this.cargoTexture;
    }

    public static getResourceNodeTexture(_renderer: Renderer): Texture {
        if (this.resourceNodeTexture) return this.resourceNodeTexture;

        const radius = CONFIG.RESOURCE_NODE_RADIUS;
        const width = radius * 2;
        const height = radius * 1.5;
        const padding = 10;
        
        const canvas = document.createElement('canvas');
        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;
        
            const rc = rough.canvas(canvas);
        
        // Draw centered in canvas
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        const offset = radius * 0.5;
        const w2 = width / 2;
        const h2 = height / 2;

        // Points relative to center
        // TL, TR, BR, BL
        const points: [number, number][] = [
            [cx - w2, cy - h2],
            [cx + w2, cy - h2],
            [cx + w2 - offset, cy + h2],
            [cx - w2 + offset, cy + h2]
        ];

        rc.polygon(points, {
            fill: '#ffffff',
            stroke: '#ffffff',
            ...CONFIG.ROUGHJS.RESOURCE_NODE,
        });

        this.resourceNodeTexture = Texture.from(canvas);
        return this.resourceNodeTexture;
    }

    public static getCastleTexture(_renderer: Renderer): Texture {
        if (this.castleTexture) return this.castleTexture;

        const r = CONFIG.CASTLE_RADIUS;
        const d = r * 2;
        const padding = 8;
        const size = d + padding * 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const rc = rough.canvas(canvas);
        
        rc.circle(size / 2, size / 2, d, {
            fill: '#ffffff', 
            stroke: '#ffffff',
            ...CONFIG.ROUGHJS.CASTLE,
        });

        this.castleTexture = Texture.from(canvas);
        return this.castleTexture;
    }
}
