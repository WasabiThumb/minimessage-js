import {ArgumentQueue} from "./resolver/argumentQueue";
import {Tag} from "../tag";
import {Context} from "../context";

//

export interface TagResolver {

    has(name: string): boolean;

    resolve(name: string, args: ArgumentQueue, ctx: Context): Tag | null;

}

interface MappableResolver extends TagResolver {

    contributeToMap(map: Map<string, Tag>): boolean;

}

//

export namespace TagResolver {

    export interface Single extends TagResolver {

        key(): string;

        tag(): Tag;

    }

    class SingleImpl implements Single, MappableResolver {

        private readonly _key: string;
        private readonly _tag: Tag;

        constructor(key: string, tag: Tag) {
            this._key = key;
            this._tag = tag;
        }

        //

        key() {
            return this._key;
        }

        tag() {
            return this._tag;
        }

        has(name: string): boolean {
            return this._key === name;
        }

        resolve(name: string, args: ArgumentQueue, ctx: Context): Tag | null {
            if (!this.has(name)) return null;
            if (args.hasNext()) throw ctx.newException(`Tag <${name}> does not accept any arguments`, args);
            return this._tag;
        }

        contributeToMap(map: Map<string, Tag>): boolean {
            map.set(this._key, this._tag);
            return true;
        }

    }

    class Sequential implements TagResolver {

        constructor(
            readonly resolvers: TagResolver[]
        ) { }

        //

        resolve(name: string, args: ArgumentQueue, ctx: Context): Tag | null {
            let thrown: Error | null = null;

            for (const resolver of this.resolvers) {
                try {
                    if (!resolver.has(name)) continue;
                    const placeholder = resolver.resolve(name, args, ctx);
                    if (placeholder !== null) return placeholder;
                } catch (e) {
                    args.reset();
                    const error = (typeof e === "object" && e instanceof Error) ?
                        e : ctx.newException(`${e}`, args);
                    if (thrown) error.cause = thrown;
                    thrown = error;
                }
            }

            if (thrown) throw thrown;
            return null;
        }

        has(name: string): boolean {
            for (const resolver of this.resolvers) {
                if (resolver.has(name)) return true;
            }
            return false;
        }

    }

    class OfMap implements TagResolver, MappableResolver {

        constructor(
            readonly tagMap: Map<string, Tag>
        ) { }

        //

        has(name: string): boolean {
            return this.tagMap.has(name);
        }

        resolve(name: string, args: ArgumentQueue, ctx: Context): Tag | null {
            const tag = this.tagMap.get(name);
            if (!tag) return null;
            if (args.hasNext()) {
                throw ctx.newException(`Tag <${name}> does not accept any arguments`, args);
            }
            return tag;
        }

        contributeToMap(map: Map<string, Tag>): boolean {
            this.tagMap.forEach((v, k) => map.set(k, v));
            return true;
        }

    }

    const EMPTY = new class implements TagResolver, MappableResolver {
        has(name: string): boolean {
            return false;
        }
        resolve(name: string, args: ArgumentQueue, ctx: Context): Tag | null {
            return null;
        }
        contributeToMap(map: Map<string, Tag>): boolean {
            return true;
        }
    };

    //

    export interface Builder {

        tag(name: string, tag: Tag): this;

        resolver(resolver: TagResolver): this;

        resolvers(...resolvers: TagResolver[]): this;

        build(): TagResolver;

    }

    /** @internal */
    class BuilderImpl implements Builder {

        private readonly _replacements: Map<string, Tag>;
        private readonly _resolvers: TagResolver[];

        constructor() {
            this._replacements = new Map();
            this._resolvers = [];
        }

        //

        tag(name: string, tag: Tag): this {
            this._replacements.set(name, tag);
            return this;
        }

        resolver(resolver: TagResolver): this {
            if (resolver instanceof Sequential) {
                this.resolvers(...resolver.resolvers);
            } else if (!this.consumePotentialMappable(resolver)) {
                this.popMap();
                this._resolvers.push(resolver);
            }
            return this;
        }

        resolvers(...resolvers: TagResolver[]): this {
            this.resolvers0(resolvers, true);
            return this;
        }

        build(): TagResolver {
            this.popMap();
            const length = this._resolvers.length;
            if (length === 0) return EMPTY;
            if (length === 1) return this._resolvers[0];
            const resolvers: TagResolver[] = new Array(length);
            for (let i = 0; i < length; i++) resolvers[i] = this._resolvers[length - 1 - i];
            return new Sequential(resolvers);
        }

        private resolvers0(resolvers: TagResolver[], forwards: boolean): void {
            let popped: boolean = false;
            if (forwards) {
                for (const resolver of resolvers) {
                    popped = this.single(resolver, popped);
                }
            } else {
                for (let i = resolvers.length - 1; i >= 0; i--) {
                    popped = this.single(resolvers[i], popped);
                }
            }
        }

        private single(resolver: TagResolver, popped: boolean): boolean {
            if (resolver instanceof Sequential) {
                this.resolvers0(resolver.resolvers, false);
            } else if (!this.consumePotentialMappable(resolver)) {
                if (!popped) this.popMap();
                this._resolvers.push(resolver);
                return true;
            }
            return false;
        }

        private consumePotentialMappable(resolver: TagResolver): boolean {
            if ("contributeToMap" in resolver && typeof resolver["contributeToMap"] === "function") {
                return (resolver as unknown as MappableResolver).contributeToMap(this._replacements);
            } else {
                return false;
            }
        }

        private popMap(): void {
            if (this._replacements.size === 0) return;
            this._resolvers.push(new OfMap(new Map(this._replacements)));
            this._replacements.clear();
        }

    }

    //

    export function builder(): Builder {
        return new BuilderImpl();
    }

    export function empty(): TagResolver {
        return EMPTY;
    }

    export function resolver(name: string, tag: Tag): TagResolver.Single {
        return new SingleImpl(name, tag);
    }

    export function dynamic(name: string, handler: (args: ArgumentQueue, ctx: Context) => Tag, ...aliases: string[]): TagResolver {
        let has: (name: string) => boolean;
        if (aliases.length === 0) {
            has = (n) => name === n;
        } else {
            const set = new Set<string>();
            set.add(name);
            for (const alias of aliases) set.add(alias);
            has = (n) => set.has(n);
        }
        return Object.freeze({
            has,
            resolve(n: string, args: ArgumentQueue, ctx: Context): Tag | null {
                if (!has(n)) return null;
                return handler(args, ctx);
            }
        })
    }

}
