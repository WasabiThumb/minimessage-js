
export type AccessorFunction<GetType, SetType> = {
    (): GetType;
    <Self>(this: Self, value: SetType): Self;
}

export type ContextualAccessorFunction<Context, GetType, SetType> = {
    (context: Context): GetType;
    <Self>(this: Self, context: Context, value: SetType): Self;
}

//

export const defineAccessor = (<GetType, SetType = GetType>(
    getter: () => GetType,
    setter: (value: SetType) => any
): AccessorFunction<GetType, SetType> => {
    return function () {
        // @ts-ignore
        const me = this;
        const count = arguments.length;
        if (count === 0) {
            return getter.apply(me, []);
        } else if (count === 1) {
            // @ts-ignore
            return setter.apply(me, [ ...arguments ]);
        } else {
            throw new Error(`Too many arguments passed to accessor (expected 0 or 1, got ${count})`);
        }
    } as unknown as AccessorFunction<GetType, SetType>;
});

export const defineContextualAccessor = (<Context, GetType, SetType = GetType>(
    getter: (context: Context) => GetType,
    setter: (context: Context, value: SetType) => any
): ContextualAccessorFunction<Context, GetType, SetType> => {
    return function () {
        // @ts-ignore
        const me = this;
        const count = arguments.length;
        if (count === 0) {
            throw new Error(`No arguments passed to contextual accessor (expected 1 or 2)`);
        } else if (count === 1) {
            // @ts-ignore
            return getter.apply(me, [ ...arguments ]);
        } else if (count === 2) {
            // @ts-ignore
            return setter.apply(me, [ ...arguments ]);
        } else {
            throw new Error(`Too many arguments passed to contextual accessor (expected 1 or 2, got ${count})`);
        }
    } as unknown as ContextualAccessorFunction<Context, GetType, SetType>;
});
