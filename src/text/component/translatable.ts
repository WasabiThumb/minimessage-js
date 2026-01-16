import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import type { Component } from "../component";
import {Style} from "../style";
import {defineAccessor} from "../../util/accessor";
import {ArrayUtil} from "../../util/array";

//

export type TranslationArgument = boolean | number | Component;

export namespace TranslatableComponent {
    export const TYPE = "translatable";
}

export interface TranslatableComponent extends ScopedComponent<TranslatableComponent> {

    readonly type: typeof TranslatableComponent.TYPE;

    key(): string;

    key(key: string): TranslationArgument;

    arguments(): TranslationArgument[];

    arguments(args: TranslationArgument[]): TranslatableComponent;

    fallback(): string | null;

    fallback(fallback: string | null): TranslatableComponent;

}

//

type Extra = {
    key: string,
    arguments: TranslationArgument[],
    fallback: string | null
};

/** @internal */
export class TranslatableComponentImpl extends AbstractScopedComponent<TranslatableComponentImpl, Extra> implements TranslatableComponent {

    readonly type = TranslatableComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    key = defineAccessor(
        () => this._getExtra("key"),
        (key) => this._withExtra("key", key)
    );

    arguments = defineAccessor(
        () => ArrayUtil.immutableView(this._getExtra("arguments")),
        (args) => this._withExtra("arguments", ArrayUtil.immutableView(args))
    );

    fallback = defineAccessor(
        () => this._getExtra("fallback"),
        (fallback) => this._withExtra("fallback", fallback)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): TranslatableComponentImpl {
        return new TranslatableComponentImpl(extra, children, style);
    }

}
