import {Token} from "./token";
import {RootNode} from "./tree/root";
import {ElementNode} from "./tree/element";
import {TagNode} from "./tree/tag";
import {TextColor} from "../text/style/textColor";

//

export type HighlightKind =
    | "text"
    | "punctuation"
    | "tag-name"
    | "tag-arg";

export interface HighlightSpan {
    start: number;
    end: number;
    kind: HighlightKind;
    /** Nesting depth of the *tag this span belongs to* (0 = top level). Not meaningful for "text". */
    depth: number;
    /**
     * Shared between an opening tag's punctuation/name/arg spans and its matching
     * closing tag's punctuation/name/arg spans. Undefined for plain text and for
     * tags with no matching close (self-closing, or left open / reset).
     */
    pairId?: number;
    /**
     * Resolved literal color, only ever set on a "tag-name" span for a tag that
     * resolves to a single static color (e.g. <red>, <color:#FF8652>). Never set
     * for positional tags like <gradient> or <rainbow> — those don't have one color.
     */
    color?: TextColor;
}

//

/**
 * Produces a flat, source-order list of highlight spans covering the entire input,
 * suitable for driving a syntax-highlighting overlay. `root` should come from
 * whatever already runs `MiniMessageParser.parseToTree` (tags are expected to
 * already be resolved via `TagNode.tag()`).
 */
export function highlightTree(root: RootNode, input: string): HighlightSpan[] {
    const spans: HighlightSpan[] = [];
    let nextPairId = 0;
    const pairIds = new WeakMap<TagNode, number>();

    function pairIdFor(node: TagNode): number | undefined {
        if (node.closeToken() === null) return undefined;
        let id = pairIds.get(node);
        if (id === undefined) {
            id = nextPairId++;
            pairIds.set(node, id);
        }
        return id;
    }

    /** Splits one tag token (open, close, or open-close) into punctuation/name/arg spans. */
    function pushTagTokenSpans(token: Token, depth: number, pairId: number | undefined, color: TextColor | undefined): void {
        const children = token.childTokens();
        if (children === null || children.length === 0) {
            // Shouldn't happen for real tag tokens, but fall back to one punctuation span.
            spans.push({ start: token.startIndex(), end: token.endIndex(), kind: "punctuation", depth, pairId });
            return;
        }

        let cursor = token.startIndex();

        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (child.startIndex() > cursor) {
                spans.push({ start: cursor, end: child.startIndex(), kind: "punctuation", depth, pairId });
            }

            const kind: HighlightKind = i === 0 ? "tag-name" : "tag-arg";
            spans.push({
                start: child.startIndex(),
                end: child.endIndex(),
                kind,
                depth,
                pairId,
                color: kind === "tag-name" ? color : undefined
            });

            cursor = child.endIndex();
        }

        if (cursor < token.endIndex()) {
            spans.push({ start: cursor, end: token.endIndex(), kind: "punctuation", depth, pairId });
        }
    }

    /** Pure/safe: only ever set for single-color "inserting" tags, never gradient/rainbow. */
    function resolvedColorOf(node: TagNode): TextColor | undefined {
        const tag = node.tag();
        if (tag.type !== "inserting") return undefined;
        const color = tag.value().style().color();
        return color ?? undefined;
    }

    function visit(node: ElementNode, depth: number): void {
        for (const child of node.children()) {
            if (child instanceof TagNode) {
                const pairId = pairIdFor(child);
                const color = resolvedColorOf(child);

                pushTagTokenSpans(child.token(), depth, pairId, color);
                visit(child, depth + 1);

                const closeToken = child.closeToken();
                if (closeToken !== null) {
                    pushTagTokenSpans(closeToken, depth, pairId, color);
                }
            } else {
                // TextNode (or any other leaf) — token() covers the raw text span.
                const token = child.token();
                if (token !== null) {
                    spans.push({ start: token.startIndex(), end: token.endIndex(), kind: "text", depth });
                }
                visit(child, depth + 1);
            }
        }
    }

    visit(root, 0);

    // Spans are pushed in tree order, not source order (a tag's own spans come
    // before its children's, but its close-tag spans come after all of them).
    // Sort once at the end so the caller gets a simple left-to-right list.
    spans.sort((a, b) => a.start - b.start);

    return spans;
}