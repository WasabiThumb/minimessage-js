import {Tag, TagDirective, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";

export class ResetTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "reset";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        return Tag.directive(TagDirective.RESET);
    }

}

export namespace ResetTagResolver {

    export const INSTANCE: TagResolver = new ResetTagResolver();

}
