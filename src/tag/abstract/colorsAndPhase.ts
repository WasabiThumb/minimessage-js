import {ModifyTag, Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {ColorUtil, RGB} from "../../util/color";
import {ColorTagResolver} from "../impl/color";

export abstract class ColorsAndPhaseTagResolver implements TagResolver {

    abstract has(name: string): boolean;

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        let strings: string[] = [];
        while (args.hasNext()) strings.push(args.pop().value);
        let stringCount: number = strings.length;

        let phase: number = 0;
        if (stringCount > 2) {
            let last: string = strings[stringCount - 1];
            let num: number = parseFloat(last);
            if (!isNaN(num)) {
                if (num < 0) num += 1;
                if (num < 0 || num > 1) {
                    num = Math.abs((num + 1) % 2) - 1;
                }
                phase = num;
                stringCount--;
            }
        }

        let colors: RGB[] = new Array(stringCount);
        for (let i=0; i < stringCount; i++) {
            colors[i] = ColorUtil.hex2RGB(ColorTagResolver.mapColor(strings[i]));
        }

        let count: number = stringCount;
        if (count < 1) count = colors.push([ 255, 255, 255 ]);
        if (count < 2) count = colors.push([ 0, 0, 0 ]);

        return this.resolveColorsAndPhase(colors, count, phase);
    }

    protected abstract resolveColorsAndPhase(colors: RGB[], count: number, phase: number): ModifyTag;

}
