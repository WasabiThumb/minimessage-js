import {Component, ComponentDecoration, IComponent} from "./spec";
import {StringBuilder} from "../util/string";
import {ColorTagResolver} from "../tag/impl/color";
import {bindObfuscatedText} from "../font/obf";
import {MiniMessageInstance, CreateElementFn} from "../spec";

// RegExp used to identify lang placeholders
const LANG_PLACEHOLDER_REGEX = /%(%|(?:(\d+)\$)?s)/g;

// Does some polyfills & setup, then returns the result of componentToHTML0
export function componentToHTML(
    context: MiniMessageInstance,
    component: Component,
    output?: HTMLElement,
    createElementFn?: CreateElementFn
): string {
    let doOutput: boolean = false;
    if (typeof output !== "undefined") {
        doOutput = true;
        // Assume we are in browser
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
    componentToHTML0(context, component, sb, doOutput, output!, createElementFn!);
    return sb.toString();
}

// Converts a component to HTML. This is getting kind of big, but there's some room to spare before
// it would make sense to relocate.
function componentToHTML0(
    context: MiniMessageInstance,
    component: Component,
    sb: StringBuilder,
    doOutput: boolean,
    output: HTMLElement,
    createElementFn: CreateElementFn
): void {
    // We're simeltaneously writing the data to the StringBuilder and the HTMLElement.
    // In the case where doOutput is false, all of the calls to HTMLElement are no-op.

    // Start the opening tag.
    const el = createElementFn("span");
    sb.appendLeftAngleBracket().appendString("span");

    // This adds declarations to the style property as appropriate.
    let addedStyleSpace = false;
    parseStyles(component, sb, el, () => {
        if (addedStyleSpace) {
            // Another declaration has already been added
            sb.appendSpace();
        } else {
            // This is the first declaration that has been added
            sb.appendString(" style=\"");
            addedStyleSpace = true;
        }
    });
    // Close the style attribute if it was ever opened
    if (addedStyleSpace) sb.append("\"");

    // This adds the data-mm-XXX attributes to the element.
    parseAttributes(component, sb, el);

    // Close the opening tag.
    sb.appendRightAngleBracket();

    // Add the plain text content. This always comes before anything else.
    // Text that appears after a child will not be contained in this property.
    const text = component.getProperty("text");
    if (!!text) {
        el.innerText = text;
        sb.appendString(text);
    }

    // START Translatables
    const translate = component.getProperty("translate");
    if (!!translate) {
        let substitutions = component.getProperty("with");
        if (typeof substitutions === "undefined") substitutions = [];

        let translated: string = context.translations[translate];
        if (!!translated) {
            // Handle placeholders. This is just speculation, but the Mojang placeholder format seems to work like so:
            // - %%   -> % (escaping)
            // - %s   -> next substitution
            // - %N$s -> Nth substitution (index starting at 1)

            translated = translated.replace(
                LANG_PLACEHOLDER_REGEX,
                (match: string, arg: string, num: string) => {
                    if (arg === "%") return "%";
                    let index: number = 0;
                    if (arg.length > 1) {
                        index = parseInt(num) - 1;
                    }
                    if (index < 0 || index >= substitutions!.length) return match;
                    return substitutions![index];
                }
            );

            // May have contained MiniMessage tags, so parsing again is required.
            // Conveniently we can re-use our StringBuilder.
            const parsed = context.deserialize(translated);
            componentToHTML0(context, parsed, sb, doOutput, el, createElementFn);
        }
    }
    // END Translatables

    // Process children
    const extra = component.getProperty("extra");
    if (!!extra) {
        for (let child of extra) {
            if (typeof child === "string") {
                // Wrap plain text child in a span, because dealing with text nodes is too sad
                const sub = createElementFn("span");
                sub.innerText = child;
                el.appendChild(sub);
                sb.appendString(child);
            } else {
                // Recursion 👻
                componentToHTML0(context, new Component(child), sb, doOutput, el, createElementFn);
            }
        }
    }

    // Add closing tag
    sb.appendString("</span>");

    // If using DOM
    if (doOutput) {
        output.appendChild(el);

        // Visual obfuscation effect if browser is detected
        if (component.getProperty("obfuscated") === true) {
            setTimeout(() => {
                bindObfuscatedText(el, () => {});
            }, 1);
        }
    }
}

// Add data-mm-XXX attrs
function parseAttributes(component: Component, sb: StringBuilder, el: HTMLElement): void {
    // Add single data-mm-XXX attr
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

    // Magic array of attributes to include.
    // Would it maybe be better to specify the few attributes that AREN'T included? :/
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

// Add style declarations, e.g. bold -> style="font-weight: bold"
// The addSpace() method is stateful and described further in the parent function
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

    // How clean! Love this! :)
    withDecoration("bold", "font-weight: bold", "fontWeight", "bold");
    withDecoration("italic", "font-style: italic", "fontStyle", "italic");
    withDecoration("underlined", "text-decoration: underline", "textDecoration", "underline");
    withDecoration("strikethrough", "text-decoration: line-through", "textDecoration", "line-through");

    // Reset decorations if any are explicitly false and none are explicitly true.
    if (anyDecorationExplicitlyFalse && noDecorationExplicitlyTrue) {
        addSpace();
        sb.appendString("font-weight: normal; text-decoration: none; filter: none;");
        el.style.fontWeight = "normal";
        el.style.textDecoration = "none";
    }
}
