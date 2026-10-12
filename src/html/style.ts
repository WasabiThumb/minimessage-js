import {StringBuilder} from "../util/string";
import {TriState} from "../util/triState";
import {Character} from "../util/char";

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

//

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

//

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

    export function spriteContainer(): HtmlStyle {
        return new MultiHtmlStyle([
            ["display", "display", "inline-block"],
            ["verticalAlign", "vertical-align", "-0.2em"],
            ["width", "width", "1em"],
            ["height", "height", "1em"]
        ]);
    }

}
