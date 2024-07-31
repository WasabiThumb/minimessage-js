import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";

export class FontTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "font";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const fontKey = args.pop().value;
        return Tag.modifyProperty("font", fontKey);
    }

}

export namespace FontTagResolver {

    export const INSTANCE: TagResolver = new FontTagResolver();

}
