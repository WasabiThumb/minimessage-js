import {HtmlStyle} from "./style";
import {StringHtmlWriter} from "./writer/string";
import {DomHTMLWriter} from "./writer/dom";
import {type MiniMessage} from "../mini";

//

export interface HtmlWriter {

    readonly minimessage: MiniMessage;

    openTag(tagName: string): this;

    closeTag(): this;

    style(style: HtmlStyle): this;

    property(name: string, value?: string): this;

    content(text: string): this;

}

export namespace HtmlWriter {

    export function string(instance: MiniMessage): StringHtmlWriter {
        return new StringHtmlWriter(instance);
    }

    export function dom(
        instance: MiniMessage,
        parent: ParentNode,
        elementFactory?: DomHTMLWriter.ElementFactory
    ): DomHTMLWriter {
        if (typeof elementFactory === "undefined") {
            const { ownerDocument } = parent;
            elementFactory = ownerDocument ?
                ((tagName) => ownerDocument!.createElement(tagName)) :
                ((tagName) => document.createElement(tagName));
        }
        return new DomHTMLWriter(instance, parent, elementFactory);
    }

}
