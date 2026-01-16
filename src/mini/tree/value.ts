import {ElementNode} from "./element";
import {Token} from "../token";

//

/** @internal */
export abstract class ValueNode extends ElementNode {

    private readonly _value: string;

    constructor(
        parent: ElementNode | null,
        token: Token | null,
        sourceMessage: string,
        value: string
    ) {
        super(parent, token, sourceMessage);
        this._value = value;
    }

    //

    abstract valueName(): string;

    value(): string {
        return this._value;
    }

    token(): Token {
        const token = super.token();
        if (token === null) throw new Error(`token is not set`);
        return token;
    }

}
