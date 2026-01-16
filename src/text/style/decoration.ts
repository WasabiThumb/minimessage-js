import {ArrayUtil} from "../../util/array";

export type TextDecoration = typeof TextDecoration.OBFUSCATED |
    typeof TextDecoration.BOLD |
    typeof TextDecoration.STRIKETHROUGH |
    typeof TextDecoration.UNDERLINED |
    typeof TextDecoration.ITALIC;

export namespace TextDecoration {

    export const OBFUSCATED = "obfuscated";
    export const BOLD = "bold";
    export const STRIKETHROUGH = "strikethrough";
    export const UNDERLINED = "underlined";
    export const ITALIC = "italic";

    const VALUES: TextDecoration[] = ArrayUtil.immutableView([
        OBFUSCATED,
        BOLD,
        STRIKETHROUGH,
        UNDERLINED,
        ITALIC
    ]);

    const MAP = (() => {
        const ret = {} as Partial<Record<TextDecoration, number>>;
        for (let i = 0; i < VALUES.length; i++) ret[VALUES[i]] = i;
        return Object.freeze(ret as Record<TextDecoration, number>);
    })();

    export function values(): TextDecoration[] {
        return VALUES;
    }

    /** @internal */
    export function ordinal(decoration: TextDecoration | string): number {
        if (!(decoration in MAP)) throw new Error(`Unknown decoration \"${decoration}\"`);
        return MAP[decoration as TextDecoration];
    }

    /** @internal */
    export function fromOrdinal(ordinal: number): TextDecoration {
        if (ordinal < 0 || ordinal >= VALUES.length) throw new Error(`Illegal ordinal: ${ordinal}`);
        return VALUES[ordinal];
    }

    //

    export type State = typeof State.NOT_SET |
        typeof State.FALSE |
        typeof State.TRUE;

    export namespace State {

        export const NOT_SET = "not_set";
        export const FALSE = "false";
        export const TRUE = "true";

        const VALUES: State[] = [
            NOT_SET,
            FALSE,
            TRUE
        ];

        const MAP = (() => {
            const ret = {} as Partial<Record<State, number>>;
            for (let i = 0; i < VALUES.length; i++) ret[VALUES[i]] = i;
            return Object.freeze(ret as Record<State, number>);
        })();

        /** @internal */
        export function ordinal(decoration: State | string): number {
            if (!(decoration in MAP)) throw new Error(`Unknown state \"${decoration}\"`);
            return MAP[decoration as State];
        }

        /** @internal */
        export function fromOrdinal(ordinal: number): State {
            if (ordinal < 0 || ordinal >= VALUES.length) throw new Error(`Illegal ordinal: ${ordinal}`);
            return VALUES[ordinal];
        }

        export function fromBoolean(flag: boolean): State {
            return flag ? TRUE : FALSE;
        }

    }

}

/** @internal */
export class DecorationMap {

    private readonly _buffer: Uint16Array;

    constructor(value: number = 0) {
        this._buffer = new Uint16Array(1);
        this._value = value;
    }

    //

    private get _value(): number {
        return this._buffer[0];
    }

    private set _value(v: number) {
        this._buffer[0] = v & 0xFFFF;
    }

    get(decoration: TextDecoration): TextDecoration.State {
        return TextDecoration.State.fromOrdinal((this._value >> (TextDecoration.ordinal(decoration) * 2)) & 0b11);
    }

    with(decoration: TextDecoration, state: TextDecoration.State): DecorationMap {
        let v = this._value;
        const offset = TextDecoration.ordinal(decoration) * 2;
        v &= ~(0b11 << offset);
        v |= (TextDecoration.State.ordinal(state) << offset);
        return new DecorationMap(v);
    }

    isEmpty(): boolean {
        return this._value === 0;
    }

    toObject(): Record<TextDecoration, TextDecoration.State> {
        const ret: Partial<Record<TextDecoration, TextDecoration.State>> = {};
        for (const decoration of TextDecoration.values()) ret[decoration] = this.get(decoration);
        return ret as Record<TextDecoration, TextDecoration.State>;
    }

}
