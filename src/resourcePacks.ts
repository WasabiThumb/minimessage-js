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
        readonly width: number;
        readonly height: number;
        readonly animation: SpriteAnimation | null;
    }

    export interface Sprite {
        readonly key: Key;
        readonly atlas: Key | null;
        use<T>(cb: (info: SpriteRenderInfo) => T): Promise<Awaited<T>>;
    }

    //

    export function empty(): ResourcePacks {
        return EMPTY;
    }

}
