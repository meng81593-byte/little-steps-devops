export enum NodeType {
    PLAYER = 'player',
    DEFENDER = 'defender',
    START = 'start',
    GOAL = 'goal'
}

export type ResourceKey = 'time' | 'stamina' | 'bones';
export type UpdateOp = 'add' | 'min' | 'set';

export type ResourceEffect = {
    resource: ResourceKey;
    op: UpdateOp;
    value: number;
};

export type ResourceVector = Record<ResourceKey, number>;

export type PathPoint = {
    x: number;
    y: number;
};

export type EdgeData = {
    targetId: number;
    effects?: ResourceEffect[];
    pathNodes?: PathPoint[];
    labelOffset?: { x: number; y: number };
};

export type GraphNode = {
    id: number;
    x: number;
    y: number;
    type: NodeType;
    neighbors: EdgeData[];
    nodeEffects?: ResourceEffect[];
    nodeLabelOffset?: { x: number; y: number };
};

export type LevelData = {
    id: string;
    title: string;
    nodes: GraphNode[];
    startNodeId: number;
    goalNodeId: number;
    catStartNodeId?: number;
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

    if (maxResources) {
        (Object.keys(maxResources) as ResourceKey[]).forEach(key => {
            if (maxResources[key] !== undefined) {
                nextVector[key] = Math.min(nextVector[key], maxResources[key]!);
            }
        });
    }

    return nextVector;
}