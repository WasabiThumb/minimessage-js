import {Character} from "./char";
import {MessageDigest} from "./md5";

/** @internal */
export class UUID {

    static fromArray(array: ArrayLike<number>): UUID {
        if (array.length !== 4)
            throw new Error(`Expected UUID array to be 4 ints long, got ${array.length}`);

        const ab = new ArrayBuffer(16);
        const buf = new DataView(ab);
        buf.setInt32( 0, array[0], false);
        buf.setInt32( 4, array[1], false);
        buf.setInt32( 8, array[2], false);
        buf.setInt32(12, array[3], false);

        return new UUID(ab);
    }

    static fromString(text: string): UUID {
        let dashed: boolean;
        if (text.length === 36) {
            dashed = true;
        } else if (text.length === 32) {
            dashed = false;
        } else {
            throw new Error(`UUID string \"${text}\" should be 32 or 36 characters (got ${text.length}`);
        }

        const ab = new ArrayBuffer(16);
        const u8 = new Uint8Array(ab);
        let textHead: number = 0;
        let byteHead: number = 0;

        const nibble = (() => {
            const pos = textHead++;
            const char = text.charCodeAt(pos);

            if (Character.ZERO.value <= char && char <= Character.NINE.value) {
                return char - Character.ZERO.value;
            } else if (Character.LOWERCASE_A.value <= char && char <= Character.LOWERCASE_F.value) {
                return char - Character.LOWERCASE_A.value + 10;
            } else if (Character.UPPERCASE_A.value <= char && char <= Character.UPPERCASE_F.value) {
                return char - Character.UPPERCASE_A.value + 10;
            } else {
                throw new Error(`Expected hex char @ position ${pos} in UUID string \"${text}\"`);
            }
        });

        const hex = ((count: number) => {
            for (let i = 0; i < count; i++) {
                const hi = nibble();
                const lo = nibble();
                u8[byteHead++] = (hi << 4) | lo;
            }
        });

        const dash = (() => {
            if (!dashed) return;
            const pos = textHead++;
            const char = text.charCodeAt(pos);
            if (char === Character.DASH.value) return;
            throw new Error(`Expected dash @ position ${pos} in UUID string \"${text}\"`);
        });

        hex(4); // time_low
        dash();
        hex(2); // time_mid
        dash();
        hex(2); // time_high_and_version
        dash();
        hex(2); // variant_and_sequence
        dash();
        hex(6); // node

        return new UUID(ab);
    }

    static nameUUIDFromBytes(bytes: Uint8Array): UUID {
        // https://github.com/AdoptOpenJDK/openjdk-jdk11/blob/19fb8f93c59dfd791f62d41f332db9e306bc1422/src/java.base/share/classes/java/util/UUID.java#L167
        const md = new MessageDigest();
        md.update(bytes);

        const u8 = md.digest();
        u8[6] &= 0x0F;
        u8[6] |= 0x30;
        u8[8] &= 0x3F;
        u8[8] |= 0x80;

        return new UUID(u8.buffer);
    }

    //

    private readonly _buf: DataView;

    constructor(ab: ArrayBuffer | SharedArrayBuffer) {
        if (ab.byteLength !== 16) throw new Error(`Illegal byte length`);
        this._buf = new DataView(ab);
    }

    //

    toArray(): [ number, number, number, number ] {
        return [
            this._buf.getInt32(0, false),
            this._buf.getInt32(4, false),
            this._buf.getInt32(8, false),
            this._buf.getInt32(12, false)
        ];
    }

    toString(noDashes?: boolean): string {
        const chars: number[] = new Array(noDashes ? 32 : 36);
        let head: number = 0;

        const nibble = ((n: number) => {
            chars[head++] = (n < 0xA) ?
                Character.ZERO.value + n :
                Character.LOWERCASE_A.value + n - 10;
        });

        const hex = ((start: number, end: number) => {
            let u8: number;
            for (let i = start; i < end; i++) {
                u8 = this._buf.getUint8(i);
                nibble(u8 >>> 4);
                nibble(u8 & 0xF);
            }
        });

        const dash = (() => {
            if (noDashes) return;
            chars[head++] = Character.DASH.value;
        });

        hex(0, 4); // time_low
        dash();
        hex(4, 6); // time_mid
        dash();
        hex(6, 8); // time_high_and_version
        dash();
        hex(8, 10); // variant_and_sequence
        dash();
        hex(10, 16); // node

        chars.length = head;
        return String.fromCharCode.apply(null, chars);
    }

}
