
type StackNode<T> = { readonly value: T, parent: StackNode<T> | null };

/** @internal */
export class Stack<T> {

    private _tail: StackNode<T> | null;
    private _size: number;

    constructor() {
        this._tail = null;
        this._size = 0;
    }

    //

    get size(): number {
        return this._size;
    }

    clear(): void {
        this._tail = null;
        this._size = 0;
    }

    push(value: T) {
        this._tail = { value, parent: this._tail };
        this._size++;
        return value;
    }

    pop(): T | null {
        const node = this._tail;
        if (node === null) return null;
        this._tail = node.parent;
        this._size--;
        return node.value;
    }

    peek(): T | null {
        const node = this._tail;
        if (node === null) return null;
        return node.value;
    }

}
