import {Unit} from "./unit.ts";
import {JsonComponentSerializer} from "minimessage-js";

//

export class Output {

    private readonly _typeElement: HTMLElement;
    private readonly _containerElement: HTMLElement;
    private _shown: HTMLElement | null;

    constructor(element: HTMLElement) {
        this._typeElement = element.querySelector(`[data-role="type"]`)! as HTMLElement;
        this._containerElement = element.querySelector(`[data-role="container"]`)! as HTMLElement;
        this._shown = null;
    }

    //

    update(unit: Unit): void {
        this._typeElement.innerText = unit.type.toUpperCase();
        const toShow = this._containerElement.querySelector(`[data-type="${unit.type}"]`)! as HTMLElement;

        this._populate(unit, toShow);
        toShow.setAttribute("data-show", "");
        if (toShow !== this._shown) {
            if (this._shown !== null) this._shown.removeAttribute("data-show");
            this._shown = toShow;
        }
    }

    private _populate(unit: Unit, element: HTMLElement): void {
        const type = unit.type;
        switch (type) {
            case "nothing":
                break;
            case "string":
                element.innerText = unit.value;
                break;
            case "component":
                const json = JsonComponentSerializer.json().serialize(unit.value);
                const pretty = JSON.stringify(json, null, 2);
                element.innerText = pretty;
                break;
            case "rich":
                element.innerHTML = ``;
                unit.write(element);
                break;
            case "error":
                const index = element.querySelector(`[data-field="index"]`)! as HTMLElement;
                const id = element.querySelector(`[data-field="id"]`)! as HTMLElement;
                const cause = element.querySelector(`[data-field="cause"]`)! as HTMLElement;

                index.innerText = `${unit.operationIndex}`;
                id.innerText = unit.operationID;
                cause.innerText = String(unit.cause);
                break;
            default:
                this._unhandledType(type);
        }
    }

    private _unhandledType(type: never) {
        throw new Error(`Unhandled unit type: '${type}'`);
    }

}
