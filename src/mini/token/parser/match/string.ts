import {MatchedTokenConsumer} from "../match";
import {StringBuilder} from "../../../../util/string";
import {TokenParser} from "../../parser";
import {Token, TokenType} from "../../../token";
import {TagInternals, TagPart} from "../../../tag/internals";
import {PreProcessTagImpl} from "../../../tag/impls/preProcess";

//

/** @internal */
export class StringResolvingMatchedTokenConsumer extends MatchedTokenConsumer<string> {

    private readonly _builder: StringBuilder;
    private readonly _tagProvider: TokenParser.TagProvider;

    constructor(
        input: string,
        tagProvider: TokenParser.TagProvider
    ) {
        super(input);
        this._builder = new StringBuilder(input.length);
        this._tagProvider = tagProvider;
    }

    //

    accept(start: number, end: number, type: TokenType) {
        super.accept(start, end, type);

        if (type !== TokenType.OPEN_TAG) {
            this._builder.appendString(this._input, start, end);
            return;
        }

        const match = this._input.substring(start, end);
        const cleanup = this._input.substring(start + 1, end - 1);

        const index = TokenParser.SEPARATOR.indexIn(cleanup);
        const tag = (index === -1) ? cleanup : cleanup.substring(0, index);

        if (TagInternals.sanitizeAndCheckValidTagName(tag)) {
            const tokens: Token[] = TokenParser.tokenize(match, false);
            const parts: TagPart[] = [];
            if (tokens.length !== 0) {
                const childs = tokens[0].childTokens();
                if (childs !== null) {
                    for (let i = 1; i < childs.length; i++) {
                        const child = childs[i];
                        const part = new TagPart(match, child, this._tagProvider);
                        parts.push(part);
                    }
                }
            }
            const replacement = this._tagProvider.resolve(
                TokenParser.TagProvider.sanitizePlaceholderName(tag),
                parts,
                tokens.length !== 0 ? tokens[0] : null
            );
            if (replacement !== null && replacement instanceof PreProcessTagImpl) {
                this._builder.append(replacement.value());
                return;
            }
        }

        this._builder.appendString(match);
    }

    result(): string {
        return this._builder.toString();
    }

}
