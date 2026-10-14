const KEY = 'little-steps-progress-v1';
const LEVEL_COUNT = 4;
let sessionCompleted: number[] = [];

export function completedLevels(): number[] {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
        if (!Array.isArray(saved)) return [];
        const completed: number[] = [];
        for (let i = 0; i < LEVEL_COUNT && (saved.includes(i) || sessionCompleted.includes(i)); i++) completed.push(i);
        return completed;
    } catch { return [...sessionCompleted]; }
}

export function isLevelUnlocked(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < LEVEL_COUNT &&
        (index === 0 || completedLevels().includes(index - 1));
}

/** Completion is saved on victory, independently of opening the reward screen. */
export function completeLevel(index: number): void {
    if (!isLevelUnlocked(index)) return;
    const completed = completedLevels();
    if (!completed.includes(index)) completed.push(index);
    sessionCompleted = completed;
    try { localStorage.setItem(KEY, JSON.stringify(completed)); } catch { /* Session remains playable. */ }
}
