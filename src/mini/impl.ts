import type {MiniMessage} from "../mini";
import {MiniMessageParser} from "./parser";
import {Component} from "../text/component";
import {TagResolver} from "./tag/resolver";
import {TranslationData, Translations} from "../i18n";
import {StandardTags} from "./tag/standard";
import {assertReal} from "../util/assertions";
import {ContextImpl} from "./context";
import {DomHTMLWriter} from "../html/writer/dom";
import {Node} from "./tree";
import {HtmlComponentRenderer} from "../html/renderer";
import {HtmlWriter} from "../html/writer";
import {MiniMessageSerializer} from "./serializer";

//

/** @internal */
export class MiniMessageImpl implements MiniMessage {

    readonly _parser: MiniMessageParser;

    constructor(
        tagResolver: TagResolver,
        readonly _strict: boolean,
        readonly _debugOutput: ((x: string) => void) | null,
        readonly _preProcessor: ((x: string) => string),
        readonly _postProcessor: ((x: Component) => Component),
        readonly _translations: Translations
    ) {
        this._parser = new MiniMessageParser(tagResolver);
    }

    //

    tags(): TagResolver {
        return this._parser.tagResolver;
    }

    strict(): boolean {
        return this._strict;
    }

    translations(): Translations {
        return this._translations;
    }

    deserialize(input: string, ...resolvers: TagResolver[]): Component {
        return this._parser.parseFormat(this._newContext(input, resolvers));
    }

    deserializeToTree(input: string, ...resolvers: TagResolver[]): Node.Root {
        return this._parser.parseToTree(this._newContext(input, resolvers));
    }

    escapeTags(input: string, ...resolvers: TagResolver[]): string {
        return this._parser.escapeTokens(this._newContext(input, resolvers));
    }

    stripTags(input: string, ...resolvers: TagResolver[]): string {
        return this._parser.stripTokens(this._newContext(input, resolvers));
    }

    serialize(component: Component): string {
        return MiniMessageSerializer.serialize(this, component);
    }

    toHTML(component: Component, target?: ParentNode, elementFactory?: DomHTMLWriter.ElementFactory): string {
        const renderer = HtmlComponentRenderer.renderer(this._translations);

        if (target) {
            const writer = HtmlWriter.dom(target, elementFactory);
            renderer.render(component, writer);
        }

        const writer = HtmlWriter.string();
        renderer.render(component, writer);
        return writer.toString();
    }

    private _newContext(input: string, resolvers: TagResolver[]): ContextImpl {
        assertReal(input, "input");

        let extraTags: TagResolver | null;
        if (resolvers.length === 0) {
            extraTags = null;
        } else {
            extraTags = TagResolver.builder()
                .resolvers(...resolvers)
                .build();
        }

        return new ContextImpl(
            this._strict,
            this._debugOutput,
            input,
            this,
            extraTags,
            this._preProcessor,
            this._postProcessor
        );
    }

}

/** @internal */
export class MiniMessageBuilderImpl implements MiniMessage.Builder {

    private _tagResolver: TagResolver = StandardTags.defaults();
    private _strict: boolean = false;
    private _debug: ((x: string) => void) | null = null;
    private _preProcessor: ((x: string) => string) = ((x) => x);
    private _postProcessor: ((x: Component) => Component) = ((x) => x.compact());
    private _translations: Translations = Translations.empty();

    constructor(serializer?: MiniMessageImpl) {
        if (serializer) {
            this._tagResolver = serializer._parser.tagResolver;
            this._strict = serializer._strict;
            this._debug = serializer._debugOutput;
            this._preProcessor = serializer._preProcessor;
            this._postProcessor = serializer._postProcessor;
            this._translations = serializer._translations;
        }
    }

    //

    tags(tags: TagResolver): this {
        this._tagResolver = assertReal(tags, "tags");
        return this;
    }

    editTags(adder: (builder: TagResolver.Builder) => void): this {
        assertReal(adder, "adder");
        const builder = TagResolver.builder().resolver(this._tagResolver);
        adder(builder);
        this._tagResolver = builder.build();
        return this;
    }

    strict(strict: boolean): this {
        // noinspection PointlessBooleanExpressionJS
        this._strict = !!strict;
        return this;
    }

    debug(debugOutput: (message: string) => (void | null)): this {
        if (null !== debugOutput && typeof debugOutput !== "function")
            throw new TypeError(`'debugOutput' must be either null or a function (got ${debugOutput})`);

        this._debug = debugOutput;
        return this;
    }

    preProcessor(preProcessor: (message: string) => string): this {
        assertReal(preProcessor, "preProcessor");
        this._preProcessor = preProcessor;
        return this;
    }

    postProcessor(postProcessor: (component: Component) => Component): this {
        assertReal(postProcessor, "postProcessor");
        this._postProcessor = postProcessor;
        return this;
    }

    translations(translations: Translations | TranslationData): this {
        assertReal(translations, "translations");
        this._translations = Translations.of(translations);
        return this;
    }

    build(): MiniMessage {
        return new MiniMessageImpl(
            this._tagResolver,
            this._strict,
            this._debug,
            this._preProcessor,
            this._postProcessor,
            this._translations
        );
    }

}
