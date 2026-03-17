import { LevelData, NodeType } from './level-data';

export const level2: LevelData = {
    id: 'gradual-reveal',
    title: 'Level 2',
    startNodeId: 0,
    goalNodeId: 14,
    initialResources: { time: 140, stamina: 80, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            id: 0, x: 80, y: 320, 
            type: NodeType.START,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 1, x: 200, y: 120, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 2, x: 220, y: 320, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 3, x: 200, y: 520, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -20 }] }
            ]
        },
        {
            id: 4, x: 380, y: 100, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }]
        },
        {
            id: 5, x: 380, y: 240, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 6, x: 450, y: 320, 
            type: NodeType.DEFENDER,
            neighbors: [
                { targetId: 10, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -20 }] }
            ]
        },
        {
            id: 7, x: 380, y: 540, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 11, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ],
            nodeEffects: [{ resource: 'stamina', op: 'add', value: 40 }]
        },
        {
            id: 8, x: 420, y: 440, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 11, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            id: 9, x: 600, y: 140, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 12, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 10, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 10, x: 650, y: 320, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 13, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 11, x: 620, y: 500, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 13, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 12, x: 780, y: 200, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 14, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 13, x: 760, y: 420, 
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 14, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }]
        },
        { 
            id: 14, x: 880, y: 320, 
            type: NodeType.GOAL,
            neighbors: [] 
        }
    ]
};