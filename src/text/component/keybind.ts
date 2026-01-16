import type {Component} from "../component";
import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import {defineAccessor} from "../../util/accessor";
import {Style} from "../style";

//

export namespace KeybindComponent {
    export const TYPE = "keybind";
}

export interface KeybindComponent extends ScopedComponent<KeybindComponent> {

    readonly type: typeof KeybindComponent.TYPE;

    keybind(): string;

    keybind(keybind: string): KeybindComponent;

}

//

type Extra = {
    keybind: string
};

/** @internal */
export class KeybindComponentImpl extends AbstractScopedComponent<KeybindComponentImpl, Extra> implements KeybindComponent {

    readonly type = KeybindComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    keybind = defineAccessor(
        () => this._getExtra("keybind"),
        (keybind) => this._withExtra("keybind", keybind)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): KeybindComponentImpl {
        return new KeybindComponentImpl(extra, children, style);
    }

}
