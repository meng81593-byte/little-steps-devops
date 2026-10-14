import Phaser from 'phaser';

/** Visual-only theme. Does not affect gameplay, IDs, or event names. */
export const UI = {
    panel: 0x2C2C2C,
    panelAlpha: 0.8,
    header: 0x3A3A3A,
    row: 0x3A3A3A,
    rowLocked: 0x252525,
    hover: 0x4A4A4A,
    btn: 0x3D3D3D,
    text: '#F8F8F2',
    accent: '#FFB86C',
    muted: '#C8C8C0',
    radius: 8,
};

export function lighten(color: number, amount = 18): number {
    const c = Phaser.Display.Color.IntegerToColor(color);
    c.brighten(amount);
    return c.color;
}

/** Deep-gray glass panel with a soft white glow instead of a hard yellow border. */
export function drawGlassPanel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    radius = 12,
): void {
    g.clear();
    g.fillStyle(0xffffff, 0.10);
    g.fillRoundedRect(x - 4, y - 4, w + 8, h + 8, radius + 4);
    g.fillStyle(0xffffff, 0.06);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, radius + 2);
    g.fillStyle(UI.panel, UI.panelAlpha);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, 0xffffff, 0.22);
    g.strokeRoundedRect(x, y, w, h, radius);
}

export function drawRoundedRect(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: number,
    radius = UI.radius,
    alpha = 1,
): void {
    g.clear();
    g.fillStyle(0xffffff, 0.10);
    g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, radius + 1);
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(x, y, w, h, radius);
}

/**
 * Hover brighten (200ms) + press scale 0.95. Extra listeners only — existing
 * pointerdown game handlers stay attached by the caller.
 */
export function bindButtonMotion(
    scene: Phaser.Scene,
    targets: Phaser.GameObjects.GameObject[],
    onHover?: () => void,
    onOut?: () => void,
): void {
    const hit = targets[0] as Phaser.GameObjects.GameObject & {
        on: (ev: string, cb: () => void) => void;
    };
    hit.on('pointerover', () => {
        onHover?.();
        scene.tweens.killTweensOf(targets);
        scene.tweens.add({ targets, scale: 1.03, duration: 200, ease: 'Sine.easeOut' });
    });
    hit.on('pointerout', () => {
        onOut?.();
        scene.tweens.killTweensOf(targets);
        scene.tweens.add({ targets, scale: 1, duration: 200, ease: 'Sine.easeOut' });
    });
    hit.on('pointerdown', () => {
        scene.tweens.killTweensOf(targets);
        scene.tweens.add({ targets, scale: 0.95, duration: 80, ease: 'Sine.easeOut' });
    });
    hit.on('pointerup', () => {
        scene.tweens.killTweensOf(targets);
        scene.tweens.add({ targets, scale: 1.03, duration: 120, ease: 'Sine.easeOut' });
    });
}

export function makeRoundedButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fill = UI.btn,
    textColor = UI.text,
    fontSize = '15px',
): { gfx: Phaser.GameObjects.Graphics; hit: Phaser.GameObjects.Rectangle; txt: Phaser.GameObjects.Text } {
    const gfx = scene.add.graphics();
    const draw = (color: number) => drawRoundedRect(gfx, x - w / 2, y - h / 2, w, h, color, UI.radius);
    draw(fill);
    const hit = scene.add.rectangle(x, y, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    const txt = scene.add.text(x, y, label, {
        fontSize,
        fontStyle: 'bold',
        color: textColor,
    }).setOrigin(0.5);
    bindButtonMotion(scene, [hit, txt], () => draw(lighten(fill)), () => draw(fill));
    return { gfx, hit, txt };
}
