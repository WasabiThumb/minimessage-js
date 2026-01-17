import {Component, ComponentTypeMap} from "./component";
import {FlattenerListener} from "./flattener/listener";
import {Style} from "./style";
import {Stack} from "../util/stack";
import {TextComponent} from "./component/text";
import {KeybindComponent} from "./component/keybind";
import {SelectorComponent} from "./component/selector";
import {TranslatableComponent} from "./component/translatable";
import {ObjectComponent} from "./component/object";
import {Key} from "../key";
import {SpriteObjectContents} from "./object/sprite";

//

export {
    FlattenerListener
};

export interface ComponentFlattener {

    flatten(input: Component, listener: FlattenerListener): void;

    toBuilder(): ComponentFlattener.Builder;

}

type Handler = (component: Component) => string;
type Flatteners = { [P in Component["type"]]?: Handler };
type StackEntry = {
    component: Component,
    stylesToPop: number
};

/** @internal */
class ComponentFlattenerImpl implements ComponentFlattener {

    private readonly _flatteners: Flatteners;
    private readonly _unknownHandler: Handler | null;

    constructor(
        flatteners: Flatteners,
        unknownHandler: Handler | null
    ) {
        this._flatteners = flatteners;
        this._unknownHandler = unknownHandler;
    }

    //

    flatten(input: Component, listener: FlattenerListener) {
        const l = FlattenerListener.normalize(listener);
        const componentStack: Stack<StackEntry> = new Stack();
        const styleStack: Stack<Style> = new Stack();

        componentStack.push({ component: input, stylesToPop: 1 });

        let entry: StackEntry | null;
        while ((entry = componentStack.pop()) != null) {
            const component = entry.component;
            const handler = this.handler(component);
            const style = component.style();

            l.pushStyle(style);
            styleStack.push(style);

            if (handler)
                l.component(handler(component));

            const children = component.children();
            if (children.length !== 0 && l.shouldContinue()) {
                const z =  children.length - 1;
                for (let i = z; i >= 0; i--) {
                    if (i === z) {
                        componentStack.push({
                            component: children[i],
                            stylesToPop: entry.stylesToPop + 1
                        });
                    } else {
                        componentStack.push({
                            component: children[i],
                            stylesToPop: 1
                        });
                    }
                }
            } else {
                for (let i = entry.stylesToPop; i > 0; i--) {
                    const style = styleStack.pop()!;
                    l.popStyle(style);
                }
            }
        }

        while (styleStack.size !== 0) {
            const style = styleStack.pop()!;
            l.popStyle(style);
        }
    }

    toBuilder(): ComponentFlattener.Builder {
        const builder = ComponentFlattener.builder();
        for (const key of Object.keys(this._flatteners)) {
            const type = key as unknown as keyof Flatteners;
            builder.mapper(type, this._flatteners[type]!);
        }
        return builder;
    }

    private handler(component: Component): Handler | null {
        const handler = this._flatteners[component.type];
        if (handler) return handler;
        return this._unknownHandler;
    }

}

export namespace ComponentFlattener {

    export interface Builder {

        mapper<K extends keyof ComponentTypeMap>(
            type: K,
            converter: (component: ComponentTypeMap[K]) => string
        ): Builder;

        unknownMapper(
            converter: ((component: Component) => string) | null
        ): Builder;

        build(): ComponentFlattener;

    }

    /** @internal */
    class BuilderImpl implements Builder {

        private readonly _flatteners: Flatteners = {};
        private _unknownHandler: Handler | null = null;

        //

        mapper<T extends Component>(
            type: T["type"],
            converter: (component: T) => string
        ): Builder {
            this._flatteners[type] = converter as unknown as Handler;
            return this;
        }

        unknownMapper(
            converter: ((component: Component) => string) | null
        ): Builder {
            this._unknownHandler = converter;
            return this;
        }

        build(): ComponentFlattener {
            return new ComponentFlattenerImpl(
                { ...this._flatteners },
                this._unknownHandler
            );
        }

    }

    //

    export function builder(): Builder {
        return new BuilderImpl();
    }

    const BASIC = builder()
        .mapper(KeybindComponent.TYPE, (c) => c.keybind())
        .mapper(SelectorComponent.TYPE, (c) => c.pattern())
        .mapper(TextComponent.TYPE, (c) => c.content())
        .mapper(TranslatableComponent.TYPE, (c) => {
            const fallback = c.fallback();
            return fallback !== null ? fallback : c.key();
        })
        .mapper(ObjectComponent.TYPE, (c) => {
            const contents = c.contents();
            if (contents.type === "sprite") {
                let sprite = contents.sprite();
                let atlas = contents.atlas();
                return Key.equals(atlas, SpriteObjectContents.DEFAULT_ATLAS) ?
                    `[${sprite.asMinimalString()}]` :
                    `[${sprite.asMinimalString()}@${atlas.asMinimalString()}]`;
            } else if (contents.type === "playerHead") {
                let name = contents.name();
                if (name === null) name = "unknown player";
                return `[${name} head]`;
            } else {
                return "";
            }
        })
        .build();

    const TEXT_ONLY = builder()
        .mapper(TextComponent.TYPE, (c) => c.content())
        .build();

    export function basic(): ComponentFlattener {
        return BASIC;
    }

    export function textOnly(): ComponentFlattener {
        return TEXT_ONLY;
    }

}
