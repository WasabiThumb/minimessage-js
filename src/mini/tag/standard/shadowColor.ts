import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";
import {ShadowColor} from "../../../text/style/shadowColor";
import {Character} from "../../../util/char";
import {ColorTagResolver} from "./color";

/** @internal */
export namespace ShadowColorTag {

    export const SHADOW_COLOR = "shadow";
    const SHADOW_NONE = "!" + SHADOW_COLOR;
    const DEFAULT_ALPHA = 0.25;

    function create(args: ArgumentQueue, ctx: Context): Tag {
        const colorString = args.popOr(`Expected to find a color parameter: #RRGGBBAA`).lowerValue();
        let color: ShadowColor;

        if (colorString.length === 9 && Character.NUMBER_SIGN.is(colorString.charCodeAt(0))) {
            const sc = ShadowColor.fromHexString(colorString);
            if (sc === null) {
                throw ctx.newException(`Unable to parse a shadow color from '${colorString}'. Please use #RRGGBBAA formatting.`, args);
            }
            color = sc;
        } else {
            const text = ColorTagResolver.resolveColor(colorString, ctx)!;
            let alpha: number = DEFAULT_ALPHA;
            if (args.hasNext()) {
                const ac = args.pop().asFloat();
                if (ac === null) {
                    throw ctx.newException(`Number was expected to be a float`, args);
                }
                alpha = ac;
            }
            color = ShadowColor.shadowColor(text, Math.round(alpha * 255));
        }

        return Tag.styling((b) => b.shadowColor(color));
    }

    //

    const PRIMARY_RESOLVER = TagResolver.dynamic(SHADOW_COLOR, create);
    const NONE_RESOLVER = TagResolver.resolver(
        SHADOW_NONE,
        Tag.styling((s) => s.shadowColor(ShadowColor.none()))
    );

    export const RESOLVER = TagResolver.builder()
        .resolvers(PRIMARY_RESOLVER, NONE_RESOLVER)
        .build();

}
