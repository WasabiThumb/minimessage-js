import type {Operation} from "../operation.ts";
import {type ComponentUnit, type StringUnit, Unit} from "../unit.ts";
import {type ArgumentMap} from "../argument.ts";
import {MiniMessage} from "minimessage-js";

//

type Args = {};

class MiniSerializeOperationImpl implements MiniSerializeOperation {

    readonly id = MiniSerializeOperation.ID;
    readonly name = "MiniMessage Serialize";
    readonly accepts = "component";
    readonly provides = "string";
    readonly version = 0;

    get arguments(): ArgumentMap<Args> {
        return {};
    }

    execute(unit: ComponentUnit): StringUnit {
        return Unit.string(MiniMessage.miniMessage().serialize(unit.value));
    }

}

//

export type MiniSerializeOperation = Operation<ComponentUnit, StringUnit, Args>;

export namespace MiniSerializeOperation {
    export const ID = "miniSerialize";
    export const INSTANCE: MiniSerializeOperation = new MiniSerializeOperationImpl();
}
