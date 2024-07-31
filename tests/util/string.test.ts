import { Test, runTests, assertEquals, assertTrue } from "../junit";
import {StringBuilder} from "../../src/util/string";
import {HexUtil} from "../../src/util/hex";

class StringBuilderTest {

    @Test()
    basic() {
        const out = (new StringBuilder())
            .append("Hi ")
            .appendLeftAngleBracket()
            .append(5)
            .appendRightAngleBracket()
            .appendString(" ")
            .appendStringBuilder((new StringBuilder()).append(":3c"))
            .toString();

        assertEquals(out, "Hi <5> :3c");
    }

    @Test()
    clear() {
        const out = (new StringBuilder(0));
        assertTrue(out.isEmpty());

        out.append("This")
            .appendChar(10)
            .append("Will")
            .appendChar(10)
            .append("Be")
            .appendChar(10)
            .append("Gone");

        assertEquals(out.toString(), "This\nWill\nBe\nGone");

        out.clear();

        assertEquals(out.length, 0);
        assertEquals(out.toString(), "");
    }

    @Test()
    veryBig() {
        // Might run in to new errors when we exceed the internal buffer size (255 codepoints)
        const sb = new StringBuilder();
        for (let i=0; i < 0x800; i++) {
            sb.appendString(HexUtil.octet2Hex(i >> 8))
                .appendString(HexUtil.octet2Hex(i & 0xFF))
                .appendChar(59); // semicolon
        }

        const out = sb.toString();
        assertEquals(out.length, 0x800 * 5);

        let i: number = 0;
        let z: number = 0;
        let read: number;
        while (i < 0x800) {
            read = HexUtil.hex2Octet(out, z) << 8;
            z += 2;
            read |= HexUtil.hex2Octet(out, z);
            z += 2;

            assertEquals(read, i++);
            assertEquals(out.charCodeAt(z++), 59); // semicolon
        }
    }

    @Test()
    slice() {
        const sb = new StringBuilder();
        sb.appendString("I want ->this content<- please");
        assertEquals(sb.toString(), "I want ->this content<- please");
        assertEquals(sb.toString(9, 12), "this content");
    }

    @Test()
    indexOfChar() {
        const sb = new StringBuilder();
        for (let i=0; i < 10; i++) {
            sb.appendChar(i + 48);
        }
        for (let i=0; i < 10; i++) {
            assertEquals(sb.indexOfChar(i + 48), i);
        }
        assertEquals(sb.indexOfChar(47), -1);
        assertEquals(sb.indexOfChar(58), -1);
    }

    @Test()
    indexOf() {
        const sb = new StringBuilder();
        sb.appendString("t ");
        sb.appendString("te ");
        sb.appendString("tes ");
        sb.appendString("test ");
        sb.appendString("tes ");
        sb.appendString("te ");
        sb.appendString("t ");

        assertEquals(sb.indexOf("test"), 9);
        assertEquals(sb.indexOf("tes"), 5);
        assertEquals(sb.indexOf("te"), 2);
        assertEquals(sb.indexOf("t"), 0);
    }

}

runTests(StringBuilderTest);
