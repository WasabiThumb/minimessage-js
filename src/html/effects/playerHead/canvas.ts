
class Mutex {

    private readonly _listeners: (() => void)[] = [];
    private _locked: boolean = false;

    //

    async lock(): Promise<void> {
        if (!this._locked) {
            this._locked = true;
            return;
        }
        let listener: (() => void) | null = null;
        const promise = new Promise<void>((resolve) => {
            listener = resolve;
        });
        if (listener === null) throw new Error(`Illegal promise behavior`);
        this._listeners.push(listener);
        return promise;
    }

    unlock(): void {
        if (!this._locked) return;
        if (this._listeners.length === 0) {
            this._locked = false;
            return;
        }
        const l0 = this._listeners.splice(0, 1)[0];
        try {
            l0();
        } catch (e) {
            this._locked = false;
            throw e;
        }
    }

}

/** @internal */
export class SharedCanvas {

    private readonly _width: number;
    private readonly _height: number;
    private readonly _mutex: Mutex;
    private _state: [ OffscreenCanvas, OffscreenCanvasRenderingContext2D ] | null;

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
        this._mutex = new Mutex();
        this._state = null;
    }

    //

    async use<T>(
        fn: (canvas: OffscreenCanvas, context: OffscreenCanvasRenderingContext2D) => Promise<T> | T
    ): Promise<T> {
        await this._mutex.lock();
        try {
            const state = this._getState();
            return await fn.apply(null, state);
        } finally {
            this._mutex.unlock();
        }
    }

    private _getState(): [ OffscreenCanvas, OffscreenCanvasRenderingContext2D ] {
        if (this._state !== null) return this._state;
        const canvas = new OffscreenCanvas(this._width, this._height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error(`Failed to create rendering context`);
        return this._state = [ canvas, ctx ];
    }

}
