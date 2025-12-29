import { LevelManifest, LevelData } from '../types/LevelTypes';
import { MapSystem } from './MapSystem';
import { ResourceSystem } from './ResourceSystem';
import { MapShape } from '../types/MapTypes';
import { InvaderSystem } from './InvaderSystem';

export class LevelManager {
    private manifest: LevelManifest | null = null;
    private mapSystem: MapSystem;
    private resourceSystem: ResourceSystem;
    private invaderSystem: InvaderSystem;

    constructor(mapSystem: MapSystem, resourceSystem: ResourceSystem, invaderSystem: InvaderSystem) {
        this.mapSystem = mapSystem;
        this.resourceSystem = resourceSystem;
        this.invaderSystem = invaderSystem;
    }

    public async init() {
        try {
            const response = await fetch(`levels/manifest.json?v=${Date.now()}`);
            this.manifest = await response.json();
            console.log('LevelManager: Manifest loaded', this.manifest);
        } catch (e) {
            console.error('LevelManager: Failed to load manifest', e);
        }
    }

    public getDefaultLevelId(): string {
        return this.manifest?.default || 'room0';
    }

    public async loadLevel(id: string) {
        if (!this.manifest) {
            console.error('LevelManager: Manifest not loaded');
            return;
        }

        const levelEntry = this.manifest.levels.find(l => l.id === id);
        if (!levelEntry) {
            console.error(`LevelManager: Level ${id} not found in manifest`);
            return;
        }

        try {
            console.log(`Loading level [${id}] from ${levelEntry.path}`);
            const response = await fetch(levelEntry.path);
            const data: LevelData = await response.json();

            // 1. Set Map Mode
            this.mapSystem.setMode(data.mapMode as MapShape);

            // 2. Load Structures
            this.resourceSystem.loadLevelData(data.structures);
            this.invaderSystem.loadLevelData(data.structures);

        } catch (e) {
            console.error(`LevelManager: Failed to load level data for ${id}`, e);
        }
    }
}