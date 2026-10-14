import { DomEffect } from "../effects";

//

class KeybindDomEffectImpl implements KeybindDomEffect {
    apply(element: Element, data: string): void {
        // NOOP
    }

    serialize(data: string): string {
        return data;
    }

    deserialize(value: string): string {
        return value;
    }
}

export type KeybindDomEffect = DomEffect<string>;

export namespace KeybindDomEffect {
    export const TOKEN = "keybind";
    export const INSTANCE: KeybindDomEffect = new KeybindDomEffectImpl();
}
