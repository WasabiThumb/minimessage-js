import { Test, runTests, assertEquals } from "../junit";
import {HexUtil} from "../../src/util/hex";

type DigitChar = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type AlphaChar = "A" | "B" | "C" | "D" | "E" | "F";

type UpperHexChar = DigitChar | AlphaChar;
const UpperHexChars: UpperHexChar[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
type HexChar = DigitChar | AlphaChar | Lowercase<AlphaChar>;
type HexOctet = `${HexChar}${HexChar}`;

// noinspection JSMethodCanBeStatic
class HexUtilTest {

    @Test()
    nibble2HexCharCode() {
        for (let i=0; i < 16; i++) {
            assertEquals(UpperHexChars[i].charCodeAt(0), HexUtil.nibble2HexCharCode(i));
        }
    }

    @Test()
    hexCharCode2Nibble() {
        for (let i=0; i < 16; i++) {
            assertEquals(i, HexUtil.hexCharCode2Nibble(UpperHexChars[i].charCodeAt(0)));
        }
    }

    @Test()
    octet2Hex() {
        function test(octet: number, hex: HexOctet) {
            assertEquals(hex, HexUtil.octet2Hex(octet));
        }
        this.withOctetHex(test);
    }

    @Test()
    hex2Octet() {
        function test(octet: number, hex: HexOctet) {
            assertEquals(octet, HexUtil.hex2Octet(hex));
        }
        this.withOctetHex(test);
    }

    private withOctetHex(test: (octet: number, hex: HexOctet) => void): void {
        test(0x00, "00");
        test(0x03, "03");
        test(0x4D, "4D");
        test(0x69, "69");
        test(0x80, "80");
        test(0xFF, "FF");
    }

}

runTests(HexUtilTest);

