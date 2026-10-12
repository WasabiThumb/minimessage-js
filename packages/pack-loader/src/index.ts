import { type ResourcePacks, Key } from "minimessage-js";
import wrauz, { type ZipEntry, type ZipFile } from "wrauz";

//

/** Generic key-to-any map data structure for storing resource pack info */
class KeyMap<V> implements Iterable<readonly [Key, V]> {

    private static _strcmp(a: string, b: string): number {
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
            const d = a.charCodeAt(i) - b.charCodeAt(i);
            if (d !== 0) return d;
        }
        return a.length - b.length;
    }

    private static _cmp(a: Key, b: Key): number {
        const ns = this._strcmp(a.namespace(), b.namespace());
        if (ns !== 0) return ns;
        return this._strcmp(a.value(), b.value());
    }

    //

    private readonly _data: (Key | V)[];

    constructor() {
        this._data = [];
    }

    //

    get size(): number {
        return this._data.length >>> 1;
    }

    get(key: Key): V | null {
        return this._search(
            key,
            (i) => this._data[(i << 1) | 1] as V,
            () => null
        );
    }

    put(key: Key, value: V): V | null {
        return this._search(
            key,
            (i) => {
                const q = i << 1;
                const j = q | 1;
                const old = this._data[j] as V;
                this._data[q] = key;
                this._data[j] = value;
                return old;
            },
            (i) => {
                this._data.splice(i << 1, 0, key, value);
                return null;
            }
        )
    }

    [Symbol.iterator](): Iterator<readonly [ Key, V ]> {
        return this._entries();
    }

    private _search<R>(
        needle: Key,
        hit: (index: number) => R,
        miss: (index: number) => R
    ): R {
        let len: number = this.size;
        let off: number = 0;
        while (len > 0) {
            const hl = len >>> 1;
            const s = off + hl;
            const c = KeyMap._cmp(needle, this._data[s << 1] as Key);
            if (c === 0) return hit(s);
            if (c < 0) {
                len = hl;
            } else {
                off += hl + 1;
                len -= hl + 1;
            }
        }
        return miss(off);
    }

    private *_entries(): Generator<readonly [ Key, V ]> {
        const tmp = new Array(2) as [ Key, V];
        for (let i = 0; i < this._data.length; i += 2) {
            tmp[0] = this._data[i] as Key;
            tmp[1] = this._data[i | 1] as V;
            yield tmp;
        }
    }

}

const moveMap = (<E extends readonly any[], I extends 0 | 1>(
    map: Iterable<E> & { readonly size: number },
    index: I
): (E[I])[] => {
    const ret = new Array<E[I]>(map.size);
    let head: number = 0;
    for (const entry of map) ret[head++] = entry[index];
    ret.length = head;
    return ret;
});

//

type AtlasSourceJson = {
    type?: string,
    source?: string,
    prefix?: string,
    resource?: string,
    sprite?: string
};

type AtlasJson = {
    sources?: AtlasSourceJson[]
};

/** Parts of the .mcmeta file we use */
type RelevantMcMeta = {
    animation?: {
        interpolate?: boolean,
        width?: number,
        height?: number,
        frametime?: number,
        frames?: (number | { index: number, time?: number })[]
    }
};

/** URL, width and height of a texture (must be fetched) */
type TextureInfo = {
    readonly url: string,
    readonly blob: Blob,
    readonly width: number,
    readonly height: number
};

/** Refcounted texture info, should be reclaimed at some point after refcount hits 0 */
type TextureData = {
    readonly info: TextureInfo,
    refcount: number,
    reclaim: number
};

/** Texture data has not yet been requested or has been reclaimed */
type IdleTextureState = { readonly type: "idle" };

/** Texture data is loading */
type LoadingTextureState = { readonly type: "loading", readonly value: Promise<TextureData> };

/** Texture data has loaded */
type LoadedTextureState = { readonly type: "loaded", readonly value: TextureData };

/** Possible state for the image data of a texture */
type TextureState = IdleTextureState | LoadingTextureState | LoadedTextureState;

/** Represents a .png in a ZIP somewhere, with optional meta */
class Texture {

    private static readonly _IDLE: IdleTextureState = Object.freeze({ type: "idle" });
    private static readonly _RECLAIM_DELAY_MS: number = 200;

    //

    readonly file: ZipFile;
    readonly entry: ZipEntry;
    readonly meta: RelevantMcMeta | null;
    private _state: TextureState;

    constructor(file: ZipFile, entry: ZipEntry, meta: RelevantMcMeta | null) {
        this.file = file;
        this.entry = entry;
        this.meta = meta;
        this._state = Texture._IDLE;
    }

    //

    async use<T>(cb: (info: TextureInfo) => T): Promise<Awaited<T>> {
        const data = await this._data();
        data.refcount++;
        try {
            return await cb(data.info);
        } finally {
            if ((--data.refcount) === 0) this._initiateReclaim(data);
        }
    }

    private _initiateReclaim(data: TextureData): void {
        const id = ++data.reclaim;
        setTimeout(() => {
            if (id !== data.reclaim) return;
            const url = data.info.url;
            URL.revokeObjectURL(url);
            const ms = this._state;
            if (ms.type !== "loaded" || url !== ms.value.info.url) return;
            this._state = { type: "idle" };
        }, Texture._RECLAIM_DELAY_MS);
    }

    private _data(): Promise<TextureData> {
        const state = this._state;
        switch (state.type) {
            case "loading":
                return state.value;
            case "loaded":
                return Promise.resolve(state.value);
            default:
                const ret = this._fetch();
                this._state = { type: "loading", value: ret };
                ret.then((v) => {
                    this._state = { type: "loaded", value: v };
                });
                return ret;
        }
    }

    private async _fetch(): Promise<TextureData> {
        const stream = await this.file.read(this.entry);
        try {
            const reader = stream.getReader();
            try {
                return await this._fetchWithReader(reader);
            } finally {
                await reader.cancel();
            }
        } finally {
            try {
                await stream.cancel();
            } catch (ignored) { }
        }
    }

    private async _fetchWithReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<TextureData> {
        // Read fully (don't necessarily need it in 1 contiguous buffer)
        const parts: Uint8Array<ArrayBuffer>[] = [];
        let next;
        while (!(next = await reader.read()).done) parts.push(next.value as Uint8Array<ArrayBuffer>);

        // Piece together the header
        let header: Uint8Array;
        if (parts.length !== 0 && parts[0].length >= 24) {
            header = parts[0].subarray(0, 24);
        } else {
            header = new Uint8Array(24);
            let head: number = 0;
            for (const part of parts) {
                const rem = 24 - head;
                if (part.length >= rem) {
                    header.set(part.subarray(0, rem), head);
                    break;
                } else {
                    header.set(part, head);
                    head += part.length;
                }
            }
            if (head !== 24) {
                throw new Error(`Truncated PNG data (expected at least 24 bytes, got ${head})`);
            }
        }

        // Validate the header and read dimensions
        const dv = new DataView(header.buffer, header.byteOffset, header.byteLength);
        if (0x89_50_4E_47_0D_0A_1A_0An !== dv.getBigUint64(0, false))
            throw new Error(`Invalid PNG data (mismatched signature)`);
        const width = dv.getUint32(16, false);
        const height = dv.getUint32(20, false);

        // Create the object URL
        const blob = new Blob(parts, { type: "image/png" });
        const url = URL.createObjectURL(blob);

        // Create the texture info
        const info: TextureInfo = { url, blob, width, height };

        // Create the texture data
        return { info, refcount: 0, reclaim: 0 };
    }

}

/** Wrapper for a texture */
class SpriteImpl implements ResourcePacks.Sprite {

    private readonly _texture: Texture;

    constructor(
        readonly key: Key,
        readonly atlas: Key | null,
        texture: Texture
    ) {
        this._texture = texture;
    }

    //

    use<T>(cb: (info: ResourcePacks.SpriteRenderInfo) => T): Promise<Awaited<T>> {
        return this._texture.use(({ url, blob, width, height }) => {
            const me = this;
            const getAnimation = (() => me._parseAnimation(me._texture.meta, width, height));
            return cb({
                url,
                blob,
                width,
                height,
                get animation() {
                    return getAnimation();
                }
            });
        });
    }

    private _parseAnimation(
        json: RelevantMcMeta | null,
        textureWidth: number,
        textureHeight: number
    ): ResourcePacks.SpriteAnimation | null {
        if (!json) return null;
        const anim = json.animation;
        if (!anim) return null;

        const frameWidth = anim.width ?? textureWidth;
        const frameHeight = anim.height ?? frameWidth;
        if (frameWidth <= 0 || frameHeight <= 0) return null;

        const totalRows = Math.floor(textureHeight / frameHeight);
        if (totalRows <= 0) return null;

        const defaultFrametime = anim.frametime ?? 1; // ticks; 1 tick = 50ms

        let frames: ResourcePacks.SpriteAnimationFrame[];

        if (!anim.frames || anim.frames.length === 0) {
            frames = [];
            for (let r = 0; r < totalRows; r++) {
                frames.push({ row: r, durationMs: defaultFrametime * 50 });
            }
        } else {
            frames = anim.frames.map((f) => {
                const row = typeof f === "number" ? f : f.index;
                const ticks = typeof f === "number" ? defaultFrametime : (f.time ?? defaultFrametime);
                return { row, durationMs: ticks * 50 };
            });
        }

        if (frames.length < 2) return null; // a single "frame" isn't actually animated

        const durationMs = frames.reduce((sum, f) => sum + f.durationMs, 0);

        return { frameWidth, frameHeight, totalRows, frames, durationMs, interpolate: anim.interpolate === true };
    }

}

class ResourcePacksImpl implements ResourcePacks {

    private readonly _textures: KeyMap<Texture>;
    private readonly _atlases: KeyMap<KeyMap<Key>>;

    constructor(
        textures: KeyMap<Texture>,
        atlases: KeyMap<KeyMap<Key>>
    ) {
        this._textures = textures;
        this._atlases = atlases;
    }

    //

    get textures(): readonly Key[] {
        return moveMap(this._textures, 0);
    }

    get atlases(): readonly Key[] {
        return moveMap(this._atlases, 0);
    }

    atlasTextures(atlas: Key): readonly Key[] | null {
        const map = this._atlases.get(atlas);
        if (!map) return null;
        return moveMap(map, 1);
    }

    sprite(key: Key, atlas?: Key | null): ResourcePacks.Sprite | null {
        const texture = this._texture(key, atlas);
        if (!texture) return null;
        return new SpriteImpl(
            key,
            atlas ? atlas : null,
            texture
        );
    }

    private _texture(key: Key, atlas?: Key | null): Texture | null {
        // Resolve the key against the atlas, if provided
        if (atlas) {
            const map = this._atlases.get(atlas);
            if (!map) return null;
            const resolved = map.get(key);
            if (!resolved) return null;
            key = resolved;
        }

        // Get the texture
        return this._textures.get(key);
    }

}

//

function resolveAtlasIndex(
    namespace: string,
    json: AtlasJson,
    textures: KeyMap<Texture>
): KeyMap<Key> {
    const result = new KeyMap<Key>();

    const { sources } = json;
    if (!sources) return result;

    for (const src of sources) {
        const rawType = src.type;
        if (!rawType) continue;
        const type = Key.key(rawType);
        if (Key.MINECRAFT_NAMESPACE !== type.namespace()) continue;
        const typeId = type.value();
        switch (typeId) {
            case "single":
                const resource = Key.key(src.resource!);
                const sprite = src.sprite ? Key.key(src.sprite) : resource;
                result.put(sprite, resource);
                break;
            case "directory":
                const dirPrefix = `${src.source}/`;
                const spritePrefix = src.prefix ?? '';

                for (const [ textureKey, _ ] of textures) {
                    const path = textureKey.value();
                    if (namespace !== textureKey.namespace()) continue;
                    if (!path.startsWith(dirPrefix)) continue;
                    const rest = path.substring(dirPrefix.length);
                    result.put(Key.key(namespace, `${spritePrefix}${rest}`), textureKey);
                }
                break;
            // TODO: "filter" / "paletted_permutations"
        }
    }

    return result;
}

/**
 * Loads resource packs from the specified sources.
 * For example, if a `File` has been received from
 * the user via a file input element, that `File`
 * may be passed as-is. Crucially, doing it this way
 * means that the entire file does not necessarily
 * need to be loaded into memory. You may also
 * use a `URL` or `string` representing a URL for
 * a similar effect, or simply pass in-memory
 * `ArrayBuffer`s or `TypedArray`s.
 */
export default async function loadResourcePacks(...sources: ResourcePacks.Source[]): Promise<ResourcePacks> {
    // Tables
    const textures = new KeyMap<Texture>();
    const rawAtlases = new KeyMap<AtlasJson>();

    // Load all ZIPs
    for (const source of sources) {
        const zip = await wrauz(source);

        for (const nse of zip.list("assets/")) {
            if (!nse.name.endsWith("/")) continue;
            const namespace = nse.name.substring(7, nse.name.length - 1);
            const texturesPrefix = nse.name + "textures/";
            const atlasesPrefix = nse.name + "atlases/";

            for (const entry of zip.list(texturesPrefix, true)) {
                if (!entry.name.endsWith(".png")) continue;
                const path = entry.name.substring(texturesPrefix.length, entry.name.length - 4);
                let meta: RelevantMcMeta | null = null;

                const metaEntry = zip.entry(entry.name + ".mcmeta");
                if (metaEntry) {
                    try {
                        const json = JSON.parse(await zip.read(metaEntry, "utf8"));
                        meta = json as RelevantMcMeta;
                    } catch (ignored) { }
                }

                const texture = new Texture(zip, entry, meta);
                textures.put(Key.key(namespace, path), texture);
            }

            for (const entry of zip.list(atlasesPrefix, true)) {
                if (!entry.name.endsWith(".json")) continue;
                const path = entry.name.substring(atlasesPrefix.length, entry.name.length - 5);
                let data;
                try {
                    data = JSON.parse(await zip.read(entry, "utf8"));
                } catch (ignored) { }
                rawAtlases.put(Key.key(namespace, path), data as AtlasJson);
            }
        }
    }

    // Resolve the atlas
    const atlas = new KeyMap<KeyMap<Key>>();
    for (const [ key, json ] of rawAtlases) {
        atlas.put(key, resolveAtlasIndex(key.namespace(), json, textures));
    }

    // Create the object
    return new ResourcePacksImpl(textures, atlas);
}
