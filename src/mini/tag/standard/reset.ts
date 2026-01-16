import {TagResolver} from "../resolver";
import {ParserDirectiveTag} from "../impls/directive";

/** @internal */
export namespace ResetTag {

    export const RESET = "reset";
    export const RESOLVER = TagResolver.resolver(RESET, ParserDirectiveTag.RESET);

}
