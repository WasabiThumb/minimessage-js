import {Key} from "./key";

//

/**
 * A lazily loaded collection of resource
 * pack ZIPs. The structure and metadata
 * of the resource pack is parsed, the
 * texture data is not. May vend a
 * Sprite which can be used to access
 * texture data.
 */
export interface ResourcePacks {

    readonly textures: readonly Key[];

    readonly atlases: readonly Key[];

    atlasTextures(atlas: Key): readonly Key[] | null;

    sprite(key: Key, atlas?: Key | null): ResourcePacks.Sprite | null;

}

const EMPTY_ARRAY: readonly [] = Object.freeze([]);
const EMPTY = new class implements ResourcePacks {
    textures = EMPTY_ARRAY;
    atlases = EMPTY_ARRAY;
    atlasTextures() {
        return null;
    }
    sprite() {
        return null;
    }
};

export namespace ResourcePacks {

    /**
     * An object representing the content
     * of a resource pack ZIP or a relative
     * or absolute URL pointing to a resource
     * pack ZIP.
     */
    export type Source = ArrayBuffer | Uint8Array<ArrayBuffer> | Blob | URL | string;

    export interface SpriteAnimationFrame {
        readonly row: number;
        readonly durationMs: number;
    }

    export interface SpriteAnimation {
        readonly frameWidth: number;
        readonly frameHeight: number;
        readonly totalRows: number;
        readonly frames: readonly SpriteAnimationFrame[];
        readonly durationMs: number;
        readonly interpolate: boolean;
    }

    export interface SpriteRenderInfo {
        readonly url: string;
        readonly blob: Blob;
        readonly width: number;
        readonly height: number;
        readonly animation: SpriteAnimation | null;
    }

    /** Represents a potentially animated texture from a resource pack. */
    export interface Sprite {
        readonly key: Key;
        readonly atlas: Key | null;

        /**
         * Provides access to the texture and animation data.
         * The URL is an object URL and will be revoked some time
         * after the callback resolves (the timing is otherwise
         * not a guarantee). If you need to continue
         * using the sprite, consider transferring the Blob to
         * an ImageBitmap.
          */
        use<T>(cb: (info: SpriteRenderInfo) => T): Promise<Awaited<T>>;
    }

    //

    export function empty(): ResourcePacks {
        return EMPTY;
    }

    /**
     * Utility function for loading resource packs with
     * a specified loader, such as the loader provided
     * by @minimessage-js/pack-loader. Uses Function#apply
     * to expand an argument array into varargs.
     */
    export function load<A extends readonly any[], R extends ResourcePacks | Promise<ResourcePacks>>(
        loader: (...args: A) => ResourcePacks | Promise<ResourcePacks>,
        args: A
    ): R {
        return loader.apply(null, args as unknown as any[]) as R;
    }

}
