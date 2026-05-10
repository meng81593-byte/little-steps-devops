import Phaser from 'phaser';

export function createDefenderTrapIcon(scene: Phaser.Scene, x: number, y: number, radius: number, color: number = 0xff4d4d): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const baseGfx = scene.add.graphics();
    baseGfx.fillStyle(0x1a1a1a, 1);
    baseGfx.fillCircle(0, 0, radius);
    baseGfx.lineStyle(2, color, 0.8);
    baseGfx.strokeCircle(0, 0, radius - 2);

    const spikeGfx = scene.add.graphics();
    spikeGfx.fillStyle(color, 1);
    
    const numSpikes = 12;
    const spikeLength = radius * 0.6;
    const spikeBaseWidth = (Math.PI * radius) / numSpikes;

    for (let i = 0; i < numSpikes; i++) {
        const angle = (i / numSpikes) * Math.PI * 2;
        const tipX = Math.cos(angle) * (radius + spikeLength);
        const tipY = Math.sin(angle) * (radius + spikeLength);
        const baseAngleOffset = Math.asin(spikeBaseWidth / (2 * radius));
        const baseX1 = Math.cos(angle - baseAngleOffset) * radius;
        const baseY1 = Math.sin(angle - baseAngleOffset) * radius;
        const baseX2 = Math.cos(angle + baseAngleOffset) * radius;
        const baseY2 = Math.sin(angle + baseAngleOffset) * radius;
        spikeGfx.fillTriangle(baseX1, baseY1, baseX2, baseY2, tipX, tipY);
    }

    const coreGfx = scene.add.graphics();
    coreGfx.fillStyle(color, 0.5);
    coreGfx.fillCircle(0, 0, radius * 0.4);

    container.add([baseGfx, spikeGfx, coreGfx]);

    // Store animations in the container so we can access them in MainScene
    const spikeTween = scene.tweens.add({
        targets: spikeGfx,
        scale: 1.1,
        duration: 1000, // Normal speed
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    const coreTween = scene.tweens.add({
        targets: coreGfx,
        alpha: 0.2,
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    // Attach data to container for MainScene to use
    container.setData('spikeTween', spikeTween);
    container.setData('coreGfx', coreGfx);

    return container;
}

// ─── Shared cosmetic drawing helpers ─────────────────────────────────────────

export function drawAccessoryOnGfx(gfx: Phaser.GameObjects.Graphics, id: string): void {
    gfx.setDepth(12);
    if (id === 'bow') {
        gfx.fillStyle(0xFF69B4, 1);
        gfx.fillEllipse(-7, 0, 13, 9);
        gfx.fillEllipse(7, 0, 13, 9);
        gfx.fillStyle(0xFF1493, 1);
        gfx.fillCircle(0, 0, 4);
    } else if (id === 'crown') {
        gfx.fillStyle(0xFFD700, 1);
        gfx.fillRect(-10, 1, 20, 5);
        gfx.fillTriangle(-9, 1, -6, -7, -3, 1);
        gfx.fillTriangle(-3, 1, 0, -7, 3, 1);
        gfx.fillTriangle(3, 1, 6, -7, 9, 1);
        gfx.fillStyle(0xFF4444, 1);
        gfx.fillCircle(-6, -2, 2);
        gfx.fillCircle(0, -2, 2);
        gfx.fillCircle(6, -2, 2);
    } else if (id === 'glasses') {
        // Drawn slightly below origin to land on the face (not the top of head)
        gfx.fillStyle(0x222222, 1);
        gfx.fillCircle(-7, 5, 6);
        gfx.fillCircle(7, 5, 6);
        gfx.fillStyle(0x66AAFF, 0.8);
        gfx.fillCircle(-7, 5, 4);
        gfx.fillCircle(7, 5, 4);
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(-3, 4, 6, 2);
    } else if (id === 'star') {
        gfx.fillStyle(0xFFD700, 1);
        const r1 = 9, r2 = 4;
        for (let i = 0; i < 5; i++) {
            const a1 = (i * Math.PI * 2 / 5) - Math.PI / 2;
            const a2 = a1 + Math.PI / 5;
            const a3 = a1 - Math.PI / 5;
            gfx.fillTriangle(
                Math.cos(a1) * r1, Math.sin(a1) * r1,
                Math.cos(a2) * r2, Math.sin(a2) * r2,
                Math.cos(a3) * r2, Math.sin(a3) * r2
            );
        }
        gfx.fillStyle(0xFFEEAA, 1);
        gfx.fillCircle(0, 0, 2);
    }
}

export function drawClothOnGfx(gfx: Phaser.GameObjects.Graphics, id: string): void {
    if (id === 'vest') {
        gfx.setDepth(11);
        gfx.fillStyle(0xCC2222, 0.75);
        gfx.fillRect(-10, -7, 8, 22);
        gfx.fillRect(2, -7, 8, 22);
        gfx.fillStyle(0xEE4444, 0.9);
        gfx.fillRect(-10, -7, 8, 5);
        gfx.fillRect(2, -7, 8, 5);
    } else if (id === 'cape') {
        gfx.setDepth(11);
        gfx.fillStyle(0x3355CC, 0.8);
        gfx.fillTriangle(-14, -5, 14, -5, 0, 26);
        gfx.fillStyle(0x4466DD, 0.9);
        gfx.fillRect(-14, -5, 28, 5);
    } else if (id === 'sweater') {
        gfx.setDepth(11);
        ([0x4466BB, 0xFFFFFF, 0x4466BB, 0xFFFFFF, 0x4466BB] as number[])
            .forEach((c, i) => { gfx.fillStyle(c, 0.85); gfx.fillRect(-12, -7 + i * 5, 24, 5); });
        gfx.fillStyle(0x334499, 0.9);
        gfx.fillRect(-12, -7, 24, 3);
    } else if (id === 'scarf') {
        gfx.setDepth(12);
        gfx.fillStyle(0xDD3333, 0.95);
        gfx.fillRect(-13, -10, 26, 7);
        gfx.fillStyle(0xFFAA00, 0.9);
        gfx.fillRect(-13, -7, 26, 2);
        gfx.fillStyle(0xDD3333, 0.95);
        gfx.fillRect(5, -3, 6, 18);
        gfx.fillStyle(0xFFAA00, 0.9);
        gfx.fillRect(5, -2, 6, 2);
    }
}