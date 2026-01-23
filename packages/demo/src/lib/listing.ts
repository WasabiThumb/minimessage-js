import {Operation, type OperationMap} from "./operation.ts";
import {Unit} from "./unit.ts";
import {ArgumentType, type ArgumentTypeMap} from "./argument.ts";
import type {Colors} from "./colors.ts";

//

type Entry = {
    operation: Operation,
    args: Record<string, any>,
    element: HTMLElement
};

type SerializedArgument = {
    type: string,
    version: number,
    value: any
};

type SerializedEntry = {
    operation: string,
    version: number,
    args: Record<string, SerializedArgument>;
};

const locateTemplate = ((container: HTMLElement): HTMLElement => {
    const { children } = container;
    for (let i = 0; i < children.length; i++) {
        const child = children.item(i);
        if (child === null) continue;
        if (!child.hasAttribute("data-template")) continue;
        return child as HTMLElement;
    }
    throw new Error(`Failed to locate template element`);
});

//

export class Listing {

    readonly listing: HTMLElement;
    private readonly _colorsModal: Colors;
    private readonly _template: HTMLElement;
    private readonly _stack: Entry[];
    private readonly _callbacks: ((listing: Listing) => void)[];

    constructor(listing: HTMLElement, colorsModal: Colors) {
        this.listing = listing;
        this._colorsModal = colorsModal;
        this._template = locateTemplate(listing);
        this._stack = [];
        this._callbacks = [];
    }

    //

    get tail(): Unit["type"] {
        if (this._stack.length === 0) return "nothing";
        return this._stack[this._stack.length - 1].operation.provides;
    }

    resolve(): Unit {
        let ret: Unit = Unit.nothing();
        for (let i = 0; i < this._stack.length; i++) {
            const { operation, args } = this._stack[i];
            try {
                ret = operation.execute(ret, args);
            } catch (e) {
                console.warn(e);
                return Unit.error(operation.id, i, e);
            }
        }
        return ret;
    }

    add<A extends Record<string, any>>(operation: Operation<any, any, A>, initialArgs?: Partial<A>): void {
        const tail = this.tail;
        const accepts = operation.accepts;
        if (tail !== accepts) throw new Error(`Mismatched operation (accepts ${accepts}, providing ${tail})`);

        const args: Record<string, any> = {};
        if (initialArgs) Object.assign(args, initialArgs);
        const element = this._createElement(operation, args);
        this._stack.push({ operation, args, element });
        this._fixButtons();
        this._update();

    }

    remove(): void {
        if (this._stack.length === 0) return;
        const removed = this._stack.splice(this._stack.length - 1, 1)[0];
        removed.element.remove();
        this._fixButtons();
        this._update();
    }

    onUpdate(callback: (listing: Listing) => void): void {
        this._callbacks.push(callback);
    }

    read(data: any): void {
        if (!Array.isArray(data)) throw new Error(`Data is not an array`);
        const input = data as unknown as SerializedEntry[];

        const removed = this._stack.splice(0, this._stack.length);
        for (const entry of removed) entry.element.remove();

        try {
            for (const serializedEntry of input) {
                const operation = Operation.get(serializedEntry.operation as keyof OperationMap);
                if (operation.version !== serializedEntry.version) throw new Error(`Operation version mismatch`);

                const args: Record<string, any> = {};
                for (const key of Object.keys(serializedEntry.args)) {
                    const arg = serializedEntry.args[key];
                    const argType = ArgumentType.get(arg.type as keyof ArgumentTypeMap);
                    if (argType.version !== arg.version) throw new Error(`Argument version mismatch`);
                    args[key] = argType.deserialize(arg.value);
                }

                const element = this._createElement(operation, args);
                const entry: Entry = {
                    element,
                    operation,
                    args
                };
                this._stack.push(entry);
            }
        } finally {
            this._fixButtons();
            this._update();
        }
    }

    write(): SerializedEntry[] {
        const ret: SerializedEntry[] = new Array(this._stack.length);
        let head: number = 0;

        for (const entry of this._stack) {
            const serializedArgs: Record<string, SerializedArgument> = { };
            const args = entry.operation.arguments;
            for (const key of Object.keys(args)) {
                const arg = args[key];
                // @ts-ignore
                const serializedValue = arg.type.serialize(entry.args[key]);
                serializedArgs[key] = {
                    type: arg.type.id,
                    version: arg.type.version,
                    value: serializedValue
                };
            }

            ret[head++] = {
                operation: entry.operation.id,
                version: entry.operation.version,
                args: serializedArgs
            };
        }

        ret.length = head;
        return ret;
    }

    private _update(): void {
        for (const callback of this._callbacks) {
            try {
                callback(this);
            } catch (e) {
                console.warn(`Failed to invoke update callback`, e);
            }
        }
    }

    private _fixButtons(): void {
        for (let i = 0; i < this._stack.length; i++) {
            const { element } = this._stack[i];
            const button = element.querySelector(`[data-role="remove"]`)! as HTMLButtonElement;
            button.disabled = (i !== this._stack.length - 1);
        }
    }

    private _createElement(operation: Operation, args: Record<string, any>): HTMLElement {
        const element = this._template.cloneNode(true) as HTMLElement;
        element.removeAttribute("data-template");
        (element.querySelector(`[data-role="title"]`)! as HTMLElement).innerText = operation.name;
        element.querySelector(`[data-role="remove"]`)!.addEventListener("click", () => {
            this.remove();
        });

        const argsSpec = operation.arguments;
        const argsContainer = element.querySelector(`[data-role="args"]`)! as HTMLElement;

        for (const argKey of Object.keys(argsSpec)) {
            const argSpec = argsSpec[argKey];
            const argType = argSpec.type.id;
            if (!(argKey in args)) args[argKey] = argSpec.defaultValue;

            const argElementTemplate = argsContainer.querySelector(`[data-template][data-arg="${argType}"]`);
            if (!argElementTemplate) throw new Error(`No template found for argument type '${argType}'}`);

            const argElement = argElementTemplate.cloneNode(true) as HTMLElement;
            argElement.removeAttribute("data-template");
            argsContainer.append(argElement);

            const argElementName = argElement.querySelector(`[data-role="name"]`)! as HTMLElement;
            argElementName.innerText = `${argSpec.description.toUpperCase()}`;

            const argElementValue = argElement.querySelector(`[data-role="value"]`)! as HTMLElement;
            let updateArgs: (() => void);
            switch (argType) {
                case "text":
                    const area = argElementValue as HTMLTextAreaElement;
                    area.value = `${args[argKey]}`;
                    updateArgs = (() => {
                        args[argKey] = area.value;
                    });
                    const widgets = argElement.querySelector(`[data-role="widgets"]`)! as HTMLElement;
                    this._bindWidgets(area, widgets);
                    break;
                case "bool":
                    const input = argElementValue as HTMLInputElement;
                    input.checked = !!args[argKey];
                    updateArgs = (() => {
                        args[argKey] = input.checked;
                    });
                    break;
                default:
                    this._unhandledArgumentType(argType);
            }

            argElementValue.addEventListener("change", () => {
                updateArgs();
                this._update();
            });
            argElementValue.addEventListener("keyup", () => {
                updateArgs();
                this._update();
            });
        }

        this.listing.append(element);
        return element;
    }

    private _bindWidgets(text: HTMLTextAreaElement, widgets: HTMLElement): void {
        this._bindTagWidget(text, widgets.querySelector(`[data-widget="bold"]`), "b");
        this._bindTagWidget(text, widgets.querySelector(`[data-widget="italic"]`), "i");
        this._bindTagWidget(text, widgets.querySelector(`[data-widget="underline"]`), "u");
        this._bindTagWidget(text, widgets.querySelector(`[data-widget="strikethrough"]`), "st");
        this._bindTagWidget(text, widgets.querySelector(`[data-widget="obfuscate"]`), "obf");

        const colors = widgets.querySelector<HTMLElement>(`[data-widget="colors"]`);
        if (!colors) return;
        colors.addEventListener("click", () => {
            const rect = colors.getBoundingClientRect();
            const modal = this._colorsModal;
            const handle = modal.popup(rect.left + rect.width / 2, rect.bottom);

            handle.on("color", (event) => {
                this._insertTag(text, event.color);
            });
            handle.on("shadowColor", (event) => {
                this._insertTag(text, `shadow:${event.color}`);
            });
            handle.on("gradient", (event) => {
                this._insertTag(text, `gradient:${event.colors.join(":")}`);
            });
        });
    }

    private _bindTagWidget(text: HTMLTextAreaElement, widget: HTMLElement | null, tag: string): void {
        if (!widget) return;
        widget.addEventListener("click", () => {
            this._insertTag(text, tag);
        });
    }

    private _insertTag(text: HTMLTextAreaElement, tag: string) {
        const { selectionStart, selectionEnd, value } = text;

        if ("execCommand" in document) {
            text.focus();
            if (selectionStart === selectionEnd) {
                text.setSelectionRange(value.length, value.length);
                // noinspection JSDeprecatedSymbols
                document.execCommand("insertText", false, `<${tag}></${tag}>`);
                const n = value.length + tag.length + 2;
                text.setSelectionRange(n, n);
            } else {
                // noinspection JSDeprecatedSymbols
                document.execCommand(
                    "insertText",
                    false,
                    `<${tag}>${value.substring(selectionStart, selectionEnd)}</${tag}>`
                );
                text.setSelectionRange(
                    selectionStart + tag.length + 2,
                    selectionEnd + tag.length + 2
                );
            }
        } else {
            let newValue: string;
            let newStart: number;
            let newEnd: number;

            if (selectionStart === selectionEnd) {
                newValue = value;
                newValue += `<${tag}>`;
                newStart = newEnd = newValue.length;
                newValue += value;
                newValue += `</${tag}>`;
            } else {
                newValue = value.substring(0, selectionStart);
                newValue += `<${tag}>`;
                newStart = newValue.length;
                newValue += value.substring(selectionStart, selectionEnd);
                newEnd = newValue.length;
                newValue += `</${tag}>`;
                newValue += value.substring(selectionEnd, value.length);
            }

            text.value = newValue;
            text.focus();
            text.setSelectionRange(newStart, newEnd);
        }

        text.dispatchEvent(new Event("change"));
    }

    private _unhandledArgumentType(argumentType: never) {
        throw new Error(`Unhandled argument type: '${argumentType}'`);
    }

}
