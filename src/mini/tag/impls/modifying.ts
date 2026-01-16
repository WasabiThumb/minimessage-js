import {Component} from "../../../text/component";
import {Node} from "../../tree";

//

export interface ModifyingTag {
    readonly type: "modifying"
    apply(current: Component, depth: number): Component;
    visit(current: Node, depth: number): void;
    postVisit(): void;
}

export abstract class AbstractModifyingTag implements ModifyingTag {

    readonly type = "modifying";

    abstract apply(current: Component, depth: number): Component;

    visit(current: Node, depth: number) { }

    postVisit() { }

}
