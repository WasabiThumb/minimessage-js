import {type Color} from "./color.ts";

//

type Binding = {
    element: HTMLInputElement,
    handler: Handler,
    writing: boolean
};

interface Handler {
    /** Place "color" into element */
    read(element: HTMLInputElement, color: Color): void;

    /** Retrieve "color" from element */
    write(element: HTMLInputElement, color: Color): void;
}

class RGBHandler implements Handler {

    constructor(
        private readonly _channel: "r" | "g" | "b"
    ) { }

    read(element: HTMLInputElement, color: Color) {
        const n = color.get("rgb")[this._channel];
        element.value = `${n}`;
    }

    write(element: HTMLInputElement, color: Color) {
        const value = Number(element.value);
        if (isNaN(value)) return;

        const current = color.get("rgb");
        const replacement = { ...current };
        replacement[this._channel] = value;
        color.set("rgb", replacement);
    }

}

class HSVHandler implements Handler {

    constructor(
        private readonly _channel: "h" | "s" | "v",
        private readonly _multiplier: number
    ) { }

    read(element: HTMLInputElement, color: Color) {
        let n = color.get("hsv")[this._channel];
        n = Math.round(n * this._multiplier);
        element.value = `${n}`;
    }

    write(element: HTMLInputElement, color: Color) {
        const value = Number(element.value);
        if (isNaN(value)) return;

        const current = color.get("hsv");
        const replacement = { ...current };
        replacement[this._channel] = value / this._multiplier;
        color.set("hsv", replacement);
    }

}

class HexHandler implements Handler {

    read(element: HTMLInputElement, color: Color) {
        const rgb = color.get("rgb");
        const part = ((p: "r" | "g" | "b") => {
            let ret: string = rgb[p].toString(16);
            if (ret.length === 1) ret = `0${ret}`;
            return ret;
        });
        element.value = part("r") + part("g") + part("b");
    }

    write(element: HTMLInputElement, color: Color) {
        const value = element.value;
        const match = /^([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value);
        if (!match) return;
        color.set("rgb", {
            r: parseInt(match[1], 16),
            g: parseInt(match[2], 16),
            b: parseInt(match[3], 16)
        });
    }

}

const HANDLERS = {
    red: new RGBHandler("r"),
    green: new RGBHandler("g"),
    blue: new RGBHandler("b"),
    hue: new HSVHandler("h", 360),
    saturation: new HSVHandler("s", 100),
    value: new HSVHandler("v", 100),
    hex: new HexHandler()
}

//

export class ColorComponents {

    private readonly _element: HTMLElement;
    private readonly _value: Color;
    private readonly _bindings: Binding[];

    constructor(element: HTMLElement, value: Color) {
        this._element = element;
        this._value = value;
        this._bindings = [];
    }

    //

    bind(): void {
        for (const key of Object.keys(HANDLERS)) {
            const handler = HANDLERS[key as keyof typeof HANDLERS];
            const element = this._element.querySelector<HTMLInputElement>(`[data-component="${key}"]`);
            if (!element) throw new Error(`Missing element for handler '${key}'`);
            const binding: Binding = { element, handler, writing: false };
            this._setupEvents(binding);
            this._bindings.push(binding);
        }

        this._value.onChange(() => {
            this._update();
        });
        this._update();
    }

    private _setupEvents(binding: Binding): void {
        const { element, handler } = binding;
        const callback = (() => {
            binding.writing = true;
            try {
                handler.write(element, this._value);
            } finally {
                binding.writing = false;
            }
        });
        element.addEventListener("change", callback);
        element.addEventListener("input", callback);
        element.addEventListener("keyup", callback);
    }

    private _update(): void {
        for (const binding of this._bindings) {
            if (binding.writing) continue;
            binding.handler.read(binding.element, this._value);
        }
    }

}
