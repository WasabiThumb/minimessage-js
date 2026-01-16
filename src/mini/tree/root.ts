import {ElementNode} from "./element";
import {Node} from "../tree";

//

/** @internal */
export class RootNode extends ElementNode implements Node.Root {

    private readonly _beforePreprocessing: string;

    constructor(
        sourceMessage: string,
        beforePreprocessing: string
    ) {
        super(null, null, sourceMessage);
        this._beforePreprocessing = beforePreprocessing;
    }

    //

    input(): string {
        return this._beforePreprocessing;
    }

}
