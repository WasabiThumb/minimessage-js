import {ArgumentQueue} from "../resolver/argumentQueue";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";
import {Component} from "../../../text/component";
import {ObjectContents} from "../../../text/object";

/** @internal */
export namespace SpriteTag {

    function create(args: ArgumentQueue): Tag {
        const firstArg = args.popOr(`An atlas id and or a sprite id is required to produce a sprite object component`).value();
        const secondArg = args.hasNext() ? args.pop().value() : null;

        if (secondArg === null) {
            return Tag.selfClosingInserting(Component.object(
                ObjectContents.sprite(firstArg)
            ));
        } else {
            return Tag.selfClosingInserting(Component.object(
                ObjectContents.sprite(firstArg, secondArg)
            ));
        }
    }

    //

    export const SPRITE = "sprite";
    export const RESOLVER = TagResolver.dynamic(SPRITE, create);

}
