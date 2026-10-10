import {type DomEffect} from "../effects";
import {type MiniMessage} from "../../mini";
import {Key} from "../../key";
import {ResourcePacks} from "../../resourcePacks";

//

const paintMissing = ((canvas: HTMLCanvasElement) => {
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = `#000`;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = `#f800f8`;
    ctx.fillRect(8, 0, 8, 8);
    ctx.fillRect(0, 8, 8, 8);
    return;
});

const paintTint = ((
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    tint: string,
    w: number,
    h: number
) => {
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = "source-over";
});

const paint = (async (canvas: HTMLCanvasElement, sprite: ResourcePacks.Sprite) => {
    // Determine the tint
    const tint = window.getComputedStyle(canvas).color;
    const hasTint = `rgb(255, 255, 255)` !== tint; // both firefox and chrome seem to work this way

    // Read the animation data
    const result = await sprite.use(async (i) => {
        const { url, blob, width, height, animation } = i;
        if (!animation) {
            // Exit early if there is no animation
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            const image = new Image();
            await new Promise<void>((resolve, reject) => {
                const abort = new AbortController();
                image.addEventListener("load", () => {
                    abort.abort();
                    resolve();
                }, { once: true, signal: abort.signal });
                image.addEventListener("error", () => {
                    abort.abort();
                    reject();
                }, { once: true, signal: abort.signal });
                image.src = url;
            });
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(image, 0, 0);
            if (hasTint) paintTint(canvas, ctx, tint, width, height);
            return null;
        }
        // Read the Blob into an ImageBitmap, which unlike an object URL can get collected
        const bitmap = await createImageBitmap(blob);
        return { bitmap, width, height, animation };
    });
    if (!result) return;
    const { bitmap, animation } = result;

    // Determine canvas size, create context
    const { frameWidth, frameHeight, frames, durationMs } = animation;
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    if (frameWidth === 0 || frameHeight === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw stuff
    const boundaries: number[] = [0];
    let sum = 0;
    for (const f of frames) { sum += f.durationMs; boundaries.push(sum); }

    const draw = ((elapsed: number) => {
        const t = elapsed % durationMs;

        let i = 0;
        while (i < frames.length - 1 && t >= boundaries[i + 1]) i++;

        const segmentLen = frames[i].durationMs;
        const progress = segmentLen > 0 ? (t - boundaries[i]) / segmentLen : 0;

        const rowA = frames[i].row;
        const rowB = frames[(i + 1) % frames.length].row;

        ctx.clearRect(0, 0, frameWidth, frameHeight);
        ctx.globalCompositeOperation = "source-over";

        ctx.globalAlpha = 1;
        ctx.drawImage(bitmap, 0, rowA * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

        ctx.globalAlpha = progress;
        ctx.drawImage(bitmap, 0, rowB * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

        ctx.globalAlpha = 1;
        if (hasTint) paintTint(canvas, ctx, tint, frameWidth, frameHeight);
    });

    let start: number | null = null;
    const tick = ((ts: number) => {
        if (start === null) start = ts;
        draw(ts - start);
        window.requestAnimationFrame(tick);
    });
    window.requestAnimationFrame(tick);
});

//

type SpriteDomEffectData = {
    sprite: string,
    atlas?: string
};

class SpriteDomEffectImpl implements SpriteDomEffect {

    apply(element: Element, data: SpriteDomEffectData, instance: MiniMessage) {
        // Create the canvas to receive the sprite
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.imageRendering = "pixelated";
        canvas.style.display = "block";
        (element as HTMLElement).appendChild(canvas);

        // Find the sprite in resource packs
        const resourcePacks = instance.resourcePacks();
        const sprite = resourcePacks.sprite(
            Key.key(data.sprite),
            data.atlas ? Key.key(data.atlas) : null
        );

        // If the sprite isn't found, draw the "missing sprite" image and wash our hands of it
        if (!sprite) {
            paintMissing(canvas);
            return;
        }

        // Do everything else asynchronously
        paint(canvas, sprite)
            .catch((e) => {
                console.warn(e);
                paintMissing(canvas);
            });
    }

    serialize(data: SpriteDomEffectData): string {
        if (data.atlas) return `${data.atlas};${data.sprite}`;
        return data.sprite;
    }

    deserialize(data: string): SpriteDomEffectData {
        const idx = data.indexOf(';');
        if (idx === -1) return { sprite: data };
        return {
            atlas: data.substring(0, idx),
            sprite: data.substring(idx + 1)
        };
    }

}

//

export type SpriteDomEffect = DomEffect<SpriteDomEffectData>;

export namespace SpriteDomEffect {
    export const TOKEN = "sprite";
    export const INSTANCE: SpriteDomEffect = new SpriteDomEffectImpl();
}
