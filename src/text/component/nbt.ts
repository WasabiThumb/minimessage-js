import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import type { Component, ComponentLike } from "../component";
import {defineAccessor} from "../../util/accessor";

//

/** @internal */
export interface NBTComponent<C extends NBTComponent<C>> extends ScopedComponent<C> {

    nbtPath(): string;

    nbtPath(nbtPath: string): C;

    interpret(): boolean;

    interpret(interpret: boolean): C;

    separator(): Component | null;

    separator(separator: ComponentLike | null): C;

}

//

type Extra = {
    nbtPath: string,
    interpret: boolean,
    separator: Component | null
};

/** @internal */
export abstract class AbstractNBTComponent<C extends NBTComponent<C>, E extends Extra> extends AbstractScopedComponent<C, E> implements NBTComponent<C> {

    nbtPath = defineAccessor(
        () => this._getExtra("nbtPath"),
        (nbtPath) => this._withExtra("nbtPath", nbtPath)
    );

    interpret = defineAccessor(
        () => this._getExtra("interpret"),
        (interpret) => this._withExtra("interpret", interpret)
    );

    separator = defineAccessor(
        () => this._getExtra("separator"),
        (separator) => this._withExtra("separator", separator)
    );

}
