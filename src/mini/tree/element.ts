import {Node} from "../tree";
import {Token, TokenType} from "../token";
import {ArrayUtil} from "../../util/array";
import {TextNodeFactory} from "./hacks";

//

/** @internal */
export class ElementNode implements Node {

    private readonly _parent: ElementNode | null;
    private readonly _token: Token | null;
    private readonly _sourceMessage: string;
    private readonly _children: ElementNode[];

    protected constructor(
        parent: ElementNode | null,
        token: Token | null,
        sourceMessage: string
    ) {
        this._parent = parent;
        this._token = token;
        this._sourceMessage = sourceMessage;
        this._children = [];
    }

    //

    parent(): ElementNode | null {
        return this._parent;
    }

    children(): ElementNode[] {
        return ArrayUtil.immutableView(this._children);
    }

    token(): Token | null {
        return this._token;
    }

    sourceMessage(): string {
        return this._sourceMessage;
    }

    unsafeChildren(): ElementNode[] {
        return this._children;
    }

    addChild(childNode: ElementNode): void {
        const last = this._children.length - 1;
        if (!TextNodeFactory.isTextNode(childNode) || this._children.length === 0 || !TextNodeFactory.isTextNode(this._children[last])) {
            this._children.push(childNode);
        } else {
            const lastNode = this._children.splice(last, 1)[0];
            if (lastNode.token()!.endIndex() === childNode.token()!.startIndex()) {
                const replace = new Token(
                    lastNode.token()!.startIndex(),
                    childNode.token()!.endIndex(),
                    TokenType.TEXT
                );
                this._children.push(TextNodeFactory.create(this, replace, lastNode.sourceMessage()));
            } else {
                this._children.push(lastNode, childNode);
            }
        }
    }

}
