const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    new Function('require', 'module', 'exports', code)(name => load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(file), name + '.ts'))), module, module.exports);
    cache.set(file, module.exports);
    return module.exports;
}
const base = 'src/little-steps-client/';
const { computeEnergyGame } = load(base + 'engine/energy-game-engine.ts');
const { applyEffects } = load(base + 'levels/level-data.ts');
const cost = (time, stamina) => [{ resource: 'time', op: 'add', value: -time }, { resource: 'stamina', op: 'add', value: -stamina }];
const fixture = {
    id: 'tradeoff', title: 'Tradeoff', startNodeId: 0, goalNodeId: 3,
    initialResources: { time: 2, stamina: 2, bones: 0 },
    nodes: [
        { id: 0, x: 0, y: 0, type: 'start', neighbors: [{ targetId: 1, effects: cost(2, 8) }, { targetId: 2, effects: cost(8, 2) }] },
        { id: 1, x: 0, y: 0, type: 'player', nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }], neighbors: [{ targetId: 3 }] },
        { id: 2, x: 0, y: 0, type: 'player', nodeEffects: [{ resource: 'bones', op: 'add', value: 1 }], neighbors: [{ targetId: 3 }] },
        { id: 3, x: 0, y: 0, type: 'goal', neighbors: [] },
    ],
};
let result = computeEnergyGame(fixture);
assert.deepEqual(result.nodeWinningBudgets.get(0), [{ time: 2, stamina: 8 }, { time: 8, stamina: 2 }]);
assert.equal(result.initialBudgetSufficient, false, 'A fictitious (2,2) budget must never be reported as winning');
const defender = structuredClone(fixture); defender.nodes[0].type = 'defender';
assert.deepEqual(computeEnergyGame(defender).nodeWinningBudgets.get(0), [{ time: 8, stamina: 8 }], 'Both defender exits must be survivable');
const capped = structuredClone(fixture); capped.maxResources = { stamina: 5 }; capped.nodes[0].neighbors = [capped.nodes[0].neighbors[0]]; capped.nodes[1].neighbors[0].effects = cost(0, 6);
assert.equal(computeEnergyGame(capped).minBudget, undefined, 'A refill cap cannot satisfy a larger requirement');
function playable(level) {
    const nodes = level.nodes.map(n => ({ ...n, neighbors: [...n.neighbors] }));
    const byId = new Map(nodes.map(n => [n.id, n]));
    for (const node of nodes) for (const edge of [...node.neighbors]) {
        const target = byId.get(edge.targetId);
        if (!target.neighbors.some(e => e.targetId === node.id)) target.neighbors.push({ targetId: node.id, effects: edge.effects });
    }
    return { ...level, nodes };
}
for (let i = 0; i < 3; i++) {
    const level = playable(load(base + `levels/level${i}.ts`)[`level${i}`]);
    const analysis = computeEnergyGame(level);
    assert.equal(analysis.converged, true);
    assert.equal(analysis.initialBudgetSufficient, true, `Trail ${i} must have a guaranteed route with its starting budget`);
    console.log(`Trail ${i}:`, JSON.stringify(analysis.nodeWinningBudgets.get(level.startNodeId)));
}
const third = load(base + 'levels/level3.ts').level3;
const nodes = new Map(third.nodes.map(n => [n.id, n]));
const route = [1, 2, 4, 7, 6, 5, 0, 7, 8, 9];
let cat = 8, trail = [1], resources = { ...third.initialResources };
for (let i = 1; i < route.length; i++) {
    const previous = nodes.get(route[i - 1]), target = nodes.get(route[i]);
    const edge = previous.neighbors.find(e => e.targetId === target.id);
    assert.ok(edge); resources = applyEffects(resources, edge.effects, third.maxResources);
    assert.ok(resources.time >= 0 && resources.stamina >= 0 && cat !== target.id);
    resources = applyEffects(resources, target.nodeEffects, third.maxResources); trail.push(target.id);
    if (target.id === third.goalNodeId && resources.bones) break;
    if (previous.type === 'defender') continue; // Actual forced-exit turn skips the cat.
    const enemy = nodes.get(cat), last = trail.lastIndexOf(cat);
    let next = last >= 0 && last + 1 < trail.length && enemy.neighbors.some(e => e.targetId === trail[last + 1]) ? trail[last + 1] : undefined;
    if (next === undefined) {
        let nearest = Infinity;
        for (const e of enemy.neighbors) {
            const n = nodes.get(e.targetId), distance = Math.hypot(n.x - previous.x, n.y - previous.y);
            if (distance < nearest) { nearest = distance; next = e.targetId; }
        }
    }
    cat = next; assert.notEqual(cat, target.id);
}
assert.equal(resources.bones, 1); console.log('Chase route:', resources);
const saved = new Map(); global.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
const progress = load(base + 'progress.ts');
assert.equal(progress.isLevelUnlocked(0), true); assert.equal(progress.isLevelUnlocked(1), false);
progress.completeLevel(2); assert.deepEqual(progress.completedLevels(), []);
progress.completeLevel(0); assert.equal(progress.isLevelUnlocked(1), true); assert.equal(progress.isLevelUnlocked(2), false);
progress.completeLevel(1); assert.equal(progress.isLevelUnlocked(2), true); assert.equal(progress.isLevelUnlocked(3), false);
progress.completeLevel(2); assert.equal(progress.isLevelUnlocked(3), true);
assert.deepEqual(JSON.parse(saved.get('little-steps-progress-v1')), [0, 1, 2]);
assert.equal(progress.isLevelUnlocked(-1), false); assert.equal(progress.isLevelUnlocked(4), false);
console.log('PASS: Pareto tradeoffs, adversarial exits, refill cap, playable trails, actual chase and sequential progress.');
