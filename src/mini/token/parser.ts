import {Token, TokenType} from "../token";
import {Tag} from "../tag";
import {RootNode} from "../tree/root";
import {MatchedTokenConsumer} from "./parser/match";
import {Character} from "../../util/char";
import {TagInternals, TagPart} from "../tag/internals";
import {StringResolvingMatchedTokenConsumer} from "./parser/match/string";
import {TokenListProducingMatchedTokenConsumer} from "./parser/match/tokenList";
import {assertNever} from "../../util/assertions";
import {ElementNode} from "../tree/element";
import {TextNode} from "../tree/text";
import {TagNode} from "../tree/tag";
import {ParserDirectiveTag} from "../tag/impls/directive";
import {InsertingTagImpl} from "../tag/impls/inserting";
import {StringBuilder} from "../../util/string";

/** @internal */
export namespace TokenParser {

    const MAX_DEPTH = 16;
    export const TAG_START = Character.LESS_THAN;
    export const TAG_END   = Character.GREATER_THAN;
    export const CLOSE_TAG = Character.SLASH;
    export const SEPARATOR = Character.COLON;
    export const ESCAPE    = Character.BACKSLASH;

    enum FirstPassState {
        NORMAL,
        TAG,
        STRING
    }

    enum SecondPassState {
        NORMAL,
        STRING
    }

    //

    export function parse(
        provider: TagProvider,
        tagNameChecker: (value: string) => boolean,
        message: string,
        originalMessage: string,
        strict: boolean
    ): RootNode {
        const tokens = tokenize(message, false);
        return buildTree(provider, tagNameChecker, tokens, message, originalMessage, strict);
    }

    export function resolvePreProcessTags(
        message: string,
        provider: TagProvider
    ): string {
        let passes: number = 0;
        let lastResult: string;
        let result: string = message;

        do {
            lastResult = result;
            const stringTokenResolver = new StringResolvingMatchedTokenConsumer(lastResult, provider);

            parseString(lastResult, false, stringTokenResolver);
            result = stringTokenResolver.result();
            passes++;
        } while (passes < MAX_DEPTH && lastResult !== result);

        return lastResult;
    }

    export function tokenize(
        message: string,
        lenient: boolean
    ): Token[] {
        const listProducer = new TokenListProducingMatchedTokenConsumer(message);
        parseString(message, lenient, listProducer);
        const tokens = listProducer.result();
        parseSecondPass(message, tokens);
        return tokens;
    }

    export function parseString(
        message: string,
        lenient: boolean,
        consumer: MatchedTokenConsumer<any>
    ): void {
        let state: FirstPassState = FirstPassState.NORMAL;
        let escaped: boolean = false;
        let currentTokenEnd: number = 0;
        let marker: number = -1;
        let currentStringChar: number = 0;

        const length = message.length;
        for (let i = 0; i < length; i++) {
            const codePoint = message.codePointAt(i)!;
            if (!lenient && Character.SECTION.is(codePoint) && i + 1 < length) {
                const nextChar = message.codePointAt(i + 1)!;
                if ((Character.ZERO.value <= nextChar && nextChar <= Character.NINE.value) ||
                    (Character.LOWERCASE_A.value <= nextChar && nextChar <= Character.LOWERCASE_F.value) ||
                    Character.LOWERCASE_R.is(nextChar) ||
                    (Character.LOWERCASE_K.value <= nextChar && nextChar <= Character.LOWERCASE_O.value)
                ) {
                    throw new Error(`Legacy formatting codes detected in strict mode`);
                }
            }

            if (codePoint > 0xFFFF) i++;
            if (!escaped) {
                if (TokenParser.ESCAPE.is(codePoint) && i + 1 < message.length) {
                    const nextCodePoint = message.codePointAt(i + 1)!;
                    switch (state) {
                        case FirstPassState.NORMAL:
                            escaped = TokenParser.TAG_START.is(nextCodePoint) || TokenParser.ESCAPE.is(nextCodePoint);
                            break;
                        case FirstPassState.STRING:
                            escaped = currentStringChar === nextCodePoint || TokenParser.ESCAPE.is(nextCodePoint);
                            break;
                        case FirstPassState.TAG:
                            if (TokenParser.TAG_START.is(nextCodePoint)) {
                                escaped = true;
                                state = FirstPassState.NORMAL;
                            }
                            break;
                        default:
                            assertNever(state);
                    }
                    if (escaped) continue;
                }
            } else {
                escaped = false;
                continue;
            }

            switch (state) {
                case FirstPassState.NORMAL:
                    if (TokenParser.TAG_START.is(codePoint)) {
                        marker = i;
                        state = FirstPassState.TAG;
                    }
                    break;
                case FirstPassState.TAG:
                    switch (codePoint) {
                        case TokenParser.TAG_END.value:
                            if (i === marker + 1) {
                                state = FirstPassState.NORMAL;
                                break;
                            }

                            if (currentTokenEnd !== marker) {
                                consumer.accept(currentTokenEnd, marker, TokenType.TEXT);
                            }
                            currentTokenEnd = i + 1;

                            let thisType: TokenType = TokenType.OPEN_TAG;
                            if (boundsCheck(message, marker, 1) && message.charCodeAt(marker + 1) === TokenParser.CLOSE_TAG.value) {
                                thisType = TokenType.CLOSE_TAG;
                            } else if (boundsCheck(message, marker, 2) && message.charCodeAt(i - 1) === TokenParser.CLOSE_TAG.value) {
                                thisType = TokenType.OPEN_CLOSE_TAG;
                            }
                            consumer.accept(marker, currentTokenEnd, thisType);
                            state = FirstPassState.NORMAL;
                            break;
                        case TokenParser.TAG_START.value:
                            marker = i;
                            break;
                        case Character.APOSTROPHE.value:
                        case Character.QUOTATION.value:
                            currentStringChar = codePoint;
                            if (message.indexOf(String.fromCodePoint(codePoint), i + 1) !== -1) {
                                state = FirstPassState.STRING;
                            }
                            break;
                    }
                    break;
                case FirstPassState.STRING:
                    if (codePoint === currentStringChar) {
                        state = FirstPassState.TAG;
                    }
                    break;
                default:
                    assertNever(state);
            }

            if (i === (length - 1) && state === FirstPassState.TAG) {
                i = marker;
                state = FirstPassState.NORMAL;
            }
        }

        const end = consumer.lastEndIndex();
        if (end === -1) {
            consumer.accept(0, message.length, TokenType.TEXT);
        } else if (end !== message.length) {
            consumer.accept(end, message.length, TokenType.TEXT);
        }
    }

    export function unescape(
        text: string,
        startIndex: number,
        endIndex: number,
        escapes: (value: number) => boolean
    ): string {
        let from: number = startIndex;
        let i: number = text.indexOf(`\\`, from);
        if (i === -1 || i >= endIndex) return text.substring(from, endIndex);

        const sb = new StringBuilder(endIndex - startIndex);
        while (i !== -1 && i + 1 < endIndex) {
            if (escapes(text.codePointAt(i + 1)!)) {
                sb.appendString(text, from, i);
                i++;

                if (i >= endIndex) {
                    from = endIndex;
                    break;
                }

                const codePoint = text.codePointAt(i)!;
                sb.appendString(String.fromCodePoint(codePoint));

                if (codePoint > 0xFFFF) {
                    i += 2;
                } else {
                    i += 1;
                }

                if (i >= endIndex) {
                    from = endIndex;
                    break;
                }
            } else {
                i++;
                sb.appendString(text, from, i);
            }

            from = i;
            i = text.indexOf(`\\`, from);
        }

        sb.appendString(text, from, endIndex);
        return sb.toString();
    }

    function parseSecondPass(message: string, tokens: Token[]): void {
        for (const token of tokens) {
            const type = token.type();
            if (type !== TokenType.OPEN_TAG && type !== TokenType.OPEN_CLOSE_TAG && type !== TokenType.CLOSE_TAG) continue;

            const startIndex = type === TokenType.CLOSE_TAG ? token.startIndex() + 2 : token.startIndex() + 1;
            const endIndex = type === TokenType.OPEN_CLOSE_TAG ? token.endIndex() - 2 : token.endIndex() - 1;

            let state: SecondPassState = SecondPassState.NORMAL;
            let escaped: boolean = false;
            let currentStringChar: number = 0;
            let marker: number = startIndex;

            for (let i = startIndex; i < endIndex; i++) {
                const codePoint = message.codePointAt(i)!;
                if (codePoint > 0xFFFF) i++;

                if (!escaped) {
                    if (TokenParser.ESCAPE.is(codePoint) && i + 1 < message.length) {
                        const nextCodePoint = message.codePointAt(i + 1)!;
                        switch (state) {
                            case SecondPassState.NORMAL:
                                escaped = TokenParser.TAG_START.is(nextCodePoint) || TokenParser.ESCAPE.is(nextCodePoint);
                                break;
                            case SecondPassState.STRING:
                                escaped = currentStringChar === nextCodePoint || TokenParser.ESCAPE.is(nextCodePoint);
                                break;
                            default:
                                assertNever(state);
                        }
                        if (escaped) {
                            continue;
                        }
                    }
                } else {
                    escaped = false;
                    continue;
                }

                switch (state) {
                    case SecondPassState.NORMAL:
                        if (TokenParser.SEPARATOR.is(codePoint)) {
                            if (boundsCheck(message, i, 2) &&
                                Character.SLASH.is(message.charCodeAt(i + 1)) &&
                                Character.SLASH.is(message.charCodeAt(i + 1))
                            ) {
                                break;
                            }
                            if (marker === i) {
                                insert(token, new Token(i, i, TokenType.TAG_VALUE));
                                marker++;
                            } else {
                                insert(token, new Token(marker, i, TokenType.TAG_VALUE));
                                marker = i + 1;
                            }
                        } else if (Character.QUOTATION.is(codePoint) || Character.APOSTROPHE.is(codePoint)) {
                            state = SecondPassState.STRING;
                            currentStringChar = codePoint;
                        }
                        break;
                    case SecondPassState.STRING:
                        if (codePoint === currentStringChar) {
                            state = SecondPassState.NORMAL;
                        }
                        break;
                    default:
                        assertNever(state);
                }
            }

            const childTokens = token.childTokens();
            if (childTokens === null || childTokens.length === 0) {
                insert(token, new Token(startIndex, endIndex, TokenType.TAG_VALUE));
            } else {
                const end = childTokens[childTokens.length - 1].endIndex();
                if (end !== endIndex) {
                    insert(token, new Token(end + 1, endIndex, TokenType.TAG_VALUE));
                }
            }
        }
    }

    function buildTree(
        tagProvider: TagProvider,
        tagNameChecker: (value: string) => boolean,
        tokens: Token[],
        message: string,
        originalMessage: string,
        strict: boolean
    ): RootNode {
        const root = new RootNode(message, originalMessage);
        let node: ElementNode = root;

        for (const token of tokens) {
            const type = token.type();
            switch (type) {
                case TokenType.TEXT:
                    node.addChild(new TextNode(node, token, message));
                    break;
                case TokenType.OPEN_TAG:
                case TokenType.OPEN_CLOSE_TAG:
                    const tagNamePart = token.childTokens()![0];
                    const tagName = message.substring(tagNamePart.startIndex(), tagNamePart.endIndex());
                    if (!TagInternals.sanitizeAndCheckValidTagName(tagName)) {
                        node.addChild(new TextNode(node, token, message));
                        break;
                    }

                    const tagNode = new TagNode(node, token, message, tagProvider);
                    if (tagNameChecker(tagNode.name())) {
                        const tag = tagProvider.resolve(
                            TokenParser.TagProvider.sanitizePlaceholderName(tagNode.name()),
                            tagNode.parts().slice(1, tagNode.parts().length),
                            tagNode.token()
                        );
                        if (tag === null) {
                            node.addChild(new TextNode(node, token, message));
                        } else if (tag === ParserDirectiveTag.RESET) {
                            if (strict) throw new Error(`<reset> tags are not allowed when strict mode is enabled`);
                            node = root;
                        } else {
                            tagNode.tag(tag);
                            node.addChild(tagNode);
                            if (type !== TokenType.OPEN_CLOSE_TAG && (!(tag instanceof InsertingTagImpl) || tag.allowsChildren())) {
                                node = tagNode;
                            }
                        }
                    } else {
                        node.addChild(new TextNode(node, token, message));
                    }
                    break;
                case TokenType.CLOSE_TAG:
                    const childTokens = token.childTokens();
                    if (childTokens === null || childTokens.length === 0) {
                        throw new Error(`CLOSE_TAG token has no children`);
                    }

                    const closeValues: string[] = new Array(childTokens.length);
                    for (let i = 0; i < childTokens.length; i++) {
                        const childToken = childTokens[i];
                        closeValues[i] = TagPart.unquoteAndEscape(message, childToken.startIndex(), childToken.endIndex());
                    }

                    const closeTagName = closeValues[0];
                    if (tagNameChecker(closeTagName)) {
                        const tag = tagProvider.resolve(closeTagName, [], null);
                        if (tag === ParserDirectiveTag.RESET) continue;
                    } else {
                        node.addChild(new TextNode(node, token, message));
                        continue;
                    }

                    let parentNode: ElementNode | null = node;
                    while (parentNode instanceof TagNode) {
                        const openParts = parentNode.parts();
                        if (tagCloses(closeValues, openParts)) {
                            if (parentNode !== node && strict) {
                                throw new Error(`Unclosed tag encountered: ${(node as TagNode).name()} is ` +
                                    `not closed, because ${closeValues[0]} was closed first.`);
                            }

                            const par = parentNode.parent();
                            if (par !== null) {
                                node = par;
                            } else {
                                throw new Error(`Root node matched with close tag value`);
                            }
                            break;
                        }
                        parentNode = parentNode.parent();
                    }
                    if (parentNode === null || parentNode instanceof RootNode) {
                        node.addChild(new TextNode(node, token, message));
                    }
                    break;
            }
        }

        if (strict && root !== node) {
            const openTags: TagNode[] = [];
            let n: ElementNode | null = node;
            while (n !== null) {
                if (n instanceof TagNode) {
                    openTags.push(n);
                } else {
                    break;
                }
                n = n.parent();
            }

            const sb = new StringBuilder();
            sb.appendString("All tags must be explicitly closed while in strict mode. ")
                .appendString("End of string found with open tags: ");

            for (let i = openTags.length - 1; i >= 0; i--) {
                const n = openTags[i];
                sb.appendString(n.name());
                if (i !== 0) sb.appendString(", ");
            }

            throw new Error(sb.toString());
        }

        return root;
    }

    function tagCloses(
        closeParts: string[],
        openParts: TagPart[]
    ): boolean {
        if (closeParts.length > openParts.length) return false;
        if (closeParts[0].toLowerCase() !== openParts[0].lowerValue()) return false;
        for (let i = 1; i < closeParts.length; i++) {
            if (closeParts[i] !== openParts[i].value()) return false;
        }
        return true;
    }

    function boundsCheck(
        text: string,
        index: number,
        length: number
    ): boolean {
        return index + length < text.length;
    }

    function insert(token: Token, value: Token) {
        const childTokens = token.childTokens();
        if (childTokens === null) {
            token.childTokens([ value ]);
        } else if (childTokens.length === 1) {
            const list: Token[] = [
                childTokens[0],
                value
            ];
            token.childTokens(list);
        } else {
            token.childTokens([
                ...childTokens,
                value
            ]);
        }
    }

    //

    /** @internal */
    export interface TagProvider {

        resolve(name: string, trimmedArgs: Tag.Argument[], token: Token | null): Tag | null;

    }

    /** @internal */
    export namespace TagProvider {

        export function sanitizePlaceholderName(name: string): string {
            return name.toLowerCase();
        }

    }

}
