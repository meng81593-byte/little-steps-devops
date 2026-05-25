import { LevelData, NodeType } from './level-data';

// Level 3 — the cat chase. Cat spawns at node 7.
//
// Layout (bidirectional edges simplified to →):
//   1(START) ──→ 2 ──→ 3(STAMINA) ──→ 5(BONE) ──→ 6 ──→ 8 ──→ 9(GOAL)
//                ↘                               ↗  ↕
//                 4(RISKY) ──────────────────────   7(CAT)
//
// Cat patrols between nodes 4, 6, 7, 8; player must avoid sharing a node with it.

export const level3: LevelData = {
    id: 'level-3-the-chase-refined',
    title: 'Level 3',
    startNodeId: 1,
    goalNodeId: 9,
    catStartNodeId: 7,
    initialResources: { time: 90, stamina: 45, bones: 0 },
    maxResources: { time: 100, stamina: 100, bones: 1 },
    nodes: [
        {
            // START: puppy's starting position — only exit leads to the first split
            id: 1, x: 100, y: 400,
            type: NodeType.START,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // FIRST SPLIT: can backtrack to start, go upper toward stamina, or lower into risky path
            id: 2, x: 250, y: 400,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // STAMINA BOOST: upper detour — restores stamina on arrival, leads to the bone node
            id: 3, x: 250, y: 240,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'stamina', op: 'add', value: 30 }],
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // RISKY PATH: lower shortcut — close to cat territory, direct conflict risk at node 7
            id: 4, x: 450, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // BONE: end of upper detour — collects the required bone on arrival
            id: 5, x: 450, y: 240,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] }
            ]
        },
        {
            // JUNCTION: convergence of upper and lower paths — four exits including cat's territory
            id: 6, x: 600, y: 380,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -15 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // CAT TERRITORY: cat spawns here — shares edges with risky path, junction, and safe node
            id: 7, x: 600, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // SAFE NODE: last stop before the goal — cat can still reach here from node 7
            id: 8, x: 750, y: 380,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        },
        {
            // GOAL: home — puppy must carry a bone to enter
            id: 9, x: 820, y: 280,
            type: NodeType.GOAL,
            neighbors: [
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] }
            ]
        }
    ]
};
