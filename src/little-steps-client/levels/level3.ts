import { LevelData, NodeType } from './level-data';

// Level 3 — the cat chase. Cat spawns at node 8.
//
// Layout (bidirectional edges):
//
//   [3] ──── [5] ──── [0](BONE, dead-end)
//    │        │(-10)
//   [1]──[2]  [6](DEFENDER+30) ──(+1)── [8](CAT) ── [9](GOAL)
//        │        │              ↗(-3)
//       [4] ──── [7] ───────────
//
// Edge stamina costs: 5↔6 = -10, 6↔8 = +1, 8↔9 = -102, all others = -3
// All edges cost time -2.5.
// Node 6 (DEFENDER) gives stamina +30 on arrival; squirrel then forces exit to node 5 (cost -10).
// Node 3 has no stamina effect.
// Max stamina is 150 (allows accumulation via repeated node-6 visits).
//
// Solution (40 moves, ends with stamina ~1, time ~1, bones=1):
//   1→2→3→2→4→7→[6→5]→3→2→4→7→[6→5]→3→2→4→7→[6→5]
//   →0→5→3→2→4→7→[6→5]→3→2→4→7→8→[6→5]→3→2→4→7→8→9
//   [6→5] = squirrel-forced move on arrival at node 6.
//   Strategy: loop through node 6 five times to build stamina up to ~103,
//   pick up the bone at node 0 on the third loop, then sprint 8→9 (-102).

export const level3: LevelData = {
    id: 'level-3-the-chase-refined',
    title: 'Level 3',
    startNodeId: 1,
    goalNodeId: 9,
    catStartNodeId: 8,
    initialResources: { time: 101, stamina: 101, bones: 0 },
    maxResources: { time: 101, stamina: 150, bones: 1 },
    nodes: [
        {
            // BONE: dead-end directly below node 5 — collects the required bone on arrival
            id: 0, x: 450, y: 380,
            type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            // START: puppy's starting position — only exit leads to the first split
            id: 1, x: 100, y: 400,
            type: NodeType.START,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            // FIRST SPLIT: go upper (→3→5) or lower (→4→7) to reach node 6; backtrack to start possible
            id: 2, x: 250, y: 400,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            // UPPER DETOUR: passthrough between node 2 and node 5 — no special effect
            id: 3, x: 250, y: 240,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            // LOWER PATH: connects node 2 to node 7, part of the main loop (2→4→7→6)
            id: 4, x: 450, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            // UPPER JUNCTION: connects upper path (node 3) to bone detour (node 0) and defender (node 6, cost -10)
            id: 5, x: 450, y: 240,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 0, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -10 }] }
            ]
        },
        {
            // DEFENDER / STAMINA STATION: stamina +30 on arrival; squirrel always forces exit to node 5 (-10)
            // Net gain per visit: +20 stamina (before travel costs). Core mechanic of the solution.
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
            // LOWER JUNCTION: hub connecting lower path (node 4), defender (node 6), and cat territory (node 8)
            id: 7, x: 600, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] }
            ]
        },
        {
            // CAT TERRITORY: cat spawns here; 8→6 gives +1 stamina, 8→9 costs -102 (requires ~103+ stamina)
            id: 8, x: 750, y: 380,
            type: NodeType.PLAYER,
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: 1 }] },
                { targetId: 7, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -3 }] },
                { targetId: 9, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -102 }] }
            ]
        },
        {
            // GOAL: home — puppy must carry a bone to enter
            id: 9, x: 820, y: 280,
            type: NodeType.GOAL,
            neighbors: [
                { targetId: 8, effects: [{ resource: 'time', op: 'add', value: -2.5 }, { resource: 'stamina', op: 'add', value: -102 }] }
            ]
        }
    ]
};
