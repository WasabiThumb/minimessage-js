import {Component} from "../../../text/component";
import {Style} from "../../../text/style";

//

export interface InsertingTag {
    readonly type: "inserting"
    value(): Component
    allowsChildren(): boolean
}

/** @internal */
export class InsertingTagImpl implements InsertingTag {

    readonly type = "inserting";

    constructor(
        private readonly _value: Component,
        private readonly _allowsChildren: boolean = true
    ) { }

    //

    value(): Component {
        return this._value;
    }

    allowsChildren(): boolean {
        return this._allowsChildren;
    }

}

/** @internal */
export class StylingTagImpl implements InsertingTag {

    readonly type = "inserting";

    constructor(
        private readonly _styles: (builder: Style.Builder) => void
    ) { }

    //

    value(): Component {
        const component = Component.text("");
        const style = Style.style(this._styles);
        return component.style(style);
    }

    allowsChildren(): boolean {
        return true;
    }

}
