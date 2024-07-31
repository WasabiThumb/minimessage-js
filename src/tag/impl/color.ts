import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {Component} from "../../component/spec";

const COLOR_MAP: { [key: string]: string } = {
    "black": "#000000",
    "dark_blue": "#0000aa",
    "dark_green": "#00aa00",
    "dark_aqua": "#00aaaa",
    "dark_red": "#aa0000",
    "dark_purple": "#aa00aa",
    "gold": "#ffaa00",
    "gray": "#aaaaaa",
    "dark_gray": "#555555",
    "blue": "#5555ff",
    "green": "#55ff55",
    "aqua": "#55ffff",
    "red": "#ff5555",
    "light_purple": "#ff55ff",
    "yellow": "#ffff55",
    "white": "#ffffff"
};
COLOR_MAP["dark_grey"] = COLOR_MAP["dark_gray"];
COLOR_MAP["grey"] = COLOR_MAP["gray"];

export class ColorTagResolver implements TagResolver {

    static mapColor(name: string): string {
        if (name.length < 1) throw new Error("Color is an empty string");
        if (name.charCodeAt(0) === 35) return name; // hex color

        const ret = COLOR_MAP[name];
        if (typeof ret === "undefined") return "#ffffff";
        return ret;
    }

    has(name: string): boolean {
        if (name === "color") return true;
        if (name in COLOR_MAP) return true;
        // hex
        if (name.length !== 7) return false;
        if (name.charCodeAt(0) !== 35) return false; // #
        let c: number;
        for (let i=1; i < 7; i++) {
            c = name.charCodeAt(i);
            if ( c < 48 || c > 102) return false;
            if ( c <= 57          ) continue; // 0 - 9
            if (97 <= c           ) continue; // a - z
            if (65 <= c && c <= 70) continue; // A - Z
            return false;
        }
        return true;
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        // assume that has(name) has already validated the input
        let value: string = name;
        if (name === "color") {
            if (!args.hasNext()) return null;
            value = args.pop().lowerValue;
        }
        return Tag.modify((component: Component) => { component.color = value; });
    }

}

export namespace ColorTagResolver {

    export const INSTANCE: TagResolver = new ColorTagResolver();

}
