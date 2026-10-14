import Phaser from 'phaser';

export function createDefenderTrapIcon(scene: Phaser.Scene, x: number, y: number, radius: number, _color?: number): Phaser.GameObjects.Container {
    const baseGfx = scene.add.graphics();
    baseGfx.fillStyle(0x446447).fillRect(-radius, -8, radius * 2, 16);
    baseGfx.fillStyle(0x638556).fillRect(-radius + 4, -14, radius * 2 - 8, 24);
    baseGfx.fillStyle(0x819f64).fillRect(-radius + 8, -18, radius * 2 - 16, 22);
    baseGfx.fillStyle(0x334c37).fillRect(-radius, 8, radius * 2, 4);
    const squirrel = scene.add.graphics();
    // A readable pixel squirrel silhouette, sized for a map stop.
    squirrel.fillStyle(0x553c2a).fillRect(-15, -15, 10, 18).fillRect(-12, -18, 10, 10);
    squirrel.fillStyle(0xa77449).fillRect(-12, -15, 6, 14).fillRect(-9, -17, 5, 7);
    squirrel.fillStyle(0x553c2a).fillRect(-5, -10, 13, 19).fillRect(-3, -17, 12, 12).fillRect(-2, -21, 4, 6).fillRect(5, -20, 4, 5);
    squirrel.fillStyle(0xbe8b59).fillRect(-2, -8, 8, 14).fillRect(0, -15, 9, 9);
    squirrel.fillStyle(0xe3c896).fillRect(1, -3, 4, 8).fillRect(5, -10, 6, 4);
    squirrel.fillStyle(0x35271e).fillRect(5, -13, 2, 2).fillRect(9, -9, 3, 2).fillRect(-5, 7, 6, 3).fillRect(4, 7, 6, 3);
    const coreGfx = scene.add.graphics();
    coreGfx.fillStyle(0xdbbf85).fillRect(9, 3, 8, 8);
    coreGfx.fillStyle(0x795137).fillRect(8, 1, 10, 3).fillRect(12, -1, 2, 2);
    const container = scene.add.container(x, y, [baseGfx, squirrel, coreGfx]);
    const spikeTween = scene.tweens.add({ targets: squirrel, y: -3, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    container.setData('spikeTween', spikeTween).setData('coreGfx', coreGfx);
    container.once('destroy', () => spikeTween.stop());
    return container;
}

