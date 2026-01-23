import { Component } from "minimessage-js";

//

export type Unit = NothingUnit |
    StringUnit |
    ComponentUnit |
    RichUnit |
    ErrorUnit;

export type NothingUnit = {
    type: "nothing"
};

export type StringUnit = {
    type: "string",
    value: string
};

export type ComponentUnit = {
    type: "component",
    value: Component
};

export type RichUnit = {
    type: "rich",
    write: (out: Element) => void
};

export type ErrorUnit = {
    type: "error",
    operationID: string,
    operationIndex: number,
    cause: any
};

//

export namespace Unit {

    const NOTHING: NothingUnit = Object.freeze({ type: "nothing" });

    //

    export function nothing(): NothingUnit {
        return NOTHING;
    }

    export function string(value: string): StringUnit {
        return Object.freeze({ type: "string", value });
    }

    export function component(value: Component): ComponentUnit {
        return Object.freeze({ type: "component", value });
    }

    export function rich(write: (out: Element) => void): RichUnit {
        return Object.freeze({ type: "rich", write });
    }

    export function error(operationID: string, operationIndex: number, cause: any): ErrorUnit {
        return Object.freeze({ type: "error", operationID, operationIndex, cause });
    }

}

