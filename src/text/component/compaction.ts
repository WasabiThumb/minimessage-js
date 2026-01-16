import {Component} from "../component";
import type {TextComponent} from "./text";
import {Style} from "../style";
import {ArrayUtil} from "../../util/array";

/** @internal */
export namespace ComponentCompaction {

    function isText<C extends Component>(component: C): C extends TextComponent ? true : false {
        // @ts-ignore
        return component.type === "text";
    }

    function joinText(a: TextComponent, b: TextComponent): TextComponent {
        return Component.text(a.content() + b.content())
            .style(a.style())
            .append(...b.children());
    }

    //

    export function compact(self: Component, parentStyle: Style | null): Component {
        const children = self.children();
        let optimized: Component = self.children([]);
        if (parentStyle) optimized = optimized.style(self.style().unmerge(parentStyle));

        const childrenSize = children.length;
        if (childrenSize === 0) return optimized;

        if (childrenSize === 1 && isText(optimized)) {
            const textComponent = optimized as TextComponent;
            if (textComponent.content().length === 0) {
                const child = children[0];
                return child.style(child.style().merge(optimized.style())).compact();
            }
        }

        let childParentStyle: Style = optimized.style();
        if (parentStyle) childParentStyle = childParentStyle.merge(parentStyle);

        const childrenToAppend: Component[] = new Array(childrenSize);
        let head: number = 0;
        for (let child of children) {
            child = compact(child, childParentStyle);
            if (child.children().length === 0 && isText(child)) {
                const textComponent = child as TextComponent;
                if (textComponent.content().length === 0) continue;
            }
            childrenToAppend[head++] = child;
        }
        childrenToAppend.length = head;

        if (isText(optimized)) {
            while (childrenToAppend.length !== 0) {
                const child = childrenToAppend[0];
                const childStyle = child.style().merge(childParentStyle);

                if (isText(child) && Style.equals(childStyle, childParentStyle)) {
                    optimized = joinText(optimized as TextComponent, child as TextComponent);
                    childrenToAppend.splice(0, 1);
                    ArrayUtil.insertAtStart(childrenToAppend, child.children());
                } else {
                    break;
                }
            }
        }

        for (let i = 0; i + 1 < childrenToAppend.length; ) {
            const child = childrenToAppend[i];
            const neighbor = childrenToAppend[i + 1];

            if (child.children().length === 0 && isText(child) && isText(neighbor)) {
                const childStyle = child.style().merge(childParentStyle);
                const neighborStyle = neighbor.style().merge(childParentStyle);

                if (Style.equals(childStyle, neighborStyle)) {
                    childrenToAppend[i] = joinText(child as TextComponent, neighbor as TextComponent);
                    childrenToAppend.splice(i + 1, 1);
                    continue;
                }
            }

            i++;
        }

        return optimized.children(childrenToAppend);
    }

}
