import {ModifyTag, Tag, TagResolver} from "../spec";
import {ColorUtil, RGB} from "../../util/color";
import {Component} from "../../component/spec";
import {ColorsAndPhaseTagResolver} from "../abstract/colorsAndPhase";


export class TransitionTagResolver extends ColorsAndPhaseTagResolver {

    has(name: string): boolean {
        return name === "transition";
    }

    protected resolveColorsAndPhase(colors: RGB[], count: number, phase: number): ModifyTag {
        if (phase < 0) phase++;
        let color: string;
        if (Math.abs(phase) === 1) {
            color = ColorUtil.rgb2Hex(colors[count - 1]);
        } else {
            const value = phase * (count - 1);
            const index = Math.floor(value);
            const delta = (value - index);
            color = ColorUtil.interpolateRGB(colors[index], colors[index + 1], delta);
        }
        return Tag.modify((component: Component) => { component.color = color; });
    }

}

export namespace TransitionTagResolver {

    export const INSTANCE: TagResolver = new TransitionTagResolver();

}
