import {AbstractColorChangingTag} from "../impls/colorChanging";
import {TextColor} from "../../../text/style/textColor";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {TagResolver} from "../resolver";
import {Tag} from "../../tag";

//

const hue2rgb = ((h: number): Uint8Array => {
    const rgb = new Uint8Array(3);

    // Map hue in [0, 1) to int in [0, 1535]
    const q = Math.trunc(h * 1536);
    const n = (q < 0) ? (((q % 1536) + 1536) % 1536) : (q % 1536);

    // Determine the segment (i) and interpolation factor (f)
    const i = n >>> 8;
    const f = n & 255;

    // Calculate determinants based upon i & f
    // ~f is used as a shorthand for 255 - f;
    // this ONLY works because rgb is a Uint8Array
    switch (i) {
        case 0: rgb[0] = 255; rgb[1] =   f; break;
        case 1: rgb[0] =  ~f; rgb[1] = 255; break;
        case 2: rgb[1] = 255; rgb[2] =   f; break;
        case 3: rgb[1] =  ~f; rgb[2] = 255; break;
        case 4: rgb[2] = 255; rgb[0] =   f; break;
        case 5: rgb[2] =  ~f; rgb[0] = 255; break;
    }

    // Return the array as-is (can be consumed with spread syntax)
    return rgb;
});

class RainbowTagImpl extends AbstractColorChangingTag {

    private readonly reversed: boolean;
    private readonly dividedPhase: number;
    private colorIndex: number;

    constructor(
        reversed: boolean,
        phase: number
    ) {
        super();
        this.reversed = reversed;
        this.dividedPhase = phase / 10;
        this.colorIndex = 0;
    }

    //

    protected init() {
        if (this.reversed) {
            this.colorIndex = this.size - 1;
        }
    }

    protected advanceColor() {
        if (this.reversed) {
            if (this.colorIndex === 0) {
                this.colorIndex = this.size - 1;
            } else {
                this.colorIndex--;
            }
        } else {
            this.colorIndex++;
        }
    }

    protected color(): TextColor {
        const hue = ((this.colorIndex / this.size) + this.dividedPhase) % 1;
        const [ r, g, b ] = hue2rgb(hue);
        return TextColor.color(r, g, b);
    }

}

/** @internal */
export namespace RainbowTag {

    const REVERSE = "!";

    function create(args: ArgumentQueue, ctx: Context): Tag {
        let reversed: boolean = false;
        let phase: number = 0;

        if (args.hasNext()) {
            let value: string = args.pop().value();
            if (value.startsWith(REVERSE)) {
                reversed = true;
                value = value.substring(REVERSE.length);
            }
            if (value.length !== 0) {
                phase = parseInt(value);
                if (isNaN(phase)) throw ctx.newException(`Expected phase, got ${value}`, args);
            }
        }

        return new RainbowTagImpl(reversed, phase);
    }

    //

    export const RAINBOW = "rainbow";
    export const RESOLVER = TagResolver.dynamic(RAINBOW, create);

}
