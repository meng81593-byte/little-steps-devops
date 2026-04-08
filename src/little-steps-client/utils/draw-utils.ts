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