import type {DomEffect} from "../effects";
import {PlayerHeadObjectContents} from "../../text/object/playerHead";
import {assertObject} from "../../util/assertions";
import {VanillaHeads} from "./playerHead/vanilla";
import {UUID} from "../../util/uuid";
import {OnlineHeads} from "./playerHead/online";
import {ErrorInfo} from "../../util/errors";
import {Key} from "../../key";

//

class PlayerHeadDomEffectImpl implements PlayerHeadDomEffect {

    apply(element: Element, data: PlayerHeadObjectContents): void {
        const image = this._createImage(data);
        image.style.display = `inline-block`;
        image.style.width = `1em`;
        image.style.height = `1em`;
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

    private _nameOfTexture(texture: Key): VanillaHeads.Name | null {
        if (texture.namespace() !== Key.MINECRAFT_NAMESPACE) return null;
        const value = texture.value();
        const match = /^entity\/player\/(?:slim|wide)\/(.*)$/.exec(value);
        if (!match || match.length < 2) return null;
        const name = match[1];
        if (!VanillaHeads.checkName(name)) return null;
        return name as VanillaHeads.Name;
    }

    private _createImage(data: PlayerHeadObjectContents): HTMLImageElement {
        const image = new PolyImage();
        image.submit(VanillaHeads.getByName("alex"), ``, 0);

        const hat = data.hat();
        const id = data.id();
        const name = data.name();
        const texture = data.texture();

        const withUUID = ((uuid: UUID, alt: string) => {
            image.submit(VanillaHeads.getByUUID(uuid), alt, 1);
            OnlineHeads.get(uuid, hat)
                .then((url) => {
                    if (url !== null) image.submit(url, alt, 2);
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
                withUUID(nameUUID, `${nameUUID.toString()} (${name})`);
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

//

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

    constructor() {
        this.element = document.createElement("img");
        this._activePriority = Number.MIN_VALUE;
    }

    //

    submit(src: string | Promise<string>, alt: string, priority: number): void {
        (async () => {
            return src;
        })().then((s) => {
            if (priority <= this._activePriority) return;
            this.element.src = s;
            this.element.alt = alt;
            if (alt.length !== 0) this.element.title = alt;
            this._activePriority = priority;
        });
    }

}
