import type {Operation} from "../operation.ts";
import {type ComponentUnit, type RichUnit, Unit} from "../unit.ts";
import {Argument, type ArgumentMap} from "../argument.ts";
import {HtmlComponentRenderer, HtmlWriter} from "minimessage-js";

//

type Args = {
    unsafe: boolean,
    // TODO: translations
};

class DomRenderOperationImpl implements DomRenderOperation {

    readonly id = DomRenderOperation.ID;
    readonly name = "Render to DOM";
    readonly accepts = "component";
    readonly provides = "rich";
    readonly version = 0;

    get arguments(): ArgumentMap<Args> {
        return {
            unsafe: Argument.boolean("Unsafe Injection"),
        };
    }

    execute(unit: ComponentUnit, args: Args): RichUnit {
        let { value } = unit;
        const { unsafe } = args;
        const renderer = HtmlComponentRenderer.renderer();

        if (unsafe) {
            return Unit.rich((element) => {
                const writer = HtmlWriter.string();
                renderer.render(value, writer);
                element.innerHTML = writer.toString();
            });
        } else {
            return Unit.rich((element) => {
                const writer = HtmlWriter.dom(element);
                renderer.render(value, writer);
            });
        }
    }

}

//

export type DomRenderOperation = Operation<ComponentUnit, RichUnit, Args>;

export namespace DomRenderOperation {
    export const ID = "domRender";
    export const INSTANCE: DomRenderOperation = new DomRenderOperationImpl();
}