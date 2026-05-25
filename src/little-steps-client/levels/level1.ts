import { LevelData, NodeType } from './level-data';

// Level 1 — introduces the bone node, stamina boost, and the squirrel defender.
//
// Layout (auto-reverse edges 0↔1, 0↔2, 1↔3, 2↔3 also exist but are omitted below):
//
//   ┌──(t-5,s-10)──→ 1(s+15) ──(t-5,s-5)──────────────────────────────┐
//   │                    ↕ (3↔1 reverse)                                │
//   0(START)             3(junction) ──(t-5,s-10)──────────────────→ 5(GOAL)
//   │                    ↑                                          ↗   ↕(t-5)
//   └──(t-20,s-30)──→ 2(bone+1) ──(t-5,s-25)──┘     (5↔3, 5↔4 explicit)  │
//                         ↑                                                  │
//                         └──(t-5,s-10)──→ 4(SQUIRREL,s+5) ──(t-5)─────────┘
//                         ←always(t-5,s-10)   squirrel picks 4→2 (s-10 > 4→5 s=0)
//
// Solutions:
//   A (★★★):  0→1→3 [×1 loop] →5→4(squirrel→2) →3→5   ends t=5, s=5
//             use squirrel as forced detour to collect bone at node 2
//   B (★☆☆):  0→1→3 [×3 loops] →2→3→5               ends t=5, s=0
//             direct path drains stamina exactly to zero

export const level1: LevelData = {
    id: 'level 1',
    title: 'Level 1',
    startNodeId: 0,
    goalNodeId: 5,
    initialResources: { time: 50, stamina: 50, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
            // START: upper path leads to stamina boost (cheaper), lower path to bone node (costly)
            id: 0, x: 160, y: 400,
            type: NodeType.START,
            neighbors: [
                {
                    targetId: 1,
                    labelOffset: { x: 20, y: 20 },
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 160, y: 400 },
                        { x: 280, y: 400 },
                        { x: 280, y: 240 }
                    ]
                },
                {
                    targetId: 2,
                    labelOffset: { x: 0, y: 75 },
                    effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -30 }],
                    pathNodes: [
                        { x: 160, y: 400 },
                        { x: 160, y: 530 },
                        { x: 430, y: 530 }
                    ]
                }
            ]
        },
        {
            // STAMINA BOOST: costs little time but restores stamina on arrival;
            //                loop 1↔3 once for solution A (★★★), three times for solution B (★☆☆)
            id: 1, x: 280, y: 240,
            type: NodeType.PLAYER,
            nodeLabelOffset: { x: -0, y: -20 },
            nodeEffects: [
                { resource: 'stamina', op: 'add', value: 15 }
            ],
            neighbors: [
                {
                    targetId: 3,
                    labelOffset: { x: 0, y: -55 },
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 280, y: 240 },
                        { x: 600, y: 240 },
                        { x: 600, y: 360 }
                    ]
                }
            ]
        },
        {
            // BONE NODE: gives bone+1 on every arrival; leads to junction (expensive, s-25)
            //            or to the squirrel node (s-10)
            id: 2, x: 440, y: 520,
            type: NodeType.PLAYER,
            nodeLabelOffset: { x: 0, y: -20 },
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                {
                    targetId: 3,
                    labelOffset: { x: 30, y: 30 },
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -25 }],
                    pathNodes: [
                        { x: 440, y: 520 },
                        { x: 440, y: 510 },
                        { x: 590, y: 510 },
                        { x: 590, y: 360 }
                    ]
                },
                {
                    targetId: 4,
                    labelOffset: { x: 10, y: 40 },
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 430, y: 530 },
                        { x: 430, y: 510 },
                        { x: 760, y: 510 },
                        { x: 760, y: 560 }
                    ]
                }
            ]
        },
        {
            // JUNCTION: merges upper and lower paths — only leads to the goal
            id: 3, x: 600, y: 360,
            type: NodeType.PLAYER,
            neighbors: [
                {
                    targetId: 5,
                    labelOffset: { x: 30, y: 0 },
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 600, y: 360 },
                        { x: 850, y: 360 },
                        { x: 850, y: 430 }
                    ]
                }
            ]
        },
        {
            // SQUIRREL: always picks harder path → always sends player back to node 2 (bone);
            //           4→2 costs s-10, 4→5 costs no stamina, so 4→2 is always chosen;
            //           stamina+5 on arrival softens the detour cost
            id: 4, x: 760, y: 560,
            type: NodeType.DEFENDER,
            nodeLabelOffset: { x: 0, y: -20 },
            nodeEffects: [{ resource: 'stamina', op: 'add', value: 5 }],
            neighbors: [
                {
                    targetId: 5,
                    effects: [{ resource: 'time', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 760, y: 560 },
                        { x: 850, y: 560 },
                        { x: 850, y: 430 }
                    ]
                },
                {
                    targetId: 2,
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 750, y: 570 },
                        { x: 750, y: 590 },
                        { x: 440, y: 590 },
                        { x: 440, y: 520 }
                    ]
                }
            ]
        },
        {
            // GOAL: win if carrying a bone; otherwise pass through freely (solution A uses this);
            //       5→4 costs only time (no stamina), making the squirrel detour affordable
            id: 5, x: 850, y: 410,
            type: NodeType.GOAL,
            neighbors: [
                {
                    targetId: 3,
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 850, y: 430 },
                        { x: 850, y: 360 },
                        { x: 600, y: 360 }
                    ]
                },
                {
                    targetId: 4,
                    effects: [{ resource: 'time', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 850, y: 430 },
                        { x: 850, y: 560 },
                        { x: 760, y: 560 }
                    ]
                }
            ]
        }
    ]
};
