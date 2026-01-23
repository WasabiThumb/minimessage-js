import type {ArgumentType} from "../argument.ts";

//

class TextArgumentTypeImpl implements TextArgumentType {

    readonly id = TextArgumentType.ID;
    readonly version = 0;

    serialize(value: string): any {
        return value;
    }

    deserialize(data: any): string {
        return `${data}`;
    }

}

export type TextArgumentType = ArgumentType<string>;

export namespace TextArgumentType {
    export const ID = "text";
    export const INSTANCE: TextArgumentType = new TextArgumentTypeImpl();
}

