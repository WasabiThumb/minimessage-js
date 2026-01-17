import type {Node} from "../tree";
import type {ElementNode} from "./element";
import type {Token} from "../token";
import {assertReal} from "../../util/assertions";

// This file exists to prevent a circular dependency
// between "element" and "text".

export const TextNodeFactory = new class {

    _bound: boolean = false;
    _identity: ((n: Node) => boolean) | null = null;
    _generator: ((parent: ElementNode | null, token: Token, sourceMessage: string) => ElementNode) | null = null;

    //

    bind(
        identity: (n: Node) => boolean,
        generator: (parent: ElementNode | null, token: Token, sourceMessage: string) => ElementNode
    ): void {
        assertReal(identity, "identity");
        assertReal(generator, "generator");
        this._identity = identity;
        this._generator = generator;
        this._bound = true;
    }

    isTextNode(node: Node): boolean {
        this._checkBound();
        return this._identity!(node);
    }

    create(parent: ElementNode | null, token: Token, sourceMessage: string): ElementNode {
        this._checkBound();
        return this._generator!(parent, token, sourceMessage);
    }

    _checkBound(): void {
        if (!this._bound) throw new Error("Not bound");
    }

};