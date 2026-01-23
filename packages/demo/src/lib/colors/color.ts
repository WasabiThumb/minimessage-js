import {NamedTextColor} from "minimessage-js";
import {OkHSL} from "./okhsl.ts";

//

/** RGB in [0, 255] */
type RGBColorSource = { r: number, g: number, b: number };

/** HSV in [0, 1] */
type HSVColorSource = { h: number, s: number, v: number };

/** OkHSL in [0, 1] */
type OkHSLColorSource = { h: number, s: number, l: number };

/** Named */
type NamedColorSource = { valid: false } | { valid: true, value: NamedTextColor };

type ColorSourceMap = {
    rgb: RGBColorSource,
    hsv: HSVColorSource,
    okhsl: OkHSLColorSource,
    named: NamedColorSource
};
type ColorType = keyof ColorSourceMap;
type ColorSource<T extends ColorType = ColorType> = ColorSourceMap[T];

//

function sourcesEqual0<A extends ColorType>(
    a: Record<string, any>,
    b: Record<string, any>,
    ...keys: ((keyof ColorSource<A> & string) | string)[]
): boolean {
    for (const key of keys) {
        if (a[key] !== b[key]) return false;
    }
    return true;
}

function sourcesEqual(
    at: ColorType,
    a: ColorSource,
    bt: ColorType,
    b: ColorSource
): boolean {
    if ((at as string) !== (bt as string)) return false;
    switch (at) {
        case "rgb": return sourcesEqual0<"rgb">(a, b, "r", "g", "b");
        case "hsv": return sourcesEqual0<"hsv">(a, b, "h", "s", "v");
        case "okhsl": return sourcesEqual0<"okhsl">(a, b, "h", "s", "l");
        case "named": return sourcesEqual0<"named">(a, b, "valid", "value");
        default: return false;
    }
}

//

export class Color {

    private static of<T extends ColorType>(
        type: T,
        value: ColorSource<T>
    ): Color {
        return new Color(type, value);
    }

    static rgb(r: number, g: number, b: number): Color {
        return Color.of("rgb", { r, g, b });
    }

    static hsv(h: number, s: number, v: number): Color {
        return Color.of("hsv", { h, s, v });
    }

    static okhsl(h: number, s: number, l: number): Color {
        return Color.of("okhsl", { h, s, l });
    }

    static named(named: NamedTextColor): Color {
        return Color.of("named", { valid: true, value: named });
    }

    //

    private readonly _listeners: ((color: Color) => void)[];
    private _data: Record<string, any>;
    private _canonicalType: string;

    private constructor(
        type: string,
        value: any
    ) {
        this._listeners = [];
        this._data = { [type]: value };
        this._canonicalType = type;
    }

    //

    get type(): ColorType {
        return this._canonicalType as ColorType;
    }

    get<T extends ColorType>(type: T): ColorSource<T> {
        return this._compute(type, () => {
            const rgb = this._compute("rgb", () => {
                // @ts-ignore
                return this._toRgb(this._canonicalType, this._data[this._canonicalType]);
            });
            return this._fromRgb(type, rgb);
        });
    }

    set<T extends ColorType>(
        type: T,
        value: ColorSource<T>
    ): void {
        if (sourcesEqual(this._canonicalType as ColorType, this._data[this._canonicalType], type, value)) return;
        if ("named" === type && !(value as ColorSourceMap["named"]).valid) {
            throw new Error(`Invalid named color`);
        }
        this._data = { [type]: value };
        this._canonicalType = type;
        this._reportChange();
    }

    onChange(callback: (color: Color) => void): void {
        this._listeners.push(callback);
    }

    copy(): Color {
        return new Color(this._canonicalType, this._data[this._canonicalType]);
    }

    private _compute<T extends ColorType>(
        type: T,
        computeFn: () => ColorSource<T>
    ): ColorSource<T> {
        let value: any = this._data[type];
        if (value) return value as unknown as ColorSource<T>;
        const computed = computeFn();
        this._data[type] = computed;
        return computed;
    }

    private _toRgb<T extends ColorType>(
        type: T,
        value: ColorSource<T>
    ): RGBColorSource {
        switch (type) {
            case "hsv":
                return this._hsvToRgb(value as ColorSourceMap["hsv"]);
            case "okhsl":
                return this._okhslToRgb(value as ColorSourceMap["okhsl"]);
            case "named":
                return this._namedToRgb(value as ColorSourceMap["named"]);
            case "rgb":
                return value as ColorSourceMap["rgb"];
            default:
                return this._unhandledType(type);
        }
    }

    private _fromRgb<T extends ColorType>(
        type: T,
        rgb: RGBColorSource
    ): ColorSource<T> {
        switch (type) {
            case "hsv":
                // @ts-ignore
                return this._rgbToHsv(rgb);
            case "okhsl":
                // @ts-ignore
                return this._rgbToOkhsl(rgb);
            case "named":
                // @ts-ignore
                return this._rgbToNamed(rgb);
            case "rgb":
                // @ts-ignore
                return rgb;
            default:
                return this._unhandledType(type);
        }
    }

    private _namedToRgb(named: NamedColorSource): RGBColorSource {
        if (!named.valid) throw new Error(`Illegal state`);
        return {
            r: named.value.red(),
            g: named.value.green(),
            b: named.value.blue()
        };
    }

    private _hsvToRgb(hsv: HSVColorSource): RGBColorSource {
        const { h, s, v } = hsv;
        let r: number;
        let g: number;
        let b: number;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch ((i % 6) as 0 | 1 | 2 | 3 | 4 | 5) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    private _okhslToRgb(okhsl: OkHSLColorSource): RGBColorSource {
        return OkHSL.toRGB(okhsl.h, okhsl.s, okhsl.l);
    }

    private _rgbToHsv(rgb: RGBColorSource): HSVColorSource {
        let { r, g, b } = rgb;
        r /= 255;
        g /= 255;
        b /= 255;

        const min = Math.min(r, g, b);
        const max = Math.max(r, g, b);
        const delta = max - min;

        let h: number;
        let s: number;
        let v: number = max;

        if (delta < 1e-6) {
            h = s = 0;
            return { h, s, v };
        }

        if (max > 0) {
            s = delta / max;
        } else {
            s = 0;
            h = 0; // fallback; no real hue
            return { h, s, v };
        }

        if (r >= max) {
            h = (g - b) / delta;
        } else if (g >= max) {
            h = 2 + (b - r) / delta;
        } else {
            h = 4 + (r - g) / delta;
        }

        if (h < 0) h += 6;
        h = h / 6;
        return { h, s, v };
    }

    private _rgbToOkhsl(rgb: RGBColorSource): OkHSLColorSource {
        return OkHSL.fromRGB(rgb.r, rgb.g, rgb.b);
    }

    private _rgbToNamed(rgb: RGBColorSource): NamedColorSource {
        const named = NamedTextColor.namedColor(
            (rgb.r << 16) |
            (rgb.g << 8) |
            rgb.b
        );
        return (named !== null) ?
            { valid: true, value: named } :
            { valid: false };
    }

    private _unhandledType<T>(x: never): T {
        throw new Error(`Unhandled color source type: "${x}"`);
    }

    private _reportChange(): void {
        for (const callback of this._listeners) {
            try {
                callback(this);
            } catch (e) {
                console.warn(`Error in color change callback`, e);
            }
        }
    }

}
