import {TranslationArgument} from "./text/component/translatable";
import {Component} from "./text/component";
import {ArgumentChunk, Chunks, ChunkType} from "./i18n/chunks";
import {assertNever} from "./util/assertions";

//

export type TranslationData = {
    readonly [K in string]?: string
};

export interface Translations {
    readonly data: TranslationData,
    translate(key: string, args?: TranslationArgument[]): Component;
}

/** @internal */
type ParsedTranslationData = Map<string, Chunks>;

/** @internal */
class TranslationsImpl implements Translations {

    constructor(
        private readonly _data: ParsedTranslationData,
        private readonly _fallback: Translations.Fallback
    ) { }

    //

    get data(): TranslationData {
        const ret: Record<string, string> = {};
        this._data.forEach((v, k) => {
            ret[k] = Chunks.stringify(v);
        });
        return Object.freeze(ret);
    }

    translate(key: string, args?: TranslationArgument[]): Component {
        args = args || [];
        const chunks = this._data.get(key);
        if (!chunks) return this._normalize(this._fallback(key, args));

        let ret: Component = Component.empty();
        for (const chunk of chunks) {
            const { type } = chunk;
            switch (type) {
                case ChunkType.LITERAL:
                    ret = ret.append(Component.text(chunk.value));
                    break;
                case ChunkType.ARGUMENT:
                    ret = ret.append(this._resolve(chunk, args));
                    break;
                default:
                    assertNever(type);
            }
        }

        return ret;
    }

    private _resolve(chunk: ArgumentChunk, args: TranslationArgument[]): Component {
        const { index, fallback } = chunk;
        if (index < 0 || index >= args.length) return Component.text(fallback);
        return this._normalize(args[index]);
    }

    private _normalize(arg: boolean | number | string | Component): Component {
        if (typeof arg === "object" && arg !== null) return arg;
        return Component.text(`${arg}`);
    }

}

export namespace Translations {

    export type Fallback = (key: string, args: TranslationArgument[]) => Component | string;

    export interface Builder {

        with(data: Translations | TranslationData): this;

        fallback(fallback: Fallback): this;

        build(): Translations;

    }

    /** @internal */
    class BuilderImpl implements Builder {

        private static readonly DEFAULT_FALLBACK: Fallback = (s) => s;

        //

        private readonly _data: ParsedTranslationData = new Map();
        private _fallback: Fallback = BuilderImpl.DEFAULT_FALLBACK;
        private _open: boolean = true;

        //

        with(data: Translations | TranslationData): this {
            this._checkOpen();
            if (data instanceof TranslationsImpl) {
                const parsed = data["_data"];
                parsed.forEach((v, k) => this._data.set(k, v));
                this._fallback = data["_fallback"];
            } else {
                for (const key of Object.keys(data)) {
                    const value = (data as TranslationData)[key];
                    const parsedValue = Chunks.parse(`${value}`);
                    this._data.set(key, parsedValue);
                }
            }
            return this;
        }

        fallback(fallback: Translations.Fallback): this {
            this._checkOpen();
            this._fallback = fallback;
            return this;
        }

        build(): Translations {
            this._open = false;
            return new TranslationsImpl(this._data, this._fallback);
        }

        private _checkOpen() {
            if (this._open) return;
            throw new Error("Cannot use builder after #build");
        }

    }

    //

    const EMPTY = (new BuilderImpl()).build();

    export function builder(): Builder {
        return new BuilderImpl();
    }

    export function empty(): Translations {
        return EMPTY;
    }

    export function of(data: Translations | TranslationData): Translations {
        return builder()
            .with(data)
            .build();
    }

}
