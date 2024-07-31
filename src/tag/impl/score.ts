import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {Component, ComponentScore} from "../../component/spec";

export class ScoreTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "score";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const scoreName = args.pop().value;
        if (!args.hasNext()) return null;
        const objective = args.pop().value;

        const score: ComponentScore = {
            name: scoreName,
            objective
        };

        const component = Component.empty();
        component.setProperty("score", score);

        return Tag.insert(component);
    }

}

export namespace ScoreTagResolver {

    export const INSTANCE: TagResolver = new ScoreTagResolver();

}
