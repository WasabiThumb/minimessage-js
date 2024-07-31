import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";

export class SelectorTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "selector" || name === "sel";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const selector: string = args.pop().value;

        return Tag.modifyProperty("selector", selector);
    }

}

export namespace SelectorTagResolver {

    export const INSTANCE = new SelectorTagResolver;

}
