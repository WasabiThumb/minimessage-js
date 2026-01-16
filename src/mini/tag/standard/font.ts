import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";

/** @internal */
export namespace FontTag {

    function create(args: ArgumentQueue, ctx: Context): Tag {
        let font: string;
        const valueOrNamespace = args
            .popOr("A font tag must have either arguments of either <value> or <namespace:value>")
            .value();

        if (args.hasNext()) {
            const value = args.pop().value();
            font = `${valueOrNamespace}:${value}`;
        } else {
            font = valueOrNamespace;
        }

        return Tag.styling((b) => b.font(font));
    }

    //

    export const FONT = "font";
    export const RESOLVER = TagResolver.dynamic(FONT, create);

}
