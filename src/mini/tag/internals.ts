import {Token} from "../token";
import {TokenParser} from "../token/parser";
import {Tag} from "../tag";
import {Character} from "../../util/char";

/** @internal */
export namespace TagInternals {

    export const TAG_NAME_REGEX = "[!?#]?[a-z0-9_-]*";
    const TAG_NAME_PATTERN = RegExp(TAG_NAME_REGEX);

    //

    export function assertValidTagName(tagName: string): void {
        if (TAG_NAME_PATTERN.test(tagName)) return;
        throw new Error(`Tag name must match pattern ${TAG_NAME_REGEX}, was ${tagName}`);
    }

    export function sanitizeAndCheckValidTagName(tagName: string): boolean {
        return TAG_NAME_PATTERN.test(tagName.toLowerCase());
    }

    export function sanitizeAndAssertValidTagName(tagName: string) {
        assertValidTagName(tagName.toLowerCase());
    }

}

/** @internal */
export class TagPart implements Tag.Argument {

    static unquoteAndEscape(
        text: string,
        start: number,
        end: number
    ): string {
        if (start === end)
            return "";

        let startIndex: number = start;
        let endIndex: number = end;

        const firstChar = text.charCodeAt(startIndex);
        const lastChar = text.charCodeAt(endIndex - 1);

        if (Character.APOSTROPHE.is(firstChar) || Character.QUOTATION.is(firstChar)) {
            startIndex++;
        } else {
            return text.substring(startIndex, endIndex);
        }
        if (Character.APOSTROPHE.is(lastChar) || Character.QUOTATION.is(lastChar)) {
            endIndex--;
        }

        if (startIndex > endIndex) {
            return text.substring(start, end);
        }

        return TokenParser.unescape(
            text,
            startIndex,
            endIndex,
            (i) => firstChar === i || TokenParser.ESCAPE.is(i)
        );
    }

    //

    private readonly _value: string;
    private readonly _token: Token;

    constructor(
        sourceMessage: string,
        token: Token,
        tagResolver: TokenParser.TagProvider
    ) {
        let v: string = TagPart.unquoteAndEscape(sourceMessage, token.startIndex(), token.endIndex());
        v = TokenParser.resolvePreProcessTags(v, tagResolver);

        this._value = v;
        this._token = token;
    }

    //

    value(): string {
        return this._value;
    }

    token(): Token {
        return this._token;
    }

    asFloat(): number | null {
        const n = parseFloat(this._value);
        if (isNaN(n)) return null;
        return n;
    }

    asInt(): number | null {
        const n = parseInt(this._value);
        if (isNaN(n)) return null;
        return n;
    }

    isFalse(): boolean {
        return "false" === this._value || "off" === this._value;
    }

    isTrue(): boolean {
        return "true" === this._value || "on" === this._value;
    }

    lowerValue(): string {
        return this._value.toLowerCase();
    }

    toString() {
        return this._value;
    }

}

