import type {DomEffect} from "../effects";
import {assertObject} from "../../util/assertions";

type FrameData = { row: number, durationMs: number };
type SpriteAnimationEffectData = {
    url: string;
    frameWidth: number;
    frameHeight: number;
    frames: FrameData[];
    durationMs: number;
};

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): HTMLImageElement {
    const existing = imageCache.get(url);
    if (existing) return existing;
    const img = new Image();
    img.src = url;
    imageCache.set(url, img);
    return img;
}

function resolveColor(element: Element): string | null {
    let current: Element | null = element;
    while (current !== null) {
        const color = (current as HTMLElement).style?.color;
        if (color) return color;
        current = current.parentElement;
    }
    return null;
}

class SpriteAnimationDomEffectImpl implements SpriteAnimationDomEffect {

    apply(element: Element, data: SpriteAnimationEffectData): void {
        const { frameWidth, frameHeight, frames, durationMs } = data;
        const sheet = loadImage(data.url);
        const tint = resolveColor(element);

        const canvas = document.createElement("canvas");
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.imageRendering = "pixelated";
        canvas.style.display = "block";
        (element as HTMLElement).appendChild(canvas);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const boundaries: number[] = [0];
        let sum = 0;
        for (const f of frames) { sum += f.durationMs; boundaries.push(sum); }

        const draw = (elapsed: number) => {
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
            ctx.drawImage(sheet, 0, rowA * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

            ctx.globalAlpha = progress;
            ctx.drawImage(sheet, 0, rowB * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

            ctx.globalAlpha = 1;

            if (tint !== null) {
                // Same multiply + destination-in recipe used for player heads and static
                // sprite tinting — re-applies the composited image's own alpha as a mask
                // so tinting a torch/leaf doesn't paint a solid colored square.
                ctx.globalCompositeOperation = "multiply";
                ctx.fillStyle = tint;
                ctx.fillRect(0, 0, frameWidth, frameHeight);
                ctx.globalCompositeOperation = "destination-in";
                ctx.drawImage(canvas, 0, 0);
                ctx.globalCompositeOperation = "source-over";
            }
        };

        let start: number | null = null;
        const tick = (ts: number) => {
            if (start === null) start = ts;
            draw(ts - start);
            requestAnimationFrame(tick);
        };

        if (sheet.complete) {
            requestAnimationFrame(tick);
        } else {
            sheet.addEventListener("load", () => requestAnimationFrame(tick), { once: true });
        }
        // Never cancelled. Same acceptable simplification already used for tint blob URLs
        // and fetched textures elsewhere in this codebase. Revisit only if this tool ever
        // sees heavy element churn (long-lived pages creating/destroying many sprites).
    }

    serialize(data: SpriteAnimationEffectData): string {
        return JSON.stringify(data);
    }

    deserialize(value: string): SpriteAnimationEffectData {
        const parsed = JSON.parse(value) as unknown;
        assertObject(parsed);
        return parsed as SpriteAnimationEffectData;
    }

}

export type SpriteAnimationDomEffect = DomEffect<SpriteAnimationEffectData>;
export namespace SpriteAnimationDomEffect {
    export const TOKEN = "sprite-interp";
    export const INSTANCE: SpriteAnimationDomEffect = new SpriteAnimationDomEffectImpl();
}