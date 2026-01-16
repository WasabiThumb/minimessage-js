import {Component} from "./component";
import {TextComponent} from "./component/text";
import {TranslatableComponent} from "./component/translatable";
import {SelectorComponent} from "./component/selector";
import {ScoreComponent} from "./component/score";
import {KeybindComponent} from "./component/keybind";
import {ObjectComponent} from "./component/object";
import {BlockNBTComponent} from "./component/nbt/block";
import {EntityNBTComponent} from "./component/nbt/entity";
import {StorageNBTComponent} from "./component/nbt/storage";
import {assertNever} from "../util/assertions";

//

export interface ComponentRenderer<C> {

    render(component: Component, context: C): Component;

    mapContext<T>(transformer: (renderer: T) => C): ComponentRenderer<T>;

}

/** @internal */
abstract class FunctionalComponentRenderer<C> implements ComponentRenderer<C> {

    abstract render(component: Component, context: C): Component;

    mapContext<T>(transformer: (renderer: T) => C): ComponentRenderer<T> {
        return new MappedComponentRenderer(this, transformer);
    }

}

/** @internal */
class MappedComponentRenderer<C, S> extends FunctionalComponentRenderer<C> {

    private readonly _backing: ComponentRenderer<S>;
    private readonly _transformer: (context: C) => S;

    constructor(
        backing: ComponentRenderer<S>,
        transformer: (context: C) => S
    ) {
        super();
        this._backing = backing;
        this._transformer = transformer;
    }

    render(component: Component, context: C): Component {
        return this._backing.render(component, this._transformer.apply(null, [ context ]));
    }

}

export abstract class AbstractComponentRenderer<C> extends FunctionalComponentRenderer<C> {

    protected constructor() {
        super();
    }

    //

    render(component: Component, context: C): Component {
        const { type } = component;
        switch (type) {
            case TextComponent.TYPE: return this.renderText(component, context);
            case TranslatableComponent.TYPE: return this.renderTranslatable(component, context);
            case BlockNBTComponent.TYPE: return this.renderBlock(component, context);
            case EntityNBTComponent.TYPE: return this.renderEntity(component, context);
            case StorageNBTComponent.TYPE: return this.renderStorage(component, context);
            case SelectorComponent.TYPE: return this.renderSelector(component, context);
            case ScoreComponent.TYPE: return this.renderScore(component, context);
            case KeybindComponent.TYPE: return this.renderKeybind(component, context);
            case ObjectComponent.TYPE: return this.renderObject(component, context);
            default:
                assertNever(type);
        }
    }

    protected abstract renderText(component: TextComponent, context: C): Component;

    protected abstract renderTranslatable(component: TranslatableComponent, context: C): Component;

    protected abstract renderBlock(component: BlockNBTComponent, context: C): Component;

    protected abstract renderEntity(component: EntityNBTComponent, context: C): Component;

    protected abstract renderStorage(component: StorageNBTComponent, context: C): Component;

    protected abstract renderSelector(component: SelectorComponent, context: C): Component;

    protected abstract renderScore(component: ScoreComponent, context: C): Component;

    protected abstract renderKeybind(component: KeybindComponent, context: C): Component;

    protected abstract renderObject(component: ObjectComponent, context: C): Component;

}
