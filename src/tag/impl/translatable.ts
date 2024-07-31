import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {Component} from "../../component/spec";

export class TranslatableTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "lang" || name === "tr" || name === "translate";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const translate: string = args.pop().value;

        let values: string[] = [];
        while (args.hasNext()) values.push(args.pop().value);

        const component = Component.empty();
        component.setProperty("translate", translate);
        if (values.length > 0) component.setProperty("with", values);

        return Tag.insert(component);
    }

}

export namespace TranslatableTagResolver {

    export const INSTANCE: TagResolver = new TranslatableTagResolver();

}
