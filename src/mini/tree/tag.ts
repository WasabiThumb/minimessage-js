import {ElementNode} from "./element";
import {Token} from "../token";
import {TokenParser} from "../token/parser";
import {TagPart} from "../tag/internals";
import {ArrayUtil} from "../../util/array";
import {Tag} from "../tag";

//

/** @internal */
export class TagNode extends ElementNode {

    private static genParts(
        token: Token,
        sourceMessage: string,
        tagProvider: TokenParser.TagProvider
    ): TagPart[] {
        const parts: TagPart[] = [];
        const children = token.childTokens();
        if (children !== null) {
            for (const child of children) {
                parts.push(new TagPart(sourceMessage, child, tagProvider));
            }
        }
        return parts;
    }

    //

    private readonly _parts: TagPart[];
    private _tag: Tag | null;

    constructor(
        parent: ElementNode,
        token: Token,
        sourceMessage: string,
        tagProvider: TokenParser.TagProvider
    ) {
        super(parent, token, sourceMessage);
        this._parts = ArrayUtil.immutableView(TagNode.genParts(token, sourceMessage, tagProvider));
        this._tag = null;
        if (this._parts.length === 0) throw new Error(`Tag has no parts`);
    }

    //

    parts(): TagPart[] {
        return this._parts;
    }

    name(): string {
        return this._parts[0].value();
    }

    token(): Token {
        const token = super.token();
        if (token === null) throw new Error(`token is not set`);
        return token;
    }

    tag(tag?: Tag): Tag {
        if (tag) {
            this._tag = tag;
            return tag;
        } else {
            const value = this._tag;
            if (value === null) throw new Error(`no tag set`);
            return value;
        }
    }

}
