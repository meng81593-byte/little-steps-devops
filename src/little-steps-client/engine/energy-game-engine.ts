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
    ResourceKey,
    ResourceEffect,
    ResourceVector,
} from '../levels/level-data';

// ─── Energy vectors (time + stamina only) ────────────────────────────────────

const INF = 1e9;
type EnergyVec = { time: number; stamina: number };

function zero(): EnergyVec { return { time: 0, stamina: 0 }; }
function inf(): EnergyVec { return { time: INF, stamina: INF }; }
function vecEqual(a: EnergyVec, b: EnergyVec): boolean { return a.time === b.time && a.stamina === b.stamina; }
function vecMin(a: EnergyVec, b: EnergyVec): EnergyVec { return { time: Math.min(a.time, b.time), stamina: Math.min(a.stamina, b.stamina) }; }
function vecMax(a: EnergyVec, b: EnergyVec): EnergyVec { return { time: Math.max(a.time, b.time), stamina: Math.max(a.stamina, b.stamina) }; }

// ─── Effect helpers ───────────────────────────────────────────────────────────

function sumAddEffects(effects: ResourceEffect[] = []): EnergyVec {
    const d = zero();
    for (const e of effects) {
        if (e.op !== 'add') continue;
        if (e.resource === 'time') d.time += e.value;
        if (e.resource === 'stamina') d.stamina += e.value;
    }
    return d;
}

function givesBones(effects: ResourceEffect[] = []): boolean {
    return effects.some(e => e.resource === 'bones' && e.op === 'add' && e.value > 0);
}

/**
 * Back-propagate through one step:
 *   before[k] = max(0, need[k] - delta[k])
 */
function backprop(need: EnergyVec, delta: EnergyVec): EnergyVec {
    return {
        time: Math.max(0, need.time - delta.time),
        stamina: Math.max(0, need.stamina - delta.stamina),
    };
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
};

export function computeEnergyGame(level: LevelData): EnergyGameResult {
    const nodeMap = new Map<number, GraphNode>(level.nodes.map(n => [n.id, n]));

    // Initialise W for both layers
    // GOAL at layer 1 = zero (won). Everything else = INF.
    const W = new Map<PosKey, EnergyVec>();
    for (const n of level.nodes) {
        W.set(posKey(n.id, 0), inf());
        W.set(posKey(n.id, 1), n.id === level.goalNodeId ? zero() : inf());
    }

    // Fixed-point backward iteration
    let changed = true;
    let iters = 0;
    const MAX_ITERS = Math.max(500, level.nodes.length * level.nodes.length * 10);

    while (changed && iters++ < MAX_ITERS) {
        changed = false;

        for (const node of level.nodes) {
            for (const layer of [0, 1] as Layer[]) {
                // GOAL in layer 1 is the absorbing win state
                if (node.id === level.goalNodeId && layer === 1) continue;

                if (node.neighbors.length === 0) continue;

                // Compute cost of each outgoing edge from (node, layer)
                const costs: EnergyVec[] = node.neighbors.map(edge => {
                    const target = nodeMap.get(edge.targetId)!;
                    const edgeDelta = sumAddEffects(edge.effects);
                    const nodeDelta = sumAddEffects(target.nodeEffects);

                    // Does this transition give a bone?
                    const getBone = givesBones(edge.effects) || givesBones(target.nodeEffects);
                    const targetLayer: Layer = (layer === 1 || getBone) ? 1 : 0;

                    // Need at target after nodeEffects applied
                    const needAfterNode = W.get(posKey(target.id, targetLayer))!;
                    // Back-propagate through nodeEffects
                    const needBeforeNode = backprop(needAfterNode, nodeDelta);
                    // Back-propagate through edge
                    return backprop(needBeforeNode, edgeDelta);
                });

                let newW: EnergyVec;
                if (node.type === NodeType.DEFENDER) {
                    newW = costs.reduce((acc, c) => vecMax(acc, c), costs[0]);
                } else {
                    newW = costs.reduce((acc, c) => vecMin(acc, c), costs[0]);
                }

                const pk = posKey(node.id, layer);
                if (!vecEqual(W.get(pk)!, newW)) {
                    W.set(pk, newW);
                    changed = true;
                }
            }
        }
    }

    // Layer-0 budgets for display
    const nodeWinBudgets = new Map<number, EnergyVec>();
    for (const n of level.nodes) {
        nodeWinBudgets.set(n.id, W.get(posKey(n.id, 0))!);
    }

    // Optimal moves at PLAYER/START nodes in layer 0
    const optimalMove = new Map<number, number>();
    for (const node of level.nodes) {
        if (node.type !== NodeType.PLAYER && node.type !== NodeType.START) continue;
        if (node.neighbors.length === 0) continue;

        let bestIdx = 0;
        let bestTime = INF;
        let bestStamina = INF;
        for (let i = 0; i < node.neighbors.length; i++) {
            const edge = node.neighbors[i];
            const target = nodeMap.get(edge.targetId)!;
            const edgeDelta = sumAddEffects(edge.effects);
            const nodeDelta = sumAddEffects(target.nodeEffects);
            const getBone = givesBones(edge.effects) || givesBones(target.nodeEffects);
            const targetLayer: Layer = getBone ? 1 : 0;
            const cost = backprop(backprop(W.get(posKey(target.id, targetLayer))!, nodeDelta), edgeDelta);
            // Time is the primary metric shown to players; stamina is tiebreaker
            if (cost.time < bestTime || (cost.time === bestTime && cost.stamina < bestStamina)) {
                bestTime = cost.time;
                bestStamina = cost.stamina;
                bestIdx = i;
            }
        }
        optimalMove.set(node.id, node.neighbors[bestIdx].targetId);
    }

    const startBudget = W.get(posKey(level.startNodeId, 0))!;
    const isWinnable = startBudget.time < INF && startBudget.stamina < INF;
    const minBudget: ResourceVector | undefined = isWinnable
        ? { time: startBudget.time, stamina: startBudget.stamina, bones: 0 }
        : undefined;

    console.log(`[EnergyGame] iters=${iters}, winnable=${isWinnable}, minBudget=`, minBudget);

    return { minBudget, levelWinnable: isWinnable, nodeWinBudgets, optimalMove };
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

    if (!result.levelWinnable || !result.minBudget) {
        return {
            won, levelWinnable: false,
            timeUsed: initial.time - final.time,
            optimalTime: INF, timeSaved: 0,
            message: 'This level is theoretically unwinnable — but you did it!',
            rating: 'perfect',
        };
    }

    const timeUsed = initial.time - final.time;
    const optimalTime = result.minBudget.time;

    // "Slack" = how much extra time the player started with beyond the minimum
    // needed to guarantee a win against the worst-case defender.
    // This is stable regardless of which path was actually taken or how the
    // defender behaved — it purely reflects the quality of the route chosen
    // relative to the theoretical optimum.
    //
    // Example: initial=100, minBudget=50 → slack=50 (could have started with
    // 50 less time and still guaranteed a win on the optimal route).
    // If the player walked the optimal route they used exactly 50 time and
    // arrived with 50 left — slack = initial - minBudget = 50. Perfect.
    const slack = initial.time - optimalTime;  // always >= 0 when level is winnable

    // How much time the player has left compared to the worst-case minimum.
    // final.time >= 0 is guaranteed (game prevents moves that go negative),
    // but comparing final.time to (initial.time - optimalTime) tells us whether
    // the player arrived with more or less surplus than the optimal route would give.
    //
    // Surplus on optimal route = initial.time - optimalTime (they arrive with exactly
    // this much left if they play perfectly).
    // Player surplus = final.time.
    // Extra time wasted = (initial.time - optimalTime) - final.time
    //                   = optimalTime - (initial.time - final.time - (initial.time - optimalTime))
    // Simplified: wasted = (initial.time - optimalTime) - final.time
    //                    = slack - final.time
    // If wasted <= 0 the player did at least as well as optimal (on this run).
    const wasted = slack - final.time;  // negative means player did better than expected

    let message: string;
    let rating: PerformanceFeedback['rating'];

    if (wasted <= 0) {
        // Player arrived with at least as much time left as the optimal route guarantees
        message = 'Perfect route! Not a single time unit wasted 🐾';
        rating = 'perfect';
    } else if (wasted <= Math.max(1, optimalTime * 0.15)) {
        message = `So close! You used ${wasted} extra time units`;
        rating = 'good';
    } else {
        message = `Optimal route costs ${optimalTime} time — you spent ${wasted} extra`;
        rating = 'ok';
    }

    return { won, levelWinnable: true, timeUsed, optimalTime, timeSaved: wasted, message, rating };
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