import {DomEffect} from "../effects";
import {JsonComponent} from "../../serializer/json/types";
import {JsonComponentSerializer} from "../../serializer/json";
import {Component} from "../../text/component";

//

class MiscDomEffectImpl implements MiscDomEffect {

    apply(element: Element, data: Component): void {
        // TODO
    }

    serialize(data: Component): string {
        return JSON.stringify(JsonComponentSerializer.json().serialize(data));
    }

    deserialize(value: string): Component {
        const parsed = JSON.parse(value) as unknown;
        return JsonComponentSerializer.json().deserialize(parsed as JsonComponent);
    }

}

export type MiscDomEffect = DomEffect<Component>;

export namespace MiscDomEffect {
    export const TOKEN = "misc";
    export const INSTANCE: MiscDomEffect = new MiscDomEffectImpl();
}
