import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {
    ComponentClickEvent,
    ComponentClickEventAction,
    ComponentClickEventActions
} from "../../component/spec";


export class ClickEventTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "click";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const action = args.pop().lowerValue;
        if ((ComponentClickEventActions as string[]).indexOf(action) === -1) return null;
        if (!args.hasNext()) return null;
        const value = args.pop().value;

        const clickEvent: ComponentClickEvent = {
            action: action as ComponentClickEventAction,
            value
        };

        return Tag.modifyProperty("clickEvent", clickEvent);
    }

}

export namespace ClickEventTagResolver {

    export const INSTANCE: TagResolver = new ClickEventTagResolver();

}
