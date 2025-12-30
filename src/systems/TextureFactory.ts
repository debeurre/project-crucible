import { Texture, Renderer } from 'pixi.js';
import rough from 'roughjs';
import { CONFIG } from '../config';

export class TextureFactory {
    // Cache for generated textures
    private static sprigTextures: Texture[] = [];
    private static cargoTexture: Texture | null = null;
    private static bushTexture: Texture | null = null;
    private static trapezoidTexture: Texture | null = null;
    private static castleTexture: Texture | null = null;
    private static crucibleTexture: Texture | null = null;
    private static nestTexture: Texture | null = null;
    private static cookieTexture: Texture | null = null;
    private static crumbTexture: Texture | null = null;

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
        
        // Draw rough triangle (matching crumb shape but sized for cargo)
        const cx = size / 2;
        const cy = size / 2;
        // Use s/2 as radius equivalent to fit in the same bounding box as the previous square
        const r = s / 1.5; 

        const points: [number, number][] = [];
        for(let i=0; i<3; i++) {
            const angle = -Math.PI/2 + (Math.PI * 2 / 3) * i;
            points.push([cx + r*Math.cos(angle), cy + r*Math.sin(angle)]);
        }
        
        rc.polygon(points, {
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 0.5,
            fillStyle: 'solid',
            roughness: 0.5
        });

        this.cargoTexture = Texture.from(canvas);
        return this.cargoTexture;
    }

    public static getBushTexture(_renderer: Renderer): Texture {
        if (this.bushTexture) return this.bushTexture;

        const baseR = CONFIG.RESOURCE_NODE_RADIUS;
        const leafD = baseR * 0.8; // Individual circle diameter
        const leafR = leafD / 2;
        
        // Calculate canvas size to fit the staggered 2x2 grid
        // Row 1: [0, leafD]
        // Row 2: [leafR, leafD + leafR]
        // Total Width approx 1.5 * leafD + buffer
        const padding = 16;
        const canvasW = leafD * 2.5 + padding;
        const canvasH = leafD * 2 + padding;
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        
        const rc = rough.canvas(canvas);
        
        const options = {
            fill: '#ffffff',
            ...CONFIG.ROUGHJS.RESOURCE_NODE,
            stroke: 'none',
            strokeWidth: 0
        };

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw 4 circles in a staggered row pattern
        // Row 1
        rc.circle(cx - leafR, cy - leafR/2, leafD, options);
        rc.circle(cx + leafR, cy - leafR/2, leafD, options);
        
        // Row 2 (Staggered right)
        rc.circle(cx, cy + leafR/2, leafD, options);
        rc.circle(cx + leafD, cy + leafR/2, leafD, options);

        this.bushTexture = Texture.from(canvas);
        return this.bushTexture;
    }

    public static getTrapezoidTexture(_renderer: Renderer): Texture {
        if (this.trapezoidTexture) return this.trapezoidTexture;

        const radius = CONFIG.RESOURCE_NODE_RADIUS;
        const width = radius * 2;
        const height = radius * 1.5;
        const padding = 10;
        
        const canvas = document.createElement('canvas');
        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;
        
        const rc = rough.canvas(canvas);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        
        const offset = radius * 0.5;
        const w2 = width / 2;
        const h2 = height / 2;

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

        this.trapezoidTexture = Texture.from(canvas);
        return this.trapezoidTexture;
    }

    public static getCastleTexture(_renderer: Renderer): Texture {
        if (this.castleTexture) return this.castleTexture;

        const r = CONFIG.CASTLE_RADIUS;
        const w = r * 2;
        // Height: Base (r) + Tower (r) + Flag (r) + Padding
        const h = r * 3; 
        const padding = 8;
        
        const canvas = document.createElement('canvas');
        canvas.width = w + padding * 2;
        canvas.height = h + padding * 2;
        
        const rc = rough.canvas(canvas);
        
        // Coordinates (0,0 is top left of drawing area)
        const cx = canvas.width / 2;
        const bottomY = canvas.height - padding;
        const baseTopY = bottomY - r;
        const towerTopY = baseTopY - r;
        
        // 1. Base Rect
        rc.rectangle(cx - r, baseTopY, w, r, {
            fill: '#ffffff', 
            stroke: '#ffffff',
            ...CONFIG.ROUGHJS.CASTLE,
        });

        // 2. Tower Rect
        rc.rectangle(cx - r/2, towerTopY, r, r, {
            fill: '#ffffff', 
            stroke: '#ffffff',
            ...CONFIG.ROUGHJS.CASTLE,
        });

        // 3. Door (Black)
        const doorW = r / 2;
        const doorH = r / 2;
        rc.rectangle(cx - doorW/2, bottomY - doorH, doorW, doorH, {
            fill: '#000000',
            fillStyle: 'solid',
            stroke: '#000000',
            roughness: 1
        });

        // 4. Flag
        const poleTopY = towerTopY - r;
        // Pole
        rc.line(cx, towerTopY, cx, poleTopY, { stroke: '#ffffff', strokeWidth: 2, roughness: 1 });
        // Pennant (Triangle)
        rc.polygon([
            [cx, poleTopY],
            [cx + r/1.5, poleTopY + r/4],
            [cx, poleTopY + r/2]
        ], {
            fill: '#ffffff',
            fillStyle: 'solid',
            stroke: '#ffffff',
            roughness: 1
        });

        this.castleTexture = Texture.from(canvas);
        return this.castleTexture;
    }

    public static getCrucibleTexture(_renderer: Renderer): Texture {
        if (this.crucibleTexture) return this.crucibleTexture;

        const r = CONFIG.CRUCIBLE_RADIUS;
        const d = r * 2;
        const padding = 8;
        const size = d + padding * 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const rc = rough.canvas(canvas);
        
        rc.circle(size / 2, size / 2, d, {
            fill: '#ffffff', 
            stroke: '#000000',
            ...CONFIG.ROUGHJS.CRUCIBLE,
        });

        this.crucibleTexture = Texture.from(canvas);
        return this.crucibleTexture;
    }

    public static getBerryTexture(_renderer: Renderer): Texture {
        const radius = CONFIG.ITEMS.BERRY_RADIUS;
        const size = radius * 2 + 4; // Padding
        
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        
        const rc = rough.canvas(canvas);
        
        rc.circle(size / 2, size / 2, radius * 2, {
            fill: '#ffffff',
            stroke: 'none',
            fillStyle: 'solid',
            roughness: 0.5
        });

        return Texture.from(canvas);
    }

    public static getNestTexture(_renderer: Renderer): Texture {
        if (this.nestTexture) return this.nestTexture;
        
        const r = CONFIG.CASTLE_RADIUS; 
        const padding = 8;
        const size = r * 2 + padding * 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const rc = rough.canvas(canvas);
        
        const cx = size / 2;
        const cy = size / 2;
        const points: [number, number][] = [];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
        
        rc.polygon(points, {
            fill: '#ffffff', 
            stroke: '#000000',
            strokeWidth: 2,
            roughness: 1.5,
            fillStyle: 'solid' 
        });
        
        this.nestTexture = Texture.from(canvas);
        return this.nestTexture;
    }

    public static getCookieTexture(_renderer: Renderer): Texture {
        if (this.cookieTexture) return this.cookieTexture;
        
        const r = CONFIG.RESOURCE_NODE_RADIUS; 
        const padding = 8;
        const size = r * 2 + padding * 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const rc = rough.canvas(canvas);
        
        const cx = size / 2;
        const cy = size / 2;
        
        rc.circle(cx, cy, r * 2, {
             fill: '#ffffff', 
             stroke: '#000000',
             strokeWidth: 2,
             roughness: 1.5,
             fillStyle: 'solid'
        });
        
        this.cookieTexture = Texture.from(canvas);
        return this.cookieTexture;
    }

    public static getCrumbTexture(_renderer: Renderer): Texture {
        if (this.crumbTexture) return this.crumbTexture;
        
        const radius = CONFIG.ITEMS.CRUMB_RADIUS;
        const size = radius * 3 + 4; 
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const rc = rough.canvas(canvas);
        
        const cx = size / 2;
        const cy = size / 2;
        const r = radius * 1.5;
        
        const points: [number, number][] = [];
        for(let i=0; i<3; i++) {
            const angle = -Math.PI/2 + (Math.PI * 2 / 3) * i;
            points.push([cx + r*Math.cos(angle), cy + r*Math.sin(angle)]);
        }
        
        rc.polygon(points, {
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 0.5,
            fillStyle: 'solid',
            roughness: 0.5
        });
        
        this.crumbTexture = Texture.from(canvas);
        return this.crumbTexture;
    }
}
