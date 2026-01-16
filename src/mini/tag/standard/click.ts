import {TagResolver} from "../resolver";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {ClickEvent} from "../../../text/style/clickEvent";

export namespace ClickTag {

    function create(args: ArgumentQueue, ctx: Context): Tag {
        const actionName = args.popOr("A click tag requires an action name").lowerValue();
        const action = ClickEvent.Action.NAMES[actionName];
        if (!action) throw ctx.newException(`Unknown click event action '${actionName}'`, args);

        let event: ClickEvent<any>;
        if (action === ClickEvent.Action.CHANGE_PAGE) {
            const page = args.popOr(`'change_page' click event requires a page argument`).asInt();
            if (page === null) throw ctx.newException(`'change_page' click event requires an integer page argument`);
            event = ClickEvent.changePage(page);
        } else if (action === ClickEvent.Action.CUSTOM) {
            const keyString = args.popOr(`'custom' click event requires a key argument`).value();
            let nbt: string | null;
            if (args.hasNext()) {
                nbt = args.pop().value();
            } else {
                nbt = null;
            }
            event = ClickEvent.custom(keyString, nbt);
        } else {
            event = ClickEvent.clickEvent(
                action as ClickEvent.Action<ClickEvent.Payload.Text>,
                ClickEvent.Payload.string(args.popOr(`'${action.toString()} click events require a value'`).value())
            );
        }

        return Tag.styling((s) => {
            s.clickEvent(event);
        });
    }

    export const CLICK = "click";
    export const RESOLVER = TagResolver.dynamic(CLICK, create);

}
