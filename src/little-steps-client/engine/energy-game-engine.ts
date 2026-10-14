/** Backward reachability with Pareto frontiers for time/stamina budgets.
 * Player choices form a union; defender choices require all successors to win.
 * Bone acquisition is monotone and represented by two graph layers.
 */
import { LevelData, GraphNode, NodeType, ResourceEffect, ResourceVector, EdgeData } from '../levels/level-data';

export type EnergyVec = { time: number; stamina: number };
type Frontier = EnergyVec[];
const dominates = (a: EnergyVec, b: EnergyVec) => a.time <= b.time && a.stamina <= b.stamina;
const compare = (a: EnergyVec, b: EnergyVec) => a.time - b.time || a.stamina - b.stamina;
function pareto(candidates: Frontier): Frontier {
    const result: Frontier = [];
    for (const budget of candidates.sort(compare)) {
        if (!result.some(other => dominates(other, budget))) result.push(budget);
    }
    return result;
}
function reverseEffects(need: EnergyVec, effects: ResourceEffect[] = [], caps: Partial<ResourceVector> = {}): EnergyVec | undefined {
    const required = { ...need };
    for (const key of ['time', 'stamina'] as const) {
        if (caps[key] !== undefined && required[key] > caps[key]) return undefined;
    }
    for (const effect of [...effects].reverse()) {
        if (effect.resource === 'bones') continue;
        const key = effect.resource;
        if (effect.op === 'add') required[key] = Math.max(0, required[key] - effect.value);
        else if (effect.value < required[key]) return undefined;
        else if (effect.op === 'set') required[key] = 0;
    }
    return required;
}
function boneAfter(hasBone: boolean, effects: ResourceEffect[] = []): boolean {
    return hasBone || effects.some(effect => effect.resource === 'bones' && effect.value > 0);
}
export type EnergyGameResult = {
    minBudget: ResourceVector | undefined;
    winningBudgets: Frontier;
    nodeWinningBudgets: Map<number, Frontier>;
    levelWinnable: boolean;
    initialBudgetSufficient: boolean;
    converged: boolean;
    nodeWinBudgets: Map<number, EnergyVec>;
    optimalMove: Map<number, number>;
};

export function computeEnergyGame(level: LevelData): EnergyGameResult {
    const nodes = new Map(level.nodes.map(node => [node.id, node]));
    if (nodes.size !== level.nodes.length || !nodes.has(level.startNodeId) || !nodes.has(level.goalNodeId)) {
        throw new Error('Level must have unique node IDs and valid start/goal nodes.');
    }
    for (const node of level.nodes) {
        if (node.neighbors.some(edge => !nodes.has(edge.targetId))) throw new Error('Edge target does not exist.');
        for (const effects of [node.nodeEffects, ...node.neighbors.map(edge => edge.effects)]) {
            if (effects?.some(effect => !Number.isFinite(effect.value))) throw new Error('Effects must be finite.');
            if (effects?.some(effect => effect.resource === 'bones' && (effect.op !== 'add' || effect.value < 0))) {
                throw new Error('Budget analysis requires monotone additive bone acquisition.');
            }
        }
    }
    const key = (id: number, bone: boolean) => `${id}:${Number(bone)}`;
    const budgets = new Map<string, Frontier>();
    for (const node of level.nodes) {
        budgets.set(key(node.id, false), []);
        budgets.set(key(node.id, true), node.id === level.goalNodeId ? [{ time: 0, stamina: 0 }] : []);
    }
    const edgeBudgets = (node: GraphNode, bone: boolean): Frontier[] => node.neighbors.map(edge => {
        const target = nodes.get(edge.targetId)!;
        const nextBone = boneAfter(boneAfter(bone, edge.effects), target.nodeEffects);
        if (level.maxResources?.bones !== undefined && level.maxResources.bones < 1 && nextBone) return [];
        return pareto((budgets.get(key(target.id, nextBone)) ?? []).flatMap(need => {
            const beforeNode = reverseEffects(need, target.nodeEffects, level.maxResources);
            if (!beforeNode) return [];
            const beforeEdge = reverseEffects(beforeNode, edge.effects, level.maxResources);
            if (!beforeEdge) return [];
            if (level.maxResources?.time !== undefined && beforeEdge.time > level.maxResources.time) return [];
            if (level.maxResources?.stamina !== undefined && beforeEdge.stamina > level.maxResources.stamina) return [];
            return [beforeEdge];
        }));
    });
    let converged = false;
    // Results are sound finite-horizon budgets even if an unusual graph hits this guard.
    for (let iteration = 0; iteration < 2048; iteration++) {
        let changed = false;
        for (const node of level.nodes) for (const bone of [false, true]) {
            if (node.id === level.goalNodeId && bone) continue;
            const choices = edgeBudgets(node, bone);
            let candidates: Frontier;
            if (choices.length && node.type === NodeType.DEFENDER) {
                candidates = choices.reduce((all, next) => pareto(all.flatMap(a => next.map(b => ({
                    time: Math.max(a.time, b.time), stamina: Math.max(a.stamina, b.stamina),
                })))), [{ time: 0, stamina: 0 }]);
            } else candidates = pareto(choices.flat());
            const previous = budgets.get(key(node.id, bone))!;
            const updated = pareto([...previous, ...candidates]);
            if (JSON.stringify(updated) !== JSON.stringify(previous)) {
                budgets.set(key(node.id, bone), updated);
                changed = true;
            }
        }
        if (!changed) { converged = true; break; }
    }
    const startingBone = level.initialResources.bones >= 1;
    const winningBudgets = budgets.get(key(level.startNodeId, startingBone))!;
    const affordable = winningBudgets.filter(budget => dominates(budget, level.initialResources));
    const selected = (affordable.length ? affordable : winningBudgets)[0];
    const nodeWinningBudgets = new Map<number, Frontier>();
    const nodeWinBudgets = new Map<number, EnergyVec>();
    const optimalMove = new Map<number, number>();
    for (const node of level.nodes) {
        nodeWinningBudgets.set(node.id, budgets.get(key(node.id, false)) ?? []);
        const nodeBudget = budgets.get(key(node.id, false))?.[0];
        if (nodeBudget) nodeWinBudgets.set(node.id, nodeBudget);
        if (node.type === NodeType.DEFENDER || !nodeBudget) continue;
        const choices = edgeBudgets(node, false);
        const move = choices.findIndex(choice => choice.some(budget => dominates(budget, nodeBudget)));
        if (move >= 0) optimalMove.set(node.id, node.neighbors[move].targetId);
    }
    return {
        minBudget: selected && converged ? { ...selected, bones: level.initialResources.bones >= 1 ? 1 : 0 } : undefined,
        winningBudgets,
        nodeWinningBudgets,
        levelWinnable: winningBudgets.length > 0,
        initialBudgetSufficient: affordable.length > 0,
        converged,
        nodeWinBudgets,
        optimalMove,
    };
}

export type PerformanceFeedback = {
    won: boolean; levelWinnable: boolean; timeUsed: number; optimalTime: number;
    timeSaved: number; message: string; rating: 'perfect' | 'good' | 'ok' | 'loss';
};
export function evaluatePerformance(result: EnergyGameResult, initial: ResourceVector, final: ResourceVector, reachedGoal = false): PerformanceFeedback {
    const won = reachedGoal && final.time >= 0 && final.stamina >= 0 && final.bones >= 1;
    const common = {
        won, levelWinnable: result.levelWinnable, timeUsed: initial.time - final.time,
        optimalTime: result.minBudget?.time ?? Infinity, timeSaved: 0,
    };
    if (!won) return { ...common, message: 'The puppy has not reached home with a bone and sufficient resources.', rating: 'loss' };
    if (final.time > 0 && final.stamina > 0) return { ...common, message: 'Arrived with time and stamina to spare!', rating: 'perfect' };
    return { ...common, message: 'Made it home with exactly enough resources.', rating: 'ok' };
}

export function buildCatChaseGraph(level: LevelData): LevelData {
    if (level.catStartNodeId === undefined) return level;

    const expandedNodes: GraphNode[] = [];
    const VIRTUAL_GOAL_ID = 999999; // virtual goal

    // status code： playerTurnID = p*1000 + c，catTurnID = p*1000 + c + 500
    const pTurnId = (p: number, c: number) => p * 1000 + c;
    const cTurnId = (p: number, c: number) => p * 1000 + c + 500;

    expandedNodes.push({
        id: VIRTUAL_GOAL_ID, x: 0, y: 0, type: NodeType.GOAL, neighbors: []
    });

    for (const pNode of level.nodes) {
        for (const cNode of level.nodes) {
            const isCaught = pNode.id === cNode.id;
            const isWin = pNode.id === level.goalNodeId && !isCaught;

            // player
            let pNeighbors: EdgeData[] = [];
            if (isWin) {
                pNeighbors = [{ targetId: VIRTUAL_GOAL_ID, effects: [] }];
            } else if (!isCaught) {
                // after player moves, cat's turn
                pNeighbors = pNode.neighbors.map(edge => ({
                    targetId: cTurnId(edge.targetId, cNode.id),
                    effects: edge.effects
                }));
            }

            expandedNodes.push({
                id: pTurnId(pNode.id, cNode.id),
                x: pNode.x, y: pNode.y,
                type: pNode.type,
                nodeEffects: pNode.nodeEffects,
                neighbors: pNeighbors
            });

            // cat
            let cNeighbors: EdgeData[] = [];
            if (!isWin && !isCaught) {
                // after cat modes, player's turn
                cNeighbors = cNode.neighbors.map(edge => ({
                    targetId: pTurnId(pNode.id, edge.targetId),
                    effects: []
                }));
            }

            expandedNodes.push({
                id: cTurnId(pNode.id, cNode.id),
                x: cNode.x, y: cNode.y,
                type: NodeType.DEFENDER,
                neighbors: cNeighbors
            });
        }
    }

    return {
        ...level,
        startNodeId: pTurnId(level.startNodeId, level.catStartNodeId),
        goalNodeId: VIRTUAL_GOAL_ID,
        nodes: expandedNodes
    };
}
