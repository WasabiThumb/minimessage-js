import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {Component} from "../../component/spec";
import {HexUtil} from "../../util/hex";

export class RainbowTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "rainbow";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        let reverse: boolean = false;
        let phase: number = 0;

        let arg = args.peek();
        let argValue: string;
        if (arg !== null && (argValue = arg.value).length > 0) {
            if (argValue.charCodeAt(0) === 33) { // !
                reverse = true;
                phase = parseInt(argValue.substring(1));
            } else {
                phase = parseInt(argValue);
            }
            if (isNaN(phase)) {
                phase = 0;
            } else {
                phase = (Math.abs(phase) % 10) / 10;
            }
        }

        return Tag.modify((component: Component) => {
            component.setColorByPlacement((delta) => {
                delta = ((delta + phase) % 1);
                if (reverse) delta = (1 - delta);

                const i: number = Math.floor(delta * 6);
                const f: number = (delta * 6) - i;
                const q: number = 1 - f;

                let r: number;
                let g: number;
                let b: number;

                switch (i as 0 | 1 | 2 | 3 | 4 | 5) {
                    case 0: r = 1; g = f; b = 0; break;
                    case 1: r = q; g = 1; b = 0; break;
                    case 2: r = 0; g = 1; b = f; break;
                    case 3: r = 0; g = q; b = 1; break;
                    case 4: r = f; g = 0; b = 1; break;
                    case 5: r = 1; g = 0; b = q; break;
                }

                return "#" + HexUtil.octet2Hex(Math.round(r * 255))
                    + HexUtil.octet2Hex(Math.round(g * 255))
                    + HexUtil.octet2Hex(Math.round(b * 255));
            });
            return component;
        });
    }

}

export namespace RainbowTagResolver {

    export const INSTANCE: TagResolver = new RainbowTagResolver();

}
