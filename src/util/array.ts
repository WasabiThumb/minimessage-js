
namespace Flags {

    const SYMBOL = Symbol("flags");
    type Flagged = { [S in typeof SYMBOL]: number };

    export const FROZEN = 1;

    //

    export function getFlags(value: object): number {
        if (SYMBOL in value) return (value as unknown as Flagged)[SYMBOL];
        return 0;
    }

    export function setFlags(value: object, flags: number): void {
        if (SYMBOL in value) {
            (value as unknown as Flagged)[SYMBOL] = flags;
            return;
        }
        Object.defineProperty(value, SYMBOL, {
            value: flags,
            configurable: false,
            enumerable: false,
            writable: true
        });
    }

}

export namespace ArrayUtil {

    export function immutableView<T>(
        array: ArrayLike<T>,
        copyFunc: (value: T) => T = (v) => v
    ): T[] {
        let f = Flags.getFlags(array);
        if (f & Flags.FROZEN) return array as unknown as T[];

        const ret = new Array<T>(array.length);
        for (let i = 0; i < array.length; i++) ret[i] = copyFunc(array[i]);

        Flags.setFlags(ret, f | Flags.FROZEN);
        return Object.freeze(ret) as unknown as T[];
    }

    export function insertAtStart<T>(
        dest: T[],
        src: T[]
    ): void {
        if (src === dest) throw new Error(`'dest' and 'src' must be distinct`);

        const count = src.length;
        if (count === 0) return;

        const length = dest.length;
        dest.length = length + count;

        for (let i = (length - 1); i >= 0; i--) {
            dest[i + count] = dest[i];
        }

        for (let i = 0; i < count; i++) {
            dest[i] = src[i];
        }
    }

}
