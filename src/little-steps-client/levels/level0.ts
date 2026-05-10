import { LevelData, NodeType } from './level-data';

// Tutorial level: teaches movement, bones, and defender nodes step by step.
// Layout (left to right):
//   0(START) → 1 → 2(bone, upper) → 4 → 6(GOAL)
//                ↘ 3(defender)  → 4
//                               ↘ 5 → 6
export const level0: LevelData = {
    id: 'tutorial',
    title: 'Tutorial',
    startNodeId: 0,
    goalNodeId: 6,
    initialResources: { time: 100, stamina: 60, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            id: 0, x: 100, y: 400,
            type: NodeType.START,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            id: 1, x: 300, y: 400,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // Bone node — upper path
            id: 2, x: 480, y: 250,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // Defender (squirrel) node — lower path
            id: 3, x: 480, y: 540,
            type: NodeType.DEFENDER,
            neighbors: [
                // expensive path — defender will choose this
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -20 }] },
                // cheap path — defender avoids this
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            id: 4, x: 660, y: 360,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            id: 5, x: 660, y: 530,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            id: 6, x: 830, y: 420,
            type: NodeType.GOAL,
            neighbors: []
        }
    ]
};
