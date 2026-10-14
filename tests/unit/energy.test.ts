import { describe, expect, it } from 'vitest';
import { computeEnergyGame, evaluatePerformance, buildCatChaseGraph } from '../../src/little-steps-client/engine/energy-game-engine';
import { LevelData, NodeType } from '../../src/little-steps-client/levels/level-data';
import { LEVELS } from '../../src/little-steps-client/levels';
function twoRoutes(): LevelData {
    return {
        id: 'tradeoff', title: 'Tradeoff', startNodeId: 0, goalNodeId: 1,
        initialResources: { time: 1, stamina: 10, bones: 0 },
        nodes: [
            { id: 0, x: 0, y: 0, type: NodeType.START, neighbors: [
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -1 }, { resource: 'stamina', op: 'add', value: -10 }] },
                { targetId: 1, effects: [{ resource: 'time', op: 'add', value: -10 }, { resource: 'stamina', op: 'add', value: -1 }] },
            ] },
            { id: 1, x: 1, y: 0, type: NodeType.GOAL, nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }], neighbors: [] },
        ],
    };
}
describe('winning budget analysis', () => {
    it('retains actual time/stamina tradeoffs instead of inventing a (1,1) route', () => {
        const result = computeEnergyGame(twoRoutes());
        expect(result.winningBudgets).toEqual([{ time: 1, stamina: 10 }, { time: 10, stamina: 1 }]);
        expect(result.minBudget).toMatchObject({ time: 1, stamina: 10 });
        expect(result.initialBudgetSufficient).toBe(true);
        expect(result.converged).toBe(true);
    });
    it('distinguishes a winnable graph from insufficient initial resources', () => {
        const level = twoRoutes();
        level.initialResources = { time: 1, stamina: 1, bones: 0 };
        const result = computeEnergyGame(level);
        expect(result.levelWinnable).toBe(true);
        expect(result.initialBudgetSufficient).toBe(false);
    });
    it('requires every defender choice to be affordable', () => {
        const level = twoRoutes();
        level.nodes[0].type = NodeType.DEFENDER;
        expect(computeEnergyGame(level).winningBudgets).toEqual([{ time: 10, stamina: 10 }]);
    });
    it('requires a bone and rejects unreachable paths even with resource gains', () => {
        const level = twoRoutes();
        level.nodes[1].nodeEffects = [];
        expect(computeEnergyGame(level).levelWinnable).toBe(false);
        level.nodes[0].neighbors = [{ targetId: 0, effects: [{ resource: 'time', op: 'add', value: 5 }] }];
        expect(computeEnergyGame(level).minBudget).toBeUndefined();
    });
    it('accounts for caps and set/min effects', () => {
        const level = twoRoutes();
        level.maxResources = { stamina: 5 };
        level.nodes[0].neighbors = [level.nodes[0].neighbors[0]];
        expect(computeEnergyGame(level).levelWinnable).toBe(false);
        level.maxResources = undefined;
        level.nodes[0].neighbors[0].effects = [{ resource: 'time', op: 'set', value: 0 }, { resource: 'stamina', op: 'min', value: 3 }];
        expect(computeEnergyGame(level).minBudget).toMatchObject({ time: 0, stamina: 0 });
    });
    it.each(LEVELS.map(level => [level.title, level]))('terminates on shipped level %s', (_title, level) => {
        const result = computeEnergyGame(buildCatChaseGraph(level as LevelData));
        expect(result.converged).toBe(true);
        expect(result.winningBudgets.every(b => Number.isFinite(b.time) && Number.isFinite(b.stamina))).toBe(true);
    });
    it('does not call remaining resources a victory without a goal and bone', () => {
        const result = computeEnergyGame(twoRoutes());
        const initial = { time: 20, stamina: 20, bones: 0 };
        expect(evaluatePerformance(result, initial, { time: 10, stamina: 10, bones: 0 }, true).rating).toBe('loss');
        expect(evaluatePerformance(result, initial, { time: 10, stamina: 10, bones: 1 }).won).toBe(false);
        expect(evaluatePerformance(result, initial, { time: 0, stamina: 0, bones: 1 }, true).won).toBe(true);
    });
});
