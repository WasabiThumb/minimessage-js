import {ComponentSerializer} from "./serializer/types";
import {Component} from "./text/component";
import {TagResolver} from "./mini/tag/resolver";
import {Node} from "./mini/tree";
import {DomHTMLWriter} from "./html/writer/dom";
import {TranslationData, Translations} from "./i18n";
import {MiniMessageBuilderImpl} from "./mini/impl";

//

export { Tag } from "./mini/tag";
export { TagResolver } from "./mini/tag/resolver";
export { StandardTags } from "./mini/tag/standard";

//

export interface MiniMessage extends ComponentSerializer<Component, Component, string> {

    escapeTags(input: string, ...resolvers: TagResolver[]): string;

    stripTags(input: string, ...resolvers: TagResolver[]): string;

    deserialize(input: string, ...resolvers: TagResolver[]): Component;

    deserializeToTree(input: string, ...resolvers: TagResolver[]): Node.Root;

    toHTML(component: Component): string;

    toHTML(component: Component, target: ParentNode, elementFactory?: DomHTMLWriter.ElementFactory): void;

    strict(): boolean;

    tags(): TagResolver;

    translations(): Translations;

}

export namespace MiniMessage {

    export interface Builder {

        tags(tags: TagResolver): this;

        editTags(adder: (builder: TagResolver.Builder) => void): this;

        strict(strict: boolean): this;

        debug(debugOutput: (message: string) => void | null): this;

        preProcessor(preProcessor: (message: string) => string): this;

        postProcessor(postProcessor: (component: Component) => Component): this;

        translations(translations: Translations | TranslationData): this;

        build(): MiniMessage;

    }

    //

    const INSTANCE = (new MiniMessageBuilderImpl())
        .build();

    export function miniMessage(): MiniMessage {
        return INSTANCE;
    }

    export function builder(): MiniMessage.Builder {
        return new MiniMessageBuilderImpl();
    }

}
