import type {HtmlWriter} from "../writer";
import {HtmlStyle, HtmlStyleStore} from "../style";
import {Stack} from "../../util/stack";
import {StringBuilder} from "../../util/string";
import {LookupTable} from "../../util/lut";
import {Character} from "../../util/char";

//

const HTML_ENTITIES: LookupTable<number, string> = LookupTable.number((put) => {
    put(Character.QUOTATION.value,    `&quot;`);
    put(Character.APOSTROPHE.value,   `&apos;`);
    put(Character.AMPERSAND.value,    `&amp;`);
    put(Character.LESS_THAN.value,    `&lt;`);
    put(Character.GREATER_THAN.value, `&gt;`);
    put(Character.NEWLINE.value,      `<br>`);
});

//

export class StringHtmlWriter implements HtmlWriter {

    private readonly _out: StringBuilder;
    private readonly _stack: Stack<[ string, HtmlStyleStore ]>;
    private _writingProperties: boolean;
    private _properties: Record<string, StringBuilder>;
    private _styles: HtmlStyleStore;

    constructor() {
        this._out = new StringBuilder();
        this._stack = new Stack();
        this._writingProperties = false;
        this._properties = {};
        this._styles = HtmlStyleStore.EMPTY;
    }

    //

    openTag(tagName: string): this {
        this._closeProperties();

        this._out.appendChar(Character.LESS_THAN)
            .appendString(tagName);

        this._stack.push([ tagName, { ...this._styles } ]);
        this._writingProperties = true;
        this._properties = {};

        return this;
    }

    closeTag(): this {
        const data = this._stack.pop();
        if (data === null) throw new Error(`No tag to close`);

        this._closeProperties();
        this._out.appendString("</")
            .appendString(data[0])
            .appendChar(Character.GREATER_THAN);

        this._styles = { ...data[1] };
        return this;
    }

    style(style: HtmlStyle): this {
        this._checkWritingProperties();

        let sb: StringBuilder;
        if ("style" in this._properties) {
            sb = this._properties["style"];
        } else {
            sb = new StringBuilder();
            this._properties["style"] = sb;
        }

        style.applyToInlineSource(sb, this._styles);
        style.applyToStore(this._styles);
        return this;
    }

    property(name: string, value?: string): this {
        this._checkWritingProperties();

        let sb: StringBuilder;
        if (value) {
            sb = new StringBuilder(value.length);
            sb.appendString(value);
        } else {
            sb = new StringBuilder(0);
        }

        this._properties[name] = sb;
        return this;
    }

    content(text: string): this {
        this._closeProperties();
        this._writeEscaping(text);
        return this;
    }

    toString(): string {
        return this._out.toString();
    }

    private _checkWritingProperties(): void {
        if (this._writingProperties) return;
        throw new Error("Method call must follow a call to #openTag and precede any call to #content");
    }

    private _closeProperties(): void {
        if (this._writingProperties) {
            for (const key of Object.keys(this._properties)) {
                this._out.appendChar(Character.SPACE)
                    .appendString(key)
                    .appendString(`="`);

                this._writeEscaping(this._properties[key]);
                this._out.appendChar(Character.QUOTATION);
            }
            this._out.appendChar(Character.GREATER_THAN);
            this._writingProperties = false;
        }
    }

    private _writeEscaping(text: string | StringBuilder) {
        let c: number;
        for (let i = 0; i < text.length; i++) {
            c = text.charCodeAt(i);
            const ent = HTML_ENTITIES.get(c);
            if (ent) {
                this._out.appendString(ent);
            } else {
                this._out.appendChar(c);
            }
        }
    }

}
