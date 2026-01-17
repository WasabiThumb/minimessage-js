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
        component = this.preRender(component, context);

        const { type } = component;
        let rendered: Component;

        switch (type) {
            case TextComponent.TYPE:
                rendered = this.renderText(component, context);
                break;
            case TranslatableComponent.TYPE:
                rendered = this.renderTranslatable(component, context);
                break;
            case BlockNBTComponent.TYPE:
                rendered = this.renderBlock(component, context);
                break;
            case EntityNBTComponent.TYPE:
                rendered = this.renderEntity(component, context);
                break;
            case StorageNBTComponent.TYPE:
                rendered = this.renderStorage(component, context);
                break;
            case SelectorComponent.TYPE:
                rendered = this.renderSelector(component, context);
                break;
            case ScoreComponent.TYPE:
                rendered = this.renderScore(component, context);
                break;
            case KeybindComponent.TYPE:
                rendered = this.renderKeybind(component, context);
                break;
            case ObjectComponent.TYPE:
                rendered = this.renderObject(component, context);
                break;
            default:
                assertNever(type);
        }

        rendered = this.postRender(rendered, context);
        return rendered;
    }

    protected preRender(component: Component, context: C): Component {
        return component;
    }

    protected postRender(component: Component, context: C): Component {
        return component;
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
