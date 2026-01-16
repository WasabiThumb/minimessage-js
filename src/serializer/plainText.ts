import {ComponentSerializer} from "./types";
import {Component} from "../text/component";
import {ComponentFlattener, FlattenerListener} from "../text/flattener";
import {StringBuilder} from "../util/string";
import {TextComponent} from "../text/component/text";

//

export type PlainTextComponentSerializer = ComponentSerializer<Component, TextComponent, string>;

/** @internal */
class PlainTextComponentSerializerImpl implements PlainTextComponentSerializer {

    static readonly DEFAULT_FLATTENER: ComponentFlattener = ComponentFlattener.basic()
        .toBuilder()
        .unknownMapper((component) => {
            throw new Error(`Don't know how to turn component of type "${component.type}" into a string`);
        })
        .build();

    //

    private readonly _flattener: ComponentFlattener;

    constructor(flattener: ComponentFlattener) {
        this._flattener = flattener;
    }

    //

    serialize(component: Component): string {
        const builder = new StringBuilder();
        this._flattener.flatten(component, FlattenerListener.of((text) => {
            builder.append(text);
        }));
        return builder.toString();
    }

    deserialize(input: string): TextComponent {
        return Component.text(input);
    }

}

export namespace PlainTextComponentSerializer {

    export interface Builder {

        flattener(flattener: ComponentFlattener): Builder;

        build(): PlainTextComponentSerializer;

    }

    /** @internal */
    class BuilderImpl implements Builder {

        private _flattener: ComponentFlattener = PlainTextComponentSerializerImpl.DEFAULT_FLATTENER;

        //

        flattener(flattener: ComponentFlattener): Builder {
            this._flattener = flattener;
            return this;
        }

        build() {
            return new PlainTextComponentSerializerImpl(this._flattener);
        }

    }

    //

    const INSTANCE = (new BuilderImpl()).build();

    export function plainText(): PlainTextComponentSerializer {
        return INSTANCE;
    }

    export function builder(): Builder {
        return new BuilderImpl();
    }

}
