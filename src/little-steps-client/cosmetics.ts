export type ColorId = 'default' | 'golden' | 'brown' | 'snow' | 'blue';
export type AccessoryId = 'none' | 'bow' | 'crown' | 'glasses' | 'star';
export type ClothId = 'none' | 'vest' | 'cape' | 'sweater' | 'scarf';

export interface CosmeticsState {
    unlockedColors: ColorId[];
    selectedColor: ColorId;
    unlockedAccessories: AccessoryId[];
    selectedAccessory: AccessoryId;
    unlockedClothes: ClothId[];
    selectedCloth: ClothId;
}

const KEY = 'little-steps-cosmetics';

export const COLOR_DEFS: { id: ColorId; label: string; tint: number | null; swatch: number }[] = [
    { id: 'default', label: 'Default',  tint: null,       swatch: 0xF4A261 },
    { id: 'golden',  label: 'Golden',   tint: 0xFFD700,   swatch: 0xFFD700 },
    { id: 'brown',   label: 'Brown',    tint: 0xCD853F,   swatch: 0xCD853F },
    { id: 'snow',    label: 'Snow',     tint: 0xDDEEFF,   swatch: 0xDDEEFF },
    { id: 'blue',    label: 'Sky Blue', tint: 0x87CEEB,   swatch: 0x87CEEB },
];

export const ACCESSORY_DEFS: { id: AccessoryId; label: string; color: number }[] = [
    { id: 'none',    label: 'None',     color: 0x555566 },
    { id: 'bow',     label: 'Pink Bow', color: 0xFF69B4 },
    { id: 'crown',   label: 'Crown',    color: 0xFFD700 },
    { id: 'glasses', label: 'Glasses',  color: 0x66AAFF },
    { id: 'star',    label: 'Star Pin', color: 0xFFD700 },
];

export const CLOTH_DEFS: { id: ClothId; label: string; color: number }[] = [
    { id: 'none',    label: 'None',      color: 0x555566 },
    { id: 'vest',    label: 'Red Vest',  color: 0xCC2222 },
    { id: 'cape',    label: 'Blue Cape', color: 0x3355CC },
    { id: 'sweater', label: 'Sweater',   color: 0x4466BB },
    { id: 'scarf',   label: 'Scarf',     color: 0xDD3333 },
];

function defaultState(): CosmeticsState {
    return {
        unlockedColors: ['default'],
        selectedColor: 'default',
        unlockedAccessories: ['none'],
        selectedAccessory: 'none',
        unlockedClothes: ['none'],
        selectedCloth: 'none',
    };
}

export function loadCosmetics(): CosmeticsState {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return defaultState();
        const p = JSON.parse(raw);
        const state: CosmeticsState = {
            unlockedColors:      p.unlockedColors      ?? ['default'],
            selectedColor:       p.selectedColor       ?? 'default',
            unlockedAccessories: p.unlockedAccessories ?? ['none'],
            selectedAccessory:   p.selectedAccessory   ?? 'none',
            unlockedClothes:     p.unlockedClothes     ?? ['none'],
            selectedCloth:       p.selectedCloth       ?? 'none',
        };
        // Migrate: if a tier was previously unlocked, fill in any newly added items
        let dirty = false;
        if (state.unlockedColors.length > 1) {
            COLOR_DEFS.forEach(d => { if (!state.unlockedColors.includes(d.id)) { state.unlockedColors.push(d.id); dirty = true; } });
        }
        if (state.unlockedAccessories.some(id => id !== 'none')) {
            ACCESSORY_DEFS.forEach(d => { if (!state.unlockedAccessories.includes(d.id)) { state.unlockedAccessories.push(d.id); dirty = true; } });
        }
        if (state.unlockedClothes.some(id => id !== 'none')) {
            CLOTH_DEFS.forEach(d => { if (!state.unlockedClothes.includes(d.id)) { state.unlockedClothes.push(d.id); dirty = true; } });
        }
        if (dirty) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
        return state;
    } catch {
        return defaultState();
    }
}

export function saveCosmetics(state: CosmeticsState): void {
    try { 
        localStorage.setItem(KEY, JSON.stringify(state)); 
    } catch (error) {
        console.warn('⚠️ cannt save settings.', error);
    }
}

export function unlockRewardForLevel(levelIndex: number): CosmeticsState {
    const state = loadCosmetics();
    if (levelIndex === 1) {
        (['golden', 'brown', 'snow', 'blue'] as ColorId[])
            .forEach(id => { if (!state.unlockedColors.includes(id)) state.unlockedColors.push(id); });
    } else if (levelIndex === 2) {
        (['bow', 'crown', 'glasses', 'star'] as AccessoryId[])
            .forEach(id => { if (!state.unlockedAccessories.includes(id)) state.unlockedAccessories.push(id); });
    } else if (levelIndex === 3) {
        (['vest', 'cape', 'sweater', 'scarf'] as ClothId[])
            .forEach(id => { if (!state.unlockedClothes.includes(id)) state.unlockedClothes.push(id); });
    }
    saveCosmetics(state);
    return state;
}
