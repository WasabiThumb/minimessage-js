import {TagResolver} from "./resolver";
import {ColorTagResolver} from "./standard/color";
import {GradientTag} from "./standard/gradient";
import {DecorationTag} from "./standard/decoration";
import {TextDecoration} from "../../text/style/decoration";
import {HoverTag} from "./standard/hover";
import {ClickTag} from "./standard/click";
import {KeybindTag} from "./standard/keybind";
import {SequentialHeadTag} from "./standard/sequentialHead";
import {TranslatableTag} from "./standard/translatable";
import {TranslatableFallbackTag} from "./standard/translatableFallback";
import {InsertionTag} from "./standard/insertion";
import {FontTag} from "./standard/font";
import {RainbowTag} from "./standard/rainbow";
import {TransitionTag} from "./standard/transition";
import {ResetTag} from "./standard/reset";
import {NewlineTag} from "./standard/newline";
import {SelectorTag} from "./standard/selector";
import {ScoreTag} from "./standard/score";
import {NbtTag} from "./standard/nbt";
import {PrideTag} from "./standard/pride";
import {ShadowColorTag} from "./standard/shadowColor";
import {SpriteTag} from "./standard/sprite";

//

export namespace StandardTags {

    const ALL: TagResolver = TagResolver.builder()
        .resolvers(
            ColorTagResolver.INSTANCE,
            GradientTag.RESOLVER,
            DecorationTag.RESOLVER,
            HoverTag.RESOLVER,
            ClickTag.RESOLVER,
            KeybindTag.RESOLVER,
            SequentialHeadTag.RESOLVER,
            TranslatableTag.RESOLVER,
            TranslatableFallbackTag.RESOLVER,
            InsertionTag.RESOLVER,
            FontTag.RESOLVER,
            RainbowTag.RESOLVER,
            TransitionTag.RESOLVER,
            ResetTag.RESOLVER,
            NewlineTag.RESOLVER,
            SelectorTag.RESOLVER,
            ScoreTag.RESOLVER,
            NbtTag.RESOLVER,
            PrideTag.RESOLVER,
            ShadowColorTag.RESOLVER,
            SpriteTag.RESOLVER,
            HoverTag.RESOLVER,
        )
        .build();

    export function defaults(): TagResolver {
        return ALL;
    }

    //

    export function color(): TagResolver {
        return ColorTagResolver.INSTANCE;
    }

    export function gradient(): TagResolver {
        return GradientTag.RESOLVER;
    }

    export function decorations(decoration?: TextDecoration): TagResolver {
        if (decoration) {
            if (decoration in DecorationTag.RESOLVERS) return DecorationTag.RESOLVERS[decoration];
            throw new Error(`No resolver found for decoration (${decoration})`);
        }
        return DecorationTag.RESOLVER;
    }

    export function hoverEvent(): TagResolver {
        return HoverTag.RESOLVER;
    }

    export function clickEvent(): TagResolver {
        return ClickTag.RESOLVER;
    }

    export function keybind(): TagResolver {
        return KeybindTag.RESOLVER;
    }

    export function sequentialHead(): TagResolver {
        return SequentialHeadTag.RESOLVER;
    }

    export function translatable(): TagResolver {
        return TranslatableTag.RESOLVER;
    }

    export function translatableFallback(): TagResolver {
        return TranslatableFallbackTag.RESOLVER;
    }

    export function insertion(): TagResolver {
        return InsertionTag.RESOLVER;
    }

    export function font(): TagResolver {
        return FontTag.RESOLVER;
    }

    export function rainbow(): TagResolver {
        return RainbowTag.RESOLVER;
    }

    export function transition(): TagResolver {
        return TransitionTag.RESOLVER;
    }

    export function reset(): TagResolver {
        return ResetTag.RESOLVER;
    }

    export function newline(): TagResolver {
        return NewlineTag.RESOLVER;
    }

    export function selector(): TagResolver {
        return SelectorTag.RESOLVER;
    }

    export function score(): TagResolver {
        return ScoreTag.RESOLVER;
    }

    export function nbt(): TagResolver {
        return NbtTag.RESOLVER;
    }

    export function pride(): TagResolver {
        return PrideTag.RESOLVER;
    }

    export function shadowColor(): TagResolver {
        return ShadowColorTag.RESOLVER;
    }

    export function sprite(): TagResolver {
        return SpriteTag.RESOLVER;
    }

}
