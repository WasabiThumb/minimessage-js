import {HexUtil} from "./hex";

export type RGB = [number, number, number];
export type HSV = [number, number, number];

export namespace ColorUtil {

    export function hex2RGB(hex: string): RGB {
        let head: number = hex.charCodeAt(0) === 35 ? 1 : 0;
        return [
            HexUtil.hex2Octet(hex, head),
            HexUtil.hex2Octet(hex, head + 2),
            HexUtil.hex2Octet(hex, head + 4)
        ];
    }

    export function rgb2Hex(rgb: RGB): string {
        return "#" + HexUtil.octet2Hex(rgb[0]) +
            HexUtil.octet2Hex(rgb[1]) +
            HexUtil.octet2Hex(rgb[2]);
    }

    export function interpolateRGB(a: RGB, b: RGB, d: number): string {
        const v: number = 1 - d;
        function component(n: 0 | 1 | 2): number {
            return Math.round((a[n] * v) + (b[n] * d));
        }

        return "#" + HexUtil.octet2Hex(component(0))
            + HexUtil.octet2Hex(component(1))
            + HexUtil.octet2Hex(component(2));
    }

}
