
export interface Node {

    toString(): string;

    children(): Node[];

    parent(): Node | null;

}

export namespace Node {

    export function isRoot(node: Node): boolean {
        return "input" in node;
    }

    export function asRoot(node: Node): Node.Root {
        if (!("input" in node) || typeof node["input"] !== "function")
            throw new Error("Node is not a root node");

        return node as unknown as Node.Root;
    }

    //

    export interface Root extends Node {

        input(): string;

    }

}
