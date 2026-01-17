import {Character} from "./util/char";

//

export type KeyLike = Key | string;

export interface Key {

    namespace(): string;

    value(): string;

    asString(): string;

    asMinimalString(): string;

    toString(): string;

}

/** @internal */
class KeyImpl implements Key {

    private static readonly D_NAMESPACE = "namespace";
    private static readonly D_VALUE = "value";

    private static _checkField(
        value: string,
        descriptor: typeof this.D_NAMESPACE | typeof this.D_VALUE
    ) {
        if (value.length === 0) throw new Error(`'${descriptor}' may not be an empty string`);
        const isValue = this.D_VALUE === descriptor;

        let char: number;
        for (let i = 0; i < value.length; i++) {
            char = value.charCodeAt(i);
            if (Character.UNDERSCORE.is(char)) continue;
            if (Character.DASH.is(char)) continue;
            if (Character.LOWERCASE_A.value <= char && char <= Character.LOWERCASE_Z.value) continue;
            if (Character.ZERO.value <= char && char <= Character.NINE.value) continue;
            if (Character.PERIOD.is(char)) continue;
            if (isValue && Character.SLASH.is(char)) continue;
            throw new Error(`Disallowed character @ position ${i} in field '${descriptor}'`);
        }
    }

    //

    constructor(
        private readonly _namespace: string,
        private readonly _value: string
    ) {
        KeyImpl._checkField(_namespace, KeyImpl.D_NAMESPACE);
        KeyImpl._checkField(_value, KeyImpl.D_VALUE);
    }

    //

    namespace(): string {
        return this._namespace;
    }

    value(): string {
        return this._value;
    }

    asString(): string {
        return `${this._namespace}:${this._value}`;
    }

    asMinimalString(): string {
        if (Key.MINECRAFT_NAMESPACE === this._namespace) return this._value;
        return this.asString();
    }

    toString(): string {
        return this.asString();
    }

    get [Symbol.toStringTag]() {
        return "Key";
    }

    [Symbol.toPrimitive](hint: string) {
        if ("number" === hint) return NaN;
        return this.asString();
    }

}

export namespace Key {

    export const MINECRAFT_NAMESPACE = "minecraft";
    export const DEFAULT_SEPARATOR = Character.COLON;

    type Factory = {
        (key: KeyLike): Key;
        (namespace: string, key: string): Key;
    };

    export const key: Factory = function key() {
        const nargs = arguments.length;
        if (nargs === 1) {
            const arg0 = arguments[0];
            if (typeof arg0 === "object" && arg0 instanceof KeyImpl) return arg0;
            const data = String(arg0);
            const index = DEFAULT_SEPARATOR.indexIn(data);
            if (index !== -1) {
                return new KeyImpl(data.substring(0, index), data.substring(index + 1));
            } else {
                return new KeyImpl(MINECRAFT_NAMESPACE, data);
            }
        } else if (nargs === 2) {
            return new KeyImpl(String(arguments[0]), String(arguments[1]));
        } else {
            throw new Error(`Expected 1-2 arguments, got ${nargs}`);
        }
    } as unknown as Factory;

    export function equals(a: Key | null, b: Key | null): boolean {
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (a.namespace() !== b.namespace()) return false;
        return a.value() === b.value();
    }

}
