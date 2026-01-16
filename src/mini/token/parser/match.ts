import {TokenType} from "../../token";

/** @internal */
export abstract class MatchedTokenConsumer<T> {

    protected readonly _input: string;
    private _lastIndex: number;

    constructor(input: string) {
        this._input = input;
        this._lastIndex = -1;
    }

    //

    abstract result(): T | null;

    accept(start: number, end: number, type: TokenType): void {
        this._lastIndex = end;
    }

    lastEndIndex(): number {
        return this._lastIndex;
    }

}
