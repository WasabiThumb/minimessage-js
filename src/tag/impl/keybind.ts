import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {Component} from "../../component/spec";

export class KeybindTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "key";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const component = Component.empty();
        component.setProperty("keybind", args.pop().value);

        return Tag.insert(component);
    }

}

export namespace KeybindTagResolver {

    export const INSTANCE: TagResolver = new KeybindTagResolver();

}
