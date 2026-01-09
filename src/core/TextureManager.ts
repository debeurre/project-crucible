import { Texture, Application, CanvasSource } from 'pixi.js';

export class TextureManager {
    public static sootTexture: Texture;

    public static async init(_app: Application): Promise<void> {
        const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <filter id="f">
      <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
    </filter>
  </defs>
  <g filter="url(#f)">
    <circle cx="32" cy="32" r="18" fill="white" />
    <circle cx="26" cy="25" r="3" fill="black" />
    <circle cx="38" cy="25" r="3" fill="black" />
  </g>
</svg>`;

        const img = new Image();
        const loadPromise = new Promise((resolve) => {
            img.onload = resolve;
        });

        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgContent);

        await loadPromise;

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
        }

        const source = new CanvasSource({ resource: canvas });
        this.sootTexture = new Texture({ source });
    }
}
