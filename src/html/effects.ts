import {ObfuscatedDomEffect} from "./effects/obfuscated";
import {HtmlWriter} from "./writer";
import {ErrorInfo} from "../util/errors";
import {PlayerHeadDomEffect} from "./effects/playerHead";
import {ShadowDomEffect} from "./effects/shadow";
import {Character} from "../util/char";
import {type MiniMessage} from "../mini";
import {MiscDomEffect} from "./effects/misc";
import {SpriteDomEffect} from "./effects/sprite";

//

export interface DomEffect<D> {

    apply(element: Element, data: D, instance: MiniMessage): void;

    serialize(data: D): string;

    deserialize(value: string): D;

}

export type DomEffectMap = {
    [ObfuscatedDomEffect.TOKEN]: ObfuscatedDomEffect,
    [PlayerHeadDomEffect.TOKEN]: PlayerHeadDomEffect,
    [ShadowDomEffect.TOKEN]: ShadowDomEffect,
    [MiscDomEffect.TOKEN]: MiscDomEffect,
    [SpriteDomEffect.TOKEN]: SpriteDomEffect,
};

//

export namespace DomEffects {

    const PROPERTY_PREFIX = "data-mm-";
    const APPLIED = `${PROPERTY_PREFIX}applied`;
    const MAP: DomEffectMap = {
        [ObfuscatedDomEffect.TOKEN]: ObfuscatedDomEffect.INSTANCE,
        [PlayerHeadDomEffect.TOKEN]: PlayerHeadDomEffect.INSTANCE,
        [ShadowDomEffect.TOKEN]: ShadowDomEffect.INSTANCE,
        [MiscDomEffect.TOKEN]: MiscDomEffect.INSTANCE,
        [SpriteDomEffect.TOKEN]: SpriteDomEffect.INSTANCE,
    };

    export function writeProperty<K extends keyof DomEffectMap>(
        writer: HtmlWriter,
        token: K,
        value: DomEffectMap[K] extends DomEffect<infer D> ? D : never
    ) {
        const effect = MAP[token];
        if (!effect) throw new Error(`Invalid effect '${token}'`);
        // @ts-ignore
        const serialized = effect.serialize(value);
        writer.property(`${PROPERTY_PREFIX}${token}`, serialized);
    }

    function markApplied(key: string, element: Element): boolean {
        let applied = element.getAttribute(APPLIED);
        if (!applied) {
            element.setAttribute(APPLIED, key);
            return true;
        }

        let head: number = 0;
        let char: number;

        for (let i = 0; i < applied.length; i++) {
            char = applied.charCodeAt(i);
            if (Character.COMMA.is(char)) {
                head = 0;
            } else if (head !== -1 && head < key.length) {
                if (char === key.charCodeAt(head++)) {
                    // Already applied
                    if (head === key.length) return false;
                } else {
                    head = -1;
                }
            }
        }

        element.setAttribute(APPLIED, `${applied},${key}`);
        return true;
    }

    function applySingle0<D, E extends DomEffect<D>>(
        instance: MiniMessage,
        key: string,
        effect: E,
        element: Element,
        propertyValue: string
    ) {
        try {
            const value: D = effect.deserialize(propertyValue);
            effect.apply(element, value, instance);
        } catch (e) {
            const inf = ErrorInfo.of(e);
            console.warn(`Failed to apply DOM effect '${key}' to element due to ${inf.name} (${inf.message})`, element);
            return;
        }
    }

    function applySingle<K extends keyof DomEffectMap>(
        instance: MiniMessage,
        key: K,
        effect: DomEffectMap[K],
        node: ParentNode,
        propertyValue: string | null
    ) {
        const children = [ ...node.children ];
        let effectivePropertyValue: string | null = propertyValue;

        if (node instanceof Element) {
            const ownPropertyValue = node.getAttribute(`${PROPERTY_PREFIX}${key}`);
            if (ownPropertyValue !== null) effectivePropertyValue = ownPropertyValue;
            if (effectivePropertyValue !== null && markApplied(key, node))
                applySingle0(instance, key, effect, node, effectivePropertyValue);
        }

        for (const child of children)
            applySingle(instance, key, effect, child, effectivePropertyValue);
    }

    export function apply(instance: MiniMessage, node: ParentNode) {
        for (const rawKey of Object.keys(MAP)) {
            const key = rawKey as keyof DomEffectMap;
            applySingle(instance, key, MAP[key], node, null);
        }
    }

}
