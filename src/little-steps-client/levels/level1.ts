import { LevelData, NodeType } from './level-data';

export const level1: LevelData = {
    id: 'level 1',
    title: 'Level 1',
    startNodeId: 0,
    goalNodeId: 5,
    initialResources: { time: 100, stamina: 50, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            id: 0, x: 120, y: 320,
            type: NodeType.START,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 1, x: 330, y: 160,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ],
            nodeEffects: [
                { resource: 'time', op: 'add', value: -5 },
                { resource: 'stamina', op: 'add', value: 30 } 
            ]
        },
        {
            id: 2, x: 330, y: 480,
            type: NodeType.DEFENDER,
            neighbors: [
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 3, x: 560, y: 280,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }] 
        },
        {
            id: 4, x: 560, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: 50 }] }
            ]
        },
        { 
            id: 5, x: 810, y: 320, 
            type: NodeType.GOAL,
            neighbors: [] 
        }
    ]
};