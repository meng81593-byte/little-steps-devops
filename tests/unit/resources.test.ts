import { describe, expect, it } from 'vitest';
import { applyEffects } from '../../src/little-steps-client/levels/level-data';
describe('resource rules', () => {
    it('applies ordered effects and clamps replenishment', () => {
        expect(applyEffects({ time: 20, stamina: 4, bones: 0 }, [
            { resource: 'stamina', op: 'add', value: 15 },
            { resource: 'time', op: 'set', value: 10 },
            { resource: 'time', op: 'min', value: 8 },
            { resource: 'bones', op: 'add', value: 1 },
        ], { stamina: 10 })).toEqual({ time: 8, stamina: 10, bones: 1 });
    });
    it('preserves negative balances for defeat detection without mutating input', () => {
        const initial = { time: 5, stamina: 10, bones: 0 };
        expect(applyEffects(initial, [{ resource: 'time', op: 'add', value: -6 }]).time).toBe(-1);
        expect(initial.time).toBe(5);
    });
});
