import type {Operation} from "../operation.ts";
import {type ComponentUnit, Unit} from "../unit.ts";
import {Argument, type ArgumentMap} from "../argument.ts";
import {Component, LegacyColorComponentRenderer} from "minimessage-js";

//

type Args = {
    enabled: boolean
};

class TruncateColorsOperationImpl implements TruncateColorsOperation {

    readonly id = TruncateColorsOperation.ID;
    readonly name = "Truncate Colors";
    readonly accepts = "component";
    readonly provides = "component";
    readonly version = 0;

    get arguments(): ArgumentMap<Args> {
        return {
            enabled: Argument.boolean("Enabled", true)
        };
    }

    execute(unit: ComponentUnit, args: Args): ComponentUnit {
        if (!args.enabled) return unit;
        let component: Component = unit.value;
        component = LegacyColorComponentRenderer.renderer()
            .render(component);
        return Unit.component(component);
    }

}

//

export type TruncateColorsOperation = Operation<ComponentUnit, ComponentUnit, Args>;

export namespace TruncateColorsOperation {
    export const ID = "truncateColors";
    export const INSTANCE: TruncateColorsOperation = new TruncateColorsOperationImpl();
}

