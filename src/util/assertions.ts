
/** @internal */
export function assertReal<T>(x: T, descriptor: string): Exclude<T, null | undefined> {
    if (typeof x === "undefined") throw new TypeError(`'${descriptor}' may not be undefined`);
    if (null === x) throw new TypeError(`'${descriptor}' may not be null`);
    // @ts-ignore
    return x;
}

/** @internal */
export function assertObject<T>(x: T): void {
    if (typeof x !== "object") throw new Error(`Expected object, got ${typeof x}`);
}

/** @internal */
export function assertNever(x: never): never {
    throw new Error(`Unexpected value: ${x}`);
}
