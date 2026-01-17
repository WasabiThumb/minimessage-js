import {PlayerHeadObjectContents} from "./object/playerHead";
import {SpriteObjectContents} from "./object/sprite";
import {Key} from "../key";

//

export {
    PlayerHeadObjectContents,
    SpriteObjectContents
}

export type ObjectContents = PlayerHeadObjectContents |
    SpriteObjectContents;

export namespace ObjectContents {

    type SpriteConstructor = {
        (sprite: string | Key): SpriteObjectContents;
        (atlas: string | Key, sprite: string | Key): SpriteObjectContents;
    };

    function spriteConstructor(): SpriteObjectContents {
        let atlas: Key = SpriteObjectContents.DEFAULT_ATLAS;
        let sprite: Key;

        if (arguments.length === 1) {
            sprite = Key.key(arguments[0] as string | Key);
        } else if (arguments.length === 2) {
            atlas = Key.key(arguments[0] as string | Key);
            sprite = Key.key(arguments[1] as string | Key);
        } else {
            throw new Error(`Expected 1-2 arguments, got ${arguments.length}`);
        }

        return Object.freeze({
            type: "sprite",
            atlas(): Key {
                return atlas;
            },
            sprite(): Key {
                return sprite;
            }
        });
    }

    export const sprite = spriteConstructor as unknown as SpriteConstructor;

    //

    export function playerHead(): PlayerHeadObjectContents.Builder {
        return PlayerHeadObjectContents.builder();
    }

}
