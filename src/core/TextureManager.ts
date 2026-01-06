import { Texture, Application } from 'pixi.js';

export class TextureManager {
    public static sootTexture: Texture;

    public static init(app: Application): void {
        const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <filter id="fuzzy">
      <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="3" />
      <feDisplacementMap in="SourceGraphic" scale="3" />
    </filter>
  </defs>
  <circle cx="32" cy="32" r="20" fill="white" filter="url(#fuzzy)" />
  <circle cx="26" cy="28" r="4" fill="black" />
  <circle cx="38" cy="28" r="4" fill="black" />
</svg>`;

        // Convert to data URI to ensure it loads correctly
        const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        
        this.sootTexture = Texture.from(svgData);
    }
}
