import {AbstractColorChangingTag} from "../impls/colorChanging";
import {TextColor} from "../../../text/style/textColor";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";
import {ColorTagResolver} from "./color";

//

/** @internal */
class GradientTagImpl extends AbstractColorChangingTag {

    private static readonly DEFAULT_WHITE = TextColor.color(0xFFFFFF);
    private static readonly DEFAULT_BLACK = TextColor.color(0x000000);

    static create(args: ArgumentQueue, ctx: Context): Tag {
        let phase: number = 0;
        let colors: TextColor[] = [];

        if (args.hasNext()) {
            while (args.hasNext()) {
                const arg = args.pop();
                const argValue = arg.value();
                const color = ColorTagResolver.resolveColorOrNull(argValue);

                if (color != null) {
                    colors.push(color);
                    continue;
                }

                if (!args.hasNext()) {
                    const possiblePhase = arg.asFloat();
                    if (possiblePhase !== null) {
                        phase = possiblePhase;
                        if (phase < -1 || phase > 1) {
                            throw ctx.newException(`Gradient phase is out of range (${phase}).  Must be in the range [-1.0, 1.0] (inclusive).`, args);
                        }
                        continue;
                    }
                }

                throw ctx.newException(`Unable to parse a color from '${argValue}'`, args);
            }
            if (colors.length === 1) {
                throw ctx.newException("Invalid gradient, not enough colors. Gradients must have at least two colors.", args);
            }
        }

        return new GradientTagImpl(phase, colors);
    }

    //

    private _phase: number;
    private readonly _colors: TextColor[];
    private _index: number;
    private _mulitplier: number;

    constructor(
        phase: number,
        colors: TextColor[]
    ) {
        super();
        if (colors.length === 0) {
            this._colors = [ GradientTagImpl.DEFAULT_WHITE, GradientTagImpl.DEFAULT_BLACK ];
        } else {
            this._colors = [ ...colors ];
        }

        if (phase < 0) {
            this._phase = 1 + phase;
            this._colors.reverse();
        } else {
            this._phase = phase;
        }
        this._index = 0;
        this._mulitplier = 1;
    }

    //

    protected init(): void {
        this._mulitplier = this.size === 1 ? 0 : ((this._colors.length - 1) / (this.size - 1));
        this._phase *= this._colors.length - 1;
        this._index = 0;
    }

    protected color(): TextColor {
        const position = (this._index * this._mulitplier) + this._phase;
        const lowUnclamped = Math.floor(position);
        const high = Math.ceil(position) % this._colors.length;
        const low = lowUnclamped % this._colors.length;
        return TextColor.lerp(
            position - lowUnclamped,
            this._colors[low],
            this._colors[high]
        );
    }

    protected advanceColor(): void {
        this._index++;
    }

}

/** @internal */
export namespace GradientTag {

    export const GRADIENT = "gradient";
    export const RESOLVER = TagResolver.dynamic(GRADIENT, GradientTagImpl.create);

    /** @internal */
    export function of(phase: number, colors: TextColor[]) {
        return new GradientTagImpl(phase, colors);
    }

}
