import {TagResolver} from "../resolver";
import {ArgumentQueue} from "../resolver/argumentQueue";
import {Tag} from "../../tag";
import {Component} from "../../../text/component";

/** @internal */
export namespace ScoreTag {

    function create(args: ArgumentQueue): Tag {
        const name = args.popOr("A scoreboard member name is required").value();
        const objective = args.popOr("An objective name is required").value();
        return Tag.inserting(Component.score(name, objective));
    }

    //

    export const SCORE = "score";
    export const RESOLVER = TagResolver.dynamic(SCORE, create);

}
