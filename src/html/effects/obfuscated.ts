import type {DomEffect} from "../effects";

//

class ObfuscatedDomEffectImpl implements ObfuscatedDomEffect {

    apply(element: Element, data: boolean): void {
        // TODO
    }

    serialize(data: boolean): string {
        return data ? "true" : "false";
    }

    deserialize(value: string): boolean {
        return "true" === value;
    }

}

export type ObfuscatedDomEffect = DomEffect<boolean>;

export namespace ObfuscatedDomEffect {
    export const TOKEN = "obfuscated";
    export const INSTANCE: ObfuscatedDomEffect = new ObfuscatedDomEffectImpl();
}
