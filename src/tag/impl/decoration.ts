import {Tag, TagResolver} from "../spec";
import {Component, ComponentDecoration} from "../../component/spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";


type DecorationMap = { [key: string]: ComponentDecoration };

const BOLD_DECORATION_MAP: DecorationMap = {
    "bold": "bold",
    "b": "bold",
};

const ITALIC_DECORATION_MAP: DecorationMap = {
    "italic": "italic",
    "em": "italic",
    "i": "italic",
};

const UNDERLINED_DECORATION_MAP: DecorationMap = {
    "underlined": "underlined",
    "u": "underlined",
};

const STRIKETHROUGH_DECORATION_MAP: DecorationMap = {
    "strikethrough": "strikethrough",
    "st": "strikethrough",
};

const OBFUSCATED_DECORATION_MAP: DecorationMap = {
    "obfuscated": "obfuscated",
    "obf": "obfuscated"
};

const OMNI_DECORATION_MAP: DecorationMap = {
    ...BOLD_DECORATION_MAP,
    ...ITALIC_DECORATION_MAP,
    ...UNDERLINED_DECORATION_MAP,
    ...STRIKETHROUGH_DECORATION_MAP,
    ...OBFUSCATED_DECORATION_MAP
};


export class DecorationTagResolver implements TagResolver {

    private readonly map: DecorationMap;
    constructor(map: DecorationMap = OMNI_DECORATION_MAP) {
        this.map = map;
    }

    has(name: string): boolean {
        if (name.length < 1) return false;
        if (name.charCodeAt(0) === 33) { // !
            return name.substring(1) in this.map;
        } else {
            return name in this.map;
        }
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        let state: boolean = true;
        if (name.charCodeAt(0) === 33) {
            state = false;
            name = name.substring(1);
        } else {
            const arg = args.peek();
            if (arg !== null) state = arg.isTrue();
        }

        const decoration: ComponentDecoration = this.map[name];
        if (typeof decoration === "undefined") return null;

        return Tag.modify((component: Component) => component.decorate(decoration, state));
    }

}

export namespace DecorationTagResolver {

    export const INSTANCE: TagResolver = new DecorationTagResolver();

    export function of(decoration: ComponentDecoration): TagResolver {
        switch (decoration) {
            case "bold":
                return new DecorationTagResolver(BOLD_DECORATION_MAP);
            case "italic":
                return new DecorationTagResolver(ITALIC_DECORATION_MAP);
            case "obfuscated":
                return new DecorationTagResolver(OBFUSCATED_DECORATION_MAP);
            case "strikethrough":
                return new DecorationTagResolver(STRIKETHROUGH_DECORATION_MAP);
            case "underlined":
                return new DecorationTagResolver(UNDERLINED_DECORATION_MAP);
        }
    }

}
