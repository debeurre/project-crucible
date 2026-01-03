export interface LevelStructure {
    type: string;
    x: number;
    y: number;
    energy?: number;
    relative?: boolean;
}

export interface LevelData {
    id: string;
    mapMode: string;
    structures: LevelStructure[];
}

export interface ManifestEntry {
    id: string;
    path: string;
}

export interface LevelManifest {
    default: string;
    levels: ManifestEntry[];
}
