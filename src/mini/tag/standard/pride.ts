import { TextColor } from "../../../text/style/textColor";
import { LookupTable } from "../../../util/lut";
import { Context } from "../../context";
import { Tag } from "../../tag";
import { TagResolver } from "../resolver";
import { ArgumentQueue } from "../resolver/argumentQueue";
import { GradientTag } from "./gradient";

/**
 * @internal
 */
export namespace PrideTag {
    function colors(...values: number[]): TextColor[] {
        const { length } = values;
        const ret = new Array<TextColor>(length);
        for (let i = 0; i < length; i++) {
            ret[i] = TextColor.color(values[i]);
        }
        return ret;
    }

    export const PRIDE = "pride";

    // https://github.com/PaperMC/adventure/blob/f4821cd32057a486c94b7c117e2293ffcd8153ec/text-minimessage/src/main/java/net/kyori/adventure/text/minimessage/tag/standard/PrideTag.java#L51
    const FLAGS: LookupTable<string, TextColor[]> = LookupTable.caseInsensitiveString((put) => {
        put(PRIDE, colors(0xe50000, 0xff8d00, 0xffee00, 0x28121, 0x004cff, 0x770088));
        put(
            "progress",
            colors(
                0xffffff,
                0xffafc7,
                0x73d7ee,
                0x613915,
                0x000000,
                0xe50000,
                0xff8d00,
                0xffee00,
                0x28121,
                0x004cff,
                0x770088,
            ),
        );
        put("trans", colors(0x5bcffb, 0xf5abb9, 0xffffff, 0xf5abb9, 0x5bcffb));
        put("bi", colors(0xd60270, 0x9b4f96, 0x0038a8));
        put("pan", colors(0xff1c8d, 0xffd700, 0x1ab3ff));
        put("nb", colors(0xfcf431, 0xfcfcfc, 0x9d59d2, 0x282828));
        put("lesbian", colors(0xd62800, 0xff9b56, 0xffffff, 0xd462a6, 0xa40062));
        put("ace", colors(0x000000, 0xa4a4a4, 0xffffff, 0x810081));
        put("agender", colors(0x000000, 0xbababa, 0xffffff, 0xbaf484, 0xffffff, 0xbababa, 0x000000));
        put("demisexual", colors(0x000000, 0xffffff, 0x6e0071, 0xd3d3d3));
        put("genderqueer", colors(0xb57fdd, 0xffffff, 0x49821e));
        put("genderfluid", colors(0xfe76a2, 0xffffff, 0xbf12d7, 0x000000, 0x303cbe));
        put("intersex", colors(0xffd800, 0x7902aa, 0xffd800));
        put("aro", colors(0x3ba740, 0xa8d47a, 0xffffff, 0xababab, 0x000000));
        put("femboy", colors(0xd260a5, 0xe4afcd, 0xfefefe, 0x57cef8, 0xfefefe, 0xe4afcd, 0xd260a5));
        put(
            "intersex inclusive",
            colors(
                0xffd800,
                0x7902aa,
                0xffd800,
                0xffffff,
                0xffafc7,
                0x73d7ee,
                0x613915,
                0x000000,
                0xe50000,
                0xff8d00,
                0xffee00,
                0x28121,
                0x004cff,
                0x770088,
            ),
        );
        put("baker", colors(0xcd66ff, 0xff6599, 0xfe0000, 0xfe9900, 0xffff01, 0x009900, 0x0099cb, 0x350099, 0x990099));
        put("philly", colors(0x000000, 0x784f17, 0xfe0000, 0xfd8c00, 0xffe500, 0x119f0b, 0x0644b3, 0xc22edc));
        put("queer", colors(0x000000, 0x9ad9ea, 0x00a3e8, 0xb5e51d, 0xffffff, 0xffc90d, 0xfc6667, 0xfeaec9, 0x000000));
        put("gay", colors(0x078e70, 0x26ceaa, 0x98e8c1, 0xffffff, 0x7bade2, 0x5049cb, 0x3d1a78));
        put("bigender", colors(0xc479a0, 0xeca6cb, 0xd5c7e8, 0xffffff, 0xd5c7e8, 0x9ac7e8, 0x6c83cf));
        put("demigender", colors(0x7f7f7f, 0xc3c3c3, 0xfbff74, 0xffffff, 0xfbff74, 0xc3c3c3, 0x7f7f7f));
    });

    function create(args: ArgumentQueue, ctx: Context): Tag {
        let phase: number = 0;
        let flag: string = PRIDE;

        if (args.hasNext()) {
            const value = args.pop().lowerValue();
            if (FLAGS.has(value)) {
                flag = value;
            } else if (value.length !== 0) {
                phase = parseFloat(value);
                if (isNaN(phase)) ctx.newException(`Expected phase, got ${value}`, args);
            }
            if (phase < -1 || phase > 1) {
                throw ctx.newException(
                    `Gradient phase is out of range (${phase}). Must be in the range [-1.0, 1.0] (inclusive).`,
                    args,
                );
            }
        }

        return GradientTag.of(phase, FLAGS.get(flag)!);
    }

    export const RESOLVER = TagResolver.dynamic(PRIDE, create);
}
