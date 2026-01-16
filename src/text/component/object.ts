import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import {ObjectContents} from "../object";
import type {Component} from "../component";
import {Style} from "../style";
import {defineAccessor} from "../../util/accessor";

//

export namespace ObjectComponent {
    export const TYPE = "object";
}

export interface ObjectComponent extends ScopedComponent<ObjectComponent> {

    readonly type: typeof ObjectComponent.TYPE;

    contents(): ObjectContents;

    contents(contents: ObjectContents): ObjectComponent;

}

//

type Extra = {
    contents: ObjectContents;
};

/** @internal */
export class ObjectComponentImpl extends AbstractScopedComponent<ObjectComponentImpl, Extra> implements ObjectComponent {

    readonly type = ObjectComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    contents = defineAccessor(
        () => this._getExtra("contents"),
        (contents) => this._withExtra("contents", contents)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): ObjectComponentImpl {
        return new ObjectComponentImpl(extra, children, style);
    }

}
