import {unzipSync} from "fflate";
import {assertReal} from "./util/assertions";
import {Key} from "./key";

//

export type ResourcePackSource = ArrayBuffer | Uint8Array | Blob;

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

/** Identifies an atlas (e.g. from `assets/<namespace>/atlases/<id>.json`). */
export interface AtlasId {
    readonly namespace: string;
    readonly id: string;
}

/** Identifies a texture or a sprite name registered within an atlas. */
export interface TextureId {
    readonly namespace: string;
    readonly path: string;
}

/** @internal */
type TextureIndex = Map<string, Uint8Array>;

/** @internal */
type TextureDimensions = { width: number, height: number };

/** @internal */
type McmetaRaw = {
    animation?: {
        interpolate?: boolean,
        width?: number,
        height?: number,
        frametime?: number,
        frames?: (number | { index: number, time?: number })[]
    }
};

/** @internal */
type AtlasSourceJson = {
    type?: string,
    source?: string,
    prefix?: string,
    resource?: string,
    sprite?: string
};

/** @internal */
type AtlasJson = { sources?: AtlasSourceJson[] };

export interface ResourcePacks {

    texture(namespace: string, path: string): Uint8Array | null;

    textureUrl(namespace: string, path: string): string | null;

    has(namespace: string, path: string): boolean;

    resolveSprite(
        atlasNamespace: string, atlasId: string,
        spriteNamespace: string, spritePath: string
    ): SpriteRenderInfo | null;

    /** All atlases found across the loaded resource packs. */
    listAtlases(): readonly AtlasId[];

    /**
     * All sprite names registered in the given atlas (i.e. the names you'd use in
     * a `<sprite:...>` tag), or `null` if no atlas with that namespace/id was loaded.
     */
    listAtlasSprites(atlasNamespace: string, atlasId: string): readonly TextureId[] | null;

    /**
     * Every raw texture found in the loaded resource packs, regardless of whether
     * it's referenced by any atlas. Useful as a fallback when an atlas wasn't
     * included in the upload, or for browsing textures directly.
     */
    listTextures(): readonly TextureId[];

    dispose(): void;

}

/** @internal */
class ResourcePacksImpl implements ResourcePacks {

    private readonly _urlCache: Map<string, string> = new Map();

    constructor(
        private readonly _textures: TextureIndex,
        private readonly _dimensions: Map<string, TextureDimensions>,
        private readonly _mcmeta: Map<string, McmetaRaw>,
        private readonly _atlases: Map<string, Map<string, string>>
    ) { }

    //

    texture(namespace: string, path: string): Uint8Array | null {
        return this._textures.get(key(namespace, path)) ?? null;
    }

    textureUrl(namespace: string, path: string): string | null {
        const k = key(namespace, path);
        const bytes = this._textures.get(k);
        if (!bytes) return null;
        return this._urlFor(k, bytes);
    }

    has(namespace: string, path: string): boolean {
        return this._textures.has(key(namespace, path));
    }

    resolveSprite(
        atlasNamespace: string, atlasId: string,
        spriteNamespace: string, spritePath: string
    ): SpriteRenderInfo | null {
        const spriteKey = key(spriteNamespace, spritePath);
        const atlasKey = key(atlasNamespace, atlasId);
        const atlasIndex = this._atlases.get(atlasKey);

        let textureKey: string;
        if (atlasIndex) {
            const resolved = atlasIndex.get(spriteKey);
            if (!resolved) return null;
            textureKey = resolved;
        } else {
            textureKey = spriteKey;
        }

        const bytes = this._textures.get(textureKey);
        if (!bytes) return null;

        const dims = this._dimensions.get(textureKey);
        if (!dims) return null;

        const mcmeta = this._mcmeta.get(textureKey) ?? null;
        const animation = mcmeta ? parseAnimation(mcmeta, dims.width, dims.height) : null;

        return {
            url: this._urlFor(textureKey, bytes),
            width: dims.width,
            height: dims.height,
            animation
        };
    }

    listAtlases(): readonly AtlasId[] {
        return [...this._atlases.keys()].map(splitKeyToAtlasId);
    }

    listAtlasSprites(atlasNamespace: string, atlasId: string): readonly TextureId[] | null {
        const atlasIndex = this._atlases.get(key(atlasNamespace, atlasId));
        if (!atlasIndex) return null;
        return [...atlasIndex.keys()].map(splitKeyToTextureId);
    }

    listTextures(): readonly TextureId[] {
        return [...this._textures.keys()].map(splitKeyToTextureId);
    }

    dispose(): void {
        this._urlCache.forEach((url) => URL.revokeObjectURL(url));
        this._urlCache.clear();
    }

    //

    private _urlFor(textureKey: string, bytes: Uint8Array): string {
        const cached = this._urlCache.get(textureKey);
        if (cached) return cached;
        const url = URL.createObjectURL(new Blob([toOwnedArrayBuffer(bytes)], {type: "image/png"}));
        this._urlCache.set(textureKey, url);
        return url;
    }

}

/** @internal */
function key(namespace: string, path: string): string {
    return `${namespace.toLowerCase()}:${path.toLowerCase()}`;
}

/** @internal */
function splitKey(k: string): [namespace: string, path: string] {
    const sep = k.indexOf(":");
    return [k.substring(0, sep), k.substring(sep + 1)];
}

/** @internal */
function splitKeyToAtlasId(k: string): AtlasId {
    const [namespace, id] = splitKey(k);
    return {namespace, id};
}

/** @internal */
function splitKeyToTextureId(k: string): TextureId {
    const [namespace, path] = splitKey(k);
    return {namespace, path};
}

/** @internal */
function toOwnedArrayBuffer(view: Uint8Array): ArrayBuffer {
    if (
        view.buffer instanceof ArrayBuffer &&
        view.byteOffset === 0 &&
        view.byteLength === view.buffer.byteLength
    ) {
        return view.buffer;
    }
    return view.slice().buffer as ArrayBuffer;
}

/** @internal */
const PNG_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

/** @internal */
function readPngSize(bytes: Uint8Array): TextureDimensions | null {
    if (bytes.length < 24) return null;
    for (let i = 0; i < 8; i++) {
        if (bytes[i] !== PNG_SIGNATURE[i]) return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
        width: view.getUint32(16, false),
        height: view.getUint32(20, false)
    };
}

function parseAnimation(json: McmetaRaw, textureWidth: number, textureHeight: number): SpriteAnimation | null {
    const anim = json.animation;
    if (!anim) return null;

    const frameWidth = anim.width ?? textureWidth;
    const frameHeight = anim.height ?? frameWidth;
    if (frameWidth <= 0 || frameHeight <= 0) return null;

    const totalRows = Math.floor(textureHeight / frameHeight);
    if (totalRows <= 0) return null;

    const defaultFrametime = anim.frametime ?? 1; // ticks; 1 tick = 50ms

    let frames: SpriteAnimationFrame[];

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

/** @internal */
function sourceTypeId(rawType: string | undefined): string | null {
    if (!rawType) return null;
    return Key.key(rawType).value().toLowerCase();
}

/** @internal */
function buildAtlasIndex(
    atlasNamespace: string,
    json: AtlasJson,
    textureKeys: IterableIterator<string>
): Map<string, string> {
    const allTextureKeys = [...textureKeys];
    const result = new Map<string, string>();

    for (const src of json.sources ?? []) {
        const typeId = sourceTypeId(src.type);

        if (typeId === "single" && src.resource) {
            const resourceParsed = Key.key(src.resource);
            const textureKey = key(resourceParsed.namespace(), resourceParsed.value());

            const spriteKey = src.sprite
                ? key(Key.key(src.sprite).namespace(), Key.key(src.sprite).value())
                : textureKey;

            result.set(spriteKey, textureKey);
        } else if (typeId === "directory" && src.source) {
            const dirPrefix = `${src.source.toLowerCase()}/`;
            const spritePrefix = (src.prefix ?? "").toLowerCase();

            for (const textureKey of allTextureKeys) {
                const [ns, path] = splitKey(textureKey);
                if (ns !== atlasNamespace) continue;
                if (!path.startsWith(dirPrefix)) continue;

                const rest = path.substring(dirPrefix.length);
                result.set(`${ns}:${spritePrefix}${rest}`, textureKey);
            }
        }
        // TODO: "filter" / "paletted_permutations"
    }

    return result;
}

//

const TEXTURE_PATH = /^assets\/([^/]+)\/textures\/(.+)\.png$/;
const MCMETA_PATH = /^assets\/([^/]+)\/textures\/(.+)\.png\.mcmeta$/;
const ATLAS_PATH = /^assets\/([^/]+)\/atlases\/(.+)\.json$/;

export namespace ResourcePacks {

    const EMPTY: ResourcePacks = new ResourcePacksImpl(new Map(), new Map(), new Map(), new Map());

    export function empty(): ResourcePacks {
        return EMPTY;
    }

    export async function fromZips(files: ResourcePackSource[]): Promise<ResourcePacks> {
        assertReal(files, "files");

        const textures: TextureIndex = new Map();
        const mcmetaRaw: Map<string, McmetaRaw> = new Map();
        const atlasRaw: Map<string, AtlasJson> = new Map();

        for (const file of files) {
            const bytes = await toBytes(file);

            const entries = unzipSync(bytes, {
                filter: (entry) =>
                    TEXTURE_PATH.test(entry.name) ||
                    MCMETA_PATH.test(entry.name) ||
                    ATLAS_PATH.test(entry.name)
            });

            for (const path of Object.keys(entries)) {
                let m: RegExpExecArray | null;

                if ((m = TEXTURE_PATH.exec(path))) {
                    textures.set(key(m[1], m[2]), entries[path]);
                    continue;
                }
                if ((m = MCMETA_PATH.exec(path))) {
                    try {
                        mcmetaRaw.set(key(m[1], m[2]), JSON.parse(new TextDecoder().decode(entries[path])));
                    } catch {
                        // Malformed mcmeta
                    }
                    continue;
                }
                if ((m = ATLAS_PATH.exec(path))) {
                    try {
                        atlasRaw.set(key(m[1], m[2]), JSON.parse(new TextDecoder().decode(entries[path])));
                    } catch {
                        // Malformed atlas json
                    }
                    continue;
                }
            }
        }

        const dimensions: Map<string, TextureDimensions> = new Map();
        textures.forEach((bytes, k) => {
            const size = readPngSize(bytes);
            if (size) dimensions.set(k, size);
        });

        const atlases: Map<string, Map<string, string>> = new Map();
        atlasRaw.forEach((json, atlasKey) => {
            const ns = atlasKey.substring(0, atlasKey.indexOf(":"));
            atlases.set(atlasKey, buildAtlasIndex(ns, json, textures.keys()));
        });

        return new ResourcePacksImpl(textures, dimensions, mcmetaRaw, atlases);
    }

    async function toBytes(source: ResourcePackSource): Promise<Uint8Array> {
        if (source instanceof Uint8Array) return source;
        if (source instanceof ArrayBuffer) return new Uint8Array(source);
        return new Uint8Array(await source.arrayBuffer());
    }

}