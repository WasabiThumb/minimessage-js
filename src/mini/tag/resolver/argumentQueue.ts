import {Tag} from "../../tag";
import {ArrayUtil} from "../../../util/array";
import {Context} from "../../context";

//

export interface ArgumentQueue {

    pop(): Tag.Argument;

    popOr(errorMessage: string | (() => string)): Tag.Argument;

    peek(): Tag.Argument | null;

    hasNext(): boolean;

    reset(): void;

}

/** @internal */
export class ArgumentQueueImpl<T extends Tag.Argument = Tag.Argument> implements ArgumentQueue {

    private readonly _args: T[];
    private readonly _context: Context;
    private _head: number;

    constructor(context: Context, args: T[]) {
        this._args = ArrayUtil.immutableView(args);
        this._context = context;
        this._head = 0;
    }

    //

    hasNext(): boolean {
        return this._head < this._args.length;
    }

    peek(): T | null {
        return this.hasNext() ? this._args[this._head] : null;
    }

    pop(): T {
        if (!this.hasNext()) throw this._context.newException("Missing argument for this tag!", this);
        return this._args[this._head++];
    }

    popOr(errorMessage: string | (() => string)): T {
        if (!this.hasNext()) {
            const message = (typeof errorMessage === "function") ?
                `${errorMessage()}` : `${errorMessage}`;
            throw this._context.newException(message, this);
        }
        return this._args[this._head++];
    }

    reset(): void {
        this._head = 0;
    }

    toString(): string {
        return this._args.toString();
    }

}
