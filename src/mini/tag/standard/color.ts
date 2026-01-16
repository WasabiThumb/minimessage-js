import {TagResolver} from "../resolver";
import {NamedTextColor, TextColor} from "../../../text/style/textColor";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Tag} from "../../tag";
import {Context} from "../../context";
import {Character} from "../../../util/char";

//

/** @internal */
export class ColorTagResolver implements TagResolver {

    static readonly INSTANCE = new ColorTagResolver();
    static readonly COLOR = "color";
    private static readonly COLOR_2 = "c";
    private static readonly COLOR_3 = "colour";
    private static readonly COLOR_ALIASES: Record<string, NamedTextColor> = Object.freeze({
        "dark_grey": NamedTextColor.DARK_GRAY,
        "grey": NamedTextColor.GRAY
    });

    private static isColorOrAbbreviation(name: string): boolean {
        return this.COLOR === name ||
            this.COLOR_2 === name ||
            this.COLOR_3 === name;
    }

    static resolveColorOrNull(colorName: string): TextColor | null {
        let color: TextColor | null;
        if (colorName in this.COLOR_ALIASES) {
            color = this.COLOR_ALIASES[colorName];
        } else if (colorName.charCodeAt(0) === Character.NUMBER_SIGN.value) {
            color = TextColor.fromHexString(colorName);
        } else if (colorName in NamedTextColor.NAMES) {
            color = NamedTextColor.NAMES[colorName];
        } else {
            color = null;
        }
        return color;
    }

    static resolveColor(colorName: string, ctx: Context): TextColor | null {
        const color = this.resolveColorOrNull(colorName);
        if (color === null)
            throw ctx.newException(`Unable to parse a color from '${colorName}'. Please use named colours or hex (#RRGGBB) colors.`);
        return color;
    }

    //

    has(name: string): boolean {
        return ColorTagResolver.isColorOrAbbreviation(name) ||
            name in NamedTextColor.NAMES ||
            name in ColorTagResolver.COLOR_ALIASES ||
            TextColor.fromHexString(name) !== null;
    }

    resolve(name: string, args: ArgumentQueue, ctx: Context): Tag | null {
        if (!this.has(name))
            return null;

        let colorName: string;
        if (ColorTagResolver.isColorOrAbbreviation(name)) {
            colorName = args.popOr("Expected to find a color parameter: <name>|#RRGGBB").lowerValue();
        } else {
            colorName = name;
        }

        const color = ColorTagResolver.resolveColor(colorName, ctx);
        return Tag.styling((style) => {
            style.color(color);
        });
    }

}
