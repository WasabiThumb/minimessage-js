import { Component } from "../../../text/component";
import { Context } from "../../context";
import { Tag } from "../../tag";
import { TagResolver } from "../resolver";
import { ArgumentQueue } from "../resolver/argumentQueue";

/**
 * @internal
 */
export namespace SelectorTag {
    function create(args: ArgumentQueue, ctx: Context): Tag {
        const key = args.popOr("A selection key is required").value();
        let separator: Component | null = null;
        if (args.hasNext()) {
            separator = ctx.deserialize(args.pop().value());
        }
        return Tag.inserting(Component.selector(key, separator));
    }

    //

    export const SELECTOR = "selector";
    export const SEL = "sel";
    export const RESOLVER = TagResolver.dynamic(SELECTOR, create, SEL);
}
