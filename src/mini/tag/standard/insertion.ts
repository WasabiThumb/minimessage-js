import { Context } from "../../context";
import { Tag } from "../../tag";
import { TagResolver } from "../resolver";
import { ArgumentQueue } from "../resolver/argumentQueue";

/**
 * @internal
 */
export namespace InsertionTag {
    function create(args: ArgumentQueue, ctx: Context): Tag {
        const insertion = args.popOr("A value is required to produce an insertion component").value();
        return Tag.styling((s) => s.insertion(insertion));
    }

    //

    export const INSERTION = "insert";
    export const RESOLVER = TagResolver.dynamic(INSERTION, create);
}
