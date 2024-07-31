import {ArgumentQueue} from "./args";
import {StringBuilder} from "../util/string";

// MiniMessage is an XML-like format but it departs in several large ways, is meant to be parsed leniently, and
// has some additions of it's own. For that reason, we are implementing an XML-ish parser instead of using a library.

type MarkupParserStartTagEvent = {
    type: "start_tag",
    location: number,
    name: string,
    args: ArgumentQueue,
    selfClosing: boolean
};
type MarkupParserEndTagEvent = {
    type: "end_tag",
    location: number,
    name: string
};
type MarkupParserTextEvent = {
    type: "text",
    location: number,
    content: string
};
export type MarkupParserEvent = MarkupParserStartTagEvent | MarkupParserEndTagEvent | MarkupParserTextEvent;
type MarkupParserEventType = MarkupParserEvent["type"];
type MarkupParserEventMap = {
    "start_tag": MarkupParserStartTagEvent,
    "end_tag": MarkupParserEndTagEvent,
    "text": MarkupParserTextEvent
};
type MarkupParserEventCallback<K = MarkupParserEventType> = K extends keyof MarkupParserEventMap ? ((event: MarkupParserEventMap[K]) => void) : never;
type MarkupParserEventCallbacks = { [K in keyof MarkupParserEventMap]?: MarkupParserEventCallback[] };

/**
 * @protected
 */
abstract class MarkupParserEventTarget {

    private readonly events: MarkupParserEventCallbacks = {};

    on<T extends MarkupParserEventType>(type: T, cb: MarkupParserEventCallback<T>): void {
        let callbacks: MarkupParserEventCallback[] | undefined = this.events[type];
        let created: boolean = false;
        if (typeof callbacks === "undefined") {
            created = true;
            callbacks = [];
        }
        callbacks.push(cb);
        if (created) this.events[type] = callbacks;
    }

    protected fireEvent(event: MarkupParserEvent): void {
        const callbacks: MarkupParserEventCallback[] | undefined = this.events[event.type];
        if (typeof callbacks === "undefined") return;
        for (let cb of callbacks) {
            // @ts-ignore
            cb(event);
        }
    }

}

export class MarkupParser extends MarkupParserEventTarget {

    private readingTag: boolean = false;
    private escaped: boolean = false;
    private buffer: StringBuilder = new StringBuilder();
    private locationCounter: number = 0;

    /**
     * Parses a section of markup text.
     */
    parse(input: string): void {
        for (let i=0; i < input.length; i++) {
            try {
                this.parseChar(input.charCodeAt(i));
            } finally {
                this.locationCounter++;
            }
        }
    }

    private parseChar(char: number): void {
        if (this.escaped) {
            this.buffer.appendChar(char);
            this.escaped = false;
            return;
        }
        if (char === 92) { // backslash
            this.escaped = true;
            return;
        }
        if (char === 60) { // left angle bracket <
            if (this.readingTag) {
                // ??? Ok I guess
                this.buffer.appendChar(char);
                return;
            }
            this.flush0(false);
            this.readingTag = true;
        } else if (char === 62) { // right angle bracket >
            this.flush0(true);
        } else {
            this.buffer.appendChar(char);
        }
    }

    /**
     * Flushes all internal buffers. This should be called when input is done being fed to the parser.
     */
    flush(): void {
        this.flush0(false);
    }

    private flush0(canReadTags: boolean): void {
        if (this.buffer.isEmpty()) return;

        if (canReadTags && this.readingTag) {
            this.readingTag = false;

            const selfClosing: boolean = (this.buffer.charCodeAt(this.buffer.length - 1) === 47); // slash /
            const isClosing = this.buffer.charCodeAt(0) === 47; // slash /
            if (selfClosing && !isClosing) {
                this.buffer.shrink(1);
            }

            const tagStart = (isClosing ? 1 : 0);
            let paramStart: number = -1;
            let hasParam: boolean = (!isClosing);
            if (hasParam) {
                paramStart = this.buffer.indexOfChar(58); // colon :
                hasParam = (paramStart !== -1);
            }

            const tagName = this.buffer.toString(
                tagStart,
                hasParam ? (paramStart - tagStart) : (this.buffer.length - tagStart)
            );
            paramStart++;
            const params = (hasParam && paramStart !== this.buffer.length) ?
                new ArgumentQueue(this.buffer.toString(paramStart))
                : ArgumentQueue.EMPTY;

            this.fireEvent(isClosing ? {
                type: "end_tag",
                location: this.locationCounter,
                name: tagName
            } : {
                type: "start_tag",
                location: this.locationCounter,
                name: tagName,
                args: params,
                selfClosing
            });
        } else {
            let content: string = this.buffer.toString();
            if (this.readingTag) {
                content = "<" + content;
                this.readingTag = false;
            }
            this.fireEvent({
                type: "text",
                location: this.locationCounter,
                content
            });
        }

        this.buffer.clear();
    }

}

export class MarkupStack<D> {

    private static readonly LOAD_FACTOR: number = 0.75;
    private _capacity: number;
    private _size: number;
    private readonly _tags: string[];
    private readonly _data: D[];

    constructor(capacity: number = 16) {
        this._capacity = capacity;
        this._size = 0;
        this._tags = new Array(capacity);
        this._data = new Array(capacity);
    }

    get size(): number {
        return this._size;
    }

    push(tag: string, data: D): void {
        if (this._size >= this._capacity) {
            const newCapacity = Math.ceil((this._capacity + 1) / MarkupStack.LOAD_FACTOR);
            this._tags.length = newCapacity;
            this._data.length = newCapacity;
            this._capacity = newCapacity;
        }
        this._tags[this._size] = tag;
        this._data[this._size] = data;
        this._size++;
    }

    pop<S extends boolean>(tag: string, strict?: S, position?: number): S extends true ? D : D | null {
        let posInfo: string = (typeof position === "number") ? ` @ ${position}` : "";
        while (this._size >= 1) {
            this._size--;
            const storedKey: string = this._tags[this._size];
            if (storedKey !== tag) {
                if (!!strict) throw new Error("Expected matching end tag for start tag: " + storedKey + posInfo);
                continue;
            }
            return this._data[this._size];
        }
        if (!!strict) throw new Error("Expected matching start tag for end tag: " + tag + posInfo);
        return null as unknown as S extends true ? never : D | null;
    }

    peek(): D | null {
        if (this._size === 0) return null;
        return this._data[this._size - 1];
    }

    peekTag(): string | null {
        if (this._size === 0) return null;
        return this._tags[this._size - 1];
    }

}
