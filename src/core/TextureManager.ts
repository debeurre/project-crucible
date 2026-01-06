import { Texture, Application, Graphics } from 'pixi.js';

export class TextureManager {
    // Fallback to white texture initially
    public static sootTexture: Texture = Texture.WHITE;

    public static init(app: Application): void {
        const g = new Graphics();

        // 1. Draw "Sketchy" Body (White base for tinting)
        // Fill center to ensure it's solid
        g.circle(0, 0, 18).fill(0xFFFFFF);

        // Use multiple strokes to simulate roughness/sketchiness
        for (let i = 0; i < 4; i++) {
            const r = 18 + Math.random() * 3; // Radius variation
            const offset = 2;
            const ox = (Math.random() - 0.5) * offset;
            const oy = (Math.random() - 0.5) * offset;
            
            g.circle(ox, oy, r).stroke({ width: 1, color: 0xFFFFFF, alpha: 0.6 });
        }

        // 2. Eyes (Black)
        // Positioned relative to center
        g.circle(-6, -4, 3.5).fill(0x000000);
        g.circle(6, -4, 3.5).fill(0x000000);

        // 3. Generate Texture
        // Using render method to generate texture from graphics
        try {
            this.sootTexture = app.renderer.generateTexture({
                target: g,
                resolution: 2,
                antialias: true
            });
        } catch (e) {
            console.warn("TextureManager: generateTexture failed, falling back to basic graphics.", e);
            // Fallback: Just keep Texture.WHITE or try a simpler generation if possible
        }
    }
}