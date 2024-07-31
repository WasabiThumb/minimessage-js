import {Component, ComponentDecoration, IComponent} from "./spec";
import {StringBuilder} from "../util/string";
import {ColorTagResolver} from "../tag/impl/color";
import {bindObfuscatedText} from "../font/obf";

export type CreateElementFn = (tagName: "span") => HTMLElement;

export function componentToHTML(component: Component, output?: HTMLElement, createElementFn?: CreateElementFn): string {
    let doOutput: boolean = false;
    if (typeof output !== "undefined") {
        doOutput = true;
        if (typeof createElementFn === "undefined") createElementFn = ((n) => document.createElement(n));
    } else if (typeof createElementFn === "undefined") {
        // mock HTMLElement to make code cleaner
        createElementFn = (() => {
            // noinspection JSUnusedLocalSymbols
            return {
                innerText: "",
                style: {},
                setAttribute(key: string, value: string): void { },
                appendChild(child: any): void { }
            } as unknown as HTMLElement;
        });
    }

    const sb = new StringBuilder();
    componentToHTML0(component, sb, doOutput, output!, createElementFn!);
    return sb.toString();
}

function componentToHTML0(
    component: Component,
    sb: StringBuilder,
    doOutput: boolean,
    output: HTMLElement,
    createElementFn: CreateElementFn
): void {
    const el = createElementFn("span");
    sb.appendLeftAngleBracket()
        .appendString("span")

    let addedStyleSpace = false;
    parseStyles(component, sb, el, () => {
        if (addedStyleSpace) {
            sb.appendSpace();
        } else {
            sb.appendString(" style=\"");
            addedStyleSpace = true;
        }
    });
    if (addedStyleSpace) sb.append("\"");

    parseAttributes(component, sb, el);

    sb.appendRightAngleBracket();

    const text = component.getProperty("text");
    if (!!text) {
        el.innerText = text;
        sb.appendString(text);
    }

    const extra = component.getProperty("extra");
    if (!!extra) {
        for (let child of extra) {
            if (typeof child === "string") {
                const sub = createElementFn("span");
                sub.innerText = child;
                el.appendChild(sub);
                sb.appendString(child);
            } else {
                componentToHTML0(new Component(child), sb, doOutput, el, createElementFn);
            }
        }
    }

    sb.appendString("</span>");
    if (doOutput) {
        output.appendChild(el);

        // Visual effect if browser is detected
        if (component.getProperty("obfuscated") === true) {
            setTimeout(() => {
                bindObfuscatedText(el, console.log);
            }, 1);
        }
    }
}

function parseAttributes(component: Component, sb: StringBuilder, el: HTMLElement): void {
    function withAttribute(key: Exclude<keyof IComponent, "extra">): void {
        const value = component.getProperty(key);
        if (typeof value === "undefined") return;

        // replace uppercase chars with - (ASCII 45) followed by lowercase char
        const attrKey = "data-mm-"
            + key.replace(/[A-Z]/g, (match) => String.fromCharCode(45, match.charCodeAt(0) + 32));

        const json = JSON.stringify(value);
        sb.appendSpace()
            .append(attrKey)
            .append("=\"")
            .append(json.replace(/["']/g, (match) => `\\${match}`))
            .append("\"");
        el.setAttribute(attrKey, json);
    }
    const attrs: Exclude<keyof IComponent, "extra">[] = [
        "obfuscated",
        "clickEvent",
        "hoverEvent",
        "keybind",
        "translate",
        "with",
        "selector",
        "score",
        "insertion",
        "font",
        "nbt",
        "block",
        "entity",
        "storage",
        "interpret",
        "separator"
    ];
    for (let attr of attrs) withAttribute(attr);
}

function parseStyles(component: Component, sb: StringBuilder, el: HTMLElement, addSpace: (() => void)): void {
    let color = component.getProperty("color");
    if (!!color) {
        addSpace();
        color = ColorTagResolver.mapColor(color);
        sb.appendString("color: ").appendString(color).appendSemicolon();
        el.style.color = color;
    }

    let anyDecorationExplicitlyFalse: boolean = false;
    let noDecorationExplicitlyTrue: boolean = true;

    function withDecoration(key: ComponentDecoration, style: string, styleKey: keyof CSSStyleDeclaration, styleValue: string): void {
        const value = component.getProperty(key);
        if (typeof value === "undefined") return;
        if (value) {
            noDecorationExplicitlyTrue = false;
            addSpace();
            sb.appendString(style).appendSemicolon();
            // @ts-ignore
            el.style[styleKey] = styleValue;
        } else {
            anyDecorationExplicitlyFalse = true;
        }
    }

    withDecoration("bold", "font-weight: bold", "fontWeight", "bold");
    withDecoration("italic", "font-style: italic", "fontStyle", "italic");
    withDecoration("underlined", "text-decoration: underline", "textDecoration", "underline");
    withDecoration("strikethrough", "text-decoration: line-through", "textDecoration", "line-through");

    if (anyDecorationExplicitlyFalse && noDecorationExplicitlyTrue) {
        addSpace();
        sb.appendString("font-weight: normal; text-decoration: none; filter: none;");
        el.style.fontWeight = "normal";
        el.style.textDecoration = "none";
    }
}
