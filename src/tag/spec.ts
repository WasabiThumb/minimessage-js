import {ArgumentQueue} from "../markup/args";
import {TagResolverContext} from "./context";
import {Component, IComponent} from "../component/spec";

export enum TagType {
    INSERT,
    MODIFY,
    DIRECTIVE
}

export enum TagDirective {
    RESET
}

export type InsertTag = {
    readonly type: TagType.INSERT,
    readonly selfClosing: boolean,
    readonly allowsChildren: boolean,
    readonly value: Component,
};

export type ModifyTag = {
    readonly type: TagType.MODIFY,
    apply(component: Component, depth: number): Component,
};

export type DirectiveTag = {
    readonly type: TagType.DIRECTIVE,
    readonly directive: TagDirective,
};

export type Tag = InsertTag | ModifyTag | DirectiveTag;

export namespace Tag {

    export function insert(value: Component, allowsChildren: boolean = false, selfClosing: boolean = !allowsChildren): InsertTag {
        return {
            type: TagType.INSERT,
            selfClosing, allowsChildren, value
        };
    }

    export function modify(fn: (component: Component) => Component | void | undefined | null): ModifyTag {
        return {
            type: TagType.MODIFY,
            apply(component: Component): Component {
                const out = fn(component);
                if (typeof out === "object" && out !== null) return out;
                return component;
            }
        };
    }

    export function modifyProperty<K extends keyof IComponent>(prop: K, value: IComponent[K]): ModifyTag {
        return modify((component) => {
            component.setProperty(prop, value);
        });
    }

    export function directive(directive: TagDirective): DirectiveTag {
        return {
            type: TagType.DIRECTIVE,
            directive
        };
    }

}

//

export interface TagResolver {

    /**
     * Get whether this resolver handles tags with a certain name
     */
    has(name: string): boolean;

    /**
     * Gets a tag from this resolver based on the current state
     */
    resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null;

}

export namespace TagResolver {

    export class Builder {
        private readonly _resolvers: TagResolver[] = [];
        constructor() { }

        resolver(resolver: TagResolver): this {
            this._resolvers.push(resolver);
            return this;
        }

        resolvers(...resolvers: TagResolver[]): this {
            this._resolvers.push(...resolvers);
            return this;
        }

        tag(tagName: string, handler: Tag | ((args: ArgumentQueue, ctx: TagResolverContext) => Tag | null)): this {
            const isTag = (typeof handler !== "function" && "type" in handler && typeof handler["type"] === "number");
            const resolver: TagResolver = {
                has(name: string): boolean {
                    return tagName === name;
                },
                resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
                    if (tagName !== name) return null;
                    if (isTag) return handler as Tag;
                    return (handler as Exclude<typeof handler, Tag>)(args, ctx);
                }
            };
            this._resolvers.push(resolver);
            return this;
        }

        build(): TagResolver {
            const { _resolvers } = this;
            return {
                has(name: string): boolean {
                    for (let res of _resolvers) {
                        if (res.has(name)) return true;
                    }
                    return false;
                },
                resolve(name: string, args: ArgumentQueue, ctx: TagResolverContext): Tag | null {
                    let ret: Tag | null = null;
                    for (let res of _resolvers) {
                        if (res.has(name)) {
                            ret = res.resolve(name, args, ctx);
                            if (ret !== null) return ret;
                        }
                    }
                    return ret;
                }
            };
        }
    }

    export function builder(): Builder {
        return new Builder();
    }

    export function empty(): TagResolver {
        return builder().build();
    }

}

