import {Component, TextDecoration} from "../text";
import {HoverEvent} from "../text/style";
import {AbstractComponentRenderer} from "../text/renderer";
import {HtmlWriter} from "./writer";
import {HtmlStyle} from "./style";
import {PlainTextComponentSerializer} from "../serializer";
import {Translations} from "../i18n";
import {TextComponent} from "../text/component/text";
import {TranslatableComponent} from "../text/component/translatable";
import {SelectorComponent} from "../text/component/selector";
import {ScoreComponent} from "../text/component/score";
import {KeybindComponent} from "../text/component/keybind";
import {ObjectComponent} from "../text/component/object";
import {BlockNBTComponent} from "../text/component/nbt/block";
import {EntityNBTComponent} from "../text/component/nbt/entity";
import {StorageNBTComponent} from "../text/component/nbt/storage";

//

export class HtmlComponentRenderer extends AbstractComponentRenderer<HtmlWriter> {

    private static readonly HOVER_EVENT_RENDERER = (() => {
        const handlers = new HoverEvent.Handlers<HtmlWriter, void>();
        handlers.register(HoverEvent.Action.SHOW_TEXT, (event, context) => {
            const text = PlainTextComponentSerializer.plainText().serialize(event.value());
            context.property("title", text);
        });
        handlers.register(HoverEvent.Action.SHOW_ENTITY, (event, context) => {
            const name = event.value().name();
            const text = name !== null ?
                PlainTextComponentSerializer.plainText().serialize(name) :
                event.value().type();
            context.property("title", text);
        });
        handlers.register(HoverEvent.Action.SHOW_ITEM, (event, context) => {
            let text: string = event.value().item().asString();
            const count = event.value().count();
            if (count !== 1) text += ` x${count}`;
            context.property("title", text);
        });
        return handlers;
    })();

    //

    private readonly _translations: Translations;
    
    constructor(translations: Translations) {
        super();
        this._translations = translations;
    }

    //

    protected renderText(component: TextComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        writer.content(component.content());
        this._close(component, writer);
        return component;
    }

    protected renderTranslatable(component: TranslatableComponent, writer: HtmlWriter): Component {
        const translated = this._translations.translate(component.key(), component.arguments());
        this.render(translated, writer);
        return translated;
    }

    protected renderBlock(component: BlockNBTComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    protected renderEntity(component: EntityNBTComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    protected renderStorage(component: StorageNBTComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    protected renderSelector(component: SelectorComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    protected renderScore(component: ScoreComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    protected renderKeybind(component: KeybindComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    protected renderObject(component: ObjectComponent, writer: HtmlWriter): Component {
        this._open(component, writer);
        // TODO
        this._close(component, writer);
        return component;
    }

    //

    private _open(component: Component, writer: HtmlWriter): void {
        writer.openTag("span");

        // Decorations
        let s: TextDecoration.State;
        s = component.decoration(TextDecoration.BOLD);
        if (s !== TextDecoration.State.NOT_SET) {
            writer.style(HtmlStyle.fontWeight(s === TextDecoration.State.TRUE ? "bold" : "normal"));
        }

        s = component.decoration(TextDecoration.ITALIC);
        if (s !== TextDecoration.State.NOT_SET) {
            writer.style(HtmlStyle.fontStyle(s === TextDecoration.State.TRUE ? "italic" : "normal"));
        }

        s = component.decoration(TextDecoration.OBFUSCATED);
        if (s !== TextDecoration.State.NOT_SET) {
            writer.property("data-mm-obfuscated", s);
        }

        const underlined = component.decoration(TextDecoration.UNDERLINED);
        const strikethrough = component.decoration(TextDecoration.STRIKETHROUGH);

        if (underlined !== TextDecoration.State.NOT_SET ||
            strikethrough !== TextDecoration.State.NOT_SET
        ) {
            writer.style(HtmlStyle.textDecoration(underlined, strikethrough));
        }

        // Color
        const color = component.color();
        if (color) writer.style(HtmlStyle.color(color.asHexString()));

        // Shadow Color
        const shadowColor = component.shadowColor();
        if (shadowColor) writer.style(HtmlStyle.textShadow(shadowColor.asHexString()));

        // Hover Event
        const hover = component.hoverEvent();
        if (hover) HtmlComponentRenderer.HOVER_EVENT_RENDERER.invoke(hover, writer);
    }

    private _close(component: Component, writer: HtmlWriter): void {
        for (const child of component.children()) {
            this.render(child, writer);
        }
        writer.closeTag();
    }

}

export namespace HtmlComponentRenderer {

    const INSTANCE = new HtmlComponentRenderer(Translations.empty());

    export function renderer(
        translations: Translations = Translations.empty()
    ): HtmlComponentRenderer {
        if (arguments.length === 0) return INSTANCE;
        return new HtmlComponentRenderer(translations);
    }
    
}
