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
            id: 0, x: 160, y: 400,
            type: NodeType.START,
            neighbors: [
                { 
                    targetId: 1, 
                    effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 160, y: 400 }, // 第1个点：必须是起点圆圈的中心
                        { x: 280, y: 400 }, // 第2个点：石子路拐弯的地方（比如先向右走到 x:280）
                        { x: 280, y: 240 }  // 第3个点：必须是终点(节点1)圆圈的中心
                    ]
                },
                { 
                    targetId: 2, 
                    effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 160, y: 400 },
                        { x: 160, y: 530 }, // 假设先往下走
                        { x: 430, y: 530 }  // 再往右走到节点2
                    ]
                }
            ]
        },
        {
            id: 1, x: 280, y: 240,
            type: NodeType.PLAYER,
            neighbors: [
                { 
                    targetId: 3, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 160, y: 240 }, 
                        { x: 600, y: 240 }, 
                        { x: 600, y: 360 }  
                    ]
                
                }
            ],
        
            nodeEffects: [
                { resource: 'time', op: 'add', value: -5 },
                { resource: 'stamina', op: 'add', value: 30 } 
            ]
        },
        {
            id: 2, x: 440, y: 520,
            type: NodeType.DEFENDER,
            neighbors: [
                { 
                    targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 440, y: 520 }, 
                        { x: 440, y: 510 },
                        { x: 590, y: 510 }, 
                        { x: 590, y: 360 } 
                    ] 
                },
                { 
                    targetId: 4, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -15 }],
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
                    targetId: 5, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 600, y: 360 }, 
                        { x: 850, y: 360 }, 
                        { x: 850, y: 430 } 
                    ] 
            }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }] 
        },
        {
            id: 4, x: 760, y: 560,
            type: NodeType.PLAYER,
            neighbors: [
                { 
                    targetId: 5, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 760, y: 560 }, 
                        { x: 850, y: 560 }, 
                        { x: 850, y: 430 } 
                    ] 
            },
                { 
                    targetId: 2, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: 50 }],
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
            neighbors: [] 
        }
    ]
};