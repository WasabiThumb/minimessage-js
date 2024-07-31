import {Tag, TagResolver} from "../spec";
import {ArgumentQueue} from "../../markup/args";
import {TagResolverContext} from "../context";
import {
    ComponentHoverEvent,
    ComponentHoverEventAction,
    ComponentHoverEventActions
} from "../../component/spec";


export class HoverEventTagResolver implements TagResolver {

    has(name: string): boolean {
        return name === "hover";
    }

    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
        if (!args.hasNext()) return null;
        const action = args.pop().lowerValue;
        if ((ComponentHoverEventActions as string[]).indexOf(name) === -1) return null;
        if (!args.hasNext()) return null;
        const contents = args.pop().value;

        const hoverEvent: ComponentHoverEvent = {
            action: action as ComponentHoverEventAction,
            contents
        };

        return Tag.modifyProperty("hoverEvent", hoverEvent);
    }

}

export namespace HoverEventTagResolver {

    export const INSTANCE: TagResolver = new HoverEventTagResolver();

}
