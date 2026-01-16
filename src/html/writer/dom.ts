import {HtmlWriter} from "../writer";
import {Stack} from "../../util/stack";
import {HtmlStyle, HtmlStyleStore} from "../style";

//

export class DomHTMLWriter implements HtmlWriter {

    private readonly _parent: Node;
    private readonly _stack: Stack<[ HTMLElement, HtmlStyleStore ]>;
    private readonly _elementFactory: DomHTMLWriter.ElementFactory;
    private _styles: HtmlStyleStore;

    constructor(parent: Node, elementFactory: DomHTMLWriter.ElementFactory) {
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
        let parent: Node;
        if (parentData === null) {
            parent = this._parent;
        } else {
            parent = parentData[0];
        }

        parent.appendChild(data[0]);
        this._styles = { ...data[1] };

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
        this._tail().append(text);
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
