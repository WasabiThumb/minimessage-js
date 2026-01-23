import {Operation} from "../operation.ts";
import {type ComponentUnit, type StringUnit, Unit} from "../unit.ts";
import type {ArgumentMap} from "../argument.ts";
import {HtmlComponentRenderer, HtmlWriter} from "minimessage-js";

//

type Args = {
    // TODO: translations
};

class HtmlRenderOperationImpl implements HtmlRenderOperation {

    readonly id = HtmlRenderOperation.ID;
    readonly name = "Render to HTML String";
    readonly accepts = "component";
    readonly provides = "string";
    readonly version = 0;

    get arguments(): ArgumentMap<Args> {
        return {};
    }

    execute(unit: ComponentUnit, _args: Args): StringUnit {
        const renderer = HtmlComponentRenderer.renderer();
        const writer = HtmlWriter.string();
        renderer.render(unit.value, writer);
        return Unit.string(writer.toString());
    }

}

//

export type HtmlRenderOperation = Operation<ComponentUnit, StringUnit, Args>;

export namespace HtmlRenderOperation {
    export const ID = "htmlRender";
    export const INSTANCE: HtmlRenderOperation = new HtmlRenderOperationImpl();
}
