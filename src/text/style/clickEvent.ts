import {Key, KeyLike} from "../../key";

export interface ClickEvent<T extends ClickEvent.Payload> {

    action(): ClickEvent.Action<T>;

    payload(): T;

}

/** @internal */
class ClickEventImpl<T extends ClickEvent.Payload> implements ClickEvent<T> {

    private readonly _action: ClickEvent.Action<T>;
    private readonly _payload: T;

    constructor(action: ClickEvent.Action<T>, payload: T) {
        this._action = action;
        this._payload = payload;
    }

    //

    action(): ClickEvent.Action<T> {
        return this._action;
    }

    payload(): T {
        return this._payload;
    }

}

export namespace ClickEvent {

    export function clickEvent<T extends ClickEvent.Payload>(
        action: Action<T>,
        payload: T
    ): ClickEvent<T> {
        return new ClickEventImpl(action, payload);
    }

    export function openUrl(url: string): ClickEvent<Payload.Text> {
        return clickEvent(Action.OPEN_URL, Payload.string(url));
    }

    export function openFile(file: string): ClickEvent<Payload.Text> {
        return clickEvent(Action.OPEN_FILE, Payload.string(file));
    }

    export function runCommand(command: string): ClickEvent<Payload.Text> {
        return clickEvent(Action.RUN_COMMAND, Payload.string(command));
    }

    export function suggestCommand(command: string): ClickEvent<Payload.Text> {
        return clickEvent(Action.SUGGEST_COMMAND, Payload.string(command));
    }

    export function changePage(page: number): ClickEvent<Payload.Int> {
        return clickEvent(Action.CHANGE_PAGE, Payload.integer(page));
    }

    export function copyToClipboard(text: string): ClickEvent<Payload.Text> {
        return clickEvent(Action.COPY_TO_CLIPBOARD, Payload.string(text));
    }

    export function custom(key: KeyLike, nbt: string | null): ClickEvent<Payload.Custom> {
        return clickEvent(Action.CUSTOM, Payload.custom(key, nbt));
    }

    //

    const TYPE_TEXT = "text";
    const TYPE_INT = "int";
    const TYPE_CUSTOM = "custom";

    export type Payload = Payload.Text |
        Payload.Int |
        Payload.Custom;

    export namespace Payload {

        export type Text = {
            readonly type: typeof TYPE_TEXT,
            value(): string
        };

        export type Int = {
            readonly type: typeof TYPE_INT,
            integer(): number
        };

        export type Custom = {
            readonly type: typeof TYPE_CUSTOM,
            key(): Key,
            nbt(): string | null
        };

        //

        export function string(value: string): Text {
            return Object.freeze({
                type: TYPE_TEXT,
                value(): string {
                    return value;
                }
            });
        }

        export function integer(integer: number): Int {
            return Object.freeze({
                type: TYPE_INT,
                integer(): number {
                    return integer;
                }
            });
        }

        export function custom(key: KeyLike, nbt: string | null): Custom {
            const finalKey = Key.key(key);
            return Object.freeze({
                type: TYPE_CUSTOM,
                key(): Key {
                    return finalKey;
                },
                nbt(): string | null {
                    return nbt;
                }
            })
        }

    }

    //

    export interface Action<T extends Payload> {

        readable(): boolean;

        supports(payload: Payload): boolean;

        toString(): string;

    }

    /** @internal */
    class ActionImpl<T extends Payload> implements Action<T> {

        private readonly _name: string;
        private readonly _readable: boolean;
        private readonly _type: Payload["type"];

        constructor(name: string, readable: boolean, type: Payload["type"]) {
            this._name = name;
            this._readable = readable;
            this._type = type;
        }

        //

        readable(): boolean {
            return this._readable;
        }

        supports(payload: Payload): boolean {
            return this._type === payload.type;
        }

        toString(): string {
            return this._name;
        }

    }

    export namespace Action {

        export type OpenUrl = Action<Payload.Text>;
        export type OpenFile = Action<Payload.Text>;
        export type RunCommand = Action<Payload.Text>;
        export type SuggestCommand = Action<Payload.Text>;
        export type ChangePage = Action<Payload.Int>;
        export type CopyToClipboard = Action<Payload.Text>;
        export type Custom = Action<Payload.Custom>;

        export const OPEN_URL: OpenUrl = new ActionImpl("open_url", true, TYPE_TEXT);
        export const OPEN_FILE: OpenFile = new ActionImpl("open_file", false, TYPE_TEXT);
        export const RUN_COMMAND: RunCommand = new ActionImpl("run_command", true, TYPE_TEXT);
        export const SUGGEST_COMMAND: SuggestCommand = new ActionImpl("suggest_command", true, TYPE_TEXT);
        export const CHANGE_PAGE: ChangePage = new ActionImpl("change_page", true, TYPE_INT);
        export const COPY_TO_CLIPBOARD: CopyToClipboard = new ActionImpl("copy_to_clipboard", true, TYPE_TEXT);
        export const CUSTOM: Custom = new ActionImpl("custom", true, TYPE_CUSTOM);

        export const NAMES: Readonly<Record<string, Action<any>>> = ((...actions: Action<any>[]) => {
            const ret: Record<string, Action<any>> = {};
            for (const action of actions) ret[action.toString()] = action;
            return Object.freeze(ret);
        })(
            OPEN_URL,
            OPEN_FILE,
            RUN_COMMAND,
            SUGGEST_COMMAND,
            CHANGE_PAGE,
            COPY_TO_CLIPBOARD,
            CUSTOM
        );

    }

    /** @internal */
    export class Handlers<C, R> {

        private readonly _map: { [k: string]: (event: ClickEvent<any>, context: C) => R };

        constructor() {
            this._map = {};
        }

        //

        register<T extends ClickEvent.Payload>(
            action: ClickEvent.Action<T>,
            handler: (event: ClickEvent<T>, context: C) => R
        ): void {
            this._map[action.toString()] = handler;
        }

        invoke(event: ClickEvent<any>, context: C): R {
            const action = event.action().toString();
            const handler = this._map[action];
            if (!handler) throw new Error(`Unhandled click event action: ${action}`);
            return handler(event, context);
        }

    }

}
