import {ArrayUtil} from "../util/array";
import {assertNever} from "../util/assertions";

//

/** @internal */
export namespace TokenType {
    export const TEXT = Symbol("TEXT");
    export const OPEN_TAG = Symbol("OPEN_TAG");
    export const OPEN_CLOSE_TAG = Symbol("OPEN_CLOSE_TAG");
    export const CLOSE_TAG = Symbol("CLOSE_TAG");
    export const TAG_VALUE = Symbol("TAG_VALUE");
}

/** @internal */
export type TokenType = typeof TokenType.TEXT |
    typeof TokenType.OPEN_TAG |
    typeof TokenType.CLOSE_TAG |
    typeof TokenType.OPEN_CLOSE_TAG |
    typeof TokenType.CLOSE_TAG |
    typeof TokenType.TAG_VALUE;

/** @internal */
export class Token {

    static match<T>(
        token: Token,
        handlers: {
            text(token: Token): T;
            openTag(token: Token): T;
            openCloseTag(token: Token): T;
            closeTag(token: Token): T;
            tagValue(token: Token): T;
        }
    ): T {
        const type: TokenType = token.type();
        switch (type) {
            case TokenType.TEXT:
                return handlers.text(token);
            case TokenType.OPEN_TAG:
                return handlers.openTag(token);
            case TokenType.OPEN_CLOSE_TAG:
                return handlers.openCloseTag(token);
            case TokenType.CLOSE_TAG:
                return handlers.closeTag(token);
            case TokenType.TAG_VALUE:
                return handlers.tagValue(token);
            default:
                assertNever(type);
        }
    }

    //

    private readonly _indices: Uint32Array;
    private readonly _type: TokenType;
    private _childTokens: Token[] | null;

    constructor(
        startIndex: number,
        endIndex: number,
        type: TokenType
    ) {
        this._indices = new Uint32Array([ startIndex, endIndex ]);
        this._type = type;
        this._childTokens = null;
    }

    //

    startIndex(): number {
        return this._indices[0];
    }

    endIndex(): number {
        return this._indices[1];
    }

    type(): TokenType {
        return this._type;
    }

    childTokens(childTokens?: Token[]): Token[] | null {
        if (childTokens) this._childTokens = ArrayUtil.immutableView(childTokens);
        return this._childTokens;
    }

    get(message: string): string {
        return message.substring(this._indices[0], this._indices[1]);
    }

}

