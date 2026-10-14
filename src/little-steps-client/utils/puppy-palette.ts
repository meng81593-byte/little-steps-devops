import Phaser from 'phaser';
import { ColorId, AccessoryId, ClothId } from '../cosmetics';

// Replace fur colors only; ink outline, eyes, nose and collar stay intact.
const PALETTES: Record<ColorId, [number[], number[]]> = {
    default: [[255, 248, 153], [247, 142, 86]],
    golden: [[231, 187, 83], [175, 111, 50]],
    brown: [[185, 137, 94], [126, 80, 51]],
    snow: [[237, 238, 227], [179, 187, 176]],
    blue: [[219, 196, 155], [166, 129, 86]],
};

export function applyPuppyPalette(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, requested: ColorId, accessory: AccessoryId = 'none', cloth: ClothId = 'none'): void {
    const id = PALETTES[requested] ? requested : 'default';
    const look = `${id}-${accessory}-${cloth}`;
    const key = `puppy-look-${look}`;
    if (!scene.textures.exists(key)) {
        const source = scene.textures.get('puppy_run').getSourceImage() as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.width = source.width; canvas.height = source.height;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(source, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
            if (!pixels.data[i + 3]) continue;
            const fur = pixels.data[i] === 255 && pixels.data[i + 1] === 248 && pixels.data[i + 2] === 153;
            const shade = pixels.data[i] === 247 && pixels.data[i + 1] === 142 && pixels.data[i + 2] === 86;
            if (fur || shade) pixels.data.set(PALETTES[id][fur ? 0 : 1], i);
        }
        // Clothes are painted through the original fur mask on every frame.
        // This preserves moving arms, black outlines, legs, muzzle and tail.
        const original = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let frame = 0; frame < 4; frame++) {
            for (let y = 30; y < 50; y++) for (let x = 13; x < 49; x++) {
                const i = (y * canvas.width + frame * 64 + x) * 4;
                const isFur = (original[i] === 255 && original[i + 1] === 248 && original[i + 2] === 153) || (original[i] === 247 && original[i + 1] === 142 && original[i + 2] === 86);
                if (!isFur || !original[i + 3]) continue;
                const torso = x >= 25 && x <= 38;
                let rgb: number[] | undefined;
                if (cloth === 'vest' && torso && y <= 48) {
                    rgb = x < 32 ? [157, 70, 58] : [188, 89, 65];
                    if (y < 35 && (x < 29 || x > 34)) rgb = [235, 217, 175];
                    if (x === 32 && y > 34) rgb = [97, 58, 41];
                    if (x === 33 && [37, 42, 47].includes(y)) rgb = [234, 197, 119];
                    if (y >= 43 && ((x >= 26 && x <= 29) || (x >= 35 && x <= 37))) rgb = [119, 57, 45];
                } else if (cloth === 'sweater' && (torso || y <= 40)) {
                    rgb = y % 8 < 3 ? [218, 217, 190] : [79, 111, 107];
                    if (y < 33 || y > 47) rgb = [55, 83, 77];
                } else if (cloth === 'cape' && torso && y < 34) rgb = [73, 106, 140];
                if (rgb) pixels.data.set(rgb, i);
            }
        }
        ctx.putImageData(pixels, 0, 0);
        for (let frame = 0; frame < 4; frame++) {
            ctx.save(); ctx.translate(frame * 64, 0);
            const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
            const sway = [0, 1, 0, -1][frame];
            if (cloth === 'cape') {
                // Render behind the puppy, with a small frame-dependent hem flutter.
                ctx.globalCompositeOperation = 'destination-over';
                rect('#354b63', 21 + sway, 32, 22, 17); rect('#354b63', 19 + sway, 42, 26, 8);
                rect('#607e99', 22 + sway, 34, 19, 15); rect('#8299ad', 22 + sway, 35, 3, 10);
                ctx.globalCompositeOperation = 'source-over'; rect('#dcc38a', 31, 31, 3, 3);
            } else if (cloth === 'scarf') {
                rect('#7d453b', 25, 28, 14, 4); rect('#bd7756', 26, 28, 12, 2);
                rect('#7d453b', 35 + sway, 31, 4, 12); rect('#d2ad72', 35 + sway, 38, 4, 2);
                rect('#7d453b', 35 + sway, 44, 1, 2); rect('#7d453b', 38 + sway, 44, 1, 2);
            }
            // Accessories use native sprite pixels, so their transform is inseparable
            // from the puppy's animation, flip, scale, movement and victory bounce.
            if (accessory === 'bow') {
                rect('#8c4860', 26, 5, 5, 4); rect('#8c4860', 34, 5, 5, 4);
                rect('#d98ca0', 27, 5, 3, 3); rect('#d98ca0', 35, 5, 3, 3);
                rect('#b76580', 31, 6, 3, 3); rect('#f0b5bd', 32, 6, 1, 1);
            } else if (accessory === 'crown') {
                rect('#805c32', 26, 5, 13, 4); rect('#dbb765', 27, 5, 11, 3);
                for (const x of [27, 32, 37]) { rect('#805c32', x, 2, 2, 4); rect('#dbb765', x, 3, 1, 3); }
                rect('#a96759', 32, 6, 2, 1);
            } else if (accessory === 'glasses') {
                rect('#49392e', 25, 19, 6, 5); rect('#49392e', 34, 19, 6, 5); rect('#49392e', 31, 20, 3, 1);
                rect('#9cb8b3', 26, 20, 4, 3); rect('#9cb8b3', 35, 20, 4, 3);
                rect('#e1ece0', 26, 20, 1, 1); rect('#e1ece0', 35, 20, 1, 1);
            } else if (accessory === 'star') {
                rect('#866638', 38, 10, 5, 5); rect('#d7b96e', 37, 12, 7, 1);
                rect('#d7b96e', 40, 9, 1, 7); rect('#f1d89c', 39, 11, 3, 3);
            }
            ctx.restore();
        }
        const texture = scene.textures.addCanvas(key, canvas)!;
        for (let i = 0; i < 4; i++) texture.add(i, 0, i * 64, 0, 64, 64);
        texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        texture.refresh();
    }
    for (const action of ['walk', 'idle']) {
        const animKey = `puppy-${action}-${look}`;
        if (!scene.anims.exists(animKey)) scene.anims.create({
            key: animKey, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: action === 'walk' ? 3 : 0 }),
            frameRate: 9, repeat: action === 'walk' ? -1 : 0,
        });
    }
    const frame = Number(sprite.frame.name) || 0;
    sprite.stop().clearTint().setTexture(key, frame).setData('coat', id).setData('look', look);
}
