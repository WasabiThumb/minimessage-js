import {TextColor} from "./textColor";
import {Character} from "../../util/char";

//

export interface ShadowColor {

    value(): number;

    asHexString(): string;

    red(): number;

    green(): number;

    blue(): number;

    alpha(): number;

}

/** @internal */
class ShadowColorImpl implements ShadowColor {

    private readonly _buffer: DataView;

    constructor(value: number) {
        this._buffer = new DataView(new ArrayBuffer(4));
        this._value = value;
    }

    //

    private get _value(): number {
        return this._buffer.getUint32(0, false);
    }

    private set _value(v: number) {
        this._buffer.setUint32(0, v, false);
    }

    value(): number {
        return this._value;
    }

    red(): number {
        return this._buffer.getUint8(1);
    }

    green(): number {
        return this._buffer.getUint8(2);
    }

    blue(): number {
        return this._buffer.getUint8(3);
    }

    alpha(): number {
        return this._buffer.getUint8(0);
    }

    asHexString(): string {
        const component = ((n: number) => {
            const v = this._buffer.getUint8(n);
            const hex = v.toString(16);
            if (hex.length === 1) return `0${hex}`;
            return hex;
        });
        return `#${component(1)}${component(2)}${component(3)}${component(0)}`;
    }

}

export namespace ShadowColor {

    const NONE_VALUE = 0;
    const NONE = new ShadowColorImpl(NONE_VALUE);

    export function none(): ShadowColor {
        return NONE;
    }

    /** @internal */
    type ShadowColorFunc = {
        (argb: number): ShadowColor;
        (rgb: TextColor, alpha: number): ShadowColor;
        (r: number, g: number, b: number, a: number): ShadowColor;
    };

    function shadowColorFunc(): ShadowColor {
        const nargs = arguments.length;
        let value: number;

        if (nargs === 1) {
            value = (Number(arguments[0]) || 0) & 0xFFFFFFFF;
        } else if (nargs === 2) {
            const rgb = arguments[0] as unknown as TextColor;
            const alpha = (Number(arguments[1]) || 0) & 0xFF;
            const rgbValue = Number(rgb.value()) & 0xFFFFFF;
            value = (alpha << 24) | rgbValue;
        } else if (nargs === 4) {
            const r = (Number(arguments[0]) || 0) & 0xFF;
            const g = (Number(arguments[1]) || 0) & 0xFF;
            const b = (Number(arguments[2]) || 0) & 0xFF;
            const a = (Number(arguments[3]) || 0) & 0xFF;
            value = (a << 24) | (r << 16) | (g << 8) | b;
        } else {
            throw new Error(`Expected 1, 2, or 4 arguments (got ${nargs})`);
        }

        if (value === NONE_VALUE) return NONE;
        return new ShadowColorImpl(value);
    }

    export const shadowColor: ShadowColorFunc = shadowColorFunc as unknown as ShadowColorFunc;

    export function fromHexString(hex: string): ShadowColor | null {
        if (hex.length !== 9 || hex.charCodeAt(0) !== Character.NUMBER_SIGN.value) return null;
        const r = parseInt(hex.substring(1, 3), 16);
        const g = parseInt(hex.substring(3, 5), 16);
        const b = parseInt(hex.substring(5, 7), 16);
        const a = parseInt(hex.substring(7, 9), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
        return shadowColor(r, g, b, a);
    }

}