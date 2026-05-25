import { LevelData, NodeType } from './level-data';

// Level 2 — fog of war, multiple branching paths.
//
// Key paths to goal (14):
//   Upper:  0 → 1 → 4(BONE) → 9 → 12 → 14(GOAL)
//   Middle: 0 → 2 → 5 → 9 → 12 → 14(GOAL)
//   Lower:  0 → 3 → 7(STAMINA) → 11 → 13(BONE) → 14(GOAL)
//   Risky:  any path through 6(SQUIRREL) → 10 → 13(BONE) → 14(GOAL)

export const level2: LevelData = {
    id: 'gradual-reveal',
    title: 'Level 2',
    startNodeId: 0,
    goalNodeId: 14,
    initialResources: { time: 85, stamina: 65, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            // START: puppy's starting position — three exits branch upper, middle, and lower
            id: 0, x: 80, y: 370,
            type: NodeType.START,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            // UPPER FORK: leads to the bone node (4) or the middle junction (5)
            id: 1, x: 220, y: 200,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // MIDDLE FORK: leads to the middle junction (5) or the squirrel (6)
            id: 2, x: 220, y: 370,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            // LOWER FORK: leads to the stamina boost (7) or lower junction (8)
            id: 3, x: 220, y: 530,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -20 }] }
            ]
        },
        {
            // BONE: upper detour — collects the required bone on arrival, then heads to node 9
            id: 4, x: 390, y: 205,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // MIDDLE JUNCTION: crossroads connecting upper fork, middle fork, squirrel, and node 9
            id: 5, x: 390, y: 310,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // SQUIRREL: risky shortcut — only one exit and it's expensive
            id: 6, x: 510, y: 370,
            type: NodeType.DEFENDER,
            neighbors: [
                { targetId: 10, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -20 }] }
            ]
        },
        {
            // STAMINA BOOST: lower detour — restores stamina on arrival, then heads to node 11
            id: 7, x: 360, y: 540,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'stamina', op: 'add', value: 40 }],
            neighbors: [
                { targetId: 11, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            // LOWER JUNCTION: shortcuts from lower fork toward squirrel or node 11
            id: 8, x: 430, y: 460,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 11, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // UPPER RIGHT: reached from bone node or middle junction — splits toward 12 (goal path) or 10
            id: 9, x: 630, y: 200,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 12, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 10, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // CENTER RIGHT: reached from squirrel or upper right — funnels into the lower bone node (13)
            id: 10, x: 630, y: 370,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 13, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            // LOWER RIGHT: reached from stamina boost or lower junction — funnels into node 13
            id: 11, x: 630, y: 490,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 13, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // UPPER GOAL PATH: direct route to the goal from node 9
            id: 12, x: 770, y: 220,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 14, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // BONE: lower convergence point — collects the required bone on arrival, then heads to goal
            id: 13, x: 770, y: 430,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 14, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // GOAL: home — puppy must carry a bone to enter
            id: 14, x: 900, y: 320,
            type: NodeType.GOAL,
            neighbors: []
        }
    ]
};
