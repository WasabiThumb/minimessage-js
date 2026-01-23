import type {Operation} from "../operation.ts";
import {type NothingUnit, type StringUnit, Unit} from "../unit.ts";
import {Argument, type ArgumentMap} from "../argument.ts";

//

type Args = {
    value: string
};

class LiteralStringOperationImpl implements LiteralStringOperation {

    readonly id = LiteralStringOperation.ID;
    readonly name = "String";
    readonly accepts = "nothing";
    readonly provides = "string";
    readonly version = 0;

    get arguments(): ArgumentMap<Args> {
        return {
            value: Argument.text("Value")
        };
    }

    execute(_unit: NothingUnit, args: Args): StringUnit {
        const { value } = args;
        return Unit.string(value);
    }

}

//

export type LiteralStringOperation = Operation<NothingUnit, StringUnit, Args>;

export namespace LiteralStringOperation {
    export const ID = "literalString";
    export const INSTANCE: LiteralStringOperation = new LiteralStringOperationImpl();
}
