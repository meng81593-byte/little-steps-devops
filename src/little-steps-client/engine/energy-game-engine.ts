/**
 * Energy Game Engine
 *
 * Implements the energy game algorithm for computing minimal winning resource
 * budgets. The game is a two-player graph game:
 *   - Max player (puppy / PLAYER+START nodes): chooses edges to minimise cost
 *   - Min player (defender / DEFENDER nodes): chooses edges to maximise cost
 *
 * KEY DESIGN: "bones" is a reachability constraint, not an energy resource.
 * We model it by duplicating the graph into two layers:
 *   - Layer 0: puppy has NOT yet collected a bone
 *   - Layer 1: puppy HAS collected a bone (and can enter GOAL)
 * Transitions between layers happen on nodes/edges that give bones > 0.
 *
 * Algorithm: backward fixed-point iteration on this layered game graph.
 * Ref: LIPIcs CONCUR 2025, doi:10.4230/LIPIcs.CONCUR.2025.29
 */

import {
    LevelData,
    GraphNode,
    NodeType,
    ResourceEffect,
    ResourceVector,
} from '../levels/level-data';

// ─── Energy vectors (time + stamina only) ────────────────────────────────────

const INF = 1e9;
type EnergyVec = { time: number; stamina: number };

function zero(): EnergyVec { return { time: 0, stamina: 0 }; }
function inf(): EnergyVec { return { time: INF, stamina: INF }; }
function vecMax(a: EnergyVec, b: EnergyVec): EnergyVec { return { time: Math.max(a.time, b.time), stamina: Math.max(a.stamina, b.stamina) }; }

// ─── Effect helpers ───────────────────────────────────────────────────────────

function givesBones(effects: ResourceEffect[] = []): boolean {
    return effects.some(e => e.resource === 'bones' && e.op === 'add' && e.value > 0);
}

// ─── Layered game graph ───────────────────────────────────────────────────────

type Layer = 0 | 1;
type PosKey = string;
function posKey(id: number, layer: Layer): PosKey { return `${id}:${layer}`; }

// ─── Main algorithm ───────────────────────────────────────────────────────────

export type EnergyGameResult = {
    minBudget: ResourceVector | undefined;
    levelWinnable: boolean;
    nodeWinBudgets: Map<number, EnergyVec>;
    optimalMove: Map<number, number>;
    winningBudgets: Map<number, EnergyVec[]>;
    analysisComplete: boolean;
};

/** Remove dominated budgets without manufacturing a budget from two routes. */
function pareto(values: EnergyVec[]): EnergyVec[] {
    const sorted = [...values].sort((a, b) => a.time - b.time || a.stamina - b.stamina);
    const front: EnergyVec[] = [];
    let leastStamina = INF;
    for (const v of sorted) if (v.stamina < leastStamina) { front.push(v); leastStamina = v.stamina; }
    return front;
}

function undoEffects(need: EnergyVec, effects: ResourceEffect[] = [], caps: Partial<ResourceVector> = {}): EnergyVec | undefined {
    const previous = { ...need };
    for (const key of ['time', 'stamina'] as const) if (caps[key] !== undefined && previous[key] > caps[key]!) return undefined;
    for (const effect of [...effects].reverse()) {
        if (effect.resource === 'bones') continue;
        const key = effect.resource;
        if (effect.op === 'add') previous[key] = Math.max(0, previous[key] - effect.value);
        else {
            if (previous[key] > effect.value) return undefined;
            if (effect.op === 'set') previous[key] = 0;
        }
    }
    return previous;
}

export function computeEnergyGame(level: LevelData): EnergyGameResult {
    const nodeMap = new Map(level.nodes.map(n => [n.id, n]));
    const W = new Map<PosKey, EnergyVec[]>();
    for (const n of level.nodes) for (const layer of [0, 1] as Layer[]) W.set(posKey(n.id, layer), n.id === level.goalNodeId && layer === 1 ? [zero()] : []);
    const edgeFront = (node: GraphNode, layer: Layer, index: number): EnergyVec[] => {
        const edge = node.neighbors[index], target = nodeMap.get(edge.targetId)!;
        const targetLayer: Layer = layer === 1 || givesBones(edge.effects) || givesBones(target.nodeEffects) ? 1 : 0;
        const budgets: EnergyVec[] = [];
        for (const need of W.get(posKey(target.id, targetLayer))!) {
            const beforeNode = undoEffects(need, target.nodeEffects, level.maxResources);
            const beforeEdge = beforeNode && undoEffects(beforeNode, edge.effects, level.maxResources);
            if (beforeEdge && beforeEdge.time <= (level.maxResources?.time ?? INF) && beforeEdge.stamina <= (level.maxResources?.stamina ?? INF)) budgets.push(beforeEdge);
        }
        return pareto(budgets);
    };
    let changed = true, iterations = 0;
    // All authored loops spend time. Clipped resource dimensions keep their fronts finite.
    const maxIterations = Math.max(500, level.nodes.length * 50);
    while (changed && iterations++ < maxIterations) {
        changed = false;
        for (const node of level.nodes) for (const layer of [0, 1] as Layer[]) {
            if (node.id === level.goalNodeId && layer === 1 || !node.neighbors.length) continue;
            const fronts = node.neighbors.map((_, i) => edgeFront(node, layer, i));
            let candidates: EnergyVec[];
            if (node.type === NodeType.DEFENDER) {
                candidates = [zero()];
                for (const front of fronts) candidates = pareto(candidates.flatMap(a => front.map(b => vecMax(a, b))));
            } else candidates = pareto(fronts.flat());
            const key = posKey(node.id, layer), before = W.get(key)!;
            if (JSON.stringify(before) !== JSON.stringify(candidates)) { W.set(key, candidates); changed = true; }
        }
    }
    const winningBudgets = new Map<number, EnergyVec[]>();
    const nodeWinBudgets = new Map<number, EnergyVec>();
    const optimalMove = new Map<number, number>();
    for (const node of level.nodes) {
        const front = W.get(posKey(node.id, 0))!;
        winningBudgets.set(node.id, front);
        nodeWinBudgets.set(node.id, front[0] ?? inf());
        if (node.type !== NodeType.DEFENDER) {
            const options = node.neighbors.flatMap((edge, i) => edgeFront(node, 0, i).map(budget => ({ edge, budget })));
            const affordable = options.filter(o => o.budget.time <= level.initialResources.time && o.budget.stamina <= level.initialResources.stamina);
            const best = (affordable.length ? affordable : options).sort((a, b) => a.budget.time - b.budget.time || a.budget.stamina - b.budget.stamina)[0];
            if (best) optimalMove.set(node.id, best.edge.targetId);
        }
    }
    const front = W.get(posKey(level.startNodeId, 0))!;
    const affordable = front.filter(b => b.time <= level.initialResources.time && b.stamina <= level.initialResources.stamina);
    const chosen = (affordable.length ? affordable : front)[0];
    const minBudget = chosen && !changed ? { ...chosen, bones: 0 } : undefined;
    return { minBudget, levelWinnable: affordable.length > 0, nodeWinBudgets, optimalMove, winningBudgets, analysisComplete: !changed };
}

// ─── Performance feedback ─────────────────────────────────────────────────────

export type PerformanceFeedback = {
    won: boolean;
    levelWinnable: boolean;
    timeUsed: number;
    optimalTime: number;
    timeSaved: number;
    message: string;
    rating: 'perfect' | 'good' | 'ok' | 'loss';
};

export function evaluatePerformance(
    result: EnergyGameResult,
    initial: ResourceVector,
    final: ResourceVector,
): PerformanceFeedback {
    const won = final.time >= 0 && final.stamina >= 0 && final.bones >= 1;
    const timeUsed = initial.time - final.time;
    const optimalTime = result.minBudget?.time ?? INF;

    if (final.time > 0 && final.stamina > 0) {
        return { won, levelWinnable: result.levelWinnable, timeUsed, optimalTime, timeSaved: 0, message: 'Perfect route! Arrived with time and stamina to spare 🐾', rating: 'perfect' };
    }

    const depleted = final.time === 0 && final.stamina === 0
        ? 'time and stamina'
        : final.time === 0 ? 'time' : 'stamina';
    return { won, levelWinnable: result.levelWinnable, timeUsed, optimalTime, timeSaved: 0, message: `Made it home, but ${depleted} ran out! Try a more efficient route 💪`, rating: 'ok' };
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
            let pNeighbors = [];
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
            let cNeighbors = [];
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