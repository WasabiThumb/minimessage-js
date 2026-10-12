import { Character } from "./char";

//

type PutFunction<K, V> = (key: K, value: V) => void;
type PopulateFunction<K, V> = (put: PutFunction<K, V>) => void;
type Entries<K, V> = (K | V)[];

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

    private readonly _entries: Entries<K, V>;

    protected constructor(populate: PopulateFunction<K, V>) {
        let entries: Entries<K, V> = [];
        populate((k, v) => {
            this._search(
                entries,
                k,
                () => {
                    throw new Error(`duplicate entry: ${k}`)
                },
                (o) => {
                    entries.splice(o, 0, k, v)
                }
            );
        });
        this._entries = entries;
    }

    //

    has(key: K): boolean {
        return this._search(
            this._entries,
            key,
            () => true,
            () => false
        );
    }

    get(key: K): V | null {
        return this._search(
            this._entries,
            key,
            (o) => this._entries[o | 1] as V,
            () => null
        );
    }

    protected abstract cmp(a: K, b: K): number;

    private _search<R>(
        haystack: Entries<K, V>,
        needle: K,
        hit: (offset: number) => R,
        miss: (offset: number) => R
    ): R {
        let len = haystack.length >>> 1;
        let off = 0;
        while (len > 0) {
            const hl = len >>> 1;
            const q = (off + hl) << 1;
            const c = this.cmp(needle, haystack[q] as K);
            if (c === 0) return hit(q);
            if (c < 0) {
                len = hl;
            } else {
                off += hl + 1;
                len -= hl + 1;
            }
        }
        return miss(off << 1);
    }

}

class NumberLookupTable<V> extends AbstractLookupTable<number, V> {

    constructor(populate: PopulateFunction<number, V>) {
        super(populate);
    }

    //

    protected cmp(a: number, b: number): number {
        return a - b;
    }

}

class StringLookupTable<V> extends AbstractLookupTable<string, V> {

    private readonly _asciiCaseInsensitive: boolean;

    constructor(populate: PopulateFunction<string, V>, asciiCaseInsensitive: boolean = false) {
        super(populate);
        this._asciiCaseInsensitive = asciiCaseInsensitive;
    }

    //

    protected cmp(a: string, b: string): number {
        const al = a.length;
        const bl = b.length;
        for (let i = 0; i < Math.min(al, bl); i++) {
            let ac: number = a.charCodeAt(i);
            let bc: number = b.charCodeAt(i);
            if (this._asciiCaseInsensitive) {
                if (uav <= ac && ac <= uzv) ac += ulo;
                if (uav <= bc && bc <= uzv) bc += ulo;
            }
            const c = ac - bc;
            if (c !== 0) return c;
        }
        return al - bl;
    }

}

//

/** @internal */
export namespace LookupTable {

    export function number<T>(populate: PopulateFunction<number, T>): LookupTable<number, T> {
        return new NumberLookupTable<T>(populate);
    }

    export function string<T>(populate: PopulateFunction<string, T>): LookupTable<string, T> {
        return new StringLookupTable(populate, false);
    }

    export function caseInsensitiveString<T>(populate: PopulateFunction<string, T>): LookupTable<string, T> {
        return new StringLookupTable<T>(populate, true);
    }

}
