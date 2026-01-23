
export namespace ColorsEvent {

    export type Color = {
        type: "color",
        color: string
    };

    export type ShadowColor = {
        type: "shadowColor",
        color: string
    };

    export type Gradient = {
        type: "gradient",
        colors: string[]
    };

}

export type ColorsEventMap = {
    color: ColorsEvent.Color,
    shadowColor: ColorsEvent.ShadowColor,
    gradient: ColorsEvent.Gradient
};

export type ColorsEvent = ColorsEvent.Color |
    ColorsEvent.ShadowColor |
    ColorsEvent.Gradient;

export interface ColorsEventListener {
    on<T extends keyof ColorsEventMap>(type: T, callback: (event: ColorsEventMap[T]) => void): void;
}

export interface ColorsEventEmitter {
    emit(event: ColorsEvent): void;
}
