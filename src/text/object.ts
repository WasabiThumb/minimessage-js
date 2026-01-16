import { PlayerHeadObjectContents } from "./object/playerHead";
import type { SpriteObjectContents } from "./object/sprite";

//

export {
    PlayerHeadObjectContents,
    SpriteObjectContents
}

export type ObjectContents = PlayerHeadObjectContents |
    SpriteObjectContents;

export namespace ObjectContents {

    type SpriteConstructor = {
        (sprite: string): SpriteObjectContents;
        (atlas: string, sprite: string): SpriteObjectContents;
    };

    function spriteConstructor(): SpriteObjectContents {
        let atlas: string = "minecraft:blocks";
        let sprite: string;

        if (arguments.length === 1) {
            sprite = `${arguments[0]}`;
        } else if (arguments.length === 2) {
            atlas = `${arguments[0]}`;
            sprite = `${arguments[1]}`;
        } else {
            throw new Error(`Expected 1-2 arguments, got ${arguments.length}`);
        }

        return Object.freeze({
            type: "sprite",
            atlas() {
                return atlas;
            },
            sprite() {
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
