import {UUID} from "../../../util/uuid";
import {SharedCanvas} from "./canvas";

//

/** @internal */
export namespace VanillaHeads {

    /**
     * Provides a map relating
     * vanilla skin names to their
     * "ordinal", which is used for
     * some lookups.
     */
    const NAMES = (<K extends string>(...keys: K[]): { readonly [key in K]: number } => {
        const ret: Record<string, number> = {};
        let head: number = 0;
        for (const key of keys) {
            const index = head++;
            Object.defineProperty(ret, key, {
                value: index,
                writable: false,
                configurable: false,
                enumerable: true
            });
        }
        return ret as Record<K, number>;
    })(
        "alex",
        "ari",
        "efe",
        "kai",
        "makena",
        "noor",
        "steve",
        "sunny",
        "zuri"
    );

    /**
     * Number of names
     */
    const NAME_COUNT = Object.keys(NAMES).length;

    /**
     * Name of a vanilla default skin, e.g. "alex" or "steve".
     */
    export type Name = keyof typeof NAMES;

    /**
     * Provides an OffscreenCanvas containing
     * every vanilla player head.
     */
    const getAtlas = ((source: string) => {
        const load = (async (base64: string) => {
            const binaryString = atob(base64);
            const u8 = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) u8[i] = binaryString.charCodeAt(i);
            const blob = new Blob([ u8.buffer ], { type: "image/bmp" });
            const bitmap = await createImageBitmap(blob);
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext("bitmaprenderer")!;
            ctx.transferFromImageBitmap(bitmap);
            return canvas;
        });

        const S_UNLOADED = 0;
        const S_LOADING = 1;
        const S_LOADED = 2;

        type State = { id: typeof S_UNLOADED, source: string } |
            { id: typeof S_LOADING, promise: Promise<OffscreenCanvas> } |
            { id: typeof S_LOADED, canvas: OffscreenCanvas };

        let state: State = { id: S_UNLOADED, source };

        return (async (): Promise<OffscreenCanvas> => {
            const { id } = state;
            switch (id) {
                case S_UNLOADED:
                    const promise = load(state.source);
                    state = { id: S_LOADING, promise };
                    promise.then((result) => {
                        state = { id: S_LOADED, canvas: result };
                    });
                    return promise;
                case S_LOADING:
                    return state.promise;
                case S_LOADED:
                    return Promise.resolve(state.canvas);
            }
        });
    })(`Qk3uAwAAAAAAAK4BAAAoAAAASAAAAAgAAAABAAgAAAAAAEACAAAjLgAAIy4AAF4AAABeAAAAAAAAAAEEDgADAyQADgofABEOHgANERsAFhImABEWIgAIGCQAABguAA4YLgAeGTIADx4qAA0eKwAiIiIAER44AAodQgACHkEAGCIwABEkMwASJTQAGyg4ABAlSQAVKj8ALy8vAB0sWAAoNUQAODg4ADQraQAgNFkAEjCAACk+XwAnO3MAiT1SABg3hwAoPHUAMEBqADRFWgBJSUkAaT9mACBDdwA1QncAMEhtAB4/kwAkYiMAMUeRACJFnQA3U34Afk94ADlTgQBTZ0MAP1mQAIlYgQA6VqkAPl6PAI5chgA+YJQAQ1ynAEljmwCUYooATGeSAEBopABJaKYAnGmTAJ5rlQBKZ7kATHKrAFlyqgCpc5wAP3LBAF55swBbec0Aa4O3AEuE2ABhf+UATojOAG6B8QA/jeUAWJbfAD+Y6wBuk/EAX5/yAFio8wCGp/kAbbroALG77wCixN8AxsvTALDQ6wC/2u8AiuL7AJHt+wCq9PwA////AFhZWVlZWVhWUFNTU1NTU1A7QkJCQkJCO1tbTk5OTltbDBUaGhoaFQwtOUFBQUE5LTgxEBYQFjE2RUlRUVFRSUUfKi8vLy8qH1lZWVVVWVlYU1NTSkpTU1NAPkIoKEI+RFtOTigoTk5bFRoaEhIaGhU5QUEgIEFBOTM2FikpEDYxSVFRKChRUUkvLy8jIy8vKllZWVlZWVlZTExTU1NTTExAQkJCQkJCQFxOTk5OTk5bJRoaGhoaGiVBQUFBQUFBQTpDQyQkQ0M6UVFRUVFRUVE8Ly8vLy8vPFhdLFlZLF1YIl0CU1MCXSI7XRxCQhxdO1xdMk5OMl1cGlcJGhoJVxo1XRlBQRldNUNdIUM6IV1DSV0ASUkAXUkvXREvLxFdKk9PTVhZWFhNK1NTU1NTUys3PUJCQkJCNFtLTk5OTk5cFRoaGhoaGhVBNTVBQTU1QTpDRkZDQ0M6DhgbDhgYGA4vLy8vLy8vL09NT01WVk1PK1BTU1NTUCs7ND1COzA9O1tbW1tLTk5cBgsVBgMaFQY5QUdBQUFBOQ06RkhGQzoUGBgmGBsbGBgqLy8vLy8vKk9STU9NTU9SIitKUFBKKx43ND80OzsnO1taW1tbVFRbCwYLAxoaCwsPOUE5QTlBDwgTExcXExcTGBsmGyYYGxgBHyovLyofAU1ST1JNT1JNHi4rK0oiKyI3OztAOzswO1tbWltbW1tbBgMLCwQGCwYKDwodCg8KDxMTFxcXFxMNGBsYGyYYGxgBAQUHBwUBAQ==`);

    /**
     * Provides an object URL containing an
     * image of the specified head, identified
     * by that head's ordinal.
     */
    const getByOrdinal = (() => {
        const workspace = new SharedCanvas(8, 8);
        const cache: (null | string | Promise<string>)[] = new Array(NAME_COUNT);
        cache.fill(null);

        return (async (ordinal: number) => {
            ordinal = Math.trunc(ordinal);
            if (ordinal < 0 || ordinal >= NAME_COUNT) throw new Error(`Illegal ordinal '${ordinal}'`);

            const existing = cache[ordinal];
            if (existing !== null) return existing;

            const promise: Promise<string> = (async () => {
                const atlas = await getAtlas();
                const blob = await workspace.use((canvas, context) => {
                    context.imageSmoothingEnabled = false;
                    context.drawImage(
                        atlas,
                        ordinal * 8, 0,
                        8, 8,
                        0, 0,
                        8, 8
                    );
                    return canvas.convertToBlob({ type: "image/bmp" });
                });
                return URL.createObjectURL(blob);
            })();

            cache[ordinal] = promise;
            promise.then((value) => {
                cache[ordinal] = value;
            });
            return promise;
        });
    })();

    /**
     * Provides an object URL containing the 8x8 head image
     * of the vanilla skin matching the given UUID.
     * This does not perform online resolution- it determines
     * the fallback skin for this UUID.
     */
    export function getByUUID(uuid: UUID): Promise<string> {
        const [ i0, i1, i2, i3 ] = uuid.toArray();
        const hash = i0 ^ i1 ^ i2 ^ i3;
        const index = ((hash % NAME_COUNT) + NAME_COUNT) % NAME_COUNT;
        return getByOrdinal(index);
    }

    /**
     * Provides an object URL containing the 8x8 head image
     * of the named vanilla skin.
     */
    export function getByName(name: Name): Promise<string> {
        return getByOrdinal(NAMES[name]);
    }

    /**
     * Reports whether a given string is a
     * known vanilla skin name.
     */
    export function checkName<T extends string>(name: T): T extends Name ? true : false {
        // @ts-ignore
        return name in NAMES;
    }

    /**
     * Solid color image, approximating what
     * the client renders when a texture
     * cannot be found.
     */
    export const MISSING = `data:image/gif;base64,R0lGODdhAQABAIABAPUA9VdXVywAAAAAAQABAAACAkQBADs=`;

}
