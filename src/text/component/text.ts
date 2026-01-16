import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import type {Component} from "../component";
import {Style} from "../style";
import {defineAccessor} from "../../util/accessor";

//

export namespace TextComponent {
    export const TYPE = "text";
}

export interface TextComponent extends ScopedComponent<TextComponent> {

    readonly type: typeof TextComponent.TYPE;

    content(): string;

    content(content: string): TextComponent;

}

//

type Extra = {
    content: string
};

/** @internal */
export class TextComponentImpl extends AbstractScopedComponent<TextComponentImpl, Extra> implements TextComponent {

    readonly type = TextComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    content = defineAccessor(
        () => this._getExtra("content"),
        (content) => this._withExtra("content", content)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): TextComponentImpl {
        return new TextComponentImpl(extra, children, style);
    }

}
