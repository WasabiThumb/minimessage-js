import {ModifyTag, Tag, TagResolver} from "../spec";
import {ColorUtil, RGB} from "../../util/color";
import {Component} from "../../component/spec";
import {ColorsAndPhaseTagResolver} from "../abstract/colorsAndPhase";

export class GradientTagResolver extends ColorsAndPhaseTagResolver {

    has(name: string): boolean {
        return name === "gradient";
    }

    protected resolveColorsAndPhase(colors: RGB[], count: number, phase: number): ModifyTag {
        count--;
        return Tag.modify((component: Component) => {
            component.setColorByPlacement((delta: number) => {
                if (Math.trunc(phase) !== phase) {
                    delta += phase;
                    if (phase >= 0) {
                        if (delta > 1) delta %= 1;
                    } else if (delta < 0) {
                        delta += 1;
                    }
                }
                const index: number = delta * count;
                const floor: number = Math.floor(index);
                const ceil: number = Math.ceil(index);
                return ColorUtil.interpolateRGB(colors[floor], colors[ceil], index - floor);
            });
        });
    }

}

export namespace GradientTagResolver {

    export const INSTANCE: TagResolver = new GradientTagResolver();

}
