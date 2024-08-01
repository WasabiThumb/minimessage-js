
export type ComponentDecoration = "bold" | "italic" | "underlined" | "strikethrough" | "obfuscated";

export type ComponentClickEventAction = "change_page" | "copy_to_clipboard"
    | "open_file" | "open_url" | "run_command" | "suggest_command";
export const ComponentClickEventActions: ComponentClickEventAction[] = [ "change_page", "copy_to_clipboard",
    "open_file", "open_url", "run_command", "suggest_command" ];
export type ComponentClickEvent = {
    action: ComponentClickEventAction,
    value: string
};

export type ComponentHoverEventAction = "show_text" | "show_item" | "show_entity";
export const ComponentHoverEventActions: ComponentHoverEventAction[] = [ "show_text", "show_item", "show_entity" ];
export type ComponentHoverEvent = {
    action: ComponentHoverEventAction,
    contents: string
};

export type ComponentScore = {
    name: string, // e.g. @s or Wasabi_Thumbs
    objective: string
};

export enum ComponentDecorationState {
    UNSET = -1,
    FALSE = 0,
    TRUE = 1
}

/**
 * In the absence of the Adventure API, the Component type is now a shallow structure that mirrors
 * the output of https://webui.advntr.dev/api/mini-to-json
 */
export type IComponent = {
    // Basic
    color?: string,
    extra?: (IComponent | string)[],
    text?: string,
    // Decorations
    bold?: boolean,
    italic?: boolean,
    underlined?: boolean,
    strikethrough?: boolean,
    obfuscated?: boolean
    // Actions
    clickEvent?: ComponentClickEvent,
    hoverEvent?: ComponentHoverEvent,
    // Generators
    keybind?: string,
    translate?: string,
    with?: string[],
    selector?: string, // e.g. @e[limit=5]
    score?: ComponentScore,
    // Misc
    insertion?: string,
    font?: string, // e.g. minecraft:uniform
    // NBT
    nbt?: string, // e.g. Health
    block?: string,
    entity?: string,
    storage?: string,
    interpret?: boolean,
    separator?: string
};

function contentLength(component: IComponent, noChildren: boolean): number {
    let len: number = 0;
    if (typeof component.text === "string") len += component.text.length;
    if (noChildren) return len;
    const extra = component.extra;
    if (!extra) return len;
    for (let sub of extra) {
        if (typeof sub === "string") {
            len += sub.length;
        } else {
            len += contentLength(sub, false);
        }
    }
    return len;
}

export class Component implements IComponent {

    /**
     * Magic symbol used to extract the context (MiniMessage instance) that created this Component.
     * For internal use.
     */
    private static SYMBOL_CONTEXT = Symbol("MiniMessageInstance");

    private static setContextFor(primitive: IComponent, context: object) {
        Object.defineProperty(primitive, this.SYMBOL_CONTEXT, {
            value: context,
            configurable: false,
            enumerable: false,
            writable: false
        });
    }

    private static getContextFor(primitive: IComponent): object | null {
        if (!(this.SYMBOL_CONTEXT in primitive)) return null;
        // @ts-ignore
        return primitive[this.SYMBOL_CONTEXT] as object;
    }

    //

    static text(content: string): Component {
        return new Component({ text: content });
    }

    static empty(): Component {
        return new Component();
    }

    //

    protected primitive: IComponent;
    /**
     * @protected
     */
    constructor(primitive: IComponent = {}) {
        this.primitive = primitive;
    }

    get color(): string | undefined {
        return this.primitive.color;
    }

    set color(value: string | undefined) {
        this.primitive.color = value;
    }

    setColorIfUnset(value: string): void {
        if (!("color" in this.primitive)) this.primitive.color = value;
    }

    setColorByPlacement(fn: (delta: number) => string): void {
        const len = this.contentLength();
        if (len < 2) {
            this.setProperty("color", fn(0));
            return;
        }
        this.setColorByPlacement0(fn, 0, len);
    }

    private setColorByPlacement0(fn: (delta: number) => string, offset: number, totalLength: number): void {
        let children: Component[] = [];
        let sizes: number[] = [];

        if (typeof this.primitive.text === "string" && this.primitive.text.length !== 0) {
            children.push(Component.text(this.primitive.text));
            sizes.push(this.primitive.text.length);
            delete this.primitive["text"];
        }

        const sub = this.primitive.extra;
        if (!!sub) {
            for (let child of sub) {
                if (typeof child === "string") {
                    children.push(Component.text(child));
                    sizes.push(child.length);
                } else {
                    children.push(new Component(child));
                    sizes.push(contentLength(child, false));
                }
            }
        }

        let splitChildren: Component[] = [];

        let child: Component;
        let size: number;
        let head: number = 0;
        for (let i=0; i < children.length; i++) {
            child = children[i];
            size = sizes[i];
            if (size === 0) continue;

            if (child.isOnlyText()) {
                const chars = (child.primitive.text || "").split("");
                let counter: number = 0;
                for (let char of chars) {
                    const charComponent = Component.text(char);
                    charComponent.color = fn((offset + head + (counter++)) / (totalLength - 1));
                    splitChildren.push(charComponent);
                }
            } else {
                if (!("color" in child.primitive)) {
                    child.color = fn((offset + head) / totalLength);
                    child.setColorByPlacement0(fn, offset + head, totalLength);
                }
                splitChildren.push(child);
            }

            head += size;
        }

        this.primitive.extra = splitChildren.map<IComponent>((c) => c.primitive);
    }

    decoration(decoration: ComponentDecoration): ComponentDecorationState {
        const value = this.primitive[decoration];
        if (typeof value === "undefined") return ComponentDecorationState.UNSET;
        return value ? ComponentDecorationState.TRUE : ComponentDecorationState.FALSE;
    }

    decorate(decoration: ComponentDecoration, value: boolean = true): this {
        this.primitive[decoration] = value;
        return this;
    }

    getProperty<K extends keyof IComponent>(key: K): IComponent[K] {
        return this.primitive[key];
    }

    setProperty<K extends keyof IComponent>(key: K, value: IComponent[K]): void {
        this.primitive[key] = value;
    }

    appendChild(child: Component | string): this {
        let toAdd: IComponent | string;
        if (typeof child === "object") {
            if (child.isOnlyText()) {
                if (!child.primitive.text) return this;
                toAdd = child.primitive.text!;
            } else {
                toAdd = child.primitive;
            }
        } else {
            toAdd = child as string;
        }
        if (typeof toAdd === "string" && this.isEmpty()) {
            this.setProperty("text", toAdd);
            return this;
        }
        if (!this.primitive.extra) {
            this.primitive.extra = [toAdd];
        } else {
            this.primitive.extra.push(toAdd);
        }
        return this;
    }

    isEmpty(): boolean {
        return Object.getOwnPropertyNames(this.primitive).length === 0;
    }

    isOnlyText(): boolean {
        let value: any;
        for (let prop of Object.getOwnPropertyNames(this.primitive)) {
            value = this.primitive[prop as unknown as keyof IComponent];
            if (typeof value === "undefined" || typeof value === "function") continue;
            if (prop !== "text") return false;
        }
        return true;
    }

    contentLength(noChildren: boolean = false): number {
        return contentLength(this.primitive, noChildren);
    }

    collapseUnnecessaryEnclosures(): void {
        const props = Object.getOwnPropertyNames(this.primitive);
        if (!(props.length === 1 && props[0] === "extra")) return;
        // We may be an unnecessary enclosure! :O
        const children = this.getProperty("extra")!;
        if (children.length !== 1) return;
        // We are an unecessary enclosure! :O
        const child = children[0];
        if (typeof child === "string") {
            delete this.primitive["extra"];
            this.primitive["text"] = child;
        } else {
            const comp = (new Component(child));
            comp.collapseUnnecessaryEnclosures();
            this.primitive = comp.primitive;
        }
    }

    /** @protected */
    getContext(): object | null {
        return Component.getContextFor(this.primitive);
    }

    /** @protected */
    setContext(context: object): void {
        Component.setContextFor(this.primitive, context);
        const extra = this.getProperty("extra");
        if (!extra) return;
        for (let child of extra) {
            if (typeof child === "object") Component.setContextFor(child, context);
        }
    }

    /**
     * Serializes this Component into the same format as can be found at
     * https://webui.advntr.dev/api/mini-to-json
     */
    toJSON(): IComponent {
        return { ...this.primitive };
    }

}
