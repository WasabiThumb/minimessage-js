import {StringBuilder} from "../util/string";
import {assertNever} from "../util/assertions";
import {Character} from "../util/char";

//

/** @internal */
export namespace ChunkType {
    export const LITERAL = Symbol("literal");
    export const ARGUMENT = Symbol("argument");
}

/** @internal */
export type LiteralChunk = {
    readonly type: typeof ChunkType.LITERAL,
    readonly value: string
};

/** @internal */
export type ArgumentChunk = {
    readonly type: typeof ChunkType.ARGUMENT,
    readonly index: number,
    readonly fallback: string
};

/** @internal */
export type Chunk = LiteralChunk | ArgumentChunk;

/** @internal */
export type Chunks = Chunk[];

/** @internal */
export namespace Chunks {

    export function stringify(chunks: Chunks): string {
        const sb = new StringBuilder();
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const { type } = chunk;
            switch (type) {
                case ChunkType.LITERAL:
                    if (chunk.value === `%`) sb.appendChar(Character.PERCENT);
                    sb.appendString(chunk.value);
                    break;
                case ChunkType.ARGUMENT:
                    sb.append(chunk.fallback);
                    break;
                default:
                    assertNever(type);
            }
        }
        return sb.toString();
    }

    /** @internal */
    export function parse(text: string): Chunks {
        const ret: Chunk[] = [];
        let start: number = 0;
        let head: number = 0;
        let autoIndex: number = 0;
        let c: number;

        function hasNext() {
            return head < text.length;
        }

        function next() {
            return text.charCodeAt(head++);
        }

        function literal(exclusive: boolean) {
            const end = exclusive ? head - 1 : head;
            if (start >= end) return;
            ret.push({
                type: ChunkType.LITERAL,
                value: text.substring(start, end)
            });
            start = end;
        }

        function argument(index: number) {
            ret.push({
                type: ChunkType.ARGUMENT,
                index,
                fallback: text.substring(start, head)
            });
            start = head;
        }

        while (hasNext()) {
            c = next();
            if (!Character.PERCENT.is(c)) {
                continue;
            }

            literal(true);
            if (!hasNext()) {
                // not an error
                ret.push({ type: ChunkType.LITERAL, value: "%" });
                start = head;
                continue;
            }

            c = next();
            if (Character.LOWERCASE_S.is(c)) {
                argument(autoIndex++);
                continue;
            }
            if (Character.PERCENT.is(c)) {
                literal(true);
                continue;
            }
            if (Character.ONE.value <= c && c <= Character.NINE.value) {
                let index: number = c - Character.ZERO.value;
                let termination: number = 0;

                while (hasNext()) {
                    c = next();
                    if (Character.LOWERCASE_S.is(c)) {
                        if (termination & 1) termination |= 2;
                        break;
                    }
                    if (termination) break;
                    if (Character.DOLLAR_SIGN.is(c)) {
                        termination |= 1;
                    } else if (Character.ZERO.value <= c && c <= Character.NINE.value) {
                        const newIndex = (index * 10) + (c - Character.ZERO.value);
                        if (newIndex > Number.MAX_SAFE_INTEGER) {
                            throw new Error(`Escape sequence at index` +
                                ` ${head} of lang string \"${text}\" is too large`);
                        }
                        index = newIndex;
                    } else {
                        break;
                    }
                }

                if (termination === 3) {
                    argument(index - 1);
                    continue;
                }
            }

            // Unrecognized escape. Treat % as literal and rewind
            ret.push({ type: ChunkType.LITERAL, value: "%" });
            start = head - 1; // rewind so the unrecognized char is re-evaluated
            head--;
        }

        literal(false);
        return ret;
    }

}
