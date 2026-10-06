import type {DomEffect} from "../effects";
import {assertObject} from "../../util/assertions";

//

type SpriteTintData = { url: string };

class SpriteTintDomEffectImpl implements SpriteTintDomEffect {

    apply(element: Element, data: SpriteTintData): void {
        const tint = this._resolveColor(element);
        if (tint === null) return;

        const img = new Image();
        img.crossOrigin = "anonymous"; // harmless for same-origin blob: URLs, required by some engines regardless
        img.addEventListener("load", () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            ctx.drawImage(img, 0, 0);

            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = tint;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Re-apply the original alpha so transparent pixels stay transparent
            // instead of becoming a solid tinted rectangle
            ctx.globalCompositeOperation = "destination-in";
            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) return;
                const tintedUrl = URL.createObjectURL(blob);
                (element as HTMLElement).style.backgroundImage = `url("${tintedUrl}")`;
                // Intentionally not revoked — the element keeps referencing this URL for
                // as long as it's displayed. Acceptable for a client-side preview tool;
                // revisit if this is ever used in a long-lived, high-churn DOM.
            });
        });
        img.src = data.url;
    }

    serialize(data: SpriteTintData): string {
        return JSON.stringify(data);
    }

    deserialize(value: string): SpriteTintData {
        const parsed = JSON.parse(value) as unknown;
        assertObject(parsed);
        return parsed as SpriteTintData;
    }

    private _resolveColor(element: Element): string | null {
        let current: Element | null = element;
        while (current !== null) {
            const color = (current as HTMLElement).style?.color;
            if (color) return color;
            current = current.parentElement;
        }
        return null;
    }

}

export type SpriteTintDomEffect = DomEffect<SpriteTintData>;

export namespace SpriteTintDomEffect {
    export const TOKEN = "sprite-tint";
    export const INSTANCE: SpriteTintDomEffect = new SpriteTintDomEffectImpl();
}