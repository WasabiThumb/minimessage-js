import { Test, runTests, assertEquals } from "../junit";
import {ColorUtil, RGB} from "../../src/util/color";

// noinspection JSMethodCanBeStatic
class ColorUtilTest {

    @Test()
    hex2RGB() {
        function test(rgb: RGB, hex: string) {
            const out = ColorUtil.hex2RGB(hex);
            assertEquals(out.length, rgb.length);
            for (let i=0; i < out.length; i++)
                assertEquals(out[i], rgb[i]);
        }
        this.withRGBHex(test);
    }

    @Test()
    rgb2Hex() {
        function test(rgb: RGB, hex: string) {
            assertEquals(ColorUtil.rgb2Hex(rgb), hex);
        }
        this.withRGBHex(test);
    }

    private withRGBHex(test: (rgb: RGB, hex: string) => void) {
        test([ 0x55, 0xAA, 0x33 ], "#55AA33");
        test([ 0x01, 0x02, 0x03 ], "#010203");
    }

    @Test()
    interpolateRGB() {
        function test(a: RGB, b: RGB, d: number, c: string) {
            assertEquals(ColorUtil.interpolateRGB(a, b, d / 100), c);
        }
        test([ 0xAA, 0xBB, 0xCC ], [ 0xDD, 0xEE, 0xFF ],   0, "#AABBCC");
        test([ 0xAA, 0xBB, 0xCC ], [ 0xDD, 0xEE, 0xFF ], 100, "#DDEEFF");
        test([ 0xAA, 0xBB, 0xCC ], [ 0xDD, 0xEE, 0xFF ],  50, "#C4D5E6");
    }

}

runTests(ColorUtilTest);
