import {Character} from "./char";

//

type PutFunction<K, V> = (key: K, value: V) => void;
type PopulateFunction<K, V> = (put: PutFunction<K, V>) => void;

type BucketRef<K, V> = Bucket<K, V> | null;
type Bucket<K, V> = {
    readonly key: K,
    readonly value: V,
    next: BucketRef<K, V>
};
type Buckets<K, V> = BucketRef<K, V>[];

//

const LOAD_FACTOR = 0.75;

const mod = ((a: number, b: number) => {
    return ((a % b) + b) % b;
});

const hashNumber = (() => {
    const buf = new ArrayBuffer(8);
    const i32 = new Int32Array(buf);
    const f64 = new Float64Array(buf);

    return ((n: number) => {
        if (Number.isSafeInteger(n)) return n;
        f64[0] = n;
        return i32[0] ^ i32[1];
    });
})();

const uav = Character.UPPERCASE_A.value;
const uzv = Character.UPPERCASE_Z.value;
const ulo = Character.LOWERCASE_A.value - Character.UPPERCASE_A.value;

//

/** @internal */
export interface LookupTable<K, V> {

    has(key: K): boolean;

    get(key: K): V | null;

}

//

abstract class AbstractLookupTable<K, V> implements LookupTable<K, V> {

    private readonly _buckets: Buckets<K, V>;
    private readonly _capacity: number;

    protected constructor(populate: PopulateFunction<K, V>) {
        const queue: [ K, V ][] = [];
        const put: PutFunction<K, V> = ((k, v) => queue.push([ k, v ]));
        populate(put);

        const length = queue.length;
        const capacity = Math.ceil(length / LOAD_FACTOR);
        const buckets: Buckets<K, V> = new Array(capacity);
        buckets.fill(null);

        for (const entry of queue) {
            const [key, value] = entry;
            const newBucket: Bucket<K, V> = { key, value, next: null };

            const index = mod(this.hash(key), capacity);
            const existing = buckets[index];
            if (!existing) {
                buckets[index] = newBucket;
                continue;
            }

            let parent: Bucket<K, V> = existing;
            while (true) {
                if (this.eq(key, parent.key)) throw new Error(`Duplicate key (${value})`);
                const next = parent.next;
                if (!next) break;
                parent = next;
            }
            parent.next = newBucket;
        }

        this._buckets = buckets;
        this._capacity = capacity;
    }

    //

    has(key: K): boolean {
        const index = mod(this.hash(key), this._capacity);
        let bucket: BucketRef<K, V> = this._buckets[index];
        while (bucket) {
            if (this.eq(key, bucket.key)) return true;
            bucket = bucket.next;
        }
        return false;
    }

    get(key: K): V | null {
        const index = mod(this.hash(key), this._capacity);
        let bucket: BucketRef<K, V> = this._buckets[index];
        while (bucket) {
            if (this.eq(key, bucket.key)) return bucket.value;
            bucket = bucket.next;
        }
        return null;
    }

    protected abstract hash(value: K): number;

    protected abstract eq(a: K, b: K): boolean;

}

class NumberLookupTable<V> extends AbstractLookupTable<number, V> {

    constructor(populate: PopulateFunction<number, V>) {
        super(populate);
    }

    //

    protected eq(a: number, b: number): boolean {
        return a === b;
    }

    protected hash(k: number): number {
        return hashNumber(k);
    }

}

class StringLookupTable<V> extends AbstractLookupTable<string, V> {

    private readonly _asciiCaseInsensitive: boolean;

    constructor(populate: PopulateFunction<string, V>, asciiCaseInsensitive: boolean = false) {
        super(populate);
        this._asciiCaseInsensitive = asciiCaseInsensitive;
    }

    //

    protected eq(a: string, b: string): boolean {
        if (!this._asciiCaseInsensitive)
            return a === b;

        const length = a.length;
        if (length !== b.length)
            return false;

        let ac: number;
        let bc: number;

        for (let i = 0; i < length; i++) {
            ac = a.charCodeAt(i);
            bc = b.charCodeAt(i);

            if (uav <= ac && ac <= uzv) ac += ulo;
            if (uav <= bc && bc <= uzv) bc += ulo;

            if (ac !== bc)
                return false;
        }

        return true;
    }

    protected hash(value: string): number {
        let h: number = 7;
        for (let i = 0; i < value.length; i++) {
            let c: number = value.charCodeAt(i);
            if (this._asciiCaseInsensitive && uav <= c && c <= uzv) c += ulo;
            h = 31 * h + c;
        }
        return h;
    }

}

//

/** @internal */
export namespace LookupTable {

    export function number<T>(populate: PopulateFunction<number, T>): LookupTable<number, T> {
        return new NumberLookupTable<T>(populate);
    }

    export function caseInsensitiveString<T>(populate: PopulateFunction<string, T>): LookupTable<string, T> {
        return new StringLookupTable<T>(populate, true);
    }

}
