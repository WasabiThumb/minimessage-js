/*
   Copyright 2024 Wasabi Codes

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */

import {MiniMessage, MiniMessageBuilder, MiniMessageInstance, CreateElementFn} from "./spec";
import {StandardTags} from "./tag/standard";
import {Component} from "./component/spec";
import {ModifyTag, TagDirective, TagResolver, TagType} from "./tag/spec";
import {MarkupParser, MarkupStack} from "./markup/parser";
import {componentToHTML} from "./component/html";


class MiniMessageInstanceImpl implements MiniMessageInstance {

    private readonly debugCallback: MiniMessage.DebugCallback;
    private readonly postProcessor: MiniMessage.PostProcessor;
    private readonly preProcessor: MiniMessage.PreProcessor;
    private readonly strict: boolean;
    private readonly tags: TagResolver;
    readonly translations: MiniMessage.Translations;
    constructor(
        debugCallback: MiniMessage.DebugCallback,
        postProcessor: MiniMessage.PostProcessor,
        preProcessor: MiniMessage.PreProcessor,
        strict: boolean,
        tags: TagResolver,
        translations: MiniMessage.Translations
    ) {
        this.debugCallback = debugCallback;
        this.postProcessor = postProcessor;
        this.preProcessor = preProcessor;
        this.strict = strict;
        this.tags = tags;
        this.translations = translations;
    }

    serialize(component: Component): string {
        // TODO
        throw new Error("Not implemented");
    }

    deserialize(miniMessage: string): Component {
        miniMessage = this.preProcessor(miniMessage);

        const root = Component.empty();
        const parser = new MarkupParser();
        const stack = new MarkupStack<[ModifyTag, (Component | string)[]]>();
        const { strict, tags } = this;

        function appendChildToHighest(child: Component | string): void {
            let entry = stack.peek();
            if (entry !== null) {
                entry[1].push(child);
            } else {
                root.appendChild(child);
            }
        }

        function popModification(key: string, position?: number): void {
            const entry = stack.pop(key, strict, position);
            if (entry === null) return;
            const [ tag, children ] = entry;

            let textContent: string | null = null;
            if (children.length > 0) {
                let first = children[0];
                if (typeof first === "object" && first.isOnlyText()) first = (first.getProperty("text") || "");
                if (typeof first === "string") {
                    textContent = first;
                    children.splice(0, 1);
                }
            }

            const component: Component = (!!textContent) ? Component.text(textContent) : Component.empty();
            for (let child of children) component.appendChild(child);
            tag.apply(component, 0);
            appendChildToHighest(component);
        }

        parser.on("start_tag", (e) => {
            const { name, args } = e;
            this.debug(`Parsing tag <${name}> @ ${e.location}`);

            let tag = tags.resolve(name, args, this);
            if (tag === null) {
                if (strict) throw new Error(`No resolver for <${name}> tag @ ${e.location}`);
                this.debug(`- No resolver for <${name}>`);
                const emptyTag: ModifyTag = {
                    type: TagType.MODIFY,
                    apply(component: Component): Component {
                        return component;
                    }
                };
                stack.push(name, [emptyTag, []]);
                return;
            } else {
                this.debug(`- Resolved: ${TagType[tag.type]}`);
            }

            switch (tag.type) {
                case TagType.INSERT:
                    appendChildToHighest(tag.value);
                    break;
                case TagType.MODIFY:
                    stack.push(name, [tag, []]);
                    break;
                case TagType.DIRECTIVE:
                    if (strict) throw new Error(`Strict mode does not allow directives (` + TagDirective[tag.directive] + `)`);
                    if (tag.directive !== TagDirective.RESET) throw new Error(`Unknown directive ID ` + tag.directive);
                    let peek: string | null;
                    while ((peek = stack.peekTag()) !== null) popModification(peek);
                    break;
            }
        });
        parser.on("end_tag", (e) => {
            this.debug(`Parsing tag </${e.name}> @ ${e.location}`);
            popModification(e.name, e.location);
        });
        parser.on("text", (e) => {
            this.debug(`Parsing text ${e.content} @ ${e.location}`);
            appendChildToHighest(e.content);
        });

        parser.parse(miniMessage);
        parser.flush();

        let peek: string | null;
        while ((peek = stack.peekTag()) !== null) {
            if (strict) throw new Error(`Tag <${peek}> was never closed`);
            popModification(peek);
        }

        root.collapseUnnecessaryEnclosures();
        root.setContext(this);

        return this.postProcessor(root);
    }

    toHTML(component: Component, output?: HTMLElement, createElementFn?: CreateElementFn): string {
        return componentToHTML(this, component, output, createElementFn);
    }

    private debug(message: string): void {
        if (this.debugCallback !== null) {
            try {
                this.debugCallback(message);
            } catch (e) {
                console.error("Error in debug callback", e);
            }
        }
    }

}


class MiniMessageBuilderImpl implements MiniMessageBuilder {

    private _debugCallback: MiniMessage.DebugCallback = null;
    private _postProcessor: MiniMessage.PostProcessor = (a) => a;
    private _preProcessor: MiniMessage.PreProcessor = (b) => b;
    private _strict: boolean = false;
    private _tags: TagResolver = StandardTags.defaults();
    private _translations: MiniMessage.Translations = {};

    build(): MiniMessageInstance {
        return new MiniMessageInstanceImpl(
            this._debugCallback,
            this._postProcessor,
            this._preProcessor,
            this._strict,
            this._tags,
            this._translations
        );
    }

    debug(debugOutput: MiniMessage.DebugCallback): this {
        this._debugCallback = debugOutput;
        return this;
    }

    postProcessor(postProcessor: MiniMessage.PostProcessor): this {
        this._postProcessor = postProcessor;
        return this;
    }

    preProcessor(preProcessor: MiniMessage.PreProcessor): this {
        this._preProcessor = preProcessor;
        return this;
    }

    strict(strict: boolean): this {
        this._strict = strict;
        return this;
    }

    tags(resolver: TagResolver): this {
        this._tags = resolver;
        return this;
    }

    translations(translations: MiniMessage.Translations): this {
        Object.assign(this._translations, translations);
        return this;
    }

}


const DEFAULT_INSTANCE: MiniMessageInstance = (new MiniMessageBuilderImpl()).build();

/**
 * minimessage-js main object
 * @see miniMessage
 * @see builder
 * @see toHTML
 */
const MiniMessage: MiniMessage = {
    tags: StandardTags,
    miniMessage(): MiniMessageInstance {
        return DEFAULT_INSTANCE;
    },
    builder(): MiniMessageBuilder {
        return new MiniMessageBuilderImpl();
    },
    toHTML(component: Component, output?: HTMLElement, createElementFn?: CreateElementFn): string {
        return componentToHTML(
            // this bullshit is why the method is deprecated LOL
            component.getContext()! as unknown as MiniMessageInstance,
            component,
            output,
            createElementFn
        );
    }
};

export = MiniMessage;
