import { LevelData, NodeType } from './level-data';

// Tutorial — introduces movement, bones, and the squirrel node.
//
// Layout (left → right):
//   0(START) → 1 → 2(BONE) → 4 → 6(GOAL)
//                ↘ 3(SQUIRREL) → 4
//                             ↘ 5 → 6

export const level0: LevelData = {
    id: 'tutorial',
    title: 'Tutorial',
    startNodeId: 0,
    goalNodeId: 6,
    initialResources: { time: 60, stamina: 35, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            // START: puppy's starting position
            id: 0, x: 100, y: 400,
            type: NodeType.START,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // Crossroads: upper path leads to bone, lower path leads to the squirrel
            id: 1, x: 300, y: 400,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // BONE: upper path — collects the required bone on arrival
            id: 2, x: 480, y: 250,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // SQUIRREL: lower path — forces the costlier exit
            id: 3, x: 480, y: 540,
            type: NodeType.DEFENDER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -20 }] }, // squirrel picks this
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }  // squirrel avoids this
            ]
        },
        {
            // Junction: upper path and squirrel's expensive exit both arrive here
            id: 4, x: 660, y: 360,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // Exit from squirrel's cheap path
            id: 5, x: 660, y: 530,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // GOAL: home — puppy must carry a bone to enter
            id: 6, x: 830, y: 420,
            type: NodeType.GOAL,
            neighbors: []
        }
    ]
};
