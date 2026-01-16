import {AbstractModifyingTag} from "./modifying";
import {ComponentFlattener, FlattenerListener} from "../../../text/flattener";
import {Node} from "../../tree";
import {ValueNode} from "../../tree/value";
import {codePointCount} from "../../../util/string";
import {TagNode} from "../../tree/tag";
import {InsertingTagImpl} from "./inserting";
import {TextColor} from "../../../text/style/textColor";
import {Component} from "../../../text/component";
import {TextComponent} from "../../../text/component/text";

//

/** @internal */
export abstract class AbstractColorChangingTag extends AbstractModifyingTag {

    private static readonly LENGTH_CALCULATOR = ComponentFlattener.builder()
        .mapper(TextComponent.TYPE, (c) => c.content())
        .unknownMapper(() => "_")
        .build();

    //

    private _visited: boolean = false;
    private _size: number = 0;
    private _disableApplyingColorDepth: number = -1;

    //

    protected get size(): number {
        return this._size;
    }

    visit(current: Node, depth: number) {
        if (this._visited) throw new Error(`Color changing tag instances cannot be reused`);
        if (current instanceof ValueNode) {
            const value = current.value();
            this._size += codePointCount(value);
        } else if (current instanceof TagNode) {
            const tag = current.tag();
            if (tag instanceof InsertingTagImpl) {
                AbstractColorChangingTag.LENGTH_CALCULATOR.flatten(
                    tag.value(),
                    FlattenerListener.of((s) => {
                        this._size += codePointCount(s);
                    })
                );
            }
        }
    }

    postVisit() {
        this._visited = true;
        this.init();
    }

    apply(current: Component, depth: number): Component {
        if ((this._disableApplyingColorDepth !== -1 && depth > this._disableApplyingColorDepth) || current.style().color() !== null) {
            if (this._disableApplyingColorDepth === -1 || depth < this._disableApplyingColorDepth) {
                this._disableApplyingColorDepth = depth;
            }
            if (current.type === "text") {
                this.skipColorForLengthOf(current.content());
            }
            return current.children([]);
        }

        this._disableApplyingColorDepth = -1;
        if (current.type === "text") {
            if (current.content().length !== 0) {
                const content = current.content();
                let parent = Component.empty();

                let head: number = 0;
                let codePoint: number;
                while (head < content.length) {
                    codePoint = content.codePointAt(head++)!;
                    if (codePoint > 0xFFFF) head++;

                    const child = Component.text(String.fromCodePoint(codePoint))
                        .style(current.style().color(this.color()));
                    this.advanceColor();
                    parent = parent.append(child);
                }

                return parent;
            } else {
                return Component.empty()
                    .style(current.style());
            }
        } else {
            const ret = current.children([]).colorIfAbsent(this.color());
            this.advanceColor();
            return ret;
        }
    }

    private skipColorForLengthOf(content: string): void {
        const count = codePointCount(content);
        for (let i = 0; i < count; i++) this.advanceColor();
    }

    // Lifecycle

    protected abstract init(): void;

    protected abstract advanceColor(): void;

    protected abstract color(): TextColor;

}

