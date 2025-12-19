import { Texture, Renderer } from 'pixi.js';
import rough from 'roughjs';
import { CONFIG } from '../config';

export class TextureFactory {
    // Cache for generated textures
    private static sprigTextures: Texture[] = [];
    private static cargoTexture: Texture | null = null;

    /**
     * Generates a set of wiggly sprig textures (frames for animation).
     */
    public static getSprigTextures(_renderer: Renderer): Texture[] {
        if (this.sprigTextures.length > 0) return this.sprigTextures;

        const count = 3; // 3 frames for the wiggle loop
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
                fillStyle: 'solid', // Solid fill for base visibility, or 'hachure' for sketchiness?
                // Spec says: "MVP: Just increase line width... We will apply the Rough.js texture later."
                // Spec V2 says: "Hachure Fill (The Scribble): Do not use graphics.fill()."
                // But for the Sprig (tiny unit), hachure might be too noisy.
                // "Kirby's Dream Land 3" style is often solid color with crayon edge.
                // Let's try solid fill with rough stroke first.
                roughness: 2.5,
                stroke: '#ffffff',
                strokeWidth: 2,
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
            fillStyle: 'zigzag', // Scribble fill for cargo
            hachureGap: 3,
            roughness: 2,
            stroke: '#ffffff',
            strokeWidth: 2
        });

        this.cargoTexture = Texture.from(canvas);
        return this.cargoTexture;
    }
}
