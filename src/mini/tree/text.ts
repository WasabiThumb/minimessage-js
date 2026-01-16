import {ValueNode} from "./value";
import {ElementNode} from "./element";
import {Token} from "../token";
import {TokenParser} from "../token/parser";
import {TextNodeFactory} from "./hacks";

//

/** @internal */
export class TextNode extends ValueNode {

    private static isEscape(escape: number): boolean {
        return TokenParser.TAG_START.is(escape) || TokenParser.ESCAPE.is(escape);
    }

    //

    constructor(
        parent: ElementNode | null,
        token: Token,
        sourceMessage: string
    ) {
        super(
            parent,
            token,
            sourceMessage,
            TokenParser.unescape(sourceMessage, token.startIndex(), token.endIndex(), TextNode.isEscape)
        );
    }

    //

    valueName(): string {
        return "TextNode";
    }

}

TextNodeFactory.bind(
    (n) => n instanceof TextNode,
    (parent, token, sourceMessage) => new TextNode(parent, token, sourceMessage)
);
