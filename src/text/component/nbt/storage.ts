import {AbstractNBTComponent, NBTComponent} from "../nbt";
import type {Component} from "../../component";
import {Style} from "../../style";
import {defineAccessor} from "../../../util/accessor";
import {Key, KeyLike} from "../../../key";

//

export namespace StorageNBTComponent {
    export const TYPE = "storageNBT";
}

export interface StorageNBTComponent extends NBTComponent<StorageNBTComponent> {

    readonly type: typeof StorageNBTComponent.TYPE;

    storage(): Key;

    storage(storage: KeyLike): StorageNBTComponent;

}

//

type Extra = {
    storage: Key,
    nbtPath: string,
    interpret: boolean,
    separator: Component | null
};

/** @internal */
export class StorageNBTComponentImpl extends AbstractNBTComponent<StorageNBTComponentImpl, Extra> implements StorageNBTComponent {

    readonly type = StorageNBTComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    storage = defineAccessor<Key, KeyLike>(
        () => this._getExtra("storage"),
        (storage) => this._withExtra("storage", Key.key(storage))
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): StorageNBTComponentImpl {
        return new StorageNBTComponentImpl(extra, children, style);
    }

}
