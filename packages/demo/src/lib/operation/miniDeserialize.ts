import type {Operation} from "../operation.ts";
import {type ComponentUnit, type StringUnit, Unit} from "../unit.ts";
import {Argument, type ArgumentMap} from "../argument.ts";
import {MiniMessage} from "minimessage-js";

//

type Args = {
    strict: boolean,
    verbose: boolean,
};

class MiniDeserializeOperationImpl implements MiniDeserializeOperation {

    readonly id = MiniDeserializeOperation.ID;
    readonly name = "MiniMessage Deserialize";
    readonly accepts = "string";
    readonly provides = "component";
    readonly version = 0;

    get arguments(): ArgumentMap<Args> {
        return {
            strict: Argument.boolean("Strict Mode"),
            verbose: Argument.boolean("No Compaction")
        };
    }

    execute(unit: StringUnit, args: Args): ComponentUnit {
        const { value } = unit;
        const { strict, verbose } = args;

        const mini = MiniMessage.builder()
            .strict(strict)
            .postProcessor((c) => {
                return verbose ? c : c.compact();
            })
            .build();

        const component = mini.deserialize(value);
        return Unit.component(component);
    }

}

//

export type MiniDeserializeOperation = Operation<StringUnit, ComponentUnit, Args>;

export namespace MiniDeserializeOperation {
    export const ID = "miniDeserialize";
    export const INSTANCE: MiniDeserializeOperation = new MiniDeserializeOperationImpl();
}
