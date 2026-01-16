import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {HoverEvent} from "../../../text/style/hoverEvent";
import {Component} from "../../../text/component";
import {TagResolver} from "../resolver";
import {UUID} from "../../../util/uuid";

export namespace HoverTag {

    function create(
        args: ArgumentQueue,
        ctx: Context
    ): Tag {
        const actionName = args.popOr(`Hover event requires an action as its first argument`).value();
        const action = HoverEvent.Action.NAMES[actionName];
        const value = ActionHandler.of(action);
        if (value === null) {
            throw ctx.newException(`Don't know how to turn '${args}' into a hover event`, args);
        }
        const payload = value(args, ctx);
        return Tag.styling((s) => {
            s.hoverEvent(HoverEvent.hoverEvent(action, payload));
        });
    }

    export const HOVER = "hover";
    export const RESOLVER = TagResolver.dynamic(HOVER, create);

    //

    type ActionHandler<V> = (args: ArgumentQueue, ctx: Context) => V;

    namespace ActionHandler {

        const ShowText: ActionHandler<Component> = ((args, ctx) => {
            return ctx.deserialize(args.popOr("show_text action requires a message").value());
        });

        const ShowItem: ActionHandler<HoverEvent.ShowItem> = ((args, ctx) => {
            const key = args.popOr("Show item hover needs at least an item ID").value();
            const count = args.hasNext() ? args.pop().asInt() : 1;
            if (count === null) throw ctx.newException("The count argument was not a valid integer");
            // TODO: NBT support
            return HoverEvent.ShowItem.showItem(key, count);
        });

        const ShowEntity: ActionHandler<HoverEvent.ShowEntity> = ((args, ctx) => {
            const key = args.popOr("Show entity needs a type argument").value();
            const id = UUID.fromString(args.popOr("Show entity needs an entity UUID").value());
            if (args.hasNext()) {
                const name = ctx.deserialize(args.pop().value());
                return HoverEvent.ShowEntity.showEntity(key, id.toString(), name);
            } else {
                return HoverEvent.ShowEntity.showEntity(key, id.toString());
            }
        });

        export function of<V>(action: HoverEvent.Action<V>): ActionHandler<V> | null {
            let ret: ActionHandler<any> | null = null;
            if (action === HoverEvent.Action.SHOW_TEXT) {
                ret = ShowText;
            } else if (action === HoverEvent.Action.SHOW_ITEM) {
                ret = ShowItem;
            } else if (action === HoverEvent.Action.SHOW_ENTITY) {
                ret = ShowEntity;
            }
            return ret as unknown as ActionHandler<V> | null;
        }

    }

}
