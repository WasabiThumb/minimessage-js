import {AbstractScopedComponent, ScopedComponent} from "./scoped";
import type {Component} from "../component";
import {Style} from "../style";
import {defineAccessor} from "../../util/accessor";

//

export namespace ScoreComponent {
    export const TYPE = "score";
}

export interface ScoreComponent extends ScopedComponent<ScoreComponent> {

    readonly type: typeof ScoreComponent.TYPE;

    name(): string;

    name(name: string): ScoreComponent;

    objective(): string;

    objective(objective: string): ScoreComponent;

}

//

type Extra = {
    name: string;
    objective: string;
};

/** @internal */
export class ScoreComponentImpl extends AbstractScopedComponent<ScoreComponentImpl, Extra> implements ScoreComponent {

    readonly type = ScoreComponent.TYPE;

    constructor(extra: Extra, children?: Component[], style?: Style) {
        super(extra, children, style);
    }

    //

    name = defineAccessor(
        () => this._getExtra("name"),
        (name) => this._withExtra("name", name)
    );

    objective = defineAccessor(
        () => this._getExtra("objective"),
        (objective) => this._withExtra("objective", objective)
    );

    protected _mutate(extra: Extra, children: Component[], style: Style): ScoreComponentImpl {
        return new ScoreComponentImpl(extra, children, style);
    }

}
