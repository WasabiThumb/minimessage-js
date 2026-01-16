import {ArgumentQueue} from "../resolver/argumentQueue";
import {Context} from "../../context";
import {Tag} from "../../tag";
import {TagResolver} from "../resolver";
import {Component} from "../../../text/component";
import {assertNever} from "../../../util/assertions";
import {BlockNBTComponent} from "../../../text/component/nbt/block";
import {NBTComponent} from "../../../text/component/nbt";

/** @internal */
export namespace NbtTag {

    const BLOCK = "block";
    const ENTITY = "entity";
    const STORAGE = "storage";
    const INTERPRET = "interpret";

    type Header = BlockHeader | KeyedHeader;

    type BlockHeader = {
        type: typeof BLOCK,
        pos: BlockNBTComponent.Pos
    };

    type KeyedHeader = {
        type: typeof ENTITY | typeof STORAGE,
        key: string
    };

    function resolve(args: ArgumentQueue, ctx: Context): Tag {
        const type = args.popOr("a type of block, entity, or storage is required").lowerValue();
        let header: Header;

        switch (type) {
            case BLOCK:
                const pos = args.popOr("A position is required").value();
                let parsed: BlockNBTComponent.Pos;
                try {
                    parsed = BlockNBTComponent.Pos.fromString(pos);
                } catch (e) {
                    throw ctx.newException(`Invalid position '${pos}'`, args);
                }
                header = { type, pos: parsed };
                break;
            case ENTITY:
                const selector = args.popOr("A selector is required").value();
                header = { type, key: selector };
                break;
            case STORAGE:
                const storage = args.popOr("A storage key is required").value();
                header = { type, key: storage };
                break;
            default:
                throw ctx.newException(`Unknown nbt tag type '${type}'`, args);
        }

        const nbtPath = args.popOr("An NBT path is required")
            .value();

        let component: NBTComponent<any>;
        const headerType = header.type;
        switch (headerType) {
            case BLOCK:
                component = Component.blockNBT(nbtPath, header.pos);
                break;
            case ENTITY:
                component = Component.entityNBT(nbtPath, header.key);
                break;
            case STORAGE:
                component = Component.storageNBT(nbtPath, header.key);
                break;
            default:
                assertNever(headerType);
        }

        if (args.hasNext()) {
            const popped = args.pop().value();
            if (INTERPRET === popped.toLowerCase()) {
                component = component.interpret(true);
            } else {
                component = component.separator(ctx.deserialize(popped));
                if (args.hasNext() && INTERPRET === args.pop().lowerValue()) {
                    component = component.interpret(true);
                }
            }
        }

        return Tag.inserting(component);
    }

    //

    export const NBT = "nbt";
    export const DATA = "data";
    export const RESOLVER = TagResolver.dynamic(NBT, resolve, DATA);

}
