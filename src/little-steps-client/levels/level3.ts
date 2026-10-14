import { LevelData, NodeType } from './level-data';

// Verified nine-move escape: 1 -> 2 -> 4 -> 7 -> 6 -> 5 -> 0 (bone) -> 7 -> 8 -> 9.
// The bone clearing has a second exit so the chase does not require farming loops.
export const level3: LevelData = {
    id: 'level-3-the-chase-refined',
    title: 'Level 3',
    startNodeId: 1,
    goalNodeId: 9,
    catStartNodeId: 8,
    initialResources: { time: 45, stamina: 65, bones: 0 },
    maxResources: { time: 45, stamina: 100, bones: 1 },
    nodes: [
        {
            id: 0, x: 450, y: 380,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            id: 1, x: 100, y: 400,
            type: NodeType.START,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            id: 2, x: 250, y: 400,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            id: 3, x: 250, y: 240,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            id: 4, x: 450, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            id: 5, x: 450, y: 240,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 0, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 6, x: 600, y: 380,
            type: NodeType.DEFENDER,
            nodeEffects: [{ resource: 'stamina', op: 'add', value: 30 }],
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: 1 }] }
            ]
        },
        {
            id: 7, x: 600, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 0, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            id: 8, x: 750, y: 380,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: 1 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -30 }] }
            ]
        },
        {
            id: 9, x: 820, y: 280,
            type: NodeType.GOAL,
            neighbors: [
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -30 }] }
            ]
        }
    ]
};
