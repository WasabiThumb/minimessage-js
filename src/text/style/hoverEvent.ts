import {ComponentRenderer} from "../renderer";
import {Component} from "../component";

//

export interface HoverEvent<V> {

    action(): HoverEvent.Action<V>;

    value(): V;

    value(value: V): HoverEvent<V>;

    withRenderedValue<C>(renderer: ComponentRenderer<C>, context: C): HoverEvent<V>;

}

export namespace HoverEvent {

    function create<V>(
        action: Action<V>,
        value: V
    ): HoverEvent<V> {
        return Object.freeze({
            action() {
                return action;
            },
            value(arg0?: V) {
                if (typeof arg0 !== "undefined") return create(action, arg0);
                return value;
            },
            withRenderedValue<C>(renderer: ComponentRenderer<C>, context: C): HoverEvent<V> {
                const newValue: V = action.renderer().render(renderer, context, value);
                return create(action, newValue);
            }
        }) as unknown as HoverEvent<V>;
    }

    export function hoverEvent<V>(action: HoverEvent.Action<V>, payload: V): HoverEvent<V> {
        return create(action, payload);
    }

    export function showText(text: Component): HoverEvent<Component> {
        return create(Action.SHOW_TEXT, text);
    }

    export function showItem(item: string, count: number): HoverEvent<ShowItem> {
        return create(Action.SHOW_ITEM, ShowItem.showItem(item, count));
    }

    export function showEntity(type: string, id: string, name: Component | null = null): HoverEvent<ShowEntity> {
        return create(Action.SHOW_ENTITY, ShowEntity.showEntity(type, id, name));
    }

    //

    export interface ShowItem {
        item(): string,
        item(item: string): ShowItem;
        count(): number;
        count(count: number): ShowItem;
    }

    export namespace ShowItem {

        /** @internal */
        function create(item: string, count: number): ShowItem {
            if (!Number.isFinite(count) || count < 0 || count > 0x7FFFFFFF) {
                throw new Error(`Invalid count: ${count}`);
            }
            count = Math.trunc(count);

            return Object.freeze({
                item(arg0?: string) {
                    if (typeof arg0 !== "undefined") return create(arg0, count);
                    return item;
                },
                count(arg0?: number) {
                    if (typeof arg0 !== "undefined") return create(item, arg0);
                    return count;
                }
            }) as unknown as ShowItem;
        }

        export function showItem(
            item: string,
            count: number
        ): ShowItem {
            return create(item, count);
        }

    }

    export interface ShowEntity {
        type(): string;
        type(type: string): ShowEntity;
        id(): string;
        id(id: string): ShowEntity;
        name(): Component | null;
        name(name: Component | null): ShowEntity;
    }

    export namespace ShowEntity {

        /** @internal */
        function create(type: string, id: string, name: Component | null): ShowEntity {
            return Object.freeze({
                type(arg0?: string) {
                    if (typeof arg0 !== "undefined") return create(arg0, id, name);
                    return type;
                },
                id(arg0?: string) {
                    if (typeof arg0 !== "undefined") return create(type, arg0, name);
                    return id;
                },
                name(arg0?: Component | null) {
                    if (typeof arg0 !== "undefined") return create(type, id, arg0);
                    return name;
                }
            }) as unknown as ShowEntity;
        }

        export function showEntity(
            type: string,
            id: string,
            name: Component | null = null
        ): ShowEntity {
            return create(type, id, name);
        }

    }

    export interface Action<V> {

        readable(): boolean;

        renderer(): Action.Renderer<V>;

        toString(): string;

    }

    export namespace Action {

        export interface Renderer<V> {

            render<C>(
                renderer: ComponentRenderer<C>,
                context: C,
                value: V
            ): V;

        }

        function define<V>(
            name: string,
            readable: boolean,
            render: <C>(renderer: ComponentRenderer<C>, context: C, value: V) => V
        ): Action<V> {
            const renderer: Renderer<V> = Object.freeze({ render });
            return Object.freeze({
                readable(): boolean {
                    return readable;
                },
                renderer(): Renderer<V> {
                    return renderer;
                },
                toString(): string {
                    return name;
                }
            });
        }

        //

        export const SHOW_TEXT: Action<Component> = define(
            "show_text",
            true,
            (renderer, context, value) => renderer.render(value, context)
        );

        export const SHOW_ITEM: Action<ShowItem> = define(
            "show_item",
            true,
            (_a, _b, value) => value
        );

        export const SHOW_ENTITY: Action<ShowEntity> = define(
            "show_entity",
            true,
            (renderer, context, value) => {
                const name = value.name();
                if (name === null) return value;
                return value.name(renderer.render(name, context));
            }
        );

        export const NAMES = ((...actions: Action<any>[]) => {
            const record: Record<string, Action<any>> = {};
            for (const action of actions) record[action.toString()] = action;
            return Object.freeze(record);
        })(
            SHOW_TEXT,
            SHOW_ITEM,
            SHOW_ENTITY
        );

    }

    /** @internal */
    export class Handlers<C, R> {

        private readonly _map: { [k: string]: (event: HoverEvent<any>, context: C) => R };

        constructor() {
            this._map = {};
        }

        //

        register<T>(action: HoverEvent.Action<T>, handler: (event: HoverEvent<T>, context: C) => R): void {
            this._map[action.toString()] = handler;
        }

        invoke(event: HoverEvent<any>, context: C): R {
            const action = event.action().toString();
            const handler = this._map[action];
            if (!handler) throw new Error(`Unhandled hover event action: ${action}`);
            return handler(event, context);
        }

    }

}
