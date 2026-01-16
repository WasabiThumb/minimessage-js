import {TagResolver} from "./tag/resolver";
import {Component} from "../text/component";
import {ArgumentQueue} from "./tag/resolver/argumentQueue";
import {MiniMessage} from "../mini";

//

export interface Context {

    deserialize(message: string, ...resolvers: TagResolver[]): Component;

    newException(message: string, tags?: ArgumentQueue): Error;

}

/** @internal */
export class ContextImpl implements Context {

    private readonly _strict: boolean;
    private readonly _debugOutput: ((x: string) => void) | null;
    private _message: string;
    private readonly _miniMessage: MiniMessage;
    private readonly _tagResolver: TagResolver;
    private readonly _preProcessor: (x: string) => string;
    private readonly _postProcessor: (x: Component) => Component;

    constructor(
        strict: boolean,
        debugOutput: ((x: string) => void) | null,
        message: string,
        miniMessage: MiniMessage,
        extraTags: TagResolver | null,
        preProcessor: ((x: string) => string) | null,
        postProcessor: ((x: Component) => Component) | null
    ) {
        this._strict = strict;
        this._debugOutput = debugOutput;
        this._message = message;
        this._miniMessage = miniMessage;
        this._tagResolver = (extraTags === null) ? TagResolver.empty() : extraTags;
        this._preProcessor = typeof preProcessor === "function" ? preProcessor : ((x) => x);
        this._postProcessor = typeof postProcessor === "function" ? postProcessor : ((x) => x);
    }

    //

    strict(): boolean {
        return this._strict;
    }

    debugOutput(): ((x: string) => void) | null {
        return this._debugOutput;
    }

    message(newMessage?: string): string {
        if (typeof newMessage === "string") this._message = newMessage;
        return this._message;
    }

    extraTags(): TagResolver {
        return this._tagResolver;
    }

    preProcessor(): (x: string) => string {
        return this._preProcessor;
    }

    postProcessor(): (x: Component) => Component {
        return this._postProcessor;
    }

    deserialize(message: string, ...resolvers: TagResolver[]): Component {
        return this._miniMessage.deserialize(message, this._tagResolver, ...resolvers);
    }

    newException(message: string, tags?: ArgumentQueue): Error {
        // TODO: Incorporate tags somehow
        return new Error(message);
    }

}
