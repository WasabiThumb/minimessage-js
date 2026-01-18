
//

const s = (() => {
    const n = new Uint32Array([ 738695, 669989, 770404, 703814 ]);
    return ((i: number) => {
        return (n[i >> 4] >> ((i & 3) * 5)) & 31;
    });
})();

const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) {
    K[i] = 0x100000000 * Math.abs(Math.sin(i + 1));
}

const BIG_ENDIAN = (() => {
    const buf = new ArrayBuffer(2);
    const u8 = new Uint8Array(buf);
    const u16 = new Uint16Array(buf);
    u8[0] = 0xAA;
    u8[1] = 0xBB;
    return u16[0] === 0xAABB;
})();

//

class AlignedBuffer {

    readonly raw: ArrayBuffer;
    private readonly _u8: Uint8Array;
    private readonly _u32: Uint32Array;

    constructor(byteLength: number) {
        if (byteLength & 3) throw new Error(`Length ${byteLength} is not aligned`);
        this.raw = new ArrayBuffer(byteLength);
        this._u8 = new Uint8Array(this.raw);
        this._u32 = new Uint32Array(this.raw);
    }

    //

    get byteLength(): number {
        return this.raw.byteLength;
    }

    get wordLength(): number {
        return this.raw.byteLength >> 2;
    }

    get bytes(): Uint8Array {
        return this._u8;
    }

    getWord(index: number): number {
        this._checkWordIndex(index);
        let word: number = this._u32[index];
        if (BIG_ENDIAN) word = this._reverseWord(word);
        return word;
    }

    setWord(index: number, value: number): void {
        this._checkWordIndex(index);
        if (BIG_ENDIAN) value = this._reverseWord(value);
        this._u32[index] = value;
    }

    putWords(src: ArrayLike<number>, offset: number = 0): void {
        this._checkWordIndex(offset);
        this._u32.set(src, offset);
        if (BIG_ENDIAN) {
            for (let i = 0; i < src.length; i++) {
                this._u32[offset + i] = this._reverseWord(this._u32[offset + i]);
            }
        }
    }

    private _checkWordIndex(index: number): void {
        const length = this.wordLength;
        if (index < 0 || index >= length) throw new Error(`Word index ${index} out of bounds for length ${length}`);
    }

    private _reverseWord(word: number): number {
        return ((word & 0x00FF) << 24) |
            ((word & 0xFF00) << 8) |
            ((word >> 24) & 0x00FF) |
            ((word >> 8) & 0xFF00);
    }

}

//

/** @internal */
export class MessageDigest {

    private readonly _digest: AlignedBuffer;
    private readonly _buf: AlignedBuffer;
    private _head: number = 0;

    constructor() {
        this._digest = new AlignedBuffer(16);
        this._buf = new AlignedBuffer(64);
        this._resetDigest();
    }

    //

    update(chunk: Uint8Array) {
        const length = chunk.byteLength;
        let head: number = 0;

        while (head < length) {
            const bufferIndex = this._head % 64;
            const available = this._buf.byteLength - bufferIndex;
            const remaining = length - head;

            if (remaining < available) {
                this._buf.bytes.set(chunk.subarray(head, length), bufferIndex);
                this._head += remaining;
                return;
            }

            this._buf.bytes.set(chunk.subarray(head, head + available), bufferIndex);
            this._head += available;
            head += available;
            this._chunk();
        }
    }

    digest(): Uint8Array {
        // Padding
        const byteLength = this._head;
        const bufferIndex = byteLength % 64;
        if (bufferIndex < 56) {
            if (bufferIndex !== 55) this._buf.bytes.fill(0x00, bufferIndex + 1, 56);
            this._buf.bytes[bufferIndex] = 0x80;
        } else {
            if (bufferIndex !== 63) this._buf.bytes.fill(0x00, bufferIndex + 1, 64);
            this._buf.bytes[bufferIndex] = 0x80;
            this._chunk();
            this._buf.bytes.fill(0x00, 0, 56);
        }
        this._buf.setWord(14, (byteLength << 3) & 0xFFFFFFFF);
        this._buf.setWord(15, byteLength >>> 29);
        this._chunk();

        // Copy and reset
        const ret = new Uint8Array(16);
        ret.set(this._digest.bytes, 0);
        this._resetDigest();
        return ret;
    }

    private _chunk(): void {
        const vars = new Uint32Array(6);
        for (let i = 0; i < 4; i++) vars[i] = this._digest.getWord(i);

        for (let i = 0; i < 64; i++) {
            switch (i >> 4) {
                case 0: // 0 - 15
                    vars[4] = (vars[1] & vars[2]) | ((~vars[1]) & vars[3]);
                    vars[5] = i;
                    break;
                case 1: // 16 - 31
                    vars[4] = (vars[3] & vars[1]) | ((~vars[3]) & vars[2]);
                    vars[5] = (5 * i + 1) % 16;
                    break;
                case 2: // 32 - 47
                    vars[4] = vars[1] ^ vars[2] ^ vars[3];
                    vars[5] = (3 * i + 5) % 16;
                    break;
                case 3: // 48 - 63
                    vars[4] = vars[2] ^ (vars[1] | (~vars[3]));
                    vars[5] = (7 * i) % 16;
                    break;
                default:
                    // unreachable
                    return;
            }

            vars[4] = vars[4] + vars[0] + K[i] + this._buf.getWord(vars[5]);
            vars[0] = vars[3];
            vars[3] = vars[2];
            vars[2] = vars[1];
            vars[1] = vars[1] + this._lrot(vars[4], s(i));
        }

        this._digest.setWord(0, this._digest.getWord(0) + vars[0]);
        this._digest.setWord(1, this._digest.getWord(1) + vars[1]);
        this._digest.setWord(2, this._digest.getWord(2) + vars[2]);
        this._digest.setWord(3, this._digest.getWord(3) + vars[3]);
    }

    private _resetDigest() {
        this._digest.putWords([ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476 ]);
        this._head = 0;
    }

    private _lrot(n: number, v: number): number {
        return (n << v) | (n >>> (32 - v));
    }

}
