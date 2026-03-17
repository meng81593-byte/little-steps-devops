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
            id: 0, x: 160, y: 390,
            type: NodeType.START,
            neighbors: [
                { 
                    targetId: 1, 
                    effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 160, y: 390 }, // 第1个点：必须是起点圆圈的中心
                        { x: 230, y: 390 }, // 第2个点：石子路拐弯的地方（比如先向右走到 x:280）
                        { x: 280, y: 190 }  // 第3个点：必须是终点(节点1)圆圈的中心
                    ]
                },
                { 
                    targetId: 2, 
                    effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 160, y: 410 },
                        { x: 160, y: 490 }, // 假设先往下走
                        { x: 430, y: 490 }  // 再往右走到节点2
                    ]
                }
            ]
        },
        {
            id: 1, x: 280, y: 190,
            type: NodeType.PLAYER,
            neighbors: [
                { 
                    targetId: 3, effects: [{ resource: 'time', op: 'add', value: -20 }, { resource: 'stamina', op: 'add', value: -10 }],
                    pathNodes: [
                        { x: 160, y: 190 }, 
                        { x: 590, y: 190 }, 
                        { x: 590, y: 310 }  
                    ]
                
                }
            ],
        
            nodeEffects: [
                { resource: 'time', op: 'add', value: -5 },
                { resource: 'stamina', op: 'add', value: 30 } 
            ]
        },
        {
            id: 2, x: 430, y: 480,
            type: NodeType.DEFENDER,
            neighbors: [
                { 
                    targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 430, y: 480 }, 
                        { x: 430, y: 460 },
                        { x: 590, y: 460 }, 
                        { x: 590, y: 310 } 
                    ] 
                },
                { 
                    targetId: 4, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -15 }],
                    pathNodes: [
                        { x: 430, y: 480 }, 
                        { x: 430, y: 460 }, 
                        { x: 750, y: 460 }, 
                        { x: 750, y: 520 } 
                    ] 
                }
            
            ]
        },
        {
            id: 3, x: 590, y: 310,
            type: NodeType.PLAYER,
            neighbors: [
                { 
                    targetId: 5, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 590, y: 310 }, 
                        { x: 850, y: 310 }, 
                        { x: 850, y: 380 } 
                    ] 
            }
            ],
            nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }] 
        },
        {
            id: 4, x: 750, y: 520,
            type: NodeType.PLAYER,
            neighbors: [
                { 
                    targetId: 5, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }],
                    pathNodes: [
                        { x: 750, y: 520 }, 
                        { x: 850, y: 520 }, 
                        { x: 850, y: 380 } 
                    ] 
            },
                { 
                    targetId: 2, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: 50 }],
                    pathNodes: [
                        { x: 750, y: 520 }, 
                        { x: 750, y: 540 }, 
                        { x: 430, y: 540 }, 
                        { x: 430, y: 480 } 
                    ] 
                }
            ]
        },
        { 
            id: 5, x: 850, y: 380, 
            type: NodeType.GOAL,
            neighbors: [] 
        }
    ]
};