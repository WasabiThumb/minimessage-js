import {HueWheel} from "./colors/wheel.ts";
import {Color} from "./colors/color.ts";
import {LightnessSlider} from "./colors/slider.ts";
import {ColorPresets} from "./colors/presets.ts";
import {ColorComponents} from "./colors/components.ts";
import {NamedTextColor, TextColor} from "minimessage-js";
import type {
    ColorsEvent,
    ColorsEventEmitter,
    ColorsEventListener,
    ColorsEventMap
} from "./colors/events.ts";
import {findElementsByProperty} from "./util/query.ts";

//

function stringifyColor(value: Color): string {
    let named;
    if (value.type === "named" && (named = value.get("named")).valid) {
        return named.value.name();
    }

    const rgb = value.get("rgb");
    return TextColor.color(rgb.r, rgb.g, rgb.b)
        .asHexString();
}

export class Colors implements ColorsEventEmitter {

    private readonly _element: HTMLElement;
    private readonly _wheel: HueWheel;
    private readonly _slider: LightnessSlider;
    private _handle: Handle | null;

    constructor(element: HTMLElement) {
        const {
            wheelElement,
            sliderElement,
            presetsElement,
            componentsElement,
            actionsElement,
            gradientModalElement
        } = findElementsByProperty(element, `data-role`, {
            wheelElement: `wheel`,
            sliderElement: `slider`,
            presetsElement: `presets`,
            componentsElement: `components`,
            actionsElement: `actions`,
            gradientModalElement: `gradientModal`,
        });

        const value = Color.named(NamedTextColor.RED);
        const wheel = new HueWheel(wheelElement as HTMLCanvasElement, value);
        const slider = new LightnessSlider(sliderElement as HTMLCanvasElement, value);
        const presets = new ColorPresets(presetsElement, value);
        const components = new ColorComponents(componentsElement, value);
        const gradientModal = new GradientModal(gradientModalElement, this);
        const actions = new Actions(actionsElement, value, this, gradientModal);

        this._element = element;
        this._wheel = wheel;
        this._slider = slider;
        this._handle = null;

        presets.bind();
        components.bind();
        actions.bind();
        gradientModal.bind();
    }

    //

    popup(x: number, y: number): ColorsEventListener {
        const element = this._element;
        const abort = new AbortController();
        const handle = new Handle(abort);
        this._resetHandle(handle);

        element.addEventListener("click", (e) => {
            e.stopPropagation();
        }, { signal: abort.signal });

        setTimeout(() => {
            if (abort.signal.aborted) return;
            document.body.addEventListener("click", () => {
                this._resetHandle(null);
                element.removeAttribute("data-active");
            }, { signal: abort.signal });
        }, 10);

        element.setAttribute("data-active", "");
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
        return handle;
    }

    emit(event: ColorsEvent) {
        const handle = this._handle;
        if (handle) handle.emit(event);
    }

    private _resetHandle(replacement: Handle | null): void {
        const handle = this._handle;
        if (handle !== null) {
            handle.abort.abort();
        }
        this._handle = replacement;

        const active = replacement !== null;
        this._wheel.shouldRender = active;
        this._slider.shouldRender = active;
    }

}

//

class Handle implements ColorsEventListener, ColorsEventEmitter {

    private readonly _listeners: Record<string, Set<(l: ColorsEvent) => void>> = {};

    constructor(readonly abort: AbortController) { }

    //

    emit(event: ColorsEvent): void {
        const set = this._listeners[event.type];
        if (!set) return;
        for (const listener of set) {
            try {
                listener(event);
            } catch (e) {
                console.warn(`Error in callback`, e);
            }
        }
    }

    on<T extends keyof ColorsEventMap>(
        type: T,
        callback: (event: ColorsEventMap[T]) => void
    ): void {
        let set = this._listeners[type];
        if (!set) this._listeners[type] = set = new Set();
        // @ts-ignore
        set.add(callback);
    }

}

class Actions {

    private readonly _value: Color;
    private readonly _eventEmitter: ColorsEventEmitter;
    private readonly _gradientModal: GradientModal;

    constructor(
        readonly element: HTMLElement,
        value: Color,
        eventEmitter: ColorsEventEmitter,
        gradientModal: GradientModal
    ) {
        this._value = value;
        this._eventEmitter = eventEmitter;
        this._gradientModal = gradientModal;
    }

    //

    bind() {
        const {
            colorAction,
            shadowColorAction,
            gradientAction
        } = findElementsByProperty(
            this.element,
            `data-action`,
            {
                colorAction: `color`,
                shadowColorAction: `shadowColor`,
                gradientAction: `gradient`
            }
        );
        colorAction.addEventListener("click", () => {
            this._eventEmitter.emit({
                type: "color",
                color: stringifyColor(this._value)
            });
        });
        shadowColorAction.addEventListener("click", () => {
            this._eventEmitter.emit({
                type: "shadowColor",
                color: stringifyColor(this._value)
            });
        });
        gradientAction.addEventListener("click", () => {
            this._gradientModal.addColor(this._value);
        });
    }

}

class GradientModal {

    private readonly _eventEmitter: ColorsEventEmitter;
    private readonly _listElement: HTMLElement;
    private readonly _applyElement: HTMLElement;
    private readonly _entries: { element: HTMLElement, color: Color }[];

    constructor(readonly element: HTMLElement, eventEmitter: ColorsEventEmitter) {
        const {
            listElement,
            applyElement
        } = findElementsByProperty(element, `data-role`, {
            listElement: `list`,
            applyElement: `apply`
        });

        this._eventEmitter = eventEmitter;
        this._listElement = listElement;
        this._applyElement = applyElement;
        this._entries = [];
    }

    //

    get colors(): string[] {
        const ret: string[] = new Array(this._entries.length);
        for (let i = 0; i < this._entries.length; i++)
            ret[i] = stringifyColor(this._entries[i].color);
        return ret;
    }

    addColor(color: Color) {
        const template = this._listElement.querySelector<HTMLElement>(`[data-template]`);
        if (template === null) throw new Error(`Missing template element`);

        const element = template.cloneNode(true) as HTMLElement;
        const rgb = color.get("rgb");
        element.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        element.addEventListener("click", () => {
            const index = Number(element.getAttribute("data-index"));
            this.removeColor(index);
        });
        element.removeAttribute("data-template");

        const entry = { element, color: color.copy() };
        if (this._entries.length === 0) this.element.setAttribute("data-active", "");
        const index = this._entries.push(entry) - 1;
        element.setAttribute("data-index", `${index}`);
        this.element.append(element);
        this._listElement.append(element);
    }

    removeColor(index: number) {
        if (index < 0 || index >= this._entries.length) return;
        const entry = this._entries.splice(index, 1)[0];
        entry.element.remove();
        if (this._entries.length === 0) {
            this.element.removeAttribute("data-active");
        } else {
            for (let i = index; i < this._entries.length; i++) {
                const element = this._entries[i].element;
                const index = Number(element.getAttribute("data-index"));
                element.setAttribute("data-index", `${index - 1}`);
            }
        }
    }

    bind(): void {
        this._applyElement.addEventListener("click", () => {
            this._eventEmitter.emit({
                type: "gradient",
                colors: this.colors
            });
        });
    }

}
