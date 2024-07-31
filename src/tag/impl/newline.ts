import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {Component} from "../../component/spec";

export class NewlineTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "newline" || name === "br";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        return Tag.insert(Component.text("\n"));
    }

}

export namespace NewlineTagResolver {

    export const INSTANCE: TagResolver = new NewlineTagResolver();

}
