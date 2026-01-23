import {HtmlStyle} from "./style";
import {StringHtmlWriter} from "./writer/string";
import {DomHTMLWriter} from "./writer/dom";

//

export interface HtmlWriter {

    openTag(tagName: string): this;

    closeTag(): this;

    style(style: HtmlStyle): this;

    property(name: string, value?: string): this;

    content(text: string): this;

}

export namespace HtmlWriter {

    export function string(): StringHtmlWriter {
        return new StringHtmlWriter();
    }

    export function dom(parent: ParentNode, elementFactory?: DomHTMLWriter.ElementFactory): DomHTMLWriter {
        if (typeof elementFactory === "undefined") {
            const { ownerDocument } = parent;
            elementFactory = ownerDocument ?
                ((tagName) => ownerDocument!.createElement(tagName)) :
                ((tagName) => document.createElement(tagName));
        }
        return new DomHTMLWriter(parent, elementFactory);
    }

}
