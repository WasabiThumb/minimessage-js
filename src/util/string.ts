import {Character, CharacterLike} from "./char";

//

export function codePointCount(
    data: string,
    from: number = 0,
    to: number = data.length
): number {
    let ret: number = 0;
    let codePoint: number;

    for (let i = from; i < to; i++) {
        codePoint = data.codePointAt(i)!;
        ret++;
        if (codePoint > 0xFFFF) i++;
    }

    return ret;
}

/**
 * A procedural StringBuilder, similar to the class of the same name in Java.
 * Internally uses a growing Uint16Array of UTF-16 code points.
 * @internal
 */
export class StringBuilder {

    private static readonly LOAD_FACTOR: number = 0.75;
    private _u16: Uint16Array;
    private readonly _initialCapacity: number;
    private _capacity: number;
    private _length: number;
    constructor(capacity: number = 16) {
        if (capacity < 0) throw new Error("Capacity must be positive");
        this._u16 = new Uint16Array(capacity);
        this._initialCapacity = capacity;
        this._capacity = capacity;
        this._length = 0;
    }

    get length(): number {
        return this._length;
    }

    clear(): void {
        this._length = 0;
        if (this._capacity > this._initialCapacity) {
            this.setCapacity(this._initialCapacity, false);
        }
    }

    isEmpty(): boolean {
        return this._length === 0;
    }

    // Ensure that the internal array can store "size" more elements
    protected provision(size: number): void {
        let required: number = this._length + size;
        if (required <= this._capacity) return;
        required = Math.ceil((required + 1) / StringBuilder.LOAD_FACTOR);
        this.setCapacity(required, true);
    }

    // Sets the capacity of the internal array
    private setCapacity(cap: number, mustCopy: boolean) {
        let buf: ArrayBuffer = this._u16.buffer as unknown as ArrayBuffer;
        if ("transfer" in buf) {
            // es2024
            buf = (buf as unknown as { transfer(len: number): ArrayBuffer }).transfer(cap << 1);
            this._u16 = new Uint16Array(buf);
        } else {
            const cpy = new Uint16Array(cap);
            if (mustCopy) cpy.set(this._u16, 0);
            this._u16 = cpy;
        }
        this._capacity = cap;
    }

    append(value: any): this {
        switch (typeof value) {
            case "string":
                return this.appendString(value);
            case "object":
                if (null === value) return this.appendString("null");
                if (value instanceof StringBuilder) return this.appendStringBuilder(value);
                return this.appendString(value.toString());
            default:
                return this.appendString(String(value));
        }
    }

    appendChar(value: CharacterLike): this {
        this.provision(1);
        this._u16[this._length++] = Character(value).value;
        return this;
    }

    appendString(
        value: string,
        start: number = 0,
        end: number = value.length
    ): this {
        const length = end - start;
        if (length < 0) throw new Error(`Negative range`);
        this.provision(length);
        for (let i= start; i < end; i++) {
            this._u16[this._length++] = value.charCodeAt(i);
        }
        return this;
    }

    appendStringBuilder(other: StringBuilder): this {
        this.provision(other._length);
        this._u16.set(other._u16.subarray(0, other._length), this._length);
        this._length += other._length;
        return this;
    }

    charCodeAt(index: number): number {
        if (index < 0 || index >= this._length)
            throw new Error(`Index ${index} out of bounds for length ${this._length}`);
        return this._u16[index];
    }

    indexOf(value: string): number | -1 {
        const l: number = value.length;
        if (l === 0) return -1;

        let z: number = 0;

        for (let i=0; i < this._length; i++) {
            if (value.charCodeAt(z) === this._u16[i]) {
                if ((++z) === l) return i - l + 1;
            } else {
                z = 0;
            }
        }
        return -1;
    }

    indexOfChar(char: number): number | -1 {
        for (let i=0; i < this._length; i++) {
            if (char === this._u16[i]) return i;
        }
        return -1;
    }

    /**
     * Converts the StringBuilder into a string.
     * @param offset Offset into the string (in codepoints) to start converting. Default is 0.
     * @param length Length (number of codepoints) to convert. Default is the length of the internal array.
     */
    toString(offset?: number, length?: number): string {
        if (typeof offset === "undefined") {
            offset = 0;
        } else if (offset < 0) {
            throw new Error(`Offset cannot be negative`);
        } else if (offset >= this._length) {
            throw new Error(`Index ${offset} out of bounds for length ${this._length}`);
        }

        if (typeof length === "undefined") {
            length = (this._length - offset);
            if (length < 0) throw new Error(`Offset ${offset} out of bounds for length ${this._length}`);
        } else if (length < 0) {
            throw new Error(`Length cannot be negative`);
        } else if (length > (this._length - offset)) {
            throw new Error(`Index ${length + offset - 1} out of bounds for length ${this._length}`);
        }

        return this.toString0(offset, length);
    }

    private toString0(offset: number, length: number): string {
        // Reused this method from EnQR
        // https://github.com/WasabiThumb/enqr/blob/528d07445418d8d81b3bcfb9c83873903f3d499d/src/util/string/charset.ts#L16

        let ret: string = "";

        // Using fromCodePoint.apply, we will eventually hit the stack size limit. Artificially limiting to 255
        // will support essentially every environment ever, while not greatly affecting speed.
        const codePointBufferSize: number = Math.min(length, 255);
        const codePointBuffer: number[] = new Array(codePointBufferSize);
        let codePointBufferPos: number = 0;

        let code: number;
        let i: number = 0;
        while (i < length) {
            code = this._u16[(i++) + offset];

            // Surrogate pairs
            if (code >= 0xD800 && code <= 0xDFFF && i < length) {
                let lo: number = this._u16[(i++) + offset];
                code = ((code - 0xD800) << 10) + lo + 0x2400;
            }

            codePointBuffer[codePointBufferPos++] = code;
            if (codePointBufferPos === codePointBufferSize) {
                ret += String.fromCodePoint.apply(null, codePointBuffer) as unknown as string;
                codePointBufferPos = 0;
            }
        }

        if (codePointBufferPos !== 0) {
            codePointBuffer.length = codePointBufferPos;
            ret += String.fromCodePoint.apply(null, codePointBuffer) as unknown as string;
        }

        return ret;
    }

}
