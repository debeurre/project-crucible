import { MapSystem } from './MapSystem';
import { ResourceSystem } from './ResourceSystem';
import { MapShape } from '../types/MapTypes';

interface LevelManifest {
    levels: { id: string, name: string, file: string }[];
}

interface LevelData {
    id: string;
    map: {
        shape: string;
        width: number;
        height: number;
    };
    structures: {
        type: string;
        x: number;
        y: number;
        relative?: boolean;
    }[];
}

export class LevelManager {
    private mapSystem: MapSystem;
    private resourceSystem: ResourceSystem;
    private manifest: LevelManifest | null = null;

    constructor(mapSystem: MapSystem, resourceSystem: ResourceSystem) {
        this.mapSystem = mapSystem;
        this.resourceSystem = resourceSystem;
    }

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
        if (!this.manifest) {
            console.warn('LevelManager: Manifest not loaded yet');
            return;
        }

        const levelEntry = this.manifest.levels.find(l => l.id === id);
        if (!levelEntry) {
            console.error(`LevelManager: Level ${id} not found in manifest`);
            return;
        }

        try {
            const response = await fetch(levelEntry.file);
            const data: LevelData = await response.json();
            
            console.log(`LevelManager: Loading level ${id}`, data);
            
            // 1. Set Map Mode
            // Cast string to MapShape, defaulting to FULL if invalid
            const shape = (data.map.shape as MapShape) || MapShape.FULL;
            this.mapSystem.setMode(shape);

            // 2. Load Structures
            this.resourceSystem.loadLevelData(data.structures);

        } catch (e) {
            console.error(`LevelManager: Failed to load level ${id}`, e);
        }
    }
}
