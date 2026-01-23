import type {Listing} from "./listing.ts";
import {Operation} from "./operation.ts";
import {Unit} from "./unit.ts";

//

export class Dropdown {

    private readonly _element: HTMLElement;
    private readonly _listing: Listing;
    private readonly _entries: Entry[];
    private _visible: boolean;
    private _init: boolean;

    constructor(
        element: HTMLElement,
        listing: Listing
    ) {
        this._element = element;
        this._listing = listing;
        this._entries = [];
        this._visible = false;
        this._init = false;
    }

    //

    get visible() {
        return this._visible;
    }

    set visible(visible: boolean) {
        if (visible === this._visible) return;
        if (visible) {
            const listing = this._listing;
            if (!this._init) {
                this._populate(listing);
                listing.onUpdate(() => {
                    this._update(listing);
                });
                this._init = true;
            }
            this._update(listing);
            this._element.setAttribute("data-visible", "");
        } else {
            this._element.removeAttribute("data-visible");
        }
        this._visible = visible;
    }

    private _populate(listing: Listing): void {
        const template = this._element.querySelector<HTMLElement>(`[data-template]`);
        if (!template) throw new Error(`Missing template element`);
        for (const operation of Operation.all()) {
            const element = template.cloneNode(true) as HTMLElement;
            element.removeAttribute("data-template");
            element.innerText = operation.name;
            this._element.append(element);

            element.addEventListener("click", () => {
                if (listing.tail !== operation.accepts) return;
                listing.add(operation);
            });

            const entry = new Entry(element, operation);
            this._entries.push(entry);
        }
    }

    private _update(listing: Listing): void {
        const tail = listing.tail;
        for (const entry of this._entries) {
            entry.update(tail);
        }
    }

}

class Entry {

    constructor(
        readonly element: HTMLElement,
        readonly operation: Operation
    ) { }

    //

    update(tail: Unit["type"]) {
        const allowed = this.operation.accepts === tail;
        if (allowed) {
            this.element.removeAttribute("data-disallowed");
        } else {
            this.element.setAttribute("data-disallowed", "");
        }
    }

}
