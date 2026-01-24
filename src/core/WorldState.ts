import { MapData } from '../data/MapData';
import { CONFIG } from './Config';
import { EntityData } from '../data/EntityData';
import { Structure, createStructure } from '../data/StructureData';
import { Grid } from './Grid';
import { SpatialHash } from './SpatialHash';
import { StructureHash } from './StructureHash';
import { Stock } from '../components/Stock';
import { JobData } from '../data/JobData';
import { PathData } from '../data/PathData';
import { ParticleData } from '../data/ParticleData';

export class WorldState {
    public map: MapData;
    public sprigs: EntityData;
    public structures: Structure[];
    public particles: ParticleData;
    public jobs: JobData;
    public paths: PathData;
    public grid: Grid;
    public spatialHash: SpatialHash;
    public structureHash: StructureHash;
    public terrainDirty: boolean = true;
    public nextStructureId: number = 0;

    constructor() {
        this.map = new MapData(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.sprigs = new EntityData();
        this.structures = [];
        this.particles = new ParticleData();
        this.jobs = new JobData();
        this.paths = new PathData();
        this.grid = new Grid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        this.spatialHash = new SpatialHash(CONFIG.GRID_SIZE * 2);
        this.structureHash = new StructureHash(CONFIG.GRID_SIZE * 4);
        
        // Initial Bake
        this.refreshGrid();
    }

    public refreshGrid() {
        // Placeholder
        if (this.structures.length > 0) {
            this.grid.bake(this.structures);
        }
    }

    public serialize(): string {
        const terrainStr = JSON.stringify(Array.from(this.map.terrain));
        
        // Custom serialization for structures to be multi-line but compact per object
        const structuresStr = this.structures.map(s => JSON.stringify(s)).join(',\n        ');

        return `{
    "width": ${this.map.width},
    "height": ${this.map.height},
    "terrain": ${terrainStr},
    "structures": [
        ${structuresStr}
    ],
    "nextStructureId": ${this.nextStructureId}
}`;
    }

    public load(json: string) {
        const data = JSON.parse(json);

        // Restore Map
        this.map.width = data.width;
        this.map.height = data.height;
        this.map.terrain = new Uint8Array(data.terrain);

        // Restore Structures
        this.structures = data.structures.map((loadedS: any) => {
            // 1. Create default template
            const s = createStructure(loadedS.type, loadedS.x, loadedS.y);
            
            // 2. Override with saved ID and data
            s.id = loadedS.id;

            // 3. Hydrate Stock if present
            if (loadedS.stock) {
                s.stock = Stock.deserialize(loadedS.stock);
            }
            
            return s;
        });

        // Populate Structure Hash
        this.structureHash.clear();
        for (const s of this.structures) {
            this.structureHash.add(s);
        }

        // Restore ID Counter
        if (typeof data.nextStructureId === 'number') {
            this.nextStructureId = data.nextStructureId;
        } else {
            // Migration for old saves: Find max ID + 1
            let maxId = 0;
            for (const s of this.structures) {
                if (s.id > maxId) maxId = s.id;
            }
            this.nextStructureId = maxId + 1;
        }

        // Clear Sprigs (Reset population on load)
        this.sprigs = new EntityData();

        this.terrainDirty = true;
        this.refreshGrid();
    }
}
