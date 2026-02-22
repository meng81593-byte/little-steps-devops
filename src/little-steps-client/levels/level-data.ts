export type GraphNode = {
    id: number;
    x: number;
    y: number;
    neighbors: number[];
};

export type LevelData = {
    id: string;
    title: string;
    nodes: GraphNode[];
    startNodeId: number;
    goalNodeId: number;
};

export const LEVELS: LevelData[] = [
    {
        id: 'park-paths',
        title: 'Park Paths',
        nodes: [
            { id: 0, x: 120, y: 320, neighbors: [1, 2] },
            { id: 1, x: 330, y: 160, neighbors: [3] },
            { id: 2, x: 330, y: 480, neighbors: [3, 4] },
            { id: 3, x: 560, y: 280, neighbors: [5] },
            { id: 4, x: 560, y: 520, neighbors: [5] },
            { id: 5, x: 810, y: 320, neighbors: [] }
        ],
        startNodeId: 0,
        goalNodeId: 5
    }
];
