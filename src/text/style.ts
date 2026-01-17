import {TextColor} from "./style/textColor";
import {ShadowColor} from "./style/shadowColor";
import {DecorationMap, TextDecoration} from "./style/decoration";
import {ClickEvent} from "./style/clickEvent";
import {HoverEvent} from "./style/hoverEvent";
import {defineAccessor, defineContextualAccessor} from "../util/accessor";
import {Key, KeyLike} from "../key";

//

export * from "./style/textColor";
export * from "./style/shadowColor";
export * from "./style/decoration";
export * from "./style/clickEvent";
export * from "./style/hoverEvent";

//

export interface Style {
    font(): Key | null;
    color(): TextColor | null;
    shadowColor(): ShadowColor | null;
    decoration(decoration: TextDecoration): TextDecoration.State;
    decorations(): Record<TextDecoration, TextDecoration.State>;
    hasDecoration(decoration: TextDecoration): boolean;
    clickEvent(): ClickEvent<any> | null;
    hoverEvent(): HoverEvent<any> | null;
    insertion(): string | null;

    font(font: KeyLike | null): Style;
    color(color: TextColor | null): Style;
    colorIfAbsent(color: TextColor | null): Style;
    shadowColor(shadowColor: ShadowColor | null): Style;
    shadowColorIfAbsent(shadowColor: ShadowColor | null): Style;
    decoration(decoration: TextDecoration, state: boolean | TextDecoration.State): Style;
    decorationIfAbsent(decoration: TextDecoration, state: boolean | TextDecoration.State): Style;
    decorations(decorations: Partial<Record<TextDecoration, TextDecoration.State>>): Style;
    decorate(...decorations: TextDecoration[]): Style;
    clickEvent(event: ClickEvent<any> | null): Style;
    hoverEvent(event: HoverEvent<any> | null): Style;
    insertion(insertion: string | null): Style;

    isEmpty(): boolean;
    merge(source: Style): Style;
    unmerge(that: Style): Style;
    toString(): string;
}

/** @internal */
type StyleInit = {
    font: Key | null,
    color: TextColor | null,
    shadowColor: ShadowColor | null,
    decorations: DecorationMap,
    clickEvent: ClickEvent<any> | null,
    hoverEvent: HoverEvent<any> | null,
    insertion: string | null
};

/** @internal */
const EMPTY_STYLE_INIT: StyleInit = Object.freeze({
    font: null,
    color: null,
    shadowColor: null,
    decorations: new DecorationMap(),
    clickEvent: null,
    hoverEvent: null,
    insertion: null
});

/** @internal */
class StyleImpl implements Style {

    private readonly _init: StyleInit;

    constructor(init: StyleInit) {
        this._init = init;
    }

    //

    font = defineAccessor<Key | null, KeyLike | null>(
        () => this._get("font"),
        (font) => this._with({ font: font === null ? null : Key.key(font) })
    );

    color = defineAccessor<TextColor | null>(
        () => this._get("color"),
        (color) => this._with({ color })
    );

    colorIfAbsent(color: TextColor | null) {
        return this._with({ color }, true);
    }

    shadowColor = defineAccessor<ShadowColor | null>(
        () => this._get("shadowColor"),
        (shadowColor) => this._with({ shadowColor })
    );

    shadowColorIfAbsent(shadowColor: ShadowColor | null): Style {
        return this._with({ shadowColor }, true);
    }

    decoration = defineContextualAccessor<TextDecoration, TextDecoration.State, TextDecoration.State | boolean>(
        (decoration) => this._get("decorations").get(decoration),
        (decoration, state) => {
            if (typeof state !== "string") {
                // noinspection PointlessBooleanExpressionJS
                state = TextDecoration.State.fromBoolean(!!state);
            }
            return this._with({ decorations: this._get("decorations").with(decoration, state) });
        }
    );

    decorationIfAbsent(decoration: TextDecoration, state: boolean | TextDecoration.State): Style {
        let decorations = this._get("decorations");
        if (decorations.get(decoration) !== "not_set") return this;

        let parsed: TextDecoration.State;
        if (typeof state === "boolean") {
            parsed = TextDecoration.State.fromBoolean(state);
        } else {
            parsed = state;
        }
        decorations = decorations.with(decoration, parsed);

        return this._with({ decorations });
    }

    decorations = defineAccessor<Record<TextDecoration, TextDecoration.State>, Partial<Record<TextDecoration, TextDecoration.State>>>(
        () => this._get("decorations").toObject(),
        (value) => {
            let map = this._get("decorations");
            for (const key of Object.keys(value)) {
                const decoration = key as unknown as TextDecoration;
                map = map.with(decoration, value[decoration]!);
            }
            return this._with({ decorations: map });
        }
    );

    decorate(...decorations: TextDecoration[]): Style {
        let map = this._get("decorations");
        for (const decoration of decorations) map = map.with(decoration, TextDecoration.State.TRUE);
        return this._with({ decorations: map });
    }

    hasDecoration(decoration: TextDecoration): boolean {
        return this._get("decorations").get(decoration) === TextDecoration.State.TRUE;
    }

    clickEvent = defineAccessor<ClickEvent<any> | null>(
        () => this._get("clickEvent"),
        (clickEvent) => this._with({ clickEvent })
    );

    hoverEvent = defineAccessor<HoverEvent<any> | null>(
        () => this._get("hoverEvent"),
        (hoverEvent) => this._with({ hoverEvent })
    );

    insertion = defineAccessor<string | null>(
        () => this._get("insertion"),
        (insertion) => this._with({ insertion })
    );

    isEmpty(): boolean {
        if (this._get("font") !== null) return false;
        if (this._get("color") !== null) return false;
        if (this._get("shadowColor") !== null) return false;
        if (this._get("clickEvent") !== null) return false;
        if (this._get("hoverEvent") !== null) return false;
        if (this._get("insertion") !== null) return false;
        return this._get("decorations").isEmpty();
    }

    merge(source: Style): Style {
        if (this.isEmpty()) return source;
        let newInit = { ...this._init };

        function apply<K extends keyof StyleInit>(
            key: K,
            value: StyleInit[K]
        ) {
            if (newInit[key] !== null) return;
            newInit[key] = value;
        }

        apply("font", source.font());
        apply("color", source.color());
        apply("shadowColor", source.shadowColor());
        apply("insertion", source.insertion());
        apply("clickEvent", source.clickEvent());
        apply("hoverEvent", source.hoverEvent());

        for (const decoration of TextDecoration.values()) {
            if (newInit.decorations.get(decoration) !== TextDecoration.State.NOT_SET) continue;
            newInit.decorations = newInit.decorations.with(decoration, source.decoration(decoration));
        }

        return new StyleImpl(newInit);
    }

    unmerge(that: Style): Style {
        if (this.isEmpty()) return this;
        let newInit = { ...this._init };

        const check = (<K extends keyof StyleInit>(
            k: K,
            b: StyleInit[K],
            predicate: (a: Exclude<StyleInit[K], null>, b: Exclude<StyleInit[K], null>) => boolean
        ): void => {
            const a = this._init[k];
            if (a === null || b === null) return;
            // @ts-ignore
            if (predicate(a, b)) newInit[k] = null;
        });

        check(`font`, that.font(), (a, b) => Key.equals(a, b));
        check(`color`, that.color(), (a, b) => a.value() === b.value());
        check(`shadowColor`, that.shadowColor(), (a, b) => a.value() === b.value());
        check(`insertion`, that.insertion(), (a, b) => a === b);

        // TODO: try to properly unmerge click events and hover events
        check(`clickEvent`, that.clickEvent(), (a, b) => a === b);
        check(`hoverEvent`, that.hoverEvent(), (a, b) => a === b);

        for (const decoration of TextDecoration.values()) {
            if (this._init.decorations.get(decoration) === that.decoration(decoration)) {
                newInit.decorations = newInit.decorations.with(decoration, TextDecoration.State.NOT_SET);
            }
        }

        return new StyleImpl(newInit);
    }

    //

    private _get<K extends keyof StyleInit>(key: K): StyleInit[K] {
        return this._init[key];
    }

    private _with(modifications: Partial<StyleInit>, onlyIfAbsent?: boolean): StyleImpl {
        let newInit: StyleInit = { ...this._init };
        if (onlyIfAbsent) {
            for (const key of Object.keys(modifications)) {
                const currentValue = this._init[key as unknown as keyof StyleInit];
                if (null !== currentValue) continue;
                // @ts-ignore
                newInit[key] = modifications[key];
            }
        } else {
            Object.assign(newInit, modifications);
        }
        return new StyleImpl(newInit);
    }

}

export namespace Style {

    export function equals(a: Style, b: Style): boolean {
        if (a === b) return true;
        if (!Key.equals(a.font(), b.font())) return false;
        if (a.color() !== b.color()) return false;
        if (a.shadowColor() !== b.shadowColor()) return false;
        if (a.clickEvent() !== b.clickEvent()) return false; // TODO: use semantic equality instead of object identity
        if (a.hoverEvent() !== b.hoverEvent()) return false; // TODO: use semantic equality instead of object identity
        if (a.insertion() !== b.insertion()) return false;
        for (const decoration of TextDecoration.values()) {
            if (a.decoration(decoration) !== b.decoration(decoration)) return false;
        }
        return true;
    }

    export interface Builder {

        font(font: KeyLike | null): this;

        color(color: TextColor | null): this;

        colorIfAbsent(color: TextColor | null): this;

        shadowColor(color: ShadowColor | null): this;

        shadowColorIfAbsent(color: ShadowColor | null): this;

        decorate(...decorations: TextDecoration[]): this;

        decoration(decoration: TextDecoration, flag: boolean | TextDecoration.State): this;

        decorations(decorations: Partial<Record<TextDecoration, TextDecoration.State>>): this;

        decorationIfAbsent(decoration: TextDecoration, flag: boolean | TextDecoration.State): this;

        clickEvent(clickEvent: ClickEvent<any> | null): this;

        hoverEvent(hoverEvent: HoverEvent<any> | null): this;

        insertion(insertion: string | null): this;

        build(): Style;

    }

    /** @internal */
    class BuilderImpl implements Builder {

        private readonly _init: StyleInit;

        constructor() {
            this._init = { ...EMPTY_STYLE_INIT };
        }

        //

        font(font: KeyLike | null): this {
            this._init.font = (font === null) ? font : Key.key(font);
            return this;
        }

        color(color: TextColor | null): this {
            this._init.color = color;
            return this;
        }

        colorIfAbsent(color: TextColor | null): this {
            if (this._init.color === null) this._init.color = color;
            return this;
        }

        shadowColor(color: ShadowColor | null): this {
            this._init.shadowColor = color;
            return this;
        }

        shadowColorIfAbsent(color: ShadowColor | null): this {
            if (this._init.shadowColor === null) this._init.shadowColor = color;
            return this;
        }

        decorate(...decorations: TextDecoration[]): this {
            for (let decoration of decorations) {
                this._init.decorations = this._init.decorations.with(decoration, TextDecoration.State.TRUE);
            }
            return this;
        }

        decoration(decoration: TextDecoration, flag: boolean | TextDecoration.State): this {
            if (typeof flag === "boolean") flag = TextDecoration.State.fromBoolean(flag);
            this._init.decorations = this._init.decorations.with(decoration, flag);
            return this;
        }

        decorations(decorations: Partial<Record<TextDecoration, TextDecoration.State>>): this {
            for (const key of Object.keys(decorations)) {
                const decoration = key as unknown as TextDecoration;
                this._init.decorations = this._init.decorations.with(decoration, decorations[decoration]!);
            }
            return this;
        }

        decorationIfAbsent(decoration: TextDecoration, flag: boolean | TextDecoration.State): this {
            if (this._init.decorations.get(decoration) !== "not_set") return this;
            if (typeof flag === "boolean") flag = TextDecoration.State.fromBoolean(flag);
            this._init.decorations = this._init.decorations.with(decoration, flag);
            return this;
        }

        clickEvent(clickEvent: ClickEvent<any> | null): this {
            this._init.clickEvent = clickEvent;
            return this;
        }

        hoverEvent(hoverEvent: HoverEvent<any> | null): this {
            this._init.hoverEvent = hoverEvent;
            return this;
        }

        insertion(insertion: string | null): this {
            this._init.insertion = insertion;
            return this;
        }

        build(): Style {
            return new StyleImpl({ ...this._init });
        }

    }

    //

    const EMPTY_STYLE = new StyleImpl(EMPTY_STYLE_INIT);

    export function empty(): Style {
        return EMPTY_STYLE;
    }

    /** @internal */
    type StyleFactory = {
        (): Builder;
        (consumer: (builder: Builder) => void): Style;
        (color: TextColor | null, ...decorations: TextDecoration[]): Style;
    }

    function styleFactory() {
        const nargs = arguments.length;
        if (nargs === 0) {
            return new BuilderImpl();
        } else if (nargs === 1) {
            const builder = new BuilderImpl();
            const fn = arguments[0] as unknown as (builder: Builder) => void;
            fn(builder);
            return builder.build();
        } else {
            const builder = new BuilderImpl();
            builder.color(arguments[0] as unknown as TextColor | null);
            for (let i = 1; i < arguments.length; i++) {
                builder.decorate(arguments[i] as unknown as TextDecoration);
            }
            return builder.build();
        }
    }

    export const style: StyleFactory = styleFactory as unknown as StyleFactory;

}
