import { LevelData, NodeType } from './level-data';

export const level2: LevelData = {
    id: 'level 2',
    title: 'Level 2',
    startNodeId: 0,
    goalNodeId: 1,
    initialResources: { time: 80, stamina: 40, bones: 0 },
    maxResources: { stamina: 80 },
    nodes: [
        { 
            id: 0, 
            x: 100, 
            y: 300, 
            type: NodeType.START, 
            neighbors: [
                { targetId: 1, effects: [] }
            ] 
        },
        { 
            id: 1, 
            x: 700, 
            y: 300, 
            type: NodeType.GOAL, 
            neighbors: [] 
        }
    ]
};