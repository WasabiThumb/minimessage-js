import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import type {Component} from "../component";
import {Style} from "../style";
import {defineAccessor} from "../../util/accessor";

//

export namespace SelectorComponent {
    export const TYPE = "selector";
}

export interface SelectorComponent extends ScopedComponent<SelectorComponent> {

    readonly type: typeof SelectorComponent.TYPE;

    pattern(): string;

    pattern(pattern: string): SelectorComponent;

    separator(): Component | null;

    separator(separator: Component | null): SelectorComponent;

}

//

type Extra = {
    pattern: string,
    separator: Component | null
};

/** @internal */
export class SelectorComponentImpl extends AbstractScopedComponent<SelectorComponentImpl, Extra> implements SelectorComponent {

    readonly type = SelectorComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    pattern = defineAccessor(
        () => this._getExtra("pattern"),
        (pattern) => this._withExtra("pattern", pattern)
    );

    separator = defineAccessor(
        () => this._getExtra("separator"),
        (separator) => this._withExtra("separator", separator)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): SelectorComponentImpl {
        return new SelectorComponentImpl(extra, children, style);
    }

}
