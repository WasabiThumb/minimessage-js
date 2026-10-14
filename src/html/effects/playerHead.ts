import { Key } from "../../key";
import { PlayerHeadObjectContents } from "../../text/object/playerHead";
import { assertObject } from "../../util/assertions";
import { UUID } from "../../util/uuid";
import type { DomEffect } from "../effects";
import { OnlineHeads } from "./playerHead/online";
import { VanillaHeads } from "./playerHead/vanilla";

class PlayerHeadDomEffectImpl implements PlayerHeadDomEffect {
    apply(element: Element, data: PlayerHeadObjectContents): void {
        const tint = this._resolveColor(element);
        const image = this._createImage(data, tint);
        const imageElement = image.element;
        imageElement.style.display = `inline-block`;
        imageElement.style.width = `1em`;
        imageElement.style.height = `1em`;
        imageElement.style.verticalAlign = `-7%`;
        imageElement.style.objectFit = `contain`;
        imageElement.style.objectPosition = `center`;
        imageElement.style.imageRendering = `pixelated`;
        element.appendChild(imageElement);

        // Detect when the image leaves the DOM to destroy the PolyImage
        const observer = new MutationObserver(() => {
            if (imageElement.isConnected) return;
            image.cancel();
            observer.disconnect();
        });
        observer.observe(element, {
            childList: true,
        });
    }

    serialize(data: PlayerHeadObjectContents): string {
        const take = <K extends keyof PlayerHeadObjectContents>(key: K, consumer: (value: Value<K>) => void) => {
            // @ts-ignore
            const value = data[key]();
            if (null === value) return;
            consumer(value as Value<K>);
        };

        const form: SerialForm = {};
        if (!data.hat()) form.hat = false;
        take("id", (id) => (form.id = id));
        take("name", (name) => (form.name = name));
        take("texture", (texture) => (form.texture = texture.asString()));

        return JSON.stringify(form);
    }

    deserialize(value: string): PlayerHeadObjectContents {
        const parsed = JSON.parse(value) as unknown;
        assertObject(parsed);

        const form = parsed as SerialForm;
        const builder = PlayerHeadObjectContents.builder();

        if ("hat" in form) builder.hat(form.hat!);
        if ("id" in form) builder.id(form.id!);
        if ("name" in form) builder.name(form.name!);
        if ("texture" in form) builder.texture(form.texture!);

        return builder.build();
    }

    private _resolveColor(element: Element): string | null {
        const color = window.getComputedStyle(element).color;
        if (!color || `rgb(255, 255, 255)` === color) return null;
        return color;
    }

    private _nameOfTexture(texture: Key): VanillaHeads.Name | null {
        if (texture.namespace() !== Key.MINECRAFT_NAMESPACE) return null;
        const value = texture.value();
        const match = /^entity\/player\/(?:slim|wide)\/(.*)$/.exec(value);
        if (!match || match.length < 2) return null;
        const name = match[1];
        if (!VanillaHeads.checkName(name)) return null;
        return name as VanillaHeads.Name;
    }

    private _createImage(data: PlayerHeadObjectContents, tintColor: string | null): PolyImage {
        const image = new PolyImage(tintColor);

        // Submit the alex head with priority 0
        image.submit(async () => {
            const src = await VanillaHeads.getByName("alex");
            return { src, alt: "", revoke: false };
        }, 0);

        const hat = data.hat();
        const id = data.id();
        const name = data.name();
        const texture = data.texture();

        const withUUID = (uuid: UUID, alt: string) => {
            // Submit the offline head with priority 2
            image.submit(async () => {
                const src = await VanillaHeads.getByUUID(uuid);
                return { src, alt, revoke: false };
            }, 2);

            // Submit the online head with priority 3
            image.submit(async (s) => {
                const src = await OnlineHeads.get(uuid, hat, s);
                if (!src) return null;
                return { src, alt, revoke: true };
            }, 3);
        };

        if (name !== null) {
            // Submit the "UUID from bytes" head with priority 1
            image.submit(async () => {
                const nameBytes = new TextEncoder().encode(name);
                const nameUUID = UUID.nameUUIDFromBytes(nameBytes);
                const src = await VanillaHeads.getByUUID(nameUUID);
                return { src, alt: `${nameUUID.toString()} (${name})`, revoke: false };
            }, 1);

            // Submit the offline & online heads with priorities 2 & 3
            OnlineHeads.lookup(name)
                .then((id) => {
                    if (id) withUUID(id, name);
                })
                .catch((e) => {
                    console.warn(`failed to lookup player name \"${name}\"`, e);
                });
        } else if (id !== null) {
            let uuid: UUID | null = null;
            try {
                uuid = UUID.fromString(id);
            } catch (e) {}
            if (uuid !== null) {
                // Submit the offline & online heads with priorities 2 & 3
                withUUID(uuid, uuid.toString());
            }
        } else if (texture !== null) {
            const name = this._nameOfTexture(texture);
            if (name !== null) {
                // Submit the vanilla head with priority 1
                image.submit(async () => {
                    const src = await VanillaHeads.getByName(name);
                    return { src, alt: texture.asString(), revoke: false };
                }, 1);
            } else {
                // Submit the missing texture with priority 1
                image.submit(
                    () =>
                        Promise.resolve({
                            src: VanillaHeads.MISSING,
                            alt: texture.asString(),
                            revoke: false,
                        }),
                    1,
                );
            }
        }

        return image;
    }
}

export type PlayerHeadDomEffect = DomEffect<PlayerHeadObjectContents>;

export namespace PlayerHeadDomEffect {
    export const TOKEN = "player-head";
    export const INSTANCE: PlayerHeadDomEffect = new PlayerHeadDomEffectImpl();
}

//

type SerialForm = {
    hat?: boolean;
    id?: string;
    name?: string;
    texture?: string;
};

type Value<K extends keyof PlayerHeadObjectContents> = PlayerHeadObjectContents[K] extends (...args: any) => infer R
    ? Exclude<R, null>
    : never;

//

type PolyImageTaskResult = {
    readonly src: string;
    readonly alt: string;
    readonly revoke: boolean;
};

type PolyImagePrioritizedController = {
    readonly controller: AbortController;
    readonly priority: number;
};

class PolyImage {
    readonly element: HTMLImageElement;
    private _activePriority: number;
    private readonly _controllers: PolyImagePrioritizedController[];
    private readonly _tintColor: string | null;

    constructor(tintColor: string | null = null) {
        this.element = document.createElement("img");
        this._activePriority = Number.NEGATIVE_INFINITY;
        this._controllers = [];
        this._tintColor = tintColor;
    }

    submit(task: (signal: AbortSignal) => Promise<PolyImageTaskResult | null>, priority: number): void {
        if (priority <= this._activePriority) return;

        const controller = new AbortController();
        this._controllers.push({ controller, priority });

        (async () => {
            let r = await task(controller.signal);
            if (!r) {
                this._destroyArbitraryController(controller);
                return;
            }
            if (controller.signal.aborted) {
                if (r.revoke) URL.revokeObjectURL(r.src);
                return;
            }
            r = await this._tint(r, controller.signal);
            if (controller.signal.aborted) {
                if (r.revoke) URL.revokeObjectURL(r.src);
                return;
            }
            this._useResult(r, priority, controller);
        })().catch((e) => {
            this._destroyArbitraryController(controller);
            if (`${e}`.indexOf("aborted") !== -1) return;
            console.warn(`failed to process player head image with priority ${priority}`, e);
        });
    }

    cancel(): void {
        this._activePriority = Number.NEGATIVE_INFINITY;
        for (const entry of this._controllers.splice(0)) {
            entry.controller.abort();
        }
    }

    private _useResult(result: PolyImageTaskResult, priority: number, controller: AbortController): void {
        const { element } = this;
        const { src, alt, revoke } = result;
        if (priority <= this._activePriority) {
            if (revoke) URL.revokeObjectURL(src);
            this._destroyArbitraryController(controller);
            return;
        }

        // Abort all other controllers of lesser or equal priority, set active priority
        this._activePriority = priority;
        let head: number = 0;
        while (head < this._controllers.length) {
            const entry = this._controllers[head];
            if (entry.priority > priority || Object.is(entry.controller, controller)) {
                head++;
                continue;
            }
            this._controllers.splice(head, 1);
            entry.controller.abort();
        }

        // Listen for the image to load after property set before revoking
        const onSettled = () => {
            if (revoke) URL.revokeObjectURL(src);
            this._destroyArbitraryController(controller);
        };
        element.addEventListener("load", onSettled, { signal: controller.signal, once: true });
        element.addEventListener("error", onSettled, { signal: controller.signal, once: true });

        // Set element properties
        element.src = src;
        element.alt = alt;
        if (alt.length === 0) {
            element.removeAttribute("title");
        } else {
            element.title = alt;
        }
    }

    private async _tint(v: PolyImageTaskResult, signal: AbortSignal): Promise<PolyImageTaskResult> {
        const color = this._tintColor;
        if (!color) return v;
        const { src, revoke, alt } = v;

        // Load to image
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            const abort = new AbortController();
            img.addEventListener(
                "load",
                () => {
                    abort.abort();
                    resolve();
                },
                { signal: abort.signal, once: true },
            );
            img.addEventListener(
                "error",
                ({ error }) => {
                    if (revoke) URL.revokeObjectURL(src);
                    abort.abort();
                    reject(error);
                },
                { signal: abort.signal, once: true },
            );
            img.src = src;
        });

        if (signal.aborted) {
            if (revoke) URL.revokeObjectURL(src);
            throw new Error("aborted");
        }

        // Create offscreen canvas
        let canvas: OffscreenCanvas;
        try {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            canvas = new OffscreenCanvas(w, h);
            const ctx = canvas.getContext("2d")!;

            // Draw the tinted image
            ctx.drawImage(img, 0, 0);
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = "destination-in";
            ctx.drawImage(img, 0, 0);
        } finally {
            // Revoke the old URL
            if (revoke) URL.revokeObjectURL(src);
        }

        // Create the new URL
        const blob = await canvas.convertToBlob({ type: "image/png" });
        if (signal.aborted) throw new Error("aborted");
        return { src: URL.createObjectURL(blob), revoke: true, alt };
    }

    private _destroyArbitraryController(controller: AbortController): void {
        const idx = this._controllers.findIndex((entry) => Object.is(entry.controller, controller));
        if (idx !== -1) this._controllers.splice(idx, 1);
        controller.abort();
    }
}
