import type {Color} from "./color.ts";
import {NamedTextColor} from "minimessage-js";

//

export class ColorPresets {

    private readonly _container: HTMLElement;
    private readonly _value: Color;

    constructor(element: HTMLElement, value: Color) {
        this._container = element;
        this._value = value;
    }

    //

    bind() {
        for (const key of Object.keys(NamedTextColor.NAMES)) {
            this._bindPreset(key);
        }
    }

    private _bindPreset(name: string): void {
        const element = this._search(name);
        const color = NamedTextColor.NAMES[name];
        element.addEventListener("click", () => {
            this._value.set("named", { valid: true, value: color });
        });
    }

    private _search(name: string): HTMLButtonElement {
        const button = this._container.querySelector<HTMLButtonElement>(`[data-color="${name}"]`);
        if (!button) throw new Error(`Missing button for color '${name}'`);
        return button;
    }

}
