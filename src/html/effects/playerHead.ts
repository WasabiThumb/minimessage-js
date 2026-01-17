import type {DomEffect} from "../effects";
import {PlayerHeadObjectContents} from "../../text/object/playerHead";
import {assertObject} from "../../util/assertions";

//

class PlayerHeadDomEffectImpl implements PlayerHeadDomEffect {

    apply(element: Element, data: PlayerHeadObjectContents): void {
        // TODO
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
