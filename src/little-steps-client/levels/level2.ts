import { LevelData, NodeType } from './level-data';

export const level2: LevelData = {
    id: 'gradual-reveal',
    title: 'Level 2',
    startNodeId: 0,
    goalNodeId: 14,
    initialResources: { time: 85, stamina: 65, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            id: 0, x: 80, y: 370,
            type: NodeType.START,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 1, x: 220, y: 200,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 2, x: 220, y: 370,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 3, x: 220, y: 530,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -20 }] }
            ]
        },
        {
            id: 4, x: 390, y: 205,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }]
        },
        {
            id: 5, x: 390, y: 310,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 6, x: 510, y: 370,
            type: NodeType.DEFENDER,
            neighbors: [
                { targetId: 10, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -20 }] }
            ]
        },
        {
            id: 7, x: 360, y: 540,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 11, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ],
            nodeEffects: [{ resource: 'stamina', op: 'add', value: 40 }]
        },
        {
            id: 8, x: 430, y: 460,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 11, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            id: 9, x: 630, y: 200,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 12, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 10, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 10, x: 630, y: 370,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 13, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            id: 11, x: 630, y: 490,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 13, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 12, x: 770, y: 220,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 14, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 13, x: 770, y: 430,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 14, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }]
        },
        {
            id: 14, x: 900, y: 320,
            type: NodeType.GOAL,
            neighbors: []
        }
    ]
};
