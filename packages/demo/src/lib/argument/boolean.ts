import type {ArgumentType} from "../argument.ts";

//

class BooleanArgumentTypeImpl implements BooleanArgumentType {

    readonly id = BooleanArgumentType.ID;
    readonly version = 0;

    serialize(value: boolean): any {
        return value ? 1 : 0;
    }

    deserialize(data: any): boolean {
        return !!data;
    }

}

export type BooleanArgumentType = ArgumentType<boolean>;

export namespace BooleanArgumentType {
    export const ID = "bool";
    export const INSTANCE: BooleanArgumentType = new BooleanArgumentTypeImpl();
}

