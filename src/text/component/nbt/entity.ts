import {AbstractNBTComponent, NBTComponent} from "../nbt";
import type {Component} from "../../component";
import {Style} from "../../style";
import {defineAccessor} from "../../../util/accessor";

//

export namespace EntityNBTComponent {
    export const TYPE = "entityNBT";
}

export interface EntityNBTComponent extends NBTComponent<EntityNBTComponent> {

    readonly type: typeof EntityNBTComponent.TYPE;

    selector(): string;

    selector(selector: string): EntityNBTComponent;

}

//

type Extra = {
    selector: string,
    nbtPath: string,
    interpret: boolean,
    separator: Component | null
};

/** @internal */
export class EntityNBTComponentImpl extends AbstractNBTComponent<EntityNBTComponentImpl, Extra> implements EntityNBTComponent {

    readonly type = EntityNBTComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    selector = defineAccessor(
        () => this._getExtra("selector"),
        (selector) => this._withExtra("selector", selector)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): EntityNBTComponentImpl {
        return new EntityNBTComponentImpl(extra, children, style);
    }

}
