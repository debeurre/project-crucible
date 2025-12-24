import { LevelManifest } from '../types/LevelTypes';

export class LevelManager {
    private manifest: LevelManifest | null = null;

    constructor() {}

    public async init() {
        try {
            const response = await fetch('levels/manifest.json');
            this.manifest = await response.json();
            console.log('LevelManager: Manifest loaded', this.manifest);
        } catch (e) {
            console.error('LevelManager: Failed to load manifest', e);
        }
    }

    public async loadLevel(id: string) {
        console.log(`Loading level [${id}]`);
        // Implementation will be added in a later step
    }
}