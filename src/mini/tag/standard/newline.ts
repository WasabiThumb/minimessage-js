import {Component} from "../../../text/component";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";

/** @internal */
export namespace NewlineTag {

    function create(): Tag {
        return Tag.selfClosingInserting(Component.newline());
    }

    //

    export const NEWLINE = "newline";
    export const BR = "br";
    export const RESOLVER = TagResolver.dynamic(NEWLINE, create, BR);

}
