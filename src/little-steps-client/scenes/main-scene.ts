import Phaser from 'phaser';
import { LEVELS } from '../levels/index';
import { applyEffects, ResourceVector, ResourceEffect, NodeType, LevelData, GraphNode } from '../levels/level-data';
import { computeEnergyGame, EnergyGameResult, buildCatChaseGraph } from '../engine/energy-game-engine';
import { createDefenderTrapIcon } from '../utils/draw-utils';

export class MainScene extends Phaser.Scene {
    // --- Core Game Data ---
    private level!: LevelData;
    private graph!: GraphNode[];
    private currentNodeId = 0;
    private catNodeId?: number;
    private levelIndex = 0;

    // --- Game Objects ---
    private puppy!: Phaser.GameObjects.Sprite;
    private catSprite?: Phaser.GameObjects.Sprite;
    private squirrel?: Phaser.GameObjects.Sprite;
    
    // --- UI Elements ---
    private tooltipContainer!: Phaser.GameObjects.Container;
    private tooltipBg!: Phaser.GameObjects.Rectangle;
    private tooltipText!: Phaser.GameObjects.Text;
    
    // --- State Flags ---
    private isMoving = false;
    private isGameOver = false;
    private isFogOfWar = false;
    private isTutorialActive = false;
    private isCatMoving = false;

    // --- Tracking Collections ---
    private revealedNodes = new Set<number>();
    private triggeredTraps = new Set<number>();
    
    // --- Visual Asset Maps ---
    private nodeGraphicsMap = new Map<number, Phaser.GameObjects.GameObject>();
    private nodeTextsMap = new Map<number, Phaser.GameObjects.Text>();
    private edgeGraphicsMap = new Map<string, Phaser.GameObjects.Graphics>();
    private edgeTextsMap = new Map<string, Phaser.GameObjects.Container>();
    private nodeEffectTextsMap = new Map<number, Phaser.GameObjects.Container>();
    private fogCloudsMap = new Map<number, Phaser.GameObjects.Image>();

    // --- Resource & Logic ---
    private currentResources!: ResourceVector;
    private energyGameResult!: EnergyGameResult;
    private activeHints: Phaser.GameObjects.GameObject[] = [];

    constructor() { super('MainScene'); }

    /**
     * Initializes scene data, state flags, and game logic engine
     */
    init(data: { levelIndex: number }): void {
        this.levelIndex = data.levelIndex ?? 0;
        this.level = LEVELS[this.levelIndex];
        this.graph = this.level.nodes;
        this.currentNodeId = this.level.startNodeId;
        
        // Reset all state flags
        this.isMoving = this.isGameOver = this.isCatMoving = this.isTutorialActive = false;
        this.catNodeId = this.catSprite = this.squirrel = undefined;
        this.isFogOfWar = this.levelIndex > 0; // Enable fog of war after level 0
        
        // Compute optimal paths using the engine (adjust graph if cat is present)
        const graphForEngine = this.level.catStartNodeId !== undefined ? buildCatChaseGraph(this.level) : this.level;
        this.energyGameResult = computeEnergyGame(graphForEngine);

        // Clear all tracking maps/sets for level restart
        [this.revealedNodes, this.triggeredTraps].forEach(s => s.clear());
        [this.nodeGraphicsMap, this.nodeTextsMap, this.edgeGraphicsMap, this.edgeTextsMap, this.nodeEffectTextsMap, this.fogCloudsMap].forEach(m => m.clear());
    }

    /**
     * Loads external graphical assets
     */
    preload(): void {
        this.load.spritesheet('puppy_run', 'assets/Splayer_strip4.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('squirrel_img', 'assets/squirrel.png', { frameWidth: 50, frameHeight: 45 });
        this.load.image('town_tiles', 'assets/tilemap_packed.png');
        this.load.tilemapTiledJSON('map', 'assets/map.json');
        this.load.image('heart', 'assets/heart.png');
        this.load.image('fire', 'assets/fire.png');
    }

    /**
     * Helper to safely play animations on a sprite if it exists
     */
    private safePlay(sprite: Phaser.GameObjects.Sprite | null | undefined, key: string): void {
        if (sprite && this.anims.exists(key) && this.anims.get(key)!.frames.length > 0) sprite.play(key, true);
    }

    /**
     * Main setup method: builds map, characters, UI, and starts gameplay
     */
    create(): void {
        // Generate programmatic textures
        this.createBoneTexture();
        this.createCloudTexture();
        
        // Setup tilemap background
        const map = this.make.tilemap({ key: 'map' });
        const tileset = map.addTilesetImage('town_tiles', 'town_tiles');
        if (tileset) {
            ['background', 'midground', 'foreground'].forEach(layer => map.createLayer(layer, tileset, 0, 0)?.setScale(2.5));
        }

        // Generate a simple dot texture for particle effects
        this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff, 1).fillCircle(4, 4, 4).generateTexture('white_dot', 8, 8).destroy();

        // Initialize resources and share state via Registry for the HUD
        this.currentResources = { ...this.level.initialResources };
        Object.entries({ 
            resources: this.currentResources, 
            preview: null, 
            goalReached: false, 
            node: this.currentNodeId, 
            energyGameResult: this.energyGameResult, 
            initialResources: { ...this.level.initialResources }, 
            nodeType: this.graph.find(n => n.id === this.currentNodeId)!.type 
        }).forEach(([k, v]) => this.registry.set(k, v));

        // Launch UI overlay scene
        this.scene.launch('HudScene');
        
        // Draw the nodes and connecting edges
        this.drawGraph();

        // Apply Fog of War restrictions if enabled
        if (this.isFogOfWar) {
            [this.nodeGraphicsMap, this.nodeTextsMap, this.edgeGraphicsMap, this.edgeTextsMap, this.nodeEffectTextsMap].forEach(m => m.forEach(o => (o as any).setAlpha(0)));
            this.revealNode(this.currentNodeId, false);
            this.revealEdgesFrom(this.currentNodeId, false);
        }

        // Setup Main Character (Puppy)
        const start = this.graph.find(n => n.id === this.currentNodeId)!;
        this.puppy = this.add.sprite(start.x, start.y, 'puppy_run').setScale(1.5).setDepth(10).setOrigin(0.5, 0.9);

        // Create character animations
        const puppyFrames = this.anims.generateFrameNumbers('puppy_run', { start: 0, end: 3 });
        if (puppyFrames.length > 0) {
            if (!this.anims.exists('walk')) this.anims.create({ key: 'walk', frames: puppyFrames, frameRate: 4, repeat: -1 });
            if (!this.anims.exists('idle')) this.anims.create({ key: 'idle', frames: [{ key: 'puppy_run', frame: 0 }], frameRate: 10 });
        }
        
        const sqFrames = this.anims.generateFrameNumbers('squirrel_img', { frames: [0, 1] });
        if (sqFrames.length > 0) {
            if (!this.anims.exists('squirrel_run')) this.anims.create({ key: 'squirrel_run', frames: sqFrames, frameRate: 8, repeat: -1 });
            if (!this.anims.exists('squirrel_idle')) this.anims.create({ key: 'squirrel_idle', frames: [{ key: 'squirrel_img', frame: 0 }], frameRate: 10 });
        }

        // Setup Enemy (Cat) if present in the level
        if (this.level.catStartNodeId !== undefined) {
            this.catNodeId = this.level.catStartNodeId;
            const catNode = this.graph.find(n => n.id === this.catNodeId)!;
            this.catSprite = this.add.sprite(catNode.x, catNode.y, 'puppy_run').setScale(1.5).setDepth(11).setOrigin(0.5, 0.9).setTint(0xff5555);
        }

        // Setup Hover Tooltip Container
        this.tooltipContainer = this.add.container(0, 0).setDepth(1500).setAlpha(0);
        this.tooltipBg = this.add.rectangle(0, 0, 200, 50, 0x1a252f, 0.9).setStrokeStyle(2, 0xffffff);
        this.tooltipText = this.add.text(0, 0, '', { fontSize: '14px', color: '#ffffff', align: 'center', wordWrap: { width: 180 } }).setOrigin(0.5);
        this.tooltipContainer.add([this.tooltipBg, this.tooltipText]);

        // Evaluate and highlight available moves for the player
        this.highlightPossibleMoves();

        // Setup Tutorial Dialogues based on level index
        const tutorials = [
            'Welcome! Guide the puppy to the House node.\nEvery move consumes Time (T) and Stamina (S).',
            'The path ahead is hidden in the fog!\nNew nodes will only reveal themselves as you explore.',
            'Watch out! A mischievous cat is on the prowl.\nKeep moving and do not let it catch you!'
        ];

        if (tutorials[this.levelIndex]) {
            this.isTutorialActive = true;
            this.showDialogue(tutorials[this.levelIndex], () => { this.isTutorialActive = false; });
        }
    }

    /**
     * Displays a tutorial dialogue popup with a blocker background
     */
    private showDialogue(text: string, onComplete: () => void): void {
        const { width, height } = this.scale;
        const blocker = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(3000).setInteractive({ useHandCursor: true });
        const container = this.add.container(width / 2, height + 100).setDepth(3001);
        const bg = this.add.rectangle(0, 0, width * 0.8, 90, 0x000000, 0.8).setStrokeStyle(4, 0xffffff, 1);
        const msg = this.add.text(0, 0, text, { fontSize: '22px', color: '#ffffff', fontStyle: 'bold', wordWrap: { width: width * 0.8 - 40 } }).setOrigin(0.5);
        const ind = this.add.text(width * 0.4 - 20, 25, '▼', { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5);
        
        this.tweens.add({ targets: ind, y: ind.y + 5, duration: 400, yoyo: true, repeat: -1 });
        container.add([bg, msg, ind]);

        // Animate in, wait for click, then animate out
        this.tweens.add({ targets: container, y: height - 65, duration: 400, ease: 'Back.easeOut', onComplete: () => {
            blocker.once('pointerdown', () => {
                blocker.destroy();
                this.tweens.add({ targets: container, y: height + 100, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => { container.destroy(); onComplete(); }});
            });
        }});
    }

    // --- Texture Generators ---
    private createBoneTexture() { /* ... */
        if (this.textures.exists('bone_icon')) return;
        this.make.graphics({ x: 0, y: 0 }).fillStyle(0xffffff, 1).fillRoundedRect(4, 4, 16, 6, 2).fillCircle(4, 7, 4).fillCircle(4, 11, 4).fillCircle(20, 7, 4).fillCircle(20, 11, 4).generateTexture('bone_icon', 24, 14).destroy();
    }

    private createCloudTexture() { /* ... */
        if (this.textures.exists('cloud')) return;
        this.make.graphics({ x: 0, y: 0 })
            .fillStyle(0xecf0f1, 1)
            .fillCircle(35, 35, 25)
            .fillCircle(60, 30, 30)
            .fillCircle(85, 35, 25)
            .fillCircle(25, 55, 20)
            .fillCircle(50, 55, 25)
            .fillCircle(75, 55, 25)
            .fillCircle(95, 50, 20)
            .fillCircle(60, 65, 20)
            .generateTexture('cloud', 120, 90)
            .destroy();
    }

    /**
     * Creates a glowing particle emitter used to highlight accessible nodes
     */
    private createMagicDustEmitter(x: number, y: number, color: number) {
        return this.add.particles(x, y, 'white_dot', { speed: { min: 10, max: 25 }, gravityY: -5, emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, 12) }, scale: { start: 0, end: 0.8 }, alpha: { start: 0, end: 1 }, lifespan: { min: 1000, max: 2500 }, frequency: 40, quantity: 1, tint: color, blendMode: 'ADD' }).setDepth(100);
    }

    /**
     * Removes fog from a specific node
     */
    private revealNode(nodeId: number, animate: boolean): void {
        if (this.revealedNodes.has(nodeId)) return;
        this.revealedNodes.add(nodeId);
        
        const targets = [this.nodeGraphicsMap.get(nodeId), this.nodeTextsMap.get(nodeId), this.nodeEffectTextsMap.get(nodeId)].filter(Boolean) as any[];
        if (targets.length) animate ? this.tweens.add({ targets, alpha: 1, duration: 600 }) : targets.forEach(t => t.setAlpha(1));

        const cloud = this.fogCloudsMap.get(nodeId);
        if (cloud) {
            animate ? this.tweens.add({ targets: cloud, alpha: 0, scale: 1.5, duration: 800, ease: 'Power2', onComplete: () => cloud.destroy() }) : cloud.destroy();
            this.fogCloudsMap.delete(nodeId);
        }
    }

    /**
     * Reveals edges connected to a specific node to clear paths in Fog of War
     */
    private revealEdgesFrom(nodeId: number, animate: boolean): void {
        this.graph.find(n => n.id === nodeId)?.neighbors.forEach(edge => {
            const targets = [this.edgeGraphicsMap.get(`${nodeId}-${edge.targetId}`), this.edgeTextsMap.get(`${nodeId}-${edge.targetId}`)].filter(Boolean) as any[];
            if (targets.length && targets[0].alpha === 0) animate ? this.tweens.add({ targets, alpha: 1, duration: 600 }) : targets.forEach(t => t.setAlpha(1));
            this.revealNode(edge.targetId, animate);
        });
    }

/**
     * Generates visual labels for resource gains/costs on paths or nodes.
     * Replaced basic bars with proportional icons (Hearts/Fire).
     */
    private createEffectBars(x: number, y: number, effects: ResourceEffect[] | undefined) {
        if (!effects?.length) return null;
        const container = this.add.container(x, y).setDepth(5);
        const g = this.add.graphics();
        container.add(g);
        
        effects.forEach((eff, i) => {
            const rowHeight = 16;
            const oy = (-effects.length * rowHeight) / 2 + (rowHeight / 2) + i * rowHeight;

            if (eff.resource === 'bones') {
                // Bone icon rendering (Keep it simple)
                g.fillStyle(0x1a252f, 0.8).fillRoundedRect(-24, oy - 8, 48, 16, 4);
                container.add([
                    this.add.image(-10, oy, 'bone_icon').setScale(1.1).setOrigin(0.5),
                    this.add.text(4, oy, `+${eff.value}`, { fontSize: '11px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0, 0.5)
                ]);
            } else {
                // Time & Stamina Icon rendering
                const isTime = eff.resource === 'time';
                const textureKey = isTime ? 'heart' : 'fire';
                const isCost = eff.value < 0;
                const absVal = Math.abs(eff.value);

                // Setup Icon dimensions specifically for the small map tooltips
                const targetWidth = 12; // Smaller size for the map
                const spacing = targetWidth + 2;
                const numIcons = Math.ceil(absVal / 10);

                // Calculate layout width to keep it centered over the node/edge
                const iconsWidth = numIcons * spacing;
                const textWidth = 20; // Estimated padding for text like "-15"
                const totalWidth = iconsWidth + textWidth;
                const startX = -totalWidth / 2;

                // Dark background plate for readability
                g.fillStyle(0x1a252f, 0.8).fillRoundedRect(startX - 4, oy - 8, totalWidth + 8, 16, 4);

                // Get original dimensions to scale and crop properly
                const frame = this.textures.getFrame(textureKey);
                const origW = frame ? frame.width : 20;
                const origH = frame ? frame.height : 20;
                const scale = targetWidth / origW;

                for (let j = 0; j < numIcons; j++) {
                    const pointsInSlot = Math.min(absVal - j * 10, 10);
                    const iconX = startX + j * spacing;

                    const img = this.add.image(iconX, oy, textureKey)
                        .setOrigin(0, 0.5)
                        .setScale(scale);

                    if (isCost) {
                        img.setTintFill(0x00ff00); // Tint green if it's a cost/deduction
                    }

                    if (pointsInSlot < 10) {
                        img.setCrop(0, 0, origW * (pointsInSlot / 10), origH); // Fractional crop
                    }

                    container.add(img);
                }

                // Add the text label ("-15" or "+10") at the end of the icons
                const textStr = `${isCost ? '-' : '+'}${absVal}`;
                container.add(
                    this.add.text(startX + iconsWidth, oy, textStr, {
                        fontSize: '11px', fontStyle: 'bold', color: '#fff', stroke: '#000', strokeThickness: 2
                    }).setOrigin(0, 0.5)
                );
            }
        });
        return container;
    }

    /**
     * Core movement logic triggered when user clicks a valid node
     */
    private moveToNextNode(targetNodeId: number, isTrapTrigger = false): void {
        if (this.isMoving || this.isGameOver || this.isCatMoving || this.isTutorialActive) return;
        const edge = this.graph.find(n => n.id === this.currentNodeId)?.neighbors.find(e => e.targetId === targetNodeId);
        if (!edge) return;
        
        // Calculate future resources and prevent move if it causes failure
        const nextResources = applyEffects(this.currentResources, edge.effects, this.level.maxResources);
        if (nextResources.time < 0 || nextResources.stamina < 0) return this.triggerDefeat(nextResources.time < 0 ? 'time' : 'stamina');
        if (targetNodeId === this.level.goalNodeId && nextResources.bones < 1) return this.cameras.main.shake(200, 0.01) as any; // Require bone to win

        // Clean up UI and hints
        this.activeHints.forEach(h => h?.destroy());
        this.activeHints = [];
        this.tooltipContainer.setAlpha(0);
        
        // Update states
        this.isMoving = true;
        this.registry.set('resources', this.currentResources = nextResources);

        const targetNode = this.graph.find(n => n.id === targetNodeId)!;
        const triggerChase = isTrapTrigger || (edge as any).isChase;

        // Animate movement along a predefined path or in a straight line
        if (edge.pathNodes?.length) {
            if (triggerChase) {
                // Squirrel leads the way
                this.squirrel = this.add.sprite(this.puppy.x, this.puppy.y, 'squirrel_img').setScale(1.5).setDepth(10).setOrigin(0.5, 0.9);
                this.moveSquirrelStep(edge.pathNodes, 1, () => {});
                this.time.delayedCall(400, () => this.moveAlongPath(edge.pathNodes!, targetNode, true));
            } else {
                this.moveAlongPath(edge.pathNodes, targetNode, false);
            }
        } else {
            // Straight line logic
            if (triggerChase) {
                this.squirrel = this.add.sprite(this.puppy.x, this.puppy.y, 'squirrel_img').setScale(1.5).setDepth(10).setOrigin(0.5, 0.9);
                this.safePlay(this.squirrel.setFlipX(targetNode.x < this.squirrel.x), 'squirrel_run');
                this.tweens.add({ targets: this.squirrel, x: targetNode.x, y: targetNode.y, duration: 1500, onComplete: () => this.safePlay(this.squirrel, 'squirrel_idle') });
                this.time.delayedCall(400, () => {
                    this.safePlay(this.puppy.setFlipX(targetNode.x < this.puppy.x), 'walk');
                    this.tweens.add({ targets: this.puppy, x: targetNode.x, y: targetNode.y, duration: 2500, ease: 'Power2', onComplete: () => { this.squirrel?.destroy(); this.handleMoveCompletion(targetNodeId, targetNode); } });
                });
            } else {
                this.safePlay(this.puppy.setFlipX(targetNode.x < this.puppy.x), 'walk');
                this.tweens.add({ targets: this.puppy, x: targetNode.x, y: targetNode.y, duration: 2500, ease: 'Power2', onComplete: () => this.handleMoveCompletion(targetNodeId, targetNode) });
            }
        }
    }

    /**
     * Recursively animates the squirrel across multiple path points
     */
    private moveSquirrelStep(path: { x: number, y: number }[], index: number, onComplete: () => void): void {
        if (!this.squirrel) return;
        if (index >= path.length) {
            this.safePlay(this.squirrel, 'squirrel_idle');
            return onComplete();
        }
        const pt = path[index];
        this.safePlay(this.squirrel.setFlipX(pt.x < this.squirrel.x), 'squirrel_run');
        this.tweens.add({ targets: this.squirrel, x: pt.x, y: pt.y, duration: Phaser.Math.Distance.Between(this.squirrel.x, this.squirrel.y, pt.x, pt.y) * 4, onComplete: () => this.moveSquirrelStep(path, index + 1, onComplete) });
    }

    /**
     * Recursively animates the puppy across multiple path points
     */
    private moveAlongPath(path: { x: number, y: number }[], targetNode: GraphNode, isChase: boolean = false): void {
        const moveStep = (i: number) => {
            if (i >= path.length) {
                if (isChase) this.squirrel?.destroy();
                return this.handleMoveCompletion(targetNode.id, targetNode);
            }
            const pt = path[i], prev = i > 0 ? path[i - 1] : this.puppy;
            
            // Adjust sprite flip based on horizontal movement
            if (Math.abs(pt.x - (prev as any).x) > 2) this.puppy.setFlipX(pt.x < (prev as any).x);
            
            const dist = Phaser.Math.Distance.Between(this.puppy.x, this.puppy.y, pt.x, pt.y);
            dist < 2 ? moveStep(i + 1) : this.tweens.add({ targets: this.puppy, x: pt.x, y: pt.y, duration: dist * 8, ease: 'Linear', onComplete: () => moveStep(i + 1) });
        };
        this.safePlay(this.puppy, 'walk');
        moveStep(1);
    }

    /**
     * Triggered when the puppy arrives at the selected node. Evaluates node effects, win state, or passes turn to the cat.
     */
    private handleMoveCompletion(targetNodeId: number, targetNode: GraphNode): void {
        this.safePlay(this.puppy, 'idle');
        this.registry.set('node', this.currentNodeId = targetNodeId);
        this.registry.set('nodeType', targetNode.type);

        // Apply any specific effects localized on the node itself (e.g. bones)
        if (targetNode.nodeEffects?.length) {
            this.registry.set('resources', this.currentResources = applyEffects(this.currentResources, targetNode.nodeEffects, this.level.maxResources));
            if (targetNode.nodeEffects.some(e => e.resource === 'bones' && e.value > 0) && !this.registry.get(`bone_${targetNodeId}`)) {
                this.registry.set(`bone_${targetNodeId}`, true);
                
                // Hide effect text and play bone collect animation
                const ui = this.nodeEffectTextsMap.get(targetNodeId);
                if (ui) this.tweens.add({ targets: ui, alpha: 0, duration: 300 });
                const b = this.add.image(this.puppy.x, this.puppy.y - 30, 'bone_icon').setScale(1.5).setDepth(200);
                this.tweens.add({ targets: b, x: this.cameras.main.scrollX + 430, y: this.cameras.main.scrollY + 60, scale: 2.5, rotation: Math.PI * 4, duration: 600, ease: 'Power2', onComplete: () => b.destroy() });
            }
        }
        
        if (this.isFogOfWar) this.revealEdgesFrom(targetNodeId, true);
        this.isMoving = false;

        // Check Win/Loss conditions
        if (this.currentNodeId === this.level.goalNodeId) {
            this.registry.set('finalResources', { ...this.currentResources });
            this.registry.set('goalReached', true);
            this.highlightPossibleMoves();
            this.triggerVictory();
        } else if (this.catNodeId !== undefined) {
            this.currentNodeId === this.catNodeId ? this.triggerDefeat('cat') : this.moveCat();
        } else {
            this.highlightPossibleMoves(); // Player's turn again
        }
    }

    /**
     * AI Logic for the chasing cat. Finds optimal path towards player.
     */
    private moveCat(): void {
        if (this.catNodeId === undefined || !this.catSprite || this.isGameOver) return;
        const catNode = this.graph.find(n => n.id === this.catNodeId)!;
        
        // Decide next move: If adjacent to player, attack. Otherwise, use engine budgets to move towards player.
        let bestTarget = catNode.neighbors.some(e => e.targetId === this.currentNodeId) ? this.currentNodeId : catNode.neighbors.reduce((best, edge) => {
            const cost = this.energyGameResult.nodeWinBudgets.get((this.currentNodeId * 1000) + edge.targetId)?.time ?? 0;
            const dist = Phaser.Math.Distance.Between(this.graph.find(n => n.id === edge.targetId)!.x, this.graph.find(n => n.id === edge.targetId)!.y, this.graph.find(n => n.id === this.currentNodeId)!.x, this.graph.find(n => n.id === this.currentNodeId)!.y);
            return cost > best.cost || (cost === best.cost && dist < best.dist) ? { id: edge.targetId, cost, dist } : best;
        }, { id: this.catNodeId, cost: -1, dist: Infinity }).id;

        this.isCatMoving = true;
        const targetNode = this.graph.find(n => n.id === bestTarget)!;
        this.safePlay(this.catSprite.setFlipX(targetNode.x < this.catSprite.x), 'walk');
        
        // Animate Cat movement
        this.tweens.add({ targets: this.catSprite, x: targetNode.x, y: targetNode.y, duration: 800, ease: 'Linear', onComplete: () => {
            this.catSprite?.stop();
            this.catNodeId = bestTarget;
            this.isCatMoving = false;
            
            // Check if cat caught the player, else return control to player
            this.catNodeId === this.currentNodeId ? this.triggerDefeat('cat') : this.highlightPossibleMoves();
        }});
    }

    private triggerVictory(): void {
        this.isGameOver = true;
        // Bounce animation on victory
        this.tweens.add({ targets: this.puppy, y: this.puppy.y - 30, yoyo: true, repeat: -1, duration: 300, ease: 'Sine.easeInOut' });
    }

    private triggerDefeat(reason: 'time' | 'stamina' | 'cat'): void {
        this.isGameOver = true; this.puppy.stop(); this.cameras.main.shake(200, 0.01);
        
        // Specific death animations based on reason
        if (reason === 'cat' && this.catSprite) this.tweens.add({ targets: this.catSprite, x: this.puppy.x, y: this.puppy.y - 10, scale: 2, duration: 300, ease: 'Bounce.easeOut' });
        else if (reason === 'time') this.tweens.add({ targets: this.puppy, angle: 90, duration: 500, ease: 'Bounce.easeOut' });
        else if (reason === 'stamina') this.puppy.setTint(0x88aaff); // Turn pale/exhausted
        
        // Show Retry popup
        this.time.delayedCall(1500, () => this.showPopup('Defeat', `Out of ${reason === 'cat' ? 'luck! Caught by cat' : reason}!`, 'Try Again', () => { this.scene.stop('HudScene'); this.scene.restart(); }, false));
    }

    /**
     * Generic UI Popup for Game Over conditions
     */
    private showPopup(t: string, m: string, btn: string, cb: () => void, w: boolean): void {
        const { width: W, height: H } = this.scale;
        this.add.rectangle(0, 0, W, H, 0x000, 0.7).setOrigin(0).setDepth(100).setInteractive();
        this.add.rectangle(W / 2, H / 2, 400, 250, w ? 0x27ae60 : 0xc0392b).setOrigin(0.5).setDepth(101).setStrokeStyle(4, 0xfff);
        this.add.text(W / 2, H / 2 - 70, t, { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(102);
        this.add.text(W / 2, H / 2 - 10, m, { fontSize: '18px', color: '#f6f8ff', align: 'center', wordWrap: { width: 360 } }).setOrigin(0.5).setDepth(102);
        const btnBg = this.add.rectangle(W / 2, H / 2 + 70, 200, 50, 0xfff).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
        this.add.text(W / 2, H / 2 + 70, btn, { fontSize: '20px', color: w ? '#27ae60' : '#c0392b', fontStyle: 'bold' }).setOrigin(0.5).setDepth(103);
    }

    /**
     * Initializes visual representation of map layout (Edges, Nodes, Fogs, Cost UI)
     */
    private drawGraph(): void {
        const rendered = new Set<string>();
        this.graph.forEach(node => {
            // Render lines (edges) between nodes
            node.neighbors.forEach(e => {
                const neighbor = this.graph.find(n => n.id === e.targetId)!;
                const angle = Phaser.Math.Angle.Between(node.x, node.y, neighbor.x, neighbor.y);
                const startX = node.x + Math.cos(angle - Math.PI / 2) * 12, startY = node.y + Math.sin(angle - Math.PI / 2) * 12;
                const endX = neighbor.x + Math.cos(angle - Math.PI / 2) * 12, endY = neighbor.y + Math.sin(angle - Math.PI / 2) * 12;
                
                this.edgeGraphicsMap.set(`${node.id}-${e.targetId}`, this.add.graphics().lineStyle(4, 0x87a1ff, 0.6).beginPath().moveTo(startX, startY).lineTo(endX, endY));
                
                // Prevent rendering double cost bars for bi-directional edges
                const uKey = `${Math.min(node.id, e.targetId)}-${Math.max(node.id, e.targetId)}`;
                if (!rendered.has(uKey)) {
                    rendered.add(uKey);
                    const ui = this.createEffectBars(startX + (endX - startX) * 0.5, startY + (endY - startY) * 0.5, e.effects);
                    if (ui) { this.edgeTextsMap.set(`${node.id}-${e.targetId}`, ui); this.edgeTextsMap.set(`${e.targetId}-${node.id}`, ui); }
                }
            });

            // Draw Node object (Defender traps get a special icon, others are invisible hitboxes)
            const obj = node.type === NodeType.DEFENDER ? createDefenderTrapIcon(this, node.x, node.y, 20).setInteractive(new Phaser.Geom.Circle(0, 0, 24), Phaser.Geom.Circle.Contains) : this.add.circle(node.x, node.y, 24, 0x000, 0).setInteractive({ useHandCursor: true });
            this.nodeGraphicsMap.set(node.id, obj);
            
            // Add decorative animated clouds if Fog of War is enabled
            if (this.isFogOfWar) {
                const cloud = this.add.image(node.x, node.y, 'cloud').setOrigin(0.5).setDepth(40);
                this.tweens.add({ targets: cloud, x: '+=10', duration: 2000 + Math.random() * 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                this.fogCloudsMap.set(node.id, cloud);
            }
            
            // Interaction Helpers
            const toggleTrap = (speed: number, alpha: number) => {
                if (node.type === NodeType.DEFENDER && !this.triggeredTraps.has(node.id)) {
                    (obj as any).getData('spikeTween')?.setTimeScale(speed);
                    (obj as any).getData('coreGfx')?.setAlpha(alpha);
                }
            };

            // Hover state logic for previewing resource changes and tooltips
            obj.on('pointerover', () => {
                if (this.isTutorialActive || (this.isFogOfWar && !this.revealedNodes.has(node.id))) return;
                toggleTrap(4, 0.8); // Speed up trap animation on hover
                
                // Construct Tooltip text based on node contents
                const tt = node.type === NodeType.DEFENDER && !this.triggeredTraps.has(node.id) ? 'Defender Node:\nForces you to the highest cost path!' : node.nodeEffects?.some(e => e.resource === 'bones' && e.value > 0) ? 'Bone Node:\nCollect to increase score.' : this.levelIndex === 0 ? 'Walkable Path:\nClick to move here.' : '';
                if (tt) this.tooltipText.setText(tt) && this.tooltipBg.setSize(this.tooltipText.width + 20, this.tooltipText.height + 20) && this.tooltipContainer.setPosition(node.x, node.y - 65).setAlpha(1);

                // Setup HUD preview registry
                if (!this.registry.get('goalReached') && !this.isMoving && !this.isGameOver && !this.isCatMoving) {
                    const edge = this.graph.find(n => n.id === this.currentNodeId)?.neighbors.find(e => e.targetId === node.id);
                    if (edge) this.registry.set('preview', applyEffects(applyEffects(this.currentResources, edge.effects, this.level.maxResources), node.nodeEffects || [], this.level.maxResources));
                }
            });

            obj.on('pointerout', () => { if (!this.isTutorialActive) { this.registry.set('preview', null); this.tooltipContainer.setAlpha(0); toggleTrap(1, 0.2); }});
            obj.on('pointerdown', () => { if (!this.isTutorialActive && !(this.isFogOfWar && !this.revealedNodes.has(node.id))) this.moveToNextNode(node.id); });
            if (node.nodeEffects?.length) this.nodeEffectTextsMap.set(node.id, this.createEffectBars(node.x, node.y - 36, node.nodeEffects)!);
        });
    }

    /**
     * Determines valid moves, displays visual hints, and handles involuntary Defender trap triggers
     */
    private highlightPossibleMoves(): void {
        if (this.registry.get('goalReached') || this.isCatMoving) return;
        const cur = this.graph.find(n => n.id === this.currentNodeId)!;
        
        // Trap Trigger Logic (If the player landed on an untriggered Defender node)
        if (cur.type === NodeType.DEFENDER && !this.triggeredTraps.has(cur.id)) {
            const alert = this.add.text(this.puppy.x, this.puppy.y - 40, '❗', { fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(30);
            const sq = this.add.sprite(cur.x + 50, cur.y, 'squirrel_img').setOrigin(0.5, 0.9).setDepth(9).setScale(2).setFlipX(true);
            this.safePlay(sq, 'squirrel_idle');

            this.showDialogue("Oh look! A playful squirrel dashed out from the bushes!", () => {
                alert.destroy();
                if (this.isMoving || this.isGameOver) return sq.destroy();

                // Defender trap forces the worst optimal path 80% of the time, or a random path
                const nextId = cur.neighbors.length ? [...cur.neighbors].sort((a, b) => (this.energyGameResult?.nodeWinBudgets.get(b.targetId)?.time ?? 0) - (this.energyGameResult?.nodeWinBudgets.get(a.targetId)?.time ?? 0))[Math.random() < 0.8 ? 0 : Math.floor(Math.random() * cur.neighbors.length)].targetId : null;
                
                if (nextId !== null) {
                    this.triggeredTraps.add(cur.id);
                    
                    // Break trap visual
                    const trap = this.nodeGraphicsMap.get(cur.id) as Phaser.GameObjects.Container;
                    if (trap?.list) trap.getData('spikeTween')?.stop() || this.tweens.add({ targets: trap.list, alpha: 0.2, duration: 400 });

                    // Plot squirrel escape route
                    const edge = cur.neighbors.find(e => e.targetId === nextId)!;
                    const path = edge.pathNodes?.length ? edge.pathNodes : [{ x: this.graph.find(n=>n.id===nextId)!.x, y: this.graph.find(n=>n.id===nextId)!.y }];
                    
                    this.safePlay(sq, 'squirrel_run');
                    this.tweens.killTweensOf(sq);

                    // Recursive squirrel run animation
                    const moveSquirrelStep = (i: number) => {
                        if (i >= path.length) return this.safePlay(sq, 'squirrel_idle');
                        const pt = path[i], prev = i > 0 ? path[i - 1] : sq;
                        if (pt.x < (prev as any).x - 2) sq.setFlipX(false);
                        else if (pt.x > (prev as any).x + 2) sq.setFlipX(true);
                        
                        const isLast = i === path.length - 1;
                        const dist = Phaser.Math.Distance.Between(sq.x, sq.y, pt.x + (isLast?35:0), pt.y - (isLast?10:0));
                        dist < 2 ? moveSquirrelStep(i + 1) : this.tweens.add({ targets: sq, x: pt.x + (isLast?35:0), y: pt.y - (isLast?10:0), duration: dist * 5, ease: 'Linear', onComplete: () => moveSquirrelStep(i + 1) });
                    };
                    
                    moveSquirrelStep(0);
                    // Force player to follow squirrel after short delay
                    this.time.delayedCall(400, () => this.moveToNextNode(nextId));
                } else sq.destroy();
            }); 
            return;
        }

        // Standard Turn Logic: Outline invalid paths and emit particles on valid paths
        this.nodeGraphicsMap.forEach((obj, id) => { if (!(this.isFogOfWar && !this.revealedNodes.has(id)) && obj instanceof Phaser.GameObjects.Arc) obj.setStrokeStyle(0); });
        
        cur.neighbors.forEach(e => {
            const obj = this.nodeGraphicsMap.get(e.targetId);
            if (!obj || (this.isFogOfWar && !this.revealedNodes.has(e.targetId))) return;
            const res = applyEffects(this.currentResources, e.effects, this.level.maxResources);
            
            // Magic dust for valid moves, red outline for invalid
            res.time >= 0 && res.stamina >= 0 ? this.activeHints.push(this.createMagicDustEmitter((obj as any).x, (obj as any).y, 0x88ccff)) : (obj instanceof Phaser.GameObjects.Arc && obj.setStrokeStyle(3, 0xff4444, 0.7));
        });
    }
}