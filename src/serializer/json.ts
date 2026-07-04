import {ComponentSerializer} from "./types";
import {ClickEvent, HoverEvent, NamedTextColor, ShadowColor, Style, TextColor, TextDecoration} from "../text/style";
import {UUID} from "../util/uuid";
import {assertNever} from "../util/assertions";
import {Component} from "../text/component";
import {PlayerHeadObjectContents} from "../text/object/playerHead";
import {ObjectContents, SpriteObjectContents} from "../text/object";
import {
    JsonAtlasObjectComponent,
    JsonBaseComponent,
    JsonBlockNBTComponent,
    JsonClickEvent,
    JsonComponent,
    JsonComponentKeyValues,
    JsonEntityNBTComponent,
    JsonHoverEvent,
    JsonKeybindComponent,
    JsonPlayerObjectComponent,
    JsonPlayerProfile,
    JsonPlayerProfileProperty,
    JsonScoreboardComponent,
    JsonSelectorComponent,
    JsonStorageNBTComponent,
    JsonTextComponent,
    JsonTranslatableComponent
} from "./json/types";
import {TextComponent} from "../text/component/text";
import {ScoreComponent} from "../text/component/score";
import {SelectorComponent} from "../text/component/selector";
import {KeybindComponent} from "../text/component/keybind";
import {ObjectComponent} from "../text/component/object";
import {BlockNBTComponent} from "../text/component/nbt/block";
import {StorageNBTComponent} from "../text/component/nbt/storage";
import {EntityNBTComponent} from "../text/component/nbt/entity";
import {TranslatableComponent, TranslationArgument} from "../text/component/translatable";
import {Key} from "../key";

//

export type JsonComponentSerializer = ComponentSerializer<Component, Component, JsonComponent> & {
    deserialize(input: any): Component;
};

/** @internal */
class JsonComponentSerializerImpl implements JsonComponentSerializer {

    private static readonly CLICK_EVENT_SERIALIZER = (() => {
        const handlers = new ClickEvent.Handlers<JsonComponentSerializerImpl, JsonClickEvent>();
        handlers.register(ClickEvent.Action.RUN_COMMAND, (event) => {
            return { action: "run_command", command: event.payload().value() };
        });
        handlers.register(ClickEvent.Action.SUGGEST_COMMAND, (event) => {
            return { action: "suggest_command", command: event.payload().value() };
        });
        handlers.register(ClickEvent.Action.OPEN_URL, (event) => {
            return { action: "open_url", url: event.payload().value() };
        });
        handlers.register(ClickEvent.Action.OPEN_FILE, (event) => {
            return { action: "open_file", path: event.payload().value() }
        });
        handlers.register(ClickEvent.Action.COPY_TO_CLIPBOARD, (event) => {
            return { action: "copy_to_clipboard", value: event.payload().value() };
        });
        handlers.register(ClickEvent.Action.CHANGE_PAGE, (event) => {
            return { action: "change_page", page: event.payload().integer() };
        });
        handlers.register(ClickEvent.Action.CUSTOM, (event) => {
            const custom = event.payload();
            const ret: JsonClickEvent.Custom = { action: "custom", id: custom.key().asString() };
            const nbt = custom.nbt();
            if (nbt !== null) ret.payload = nbt;
            return ret;
        });
        return handlers;
    })();

    private static readonly HOVER_EVENT_SERIALIZER = (() => {
        const handlers = new HoverEvent.Handlers<JsonComponentSerializerImpl, JsonHoverEvent>();
        handlers.register(HoverEvent.Action.SHOW_ITEM, (event) => {
            const value = event.value();
            return { action: "show_item", id: value.item().asString(), count: value.count() };
        });
        handlers.register(HoverEvent.Action.SHOW_TEXT, (event, context) => {
            return { action: "show_text", value: context.serialize(event.value()) };
        });
        handlers.register(HoverEvent.Action.SHOW_ENTITY, (event, context) => {
            const value = event.value();
            let ret: JsonHoverEvent.ShowEntity = { action: "show_entity", id: value.type(), uuid: value.id() };
            const name = value.name();
            if (name) ret.name = context.serialize(name);
            return ret;
        });
        return handlers;
    })();

    //

    serialize(component: Component): JsonComponent {
        switch (component.type) {
            case TextComponent.TYPE:
                return this.serializeText(component);
            case TranslatableComponent.TYPE:
                return this.serializeTranslatable(component);
            case ScoreComponent.TYPE:
                return this.serializeScore(component);
            case SelectorComponent.TYPE:
                return this.serializeSelector(component);
            case KeybindComponent.TYPE:
                return this.serializeKeybind(component);
            case StorageNBTComponent.TYPE:
                return this.serializeStorageNbt(component);
            case BlockNBTComponent.TYPE:
                return this.serializeBlockNbt(component);
            case EntityNBTComponent.TYPE:
                return this.serializeEntityNbt(component);
            case ObjectComponent.TYPE:
                return this.serializeObject(component);
            default:
                assertNever(component);
        }
    }

    deserialize(input: any): Component {
        if (typeof input !== "object" || input === null)
            return Component.text(`${input}`);

        if (Array.isArray(input)) {
            const array = input as any[];
            let ret: Component | null = null;

            for (let i = 0; i < array.length; i++) {
                const next = this.deserialize(array[i]);
                if (ret === null) {
                    ret = next;
                } else {
                    ret = ret.append(next);
                }
            }

            if (ret === null)
                throw new Error(`Unable to deserialize empty array`);

            return ret;
        }

        const get: (<K extends keyof JsonComponentKeyValues>(key: K) => JsonComponentKeyValues[K]) = ((key) => {
            return (input as unknown as JsonComponentKeyValues)[key];
        });
        const getString = ((key: keyof JsonComponentKeyValues) => {
            return `${get(key)}`;
        });

        const style = Style.style();
        let extra: Component[] | null = null;
        let text: string | null = null;
        let translate: string | null = null;
        let translateFallback: string | null = null;
        let translateWith: TranslationArgument[] | null = null;
        let scoreName: string | null = null;
        let scoreObjective: string | null = null;
        let selector: string | null = null;
        let keybind: string | null = null;
        let nbt: string | null = null;
        let nbtInterpret: boolean = false;
        let nbtBlock: BlockNBTComponent.Pos | null = null;
        let nbtEntity: string | null = null;
        let nbtStorage: string | null = null;
        let separator: Component | null = null;
        let atlas: string | null = null;
        let sprite: string | null = null;
        let playerHeadContents: PlayerHeadObjectContents.Builder | null = null;
        let playerHeadContentsHasProfile: boolean = false;

        for (const key of Object.keys(input)) {
            const qual = key as unknown as keyof JsonComponentKeyValues;
            switch (qual) {
                case "text":
                    text = getString(qual);
                    break;
                case "translate":
                    translate = getString(qual);
                    break;
                case "fallback":
                    translateFallback = getString(qual);
                    break;
                case "with":
                    translateWith = this.deserializeList(get(qual)!);
                    break;
                case "score":
                    const jsonScore = get(qual)!;
                    scoreName = jsonScore.name;
                    scoreObjective = jsonScore.objective;
                    break;
                case "selector":
                    selector = getString(qual);
                    break;
                case "keybind":
                    keybind = getString(qual);
                    break;
                case "nbt":
                    nbt = getString(qual);
                    break;
                case "interpret":
                    nbtInterpret = !!get(qual);
                    break;
                case "block":
                    const pos = getString(qual);
                    nbtBlock = BlockNBTComponent.Pos.fromString(pos);
                    break;
                case "entity":
                    nbtEntity = getString(qual);
                    break;
                case "storage":
                    nbtStorage = getString(qual);
                    break;
                case "extra":
                    extra = this.deserializeList(get(qual)!);
                    break;
                case "separator":
                    separator = this.deserialize(get(qual));
                    break;
                case "atlas":
                    atlas = getString(qual);
                    break;
                case "sprite":
                    sprite = getString(qual);
                    break;
                case "player":
                    if (playerHeadContents === null) playerHeadContents = ObjectContents.playerHead();
                    const data = get(qual)!;
                    if (typeof data === "string") {
                        playerHeadContentsHasProfile = true;
                        playerHeadContents.name(data);
                    } else if (typeof data === "object") {
                        playerHeadContentsHasProfile = true;

                        if ("name" in data) playerHeadContents.name(`${data.name}`);
                        if ("id" in data) playerHeadContents.id(UUID.fromArray(data.id!).toString());
                        if ("texture" in data) playerHeadContents.texture(`${data.texture}`);

                        const { properties } = data;
                        if (properties && Array.isArray(properties)) {
                            for (let i = 0; i < properties.length; i++) {
                                const jsonProperty = properties[i];
                                const { signature } = jsonProperty;
                                const property = PlayerHeadObjectContents.property(
                                    jsonProperty.name,
                                    jsonProperty.value,
                                    !!signature ? signature : null
                                );
                                playerHeadContents.profileProperty(property);
                            }
                        }
                    }
                    break;
                case "hat":
                    if (playerHeadContents === null) playerHeadContents = ObjectContents.playerHead();
                    playerHeadContents.hat(!!get(qual));
                    break;
                case "color":
                    const jsonColor = getString(qual);
                    let color: TextColor | null = TextColor.fromHexString(jsonColor);
                    if (color === null) {
                        const token = jsonColor.toLowerCase();
                        if (token in NamedTextColor.NAMES) {
                            color = NamedTextColor.NAMES[token];
                        } else {
                            throw new Error(`Unable to parse color: ${jsonColor}`);
                        }
                    }
                    style.color(color);
                    break;
                case "font":
                    style.font(getString(qual));
                    break;
                case "bold":
                case "italic":
                case "underlined":
                case "strikethrough":
                case "obfuscated":
                    const value = !!get(qual);
                    style.decoration(qual, TextDecoration.State.fromBoolean(value));
                    break;
                case "shadow_color":
                    const sc = get(qual);
                    if (typeof sc === "number") {
                        style.color(ShadowColor.shadowColor(sc));
                    } else if (Array.isArray(sc)) {
                        const dv = new DataView(new ArrayBuffer(4));
                        for (let i = 0; i < 4; i++) {
                            dv.setUint8(i, 255 * Number(sc[i]));
                        }
                        style.color(ShadowColor.shadowColor(dv.getUint32(0, false)));
                    }
                    break;
                case "insertion":
                    style.insertion(getString(qual));
                    break;
                case "click_event":
                    const e1 = get(qual);
                    if (e1) style.clickEvent(this.deserializeClickEvent(e1));
                    break;
                case "hover_event":
                    const e2 = get(qual);
                    if (e2) style.hoverEvent(this.deserializeHoverEvent(e2));
                    break;
                case "object":
                case "type":
                case "source":
                    // ignored
                    break;
                default:
                    assertNever(qual);
            }
        }

        let ret: Component;
        if (text !== null) {
            ret = Component.text(text);
        } else if (translate !== null) {
            if (translateWith !== null) {
                ret = Component.translatable(translate, translateFallback, translateWith);
            } else {
                ret = Component.translatable(translate, translateFallback);
            }
        } else if (scoreName !== null && scoreObjective !== null) {
            ret = Component.score(scoreName, scoreObjective);
        } else if (selector !== null) {
            ret = Component.selector(selector, separator);
        } else if (keybind !== null) {
            ret = Component.keybind(keybind);
        } else if (nbt !== null) {
            if (nbtBlock !== null) {
                ret = Component.blockNBT(nbt, nbtInterpret, separator, nbtBlock)
            } else if (nbtEntity !== null) {
                ret = Component.entityNBT(nbt, nbtEntity)
                    .interpret(nbtInterpret)
                    .separator(separator);
            } else if (nbtStorage !== null) {
                ret = Component.storageNBT(nbt, nbtStorage)
                    .interpret(nbtInterpret)
                    .separator(separator);
            } else {
                throw new Error(`Missing block, entity or storage tag in NBT component`);
            }
        } else if (sprite !== null) {
            ret = Component.object(ObjectContents.sprite(
                atlas !== null ? atlas : SpriteObjectContents.DEFAULT_ATLAS,
                sprite
            ));
        } else if (playerHeadContents !== null && playerHeadContentsHasProfile) {
            ret = Component.object(playerHeadContents.build());
        } else {
            throw new Error(`Unable to deserialize object`);
        }

        ret = ret.style(style.build());
        if (extra !== null) ret = ret.append(...extra);

        return ret;
    }

    // Deserialization

    private deserializeList(jsonComponents: JsonComponent[]): Component[] {
        const components: Component[] = new Array(jsonComponents.length);
        for (let i = 0; i < jsonComponents.length; i++) components[i] = this.deserialize(jsonComponents[i]);
        return components;
    }

    private deserializeClickEvent(event: JsonClickEvent): ClickEvent<any> {
        const { action } = event;
        switch (action) {
            case "open_url": return ClickEvent.openUrl(event.url);
            case "open_file": return ClickEvent.openFile(event.path);
            case "run_command": return ClickEvent.runCommand(event.command);
            case "suggest_command": return ClickEvent.suggestCommand(event.command);
            case "change_page": return ClickEvent.changePage(event.page);
            case "copy_to_clipboard": return ClickEvent.copyToClipboard(event.value);
            case "show_dialog":
                // TODO
                throw new Error(`show_dialog click event is currently unsupported`);
            case "custom":
                return ClickEvent.custom(event.id, `${event.payload}`);
            default:
                assertNever(action);
        }
    }

    private deserializeHoverEvent(event: JsonHoverEvent): HoverEvent<any> {
        const { action } = event;
        switch (action) {
            case "show_text":
                return HoverEvent.showText(this.deserialize(event.value));
            case "show_entity":
                const { id, uuid, name } = event;
                return HoverEvent.showEntity(
                    id,
                    Array.isArray(uuid) ? UUID.fromArray(uuid).toString() : `${uuid}`,
                    !!name ? this.deserialize(name) : null
                );
            case "show_item":
                return HoverEvent.showItem(event.id, event.count || 0);
            default:
                assertNever(action);
        }
    }

    // Serialization

    private serializeText(component: TextComponent): JsonTextComponent {
        const content = component.content();
        if (component.children().length === 0 && component.style().isEmpty()) return content;
        return {
            ...this.serializeBase(component),
            text: content
        };
    }

    private serializeTranslatable(component: TranslatableComponent): JsonTranslatableComponent {
        const key = component.key();
        const ret: JsonTranslatableComponent = {
            ...this.serializeBase(component),
            translate: key
        };

        const fallback = component.fallback();
        if (fallback) ret.fallback = fallback;

        const args = component.arguments();
        if (args && args.length !== 0) {
            const jsonArgs: JsonComponent[] = new Array(args.length);
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (typeof arg === "object") {
                    jsonArgs[i] = this.serialize(arg);
                } else {
                    jsonArgs[i] = `${arg}`;
                }
            }
            ret.with = jsonArgs;
        }

        return ret;
    }

    private serializeScore(component: ScoreComponent): JsonScoreboardComponent {
        const name = component.name();
        const objective = component.objective();
        return {
            ...this.serializeBase(component),
            score: {name, objective}
        };
    }

    private serializeSelector(component: SelectorComponent): JsonSelectorComponent {
        const pattern = component.pattern();
        const ret: JsonSelectorComponent = {
            ...this.serializeBase(component),
            selector: pattern
        };

        const separator = component.separator();
        if (separator) ret.separator = this.serialize(separator);

        return ret;
    }

    private serializeKeybind(component: KeybindComponent): JsonKeybindComponent {
        const keybind = component.keybind();
        return {
            ...this.serializeBase(component),
            keybind
        };
    }

    private serializeStorageNbt(component: StorageNBTComponent): JsonStorageNBTComponent {
        const nbt = component.nbtPath();
        const interpret = component.interpret();
        const storage = component.storage().asString();
        const ret: JsonStorageNBTComponent = {
            ...this.serializeBase(component),
            nbt,
            interpret,
            storage
        };

        const separator = component.separator();
        if (separator) ret.separator = this.serialize(separator);

        return ret;
    }

    private serializeEntityNbt(component: EntityNBTComponent): JsonEntityNBTComponent {
        const nbt = component.nbtPath();
        const interpret = component.interpret();
        const entity = component.selector();
        const ret: JsonEntityNBTComponent = {
            ...this.serializeBase(component),
            nbt,
            interpret,
            entity
        };

        const separator = component.separator();
        if (separator) ret.separator = this.serialize(separator);

        return ret;
    }

    private serializeBlockNbt(component: BlockNBTComponent): JsonBlockNBTComponent {
        const nbt = component.nbtPath();
        const interpret = component.interpret();
        const block = component.pos();
        const ret: JsonBlockNBTComponent = {
            ...this.serializeBase(component),
            nbt,
            interpret,
            block: block.asString()
        };

        const separator = component.separator();
        if (separator) ret.separator = this.serialize(separator);

        return ret;
    }

    private serializeObject(component: ObjectComponent): JsonPlayerObjectComponent | JsonAtlasObjectComponent {
        const contents = component.contents();
        const { type } = contents;

        if (type === "sprite") {
            const sprite = contents.sprite();
            const ret: JsonAtlasObjectComponent = {
                ...this.serializeBase(component),
                sprite: sprite.asString()
            };

            const atlas = contents.atlas();
            if (!Key.equals(atlas, SpriteObjectContents.DEFAULT_ATLAS)) ret.atlas = atlas.asString();

            return ret;
        } else if (type === "playerHead") {
            const hat = contents.hat();
            const playerName = contents.name();
            const playerId = contents.id();
            const properties = contents.profileProperties();
            const texture = contents.texture();

            let profile: JsonPlayerProfile | string;
            if (playerName !== null && playerId === null && properties.length === 0 && texture === null) {
                profile = playerName;
            } else {
                profile = {};
                if (playerName !== null) profile.name = playerName;
                if (playerId !== null) profile.id = UUID.fromString(playerId).toArray();
                if (texture !== null) profile.texture = texture.asString();
                if (properties.length !== 0) {
                    const jsonProperties: JsonPlayerProfileProperty[] = new Array(properties.length);
                    for (let i = 0; i < properties.length; i++) {
                        const property = properties[i];
                        const jsonProperty: JsonPlayerProfileProperty = {
                            name: property.name(),
                            value: property.value()
                        };

                        const signature = property.signature();
                        if (signature) jsonProperty.signature = signature;

                        jsonProperties[i] = jsonProperty;
                    }
                    profile.properties = jsonProperties;
                }
            }

            return {
                ...this.serializeBase(component),
                player: profile,
                hat
            };
        } else {
            throw new Error(`No rule to serialize contents of type \"${type}\"`);
        }
    }

    private serializeBase(component: Component): JsonBaseComponent {
        const ret: JsonBaseComponent = { };

        const children = component.children();
        if (children.length !== 0) {
            const extra: JsonComponent[] = new Array(children.length);
            for (let i = 0; i < children.length; i++) {
                extra[i] = this.serialize(children[i]);
            }
            ret.extra = extra;
        }

        // START Styles

        const color = component.color();
        if (color) {
            if ("name" in color) {
                const namedColor = color as NamedTextColor;
                ret.color = namedColor.name();
            } else {
                ret.color = color.asHexString();
            }
        }

        const font = component.font();
        if (font) ret.font = font.asString();

        const useDecoration = ((decoration: TextDecoration, consumer: (value: boolean) => void): void => {
            const state = component.decoration(decoration);
            if (state === TextDecoration.State.NOT_SET) return;
            consumer(state === TextDecoration.State.TRUE);
        });

        useDecoration(TextDecoration.BOLD, (v) => ret.bold = v);
        useDecoration(TextDecoration.ITALIC, (v) => ret.italic = v);
        useDecoration(TextDecoration.UNDERLINED, (v) => ret.underlined = v);
        useDecoration(TextDecoration.STRIKETHROUGH, (v) => ret.strikethrough = v);
        useDecoration(TextDecoration.OBFUSCATED, (v) => ret.obfuscated = v);

        const shadowColor = component.shadowColor();
        if (shadowColor) ret.shadow_color = shadowColor.value();

        const insertion = component.insertion();
        if (insertion) ret.insertion = insertion;

        const clickEvent = component.clickEvent();
        if (clickEvent) ret.click_event = this.serializeClickEvent(clickEvent);

        const hoverEvent = component.hoverEvent();
        if (hoverEvent) ret.hover_event = this.serializeHoverEvent(hoverEvent);

        // END Styles

        return ret;
    }

    private serializeClickEvent<P extends ClickEvent.Payload>(clickEvent: ClickEvent<P>): JsonClickEvent {
        return JsonComponentSerializerImpl.CLICK_EVENT_SERIALIZER
            .invoke(clickEvent, this);
    }

    private serializeHoverEvent(hoverEvent: HoverEvent<any>): JsonHoverEvent {
        return JsonComponentSerializerImpl.HOVER_EVENT_SERIALIZER
            .invoke(hoverEvent, this);
    }

}

export namespace JsonComponentSerializer {

    const INSTANCE = new JsonComponentSerializerImpl();

    export function json(): JsonComponentSerializer {
        return INSTANCE;
    }

}
