import type {Unit} from "./unit.ts";
import {type ArgumentMap} from "./argument.ts";
import {LiteralStringOperation} from "./operation/literalString.ts";
import {MiniDeserializeOperation} from "./operation/miniDeserialize.ts";
import {MiniSerializeOperation} from "./operation/miniSerialize.ts";
import {DomRenderOperation} from "./operation/domRender.ts";
import {TruncateColorsOperation} from "./operation/truncateColors.ts";
import {HtmlRenderOperation} from "./operation/htmlRender.ts";

//

export interface Operation<
    I extends Unit = Unit,
    O extends Unit = Unit,
    A extends Record<string, any> = Record<string, any>
> {

    readonly id: string;

    readonly name: string;

    readonly accepts: I["type"];

    readonly provides: O["type"];

    readonly arguments: ArgumentMap<A>;

    readonly version: number;

    execute(input: I, args: A): O;

}

export type OperationMap = {
    [LiteralStringOperation.ID]: LiteralStringOperation,
    [MiniSerializeOperation.ID]: MiniSerializeOperation,
    [MiniDeserializeOperation.ID]: MiniDeserializeOperation,
    [DomRenderOperation.ID]: DomRenderOperation,
    [HtmlRenderOperation.ID]: HtmlRenderOperation,
    [TruncateColorsOperation.ID]: TruncateColorsOperation,
};

export namespace Operation {

    const MAP: OperationMap = {
        [LiteralStringOperation.ID]: LiteralStringOperation.INSTANCE,
        [MiniSerializeOperation.ID]: MiniSerializeOperation.INSTANCE,
        [MiniDeserializeOperation.ID]: MiniDeserializeOperation.INSTANCE,
        [DomRenderOperation.ID]: DomRenderOperation.INSTANCE,
        [HtmlRenderOperation.ID]: HtmlRenderOperation.INSTANCE,
        [TruncateColorsOperation.ID]: TruncateColorsOperation.INSTANCE,
    };

    export function all(): Operation[] {
        return Object.values(MAP);
    }

    export function get<K extends keyof OperationMap>(key: K): OperationMap[K] {
        if (key in MAP) return MAP[key];
        throw new Error(`Unrecognized operation ID: '${key}'`);
    }

}
