import Phaser from 'phaser';

export const PIXEL_FONT = '"Courier New", monospace';
export const PANEL_TEXT = '#49382C';

/** Stepped wooden frame, inset paper and small pixel nails. */
export function drawPixelPanel(g: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const x = -Math.ceil(width / 2), y = -Math.ceil(height / 2);
    g.clear();
    g.fillStyle(0x34271e, 0.22).fillRect(x + 4, y + 6, width, height);
    g.fillStyle(0x503929).fillRect(x + 4, y, width - 8, height);
    g.fillRect(x, y + 4, width, height - 8);
    g.fillStyle(0x986c48).fillRect(x + 4, y + 4, width - 8, height - 8);
    g.fillStyle(0xc59a6b).fillRect(x + 4, y + 4, width - 8, 3);
    g.fillStyle(0x67472f).fillRect(x + 4, y + height - 7, width - 8, 3);
    g.fillStyle(0x67472f).fillRect(x + 8, y + 8, width - 16, height - 16);
    g.fillStyle(0xe2e3de).fillRect(x + 10, y + 10, width - 20, height - 20);
    g.fillStyle(0xf2f1e9).fillRect(x + 10, y + 10, width - 20, 3);
    for (const nx of [x + 4, x + width - 7]) {
        for (const ny of [y + 9, y + height - 12]) {
            g.fillStyle(0x503929).fillRect(nx, ny, 3, 3);
            g.fillStyle(0xd4ae7c).fillRect(nx, ny, 1, 1);
        }
    }
}


/** One common pixel button: the whole visible face moves together. */
export function makePixelButton(scene: Phaser.Scene, x: number, y: number, width: number, label: string): Phaser.GameObjects.Container {
    const g = scene.add.graphics();
    drawPixelPanel(g, width, 44);
    const face = scene.add.rectangle(0, 0, width - 20, 24, 0xcbd6bc);
    const text = scene.add.text(0, 0, label, { fontFamily: PIXEL_FONT, fontSize: '14px', fontStyle: 'bold', color: PANEL_TEXT }).setOrigin(0.5);
    const button = scene.add.container(x, y, [g, face, text]);
    button.setSize(width, 44).setInteractive({ useHandCursor: true });
    const animate = (scale: number) => {
        scene.tweens.killTweensOf(button);
        scene.tweens.add({ targets: button, scale, duration: 160, ease: 'Sine.easeOut' });
    };
    button.on('pointerover', () => { face.setFillStyle(0xdbe6cd); animate(1.025); });
    button.on('pointerout', () => { face.setFillStyle(0xcbd6bc); animate(1); });
    button.on('pointerdown', () => animate(0.95));
    button.on('pointerup', () => animate(1.025));
    return button;
}

/** Small, legible badges use actual pixel icons instead of platform emoji. */
export function drawResourceIcon(g: Phaser.GameObjects.Graphics, kind: string, x: number, y: number): void {
    if (kind === 'time') {
        g.fillStyle(0x795b40).fillRect(x - 6, y - 6, 12, 12);
        g.fillStyle(0xe9d4a2).fillRect(x - 4, y - 4, 8, 8);
        g.fillStyle(0x795b40).fillRect(x, y - 3, 2, 5).fillRect(x, y, 3, 2);
    } else if (kind === 'stamina') {
        g.fillStyle(0xad665e).fillRect(x - 6, y - 4, 5, 5).fillRect(x + 1, y - 4, 5, 5);
        g.fillRect(x - 5, y, 10, 3).fillRect(x - 3, y + 3, 6, 2).fillRect(x - 1, y + 5, 2, 2);
        g.fillStyle(0xe9aea1).fillRect(x - 5, y - 3, 2, 2);
    } else {
        g.fillStyle(0x795b40).fillRect(x - 7, y - 4, 4, 8).fillRect(x + 3, y - 4, 4, 8).fillRect(x - 4, y - 2, 8, 4);
        g.fillStyle(0xf4edda).fillRect(x - 6, y - 3, 2, 6).fillRect(x + 4, y - 3, 2, 6).fillRect(x - 4, y - 1, 8, 2);
    }
}
