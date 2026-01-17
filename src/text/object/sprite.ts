import {Key} from "../../key";

//

export interface SpriteObjectContents {

    readonly type: "sprite";

    atlas(): Key;

    sprite(): Key;

}

export namespace SpriteObjectContents {

    export const DEFAULT_ATLAS = Key.key("minecraft:blocks");

}
