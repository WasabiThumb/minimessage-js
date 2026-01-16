import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {Component} from "../../../text/component";
import {ObjectContents} from "../../../text/object";
import {TagResolver} from "../resolver";
import {TriState} from "../../../util/triState";

/** @internal */
export namespace SequentialHeadTag {

    const UUIDv4_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ABCD][0-9a-f]{3}-[0-9a-f]{12}/i;

    function argumentToTriState(arg: Tag.Argument): TriState {
        if (arg.isTrue()) return TriState.TRUE;
        if (arg.isFalse()) return TriState.FALSE;
        return TriState.NOT_SET;
    }

    function create(args: ArgumentQueue, ctx: Context): Tag {
        if (!args.hasNext()) {
            return Tag.selfClosingInserting(Component.object(
                ObjectContents.playerHead().build()
            ));
        }

        const rawArgument = args.pop();
        const argument = rawArgument.value();

        let outerLayer: TriState;
        if (!args.hasNext()) {
            outerLayer = argumentToTriState(rawArgument);
            if (outerLayer !== TriState.NOT_SET) {
                return Tag.selfClosingInserting(Component.object(
                    ObjectContents.playerHead()
                        .hat(outerLayer === TriState.TRUE)
                        .build()
                ));
            }
        } else {
            outerLayer = argumentToTriState(args.pop());
        }

        if (args.hasNext()) {
            throw ctx.newException("Too many arguments present", args);
        }

        if (UUIDv4_PATTERN.test(argument)) {
            return Tag.selfClosingInserting(Component.object(
                ObjectContents.playerHead()
                    .id(argument)
                    .hat(TriState.resolve(outerLayer, true))
                    .build()
            ));
        }

        if (argument.indexOf("/") !== -1) {
            return Tag.selfClosingInserting(Component.object(
                ObjectContents.playerHead()
                    .texture(argument)
                    .hat(TriState.resolve(outerLayer, true))
                    .build()
            ));
        }

        return Tag.selfClosingInserting(Component.object(
            ObjectContents.playerHead()
                .name(argument)
                .hat(TriState.resolve(outerLayer, true))
                .build()
        ));
    }

    //

    export const HEAD = "head";
    export const RESOLVER = TagResolver.dynamic(HEAD, create);

}
