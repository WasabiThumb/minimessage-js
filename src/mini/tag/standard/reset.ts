import { ParserDirectiveTag } from "../impls/directive";
import { TagResolver } from "../resolver";

/**
 * @internal
 */
export namespace ResetTag {
    export const RESET = "reset";
    export const RESOLVER = TagResolver.resolver(RESET, ParserDirectiveTag.RESET);
}
