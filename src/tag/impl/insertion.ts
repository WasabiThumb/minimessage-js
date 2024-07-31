import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";

export class InsertionTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "insertion" || name === "insert";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const insertion = args.pop().value;

        return Tag.modifyProperty("insertion", insertion);
    }

}

export namespace InsertionTagResolver {

    export const INSTANCE: TagResolver = new InsertionTagResolver();

}
