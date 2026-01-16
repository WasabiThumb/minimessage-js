import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";
import {Component} from "../../../text/component";
import {TranslatableFallbackTag} from "./translatableFallback";

/** @internal */
export namespace TranslatableTag {

    function create(args: ArgumentQueue, ctx: Context): Tag {
        const key = args.popOr("A translation key is required").value();
        return Tag.inserting(Component.translatable(key, null, TranslatableFallbackTag.constructWith(args, ctx)));
    }

    //

    export const TR = "tr";
    export const TRANSLATE = "translate";
    export const LANG = "lang";
    export const RESOLVER = TagResolver.dynamic(
        TRANSLATE,
        create,
        TR, LANG
    );

}
