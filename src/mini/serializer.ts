
// TODO: This isn't ideal. For full parity with Adventure
// we would need to figure out how to carry over serializable
// resolvers & style claims. This is tricky in TS and not
// super important for the general use cases of this library.

import {TextComponent} from "../text/component/text";
import {AbstractComponentRenderer} from "../text/renderer";
import {MiniMessage} from "../mini";
import {StringBuilder} from "../util/string";
import {BlockNBTComponent} from "../text/component/nbt/block";
import {Component} from "../text/component";
import {EntityNBTComponent} from "../text/component/nbt/entity";
import {KeybindComponent} from "../text/component/keybind";
import {ObjectComponent} from "../text/component/object";
import {ScoreComponent} from "../text/component/score";
import {SelectorComponent} from "../text/component/selector";
import {StorageNBTComponent} from "../text/component/nbt/storage";
import {TranslatableComponent} from "../text/component/translatable";
import {Stack} from "../util/stack";
import {TextDecoration} from "../text/style/decoration";
import {Character} from "../util/char";
import {ClickEvent, HoverEvent} from "../text/style";
import {assertNever} from "../util/assertions";
import {ClickTag} from "./tag/standard/click";
import {InsertionTag} from "./tag/standard/insertion";
import {FontTag} from "./tag/standard/font";
import {ShadowColorTag} from "./tag/standard/shadowColor";
import {HoverTag} from "./tag/standard/hover";
import {TranslatableTag} from "./tag/standard/translatable";
import {NbtTag} from "./tag/standard/nbt";
import {NBTComponent} from "../text/component/nbt";
import {SelectorTag} from "./tag/standard/selector";
import {ScoreTag} from "./tag/standard/score";
import {KeybindTag} from "./tag/standard/keybind";
import {SpriteTag} from "./tag/standard/sprite";
import {SequentialHeadTag} from "./tag/standard/sequentialHead";
import {TokenParser} from "./token/parser";
import {SpriteObjectContents} from "../text/object/sprite";
import {Key} from "../key";

//

/** @internal */
export namespace MiniMessageSerializer {

    const MAX_DEPTH = 64;

    type Context = {
        miniMessage: MiniMessage,
        out: StringBuilder,
        styleTags: Stack<Stack<string>>,
        depth: number
    };

    const RENDERER = new class extends AbstractComponentRenderer<Context> {

        constructor() {
            super();
        }

        //

        protected preRender(component: Component, context: Context) {
            // Check depth
            if (context.depth > MAX_DEPTH) {
                throw new Error(`Maximum recursion depth reached (${MAX_DEPTH})`);
            }

            // Open style tags
            const style = component.style();
            const styleTags = new Stack<string>();
            const { out } = context;

            const emit = ((tag: string, ...args: string[]) => {
                styleTags.push(tag);
                this._openTag(out, tag, ...args);
            });

            const emitDecoration = ((tag: string, state: TextDecoration.State) => {
                if (state === TextDecoration.State.NOT_SET) return;
                emit(state === TextDecoration.State.TRUE ? tag : `!${tag}`);
            });

            emitDecoration("b", style.decoration(TextDecoration.BOLD));
            emitDecoration("i", style.decoration(TextDecoration.ITALIC));
            emitDecoration("st", style.decoration(TextDecoration.STRIKETHROUGH));
            emitDecoration("u", style.decoration(TextDecoration.UNDERLINED));
            emitDecoration("obf", style.decoration(TextDecoration.OBFUSCATED));

            // Color
            const color = style.color();
            if (color !== null) emit(color.toString());

            // Shadow Color
            const shadowColor = style.shadowColor();
            if (shadowColor !== null) emit(ShadowColorTag.SHADOW_COLOR, shadowColor.asHexString());

            // Font
            const font = style.font();
            if (font !== null) emit(FontTag.FONT, font.asString());

            // Insertion
            const insertion = style.insertion();
            if (insertion !== null) emit(InsertionTag.INSERTION, insertion);

            // Click Event
            const clickEvent = style.clickEvent();
            if (clickEvent !== null) {
                const actionName = clickEvent.action().toString();
                const payload = clickEvent.payload() as ClickEvent.Payload;
                const payloadType = payload.type;
                switch (payloadType) {
                    case "text":
                        emit(ClickTag.CLICK, actionName, payload.value());
                        break;
                    case "int":
                        emit(ClickTag.CLICK, actionName, `${payload.integer()}`);
                        break;
                    case "custom":
                        const key = payload.key();
                        const nbt = payload.nbt();
                        if (nbt) {
                            emit(ClickTag.CLICK, actionName, key.asMinimalString(), nbt);
                        } else {
                            emit(ClickTag.CLICK, actionName, key.asMinimalString());
                        }
                        break;
                    default:
                        assertNever(payloadType);
                }
            }

            // Hover Event
            const hoverEvent = style.hoverEvent();
            if (hoverEvent !== null) {
                const handlers = new HoverEvent.Handlers<null, void>();
                handlers.register(HoverEvent.Action.SHOW_TEXT, (e) => {
                    const value = this._serializeRichArgument(context, e.value());
                    emit(HoverTag.HOVER, `show_text`, value);
                });
                handlers.register(HoverEvent.Action.SHOW_ENTITY, (e) => {
                    const showEntity = e.value();
                    const type = showEntity.type();
                    const id = showEntity.id();
                    const name = showEntity.name();
                    if (name) {
                        emit(HoverTag.HOVER, `show_entity`, type, id, this._serializeRichArgument(context, name));
                    } else {
                        emit(HoverTag.HOVER, `show_entity`, type, id);
                    }
                });
                handlers.register(HoverEvent.Action.SHOW_ITEM, (e) => {
                    const showItem = e.value();
                    const item = showItem.item();
                    const count = showItem.count();
                    if (count !== 1) {
                        emit(HoverTag.HOVER, `show_item`, item.asMinimalString(), `${count}`);
                    } else {
                        emit(HoverTag.HOVER, `show_item`, item.asMinimalString());
                    }
                });
                handlers.invoke(hoverEvent, null);
            }

            context.styleTags.push(styleTags);
            return component;
        }

        protected postRender(component: Component, context: Context) {
            // Recurse children
            context.depth++;
            for (const child of component.children()) {
                this.render(child, context);
            }
            context.depth--;

            // Close style tags
            const { styleTags, out } = context;
            const tags = styleTags.pop();
            if (tags) {
                let tag: string | null;
                while ((tag = tags.pop()) !== null)
                    this._closeTag(out, tag);
            }

            return component;
        }

        protected renderText(component: TextComponent, context: Context): Component {
            const { out, miniMessage } = context;
            out.appendString(miniMessage.escapeTags(component.content()));
            return component;
        }

        protected renderTranslatable(component: TranslatableComponent, context: Context): Component {
            const { out } = context;
            const key = component.key();
            const args = component.arguments();

            if (args.length === 0) {
                this._openCloseTag(out, TranslatableTag.LANG, key);
            } else {
                const stringArgs: string[] = new Array(args.length + 1);
                stringArgs[0] = key;

                for (let i = 0; i < args.length; i++) {
                    const arg = args[i];
                    let value: string;
                    if (Component.isComponent(arg)) {
                        value = this._serializeRichArgument(context, arg as Component);
                    } else {
                        value = `${arg}`;
                    }
                    stringArgs[i + 1] = value;
                }

                this._openCloseTag(out, TranslatableTag.LANG, ...stringArgs);
            }

            return component;
        }

        protected renderBlock(component: BlockNBTComponent, context: Context): Component {
            const { out } = context;
            this._openCloseTag(
                out,
                NbtTag.NBT,
                "block",
                component.pos().asString(),
                ...this._nbtFooter(context, component)
            );
            return component;
        }

        protected renderEntity(component: EntityNBTComponent, context: Context): Component {
            const { out } = context;
            this._openCloseTag(
                out,
                NbtTag.NBT,
                "entity",
                component.selector(),
                ...this._nbtFooter(context, component)
            );
            return component;
        }

        protected renderStorage(component: StorageNBTComponent, context: Context): Component {
            const { out } = context;
            this._openCloseTag(
                out,
                NbtTag.NBT,
                "storage",
                component.storage().asMinimalString(),
                ...this._nbtFooter(context, component)
            );
            return component;
        }

        protected renderSelector(component: SelectorComponent, context: Context): Component {
            const { out } = context;
            const separator = component.separator();
            if (separator) {
                this._openCloseTag(
                    out,
                    SelectorTag.SELECTOR,
                    component.pattern(),
                    this._serializeRichArgument(context, separator)
                );
            } else {
                this._openCloseTag(
                    out,
                    SelectorTag.SELECTOR,
                    component.pattern()
                );
            }
            return component;
        }

        protected renderScore(component: ScoreComponent, context: Context): Component {
            const { out } = context;
            this._openCloseTag(
                out,
                ScoreTag.SCORE,
                component.name(),
                component.objective()
            );
            return component;
        }

        protected renderKeybind(component: KeybindComponent, context: Context): Component {
            const { out } = context;
            this._openCloseTag(
                out,
                KeybindTag.KEYBIND,
                component.keybind()
            );
            return component;
        }

        protected renderObject(component: ObjectComponent, context: Context): Component {
            const { out } = context;
            const contents = component.contents();
            const contentsType = contents.type;
            switch (contentsType) {
                case "playerHead":
                    const hat = contents.hat();
                    const name = contents.name();
                    const id = contents.id();
                    const texture = contents.texture();
                    const put = ((value: string) => {
                        if (hat) {
                            this._openCloseTag(out, SequentialHeadTag.HEAD, value);
                        } else {
                            this._openCloseTag(out, SequentialHeadTag.HEAD, value, "false");
                        }
                    });

                    let flag: number = 0;
                    if (name !== null) flag |= 1;
                    if (id !== null) flag |= 2;
                    if (texture !== null) flag |= 4;

                    switch (flag) {
                        case 1: put(name!); break;
                        case 2: put(id!); break;
                        case 4: put(texture!.asMinimalString()); break;
                        default:
                            throw new Error(`Unable to serialize ambiguous player head tag with name '${name}', id '${id}' and texture '${texture}'`);
                    }
                    break;
                case "sprite":
                    const atlas = contents.atlas();
                    const sprite = contents.sprite();
                    if (!Key.equals(atlas, SpriteObjectContents.DEFAULT_ATLAS)) {
                        this._openCloseTag(out, SpriteTag.SPRITE, atlas.asMinimalString(), sprite.asMinimalString());
                    } else {
                        this._openCloseTag(out, SpriteTag.SPRITE, sprite.asMinimalString());
                    }
                    break;
                default:
                    assertNever(contentsType);
            }
            return component;
        }

        //

        private _openTag(out: StringBuilder, tag: string, ...args: string[]) {
            out.appendChar(Character.LESS_THAN).append(tag);
            this._writeTagArgs(out, args);
            out.appendChar(Character.GREATER_THAN);
        }

        private _openCloseTag(out: StringBuilder, tag: string, ...args: string[]) {
            out.appendChar(Character.LESS_THAN).append(tag);
            this._writeTagArgs(out, args);
            out.appendChar(Character.SLASH).appendChar(Character.GREATER_THAN);
        }

        private _closeTag(out: StringBuilder, tag: string) {
            out.appendChar(Character.LESS_THAN)
                .appendChar(Character.SLASH)
                .append(tag)
                .appendChar(Character.GREATER_THAN);
        }

        private _writeTagArgs(out: StringBuilder, args: string[]) {
            for (const arg of args) {
                out.appendChar(Character.COLON);
                this._escapeTagContent(out, arg);
            }
        }

        private _serializeRichArgument(context: Context, argument: Component): string {
            const childContext: Context = {
                miniMessage: context.miniMessage,
                out: new StringBuilder(),
                styleTags: new Stack(),
                depth: context.depth + 1
            };
            this.render(argument, childContext);
            return childContext.out.toString();
        }

        private _nbtFooter(context: Context, component: NBTComponent<any>): string[] {
            const ret: string[] = new Array(3);
            let head: number = 0;

            ret[head++] = component.nbtPath();

            const separator = component.separator();
            if (separator) ret[head++] = this._serializeRichArgument(context, separator);

            const interpret = component.interpret();
            if (interpret) ret[head++] = "interpret";

            ret.length = head;
            return ret;
        }

        private _escapeTagContent(out: StringBuilder, content: string): void {
            let mustBeQuoted: boolean = false;
            let hasSingleQuote: boolean = false;
            let hasDoubleQuote: boolean = false;
            let active: number;

            for (let i = 0; i < content.length; i++) {
                active = content.charCodeAt(i);
                if (TokenParser.TAG_END.is(active) || TokenParser.SEPARATOR.is(active) || Character.SPACE.is(active)) {
                    mustBeQuoted = true;
                    if (hasSingleQuote && hasDoubleQuote) break;
                } else if (Character.APOSTROPHE.is(active)) {
                    hasSingleQuote = true;
                    break;
                } else if (Character.QUOTATION.is(active)) {
                    hasDoubleQuote = true;
                    break;
                }
            }

            if (hasSingleQuote) {
                out.appendChar(Character.QUOTATION);
                this._appendEscaping(
                    out,
                    content,
                    [TokenParser.ESCAPE, Character.QUOTATION],
                    true
                );
                out.appendChar(Character.QUOTATION);
            } else if (hasDoubleQuote || mustBeQuoted) {
                out.appendChar(Character.APOSTROPHE);
                this._appendEscaping(
                    out,
                    content,
                    [TokenParser.ESCAPE, Character.APOSTROPHE],
                    true
                );
                out.appendChar(Character.APOSTROPHE);
            } else {
                this._appendEscaping(
                    out,
                    content,
                    [TokenParser.TAG_END, TokenParser.SEPARATOR],
                    false
                );
            }
        }

        private _appendEscaping(out: StringBuilder, text: string, escapeChars: Character[], allowEscapes: boolean) {
            let startIdx: number = 0;
            let unescapedFound: boolean = false;

            for (let i = 0; i < text.length; i++) {
                const test = text.charCodeAt(i);
                let escaped: boolean = false;

                for (const c of escapeChars) {
                    if (c.is(test)) {
                        if (!allowEscapes) throw new Error(); // Shouldn't happen
                        escaped = true;
                        break;
                    }
                }

                if (escaped) {
                    if (unescapedFound) out.appendString(text, startIdx, i);
                    startIdx = i + 1;
                    out.appendChar(TokenParser.ESCAPE)
                        .appendChar(test);
                } else {
                    unescapedFound = true;
                }
            }

            if (startIdx < text.length && unescapedFound) {
                out.appendString(text, startIdx, text.length);
            }
        }

    }

    //

    export function serialize(miniMessage: MiniMessage, component: Component): string {
        const context: Context = {
            miniMessage,
            out: new StringBuilder(),
            styleTags: new Stack(),
            depth: 0
        };
        RENDERER.render(component, context);
        return context.out.toString();
    }

}
