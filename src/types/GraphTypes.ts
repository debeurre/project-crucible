export enum TaskIntent {
    GREEN_HARVEST = 0,
    RED_ATTACK = 1,
    BLUE_SCOUT = 2,
    YELLOW_ASSIST = 3,
    WHITE_FOCUS = 4
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
    active: boolean; // True if part of the current uncommited chain
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
