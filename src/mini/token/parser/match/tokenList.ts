import {MatchedTokenConsumer} from "../match";
import {Token, TokenType} from "../../../token";
import {ArrayUtil} from "../../../../util/array";

export class TokenListProducingMatchedTokenConsumer extends MatchedTokenConsumer<Token[]> {

    private _result: Token[] | null;

    //

    constructor(input: string) {
        super(input);
        this._result = null;
    }

    result(): Token[] {
        let result: Token[] | null = this._result;
        if (result === null) result = [];
        return ArrayUtil.immutableView(result);
    }

    accept(start: number, end: number, type: TokenType) {
        super.accept(start, end, type);
        let array: Token[] | null = this._result;
        if (array === null) this._result = array = [];
        array.push(new Token(start, end, type));
    }

}
