
/**
 * A procedural StringBuilder, similar to the class of the same name in Java.
 * Internally uses a growing Uint16Array of UTF-16 code points.
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
        let buf: ArrayBuffer = this._u16.buffer;
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

    append(value: string | StringBuilder | { toString(): string }): this {
        if (typeof value === "string") {
            this.appendString(value);
        } else {
            if (value instanceof StringBuilder) {
                this.appendStringBuilder(value);
            } else {
                this.appendString(value.toString());
            }
        }
        return this;
    }

    appendLeftAngleBracket(): this {
        return this.appendChar(60); // <
    }

    appendRightAngleBracket(): this {
        return this.appendChar(62); // >
    }

    appendSpace(): this {
        return this.appendChar(32); // space
    }

    appendSemicolon(): this {
        return this.appendChar(59); // ;
    }

    appendChar(value: number): this {
        this.provision(1);
        this._u16[this._length++] = value;
        return this;
    }

    appendString(value: string): this {
        this.provision(value.length);
        for (let i=0; i < value.length; i++) {
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
     * Reduces the length of the StringBuilder by the specified amount. This should only ever be used to reduce the
     * length by a very small amount, since it won't cause any data to be freed. For that, use {@link clear}.
     */
    shrink(amount: number): void {
        this._length = Math.max(this._length - amount, 0);
    }

    /**
     * Converts the StringBuilder into a string.
     * @param offset Offset into the string (in codepoints) to start converting. Default is 0.
     * @param length Length (number of codepoints) to convert. Default is the length of the internal array.
     */
    toString(offset?: number, length?: number): string {
        if (arguments.length === 0) {
            return this.toString0(0, this._length);
        } else {
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
