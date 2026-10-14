import { LevelData, NodeType } from './level-data';

// Resource tradeoff: quick bone route 0 -> 2 -> 3 -> 5 spends more stamina.
// The longer upper route visits a capped stamina refill before collecting the bone.
export const level1: LevelData = {
    id: 'level 1',
    title: 'Level 1',
    startNodeId: 0,
    goalNodeId: 5,
    initialResources: { time: 50, stamina: 50, bones: 0 },
    maxResources: { stamina: 100 },
    nodes: [
        {
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
                    effects: [{ resource: 'time', op: 'add', value: -6 }, { resource: 'stamina', op: 'add', value: -18 }],
                    pathNodes: [
                        { x: 160, y: 400 },
                        { x: 160, y: 530 },
                        { x: 430, y: 530 }
                    ]
                }
            ]
        },
        {
            id: 1, x: 280, y: 240,
            type: NodeType.PLAYER,
            nodeLabelOffset: { x: -0, y: -20 },
            nodeEffects: [
                { resource: 'stamina', op: 'add', value: 20 }
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
            id: 2, x: 440, y: 520,
            type: NodeType.PLAYER,
            nodeLabelOffset: { x: 0, y: -20 },
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }],
            neighbors: [
                {
                    targetId: 3,
                    labelOffset: { x: 30, y: 30 },
                    effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -10 }],
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
