import {TextComponent, TextComponentImpl} from "./component/text";
import {TranslatableComponent, TranslatableComponentImpl, TranslationArgument} from "./component/translatable";
import {SelectorComponent, SelectorComponentImpl} from "./component/selector";
import {ScoreComponent, ScoreComponentImpl} from "./component/score";
import {KeybindComponent, KeybindComponentImpl} from "./component/keybind";
import {ObjectComponent, ObjectComponentImpl} from "./component/object";
import {ObjectContents} from "./object";
import {ArrayUtil} from "../util/array";
import {BlockNBTComponent, BlockNBTComponentImpl} from "./component/nbt/block";
import {StorageNBTComponent, StorageNBTComponentImpl} from "./component/nbt/storage";
import {EntityNBTComponent, EntityNBTComponentImpl} from "./component/nbt/entity";
import {AbstractScopedComponent} from "./component/scoped";
import {Key, KeyLike} from "../key";

//

export type Component = TextComponent |
    TranslatableComponent |
    BlockNBTComponent |
    EntityNBTComponent |
    StorageNBTComponent |
    SelectorComponent |
    ScoreComponent |
    KeybindComponent |
    ObjectComponent;

export type ComponentTypeMap = {
    [TextComponent.TYPE]: TextComponent,
    [TranslatableComponent.TYPE]: TranslatableComponent,
    [BlockNBTComponent.TYPE]: BlockNBTComponent,
    [EntityNBTComponent.TYPE]: EntityNBTComponent,
    [StorageNBTComponent.TYPE]: StorageNBTComponent,
    [SelectorComponent.TYPE]: SelectorComponent,
    [ScoreComponent.TYPE]: ScoreComponent,
    [KeybindComponent.TYPE]: KeybindComponent,
    [ObjectComponent.TYPE]: ObjectComponent
};

export interface ComponentLike {
    asComponent(): Component;
}

//

export namespace Component {

    export function isComponent<T>(value: T): T extends Component ? true : false {
        // @ts-ignore
        return typeof value === "object" && value !== null && value instanceof AbstractScopedComponent;
    }

    // TextComponent

    export function text(content: string): TextComponent {
        return new TextComponentImpl({ content });
    }

    const EMPTY = text("");
    const NEWLINE = text("\n");
    const SPACE = text(" ");

    export function empty(): TextComponent {
        return EMPTY;
    }

    export function newline(): TextComponent {
        return NEWLINE;
    }

    export function space(): TextComponent {
        return SPACE;
    }

    // TranslatableComponent

    export function translatable(key: string, fallback: string | null = null, args: TranslationArgument[] = []): TranslatableComponent {
        return new TranslatableComponentImpl({
            key,
            fallback,
            arguments: ArrayUtil.immutableView(args)
        });
    }

    // BlockNBTComponent

    type BlockNBTConstructor = {
        (nbtPath: string, pos: BlockNBTComponent.Pos): BlockNBTComponent;
        (nbtPath: string, interpret: boolean, pos: BlockNBTComponent.Pos): BlockNBTComponent;
        (nbtPath: string, interpret: boolean, separator: ComponentLike | null, pos: BlockNBTComponent.Pos): BlockNBTComponent;
    };

    function blockNBTConstructor(): BlockNBTComponent {
        let nbtPath: string;
        let interpret: boolean = false;
        let separator: ComponentLike | null = null;
        let pos: BlockNBTComponent.Pos;

        if (arguments.length === 2) {
            nbtPath = `${arguments[0]}`;
            pos = arguments[1] as BlockNBTComponent.Pos;
        } else if (arguments.length === 3) {
            nbtPath = `${arguments[0]}`;
            interpret = !!arguments[1];
            pos = arguments[2] as BlockNBTComponent.Pos;
        } else if (arguments.length === 4) {
            nbtPath = `${arguments[0]}`;
            interpret = !!arguments[1];
            separator = arguments[2] as ComponentLike | null;
            pos = arguments[3] as BlockNBTComponent.Pos;
        } else {
            throw new Error(`Expected 2-4 arguments, got ${arguments.length}`);
        }

        return new BlockNBTComponentImpl({
            nbtPath,
            interpret,
            separator: (separator === null) ? null : separator.asComponent(),
            pos
        });
    }

    export const blockNBT: BlockNBTConstructor = blockNBTConstructor as unknown as BlockNBTConstructor;

    // StorageNBTComponent

    type StorageNBTConstructor = {
        (nbtPath: string, storage: KeyLike): StorageNBTComponent;
        (nbtPath: string, interpret: boolean, storage: KeyLike): StorageNBTComponent;
        (nbtPath: string, interpret: boolean, separator: ComponentLike | null, storage: KeyLike): StorageNBTComponent;
    };

    function storageNBTConstructor(): StorageNBTComponent {
        let nbtPath: string;
        let interpret: boolean = false;
        let separator: ComponentLike | null = null;
        let storage: KeyLike;

        if (arguments.length === 2) {
            nbtPath = `${arguments[0]}`;
            storage = arguments[1] as KeyLike;
        } else if (arguments.length === 3) {
            nbtPath = `${arguments[0]}`;
            interpret = !!arguments[1];
            storage = arguments[2] as KeyLike;
        } else if (arguments.length === 4) {
            nbtPath = `${arguments[0]}`;
            interpret = !!arguments[1];
            separator = arguments[2] as ComponentLike | null;
            storage = arguments[3] as KeyLike;
        } else {
            throw new Error(`Expected 2-4 arguments, got ${arguments.length}`);
        }

        return new StorageNBTComponentImpl({
            nbtPath,
            interpret,
            separator: (separator === null) ? null : separator.asComponent(),
            storage: Key.key(storage)
        });
    }

    export const storageNBT: StorageNBTConstructor = storageNBTConstructor as unknown as StorageNBTConstructor;

    // EntityNBTComponent

    export function entityNBT(nbtPath: string, selector: string): EntityNBTComponent {
        return new EntityNBTComponentImpl({
            nbtPath,
            interpret: false,
            separator: null,
            selector
        });
    }

    // SelectorComponent

    export function selector(pattern: string, separator: Component | null = null): SelectorComponent {
        return new SelectorComponentImpl({ pattern, separator });
    }

    // ScoreComponent

    export function score(name: string, objective: string): ScoreComponent {
        return new ScoreComponentImpl({ name, objective });
    }

    // KeybindComponent

    export function keybind(keybind: string): KeybindComponent {
        return new KeybindComponentImpl({ keybind });
    }

    // ObjectComponent

    export function object(contents: ObjectContents): ObjectComponent {
        return new ObjectComponentImpl({ contents });
    }

}
