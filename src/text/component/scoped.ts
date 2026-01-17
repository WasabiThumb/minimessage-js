import type { Component, ComponentLike } from "../component";
import { Style, TextColor, ShadowColor, TextDecoration, HoverEvent, ClickEvent } from "../style";
import {defineAccessor, defineContextualAccessor} from "../../util/accessor";
import {ArrayUtil} from "../../util/array";
import {ComponentCompaction} from "./compaction";
import {Key, KeyLike} from "../../key";

//

/** @internal */
export interface ScopedComponent<C extends ScopedComponent<C>> extends ComponentLike {

    children(): Component[];

    children(children: ComponentLike[]): Component;

    append(...component: ComponentLike[]): C;

    style(): Style;

    style(style: Style): C;

    font(): Key | null;

    font(font: KeyLike | null): C;

    color(): TextColor | null;

    color(color: TextColor | null): C;

    shadowColor(): ShadowColor | null;

    shadowColor(shadowColor: ShadowColor | null): C;

    colorIfAbsent(color: TextColor | null): C;

    shadowColorIfAbsent(shadowColor: ShadowColor | null): C;

    hasDecoration(decoration: TextDecoration): boolean;

    decorate(...decorations: TextDecoration[]): C;

    decoration(decoration: TextDecoration): TextDecoration.State;

    decoration(decoration: TextDecoration, state: boolean | TextDecoration.State): C;

    decorationIfAbsent(decoration: TextDecoration, state: boolean | TextDecoration.State): C;

    decorations(): Record<TextDecoration, TextDecoration.State>;

    decorations(decorations: Partial<Record<TextDecoration, TextDecoration.State>>): C;

    clickEvent(): ClickEvent<any> | null;

    clickEvent(clickEvent: ClickEvent<any> | null): C;

    hoverEvent(): HoverEvent<any> | null;

    hoverEvent(hoverEvent: HoverEvent<any> | null): C;

    insertion(): string | null;

    insertion(insertion: string | null): C;

    compact(parentStyle?: Style | null): Component;

    // TODO: replaceText

}

//

/** @internal */
export abstract class AbstractScopedComponent<C extends ScopedComponent<C>, E extends Record<string, any>> implements ScopedComponent<C> {

    protected readonly _extra: E;
    private readonly _children: Component[];
    private readonly _style: Style;

    protected constructor(
        extra: E,
        children: Component[] = [],
        style: Style = Style.empty()
    ) {
        this._children = children;
        this._style = style;
        this._extra = extra;
    }

    //

    asComponent(): Component {
        return this as unknown as Component;
    }

    children = defineAccessor<Component[], ComponentLike[]>(
        () => ArrayUtil.immutableView(this._children),
        (children) => {
            const normalized: Component[] = new Array(children.length);
            for (let i = 0; i < children.length; i++) normalized[i] = children[i].asComponent();
            return this._mutate(this._extra, normalized, this._style);
        }
    )

    append(...components: ComponentLike[]): C {
        const current = this._children.length;
        const newChildren: Component[] = new Array(current + components.length);
        for (let i = 0; i < current; i++) newChildren[i] = this._children[i];
        for (let i = 0; i < components.length; i++) newChildren[current + i] = components[i].asComponent();
        return this._mutate(this._extra, newChildren, this._style);
    }

    style = defineAccessor<Style>(
        () => this._style,
        (style) => this._mutate(this._extra, this._children, style)
    );

    font = defineAccessor<Key | null, KeyLike | null>(
        () => this._style.font(),
        (font) => this._mutateStyle((s) => s.font(font))
    );

    color = defineAccessor<TextColor | null>(
        () => this._style.color(),
        (color) => this._mutateStyle((s) => s.color(color))
    );

    colorIfAbsent(color: TextColor | null): C {
        return this._mutateStyle((s) => s.colorIfAbsent(color));
    }

    shadowColor = defineAccessor<ShadowColor | null>(
        () => this._style.shadowColor(),
        (shadowColor) => this._mutateStyle((s) => s.shadowColor(shadowColor))
    );

    shadowColorIfAbsent(shadowColor: ShadowColor | null): C {
        return this._mutateStyle((s) => s.shadowColorIfAbsent(shadowColor));
    }

    hasDecoration(decoration: TextDecoration): boolean {
        return this._style.hasDecoration(decoration);
    }

    decorate(...decorations: TextDecoration[]): C {
        return this._mutateStyle((s) => s.decorate(...decorations));
    }

    decoration = defineContextualAccessor<TextDecoration, TextDecoration.State, TextDecoration.State | boolean>(
        (decoration) => this._style.decoration(decoration),
        (decoration, state) => this._mutateStyle((s) => s.decoration(decoration, state))
    );

    decorationIfAbsent(decoration: TextDecoration, state: boolean | TextDecoration.State): C {
        return this._mutateStyle((s) => s.decorationIfAbsent(decoration, state));
    }

    decorations = defineAccessor<Record<TextDecoration, TextDecoration.State>, Partial<Record<TextDecoration, TextDecoration.State>>>(
        () => this._style.decorations(),
        (decorations) => this._mutateStyle((s) => s.decorations(decorations))
    );

    clickEvent = defineAccessor<ClickEvent<any> | null>(
        () => this._style.clickEvent(),
        (clickEvent) => this._mutateStyle((s) => s.clickEvent(clickEvent))
    );

    hoverEvent = defineAccessor<HoverEvent<any> | null>(
        () => this._style.hoverEvent(),
        (hoverEvent) => this._mutateStyle((s) => s.hoverEvent(hoverEvent))
    );

    insertion = defineAccessor<string | null>(
        () => this._style.insertion(),
        (insertion) => this._mutateStyle((s) => s.insertion(insertion))
    );

    compact(parentStyle?: Style | null): Component {
        return ComponentCompaction.compact(this.asComponent(), !!parentStyle ? parentStyle : null);
    }

    //

    protected abstract _mutate(extra: E, children: Component[], style: Style): C;

    protected _getExtra<K extends keyof E>(key: K): E[K] {
        return this._extra[key];
    }

    protected _withExtra<K extends keyof E>(key: K, value: E[K]): C {
        const newExtra: E = { ...this._extra };
        newExtra[key] = value;
        return this._mutate(newExtra, this._children, this._style);
    }

    private _mutateStyle(fn: (style: Style) => Style): C {
        return this._mutate(this._extra, this._children, fn(this._style));
    }

}