export enum TaskIntent {
    GREEN_HARVEST = 0x228B22, // Forest Green
    RED_ATTACK = 0xFF0000,    // Red
    BLUE_SCOUT = 0x0000FF,    // Blue
    YELLOW_ASSIST = 0xFFFF00, // Yellow
}

export enum NodeType {
    WAYPOINT = 'WAYPOINT',
    BUILDING = 'BUILDING',
    RESOURCE = 'RESOURCE'
}

export interface GraphNode {
    id: number;
    x: number;
    y: number;
    type: NodeType;
}

export interface GraphEdge {
    id: number;
    nodeAId: number;
    nodeBId: number;
    intent: TaskIntent;
    isActive: boolean;
}

export interface GridCoord {
    gx: number;
    gy: number;
}
