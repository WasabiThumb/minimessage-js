import {TextColor} from "../../../text/style/textColor";
import {LookupTable} from "../../../util/lut";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {GradientTag} from "./gradient";
import {TagResolver} from "../resolver";

/** @internal */
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
        put(PRIDE, colors(0xE50000, 0xFF8D00, 0xFFEE00, 0x28121, 0x004CFF, 0x770088));
        put("progress", colors(0xFFFFFF, 0xFFAFC7, 0x73D7EE, 0x613915, 0x000000, 0xE50000, 0xFF8D00, 0xFFEE00, 0x28121, 0x004CFF, 0x770088));
        put("trans", colors(0x5BCFFB, 0xF5ABB9, 0xFFFFFF, 0xF5ABB9, 0x5BCFFB));
        put("bi", colors(0xD60270, 0x9B4F96, 0x0038A8));
        put("pan", colors(0xFF1C8D, 0xFFD700, 0x1AB3FF));
        put("nb", colors(0xFCF431, 0xFCFCFC, 0x9D59D2, 0x282828));
        put("lesbian", colors(0xD62800, 0xFF9B56, 0xFFFFFF, 0xD462A6, 0xA40062));
        put("ace", colors(0x000000, 0xA4A4A4, 0xFFFFFF, 0x810081));
        put("agender", colors(0x000000, 0xBABABA, 0xFFFFFF, 0xBAF484, 0xFFFFFF, 0xBABABA, 0x000000));
        put("demisexual", colors(0x000000, 0xFFFFFF, 0x6E0071, 0xD3D3D3));
        put("genderqueer", colors(0xB57FDD, 0xFFFFFF, 0x49821E));
        put("genderfluid", colors(0xFE76A2, 0xFFFFFF, 0xBF12D7, 0x000000, 0x303CBE));
        put("intersex", colors(0xFFD800, 0x7902AA, 0xFFD800));
        put("aro", colors(0x3BA740, 0xA8D47A, 0xFFFFFF, 0xABABAB, 0x000000));
        put("femboy", colors(0xD260A5, 0xE4AFCD, 0xFEFEFE, 0x57CEF8, 0xFEFEFE, 0xE4AFCD, 0xD260A5));
        put("intersex inclusive", colors(0xFFD800, 0x7902AA, 0xFFD800, 0xFFFFFF, 0xFFAFC7, 0x73D7EE, 0x613915, 0x000000, 0xE50000, 0xFF8D00, 0xFFEE00, 0x28121, 0x004CFF, 0x770088));
        put("baker", colors(0xCD66FF, 0xFF6599, 0xFE0000, 0xFE9900, 0xFFFF01, 0x009900, 0x0099CB, 0x350099, 0x990099));
        put("philly", colors(0x000000, 0x784F17, 0xFE0000, 0xFD8C00, 0xFFE500, 0x119F0B, 0x0644B3, 0xC22EDC));
        put("queer", colors(0x000000, 0x9AD9EA, 0x00A3E8, 0xB5E51D, 0xFFFFFF, 0xFFC90D, 0xFC6667, 0xFEAEC9, 0x000000));
        put("gay", colors(0x078E70, 0x26CEAA, 0x98E8C1, 0xFFFFFF, 0x7BADE2, 0x5049CB, 0x3D1A78));
        put("bigender", colors(0xC479A0, 0xECA6CB, 0xD5C7E8, 0xFFFFFF, 0xD5C7E8, 0x9AC7E8, 0x6C83CF));
        put("demigender", colors(0x7F7F7F, 0xC3C3C3, 0xFBFF74, 0xFFFFFF, 0xFBFF74, 0xC3C3C3, 0x7F7F7F));
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
                throw ctx.newException(`Gradient phase is out of range (${phase}). Must be in the range [-1.0, 1.0] (inclusive).`, args);
            }
        }

        return GradientTag.of(phase, FLAGS.get(flag)!);
    }

    export const RESOLVER = TagResolver.dynamic(PRIDE, create);

}
