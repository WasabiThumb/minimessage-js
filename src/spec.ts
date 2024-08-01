import {TagResolver} from "./tag/spec";
import {Component} from "./component/spec";
import {StandardTags, StandardTagsT} from "./tag/standard";
import {TagResolverContext} from "./tag/context";
import {CreateElementFn} from "./component/html";

export namespace MiniMessage {

    export type DebugCallback = ((msg: string) => void) | null;

    export type PostProcessor = ((component: Component) => Component);

    export type PreProcessor = ((markup: string) => string);

}

/**
 * A MiniMessage de/serializer.
 * @see serialize
 * @see deserialize
 */
export interface MiniMessageInstance extends TagResolverContext {

    /**
     * Serializes a {@link Component}. At the moment there is no sane way for you to construct
     * one yourself, so this should be used mainly to normalize output from {@link deserialize}.
     * @param component {@link Component} containing styled content
     * @return A MiniMessage string
     */
    /* serialize(component: Component): string; */

    /**
     * Deserializes a string in MiniMessage format to a {@link Component}.
     * @param miniMessage
     */
    deserialize(miniMessage: string): Component;

    /**
     * Converts a parsed {@link Component} to HTML.
     * @param component The {@link Component} to convert.
     * @param output If set, the HTML will also be written to specified DOM element. This is mainly for use in browsers,
     * but passing an object from a polyfill library like jsdom would probably work too.
     * @param createElementFn When not in browser, and passing a DOM polyfill element to ``output``, use this argument
     * to pass a replacement for ``document.createElement``
     * @return The HTML code.
     */
    toHTML(component: Component, output?: HTMLElement, createElementFn?: CreateElementFn): string;

}

/**
 * A Builder that can be used to create a new MiniMessage instance
 * @see build
 */
export interface MiniMessageBuilder {

    /**
     * If non-null, debug information will be printed through this function.
     */
    debug(debugOutput: MiniMessage.DebugCallback): this;

    /**
     * Specify a function that takes the component at the end of the parser process.
     */
    postProcessor(postProcessor: MiniMessage.PostProcessor): this;

    /**
     * Specify a function that takes the string at the start of the parser process.
     */
    preProcessor(preProcessor: MiniMessage.PreProcessor): this;

    /**
     * Enables strict mode (disabled by default).
     */
    strict(strict: boolean): this;

    /**
     * Sets the tag resolver(s) to use.
     */
    tags(resolver: TagResolver): this;

    /**
     * Builds a MiniMessage instance using the state collected by the builder.
     */
    build(): MiniMessageInstance;

}

/**
 * Main class for minimessage-js
 * @see miniMessage
 * @see builder
 * @see toHTML
 */
export interface MiniMessage {

    /**
     * Tag parsers for use in {@link builder}.
     * @see StandardTags
     */
    tags: StandardTagsT;

    /**
     * Returns the default MiniMessage instance. This instance has all default tag resolvers.
     */
    miniMessage(): MiniMessageInstance;

    /**
     * Creates a new builder that can be used to create a custom MiniMessage instance.
     */
    builder(): MiniMessageBuilder;

    /**
     * @deprecated This method is being relocated to {@link MiniMessageInstance.toHTML}.
     *
     * Converts a parsed {@link Component} to HTML.
     * @param component The {@link Component} to convert.
     * @param output If set, the HTML will also be written to specified DOM element. This is mainly for use in browsers,
     * but passing an object from a polyfill library like jsdom would probably work too.
     * @param createElementFn When not in browser, and passing a DOM polyfill element to ``output``, use this argument
     * to pass a replacement for ``document.createElement``
     * @return The HTML code.
     */
    toHTML(component: Component, output?: HTMLElement, createElementFn?: CreateElementFn): string;

}
