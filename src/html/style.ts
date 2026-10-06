import {StringBuilder} from "../util/string";
import {TriState} from "../util/triState";
import {Character} from "../util/char";
import type {SpriteAnimation} from "../resourcePacks";

//

export type HtmlStyleStore = {
    underline: boolean,
    strikethrough: boolean,
    color: string | null
};

export const HtmlStyleStore = Object.freeze({
    get EMPTY(): HtmlStyleStore {
        return { underline: false, strikethrough: false, color: null };
    }
});

export interface HtmlStyle {

    applyToStore(store: HtmlStyleStore): void;

    applyToDocument(style: CSSStyleDeclaration, parent: HtmlStyleStore): void;

    applyToInlineSource(source: StringBuilder, parent: HtmlStyleStore): void;

}

/** @internal */
class BasicHtmlStyle<K extends keyof CSSStyleDeclaration, V extends CSSStyleDeclaration[K]> implements HtmlStyle {

    constructor(
        readonly documentKey: K,
        readonly sourceKey: string,
        readonly value: V
    ) { }

    //

    applyToStore(): void { }

    applyToDocument(style: CSSStyleDeclaration): void {
        style[this.documentKey] = this.value;
    }

    applyToInlineSource(source: StringBuilder): void {
        if (!source.isEmpty()) source.appendChar(Character.SPACE);
        source.appendString(this.sourceKey)
            .appendString(": ")
            .append(this.value)
            .appendChar(Character.SEMICOLON);
    }

}

/** @internal */
class DecorationHtmlStyle implements HtmlStyle {

    constructor(
        readonly underline: TriState,
        readonly strikethrough: TriState
    ) { }

    //

    applyToStore(store: HtmlStyleStore) {
        if (this.underline === TriState.TRUE) store.underline = true;
        if (this.strikethrough === TriState.TRUE) store.strikethrough = true;
    }

    applyToDocument(style: CSSStyleDeclaration, parent: HtmlStyleStore) {
        style.textDecoration = this._computeValue(parent);
    }

    applyToInlineSource(source: StringBuilder, parent: HtmlStyleStore) {
        if (!source.isEmpty()) source.appendChar(Character.SPACE);
        source.appendString("text-decoration: ")
            .appendString(this._computeValue(parent))
            .appendChar(Character.SEMICOLON);
    }

    private _computeValue(parent: HtmlStyleStore): string {
        let decorations: string[] = [];

        if (this.underline === TriState.TRUE || (this.underline !== TriState.FALSE && parent.underline))
            decorations.push("underline");

        if (this.strikethrough === TriState.TRUE || (this.strikethrough !== TriState.FALSE && parent.strikethrough))
            decorations.push("line-through");

        if (decorations.length === 0) return "none";
        return decorations.join(" ");
    }

}

/** @internal */
class MultiHtmlStyle implements HtmlStyle {

    constructor(
        private readonly _entries: readonly (readonly [keyof CSSStyleDeclaration, string, string])[]
    ) { }

    //

    applyToStore(): void { }

    applyToDocument(style: CSSStyleDeclaration): void {
        for (const [documentKey, , value] of this._entries) {
            // @ts-ignore - keys are restricted to string-valued CSS properties by construction
            style[documentKey] = value;
        }
    }

    applyToInlineSource(source: StringBuilder): void {
        for (const [, sourceKey, value] of this._entries) {
            if (!source.isEmpty()) source.appendChar(Character.SPACE);
            source.appendString(sourceKey)
                .appendString(": ")
                .appendString(value)
                .appendChar(Character.SEMICOLON);
        }
    }

}

//

/** @internal */
class ColorHtmlStyle implements HtmlStyle {

    constructor(private readonly _value: string) { }

    applyToStore(store: HtmlStyleStore): void {
        store.color = this._value;
    }

    applyToDocument(style: CSSStyleDeclaration): void {
        style.color = this._value;
    }

    applyToInlineSource(source: StringBuilder): void {
        if (!source.isEmpty()) source.appendChar(Character.SPACE);
        source.appendString("color: ").appendString(this._value).appendChar(Character.SEMICOLON);
    }

}

/** @internal */
function keyframesCacheKey(animation: SpriteAnimation): string {
    return JSON.stringify({
        r: animation.totalRows,
        f: animation.frames.map((f) => [f.row, f.durationMs])
    });
}

/** @internal */
function buildKeyframesCss(name: string, animation: SpriteAnimation): string {
    const { frames, totalRows, durationMs } = animation;
    const yFor = (row: number) => (totalRows > 1 ? (row / (totalRows - 1)) * 100 : 0);

    let cumulativeMs = 0;
    const stops: string[] = [];

    for (const frame of frames) {
        const percent = durationMs > 0 ? (cumulativeMs / durationMs) * 100 : 0;
        // steps(1, jump-end) on each stop holds THIS frame's value for the whole segment,
        // then jumps instantly to the next stop's value — a hard cut, not a slide/blend.
        stops.push(
            `${percent.toFixed(4)}% { background-position-y: ${yFor(frame.row).toFixed(4)}%; ` +
            `animation-timing-function: steps(1, jump-end); }`
        );
        cumulativeMs += frame.durationMs;
    }
    // Closing stop completes the loop back to frame 0's position
    stops.push(`100% { background-position-y: ${yFor(frames[0].row).toFixed(4)}%; }`);

    return `@keyframes ${name} { ${stops.join(" ")} }`;
}

/** @internal */
let _keyframeNameCache = new Map<string, string>();
/** @internal */
let _injectedKeyframeNames = new Set<string>();
/** @internal */
let _keyframeCounter = 0;

/** @internal */
function ensureAnimationKeyframes(animation: SpriteAnimation): string {
    const cacheKey = keyframesCacheKey(animation);

    let name = _keyframeNameCache.get(cacheKey);
    if (!name) {
        name = `mm-sprite-anim-${_keyframeCounter++}`;
        _keyframeNameCache.set(cacheKey, name);
    }

    // Only meaningful in a real DOM — a string-rendered page has nowhere to inject this,
    // so animated sprites there fall back to a static frame-0 position (see below).
    if (typeof document !== "undefined" && !_injectedKeyframeNames.has(name)) {
        _injectedKeyframeNames.add(name);
        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-mm-sprite-keyframes", name);
        styleEl.textContent = buildKeyframesCss(name, animation);
        document.head.appendChild(styleEl);
    }

    return name;
}

/** @internal */
class SpriteHtmlStyle implements HtmlStyle {

    constructor(
        private readonly _url: string,
        private readonly _animation: SpriteAnimation | null
    ) { }

    applyToStore(): void { }

    applyToDocument(style: CSSStyleDeclaration): void {
        const keyframesName = this._animation ? ensureAnimationKeyframes(this._animation) : null;
        this._apply((prop, value) => style.setProperty(prop, value), keyframesName);
    }

    applyToInlineSource(source: StringBuilder): void {
        // No DOM to inject into — animated sprites render as a static first frame here
        const keyframesName = this._animation ? ensureAnimationKeyframes(this._animation) : null;
        this._apply((prop, value) => {
            if (!source.isEmpty()) source.appendChar(Character.SPACE);
            source.appendString(prop).appendString(": ").appendString(value).appendChar(Character.SEMICOLON);
        }, keyframesName);
    }

    private _apply(set: (prop: string, value: string) => void, keyframesName: string | null): void {
        const safeUrl = this._url.replace(/"/g, "%22");

        set("display", "inline-block");
        set("vertical-align", "-0.2em");
        set("width", "1em");
        set("height", "1em");
        set("image-rendering", "pixelated");
        set("background-image", `url("${safeUrl}")`);
        set("background-repeat", "no-repeat");
        set("background-position", "center");

        if (this._animation) {
            const { totalRows, frames, durationMs } = this._animation;
            const firstY = totalRows > 1 ? (frames[0].row / (totalRows - 1)) * 100 : 0;

            set("background-size", `100% ${totalRows * 100}%`);
            // Static fallback: shows frame 0 correctly even if keyframes never get injected
            // (e.g. string-only rendering). The `animation` declaration below overrides this
            // dynamically whenever the keyframes actually exist.
            set("background-position-y", `${firstY}%`);
            if (keyframesName) {
                set("animation", `${keyframesName} ${durationMs}ms steps(1, jump-end) infinite`);
            }
        } else {
            set("background-size", "cover");
        }
    }

}

export namespace HtmlStyle {

    type FontWeight = "normal" | "bold";
    type FontStyle = "normal" | "italic";

    const DEFAULT_SHADOW_OFFSET = "0.10714286em";

    //

    export function textDecoration(
        underline: TriState,
        strikethrough: TriState
    ): HtmlStyle {
        return new DecorationHtmlStyle(underline, strikethrough);
    }

    export function fontWeight(weight: FontWeight): HtmlStyle {
        return new BasicHtmlStyle("fontWeight", "font-weight", weight);
    }

    export function fontStyle(style: FontStyle): HtmlStyle {
        return new BasicHtmlStyle("fontStyle", "font-style", style);
    }

    export function color(color: string): HtmlStyle {
        return new ColorHtmlStyle(color);
    }

    export function textShadow(
        color: string,
        xOffset: string = DEFAULT_SHADOW_OFFSET,
        yOffset: string = DEFAULT_SHADOW_OFFSET
    ): HtmlStyle {
        return new BasicHtmlStyle("textShadow", "text-shadow", `${xOffset} ${yOffset} ${color}`);
    }

    const MISSING_SPRITE_DATA_URL =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAC4jAAAuIwF4pT92AAAAMUlEQVQ4T2NkYGD4D8Q4wQ+GH/ikGZjwyhIhOWoAwyAIRBZC8czBwDGaDggk52GQlAH5FQURrYyjQgAAAABJRU5ErkJggg==";

    export function sprite(url: string, animation: SpriteAnimation | null = null): HtmlStyle {
        return new SpriteHtmlStyle(url, animation);
    }

    export function missingSprite(): HtmlStyle {
        return new SpriteHtmlStyle(MISSING_SPRITE_DATA_URL, null);
    }

    /**
     * Shared `@keyframes` powering all animated sprites (see SpriteHtmlStyle). Injected
     * automatically into `document.head` on first use when rendering to a live DOM. If you
     * only ever render to a string yourself, include this once in your page's own CSS.
     */
    export const SPRITE_ANIMATION_CSS =
        "@keyframes mm-sprite-cycle { from { background-position-y: 0%; } to { background-position-y: 100%; } }";

    let _spriteKeyframesInjected = false;

    /** @internal */
    export function ensureSpriteKeyframesInjected(): void {
        if (_spriteKeyframesInjected) return;
        if (typeof document === "undefined") return;
        _spriteKeyframesInjected = true;

        const style = document.createElement("style");
        style.setAttribute("data-mm-sprite-keyframes", "");
        style.textContent = SPRITE_ANIMATION_CSS;
        document.head.appendChild(style);
    }

    export function spriteContainer(): HtmlStyle {
        return new MultiHtmlStyle([
            ["display", "display", "inline-block"],
            ["verticalAlign", "vertical-align", "-0.2em"],
            ["width", "width", "1em"],
            ["height", "height", "1em"]
        ]);
    }

}
