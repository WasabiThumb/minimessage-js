import type {DomEffect} from "../effects";
import {PlayerHeadObjectContents} from "../../text/object/playerHead";
import {assertObject} from "../../util/assertions";
import {VanillaHeads} from "./playerHead/vanilla";
import {UUID} from "../../util/uuid";
import {OnlineHeads} from "./playerHead/online";
import {ErrorInfo} from "../../util/errors";
import {Key} from "../../key";

class PlayerHeadDomEffectImpl implements PlayerHeadDomEffect {

    apply(element: Element, data: PlayerHeadObjectContents): void {
        const tint = this._resolveColor(element);
        const image = this._createImage(data, tint);


        image.style.display = `inline-block`;
        image.style.width = `1em`;
        image.style.height = `1em`;
        image.style.verticalAlign = `-7%`;
        image.style.objectFit = `contain`;
        image.style.objectPosition = `center`;
        image.style.imageRendering = `pixelated`;
        element.appendChild(image);
    }

    serialize(data: PlayerHeadObjectContents): string {
        const take = (<K extends keyof PlayerHeadObjectContents>(
            key: K,
            consumer: (value: Value<K>) => void
        ) => {
            // @ts-ignore
            const value = data[key]();
            if (null === value) return;
            consumer(value as Value<K>);
        });

        const form: SerialForm = {};
        if (!data.hat()) form.hat = false;
        take("id", (id) => form.id = id);
        take("name", (name) => form.name = name);
        take("texture", (texture) => form.texture = texture.asString());

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
        let current: Element | null = element;
        while (current !== null) {
            const color = (current as HTMLElement).style?.color;
            if (color) return color;
            current = current.parentElement;
        }
        return null;
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

    private _createImage(data: PlayerHeadObjectContents, tintColor: string | null): HTMLImageElement {
        const image = new PolyImage(tintColor);
        image.submit(VanillaHeads.getByName("alex"), ``, 0);

        const hat = data.hat();
        const id = data.id();
        const name = data.name();
        const texture = data.texture();

        const withUUID = ((uuid: UUID, alt: string) => {
            image.submit(VanillaHeads.getByUUID(uuid), alt, 1);
            OnlineHeads.get(uuid, hat)
                .then((url) => {
                    if (url !== null) image.submit(url, alt, 2, true);
                })
                .catch((e) => {
                    const inf = ErrorInfo.of(e);
                    console.warn(`Failed to check online head for UUID ${uuid} due to ${inf.name} (${inf.message})`);
                });
        });

        if (name !== null) {
            const fallback = (() => {
                const nameBytes = (new TextEncoder()).encode(name);
                const nameUUID = UUID.nameUUIDFromBytes(nameBytes);
                image.submit(VanillaHeads.getByUUID(nameUUID), `${nameUUID.toString()} (${name})`, 1);
            });
            OnlineHeads.lookup(name)
                .then((id) => {
                    if (id !== null) {
                        withUUID(id, name);
                    } else {
                        fallback();
                    }
                })
                .catch((e) => {
                    const inf = ErrorInfo.of(e);
                    console.warn(`Failed to lookup player name '${name}' due to ${inf.name} (${inf.message})`);
                    fallback();
                });
        } else if (id !== null) {
            let uuid: UUID | null = null;
            try {
                uuid = UUID.fromString(id);
            } catch (e) { }
            if (uuid !== null) {
                withUUID(uuid, `${uuid.toString()}`);
            }
        } else if (texture !== null) {
            const name = this._nameOfTexture(texture);
            if (name !== null) {
                image.submit(VanillaHeads.getByName(name), texture.asString(), 1);
            } else {
                image.submit(VanillaHeads.MISSING, texture.asString(), 1);
            }
        }

        return image.element;
    }

}

export type PlayerHeadDomEffect = DomEffect<PlayerHeadObjectContents>;

export namespace PlayerHeadDomEffect {
    export const TOKEN = "player-head";
    export const INSTANCE: PlayerHeadDomEffect = new PlayerHeadDomEffectImpl();
}

type SerialForm = {
    hat?: boolean,
    id?: string,
    name?: string,
    texture?: string
};

type Value<K extends keyof PlayerHeadObjectContents> = PlayerHeadObjectContents[K] extends (...args: any) => infer R ?
    Exclude<R, null> : never;

class PolyImage {

    readonly element: HTMLImageElement;
    private _activePriority: number;
    private _lastController: AbortController | null;
    private _tintColor: string | null;
    private _tintedUrl: string | null;

    constructor(tintColor: string | null = null) {
        this.element = document.createElement("img");
        this._activePriority = Number.MIN_VALUE;
        this._lastController = null;
        this._tintColor = tintColor;
        this._tintedUrl = null;

        if (tintColor !== null) {
            this.element.addEventListener("load", () => {
                if (this.element.src === this._tintedUrl) return;
                this._applyTint(this.element, tintColor);
            });
        }
    }

    submit(
        src: string | Promise<string>,
        alt: string,
        priority: number,
        revoke: boolean = false
    ): void {
        (async () => src)().then((s) => {
            this._submitNow(s, alt, priority, revoke);
        });
    }

    private _submitNow(src: string, alt: string, priority: number, revoke: boolean): void {
        if (priority <= this._activePriority) {
            if (revoke) URL.revokeObjectURL(src);
            return;
        }
        this._activePriority = priority;
        this._resetController();

        const { element } = this;
        const abort = new AbortController();
        this._lastController = abort;

        const onSettled = (() => {
            this._resetController();
            if (revoke) URL.revokeObjectURL(src);
        });

        element.addEventListener("load", onSettled, { signal: abort.signal, once: true });
        element.addEventListener("error", onSettled, { signal: abort.signal, once: true });

        element.src = src;
        element.alt = alt;
        if (alt.length === 0) {
            element.removeAttribute("title");
        } else {
            element.title = alt;
        }
    }

    private _applyTint(element: HTMLImageElement, tintColor: string): void {
        const canvas = document.createElement("canvas");
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;

        const ctx = canvas.getContext("2d")!;

        ctx.drawImage(element, 0, 0);

        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(element, 0, 0);

        canvas.toBlob((blob: Blob | null) => {
            if (blob === null) return;
            const oldTintedUrl = this._tintedUrl;
            const url = URL.createObjectURL(blob);
            this._tintedUrl = url;
            if (oldTintedUrl !== null) URL.revokeObjectURL(oldTintedUrl);
            element.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
            element.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
            element.src = url;
        });
    }

    private _resetController(): void {
        const last = this._lastController;
        if (last !== null) last.abort();
        this._lastController = null;
    }
}