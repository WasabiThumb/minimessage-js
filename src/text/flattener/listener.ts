import {Style} from "../style";

//

type FlattenerListenerContract = {
    component(text: string): void;
};

type FlattenerListenerExtras = {
    pushStyle(style: Style): void;
    popStyle(style: Style): void;
    shouldContinue(): boolean;
};

export type FlattenerListener =
    FlattenerListenerContract &
    Partial<FlattenerListenerExtras>;

export namespace FlattenerListener {

    const DEFAULTS: FlattenerListenerExtras = {
        pushStyle() { },
        popStyle() { },
        shouldContinue(): boolean {
            return true;
        }
    };

    export function of(fn: (text: string) => void): FlattenerListener {
        return Object.freeze({ component: fn });
    }

    export function normalize(listener: FlattenerListener): Required<FlattenerListener> {
        if (!("component" in listener)) {
            throw new Error(`Invalid listener`);
        }
        if ("pushStyle" in listener &&
            "popStyle" in listener &&
            "shouldContinue" in listener
        ) {
            return listener as Required<FlattenerListener>;
        }
        return Object.freeze({
            ...DEFAULTS,
            ...listener
        });
    }

}