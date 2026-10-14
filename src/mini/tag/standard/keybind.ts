import { Component } from "../../../text/component";
import { Context } from "../../context";
import { Tag } from "../../tag";
import { TagResolver } from "../resolver";
import { ArgumentQueue } from "../resolver/argumentQueue";

//

export namespace KeybindTag {
    function create(args: ArgumentQueue, ctx: Context): Tag {
        return Tag.inserting(Component.keybind(args.popOr("A keybind id is required").value()));
    }

    export const KEYBIND = "key";
    export const RESOLVER = TagResolver.dynamic(KEYBIND, create);
}
