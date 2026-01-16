import {InsertingTag, InsertingTagImpl, StylingTagImpl} from "./tag/impls/inserting";
import {ModifyingTag} from "./tag/impls/modifying";
import {ParserDirectiveTag} from "./tag/impls/directive";
import {PreProcessTag, PreProcessTagImpl} from "./tag/impls/preProcess";
import {ComponentLike} from "../text/component";
import {Style} from "../text/style";
//

export type Tag = Tag.PreProcess |
    Tag.Inserting |
    Tag.Modifying |
    Tag.ParserDirective;

export namespace Tag {

    export type PreProcess = PreProcessTag;
    export type Inserting = InsertingTag;
    export type Modifying = ModifyingTag;
    export type ParserDirective = ParserDirectiveTag;

    //

    export function preProcessParsed(content: string): Tag {
        return new PreProcessTagImpl(content);
    }

    export function inserting(content: ComponentLike): Tag {
        return new InsertingTagImpl(content.asComponent(), true);
    }

    export function selfClosingInserting(content: ComponentLike): Tag {
        return new InsertingTagImpl(content.asComponent(), false);
    }

    export function styling(styles: (builder: Style.Builder) => void): Tag {
        return new StylingTagImpl(styles);
    }

    //

    export interface Argument {

        value(): string;

        lowerValue(): string;

        isTrue(): boolean;

        isFalse(): boolean;

        asInt(): number | null;

        asFloat(): number | null;

    }

}
