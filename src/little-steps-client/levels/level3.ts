import { LevelData, NodeType } from './level-data';

export const level3: LevelData = {
    id: 'level-3-the-chase-refined',
    title: 'Level 3',
    startNodeId: 1,
    goalNodeId: 9,
    catStartNodeId: 7,
    initialResources: { time: 90, stamina: 45, bones: 0 },
    maxResources: { time: 100, stamina: 100, bones: 1 },
    nodes: [
        // --- Core starting path ---
        {
            id: 1, x: 100, y: 400, type: NodeType.START, // Shifted down to bottom-left
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] }
            ]
        },

        {
            id: 2, x: 250, y: 400, type: NodeType.PLAYER, // First split point
            neighbors: [
                { targetId: 1, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 3, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -10, op: 'add' }] }, // Go UP to stamina
                { targetId: 4, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] }  // Go DOWN to risky path
            ]
        },

        // --- Upper Detour (Safely below the HUD now) ---
        {
            id: 3, x: 250, y: 240, type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'stamina', value: 30, op: 'add' }], // Grants stamina
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -10, op: 'add' }] },
                { targetId: 5, effects: [{ resource: 'time', value: -15, op: 'add' }, { resource: 'stamina', value: -10, op: 'add' }] }
            ]
        },
        {
            id: 5, x: 450, y: 240, type: NodeType.PLAYER,
            nodeEffects: [{ resource: 'bones', value: 1, op: 'add' }], // Grants the required bone
            neighbors: [
                { targetId: 3, effects: [{ resource: 'time', value: -15, op: 'add' }, { resource: 'stamina', value: -10, op: 'add' }] },
                { targetId: 6, effects: [{ resource: 'time', value: -20, op: 'add' }, { resource: 'stamina', value: -15, op: 'add' }] }
            ]
        },

        // --- Reconvergence Point ---
        {
            id: 6, x: 600, y: 380, type: NodeType.PLAYER, // Center right area
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 5, effects: [{ resource: 'time', value: -20, op: 'add' }, { resource: 'stamina', value: -15, op: 'add' }] },
                { targetId: 7, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 8, effects: [{ resource: 'time', value: -15, op: 'add' }, { resource: 'stamina', value: -10, op: 'add' }] }  // Head to safety
            ]
        },

        // --- Lower Risky path (Short but dangerous) ---
        {
            id: 4, x: 450, y: 520, type: NodeType.PLAYER, // Shifted to the bottom area
            neighbors: [
                { targetId: 2, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 6, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 7, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] }  // Direct conflict with the cat
            ]
        },

        // --- Cat's territory and the final stretch ---
        {
            id: 7, x: 600, y: 520, type: NodeType.PLAYER, // Bottom right (Cat spawns here)
            neighbors: [
                { targetId: 4, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 6, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 8, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] }
            ]
        },
        {
            id: 8, x: 750, y: 380, type: NodeType.PLAYER, // Safe node near the goal
            neighbors: [
                { targetId: 6, effects: [{ resource: 'time', value: -15, op: 'add' }, { resource: 'stamina', value: -10, op: 'add' }] },
                { targetId: 7, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] },
                { targetId: 9, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] } // Move to the final goal
            ]
        },
        {
            id: 9, x: 820, y: 280, type: NodeType.GOAL, // Placed nicely near the house door
            neighbors: [
                { targetId: 8, effects: [{ resource: 'time', value: -10, op: 'add' }, { resource: 'stamina', value: -5, op: 'add' }] } // Backtrack if needed
            ]
        }
    ]
};