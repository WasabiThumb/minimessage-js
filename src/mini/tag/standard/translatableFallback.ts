import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {Component} from "../../../text/component";
import {TagResolver} from "../resolver";

/** @internal */
export namespace TranslatableFallbackTag {

    function create(args: ArgumentQueue, ctx: Context): Tag {
        const key = args.popOr("A translation key is required").value();
        const fallback = args.popOr("A fallback message is required").value();
        return Tag.inserting(Component.translatable(key, fallback, constructWith(args, ctx)));
    }

    export function constructWith(args: ArgumentQueue, ctx: Context): Component[] {
        let ret: Component[] = [];
        while (args.hasNext()) {
            ret.push(ctx.deserialize(args.pop().value()));
        }
        return ret;
    }

    export const TR_OR = "tr_or";
    export const TRANSLATE_OR = "translate_or";
    export const LANG_OR = "lang_or";
    export const RESOLVER = TagResolver.dynamic(
        TRANSLATE_OR,
        create,
        TR_OR, LANG_OR
    );

}
