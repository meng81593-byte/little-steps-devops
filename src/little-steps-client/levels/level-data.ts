
export type ResourceKey = 'time' | 'stamina' | 'bones';
export type UpdateOp = 'add' | 'min' | 'set';

export type ResourceEffect = {
    resource: ResourceKey;
    op: UpdateOp;
    value: number;
};

export type ResourceVector = Record<ResourceKey, number>;

export type EdgeData = {
    targetId: number;
    effects?: ResourceEffect[];
};

export type GraphNode = {
    id: number;
    x: number;
    y: number;
    neighbors: EdgeData[];
    nodeEffects?: ResourceEffect[];
};

export type LevelData = {
    id: string;
    title: string;
    nodes: GraphNode[];
    startNodeId: number;
    goalNodeId: number;
    initialResources: ResourceVector;
    maxResources?: Partial<ResourceVector>;
};

export function applyEffects(
    current: ResourceVector,
    effects: ResourceEffect[] = [],
    maxResources?: Partial<ResourceVector> 
): ResourceVector {
    const nextVector = { ...current };

    for (const effect of effects) {
        switch (effect.op) {
            case 'add':
                nextVector[effect.resource] += effect.value;
                break;
            case 'min':
                nextVector[effect.resource] = Math.min(nextVector[effect.resource], effect.value);
                break;
            case 'set':
                nextVector[effect.resource] = effect.value;
                break;
        }
    }

    // max bound for some resources
    if (maxResources) {
        (Object.keys(maxResources) as ResourceKey[]).forEach(key => {
            if (maxResources[key] !== undefined) {
                nextVector[key] = Math.min(nextVector[key], maxResources[key]!);
            }
        });
    }

    return nextVector;
}

// 
export const LEVELS: LevelData[] = [
    {
        id: 'park-paths',
        title: 'Park Paths',
        startNodeId: 0,
        goalNodeId: 5,
        initialResources: { time: 100, stamina: 50, bones: 0 },
        // max bound for stamina
        maxResources: { stamina: 100 },
        nodes: [
            {
                id: 0, x: 120, y: 320,
                neighbors: [
                    { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                    { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -10 }] }
                ]
            },
            {
                id: 1, x: 330, y: 160,
                neighbors: [
                    { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -200 }, { resource: 'stamina', op: 'add', value: -10 }] }
                ],
                nodeEffects: [
                    { resource: 'time', op: 'add', value: -5 },
                    { resource: 'stamina', op: 'add', value: 80 }
                ]
            },
            {
                id: 2, x: 330, y: 480,
                neighbors: [
                    { targetId: 3, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -5 }] },
                    { targetId: 4, effects: [{ resource: 'time', op: 'add', value: -25 }, { resource: 'stamina', op: 'add', value: -15 }] }
                ]
            },
            {
                id: 3, x: 560, y: 280,
                neighbors: [
                    { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -15 }, { resource: 'stamina', op: 'add', value: -5 }] }
                ],
                nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }]
            },
            {
                id: 4, x: 560, y: 520,
                neighbors: [
                    { targetId: 5, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: -5 }] },
                    { targetId: 2, effects: [{ resource: 'time', op: 'add', value: -5 }, { resource: 'stamina', op: 'add', value: 50 }] }
                ]
            },
            { id: 5, x: 810, y: 320, neighbors: [] }
        ]
    }
];