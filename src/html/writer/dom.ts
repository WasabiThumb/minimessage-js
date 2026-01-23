import {HtmlWriter} from "../writer";
import {Stack} from "../../util/stack";
import {HtmlStyle, HtmlStyleStore} from "../style";
import {DomEffects} from "../effects";

//

/**
 * Executed when the final tag of a DomHTMLWriter is closed.
 * Anticipates that the tag may become attached to a browser DOM,
 * then applies DOM effects if so.
 */
function applyDomEffects(element: ParentNode): void {
    if (typeof window === "undefined") return;

    const proceed = (() => {
        const { ownerDocument } = element;
        if (!ownerDocument) return;
        if (window !== ownerDocument.defaultView) return;
        DomEffects.apply(element);
    });

    if ("isConnected" in element && element.isConnected) {
        // Element is already connected
        proceed();
    } else {
        // Stall briefly to allow the caller to
        // connect the element
        if ("requestAnimationFrame" in window) {
            window.requestAnimationFrame(proceed);
        } else {
            setTimeout(proceed, 10);
        }
    }
}

export class DomHTMLWriter implements HtmlWriter {

    private readonly _parent: ParentNode;
    private readonly _stack: Stack<[ HTMLElement, HtmlStyleStore ]>;
    private readonly _elementFactory: DomHTMLWriter.ElementFactory;
    private _styles: HtmlStyleStore;

    constructor(parent: ParentNode, elementFactory: DomHTMLWriter.ElementFactory) {
        this._parent = parent;
        this._stack = new Stack();
        this._elementFactory = elementFactory;
        this._styles = HtmlStyleStore.EMPTY;
    }

    //

    openTag(tagName: string): this {
        const element: HTMLElement = this._elementFactory(tagName as keyof HTMLElementTagNameMap);
        this._stack.push([ element, { ...this._styles } ]);
        return this;
    }

    closeTag(): this {
        const data = this._stack.pop();
        if (data === null) throw new Error(`No tag to close`);

        let parentData = this._stack.peek();
        let parent: ParentNode;
        let domEffects: boolean;

        if (parentData === null) {
            parent = this._parent;
            domEffects = true;
        } else {
            parent = parentData[0];
            domEffects = false;
        }

        parent.appendChild(data[0]);
        this._styles = { ...data[1] };

        if (domEffects) applyDomEffects(parent);
        return this;
    }

    style(style: HtmlStyle): this {
        const tail = this._tail();
        style.applyToDocument(tail.style, this._styles);
        style.applyToStore(this._styles);
        return this;
    }

    property(name: string, value?: string): this {
        const tail = this._tail();
        tail.setAttribute(name, value || "");
        return this;
    }

    content(text: string): this {
        const tail = this._tail();
        const lines = text.split(`\n`);
        for (let i = 0; i < lines.length; i++) {
            if (i !== 0) tail.append(this._elementFactory("br"));
            tail.append(lines[i]);
        }
        return this;
    }

    private _tail(): HTMLElement {
        const ret = this._stack.peek();
        if (ret === null) throw new Error(`No open tag`);
        return ret[0];
    }

}

export namespace DomHTMLWriter {

    export type ElementFactory =
        <K extends keyof HTMLElementTagNameMap>(tagName: K) => HTMLElementTagNameMap[K];

}
