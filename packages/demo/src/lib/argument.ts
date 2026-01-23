
interface BaseArgumentType<T> {
    readonly version: number;
    serialize(value: T): any;
    deserialize(data: any): T;
}

//

const ID_TEXT = "text";
export type TextArgumentType = BaseArgumentType<string> & { id: typeof ID_TEXT };
class TextArgumentTypeImpl implements TextArgumentType {

    static readonly INSTANCE: TextArgumentType = new TextArgumentTypeImpl();

    readonly id = ID_TEXT;
    readonly version = 0;

    serialize(value: string): any {
        return value;
    }

    deserialize(data: any): string {
        return `${data}`;
    }

}

const ID_BOOL = "bool";
export type BooleanArgumentType = BaseArgumentType<boolean> & { id: typeof ID_BOOL };
class BooleanArgumentTypeImpl implements BooleanArgumentType {

    static readonly INSTANCE: BooleanArgumentType = new BooleanArgumentTypeImpl();

    readonly id = ID_BOOL;
    readonly version = 0;

    serialize(value: boolean): any {
        return value ? 1 : 0;
    }

    deserialize(data: any): boolean {
        return !!data;
    }

}

//

export type ArgumentTypeMap = {
    [ID_TEXT]: TextArgumentType,
    [ID_BOOL]: BooleanArgumentType,
};

export type ArgumentType<T> =
    T extends string ? TextArgumentType :
        (T extends boolean ? BooleanArgumentType : never);

export namespace ArgumentType {

    const MAP: ArgumentTypeMap = {
        [ID_TEXT]: TextArgumentTypeImpl.INSTANCE,
        [ID_BOOL]: BooleanArgumentTypeImpl.INSTANCE,
    };

    export function get<K extends keyof ArgumentTypeMap>(id: K): ArgumentTypeMap[K] {
        if (id in MAP) return MAP[id];
        throw new Error(`Unrecognized argument type '${id}'`);
    }

}

//


export type Argument<T> = {
    readonly type: ArgumentType<T>,
    readonly description: string,
    readonly defaultValue: T
}

export type ArgumentMap<R> = R extends Record<string, any> ?
    { [K in keyof R]: Argument<R[K]> } :
    never;

export namespace Argument {

    export function text(description: string, defaultValue: string = ""): Argument<string> {
        return Object.freeze({ type: TextArgumentTypeImpl.INSTANCE, description, defaultValue });
    }

    export function boolean(description: string, defaultValue?: boolean): Argument<boolean> {
        return Object.freeze({ type: BooleanArgumentTypeImpl.INSTANCE, description, defaultValue: !!defaultValue });
    }

}
