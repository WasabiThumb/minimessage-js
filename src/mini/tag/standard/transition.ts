import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";
import {TextColor} from "../../../text/style/textColor";
import {ColorTagResolver} from "./color";
import {Component} from "../../../text/component";

/** @internal */
export namespace TransitionTag {

    function resolveColor(
        colors: TextColor[],
        phase: number,
        negativePhase: boolean
    ): TextColor {
        const steps = 1 / (colors.length - 1);
        for (let colorIndex = 1; colorIndex < colors.length; colorIndex++) {
            const val = colorIndex * steps;
            if (val >= phase) {
                const factor = 1 + (phase - val) * (colors.length - 1);
                if (negativePhase) {
                    return TextColor.lerp(1 - factor, colors[colorIndex], colors[colorIndex - 1]);
                } else {
                    return TextColor.lerp(factor, colors[colorIndex - 1], colors[colorIndex]);
                }
            }
        }
        return colors[0];
    }

    function create(args: ArgumentQueue, ctx: Context): Tag {
        let phase: number = 0;
        let textColors: TextColor[] = [];

        if (args.hasNext()) {
            do {
                const arg = args.pop();
                const argValue = arg.value();
                const color = ColorTagResolver.resolveColorOrNull(argValue);

                if (color !== null) {
                    textColors.push(color);
                } else {
                    // phase?
                    if (!args.hasNext()) {
                        const possiblePhase = arg.asFloat();
                        if (possiblePhase !== null) {
                            if (possiblePhase < -1 || possiblePhase > 1) {
                                throw ctx.newException(`Gradient phase is out of range (${phase}). Must be in the range [-1.0f, 1.0f] (inclusive).`, args);
                            }
                            phase = possiblePhase;
                            break;
                        }
                    }
                    throw ctx.newException(`Unable to parse a color from '${argValue}'. Please use named colors or hex (#RRGGBB) colors.`, args);
                }
            } while (args.hasNext());

            if (textColors.length < 2) {
                throw ctx.newException(`Invalid transition, not enough colors. Transitions must have at least two colors.`, args);
            }
        }

        let negativePhase: boolean;
        if (phase < 0) {
            negativePhase = true;
            phase = 1 + phase;
            textColors.reverse();
        } else {
            negativePhase = false;
        }

        if (textColors.length === 0) {
            textColors.push(
                TextColor.color(0xFFFFFF),
                TextColor.color(0x000000)
            );
        }

        const finalColor = resolveColor(textColors, phase, negativePhase);
        const component = Component.text("").color(finalColor);
        return Tag.inserting(component);
    }

    //

    export const TRANSITION = "transition";
    export const RESOLVER = TagResolver.dynamic(TRANSITION, create);

}
