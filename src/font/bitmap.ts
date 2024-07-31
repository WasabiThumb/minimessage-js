
type BitmapFontData = {
    /** The number of glyphs along the width of the bitmap */
    GLYPH_WIDTH: number,

    /** The number of glyphs along the height of the bitmap */
    GLYPH_HEIGHT: number,

    /** The first index (inclusive) containing a valid glyph */
    GLYPH_START: number,

    /** The last index (inclusive) containing a valid glyph */
    GLYPH_END: number,

    /** A base64 data URL containing the bitmap */
    GLYPH_DATA: string
};

type BitmapVoidState = { code: 0 };
type BitmapLoadingState = { code: 1, value: Promise<HTMLImageElement> };
type BitmapReadyState = { code: 2, value: HTMLImageElement };
type BitmapState = BitmapVoidState | BitmapLoadingState | BitmapReadyState;

export class BitmapFont {

    readonly document: HTMLDocument;
    readonly window: Window;
    private readonly valid: boolean;
    private readonly data: BitmapFontData;
    private bitmapState: BitmapState = { code: 0 };

    constructor(documentAccessor: object, data: BitmapFontData) {
        while ("parentNode" in documentAccessor) {
            let node = documentAccessor as unknown as { parentNode: any };
            if (typeof node["parentNode"] !== "object" || node["parentNode"] === null) break;
            documentAccessor = node.parentNode as object;
        }

        this.document = documentAccessor as unknown as HTMLDocument;
        this.data = data;

        // Test for browser DOM
        if (
            ("constructor" in documentAccessor) &&
            (documentAccessor.constructor.name === "HTMLDocument")
        ) {
            let window: Window | null = null;
            if ("parentWindow" in this.document) {
                window = (this.document as unknown as { parentWindow: Window })["parentWindow"];
            } else {
                const view = this.document.defaultView;
                if (view !== null) window = view;
            }
            if (window !== null) {
                this.valid = true;
                this.window = window;
                return;
            }
        }
        this.valid = false;
        this.window = null as unknown as Window;
    }

    get glyphCount(): number {
        const [ a, b ] = this.glyphBounds;
        return b - a;
    }

    get canRender(): boolean {
        return this.valid;
    }

    async render(dest: HTMLCanvasElement, glyphIndex: number, color?: string): Promise<void> {
        if (!this.canRender) throw new Error("Environment does not support bitmap font rendering");

        const [ a, b ] = this.glyphBounds;
        if (glyphIndex < 0 || glyphIndex >= (b - a))
            throw new Error(`Index ${glyphIndex} out of bounds for length ${b - a}`);
        const [ x, y ] = this.indexToCoords(glyphIndex + a);

        const bmp = (this.bitmapState.code === 2 ? this.bitmapState.value : (await this.getBitmap()));
        const iw = bmp.naturalWidth / this.getData("GLYPH_WIDTH");
        dest.width = iw;
        const ih = bmp.naturalHeight / this.getData("GLYPH_HEIGHT");
        dest.height = ih;

        const ctx = dest.getContext("2d");
        if (ctx === null) throw new Error("Could not retrieve 2D context from HTML canvas");

        ctx.globalCompositeOperation = "source-over";
        if (!!color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, iw, ih);
            ctx.globalCompositeOperation = "destination-in";
        } else {
            ctx.clearRect(0, 0, iw, ih);
        }
        ctx.drawImage(bmp, (x * iw), (y * ih), iw, ih, 0, 0, iw, ih);
    }

    private getBitmap(): Promise<HTMLImageElement> {
        switch (this.bitmapState.code) {
            case 0:
                const src = this.getData("GLYPH_DATA");
                const img = this.document.createElement("img");
                const ret = new Promise<HTMLImageElement>((res, rej) => {
                    img.addEventListener("load", () => res(img));
                    img.addEventListener("error", rej);
                    img.src = src;
                });
                ret.then(() => {
                    this.bitmapState = { code: 2, value: img };
                });
                this.bitmapState = { code: 1, value: ret };
                return ret;
            case 1:
                return this.bitmapState.value;
            case 2:
                return Promise.resolve(this.bitmapState.value);
        }
    }

    private getData<K extends keyof BitmapFontData>(key: K): BitmapFontData[K] {
        return this.data[key];
    }

    private get glyphBounds(): [ number, number ] {
        return [ this.getData("GLYPH_START"), this.getData("GLYPH_END") + 1 ];
    }

    private indexToCoords(index: number): [number, number] {
        const w = this.getData("GLYPH_WIDTH");
        const y = Math.floor(index / w);
        const x = index - (y * w);
        return [ x, y ];
    }
}
