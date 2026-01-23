import {Character} from "../../util/char";

export interface TextColor {

    value(): number;

    asHexString(): string;

    red(): number;

    green(): number;

    blue(): number;

}

/** @internal */
class TextColorImpl implements TextColor {

    private readonly _buf: DataView;

    constructor(value: number) {
        this._buf = new DataView(new ArrayBuffer(4));
        this._buf.setUint32(0, value, false);
    }

    //

    value(): number {
        return this._buf.getUint32(0, false);
    }

    asHexString(): string {
        let chars: number[] = new Array(7);
        let head: number = 0;
        chars[head++] = Character.NUMBER_SIGN.value; // #

        const nibble = ((n: number) => {
            chars[head++] = (n < 10) ?
                Character.ZERO.value + n :
                Character.LOWERCASE_A.value + n - 10;
        });

        for (let i = 1; i < 4; i++) {
            const octet = this._buf.getUint8(i);
            nibble(octet >>> 4);
            nibble(octet & 0xF);
        }

        return String.fromCharCode.apply(null, chars);
    }

    red(): number {
        return this._buf.getUint8(1);
    }

    green(): number {
        return this._buf.getUint8(2);
    }

    blue(): number {
        return this._buf.getUint8(3);
    }

    toString(): string {
        return this.asHexString();
    }

}

export namespace TextColor {

    type ColorFunc = {
        (value: number): TextColor,
        (r: number, g: number, b: number): TextColor
    };

    function colorFunc(): TextColor {
        const nargs = arguments.length;
        let value: number;
        if (nargs === 1) {
            value = (Number(arguments[0]) || 0) & 0xFFFFFF;
        } else if (nargs === 3) {
            const r = Number(arguments[0]) || 0;
            const g = Number(arguments[1]) || 0;
            const b = Number(arguments[2]) || 0;
            value = (r & 0xFF) << 16 |
                (g & 0xFF) << 8 |
                (b & 0xFF);
        } else {
            throw new Error(`Expected 1 or 3 arguments, got ${nargs}`);
        }

        const named = NamedTextColor.namedColor(value);
        if (named) return named;
        return new TextColorImpl(value);
    }

    export const color: ColorFunc = colorFunc as unknown as ColorFunc;

    export function fromHexString(hex: string): TextColor | null {
        if (hex.length === 0 || hex.charCodeAt(0) !== Character.NUMBER_SIGN.value) return null;
        const n = parseInt(hex.substring(1), 16);
        if (isNaN(n)) return null;
        return color(n);
    }

    export function lerp(
        v: number,
        from: TextColor,
        to: TextColor
    ) {
        if (Number.isNaN(v) || !Number.isFinite(v)) throw new Error(`Invalid interpolation factor: ${v}`);
        v = Math.min(Math.max(v, 0), 1);
        const u = 1 - v;

        const ar = from.red();
        const ag = from.green();
        const ab = from.blue();

        const br = to.red();
        const bg = to.green();
        const bb = to.blue();

        return color(
            u * ar + v * br,
            u * ag + v * bg,
            u * ab + v * bb,
        )
    }

}

export interface NamedTextColor extends TextColor {

    name(): string;

}

/** @internal */
class NamedTextColorImpl extends TextColorImpl implements NamedTextColor {

    private readonly _name: string;

    constructor(name: string, value: number) {
        super(value);
        this._name = name;
    }

    //

    name(): string {
        return this._name;
    }

    toString(): string {
        return this._name;
    }

}

export namespace NamedTextColor {

    const BLACK_VALUE        = 0x000000;
    const DARK_BLUE_VALUE    = 0x0000aa;
    const DARK_GREEN_VALUE   = 0x00aa00;
    const DARK_AQUA_VALUE    = 0x00aaaa;
    const DARK_RED_VALUE     = 0xaa0000;
    const DARK_PURPLE_VALUE  = 0xaa00aa;
    const GOLD_VALUE         = 0xffaa00;
    const GRAY_VALUE         = 0xaaaaaa;
    const DARK_GRAY_VALUE    = 0x555555;
    const BLUE_VALUE         = 0x5555ff;
    const GREEN_VALUE        = 0x55ff55;
    const AQUA_VALUE         = 0x55ffff;
    const RED_VALUE          = 0xff5555;
    const LIGHT_PURPLE_VALUE = 0xff55ff;
    const YELLOW_VALUE       = 0xffff55;
    const WHITE_VALUE        = 0xffffff;

    export const BLACK: NamedTextColor        = new NamedTextColorImpl("black",        BLACK_VALUE);
    export const DARK_BLUE: NamedTextColor    = new NamedTextColorImpl("dark_blue",    DARK_BLUE_VALUE);
    export const DARK_GREEN: NamedTextColor   = new NamedTextColorImpl("dark_green",   DARK_GREEN_VALUE);
    export const DARK_AQUA: NamedTextColor    = new NamedTextColorImpl("dark_aqua",    DARK_AQUA_VALUE);
    export const DARK_RED: NamedTextColor     = new NamedTextColorImpl("dark_red",     DARK_RED_VALUE);
    export const DARK_PURPLE: NamedTextColor  = new NamedTextColorImpl("dark_purple",  DARK_PURPLE_VALUE);
    export const GOLD: NamedTextColor         = new NamedTextColorImpl("gold",         GOLD_VALUE);
    export const GRAY: NamedTextColor         = new NamedTextColorImpl("gray",         GRAY_VALUE);
    export const DARK_GRAY: NamedTextColor    = new NamedTextColorImpl("dark_gray",    DARK_GRAY_VALUE);
    export const BLUE: NamedTextColor         = new NamedTextColorImpl("blue",         BLUE_VALUE);
    export const GREEN: NamedTextColor        = new NamedTextColorImpl("green",        GREEN_VALUE);
    export const AQUA: NamedTextColor         = new NamedTextColorImpl("aqua",         AQUA_VALUE);
    export const RED: NamedTextColor          = new NamedTextColorImpl("red",          RED_VALUE);
    export const LIGHT_PURPLE: NamedTextColor = new NamedTextColorImpl("light_purple", LIGHT_PURPLE_VALUE);
    export const YELLOW: NamedTextColor       = new NamedTextColorImpl("yellow",       YELLOW_VALUE);
    export const WHITE: NamedTextColor        = new NamedTextColorImpl("white",        WHITE_VALUE);

    export function isNamed(color: TextColor): boolean {
        return color instanceof NamedTextColorImpl;
    }

    export function namedColor(value: number): NamedTextColor | null {
        switch (value) {
            case BLACK_VALUE: return BLACK;
            case DARK_BLUE_VALUE: return DARK_BLUE;
            case DARK_GREEN_VALUE: return DARK_GREEN;
            case DARK_AQUA_VALUE: return DARK_AQUA;
            case DARK_RED_VALUE: return DARK_RED;
            case DARK_PURPLE_VALUE: return DARK_PURPLE;
            case GOLD_VALUE: return GOLD;
            case GRAY_VALUE: return GRAY;
            case DARK_GRAY_VALUE: return DARK_GRAY;
            case BLUE_VALUE: return BLUE;
            case GREEN_VALUE: return GREEN;
            case AQUA_VALUE: return AQUA;
            case RED_VALUE: return RED;
            case LIGHT_PURPLE_VALUE: return LIGHT_PURPLE;
            case YELLOW_VALUE: return YELLOW;
            case WHITE_VALUE: return WHITE;
            default: return null;
        }
    }

    export const NAMES = ((...colors: NamedTextColor[]) => {
        const ret: Record<string, NamedTextColor> = { };
        for (const color of colors) ret[color.name()] = color;
        return Object.freeze(ret);
    })(
        BLACK,
        DARK_BLUE,
        DARK_GREEN,
        DARK_AQUA,
        DARK_RED,
        DARK_PURPLE,
        GOLD,
        GRAY,
        DARK_GRAY,
        BLUE,
        GREEN,
        AQUA,
        RED,
        LIGHT_PURPLE,
        YELLOW,
        WHITE
    );

}
