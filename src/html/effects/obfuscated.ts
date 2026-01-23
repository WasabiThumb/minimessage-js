import type {DomEffect} from "../effects";
import {ObfuscatedFont} from "./obfuscated/font";
import {Character} from "../../util/char";

//

class ObfuscatedDomEffectImpl implements ObfuscatedDomEffect {

    apply(element: Element, data: boolean): void {
        if (data) {
            ObfuscatedFont.inject()
                .then(() => this._applyTrue(element as HTMLElement));
        } else {
            this._applyFalse(element as HTMLElement);
        }
    }

    serialize(data: boolean): string {
        return data ? "true" : "false";
    }

    deserialize(value: string): boolean {
        return "true" === value;
    }

    //

    private _applyTrue(element: HTMLElement): void {
        // Set the font
        element.style.fontFamily = ObfuscatedFont.FAMILY;

        // Animate characters
        const fragments: Fragment[] = [];
        for (const node of element.childNodes) {
            if (node.nodeType !== Node.TEXT_NODE) continue;
            const content = node.textContent;
            if (content === null || content.length === 0) continue;
            const factory = new TextFactory(content);
            fragments.push(new Fragment(node, factory));
        }

        let last: number = window.performance.now();
        const frame = (() => {
            const now = window.performance.now();
            const elapsed = now - last;
            let ok: boolean;

            if (elapsed >= 20) {
                last = now;
                ok = false;

                for (const fragment of fragments) {
                    ok ||= fragment.render();
                }
            } else {
                ok = true;
            }

            if (ok) {
                window.requestAnimationFrame(frame);
            }
        });
        window.requestAnimationFrame(frame);
    }

    private _applyFalse(element: HTMLElement): void {
        let family: string = `sans-serif`;
        let parent: HTMLElement | null = element.parentElement;
        let next: boolean = false;
        while (parent !== null) {
            if ("true" === parent.getAttribute(`data-mm-${ObfuscatedDomEffect.TOKEN}`)) {
                next = true;
            } else if (next) {
                family = window.getComputedStyle(parent).fontFamily;
                break;
            }
            parent = parent.parentElement;
        }
        element.style.fontFamily = family;
    }

}

export type ObfuscatedDomEffect = DomEffect<boolean>;

export namespace ObfuscatedDomEffect {
    export const TOKEN = "obfuscated";
    export const INSTANCE: ObfuscatedDomEffect = new ObfuscatedDomEffectImpl();
}


//

class Fragment {

    constructor(
        readonly node: Node,
        readonly factory: TextFactory
    ) { }

    //

    render(): boolean {
        if (this.node.isConnected) {
            this.node.textContent = this.factory.generate();
            return true;
        } else {
            return false;
        }
    }

}

class TextFactory {

    private readonly _buf: Uint8Array;

    constructor(text: string) {
        const length = text.length;
        const buf = new Uint8Array(length);
        for (let i = 0; i < text.length; i++) {
            buf[i] = text.charCodeAt(i);
        }
        this._buf = buf;
    }

    //

    generate(): string {
        const la = Character.LOWERCASE_A.value;
        const f = Character.LOWERCASE_Z.value - la + 1;
        let c: number;
        for (let i = 0; i < this._buf.length; i++) {
            c = this._buf[i];
            if (Character.SPACE.is(c)) continue;
            c = Math.floor(Math.random() * f) + la;
            this._buf[i] = c;
        }
        return String.fromCharCode.apply(null, this._buf as unknown as number[]);
    }

}